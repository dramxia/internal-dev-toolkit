/* 内部开发工具箱 — 一键登录查询状态持久化 */
(() => {
  'use strict';

  const namespace = (globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {});
  const KEY_PREFIX = 'quickLoginQueryState';
  const STORAGE_VERSION = 1;

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  function isSensitiveKey(key) {
    const normalized = String(key || '').toLowerCase();
    return normalized === 'raw' || normalized.includes('token') || normalized.includes('password') ||
      normalized.includes('authorization') || normalized.includes('cookie');
  }

  function sanitizeValue(value, key = '', seen = new WeakSet()) {
    if (isSensitiveKey(key)) return undefined;
    if (value == null) return value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value !== 'object') return undefined;
    if (seen.has(value)) return undefined;
    seen.add(value);
    if (Array.isArray(value)) {
      const result = value.map((item) => sanitizeValue(item, '', seen)).filter((item) => item !== undefined);
      seen.delete(value);
      return result;
    }
    const result = {};
    Object.entries(value).forEach(([childKey, childValue]) => {
      const sanitized = sanitizeValue(childValue, childKey, seen);
      if (sanitized !== undefined) result[childKey] = sanitized;
    });
    seen.delete(value);
    return result;
  }

  function getCachedStorageKey() {
    const projectId = namespace.currentProject.getCachedProjectId?.();
    return projectId ? `${KEY_PREFIX}:${projectId}` : '';
  }

  async function getStorageKey() {
    const cachedKey = getCachedStorageKey();
    if (cachedKey) return cachedKey;
    const projectId = await namespace.currentProject.getCurrentProjectId();
    return `${KEY_PREFIX}:${projectId}`;
  }

  async function load() {
    if (!hasChromeStorage()) return null;
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(null);
          return;
        }
        const stored = items?.[key];
        if (!stored || stored.version !== STORAGE_VERSION || !stored.state || typeof stored.state !== 'object') {
          resolve(null);
          return;
        }
        resolve(stored.state);
      });
    });
  }

  function saveToKey(key, state) {
    const stored = { version: STORAGE_VERSION, updatedAt: Date.now(), state };
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: stored }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(state);
      });
    });
  }

  async function save(snapshot) {
    const state = sanitizeValue(snapshot);
    if (!hasChromeStorage()) return state;
    const cachedKey = getCachedStorageKey();
    if (cachedKey) return saveToKey(cachedKey, state);
    return saveToKey(await getStorageKey(), state);
  }

  async function clear() {
    if (!hasChromeStorage()) return;
    const key = await getStorageKey();
    return new Promise((resolve) => chrome.storage.local.remove(key, resolve));
  }

  namespace.quickLoginStateStorage = {
    KEY_PREFIX,
    STORAGE_VERSION,
    sanitizeValue,
    getStorageKey,
    load,
    save,
    clear,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = namespace.quickLoginStateStorage;
  }
})();
