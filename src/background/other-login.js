/* 内部开发工具箱 — Background「其它」站点登录（知雀 / 高职校） */
/* 默认目标：https://high-school.huayuntiantu.com ，可通过 popup 修改网址。 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});

  const DEFAULT_SITE_URL = 'https://high-school.huayuntiantu.com';
  const API_PATH_PREFIX = '/huayun-ai';
  const CRED_KEY = 'otherLoginCredentials';
  const TOKEN_KEY = 'otherLoginToken';
  const HISTORY_KEY = 'otherLoginHistory';
  const MAX_HISTORY = 20;
  const DEFAULT_ACCOUNT = '19068529991';
  const DEFAULT_PASSWORD = 'Xx@123456';

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  // 规范化站点地址：补全协议、去掉末尾斜杠；非法输入回退默认值
  function normalizeSiteUrl(raw) {
    const input = String(raw || '').trim();
    if (!input) return DEFAULT_SITE_URL;
    let url = input;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      const parsed = new URL(url);
      // 仅保留 origin，避免 path 干扰 API 拼接
      return parsed.origin.replace(/\/+$/, '');
    } catch (_) {
      return DEFAULT_SITE_URL;
    }
  }

  function normalizeCreds(value = {}) {
    return {
      siteUrl: normalizeSiteUrl(value.siteUrl || DEFAULT_SITE_URL),
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
        // 首次无存储时回填默认值，便于一键登录
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
    const siteUrl = normalizeSiteUrl(item.siteUrl || DEFAULT_SITE_URL);
    const account = String(item.account || '').trim();
    return `${siteUrl}::${account}`;
  }

  function normalizeHistoryItem(item = {}) {
    const siteUrl = normalizeSiteUrl(item.siteUrl || DEFAULT_SITE_URL);
    const account = String(item.account || '').trim();
    const password = typeof item.password === 'string' ? item.password : '';
    const lastAction = item.lastAction === 'zhique' ? 'zhique' : 'enter';
    const at = typeof item.at === 'number' ? item.at : Date.now();
    const user = item.user && typeof item.user === 'object' ? item.user : null;
    return {
      siteUrl,
      account,
      password,
      lastAction,
      at,
      user,
      // 展示用冗余字段，便于列表直接渲染
      username: user?.username || item.username || '',
      tenantName: user?.tenantName || item.tenantName || '',
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

  // 按 siteUrl + account 去重，最新操作置顶
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

  async function deleteHistory({ siteUrl, account } = {}) {
    const identity = historyIdentity({ siteUrl, account });
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

  async function postJson(siteOrigin, path, body, options = {}) {
    const origin = normalizeSiteUrl(siteOrigin);
    // 默认 /huayun-ai；教师列表等接口在 /ai-university 下
    const apiPrefix = options.apiPrefix != null ? String(options.apiPrefix) : API_PATH_PREFIX;
    const cleanPath = String(path || '').startsWith('/') ? path : `/${path || ''}`;
    const url = `${origin}${apiPrefix}${cleanPath}`;
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Origin: origin,
      Referer: options.referer || `${origin}/login`,
      Language: 'zh-CN',
    };

    // 需鉴权的接口（如知雀 redirectUrl / 教师列表）附带 Bearer token
    if (options.token) {
      const clean = String(options.token).replace(/^Bearer\s+/i, '').trim();
      if (clean) headers.Authorization = `Bearer ${clean}`;
    }

    // 尽量附带站点 WAF cookie（存在时）
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      try {
        const names = ['HWWAFSESID', 'HWWAFSESTIME'];
        const pairs = [];
        for (const name of names) {
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

  function extractTicket(captcha) {
    if (!captcha || typeof captcha !== 'object') return '';
    const data = captcha.data ?? captcha.result ?? captcha;
    return data?.ticket || data?.uuid || data?.captchaKey || data?.key || '';
  }

  function extractMoveLength(captcha, fallback = 212) {
    if (!captcha || typeof captcha !== 'object') return fallback;
    const data = captcha.data ?? captcha.result ?? captcha;
    const raw = data?.blockX ?? data?.moveLength ?? data?.width ?? data?.x ?? data?.offset ?? fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
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
      account: data.account || data.phone || '',
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
      roleType: data.roleType,
      roleName: data.roleName || '',
      status: data.status,
    };
  }

  // 与高职校前端一致：login 返回 data.status === "0" 表示必须先修改密码
  function isNeedResetPassword(response) {
    if (!response || typeof response !== 'object') return false;
    const data = response.data ?? response.result ?? response;
    if (!data || typeof data !== 'object') return false;
    return String(data.status) === '0';
  }

  const NEED_RESET_PASSWORD_MSG = '当前账号需要修改密码，请先重置密码后再操作';

  async function doLogin({ siteUrl, account, password } = {}) {
    const creds = await getCredentials();
    const finalSiteUrl = normalizeSiteUrl(siteUrl || creds.siteUrl || DEFAULT_SITE_URL);
    // 始终优先使用本次传入的账号密码，避免切换账号后仍落到缓存旧值
    const finalAccount = String(account != null && account !== '' ? account : (creds.account || DEFAULT_ACCOUNT)).trim();
    const finalPassword = String(password != null && password !== '' ? password : (creds.password || DEFAULT_PASSWORD));
    if (!finalAccount || !finalPassword) {
      throw new Error('请输入账号和密码');
    }

    // 登录前持久化当前输入，方便下次打开
    await saveCredentials({
      siteUrl: finalSiteUrl,
      account: finalAccount,
      password: finalPassword,
    });

    const captcha = await postJson(finalSiteUrl, '/client/auth/getCaptcha', {});
    if (captcha && captcha.success === false) {
      throw new Error(extractErrorMessage(captcha) || '获取验证码失败');
    }

    const ticket = extractTicket(captcha);
    if (!ticket) {
      throw new Error('getCaptcha 未返回 ticket');
    }
    const moveLength = extractMoveLength(captcha);
    const passwordHash = await encryptPassword(finalPassword);

    const loginRes = await postJson(finalSiteUrl, '/client/auth/university/login', {
      account: finalAccount,
      password: passwordHash,
      ticket: String(ticket),
      moveLength,
    });

    if (loginRes && loginRes.success === false) {
      throw new Error(extractErrorMessage(loginRes) || '登录失败');
    }

    const token = extractAccessToken(loginRes);
    if (!token) {
      throw new Error(extractErrorMessage(loginRes) || '登录接口未返回 token');
    }

    // 校验返回账号，防止误用旧会话/串号
    const user = extractUserSummary(loginRes);
    if (user?.account && user.account !== finalAccount && user.phone && user.phone !== finalAccount) {
      // 仅当两边都对不上时告警；有的环境 account 字段可能为空，phone 才是登录名
      if (user.account && user.account !== finalAccount) {
        console.warn('[other-login] 登录返回账号与请求不一致', {
          request: finalAccount,
          responseAccount: user.account,
          responsePhone: user.phone,
        });
      }
    }

    // status=0：需要修改密码。仍保存 token（前端改密弹窗会用到），但标记 needResetPassword
    const needResetPassword = isNeedResetPassword(loginRes);
    await saveToken(token, user);
    return {
      token,
      user,
      siteUrl: finalSiteUrl,
      account: finalAccount,
      password: finalPassword,
      needResetPassword,
      loginRes,
      captcha,
    };
  }

  async function openUrl(url) {
    if (!url) throw new Error('缺少 URL');
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url, active: true }, (tab) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab);
        }
      });
    });
  }

  function waitTabComplete(tabId, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        if (err) reject(err);
        else resolve();
      };
      const timer = setTimeout(() => finish(new Error('页面加载超时')), timeoutMs);
      const onUpdated = (id, info) => {
        if (id === tabId && info.status === 'complete') finish();
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime?.lastError) {
          finish(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (tab && tab.status === 'complete') finish();
      });
    });
  }

  // 站点 AuthProvider 会优先读 localStorage 旧会话；
  // 若不清理，打开 /login?accessToken=新token 时会被旧账号直接带进首页。
  const SITE_AUTH_KEYS = [
    'system_access_token',
    'course-auth-user',
    'course-selected-role',
    'teacher_access_token',
    'student_access_token',
    'course_fastgpt_token',
    'student-auth-storage',
  ];

  async function clearSiteAuthStorage(tabId) {
    if (!chrome.scripting?.executeScript) {
      throw new Error('当前环境不支持 scripting.executeScript');
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (keys) => {
        for (const key of keys) {
          try {
            localStorage.removeItem(key);
          } catch (_) {}
        }
      },
      args: [SITE_AUTH_KEYS],
    });
  }

  // 写入与站点 login() 一致的 localStorage，确保切换账号后立即生效
  async function injectSiteAuth(tabId, token, user = null) {
    if (!chrome.scripting?.executeScript) return;
    const cleanToken = String(token || '').replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) return;
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (keys, cleanToken, user) => {
        for (const key of keys) {
          try {
            localStorage.removeItem(key);
          } catch (_) {}
        }
        try {
          localStorage.setItem('system_access_token', cleanToken);
          if (user && (user.userId || user.account || user.username)) {
            const authUser = {
              id: String(user.userId || ''),
              name: user.username || '',
              account: user.account || user.phone || '',
              token: cleanToken,
              role: user.roleName || '',
              avatar: user.avatar || '',
              teacherId: user.teacherId,
              studentId: user.studentId,
              menuCodes: user.menuCodes || [],
              type: user.type,
              roleType: user.roleType,
              roleIds: user.roleIds || [],
            };
            localStorage.setItem('course-auth-user', JSON.stringify(authUser));
            const isStudent = Number(user.type) === 1 || Number(user.studentId) > 0 && !(Number(user.teacherId) > 0);
            if (isStudent) {
              localStorage.setItem('student_access_token', cleanToken);
              localStorage.setItem('course-selected-role', 'student');
            } else {
              localStorage.removeItem('student_access_token');
              localStorage.setItem('course-selected-role', 'teacher');
            }
          }
        } catch (_) {}
      },
      args: [SITE_AUTH_KEYS, cleanToken, user],
    });
  }

  async function updateTabUrl(tabId, url) {
    return new Promise((resolve, reject) => {
      chrome.tabs.update(tabId, { url }, (updated) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(updated);
        }
      });
    });
  }

  // 打开站点并携带 accessToken：
  // 1) 先打开同源页 2) 清掉旧会话 3) 再跳登录页带新 token
  // 否则 AuthProvider 发现 course-auth-user 仍在，会忽略 URL 里的新 accessToken。
  async function openWithToken(siteUrl, token, user = null) {
    const origin = normalizeSiteUrl(siteUrl || DEFAULT_SITE_URL);
    const cleanToken = String(token || '').replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) throw new Error('缺少 token');

    const bootstrapUrl = `${origin}/login`;
    // 加 _t 防缓存；先清旧态再带新 token，避免串号
    const enterUrl = `${origin}/login?accessToken=${encodeURIComponent(cleanToken)}&_t=${Date.now()}`;

    const tab = await openUrl(bootstrapUrl);
    try {
      await waitTabComplete(tab.id);
      // 关键关键：先清旧会话，绝不残留旧 system_access_token / course-auth-user
      await clearSiteAuthStorage(tab.id);
      await injectSiteAuth(tab.id, cleanToken, user);
    } catch (err) {
      // 清理失败不阻断，仍尝试带 token 打开；但切换账号场景下成功率会下降
      console.warn('[other-login] 清理/注入站点登录态失败:', err);
    }

    await updateTabUrl(tab.id, enterUrl);
    return { tab, url: enterUrl };
  }

  // 一键登入：先调登录接口拿 token，再打开系统完成自动登录
  async function doEnter({ siteUrl, account, password } = {}) {
    const result = await doLogin({ siteUrl, account, password });
    // 需改密：只提示，不跳转系统
    if (result.needResetPassword) {
      throw new Error(NEED_RESET_PASSWORD_MSG);
    }
    const opened = await openWithToken(result.siteUrl, result.token, result.user);
    // 仅成功进入后记历史：按 siteUrl+account 去重，保留最新密码
    await recordHistory({
      siteUrl: result.siteUrl,
      account: result.account,
      password: result.password,
      lastAction: 'enter',
      user: result.user,
    });
    return { ...result, tabId: opened.tab?.id, enterUrl: opened.url };
  }

  function extractRedirectUrl(response) {
    if (!response || typeof response !== 'object') return '';
    const data = response.data ?? response.result ?? response;
    if (typeof data === 'string') return data.trim();
    if (!data || typeof data !== 'object') return '';
    return String(data.url || data.redirectUrl || data.redirect || '').trim();
  }

  // 与教师端「AI数字课/知雀」一致：在 oauth authorize URL 后追加 state
  // state.redirect=/home → 最终进入 https://a.zhique.cn/home
  function buildZhiqueEnterUrl(redirectUrl, language = 'zh-CN') {
    if (!redirectUrl) throw new Error('未获取到知雀跳转地址');
    const state = encodeURIComponent(JSON.stringify({
      redirect: '/home',
      language,
    }));
    const sep = redirectUrl.includes('?') ? '&' : '?';
    return `${redirectUrl}${sep}state=${state}`;
  }

  // 知雀：登录拿 token → 清旧会话并注入新会话 → redirectUrl → OAuth SSO
  // 对齐教师端 window.open(redirectUrl + state)；切换账号时必须先清站点 localStorage
  async function doZhiqueEnter({ siteUrl, account, password } = {}) {
    const result = await doLogin({ siteUrl, account, password });
    // 需改密：只提示，不进入知雀 SSO
    if (result.needResetPassword) {
      throw new Error(NEED_RESET_PASSWORD_MSG);
    }

    // 先在高职校站点落新登录态，避免 oauth/authorize 仍按旧会话授权
    const opened = await openWithToken(result.siteUrl, result.token, result.user);
    try {
      // 等登录页处理完 accessToken（会跳离 /login 或写完 localStorage）
      await waitTabComplete(opened.tab.id, 25000);
    } catch (err) {
      console.warn('[other-login] 等待高职校登录完成超时，继续尝试知雀跳转:', err);
    }

    const redirectRes = await postJson(
      result.siteUrl,
      '/client/tenant/zhique/redirectUrl',
      {},
      { token: result.token },
    );
    if (redirectRes && redirectRes.success === false) {
      throw new Error(extractErrorMessage(redirectRes) || '获取知雀跳转地址失败');
    }
    const redirectUrl = extractRedirectUrl(redirectRes);
    if (!redirectUrl) {
      throw new Error(extractErrorMessage(redirectRes) || '知雀 redirectUrl 为空');
    }
    const enterUrl = buildZhiqueEnterUrl(redirectUrl);
    // 同一标签继续跳 OAuth，保证用的是刚注入的新会话
    await updateTabUrl(opened.tab.id, enterUrl);
    // 仅成功跳转知雀后记历史：按 siteUrl+account 去重，保留最新密码
    await recordHistory({
      siteUrl: result.siteUrl,
      account: result.account,
      password: result.password,
      lastAction: 'zhique',
      user: result.user,
    });
    return {
      ...result,
      redirectUrl,
      enterUrl,
      tabId: opened.tab?.id,
    };
  }

  function pickFirstString(...candidates) {
    for (const value of candidates) {
      if (value == null) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return '';
  }

  function extractRoleText(item = {}) {
    if (Array.isArray(item.roleNames) && item.roleNames.length) {
      return item.roleNames.filter(Boolean).join('/');
    }
    if (Array.isArray(item.roles) && item.roles.length) {
      return item.roles
        .map((role) => (typeof role === 'string' ? role : (role?.name || role?.roleName || '')))
        .filter(Boolean)
        .join('/');
    }
    return pickFirstString(
      item.roleName,
      item.role,
      item.positionName,
      item.title,
      item.jobName,
      item.postName,
    );
  }

  function normalizeTeacherItem(item = {}) {
    const nestedUser = item.user && typeof item.user === 'object' ? item.user : null;
    const phone = pickFirstString(
      item.phone,
      item.mobile,
      item.account,
      item.userAccount,
      item.loginAccount,
      nestedUser?.phone,
      nestedUser?.mobile,
      nestedUser?.account,
      item.username,
      item.userName,
    );
    const name = pickFirstString(
      item.name,
      item.teacherName,
      item.realName,
      nestedUser?.name,
      nestedUser?.username,
      item.username,
      item.userName,
      item.nickName,
      phone,
    );
    const roleName = extractRoleText(item) || extractRoleText(nestedUser || {});
    return {
      id: pickFirstString(item.id, item.teacherId, item.userId, nestedUser?.userId, nestedUser?.id),
      name: name || '(未命名)',
      roleName,
      phone,
      account: phone,
      raw: item,
    };
  }

  function extractTeacherPage(response) {
    if (!response || typeof response !== 'object') {
      return { records: [], total: 0, current: 1, size: 10 };
    }
    const data = response.data ?? response.result ?? response;
    const page = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    const recordsRaw = Array.isArray(data)
      ? data
      : (page.records || page.list || page.rows || page.items || []);
    const records = (Array.isArray(recordsRaw) ? recordsRaw : [])
      .map(normalizeTeacherItem);
    const total = Number(page.total ?? page.totalCount ?? records.length) || records.length;
    const current = Number(page.current ?? page.page ?? page.pageNum ?? 1) || 1;
    const size = Number(page.size ?? page.pageSize ?? records.length) || records.length || 10;
    return { records, total, current, size };
  }

  // 登录后拉取教师列表：/ai-university/client/teacher/pageList
  // 列表项统一按手机号登录，默认密码 DEFAULT_PASSWORD
  async function listTeachers({ siteUrl, token, current = 1, size = 10 } = {}) {
    const creds = await getCredentials();
    const finalSiteUrl = normalizeSiteUrl(siteUrl || creds.siteUrl || DEFAULT_SITE_URL);

    let finalToken = String(token || '').replace(/^Bearer\s+/i, '').trim();
    if (!finalToken) {
      const tokenState = await getToken();
      finalToken = String(tokenState?.token || '').replace(/^Bearer\s+/i, '').trim();
    }
    if (!finalToken) {
      throw new Error('请先登录获取 token');
    }

    const pageCurrent = Math.max(1, Number(current) || 1);
    const pageSize = Math.max(1, Number(size) || 10);
    const res = await postJson(
      finalSiteUrl,
      '/client/teacher/pageList',
      { current: pageCurrent, size: pageSize },
      {
        token: finalToken,
        apiPrefix: '/ai-university',
        referer: `${finalSiteUrl}/admin/teaching/teachers`,
      },
    );

    if (res && res.success === false) {
      throw new Error(extractErrorMessage(res) || '获取教师列表失败');
    }

    const page = extractTeacherPage(res);
    return {
      siteUrl: finalSiteUrl,
      defaultPassword: DEFAULT_PASSWORD,
      ...page,
    };
  }

  ns.otherLogin = {
    DEFAULT_SITE_URL,
    DEFAULT_ACCOUNT,
    DEFAULT_PASSWORD,
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
    listTeachers,
    doLogin,
    openWithToken,
    doEnter,
    doZhiqueEnter,
  };
})();
