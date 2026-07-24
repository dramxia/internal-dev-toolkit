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
  let disabledKeys = new Set(); // 被禁监的接口 key（method + ' ' + url）
  const MAX_LOG_SIZE = 100; // 最多保留 100 条记录

  // 初始化
  async function init() {
    console.log('[Mock Interceptor] Initializing in content script...');

    // 1) 接收页面上下文上报的请求记录（hook 注入后由页面主上下文 postMessage 上报）。
    //    hook 尚未注入时此监听器空转，不产生开销。
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;

      if (event.data.type === 'IDT_REQUEST_LOGGED') {
        const record = event.data.record;
        console.log('[Mock Interceptor] Received request from page context:', record.method, record.url);

        const key = record.key || (record.method + ' ' + record.url);
        // 命中禁监池：不接收、不上报面板（与 hook 双保险）
        if (disabledKeys.size > 0 && disabledKeys.has(key)) return;

        // 同一 method+url 只保留最新一条：替换已有记录，避免重复刷屏
        const existingIdx = requestLog.findIndex(r => (r.key || (r.method + ' ' + r.url)) === key);
        if (existingIdx >= 0) {
          requestLog[existingIdx] = record;
        } else {
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
        window.postMessage({
          type: 'IDT_UPDATE_MOCK_RULES',
          rules: mockRules,
        }, '*');
        sendResponse({ ok: true });
        return true;
      }

      if (msg.type === 'GET_REQUEST_LOG') {
        console.log('[Mock Interceptor] GET_REQUEST_LOG requested, returning', requestLog.length, 'records');
        // 过滤掉已禁监的接口，使其不出现在捕获列表
        const visible = disabledKeys.size > 0
          ? requestLog.filter(r => !disabledKeys.has(r.key || (r.method + ' ' + r.url)))
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

      // 更新禁监接口池：同步内存并桥接到页面主上下文（hook 据此跳过记录）
      if (msg.type === 'APPLY_MONITOR_DISABLED') {
        const arr = Array.isArray(msg.disabled) ? msg.disabled : [];
        disabledKeys = new Set(arr);
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
        window.postMessage({ type: 'IDT_SET_ACTIVE', active }, '*');
        sendResponse({ ok: true });
        return true;
      }
    });

    // 3) 异步加载 mock 规则（仅缓存到内存，供后续 APPLY_MOCK_RULES / hook 同步使用）
    if (ns.mockStorage) {
      mockRules = await ns.mockStorage.getMockRules();
      console.log('[Mock Interceptor] Loaded', mockRules.length, 'rules from storage');
    }
    // 注意：不再在此主动注入 hook，也不主动 postMessage 规则给页面。
    // hook 由 DevTools Panel 打开时触发（background INJECT_MOCK_HOOK），
    // 注入成功后 background 会下发 APPLY_MOCK_RULES，由本脚本桥接到页面主上下文。
  }

  ns.mockInterceptor = {
    init,
  };
})();
