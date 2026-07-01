/* 内部开发工具箱 — Background Service Worker 入口 */
/* 处理 popup 发来的跨域登录请求，并保留原有的 PING 消息中转。 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  // Service Worker 启动时初始化：加载当前项目并执行数据迁移
  (async () => {
    try {
      await commonNs.currentProject.loadCurrentProject();
      await commonNs.currentProject.migrateOldStorageKeys();
      console.log('[内部开发工具箱] Background 初始化完成，当前项目:', commonNs.currentProject.getName());
    } catch (err) {
      console.error('[内部开发工具箱] Background 初始化失败:', err);
    }
  })();

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return false;

    if (msg.type === 'PING') {
      sendResponse({ type: 'PONG', at: Date.now() });
      return true;
    }

    if (msg.type === 'LOGIN_API' && ns.api) {
      ns.api
        .doLogin(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_TENANTS' && ns.tenantApi) {
      ns.tenantApi
        .fetchTenantPage(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_DEPTS' && ns.tenantApi) {
      ns.tenantApi
        .fetchDeptList(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_USERS' && ns.tenantApi) {
      ns.tenantApi
        .fetchUserPage(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'QUICK_LOGIN' && ns.quickLogin) {
      ns.quickLogin
        .quickLogin(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'GET_QUICK_LOGIN_RECENT' && ns.quickLogin) {
      ns.quickLogin
        .getRecent()
        .then((records) => sendResponse({ ok: true, records }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'DELETE_QUICK_LOGIN_RECENT' && ns.quickLogin) {
      ns.quickLogin
        .deleteRecent(msg.payload)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OPEN_LOGIN_URL' && ns.quickLogin) {
      ns.quickLogin
        .openLoginUrl(msg.payload.url)
        .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // Mock 相关消息处理
    if (msg.type === 'GET_MOCK_RULES' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleGetMockRules(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'ADD_MOCK_RULE' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleAddMockRule(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'DELETE_MOCK_RULE' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleDeleteMockRule(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'TOGGLE_MOCK_RULE' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleToggleMockRule(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'CLEAR_MOCK_RULES' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleClearMockRules(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'GET_CURRENT_PROJECT' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleGetCurrentProject(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'GET_REQUEST_LOG' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleGetRequestLog(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // 清空指定标签页 content script 中的请求记录
    if (msg.type === 'CLEAR_REQUEST_LOG') {
      const { tabId } = msg;
      if (!tabId) {
        sendResponse({ ok: false, error: 'tabId required' });
        return true;
      }
      chrome.tabs.sendMessage(tabId, { type: 'CLEAR_REQUEST_LOG' }, () => {
        if (chrome.runtime?.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ ok: true });
      });
      return true;
    }

    // 在指定标签页的主上下文注入 mock-hook.js（绕过页面 CSP）
    // 注：hook 主要由 manifest 中 world:MAIN 的 content script 在 document_start 注入；
    // 此消息作为补充入口（如规则变更后重装、或 MAIN-world content script 未命中时）。
    if (msg.type === 'INJECT_MOCK_HOOK') {
      const tabId = _sender.tab && _sender.tab.id;
      if (!tabId) {
        sendResponse({ ok: false, error: 'no sender tab' });
        return true;
      }
      chrome.scripting
        .executeScript({
          target: { tabId, allFrames: true },
          world: 'MAIN',
          files: ['mock-hook.js'],
        })
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    return false;
  });
})();
