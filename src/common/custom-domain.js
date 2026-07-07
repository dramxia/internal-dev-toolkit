/* 内部开发工具箱 — 自定义域名（baseUrl）覆盖存储 */
/* 允许在 popup 手动修改当前项目的后端域名，覆盖 PROJECTS 中的默认 baseUrl。
   命名空间键 customBaseUrl:${projectId}，结构与 token 模块一致。 */
(() => {
  'use strict';

  const namespace = (globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {});

  const KEY_PREFIX = 'customBaseUrl'; // { baseUrl: string, updatedAt: number }

  const EMPTY = Object.freeze({ baseUrl: '', updatedAt: 0 });

  // 内存缓存：避免每次 getBaseUrl() 都异步读 storage（getBaseUrl 是同步 API）
  let cachedOverride = '';

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  function normalize(value = {}) {
    return {
      baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : '',
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
    };
  }

  async function getStorageKey() {
    const projectId = await namespace.currentProject.getCurrentProjectId();
    return `${KEY_PREFIX}:${projectId}`;
  }

  async function getDomain() {
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

  async function hasDomain() {
    return getDomain().then((d) => Boolean(d.baseUrl));
  }

  async function saveDomain(baseUrl) {
    const next = { baseUrl: String(baseUrl || '').trim(), updatedAt: Date.now() };
    cachedOverride = next.baseUrl;
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

  async function clearDomain() {
    cachedOverride = '';
    if (!hasChromeStorage()) return;
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }

  // 从 storage 载入到内存缓存（loadCurrentProject 时调用）
  async function loadCachedOverride() {
    const state = await getDomain();
    cachedOverride = state.baseUrl || '';
    return cachedOverride;
  }

  // 同步读取缓存的覆盖值（供 getBaseUrl 同步路径使用）
  function getCachedOverride() {
    return cachedOverride;
  }

  // 直接设置内存缓存（跨上下文刷新时使用，无需落盘）
  function setCachedOverride(baseUrl) {
    cachedOverride = typeof baseUrl === 'string' ? baseUrl : '';
  }

  namespace.customDomain = {
    EMPTY,
    getDomain,
    hasDomain,
    saveDomain,
    clearDomain,
    loadCachedOverride,
    getCachedOverride,
    setCachedOverride,
  };
})();
