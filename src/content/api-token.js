/* 内部开发工具箱 — Content Script Token 注入 */
/* 在目标后台站将 token 暴露到页面，方便页面脚本或开发者直接使用；并提供消息接口。 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  function isTargetSite() {
    if (!ns.projects || !ns.projects.PROJECTS) return false;
    const allHosts = ns.projects.PROJECTS.flatMap(p => p.hosts);
    return allHosts.some(h => {
      const pattern = h.replace(/^\*\./, ''); // '*.hwzxs.com' -> 'hwzxs.com'
      if (h.startsWith('*.')) {
        // 通配符匹配：hostname 以 pattern 结尾或完全相等
        return location.hostname === pattern || location.hostname.endsWith('.' + pattern);
      } else {
        // 精确匹配
        return location.hostname === h;
      }
    });
  }

  function exposeToken(token) {
    if (!token) return;
    try {
      // 暴露到页面全局，便于页面内调试脚本或业务代码取用
      Object.defineProperty(window, '__ADMIN_TOKEN__', {
        value: token,
        configurable: true,
        writable: true,
      });
      // 同时写入 localStorage，供同域应用读取（key 可按实际项目调整）
      localStorage.setItem('admin-token', token);
    } catch (_) {
      // 某些页面安全策略可能禁止写入 window/localStorage
    }
  }

  async function injectToken() {
    const tokenState = await ns.token.getToken();
    if (tokenState.token) {
      exposeToken(tokenState.token);
      if (ns.ui) {
        ns.ui.toast('Token 已注入页面');
      }
    }
    return tokenState;
  }

  function clearPageToken() {
    try {
      delete window.__ADMIN_TOKEN__;
      localStorage.removeItem('admin-token');
    } catch (_) {}
  }

  ns.apiToken = { isTargetSite, exposeToken, injectToken, clearPageToken };
})();
