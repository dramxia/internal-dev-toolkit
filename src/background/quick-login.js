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

  function validLocalPort(value) {
    const raw = String(value || '').trim();
    if (!/^\d+$/.test(raw)) return '';
    const n = Number.parseInt(raw, 10);
    return Number.isInteger(n) && n >= 1 && n <= 65535 ? String(n) : '';
  }

  function normalizeLocalPort(value, fallback = '8088') {
    return validLocalPort(value) || validLocalPort(fallback) || '8088';
  }

  function normalizePort(env, localPort) {
    return normalizeEnv(env) === 'local' ? normalizeLocalPort(localPort) : validLocalPort(localPort);
  }

  function recentIdentityKey(record = {}) {
    return [
      String(record.tenantId || ''),
      String(record.id || ''),
      record.role === 'student' ? 'student' : 'teacher',
    ].join('|');
  }

  function sameRecentIdentity(left = {}, right = {}) {
    return recentIdentityKey(left) === recentIdentityKey(right);
  }

  // 最近记录只保存可重新定位用户所需的元数据；兼容清理旧版本可能落盘的 token/url。
  function normalizeRecentRecord(record = {}, fallbackLocalPort = '8088') {
    const metadata = {};
    Object.entries(record || {}).forEach(([key, value]) => {
      // 兼容清理旧版本可能保存的各种凭据、URL、响应或会话字段，避免只依赖固定字段名。
      if (/(token|authorization|jwt|password|secret|url|origin|session)/i.test(key)) return;
      metadata[key] = value;
    });
    const phone = commonNs.tenant?.resolveUserPhone(metadata);
    if (phone) metadata.phone = phone;
    return {
      ...metadata,
      env: normalizeEnv(metadata.env),
      // 环境切换是每条记录的 UI 状态。即使当前为线上，也保留最近一次有效本地端口。
      localPort: normalizeLocalPort(metadata.localPort, fallbackLocalPort),
      role: metadata.role === 'student' ? 'student' : 'teacher',
    };
  }

  function compactRecentRecords(records = []) {
    const source = Array.isArray(records) ? records : [];
    const localPorts = new Map();
    const contacts = new Map();
    source.forEach((record) => {
      const normalized = normalizeRecentRecord(record);
      const explicitPort = validLocalPort(record?.localPort);
      const key = recentIdentityKey(normalized);
      if (explicitPort && !localPorts.has(key)) localPorts.set(key, explicitPort);
      const contact = contacts.get(key) || {};
      for (const field of ['phone', 'account', 'roleName']) {
        if (!contact[field] && normalized[field]) contact[field] = normalized[field];
      }
      contacts.set(key, contact);
    });

    const seen = new Set();
    const compacted = [];
    source.forEach((record) => {
      const initial = normalizeRecentRecord(record);
      const key = recentIdentityKey(initial);
      if (seen.has(key)) return;
      seen.add(key);
      compacted.push(normalizeRecentRecord({ ...record, ...contacts.get(key) }, localPorts.get(key)));
    });
    return compacted.slice(0, MAX_RECENT);
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

  async function quickLogin({ tenantId, id, tenantName = '', userName = '', account = '', phone = '', roleName = '', domain = '', industry = '', env = 'online', localPort = '', role = 'teacher' }) {
    if (!id) throw new Error('缺少 id');
    if (!tenantId) throw new Error('缺少 tenantId');
    if (!ns.tenantApi) throw new Error('tenantApi 模块未加载');

    const adminContextId = (await commonNs.adminLoginHistory?.getSession())?.id || '';
    const res = await ns.tenantApi.quickLogin({ tenantId, id, industry });
    const url = extractVirtualLoginUrl(res);
    if (!url || typeof url !== 'string') {
      throw new Error('virtualLogin 未返回有效 URL');
    }

    const normalizedEnv = normalizeEnv(env);
    const normalizedPort = normalizePort(normalizedEnv, localPort);
    const projectId = await commonNs.currentProject.getCurrentProjectId();
    await recordRecent({ tenantId: String(tenantId), tenantName, id: String(id), userName, ...(account ? { account } : {}), ...(phone ? { phone } : {}), ...(roleName ? { roleName } : {}), domain, industry, role, env: normalizedEnv, localPort: normalizedPort, projectId, ...(adminContextId ? { adminContextId } : {}) });
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

  function httpOrigin(value) {
    try {
      const url = new URL(String(value || ''));
      return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
    } catch (_) {
      return '';
    }
  }

  function queryTabs(queryInfo) {
    return new Promise((resolve) => {
      try {
        chrome.tabs.query(queryInfo, (tabs) => {
          // 查询失败（无窗口、权限受限）只影响「能否复用当前标签页」，不应让打开操作失败。
          if (chrome.runtime?.lastError) resolve([]);
          else resolve(Array.isArray(tabs) ? tabs : []);
        });
      } catch (_) {
        resolve([]);
      }
    });
  }

  // 当前标签页与目标同源（协议 + 域名 + 端口全部一致）时，说明用户正停在同一环境：
  // 线上停在该租户线上域名，或本地停在同一端口的开发页。此时原地跳转比新开标签页更符合预期。
  async function findSameOriginActiveTab(origin) {
    if (!origin || !chrome.tabs?.query) return null;
    const tabs = await queryTabs({ active: true, lastFocusedWindow: true });
    return tabs.find((tab) => tab?.id && httpOrigin(tab.pendingUrl || tab.url) === origin) || null;
  }

  function updateTabUrl(tabId, url) {
    return new Promise((resolve, reject) => {
      chrome.tabs.update(tabId, { url, active: true }, (tab) => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tab);
      });
    });
  }

  function createTab(url) {
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url, active: true }, (tab) => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tab);
      });
    });
  }

  async function openLoginUrl(url, { reuseCurrentTab = false } = {}) {
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
    if (reuseCurrentTab) {
      const tab = await findSameOriginActiveTab(parsed.origin);
      if (tab) {
        const updated = await updateTabUrl(tab.id, url);
        return { tabId: updated?.id ?? tab.id, reused: true };
      }
    }
    const created = await createTab(url);
    return { tabId: created?.id, reused: false };
  }

  async function recordRecent(item) {
    if (!item) return;
    const key = await getStorageKey();
    const records = await getRecent();
    const initial = normalizeRecentRecord(item);
    const previous = records.find((record) => sameRecentIdentity(record, initial));
    const contact = {};
    for (const field of ['account', 'phone', 'roleName']) {
      if (item[field] || previous?.[field]) contact[field] = item[field] || previous[field];
    }
    const normalizedItem = normalizeRecentRecord({ ...item, ...contact }, previous?.localPort);
    const adminContextId = (await commonNs.adminLoginHistory?.getSession())?.id || '';
    if ((item.adminContextId || '') !== adminContextId) throw new Error('后台账号已切换，请重新查询');
    const next = [
      { ...normalizedItem, at: Date.now() },
      ...records.filter((record) => !sameRecentIdentity(record, normalizedItem)),
    ].slice(0, MAX_RECENT);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: next }, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(next);
      });
    });
  }

  // 最近记录与后台会话的关系：
  // - 切换「后台账号/域名」或项目：清空 storage，记录彻底删除（隐私与数据归属要求）。
  // - 同一账号 token 过期后自动重新登录 / 服务端重启导致扩展重载（生成新会话标识）：记录保留，
  //   会话校验仅用于拦截在途请求与恢复过期快照，历史记录不应跟着消失。
  async function getRecent() {
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        const records = Array.isArray(items[key]) ? items[key] : [];
        const cleaned = compactRecentRecords(records);
        // 读取时清理旧凭据，并把旧版按环境/端口拆分的同一身份合并成一条。
        if (JSON.stringify(cleaned) !== JSON.stringify(records)) {
          chrome.storage.local.set({ [key]: cleaned }, () => resolve(cleaned));
          return;
        }
        resolve(cleaned);
      });
    });
  }

  async function deleteRecent({ tenantId, id, role = '' } = {}) {
    const key = await getStorageKey();
    const records = await getRecent();
    const filtered = records.filter((record) => {
      const sameIdentity = String(record.tenantId) === String(tenantId) && String(record.id) === String(id);
      const sameRole = !role || !record.role || record.role === role;
      return !(sameIdentity && sameRole);
    });
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: filtered }, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve({ ok: true });
      });
    });
  }

  ns.quickLogin = { quickLogin, resolveUserSession, openLoginUrl, getRecent, deleteRecent };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      compactRecentRecords,
      deleteRecent,
      getRecent,
      normalizeRecentRecord,
      openLoginUrl,
      recentIdentityKey,
      recordRecent,
      sameRecentIdentity,
    };
  }
})();
