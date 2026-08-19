/* 内部开发工具箱 — Mock 拦截器 */
/* 在 content script（isolated world）中协调：
   - 接收页面主上下文通过 postMessage 上报的请求记录
   - 与 DevTools Panel / popup 通过 chrome.runtime 消息通信
   - hook 安装改由 DevTools Panel 打开时经 background 动态注入（混合方案），
     实现“仅在控制台打开时捕获接口”；本脚本仅负责记录与规则中转。 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  // 存储 mock 规则和接口记录
  let mockRules = [];
  let requestLog = [];
  let disabledKeys = new Set(); // 被禁监的接口 key（method + ' ' + 无 query/hash 的 url）
  let mockEnabled = true; // 接口 Mock 总开关：关闭后页面 hook 不拦截、不上报
  const MAX_LOG_SIZE = 100; // 最多保留 100 条记录

  function syncMockRulesToPage() {
    window.postMessage({
      type: 'IDT_UPDATE_MOCK_RULES',
      rules: mockRules,
    }, '*');
  }

  function syncMockEnabledToPage() {
    window.postMessage({ type: 'IDT_SET_MOCK_ENABLED', enabled: mockEnabled }, '*');
  }

  function endpointUrl(url) {
    return String(url || '').split('#', 1)[0].split('?', 1)[0];
  }

  function requestKey(method, url) {
    return String(method || '').toUpperCase() + ' ' + endpointUrl(url);
  }

  function normalizeRequestKey(key) {
    const raw = String(key || '');
    const separator = raw.indexOf(' ');
    return separator > 0
      ? requestKey(raw.slice(0, separator), raw.slice(separator + 1))
      : raw;
  }

  function toOriginalSnapshot(record) {
    return {
      url: record.url,
      method: record.method,
      status: record.status,
      requestPayload: record.requestPayload,
      responsePayload: record.responsePayload,
      timestamp: record.timestamp,
    };
  }

  // hook 上报 Mock 结果时仍要保留该接口最近一次真实记录，供面板关闭开关后回显。
  function attachOriginalSnapshot(record, previous) {
    // 连续真实请求应始终展示最新值；只有 Mock 记录覆盖真实记录时才冻结 original。
    if (!record.mocked) return record;
    let original = record.original || previous?.original || null;
    if (!original && previous && !previous.mocked) original = toOriginalSnapshot(previous);
    return original ? { ...record, original } : record;
  }

  // 初始化
  async function init() {
    console.log('[Mock Interceptor] Initializing in content script...');

    // 1) 接收页面上下文上报的请求记录（hook 注入后由页面主上下文 postMessage 上报）。
    //    hook 尚未注入时此监听器空转，不产生开销。
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;

      if (event.data.type === 'IDT_REQUEST_LOGGED') {
        let record = event.data.record;
        console.log('[Mock Interceptor] Received request from page context:', record.method, record.url);

        const key = requestKey(record.method, record.url);
        record = { ...record, key };
        // 命中禁监池：不接收、不上报面板（与 hook 双保险）
        if (disabledKeys.size > 0 && disabledKeys.has(key)) return;

        // 同一 method+接口路径只保留最新一条，query/hash 或请求体变化直接覆盖。
        const existingIdx = requestLog.findIndex(r => requestKey(r.method, r.url) === key);
        if (existingIdx >= 0) {
          record = attachOriginalSnapshot(record, requestLog[existingIdx]);
          requestLog[existingIdx] = record;
        } else {
          record = attachOriginalSnapshot(record, null);
          requestLog.unshift(record);
        }

        // 限制日志大小
        if (requestLog.length > MAX_LOG_SIZE) {
          requestLog = requestLog.slice(0, MAX_LOG_SIZE);
        }

        // 通知 DevTools Panel
        chrome.runtime.sendMessage({
          type: 'REQUEST_LOGGED',
          request: record,
        }).catch((err) => {
          console.log('[Mock Interceptor] Failed to notify DevTools:', err.message);
        });
      }
    });

    // 2) runtime 消息：规则更新 / 日志查询
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'APPLY_MOCK_RULES') {
        mockRules = msg.rules || [];
        console.log('[Mock Interceptor] Updated rules via message:', mockRules.length);
        // 同步到页面上下文（hook 已注入则生效，未注入则被丢弃）
        syncMockRulesToPage();
        sendResponse({ ok: true });
        return true;
      }

      if (msg.type === 'GET_REQUEST_LOG') {
        console.log('[Mock Interceptor] GET_REQUEST_LOG requested, returning', requestLog.length, 'records');
        // 过滤掉已禁监的接口，使其不出现在捕获列表
        const visible = disabledKeys.size > 0
          ? requestLog.filter(r => !disabledKeys.has(requestKey(r.method, r.url)))
          : requestLog;
        sendResponse({ ok: true, requests: visible });
        return true;
      }

      if (msg.type === 'CLEAR_REQUEST_LOG') {
        requestLog = [];
        console.log('[Mock Interceptor] Request log cleared');
        sendResponse({ ok: true });
        return true;
      }

      // 捕获列表删除只操作请求日志，Emo / 已编规则及页面 hook 缓存保持不变。
      if (msg.type === 'DELETE_CAPTURED_REQUEST') {
        const key = requestKey(msg.method, msg.url);
        const before = requestLog.length;
        requestLog = requestLog.filter(r => requestKey(r.method, r.url) !== key);
        console.log('[Mock Interceptor] Captured request deleted:', key);
        sendResponse({ ok: true, deletedRequests: before - requestLog.length });
        return true;
      }

      // 单接口删除：同时清理请求日志、content 规则缓存与页面 hook 缓存。
      if (msg.type === 'DELETE_MOCK_ENDPOINT_CACHE') {
        const key = requestKey(msg.method, msg.url);
        const before = requestLog.length;
        requestLog = requestLog.filter(r => requestKey(r.method, r.url) !== key);
        mockRules = Array.isArray(msg.rules) ? msg.rules : [];
        syncMockRulesToPage();
        console.log('[Mock Interceptor] Endpoint cache deleted:', key);
        sendResponse({ ok: true, deletedRequests: before - requestLog.length });
        return true;
      }

      // 更新禁监接口池：同步内存并桥接到页面主上下文（hook 据此跳过记录）
      if (msg.type === 'APPLY_MONITOR_DISABLED') {
        const arr = Array.isArray(msg.disabled) ? msg.disabled : [];
        disabledKeys = new Set(arr.map(normalizeRequestKey));
        console.log('[Mock Interceptor] Monitor disabled updated:', disabledKeys.size);
        window.postMessage({ type: 'IDT_UPDATE_MONITOR_DISABLED', disabled: arr }, '*');
        sendResponse({ ok: true });
        return true;
      }

      // DevTools 面板开关：激活/关闭页面 hook 的请求记录。
      // hook 始终在 document_start 静态安装，仅通过本开关控制是否记录上报，
      // 实现“仅在控制台打开时捕获”。
      if (msg.type === 'SET_HOOK_ACTIVE') {
        const active = !!msg.active;
        console.log('[Mock Interceptor] Set hook active:', active);
        // 页面刷新会重建 MAIN world，激活时必须把当前规则重新下发给新 hook。
        if (active) syncMockRulesToPage();
        window.postMessage({ type: 'IDT_SET_ACTIVE', active }, '*');
        sendResponse({ ok: true });
        return true;
      }

      // 接口 Mock 总开关：同步内存并桥接到页面主上下文。
      // 关闭时 hook 既不拦截（出参/入参改写失效），也不记录上报。
      if (msg.type === 'APPLY_MOCK_ENABLED') {
        mockEnabled = msg.enabled !== false;
        console.log('[Mock Interceptor] Mock enabled set to:', mockEnabled);
        syncMockEnabledToPage();
        sendResponse({ ok: true });
        return true;
      }
    });

    // 3) 页面刷新会重建 MAIN world 中的 hook；从持久化存储加载完成后立即重放规则，
    // 保证已开启的 Mock 不依赖再次编辑或重新切换开关才能生效。
    if (ns.mockStorage) {
      mockRules = await ns.mockStorage.getMockRules();
      console.log('[Mock Interceptor] Loaded', mockRules.length, 'rules from storage');
      syncMockRulesToPage();

      // 接口 Mock 总开关：content script 加载即下发，保证 hook 拦截/捕获与开关状态一致。
      if (ns.mockStorage.getMockEnabled) {
        mockEnabled = await ns.mockStorage.getMockEnabled();
        console.log('[Mock Interceptor] Mock enabled loaded:', mockEnabled);
        syncMockEnabledToPage();
      }
    }
  }

  ns.mockInterceptor = {
    init,
  };
})();
