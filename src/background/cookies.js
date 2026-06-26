/* 内部开发工具箱 — Background Cookie 读取 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  function hasCookiesApi() {
    return typeof chrome !== 'undefined' && Boolean(chrome.cookies);
  }

  async function getWafCookies() {
    if (!hasCookiesApi()) return '';
    const targetHost = commonNs.currentProject.getBaseUrl();
    const cookieKeys = commonNs.currentProject.getCookieKeys();
    const pairs = [];
    for (const name of cookieKeys) {
      try {
        const cookie = await chrome.cookies.get({ url: targetHost, name });
        if (cookie && cookie.value) {
          pairs.push(`${cookie.name}=${cookie.value}`);
        }
      } catch (_) {
        // ignore
      }
    }
    return pairs.join('; ');
  }

  ns.cookies = { getWafCookies };
})();
