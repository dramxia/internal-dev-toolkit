/* 内部开发工具箱 — Content Script 入口 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit;

  async function init() {
    // 初始化 Mock 拦截器
    if (ns.mockInterceptor) {
      await ns.mockInterceptor.init();
    }

    // 接收 popup 发来的消息
    ns.messages.onMessage(async (msg) => {
      if (!msg || !msg.type) return { ok: false, error: 'missing type' };
      switch (msg.type) {
        case 'GET_STATUS':
          return { ok: true, url: location.href, title: document.title };

        case 'GET_TOKEN': {
          const tokenState = await ns.token.getToken();
          return { ok: true, token: tokenState.token, updatedAt: tokenState.updatedAt };
        }

        case 'INJECT_TOKEN': {
          if (!ns.apiToken) return { ok: false, error: 'apiToken 模块未加载' };
          const tokenState = await ns.apiToken.injectToken();
          return { ok: true, token: tokenState.token };
        }

        case 'FETCH_TENANTS_CS': {
          if (!ns.apiProxy) return { ok: false, error: 'apiProxy 模块未加载' };
          const res = await ns.apiProxy.fetchTenantPage(msg.payload);
          return { ok: true, res };
        }

        case 'FETCH_DEPTS_CS': {
          if (!ns.apiProxy) return { ok: false, error: 'apiProxy 模块未加载' };
          const res = await ns.apiProxy.fetchDeptList(msg.payload);
          return { ok: true, res };
        }

        case 'FETCH_USERS_CS': {
          if (!ns.apiProxy) return { ok: false, error: 'apiProxy 模块未加载' };
          const res = await ns.apiProxy.fetchUserPage(msg.payload);
          return { ok: true, res };
        }

        case 'QUICK_LOGIN_CS': {
          if (!ns.apiProxy) return { ok: false, error: 'apiProxy 模块未加载' };
          const res = await ns.apiProxy.quickLogin(msg.payload);
          return { ok: true, res };
        }

        case 'OPEN_URL_CS': {
          if (!ns.apiProxy) return { ok: false, error: 'apiProxy 模块未加载' };
          const result = await ns.apiProxy.openUrl(msg.payload.url);
          return { ok: true, ...result };
        }

        case 'CLEAR_TOKEN': {
          await ns.token.clearToken();
          if (ns.apiToken) ns.apiToken.clearPageToken();
          return { ok: true };
        }

        default:
          return { ok: false, error: `unknown type: ${msg.type}` };
      }
    });

    // 目标后台站：若已保存 token，则自动注入页面
    if (ns.apiToken) {
      setTimeout(() => ns.apiToken.injectToken().catch(() => {}), 400);
    }
  }

  init().catch((err) => {
    console.warn('[内部开发工具箱] 初始化失败:', err);
  });
})();
