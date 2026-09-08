/* 内部开发工具箱 — 后台账号 Token 注入当前标签页 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  function httpOrigin(value) {
    try {
      const url = new URL(String(value || ''));
      return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
    } catch (_) {
      return '';
    }
  }

  async function injectActiveTab({ token, siteToken, userInfo, origin }) {
    const cleanToken = String(token || '').replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) throw new Error('尚未获取后台 Token，请先登录或填写 Token');
    const loginOrigin = httpOrigin(origin);
    if (!loginOrigin) throw new Error('登录域名无效，请检查后台 API 地址');
    if (!chrome.tabs?.query || !chrome.scripting?.executeScript) {
      throw new Error('当前环境不支持向网站注入 Token');
    }

    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs.find((item) => item.id && item.active);
    if (!tab) return { injected: false, reason: 'no-active-tab' };
    const targetOrigin = httpOrigin(tab.pendingUrl || tab.url);
    if (!targetOrigin) return { injected: false, reason: 'unsupported-page' };
    if (targetOrigin !== loginOrigin) {
      return { injected: false, reason: 'origin-mismatch', loginOrigin };
    }

    // 网站的请求拦截器直接读取 localStorage.token 作为 Authorization。
    // 登录响应提供 accessToken 时保留原格式；旧记录和手填 Token 补上 Bearer 前缀。
    const storedSiteToken = String(siteToken || '').trim();
    const sessionToken = storedSiteToken.replace(/^Bearer\s+/i, '').trim() === cleanToken
      ? storedSiteToken
      : `Bearer ${cleanToken}`;
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      world: 'MAIN',
      func: (expectedOrigin, sessionToken, cleanToken, userInfo) => {
        // 查询标签页后可能发生导航，写入前必须在页面中再次确认域名。
        if (window.location.origin !== expectedOrigin) {
          return { injected: false, reason: 'page-changed' };
        }
        const previousToken = (localStorage.getItem('token') || '').replace(/^Bearer\s+/i, '').trim();
        localStorage.setItem('token', sessionToken);
        if (userInfo) {
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
        } else if (previousToken !== cleanToken) {
          // 手填或旧版本的 Token 没有用户信息，不能沿用另一个账号的信息。
          localStorage.removeItem('userInfo');
        }
        window.location.assign(`${window.location.origin}/`);
        return { injected: true };
      },
      args: [targetOrigin, sessionToken, cleanToken, userInfo || null],
    });
    const result = results?.find((item) => item.frameId === 0)?.result;
    if (!result) throw new Error('网站未完成 Token 注入，请重试');
    return { ...result, tabId: tab.id };
  }

  async function autoInject(state) {
    try {
      return await injectActiveTab(state);
    } catch (error) {
      // 登录和保存已完成，页面注入失败不应要求用户重新验证登录。
      return { injected: false, error: error.message || '自动注入失败' };
    }
  }

  async function injectStoredToken({ projectId, baseUrl } = {}) {
    const state = await commonNs.token.getToken(projectId);
    const result = await injectActiveTab({
      ...state,
      origin: state.origin || baseUrl || commonNs.currentProject.getBaseUrl(),
    });
    if (!result.injected) {
      const errors = {
        'no-active-tab': '未找到当前激活的网站',
        'unsupported-page': '当前页面不支持注入，请打开 HTTP(S) 网站',
        'origin-mismatch': `当前网站与登录域名不一致，请切换到 ${result.loginOrigin} 后重试`,
        'page-changed': '当前网站已发生跳转，请确认页面后重试',
      };
      throw new Error(errors[result.reason] || 'Token 注入失败');
    }
    return result;
  }

  ns.adminTokenInjection = { autoInject, injectStoredToken };
})();
