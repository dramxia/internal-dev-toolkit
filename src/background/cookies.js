/* 内部开发工具箱 — Background Cookie 读取 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  function hasCookiesApi() {
    return typeof chrome !== 'undefined' && Boolean(chrome.cookies);
  }

  async function getWafCookies() {
    return getWafCookiesForUrl(commonNs.currentProject.getBaseUrl());
  }

  // 按目标 URL 读取 WAF Cookie（用于向租户域名发起 client API 请求）
  async function getWafCookiesForUrl(targetUrl) {
    if (!hasCookiesApi()) return '';
    if (!targetUrl) return '';
    const cookieKeys = commonNs.currentProject.getCookieKeys();
    const pairs = [];
    for (const name of cookieKeys) {
      try {
        const cookie = await chrome.cookies.get({ url: targetUrl, name });
        if (cookie && cookie.value) {
          pairs.push(`${cookie.name}=${cookie.value}`);
        }
      } catch (_) {
        // ignore
      }
    }
    return pairs.join('; ');
  }

  ns.cookies = { getWafCookies, getWafCookiesForUrl };
})();
