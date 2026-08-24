/* 内部开发工具箱 — Background 快捷登录执行 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  const RECENT_KEY_PREFIX = 'quickLoginRecent';
  const MAX_RECENT = 10;

  function normalizeEnv(env) {
    return env === 'local' || env === 'dev' ? 'local' : 'online';
  }

  function normalizePort(env, localPort) {
    if (normalizeEnv(env) !== 'local') return '';
    const raw = String(localPort || '').trim();
    if (!/^\d+$/.test(raw)) return '8088';
    const n = Number.parseInt(raw, 10);
    return Number.isInteger(n) && n >= 1 && n <= 65535 ? String(n) : '8088';
  }

  // 最近记录只保存可重新定位用户所需的元数据；兼容清理旧版本可能落盘的 token/url。
  function normalizeRecentRecord(record = {}) {
    const metadata = {};
    Object.entries(record || {}).forEach(([key, value]) => {
      // 兼容清理旧版本可能保存的各种凭据、URL、响应或会话字段，避免只依赖固定字段名。
      if (/(token|authorization|jwt|password|secret|url|origin|session)/i.test(key)) return;
      metadata[key] = value;
    });
    const normalized = {
      ...metadata,
      env: normalizeEnv(metadata.env),
      localPort: normalizePort(metadata.env, metadata.localPort),
      role: metadata.role === 'student' ? 'student' : 'teacher',
    };
    return normalized;
  }

  async function getStorageKey() {
    const projectId = await commonNs.currentProject.getCurrentProjectId();
    return `${RECENT_KEY_PREFIX}:${projectId}`;
  }

  function extractVirtualLoginUrl(response) {
    if (typeof response === 'string') return response;
    const value = response?.data;
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      for (const key of ['url', 'loginUrl', 'redirectUrl']) {
        if (typeof value[key] === 'string') return value[key];
      }
    }
    const result = response?.result;
    if (typeof result === 'string') return result;
    if (result && typeof result === 'object') {
      for (const key of ['url', 'loginUrl', 'redirectUrl']) {
        if (typeof result[key] === 'string') return result[key];
      }
    }
    for (const key of ['url', 'loginUrl', 'redirectUrl']) {
      if (typeof response?.[key] === 'string') return response[key];
    }
    return '';
  }

  async function quickLogin({ tenantId, id, tenantName = '', userName = '', domain = '', industry = '', env = 'online', localPort = '', role = 'teacher' }) {
    if (!id) throw new Error('缺少 id');
    if (!tenantId) throw new Error('缺少 tenantId');
    if (!ns.tenantApi) throw new Error('tenantApi 模块未加载');

    const res = await ns.tenantApi.quickLogin({ tenantId, id, industry });
    const url = extractVirtualLoginUrl(res);
    if (!url || typeof url !== 'string') {
      throw new Error('virtualLogin 未返回有效 URL');
    }

    const normalizedEnv = normalizeEnv(env);
    const normalizedPort = normalizePort(normalizedEnv, localPort);
    const projectId = await commonNs.currentProject.getCurrentProjectId();
    await recordRecent({ tenantId: String(tenantId), tenantName, id: String(id), userName, domain, industry, role, env: normalizedEnv, localPort: normalizedPort, projectId });
    return { ok: true, url, tenantId, id };
  }

  // 仅获取选中用户的会话（virtualLogin → 解析 origin + AI token），不记录最近登录
  async function resolveUserSession({ tenantId, id, industry }) {
    if (!id) throw new Error('缺少 id');
    if (!tenantId) throw new Error('缺少 tenantId');
    if (!ns.tenantApi) throw new Error('tenantApi 模块未加载');

    const res = await ns.tenantApi.quickLogin({ tenantId, id, industry });
    const url = extractVirtualLoginUrl(res);
    if (!url || typeof url !== 'string') {
      throw new Error('virtualLogin 未返回有效 URL');
    }
    const helpers = globalThis.InternalDevToolkit?.tenant;
    const parsed = helpers?.parseVirtualLoginUrl
      ? helpers.parseVirtualLoginUrl(url)
      : { url, origin: '', token: '' };
    if (!parsed.origin || !parsed.token) {
      throw new Error('未能从登录链接中解析 AI 平台 origin/token');
    }
    return { url, origin: parsed.origin, aiToken: parsed.token };
  }

  async function openLoginUrl(url) {
    if (!url) throw new Error('缺少 URL');
    let parsed;
    try {
      parsed = new URL(String(url));
    } catch (_) {
      throw new Error('登录地址无效');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('仅允许打开 HTTP(S) 登录地址');
    }
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
    const normalizedItem = normalizeRecentRecord(item);
    const next = [
      { ...normalizedItem, at: Date.now() },
      ...records.filter((r) => {
        // 同一租户+用户，但环境不同（线上 vs 本地，或本地不同端口），视为不同记录
        const sameUser = String(r.tenantId) === String(normalizedItem.tenantId) && String(r.id) === String(normalizedItem.id) && (r.role || 'teacher') === normalizedItem.role;
        if (!sameUser) return true;
        const sameEnv = normalizeEnv(r.env) === normalizedItem.env && normalizePort(r.env, r.localPort) === normalizedItem.localPort;
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
        const cleaned = records.map(normalizeRecentRecord).slice(0, MAX_RECENT);
        // 旧版本可能已保存 token；读取时立即覆盖为不含凭据的元数据记录。
        if (JSON.stringify(cleaned) !== JSON.stringify(records)) {
          chrome.storage.local.set({ [key]: cleaned }, () => {});
        }
        resolve(cleaned);
      });
    });
  }

  async function deleteRecent({ tenantId, id, env = 'online', localPort = '', role = '' } = {}) {
    const key = await getStorageKey();
    const records = await getRecent();
    const normalizedEnv = normalizeEnv(env);
    const normalizedPort = normalizePort(normalizedEnv, localPort);
    const filtered = records.filter((r) => {
      const sameIdentity = String(r.tenantId) === String(tenantId) && String(r.id) === String(id);
      const sameTarget = normalizeEnv(r.env) === normalizedEnv && normalizePort(r.env, r.localPort) === normalizedPort;
      const sameRole = !role || !r.role || r.role === role;
      return !(sameIdentity && sameTarget && sameRole);
    });
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: filtered }, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve({ ok: true });
      });
    });
  }

  ns.quickLogin = { quickLogin, resolveUserSession, openLoginUrl, getRecent, deleteRecent };
})();
