/* 内部开发工具箱 — Background 租户/用户/部门跨域 API */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  async function getToken() {
    const tokenData = await commonNs.token.getToken();
    let token = tokenData.token || '';
    token = token.replace(/^Bearer\s+/i, '').trim();
    return token;
  }

  async function fetchAdminJson(path, body, { referer } = {}) {
    const token = await getToken();
    if (!token) throw new Error('未获取 admin token，请先登录');

    const baseUrl = commonNs.currentProject.getBaseUrl();
    const finalReferer = referer || `${baseUrl}/tenant`;
    const cookieHeader = await ns.cookies.getWafCookies();
    if (!cookieHeader) {
      console.warn(`[内部开发工具箱] 未读取到 WAF Cookie，请先在浏览器中打开 ${baseUrl} 完成一次登录`);
    }

    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: baseUrl,
      Referer: finalReferer,
    };
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    console.log('[内部开发工具箱] 请求:', path, 'token:', token.slice(0, 8) + '...', 'cookie:', cookieHeader ? '有' : '无');

    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
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
    let json;
    try { json = text ? JSON.parse(text) : {}; }
    catch (_) {
      // 非 JSON 响应：通常是被 WAF 拦截（挑战页 / 登录页 HTML）
      throw new Error(`非 JSON 响应（疑似被 WAF 拦截，请先在浏览器打开 ${BASE_URL} 完成登录）: ${text.slice(0, 120)}`);
    }

    // 业务层错误：HTTP 200 但 code != 200 / success === false（如 token 失效）
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const bizOk = json && (json.success === true || json.code === 200 || json.code === 0);
    if (!bizOk) {
      const msg = helpers?.extractErrorMessage?.(json) || `code=${json?.code ?? '?'} success=${json?.success ?? '?'}`;
      throw new Error(`接口返回失败: ${msg}`);
    }
    return json;
  }

  async function fetchTenantPage(opts) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const body = (ns.tenant || globalThis.InternalDevToolkit?.tenant)?.buildTenantPageBody(opts) || opts;
    return fetchAdminJson(paths.tenantPage, body, { referer: `${baseUrl}/tenant?rBK=52` });
  }

  async function fetchDeptList(opts) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const body = (ns.tenant || globalThis.InternalDevToolkit?.tenant)?.buildDeptListBody(opts) || opts;
    return fetchAdminJson(paths.deptList, body, { referer: `${baseUrl}/tenant/user?tenantId=${opts.tenantId}&industry=${opts.industry || 1}` });
  }

  async function fetchUserPage(opts) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const body = (ns.tenant || globalThis.InternalDevToolkit?.tenant)?.buildUserPageBody(opts) || opts;
    return fetchAdminJson(paths.userPage, body, { referer: `${baseUrl}/tenant/user?tenantId=${opts.tenantId}&industry=${opts.industry || 1}` });
  }

  async function quickLogin(opts) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const body = (ns.tenant || globalThis.InternalDevToolkit?.tenant)?.buildQuickLoginBody({ id: opts.id }) || { id: opts.id };
    console.log('[内部开发工具箱] virtualLogin 请求:', body);
    const res = await fetchAdminJson(paths.virtualLogin, body, { referer: `${baseUrl}/tenant/user?tenantId=${opts.tenantId || ''}&industry=${opts.industry || 1}` });
    console.log('[内部开发工具箱] virtualLogin 响应:', JSON.stringify(res));
    return res;
  }

  ns.tenantApi = { fetchTenantPage, fetchDeptList, fetchUserPage, quickLogin };
})();
