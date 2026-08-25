/* 内部开发工具箱 — Background APP 端登录（学生 APP token 获取） */
/* 默认站点为 http://localhost:5173，登录走该地址下的 /huayun-ai。 */
/* 鉴权依赖浏览器会话 cookie（authjs.session-token 等），APP 模块自身不持有 admin token。 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});

  const CRED_KEY = 'appLoginCredentials';
  const TOKEN_KEY = 'appLoginToken';
  const HISTORY_KEY = 'appLoginHistory';
  const MAX_HISTORY = 50;
  const DEFAULT_SITE_URL = 'http://localhost:5173';
  const DEFAULT_ACCOUNT = '202506002';
  const DEFAULT_PASSWORD = 'Xx@123456';
  // educationList 中默认选中的学校名
  const DEFAULT_SCHOOL_NAME = '未来智慧学校AI平台';
  // 会话依赖的 cookie 名称：登录接口需这些 cookie 才能通过鉴权
  const SESSION_COOKIE_NAMES = [
    'JSESSIONID',
    'HWWAFSESID',
    'HWWAFSESTIME',
    'authjs.session-token',
    'authjs.csrf-token',
  ];

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  // 规范化站点地址：补全协议、去掉末尾斜杠；空串或非 HTTP(S) 地址返回空。
  function normalizeSiteUrl(raw) {
    const input = String(raw || '').trim();
    if (!input) return '';
    const explicitScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(input);
    if (explicitScheme && !/^https?:\/\//i.test(input)) return '';
    try {
      const parsed = new URL(explicitScheme ? input : `http://${input}`);
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
        return '';
      }
      // 仅保留 origin，避免 path 干扰 API 拼接和标签页同源校验。
      return parsed.origin.replace(/\/+$/, '');
    } catch (_) {
      return '';
    }
  }

  function normalizeCreds(value = {}) {
    return {
      siteUrl: normalizeSiteUrl(value.siteUrl),
      account: typeof value.account === 'string' ? value.account : '',
      password: typeof value.password === 'string' ? value.password : '',
    };
  }

  function firstDisplayName(...values) {
    for (const value of values) {
      if (typeof value === 'string' || typeof value === 'number') {
        const text = String(value).trim();
        if (text) return text;
        continue;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const text = String(
        value.name ??
        value.label ??
        value.deptName ??
        value.gradeName ??
        value.className ??
        value.clazzName ??
        '',
      ).trim();
      if (text) return text;
    }
    return '';
  }

  function extractStudentPlacement(userDetail) {
    const data = userDetail?.data ?? userDetail?.result ?? userDetail;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { gradeName: '', className: '' };
    }
    const student = data.student && typeof data.student === 'object' && !Array.isArray(data.student)
      ? data.student
      : {};
    return {
      gradeName: firstDisplayName(
        data.gradeName,
        student.gradeName,
        data.gradeInfo,
        student.gradeInfo,
        data.grade,
        student.grade,
      ),
      className: firstDisplayName(
        data.className,
        data.clazzName,
        data.schoolClassName,
        student.className,
        student.clazzName,
        student.schoolClassName,
        data.classInfo,
        data.clazz,
        data.class,
        student.classInfo,
        student.clazz,
        student.class,
      ),
    };
  }

  function normalizeToken(value = {}) {
    const userDetail = value.userDetail && typeof value.userDetail === 'object'
      ? value.userDetail
      : null;
    const placement = extractStudentPlacement(userDetail);
    return {
      token: typeof value.token === 'string' ? value.token : '',
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
      user: value.user && typeof value.user === 'object' ? value.user : null,
      userDetail,
      gradeName: placement.gradeName || String(value.gradeName || '').trim(),
      className: placement.className || String(value.className || '').trim(),
    };
  }

  function defaultCredentials() {
    return {
      siteUrl: DEFAULT_SITE_URL,
      account: DEFAULT_ACCOUNT,
      password: DEFAULT_PASSWORD,
    };
  }

  async function getCredentials() {
    if (!hasChromeStorage()) return defaultCredentials();
    return new Promise((resolve) => {
      chrome.storage.local.get(CRED_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(defaultCredentials());
          return;
        }
        const stored = normalizeCreds(items[CRED_KEY] || {});
        // 首次无存储或历史地址为空时回填默认值，便于一键登录
        resolve({
          siteUrl: stored.siteUrl || DEFAULT_SITE_URL,
          account: stored.account || DEFAULT_ACCOUNT,
          password: stored.password || DEFAULT_PASSWORD,
        });
      });
    });
  }

  async function saveCredentials(partial) {
    const next = normalizeCreds(partial);
    if (!hasChromeStorage()) return next;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [CRED_KEY]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function getToken() {
    if (!hasChromeStorage()) return normalizeToken();
    return new Promise((resolve) => {
      chrome.storage.local.get(TOKEN_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(normalizeToken());
          return;
        }
        resolve(normalizeToken(items[TOKEN_KEY]));
      });
    });
  }

  async function saveToken(token, user = null, userDetail = null) {
    const next = normalizeToken({
      token: String(token || ''),
      updatedAt: Date.now(),
      user,
      userDetail,
    });
    if (!hasChromeStorage()) return next;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [TOKEN_KEY]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function clearToken() {
    if (!hasChromeStorage()) return;
    return new Promise((resolve) => {
      chrome.storage.local.remove(TOKEN_KEY, () => resolve());
    });
  }

  function historyIdentity(item = {}) {
    const siteUrl = normalizeSiteUrl(item.siteUrl);
    const account = String(item.account || '').trim();
    const tenantId = String(item.tenantId || '').trim();
    return `${siteUrl}::${account}::${tenantId}`;
  }

  function normalizeHistoryItem(item = {}) {
    const siteUrl = normalizeSiteUrl(item.siteUrl);
    const account = String(item.account || '').trim();
    const password = typeof item.password === 'string' ? item.password : '';
    const at = typeof item.at === 'number' ? item.at : Date.now();
    const user = item.user && typeof item.user === 'object' ? item.user : null;
    const userDetail = item.userDetail && typeof item.userDetail === 'object'
      ? item.userDetail
      : null;
    const placement = extractStudentPlacement(userDetail);
    return {
      siteUrl,
      account,
      password,
      tenantId: String(item.tenantId || '').trim(),
      tenantName: String(item.tenantName || ''),
      at,
      user,
      userDetail,
      gradeName: placement.gradeName || String(item.gradeName || '').trim(),
      className: placement.className || String(item.className || '').trim(),
      // 展示用冗余字段，便于列表直接渲染
      username: user?.username || item.username || '',
    };
  }

  async function getHistory() {
    if (!hasChromeStorage()) return [];
    return new Promise((resolve) => {
      chrome.storage.local.get(HISTORY_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve([]);
          return;
        }
        const raw = Array.isArray(items[HISTORY_KEY]) ? items[HISTORY_KEY] : [];
        const records = raw
          .map(normalizeHistoryItem)
          .filter((record) => record.account)
          .slice(0, MAX_HISTORY);
        if (raw.length !== records.length) {
          chrome.storage.local.set({ [HISTORY_KEY]: records }, () => resolve(records));
          return;
        }
        resolve(records);
      });
    });
  }

  // 按 siteUrl + account + tenantId 去重，最新操作置顶
  async function recordHistory(item) {
    const nextItem = normalizeHistoryItem(item);
    if (!nextItem.account) return getHistory();

    const records = await getHistory();
    const identity = historyIdentity(nextItem);
    const next = [
      nextItem,
      ...records.filter((r) => historyIdentity(r) !== identity),
    ].slice(0, MAX_HISTORY);

    if (!hasChromeStorage()) return next;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [HISTORY_KEY]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function deleteHistory({ siteUrl, account, tenantId } = {}) {
    const identity = historyIdentity({ siteUrl, account, tenantId });
    const records = await getHistory();
    const filtered = records.filter((r) => historyIdentity(r) !== identity);
    if (!hasChromeStorage()) return { ok: true, records: filtered };
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [HISTORY_KEY]: filtered }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve({ ok: true, records: filtered });
      });
    });
  }

  async function encryptPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // 发起 JSON POST：路径已含 /huayun-ai 前缀，直接拼到站点 origin 后
  // 鉴权依赖会话 cookie：fetch credentials:include + 手动补 chrome.cookies 取到的 WAF/会话 cookie
  async function postJson(siteOrigin, path, body, options = {}) {
    const origin = normalizeSiteUrl(siteOrigin);
    if (!origin) throw new Error('请先填写站点地址');
    const cleanPath = String(path || '').startsWith('/') ? path : `/${path || ''}`;
    const url = `${origin}${cleanPath}`;
    const headers = {
      Accept: options.accept || 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Origin: origin,
      Referer: options.referer || `${origin}/`,
    };

    if (options.token) {
      const clean = String(options.token).replace(/^Bearer\s+/i, '').trim();
      if (clean) {
        headers.Authorization = `Bearer ${clean}`;
        if (options.anxunAuth) {
          headers['anxun-auth'] = `bearer Bearer ${clean}`;
        }
      }
    }

    // 尽量附带站点会话 cookie（authjs.session-token 等），存在时注入 Cookie 头
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      try {
        const pairs = [];
        for (const name of SESSION_COOKIE_NAMES) {
          const cookie = await chrome.cookies.get({ url: origin, name });
          if (cookie?.value) pairs.push(`${cookie.name}=${cookie.value}`);
        }
        if (pairs.length) headers.Cookie = pairs.join('; ');
      } catch (_) {
        // ignore
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body ?? {}),
    });

    if (!res.ok) {
      let extra = '';
      try {
        extra = await res.text();
      } catch (_) {}
      throw new Error(`HTTP ${res.status}: ${res.statusText}${extra ? ' | ' + extra.slice(0, 200) : ''}`);
    }

    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (_) {
      return { _raw: text };
    }
  }

  function extractErrorMessage(response) {
    if (!response || typeof response !== 'object') return '';
    return response.msg || response.message || response.error || response.errorMessage || '';
  }

  // educationList 返回 { code:200, data:[{id,name,...}] }，id 即 tenantId
  function normalizeSchoolItem(item = {}) {
    return {
      tenantId: String(item.id ?? item.tenantId ?? ''),
      tenantName: String(item.name ?? item.tenantName ?? ''),
      domain: String(item.domain ?? ''),
      fullName: String(item.fullName ?? ''),
    };
  }

  function extractSchoolList(response) {
    if (!response || typeof response !== 'object') return [];
    const data = response.data ?? response.result ?? response;
    const list = Array.isArray(data) ? data : [];
    return list.map(normalizeSchoolItem).filter((s) => s.tenantId);
  }

  function extractTicket(captcha) {
    if (!captcha || typeof captcha !== 'object') return '';
    const data = captcha.data ?? captcha.result ?? captcha;
    return data?.ticket || data?.uuid || data?.captchaKey || data?.key || '';
  }

  // 滑块答案：getCaptcha 返回的 data.blockX 即 moveLength
  function extractMoveLength(captcha) {
    if (!captcha || typeof captcha !== 'object') return 0;
    const data = captcha.data ?? captcha.result ?? captcha;
    const raw = data?.blockX ?? data?.moveLength ?? data?.width ?? data?.x ?? data?.offset ?? 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }

  function extractAccessToken(response) {
    if (!response || typeof response !== 'object') return '';
    const data = response.data ?? response.result ?? response;
    let token = '';
    if (typeof data === 'string') {
      token = data;
    } else {
      token = (
        data?.accessToken ||
        data?.token ||
        data?.access_token ||
        data?.authorization ||
        data?.jwt ||
        ''
      );
    }
    return String(token).replace(/^Bearer\s+/i, '').trim();
  }

  function extractUserInfo(response) {
    if (!response || typeof response !== 'object') return null;
    const data = response.data ?? response.result ?? response;
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  }

  function extractUserSummary(response) {
    const data = response?.data;
    if (!data || typeof data !== 'object') return null;
    return {
      userId: data.userId || '',
      username: data.username || '',
      account: data.account || data.studentCode || '',
      phone: data.phone || '',
      tenantId: data.tenantId || '',
      tenantName: data.tenantName || '',
      domain: data.domain || '',
      roleNames: Array.isArray(data.roleNames) ? data.roleNames : [],
      type: data.type,
      teacherId: data.teacherId,
      studentId: data.studentId,
      roleIds: data.roleIds,
      menuCodes: data.menuCodes,
      avatar: data.avatar || '',
      roleName: data.roleName || '',
      status: data.status,
    };
  }

  // 拉取学校列表：educationList 返回全量，前端做模糊搜索
  async function listSchools({ siteUrl } = {}) {
    const creds = await getCredentials();
    const finalSiteUrl = normalizeSiteUrl(siteUrl || creds.siteUrl);
    if (!finalSiteUrl) throw new Error('请先填写站点地址');

    const res = await postJson(finalSiteUrl, '/huayun-ai/client/tenant/educationList', {});
    if (res && res.success === false) {
      throw new Error(extractErrorMessage(res) || '获取学校列表失败');
    }
    const schools = extractSchoolList(res);
    if (!schools.length) {
      throw new Error(extractErrorMessage(res) || '学校列表为空');
    }
    return { siteUrl: finalSiteUrl, schools, defaultSchoolName: DEFAULT_SCHOOL_NAME };
  }

  async function fetchUserDetail(siteUrl, token, userInfo) {
    const detailId = String(userInfo?.studentId ?? userInfo?.id ?? '').trim();
    if (!detailId) {
      throw new Error('登录接口未返回 studentId，无法获取用户详情');
    }

    const response = await postJson(
      siteUrl,
      '/huayun-ai/app/user/detail',
      { id: detailId },
      {
        token,
        anxunAuth: true,
        accept: '*/*',
      },
    );
    const responseCode = response?.code;
    if (
      response?.success === false ||
      (responseCode != null && Number(responseCode) !== 200)
    ) {
      throw new Error(extractErrorMessage(response) || '获取用户详情失败');
    }
    return response;
  }

  // APP 一键登录：验证码 → studentLogin → user/detail
  async function doLogin({ siteUrl, account, password, tenantId, tenantName } = {}) {
    const creds = await getCredentials();
    const finalSiteUrl = normalizeSiteUrl(siteUrl || creds.siteUrl);
    if (!finalSiteUrl) {
      throw new Error('请先填写站点地址');
    }
    // 始终优先使用本次传入的账号密码，避免切换账号后仍落到缓存旧值
    const finalAccount = String(account != null && account !== '' ? account : (creds.account || DEFAULT_ACCOUNT)).trim();
    const finalPassword = String(password != null && password !== '' ? password : (creds.password || DEFAULT_PASSWORD));
    if (!finalAccount || !finalPassword) {
      throw new Error('请输入账号和密码');
    }
    const finalTenantId = String(tenantId || '').trim();
    if (!finalTenantId) {
      throw new Error('请选择学校');
    }
    const finalTenantName = String(tenantName || '').trim();

    // 登录前持久化当前输入，方便下次打开
    await saveCredentials({
      siteUrl: finalSiteUrl,
      account: finalAccount,
      password: finalPassword,
    });

    const captcha = await postJson(finalSiteUrl, '/huayun-ai/app/auth/getCaptcha', {});
    if (captcha && captcha.success === false) {
      throw new Error(extractErrorMessage(captcha) || '获取验证码失败');
    }

    const ticket = extractTicket(captcha);
    if (!ticket) {
      throw new Error('getCaptcha 未返回 ticket');
    }
    const moveLength = extractMoveLength(captcha);
    const captchaValidation = await postJson(
      finalSiteUrl,
      `/huayun-ai/app/auth/getCaptcha?moveLength=${encodeURIComponent(moveLength)}&ticket=${encodeURIComponent(ticket)}`,
      {
        params: {
          moveLength,
          ticket: String(ticket),
        },
      },
    );
    if (captchaValidation && captchaValidation.success === false) {
      throw new Error(extractErrorMessage(captchaValidation) || '验证码校验失败');
    }

    const passwordHash = await encryptPassword(finalPassword);

    const loginRes = await postJson(finalSiteUrl, '/huayun-ai/app/auth/studentLogin', {
      account: finalAccount,
      password: passwordHash,
      tenantId: finalTenantId,
      moveLength,
      ticket: String(ticket),
    });

    if (loginRes && loginRes.success === false) {
      throw new Error(extractErrorMessage(loginRes) || '登录失败');
    }

    const token = extractAccessToken(loginRes);
    if (!token) {
      throw new Error(extractErrorMessage(loginRes) || '登录接口未返回 token');
    }

    const userInfo = extractUserInfo(loginRes);
    if (!userInfo) {
      throw new Error(extractErrorMessage(loginRes) || '登录接口未返回 userInfo');
    }
    const user = extractUserSummary(loginRes);
    const userDetail = await fetchUserDetail(finalSiteUrl, token, userInfo);
    const placement = extractStudentPlacement(userDetail);
    await saveToken(token, userInfo, userDetail);
    return {
      token,
      user,
      userInfo,
      userDetail,
      gradeName: placement.gradeName,
      className: placement.className,
      siteUrl: finalSiteUrl,
      account: finalAccount,
      password: finalPassword,
      tenantId: finalTenantId,
      tenantName: user?.tenantName || finalTenantName,
      loginRes,
      captcha,
      captchaValidation,
    };
  }

  function queryTabs(queryInfo) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query(queryInfo, (tabs) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(Array.isArray(tabs) ? tabs : []);
      });
    });
  }

  function tabMatchesOrigin(tab, origin) {
    const rawUrl = tab?.url || tab?.pendingUrl || '';
    try {
      return new URL(rawUrl).origin === origin;
    } catch (_) {
      return false;
    }
  }

  async function findSiteTab(siteUrl) {
    const origin = normalizeSiteUrl(siteUrl);
    if (!origin) throw new Error('站点地址无效');
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      throw new Error('当前环境不支持访问网站标签页');
    }

    const activeTabs = await queryTabs({ active: true, currentWindow: true });
    const activeTab = activeTabs.find((tab) => tab?.id && tabMatchesOrigin(tab, origin));
    if (activeTab) return activeTab;

    const allTabs = await queryTabs({});
    const matchingTab = allTabs.find((tab) => tab?.id && tabMatchesOrigin(tab, origin));
    if (matchingTab) return matchingTab;

    throw new Error(`未找到已打开的 ${origin} 页面`);
  }

  async function injectSiteSessionAndNavigateToRoot(siteUrl, token, userInfo) {
    if (!chrome.scripting?.executeScript) {
      throw new Error('当前环境不支持写入网站登录态');
    }
    const sessionToken = String(userInfo?.accessToken || token || '').trim();
    if (!sessionToken) throw new Error('缺少 token');
    if (!userInfo || typeof userInfo !== 'object' || Array.isArray(userInfo)) {
      throw new Error('缺少 userInfo');
    }

    const tab = await findSiteTab(siteUrl);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: (sessionToken, sessionUserInfo) => {
        localStorage.setItem('token', sessionToken);
        localStorage.setItem('userInfo', JSON.stringify(sessionUserInfo));
        window.location.assign(`${window.location.origin}/`);
      },
      args: [sessionToken, userInfo],
    });
    return { tabId: tab.id };
  }

  async function loginAndInject(payload = {}) {
    const creds = await getCredentials();
    const finalSiteUrl = normalizeSiteUrl(payload.siteUrl || creds.siteUrl);
    if (!finalSiteUrl) {
      throw new Error('站点地址无效，请输入 HTTP(S) 地址');
    }
    // 登录前先确认存在可注入的同源页面，避免完成登录后才发现目标地址错误。
    await findSiteTab(finalSiteUrl);

    const shouldRecordHistory = payload.recordHistory !== false;
    const result = await doLogin({ ...payload, siteUrl: finalSiteUrl });
    if (shouldRecordHistory) {
      // 登录和用户详情获取成功后先落历史，再注入页面并跳转。
      await recordHistory({
        siteUrl: result.siteUrl,
        account: result.account,
        password: result.password,
        tenantId: result.tenantId,
        tenantName: result.tenantName,
        user: result.user,
        userDetail: result.userDetail,
      });
    }
    const injected = await injectSiteSessionAndNavigateToRoot(result.siteUrl, result.token, result.userInfo);
    return { ...result, ...injected };
  }

  ns.appLogin = {
    DEFAULT_SITE_URL,
    DEFAULT_ACCOUNT,
    DEFAULT_PASSWORD,
    DEFAULT_SCHOOL_NAME,
    normalizeSiteUrl,
    extractStudentPlacement,
    defaultCredentials,
    getCredentials,
    saveCredentials,
    getToken,
    saveToken,
    clearToken,
    getHistory,
    recordHistory,
    deleteHistory,
    listSchools,
    doLogin,
    findSiteTab,
    injectSiteSessionAndNavigateToRoot,
    loginAndInject,
  };
})();
