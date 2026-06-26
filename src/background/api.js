/* 内部开发工具箱 — Background API 登录 */
/* 跨域调用后台登录接口，负责：验证码获取、密码加密、登录、token 解析与保存。 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  const VALID_CODE = '123'; // /valid 接口的验证码，后台校验宽松时可任意数字

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

  async function postJson(path, body) {
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const authPath = commonNs.currentProject.getAuthPath();
    const url = `${baseUrl}${authPath}${path}`;
    const cookieHeader = await ns.cookies.getWafCookies();
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

  // 获取验证码。后台对 moveLength 校验较宽松，任意数字均可；
  // 这里优先取 getCaptcha 返回的 data.blockX，缺失时回退到 212。
  async function getCaptcha() {
    return postJson('/getCaptcha', {});
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

  async function login(account, passwordHash, captcha) {
    const ticket = extractTicket(captcha);
    const moveLength = extractMoveLength(captcha);

    const body = {
      mobile: String(account),
      ticket: String(ticket),
      moveLength: String(moveLength),
      password: passwordHash,
    };

    return postJson('/login', body);
  }

  async function valid(account, passwordHash, code) {
    const body = {
      mobile: String(account),
      code: String(code),
      password: passwordHash,
    };
    return postJson('/valid', body);
  }

  function isCodeSent(response) {
    if (!response || typeof response !== 'object') return false;
    // 如果 login 返回成功但没 token，大概率是验证码已下发，需要走 /valid
    if (response.code === 200 || response.success === true) return true;
    const msg = extractErrorMessage(response) || '';
    return (
      msg.includes('验证码') ||
      msg.includes('驗證碼') ||
      msg.includes('已发送') ||
      msg.includes('已發送') ||
      msg.includes('已下发') ||
      msg.includes('send') ||
      msg.includes('code')
    );
  }
  // 兼容常见 token 返回结构，并去除可能自带的 Bearer 前缀
  function extractToken(response) {
    if (!response || typeof response !== 'object') return '';
    const data = response.data ?? response.result ?? response;
    let token = '';
    if (typeof data === 'string') {
      token = data;
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
    return token.replace(/^Bearer\s+/i, '').trim();
  }

  function extractErrorMessage(response) {
    if (!response || typeof response !== 'object') return '';
    return response.msg || response.message || response.error || response.errorMessage || '';
  }

  async function saveToken(token) {
    return new Promise((resolve, reject) => {
      const item = { token: String(token), updatedAt: Date.now() };
      chrome.storage.local.set({ adminToken: item }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(item);
        }
      });
    });
  }

  async function doLogin({ account, password }) {
    if (!account || !password) {
      throw new Error('请输入账号和密码');
    }

    const captcha = await getCaptcha();
    const passwordHash = await encryptPassword(password);

    // 1. 调 /login 触发验证码下发
    const loginRes = await login(account, passwordHash, captcha);
    let token = extractToken(loginRes);

    // 2. 若 /login 未返回 token 但提示验证码已发送，自动调 /valid 换取 token
    if (!token && isCodeSent(loginRes)) {
      const validRes = await valid(account, passwordHash, VALID_CODE);
      token = extractToken(validRes);
      if (!token) {
        const msg = extractErrorMessage(validRes);
        throw new Error(msg ? `验证失败: ${msg}` : 'valid 接口未返回 token');
      }
      await saveToken(token);
      return { token, captcha, loginRes, validRes };
    }

    if (!token) {
      const msg = extractErrorMessage(loginRes);
      throw new Error(msg ? `登录失败: ${msg}` : '登录接口未返回 token');
    }

    await saveToken(token);
    return { token, captcha, loginRes };
  }

  ns.api = { doLogin, encryptPassword, getCaptcha, login, valid, extractToken, saveToken };
})();
