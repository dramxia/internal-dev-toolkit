/* 内部开发工具箱 — Background 快捷登录执行 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  const RECENT_KEY_PREFIX = 'quickLoginRecent';
  const MAX_RECENT = 10;

  async function getStorageKey() {
    const projectId = await commonNs.currentProject.getCurrentProjectId();
    return `${RECENT_KEY_PREFIX}:${projectId}`;
  }

  async function quickLogin({ tenantId, id, tenantName = '', userName = '', domain = '', industry = '', env = 'online', localPort = '' }) {
    if (!id) throw new Error('缺少 id');
    if (!tenantId) throw new Error('缺少 tenantId');
    if (!ns.tenantApi) throw new Error('tenantApi 模块未加载');

    const res = await ns.tenantApi.quickLogin({ tenantId, id, industry });
    const url = res?.data;
    if (!url || typeof url !== 'string') {
      throw new Error('virtualLogin 未返回有效 URL');
    }

    const projectId = await commonNs.currentProject.getCurrentProjectId();
    await recordRecent({ tenantId, tenantName, id, userName, domain, industry, env, localPort, projectId });
    return { ok: true, url, tenantId, id };
  }

  async function openLoginUrl(url) {
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

  async function recordRecent(item) {
    if (!item) return;
    const key = await getStorageKey();
    const records = await getRecent();
    const next = [
      { ...item, at: Date.now() },
      ...records.filter((r) => {
        // 同一租户+用户，但环境不同（线上 vs 本地，或本地不同端口），视为不同记录
        const sameUser = r.tenantId === item.tenantId && r.id === item.id;
        if (!sameUser) return true;
        const sameEnv = r.env === item.env && r.localPort === item.localPort;
        return !sameEnv;
      }),
    ].slice(0, MAX_RECENT);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: next }, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(next);
      });
    });
  }

  async function getRecent() {
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        const records = Array.isArray(items[key]) ? items[key] : [];
        resolve(records);
      });
    });
  }

  async function deleteRecent({ tenantId, id }) {
    const key = await getStorageKey();
    const records = await getRecent();
    const filtered = records.filter((r) => !(r.tenantId === tenantId && r.id === id));
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: filtered }, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve({ ok: true });
      });
    });
  }

  ns.quickLogin = { quickLogin, openLoginUrl, getRecent, deleteRecent };
})();
