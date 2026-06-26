/* 内部开发工具箱 — 后台登录凭据模块 */
/* 注意：账号密码以明文存储于 chrome.storage.local，仅供公司内部开发自用，
   请勿在公开环境或他人电脑上保存敏感凭据。 */
(() => {
  'use strict';

  const namespace = (globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {});

  const KEY_PREFIX = 'adminCredentials'; // { account: string, password: string }

  const EMPTY = Object.freeze({ account: '', password: '' });

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  function normalize(value = {}) {
    return {
      account: typeof value.account === 'string' ? value.account : '',
      password: typeof value.password === 'string' ? value.password : '',
    };
  }

  async function getStorageKey() {
    const projectId = await namespace.currentProject.getCurrentProjectId();
    return `${KEY_PREFIX}:${projectId}`;
  }

  async function getCredentials() {
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

  async function saveCredentials(partial) {
    const next = normalize(partial);
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

  async function clearCredentials() {
    if (!hasChromeStorage()) return;
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }

  namespace.credentials = { EMPTY, getCredentials, saveCredentials, clearCredentials };
})();
