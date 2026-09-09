/* 后台登录历史：账号与 API 地址共同标识一条记录。 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});
  const KEY_PREFIX = 'adminLoginHistory';
  const SESSION_KEY_PREFIX = 'adminSession';
  let writeQueue = Promise.resolve();

  function normalizeBaseUrl(value) {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('API 地址须为 HTTP 或 HTTPS 地址，不能包含账号、查询参数或片段');
    }
    return url.href.replace(/\/+$/, '');
  }

  function identity(account, baseUrl) {
    return JSON.stringify([String(account || '').trim(), normalizeBaseUrl(baseUrl)]);
  }

  // 只读取 JWT 的过期时间；没有明确有效期的 Token 由后台接口验证。
  function tokenExpiresAt(token) {
    try {
      const parts = String(token || '').replace(/^Bearer\s+/i, '').trim().split('.');
      if (parts.length !== 3) return null;
      const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
      return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
    } catch (_) {
      return null;
    }
  }

  function read(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(items?.[key]);
      });
    });
  }

  function write(values) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(values, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }

  async function getRecords(projectId = ns.currentProject.getCachedProjectId()) {
    const records = await read(`${KEY_PREFIX}:${projectId}`);
    return Array.isArray(records) ? records : [];
  }

  async function getRecord(id, projectId) {
    const record = (await getRecords(projectId)).find((item) => item.id === id);
    if (!record) throw new Error('登录历史记录不存在，请重新打开历史记录');
    return record;
  }

  async function getSession(projectId = ns.currentProject.getCachedProjectId()) {
    return await read(`${SESSION_KEY_PREFIX}:${projectId}`) || null;
  }

  function activate(record, projectId = ns.currentProject.getCachedProjectId()) {
    const run = async () => {
      const account = String(record.account || '').trim();
      const password = String(record.password || '');
      const token = String(record.token || '').replace(/^Bearer\s+/i, '').trim();
      const baseUrl = normalizeBaseUrl(record.baseUrl);
      if (!account || !password || !token) throw new Error('登录记录缺少账号、密码或 Token，请重新登录');
      const now = Date.now();
      const tokenState = {
        token,
        updatedAt: record.updatedAt || now,
        origin: new URL(baseUrl).origin,
        siteToken: record.siteToken || `Bearer ${token}`,
        userInfo: record.userInfo || null,
      };
      const saved = {
        ...tokenState, id: identity(account, baseUrl), account, password, baseUrl, lastUsedAt: now,
      };
      const records = await getRecords(projectId);
      const session = { id: crypto.randomUUID(), account, baseUrl };
      // 一次写入完整账号信息，避免新域名与旧 Token 混用。
      await write({
        [`${KEY_PREFIX}:${projectId}`]: [saved, ...records.filter((item) => item.id !== saved.id)],
        [`${SESSION_KEY_PREFIX}:${projectId}`]: session,
        [`adminCredentials:${projectId}`]: { account, password },
        [`adminToken:${projectId}`]: tokenState,
        [`customBaseUrl:${projectId}`]: { baseUrl, updatedAt: now },
        [`quickLoginQueryState:${projectId}`]: null,
        [`quickLoginRecent:${projectId}`]: [],
      });
      if (projectId === ns.currentProject.getCachedProjectId()) ns.customDomain?.setCachedOverride(baseUrl);
      return { tokenState, session };
    };
    const result = writeQueue.then(run);
    writeQueue = result.catch(() => {});
    return result;
  }

  ns.adminLoginHistory = { KEY_PREFIX, SESSION_KEY_PREFIX, normalizeBaseUrl, identity, tokenExpiresAt, getRecords, getRecord, getSession, activate };
  if (typeof module !== 'undefined' && module.exports) module.exports = ns.adminLoginHistory;
})();
