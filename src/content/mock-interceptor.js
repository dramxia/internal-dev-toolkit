/* 内部开发工具箱 — Mock 拦截器 */
/* 在 content script（isolated world）中协调：
   - 请求 background 通过 chrome.scripting.executeScript({world:'MAIN'}) 注入 mock-hook.js
     （页面 CSP 会阻止内联 <script> 注入，必须走 scripting API）
   - 接收页面主上下文通过 postMessage 上报的请求记录
   - 与 DevTools Panel / popup 通过 chrome.runtime 消息通信 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  // 存储 mock 规则和接口记录
  let mockRules = [];
  let requestLog = [];
  const MAX_LOG_SIZE = 100; // 最多保留 100 条记录

  // 初始化
  async function init() {
    console.log('[Mock Interceptor] Initializing in content script...');

    // 1) 先注入 hook，必须在任何 await 之前同步执行。
    //    页面脚本（如 SkyWalking 浏览器监控）会在 document_start 后极早期缓存
    //    window.fetch / window.XMLHttpRequest 的引用并包装；若等 storage 读取完成
    //    再注入，hook 会晚于其缓存，导致页面请求绕过 hook。
    injectPageScript();

    // 2) 接收页面上下文上报的请求记录（hook 注入后即可注册，仍在 document_start）
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;

      if (event.data.type === 'IDT_REQUEST_LOGGED') {
        const record = event.data.record;
        console.log('[Mock Interceptor] Received request from page context:', record.method, record.url);

        // 同一 method+url 只保留最新一条：替换已有记录，避免重复刷屏
        const key = record.key || (record.method + ' ' + record.url);
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

    // 3) runtime 消息：规则更新 / 日志查询
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'APPLY_MOCK_RULES') {
        mockRules = msg.rules || [];
        console.log('[Mock Interceptor] Updated rules via message:', mockRules.length);
        // 同步到页面上下文
        window.postMessage({
          type: 'IDT_UPDATE_MOCK_RULES',
          rules: mockRules,
        }, '*');
        sendResponse({ ok: true });
        return true;
      }

      if (msg.type === 'GET_REQUEST_LOG') {
        console.log('[Mock Interceptor] GET_REQUEST_LOG requested, returning', requestLog.length, 'records');
        sendResponse({ ok: true, requests: requestLog });
        return true;
      }

      if (msg.type === 'CLEAR_REQUEST_LOG') {
        requestLog = [];
        console.log('[Mock Interceptor] Request log cleared');
        sendResponse({ ok: true });
        return true;
      }
    });

    // 4) 异步加载 mock 规则（不阻塞 hook 安装）
    if (ns.mockStorage) {
      mockRules = await ns.mockStorage.getMockRules();
      console.log('[Mock Interceptor] Loaded', mockRules.length, 'rules from storage');
    }

    // 5) 规则就绪后同步给页面上下文（此时页面脚本的 message 监听器已注册）
    console.log('[Mock Interceptor] Sending initial rules to page context:', mockRules.length);
    window.postMessage({
      type: 'IDT_UPDATE_MOCK_RULES',
      rules: mockRules,
    }, '*');
  }

  // 请求 background 在当前标签页的主上下文注入 mock-hook.js
  // （content script 无 chrome.scripting 权限，需由 background 执行 executeScript）
  function injectPageScript() {
    console.log('[Mock Interceptor] Requesting MAIN-world hook injection...');
    chrome.runtime.sendMessage(
      { type: 'INJECT_MOCK_HOOK' },
      (response) => {
        if (chrome.runtime?.lastError) {
          console.error('[Mock Interceptor] Inject request failed:', chrome.runtime.lastError.message);
          return;
        }
        console.log('[Mock Interceptor] Hook injection response:', response);
      }
    );
  }

  ns.mockInterceptor = {
    init,
  };
})();
