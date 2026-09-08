/* 内部开发工具箱 — Background API 登录 */
/* 跨域调用后台登录接口，负责：验证码获取、密码加密、登录、token 解析与保存。 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  // 默认密码加密：SHA-256（64 位小写 hex）。
  // 若后台使用其他算法（如加盐、MD5、RSA、SM3 等），请替换此函数。
  async function encryptPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function getLoginContext() {
    return {
      projectId: commonNs.currentProject.getCachedProjectId(),
      baseUrl: commonNs.currentProject.getBaseUrl(),
      authPath: commonNs.currentProject.getAuthPath(),
      cookieKeys: [...commonNs.currentProject.getCookieKeys()],
    };
  }

  async function postJson(path, body, context = getLoginContext()) {
    const { baseUrl, authPath, cookieKeys } = context;
    const url = `${baseUrl}${authPath}${path}`;
    const cookieHeader = await ns.cookies.getWafCookiesForUrl(baseUrl, cookieKeys);
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Origin: baseUrl,
      Referer: `${baseUrl}/login`,
    };
    if (cookieHeader) headers.Cookie = cookieHeader;

    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
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

  // 优先取 getCaptcha 返回的 data.blockX，缺失时沿用兼容值 212。
  async function getCaptcha(context) {
    return postJson('/getCaptcha', {}, context);
  }

  function extractTicket(captcha) {
    if (!captcha || typeof captcha !== 'object') return '';
    const data = captcha.data ?? captcha.result ?? captcha;
    return data?.ticket || data?.uuid || data?.captchaKey || data?.key || '';
  }

  function extractMoveLength(captcha, fallback = 212) {
    if (!captcha || typeof captcha !== 'object') return fallback;
    const data = captcha.data ?? captcha.result ?? captcha;
    return data?.blockX ?? data?.moveLength ?? data?.width ?? data?.x ?? data?.offset ?? fallback;
  }

  async function login(account, passwordHash, captcha, context) {
    const ticket = extractTicket(captcha);
    const moveLength = extractMoveLength(captcha);

    const body = {
      mobile: String(account),
      ticket: String(ticket),
      moveLength: String(moveLength),
      password: passwordHash,
    };

    return postJson('/login', body, context);
  }

  async function valid(account, passwordHash, code, context) {
    const body = {
      mobile: String(account),
      code: String(code),
      password: passwordHash,
    };
    return postJson('/valid', body, context);
  }

  function assertResponseSuccess(response, fallback) {
    if (!response || typeof response !== 'object' || response._raw != null) {
      throw new Error(fallback);
    }
    const failed = [false, 0, '0', 'false'].includes(response.success);
    const code = response.code == null ? null : Number(response.code);
    const codeFailed = code != null && code !== 0 && !(code >= 200 && code < 400);
    if (failed || codeFailed) {
      throw new Error(extractErrorMessage(response) || fallback);
    }
  }

  function isCodeSent(response) {
    if (!response || typeof response !== 'object') return false;
    // /login 成功但没有 Token 时，让面板等待用户输入验证码。
    if (Number(response.code) === 200 || response.code === 0 ||
        [true, 1, '1', 'true'].includes(response.success)) return true;
    const msg = extractErrorMessage(response) || (typeof response.data === 'string' ? response.data : '');
    return /已发送|已發送|已下发|请输入.*验证码|請輸入.*驗證碼|code.*sent|sent.*code/i.test(msg);
  }
  // 兼容常见 token 返回结构，并去除可能自带的 Bearer 前缀
  function extractToken(response) {
    if (!response || typeof response !== 'object') return '';
    const data = response.data ?? response.result ?? response;
    let token = '';
    if (typeof data === 'string') {
      // 普通字符串可能是“验证码已发送”，不能因此跳过验证码步骤。
      // 纯字符串仅兼容明确的 Bearer 凭证或三段式 JWT。
      if (/^(?:Bearer\s+\S+|[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.test(data.trim())) {
        token = data;
      }
    } else {
      token = (
        data?.token ||
        data?.accessToken ||
        data?.access_token ||
        data?.authorization ||
        data?.jwt ||
        ''
      );
    }
    return typeof token === 'string' ? token.replace(/^Bearer\s+/i, '').trim() : '';
  }

  function extractErrorMessage(response) {
    if (!response || typeof response !== 'object') return '';
    return String(response.msg || response.message || response.error || response.errorMessage || '');
  }

  // 通过公共 token 模块写入命名空间键 adminToken:${projectId}，
  // 与 popup/content/tenant-api 的读写键保持一致。
  // 注意：旧实现直接写非命名空间键 adminToken，会导致非默认项目的 token 丢失、
  // 且 popup 在 SW 重启迁移前看不到新 token。
  async function saveToken(token, projectId, details) {
    return commonNs.token.saveToken(token, projectId, details);
  }

  async function completeLogin(token, response, context) {
    const data = response.data ?? response.result ?? response;
    const userInfo = data && typeof data === 'object' && !Array.isArray(data) ? data : null;
    const siteToken = typeof userInfo?.accessToken === 'string'
      ? userInfo.accessToken.trim()
      : `Bearer ${token}`;
    const state = await saveToken(token, context.projectId, {
      origin: new URL(context.baseUrl).origin,
      siteToken,
      userInfo,
    });
    const injection = await ns.adminTokenInjection.autoInject(state);
    return { token, injection };
  }

  async function doLogin({ account, password } = {}) {
    if (!account || !password) {
      throw new Error('请输入账号和密码');
    }

    const context = getLoginContext();
    const captcha = await getCaptcha(context);
    assertResponseSuccess(captcha, '获取验证码失败');
    if (!extractTicket(captcha)) throw new Error('getCaptcha 未返回 ticket');
    const passwordHash = await encryptPassword(password);

    // 1. 调 /login 触发验证码下发
    const loginRes = await login(account, passwordHash, captcha, context);
    assertResponseSuccess(loginRes, '登录失败');
    const token = extractToken(loginRes);

    // 2. 返回本次登录的信息，由面板弹窗收集验证码；不持久化待验证信息。
    if (!token && isCodeSent(loginRes)) {
      return {
        requiresVerification: true,
        verification: { ...context, account: String(account), passwordHash },
      };
    }

    if (!token) {
      const msg = extractErrorMessage(loginRes);
      throw new Error(msg ? `登录失败: ${msg}` : '登录接口未返回 token');
    }

    return completeLogin(token, loginRes, context);
  }

  async function verifyLogin({ verification, code } = {}) {
    const inputCode = String(code || '').trim();
    if (!inputCode) throw new Error('请输入验证码');
    if (!verification?.account || !verification.passwordHash || !verification.projectId ||
        !verification.baseUrl || !verification.authPath || !Array.isArray(verification.cookieKeys)) {
      throw new Error('登录信息已失效，请重新登录');
    }
    const validRes = await valid(verification.account, verification.passwordHash, inputCode, verification);
    assertResponseSuccess(validRes, '验证码验证失败');
    const token = extractToken(validRes);
    if (!token) throw new Error(extractErrorMessage(validRes) || '验证接口未返回 Token');
    return completeLogin(token, validRes, verification);
  }

  ns.api = { doLogin, verifyLogin, encryptPassword, getCaptcha, login, valid, extractToken, saveToken };
})();
