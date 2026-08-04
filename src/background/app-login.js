/* 内部开发工具箱 — Background APP 端登录（学生 APP token 获取） */
/* 站点地址由用户填写（如 http://localhost:5174），登录走该地址下的 /huayun-ai。 */
/* 鉴权依赖浏览器会话 cookie（authjs.session-token 等），APP 模块自身不持有 admin token。 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});

  const CRED_KEY = 'appLoginCredentials';
  const TOKEN_KEY = 'appLoginToken';
  const HISTORY_KEY = 'appLoginHistory';
  const MAX_HISTORY = 20;
  const DEFAULT_ACCOUNT = '202506002';
  const DEFAULT_PASSWORD = 'Xx@123456';
  // educationList 中默认选中的学校名
  const DEFAULT_SCHOOL_NAME = '未来智慧学校AI平台';
  // 会话依赖的 cookie 名称：登录接口需这些 cookie 才能通过鉴权
  const SESSION_COOKIE_NAMES = [
    'HWWAFSESID',
    'HWWAFSESTIME',
    'authjs.session-token',
    'authjs.csrf-token',
  ];

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  // 规范化站点地址：补全协议、去掉末尾斜杠；空串保留为空（登录前校验）
  function normalizeSiteUrl(raw) {
    const input = String(raw || '').trim();
    if (!input) return '';
    let url = input;
    if (!/^https?:\/\//i.test(url)) {
      url = `http://${url}`;
    }
    try {
      const parsed = new URL(url);
      // 仅保留 origin，避免 path 干扰 API 拼接
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

  function normalizeToken(value = {}) {
    return {
      token: typeof value.token === 'string' ? value.token : '',
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
      user: value.user && typeof value.user === 'object' ? value.user : null,
    };
  }

  function defaultCredentials() {
    return {
      siteUrl: '',
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
        // 首次无存储时回填默认账号密码，便于一键登录
        resolve({
          siteUrl: stored.siteUrl || '',
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

  async function saveToken(token, user = null) {
    const next = {
      token: String(token || ''),
      updatedAt: Date.now(),
      user: user && typeof user === 'object' ? user : null,
    };
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
    return {
      siteUrl,
      account,
      password,
      tenantId: String(item.tenantId || '').trim(),
      tenantName: String(item.tenantName || ''),
      at,
      user,
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
        resolve(raw.map(normalizeHistoryItem).filter((r) => r.account));
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
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Origin: origin,
      Referer: options.referer || `${origin}/`,
    };

    // 需鉴权的接口附带 Bearer token（APP 登录流程一般无需此参数，保留以备扩展）
    if (options.token) {
      const clean = String(options.token).replace(/^Bearer\s+/i, '').trim();
      if (clean) headers.Authorization = `Bearer ${clean}`;
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

  // APP 一键登录：getCaptcha → sha256(密码) → studentLogin
  async function doLogin({ siteUrl, account, password, tenantId } = {}) {
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

    const user = extractUserSummary(loginRes);
    await saveToken(token, user);
    return {
      token,
      user,
      siteUrl: finalSiteUrl,
      account: finalAccount,
      password: finalPassword,
      tenantId: finalTenantId,
      tenantName: user?.tenantName || '',
      loginRes,
      captcha,
    };
  }

  ns.appLogin = {
    DEFAULT_ACCOUNT,
    DEFAULT_PASSWORD,
    DEFAULT_SCHOOL_NAME,
    normalizeSiteUrl,
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
  };
})();
