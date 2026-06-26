/* 内部开发工具箱 — Content Script 代理请求 */
/* 在目标页面上下文发 fetch，天然共享浏览器 Cookie，避免 Service Worker 的 401 问题。 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  const BASE_URL = 'https://gpt-admin-pre.hwzxs.com';

  async function getToken() {
    const tokenState = await ns.token.getToken();
    return tokenState.token || '';
  }

  async function fetchAdminJson(path, body, { referer = `${BASE_URL}/tenant` } = {}) {
    const token = await getToken();
    if (!token) throw new Error('未获取 admin token，请先登录');

    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: BASE_URL,
      Referer: referer,
    };

    console.log('[内部开发工具箱 CS] 请求:', path, 'body:', body, 'token:', token.slice(0, 8) + '...');

    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let extra = '';
      try { extra = await res.text(); } catch (_) {}
      throw new Error(`HTTP ${res.status}: ${res.statusText}${extra ? ' | ' + extra.slice(0, 200) : ''}`);
    }

    const text = await res.text();
    try { return text ? JSON.parse(text) : {}; }
    catch (_) { return { _raw: text }; }
  }

  async function fetchTenantPage(opts) {
    const body = ns.tenant.buildTenantPageBody(opts);
    return fetchAdminJson('/huayun-ai/admin/tenant/page', body, { referer: `${BASE_URL}/tenant?rBK=52` });
  }

  async function fetchDeptList(opts) {
    const body = ns.tenant.buildDeptListBody(opts);
    return fetchAdminJson('/huayun-ai/admin/dept/list', body, { referer: `${BASE_URL}/tenant/user?tenantId=${opts.tenantId}&industry=${opts.industry || 1}` });
  }

  async function fetchUserPage(opts) {
    const body = ns.tenant.buildUserPageBody(opts);
    return fetchAdminJson('/huayun-ai/admin/tenant/user/page', body, { referer: `${BASE_URL}/tenant/user?tenantId=${opts.tenantId}&industry=${opts.industry || 1}` });
  }

  async function quickLogin(opts) {
    const body = ns.tenant.buildQuickLoginBody({ id: opts.id });
    return fetchAdminJson('/huayun-ai/admin/tenant/user/virtualLogin', body, { referer: `${BASE_URL}/tenant/user?tenantId=${opts.tenantId}&industry=${opts.industry || 1}` });
  }

  async function openUrl(url) {
    if (!url) throw new Error('缺少 URL');
    window.open(url, '_blank');
    return { opened: true };
  }

  ns.apiProxy = { fetchTenantPage, fetchDeptList, fetchUserPage, quickLogin, openUrl };
})();
