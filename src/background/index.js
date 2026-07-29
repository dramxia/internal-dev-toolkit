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

    // popup 保存自定义域名后通知 background 刷新内存缓存
    // （getBaseUrl 同步读取该缓存，所有后台请求会立即使用新域名）
    if (msg.type === 'REFRESH_BASE_URL') {
      commonNs.currentProject
        .refreshBaseUrlCache()
        .then(() => sendResponse({ ok: true }))
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

    // ── 「其它」站点登录（知雀 / 高职校） ──
    if (msg.type === 'OTHER_LOGIN' && ns.otherLogin) {
      ns.otherLogin
        .doLogin(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // 一键登入：拿 token 后带 accessToken 打开站点完成自动登录
    if (msg.type === 'OTHER_ENTER' && ns.otherLogin) {
      ns.otherLogin
        .doEnter(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // 知雀：登录后走 /client/tenant/zhique/redirectUrl OAuth SSO 进入 a.zhique.cn
    if (msg.type === 'OTHER_ZHIQUE_ENTER' && ns.otherLogin) {
      ns.otherLogin
        .doZhiqueEnter(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_GET_CREDENTIALS' && ns.otherLogin) {
      ns.otherLogin
        .getCredentials()
        .then((creds) => sendResponse({ ok: true, ...creds }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_GET_TOKEN' && ns.otherLogin) {
      ns.otherLogin
        .getToken()
        .then((state) => sendResponse({ ok: true, ...state }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_SAVE_TOKEN' && ns.otherLogin) {
      ns.otherLogin
        .saveToken(msg.payload?.token || '', msg.payload?.user || null)
        .then((state) => sendResponse({ ok: true, ...state }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_CLEAR_TOKEN' && ns.otherLogin) {
      ns.otherLogin
        .clearToken()
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_GET_HISTORY' && ns.otherLogin) {
      ns.otherLogin
        .getHistory()
        .then((records) => sendResponse({ ok: true, records }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_DELETE_HISTORY' && ns.otherLogin) {
      ns.otherLogin
        .deleteHistory(msg.payload)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_LIST_TEACHERS' && ns.otherLogin) {
      ns.otherLogin
        .listTeachers(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
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

    if (msg.type === 'RESOLVE_IMPORT_CONFLICT' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleResolveImportConflict(msg)
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

    if (msg.type === 'DELETE_MOCK_ENDPOINT' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleDeleteMockEndpoint(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'DELETE_CAPTURED_REQUEST' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleDeleteCapturedRequest(msg)
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

    // 禁监接口池：获取 / 加入 / 移除（按项目持久化，并同步 content script → hook）
    if (msg.type === 'GET_MONITOR_DISABLED' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleGetMonitorDisabled(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }
    if (msg.type === 'ADD_MONITOR_DISABLED' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleAddMonitorDisabled(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }
    if (msg.type === 'REMOVE_MONITOR_DISABLED' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleRemoveMonitorDisabled(msg)
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

    // DevTools 面板开关：激活/关闭指定标签页 hook 的请求记录。
    // hook 始终在 document_start 静态安装（见 manifest content_scripts），
    // 仅由本消息经 content script → postMessage(IDT_SET_ACTIVE) 控制是否记录上报。
    // 面板打开时激活，面板关闭/导航后由面板按需重新激活或保持激活。
    if (msg.type === 'SET_HOOK_ACTIVE') {
      const { tabId, active } = msg;
      if (!tabId) {
        sendResponse({ ok: false, error: 'tabId required' });
        return true;
      }
      chrome.tabs.sendMessage(tabId, { type: 'SET_HOOK_ACTIVE', active }, () => {
        if (chrome.runtime?.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        // 激活时一并下发持久化的禁监接口池，使 hook 立即按最新列表跳过记录。
        // 面板关闭（active=false）时无需下发。
        if (active && commonNs.mockStorage) {
          commonNs.mockStorage.getMonitorDisabled().then((disabled) => {
            chrome.tabs.sendMessage(tabId, { type: 'APPLY_MONITOR_DISABLED', disabled }, () => {
              void chrome.runtime?.lastError;
            });
          }).catch(() => {});
        }
        sendResponse({ ok: true });
      });
      return true;
    }

    // 在指定标签页的主上下文注入 mock-hook.js（绕过页面 CSP）
    // 兜底入口：正常情况下 hook 由 manifest content_scripts 在 document_start 静态注入，
    // 本消息仅在静态注入未命中（如扩展重载后页面未刷新）时作手动补注入用。
    if (msg.type === 'INJECT_MOCK_HOOK') {
      const tabId = msg.tabId || (_sender.tab && _sender.tab.id);
      if (!tabId) {
        sendResponse({ ok: false, error: 'no target tab' });
        return true;
      }
      chrome.scripting
        .executeScript({
          target: { tabId, allFrames: true },
          world: 'MAIN',
          files: ['mock-hook.js'],
        })
        .then(async () => {
          // hook 装好后，把当前项目的规则同步给 content script → 页面主上下文
          try {
            const rules = commonNs.mockStorage ? await commonNs.mockStorage.getMockRules() : [];
            chrome.tabs.sendMessage(tabId, { type: 'APPLY_MOCK_RULES', rules }, () => {
              void chrome.runtime?.lastError;
            });
          } catch (_) {}
          sendResponse({ ok: true });
        })
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    return false;
  });
})();
