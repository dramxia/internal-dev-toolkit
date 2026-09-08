/* 内部开发工具箱 — Token 存储 */
/* 登录成功后返回的 token 持久化到 chrome.storage.local */
(() => {
  'use strict';

  const namespace = (globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {});

  const KEY_PREFIX = 'adminToken'; // Token、来源网站及登录接口返回的用户信息

  const EMPTY = Object.freeze({ token: '', updatedAt: 0, origin: '', siteToken: '', userInfo: null });

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  function normalize(value = {}) {
    return {
      token: typeof value.token === 'string' ? value.token : '',
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
      origin: typeof value.origin === 'string' ? value.origin : '',
      siteToken: typeof value.siteToken === 'string' ? value.siteToken : '',
      userInfo: value.userInfo && typeof value.userInfo === 'object' && !Array.isArray(value.userInfo)
        ? value.userInfo : null,
    };
  }

  async function getStorageKey(projectId) {
    const targetProjectId = projectId || await namespace.currentProject.getCurrentProjectId();
    return `${KEY_PREFIX}:${targetProjectId}`;
  }

  async function getToken(projectId) {
    if (!hasChromeStorage()) return normalize();
    const key = await getStorageKey(projectId);
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(normalize());
          return;
        }
        resolve(normalize(items[key]));
      });
    });
  }

  async function hasToken() {
    return getToken().then((t) => Boolean(t.token));
  }

  async function saveToken(token, projectId, details = {}) {
    const next = normalize({ ...details, token: String(token || ''), updatedAt: Date.now() });
    if (!hasChromeStorage()) return next;
    const key = await getStorageKey(projectId);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: next }, () => {
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
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }

  namespace.token = { EMPTY, getToken, hasToken, saveToken, clearToken };
})();
