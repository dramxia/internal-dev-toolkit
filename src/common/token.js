/* 内部开发工具箱 — Token 存储 */
/* 登录成功后返回的 token 持久化到 chrome.storage.local */
(() => {
  'use strict';

  const namespace = (globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {});

  const KEY_PREFIX = 'adminToken'; // { token: string, updatedAt: number }

  const EMPTY = Object.freeze({ token: '', updatedAt: 0 });

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  function normalize(value = {}) {
    return {
      token: typeof value.token === 'string' ? value.token : '',
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
    };
  }

  async function getStorageKey() {
    const projectId = await namespace.currentProject.getCurrentProjectId();
    return `${KEY_PREFIX}:${projectId}`;
  }

  async function getToken() {
    if (!hasChromeStorage()) return normalize();
    const key = await getStorageKey();
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

  async function saveToken(token) {
    const next = { token: String(token || ''), updatedAt: Date.now() };
    if (!hasChromeStorage()) return next;
    const key = await getStorageKey();
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
