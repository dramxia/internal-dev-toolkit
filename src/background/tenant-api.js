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

  function redact(value) {
    return String(value || '')
      .replace(/("(?:token|accessToken|authorization|jwt)"\s*:\s*")[^"]*(")/gi, '$1<redacted>$2')
      .replace(/(Bearer\s+)[^\s&"']+/gi, '$1<redacted>')
      .replace(/((?:token|accessToken|authorization|jwt)[=:\s]+)[^\s&"']+/gi, '$1<redacted>');
  }

  function isBusinessSuccess(json) {
    if (!json || typeof json !== 'object') return false;
    // 部分接口会同时返回 HTTP 200 / code=200 与 success=false；显式失败优先，
    // 避免把 token 失效或参数错误当成可用数据继续流转。
    if (json.success === false || json.success === 0 || json.success === '0' || json.success === 'false') return false;
    const code = Number(json.code);
    return json.success === true || json.success === 1 || json.success === '1' || json.success === 'true' ||
      code === 0 || (Number.isFinite(code) && code >= 200 && code < 400);
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

    console.log('[内部开发工具箱] 后台请求:', path, 'cookie:', cookieHeader ? '有' : '无');

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
      throw new Error(`HTTP ${res.status}: ${res.statusText}${extra ? ' | ' + redact(extra).slice(0, 200) : ''}`);
    }

    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; }
    catch (_) {
      // 非 JSON 响应：通常是被 WAF 拦截（挑战页 / 登录页 HTML）
      throw new Error(`非 JSON 响应（疑似被 WAF 拦截，请先在浏览器打开 ${baseUrl} 完成登录）`);
    }

    // 业务层错误：HTTP 200 但 code != 200 / success === false（如 token 失效）
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const bizOk = isBusinessSuccess(json);
    if (!bizOk) {
      const msg = redact(helpers?.extractErrorMessage?.(json) || `code=${json?.code ?? '?'} success=${json?.success ?? '?'}`);
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

  async function fetchAccountPage(opts = {}) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildAccountPageBody(opts) || opts;
    return fetchAdminJson(paths.accountPage || paths.accountUserPage || '/huayun-ai/admin/tenant/user/account/page', body, {
      referer: `${baseUrl}/account?rBK=12`,
    });
  }

  async function quickLogin(opts) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const body = (ns.tenant || globalThis.InternalDevToolkit?.tenant)?.buildQuickLoginBody({ id: opts.id }) || { id: opts.id };
    const res = await fetchAdminJson(paths.virtualLogin, body, { referer: `${baseUrl}/tenant/user?tenantId=${opts.tenantId || ''}&industry=${opts.industry || 1}` });
    console.log('[内部开发工具箱] virtualLogin 完成:', Boolean(res?.data));
    return res;
  }

  // ── Client 端 API（教师/学生/班级） ──
  // 这些接口走用户态域名（如 https://uuu.huayungpt.com），而非 admin 域名。
  // Client API 只接受 virtualLogin 返回的 AI 平台 token，绝不回落后台 token。

  async function fetchClientJson(origin, path, body, { referer, aiToken } = {}) {
    const token = aiToken ? String(aiToken).replace(/^Bearer\s+/i, '').trim() : '';
    if (!token) throw new Error('未获取 AI 平台 token，请先选中账号');
    const cleanOrigin = String(origin || '').replace(/\/+$/, '');
    if (!cleanOrigin) throw new Error('缺少目标域名');

    const cookieHeader = ns.cookies.getWafCookiesForUrl
      ? await ns.cookies.getWafCookiesForUrl(cleanOrigin)
      : await ns.cookies.getWafCookies();
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
      throw new Error(`HTTP ${res.status}: ${res.statusText}${extra ? ' | ' + redact(extra).slice(0, 200) : ''}`);
    }

    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; }
    catch (_) {
      throw new Error('非 JSON 响应（请检查 AI 平台会话或 WAF Cookie）');
    }

    const bizOk = isBusinessSuccess(json);
    if (!bizOk) {
      const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
      const msg = redact(helpers?.extractErrorMessage?.(json) || `code=${json?.code ?? '?'} success=${json?.success ?? '?'}`);
      throw new Error(`接口返回失败: ${msg}`);
    }
    return json;
  }

  // 教师列表：/client/teacher/page
  async function fetchTeacherPage({ origin, aiToken, current = 1, size = 10, name = '', account = '', phone = '' }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildTeacherPageBody({ current, size, name, account, phone }) || { current, size };
    return fetchClientJson(origin, '/huayun-ai/client/teacher/page', body, {
      referer: `${origin}/v2/tenant/teamManagement/teacher`,
      aiToken,
    });
  }

  // 学生列表：/client/student/page
  async function fetchStudentPage({ origin, aiToken, current = 1, size = 10, name = '', code = '', account = '', className = '', clazzId = '', clazzIds = [] }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildStudentPageBody({ current, size, name, code, account, className, clazzId, clazzIds }) || { current, size };
    return fetchClientJson(origin, '/huayun-ai/client/student/page', body, {
      referer: `${origin}/v2/tenant/teamManagement/student`,
      aiToken,
    });
  }

  // 学期列表：/client/semester/page
  async function fetchSemesterPage({ origin, aiToken, current = 1, size = 999 }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildSemesterPageBody({ current, size }) || { current, size };
    return fetchClientJson(origin, '/huayun-ai/client/semester/page', body, {
      referer: `${origin}/v2/tenant/teamManagement/administration`,
      aiToken,
    });
  }

  // 教师详情：/client/teacher/detail
  async function fetchTeacherDetail({ origin, aiToken, id }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildTeacherDetailBody({ id }) || { id: String(id) };
    return fetchClientJson(origin, '/huayun-ai/client/teacher/detail', body, {
      referer: `${origin}/v2/tenant/teamManagement/teacher`,
      aiToken,
    });
  }

  // 年级/学段/班级树：/client/schoolDept/tree（semesterId 为空时不传）
  async function fetchSchoolDeptTree({ origin, aiToken, semesterId = '' }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildSchoolDeptTreeBody({ semesterId }) || {};
    return fetchClientJson(origin, '/huayun-ai/client/schoolDept/tree', body, {
      referer: `${origin}/v2/tenant/teamManagement/teacher`,
      aiToken,
    });
  }

  // 班级对应教师：/client/schoolManageTeacher/listByClazz
  async function fetchClassTeachers({ origin, aiToken, semesterId = '' }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildClazzTeacherListBody({ semesterId }) || {};
    return fetchClientJson(origin, '/huayun-ai/client/schoolManageTeacher/listByClazz', body, {
      referer: `${origin}/v2/tenant/teamManagement/administration`,
      aiToken,
    });
  }

  ns.tenantApi = {
    fetchTenantPage, fetchDeptList, fetchUserPage, fetchAccountPage,
    fetchAccountUserPage: fetchAccountPage,
    quickLogin,
    fetchTeacherPage, fetchStudentPage, fetchSemesterPage,
    fetchTeacherDetail, fetchSchoolDeptTree, fetchClassTeachers,
  };
})();
