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
      throw new Error(`非 JSON 响应（疑似被 WAF 拦截，请先在浏览器打开 ${baseUrl} 完成登录）: ${text.slice(0, 120)}`);
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

  // ── Client 端 API（教师/学生/班级） ──
  // 这些接口走用户态域名（如 https://uuu.huayungpt.com），而非 admin 域名。
  // 使用 admin token 鉴权。

  async function fetchClientJson(origin, path, body, { referer } = {}) {
    const token = await getToken();
    if (!token) throw new Error('未获取 admin token，请先登录');
    const cleanOrigin = String(origin || '').replace(/\/+$/, '');
    if (!cleanOrigin) throw new Error('缺少目标域名');

    const cookieHeader = await ns.cookies.getWafCookies();
    const finalReferer = referer || `${cleanOrigin}/`;

    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: cleanOrigin,
      Referer: finalReferer,
    };
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    console.log('[内部开发工具箱] Client API 请求:', `${cleanOrigin}${path}`);

    const url = `${cleanOrigin}${path}`;
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
      throw new Error(`非 JSON 响应: ${text.slice(0, 120)}`);
    }

    const bizOk = json && (json.success === true || json.code === 200 || json.code === 0);
    if (!bizOk) {
      const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
      const msg = helpers?.extractErrorMessage?.(json) || `code=${json?.code ?? '?'} success=${json?.success ?? '?'}`;
      throw new Error(`接口返回失败: ${msg}`);
    }
    return json;
  }

  // 教师列表：/client/teacher/page
  async function fetchTeacherPage({ origin, current = 1, size = 10, name = '', account = '' }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildTeacherPageBody({ current, size, name, account }) || { current, size, name, account };
    return fetchClientJson(origin, '/huayun-ai/client/teacher/page', body, {
      referer: `${origin}/v2/tenant/teamManagement/teacher`,
    });
  }

  // 学生列表：/client/student/page
  async function fetchStudentPage({ origin, current = 1, size = 10, name = '', code = '', className = '' }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildStudentPageBody({ current, size, name, code, className }) || { current, size, name, code, className };
    return fetchClientJson(origin, '/huayun-ai/client/student/page', body, {
      referer: `${origin}/v2/tenant/teamManagement/student`,
    });
  }

  // 年级/学段/班级树：/client/schoolDept/tree
  async function fetchSchoolDeptTree({ origin }) {
    return fetchClientJson(origin, '/huayun-ai/client/schoolDept/tree', {}, {
      referer: `${origin}/v2/tenant/teamManagement/student`,
    });
  }

  ns.tenantApi = {
    fetchTenantPage, fetchDeptList, fetchUserPage, quickLogin,
    fetchTeacherPage, fetchStudentPage, fetchSchoolDeptTree,
  };
})();
