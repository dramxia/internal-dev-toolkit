/* 内部开发工具箱 — Mock 规则存储 */
/* 按项目命名空间隔离存储 Mock 规则 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});
  const KEY_PREFIX = 'mockRules';
  const DISABLED_PREFIX = 'monitorDisabled';

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  async function getStorageKey() {
    if (ns.currentProject && ns.currentProject.getCurrentProjectId) {
      const projectId = await ns.currentProject.getCurrentProjectId();
      return `${KEY_PREFIX}:${projectId}`;
    }
    // Fallback: 如果 currentProject 未加载，使用默认
    return `${KEY_PREFIX}:gpt-admin-pre`;
  }

  // 规则结构迁移：单份 mockData + mockMode 升级为双份独立 responseMock / requestMock。
  // 出参、入参各自持有 enabled + mockData（出参额外含 status），可同时独立开启拦截，
  // 且 mockData 与开关解耦——关闭拦截不丢数据，仅清空时丢弃。
  // 旧规则（仅有 mockMode/mockData/enabled/status）按原 mockMode 归入对应一份，
  // 另一份默认 enabled:false、mockData 为 null（未编辑过则留空，避免数据串台）。
  function migrateRule(rule) {
    if (!rule || typeof rule !== 'object') return rule;
    if (rule.responseMock && rule.requestMock) return rule;

    const oldEnabled = rule.enabled !== false;
    const oldMode = rule.mockMode || 'response';
    const oldData = rule.mockData;
    const oldStatus = rule.status != null ? Number(rule.status) : 200;

    // 旧结构仅有单一 mockMode + mockData：归属到对应方向，另一方向留空（null）。
    // 切勿把 oldData 复制到另一方向——否则开启拦截后该方向会错误展示为
    // 另一方向的编辑数据（如入参显示为出参内容）。另一方向在用户尚未编辑时
    // 应为空，开启拦截时编辑器再用真实数据兜底，避免数据串台。
    const responseMock = rule.responseMock || {
      enabled: oldEnabled && oldMode === 'response',
      mockData: oldMode === 'response' ? oldData : null,
      status: oldStatus,
    };
    const requestMock = rule.requestMock || {
      enabled: oldEnabled && oldMode === 'request',
      mockData: oldMode === 'request' ? oldData : null,
    };

    return { ...rule, responseMock, requestMock };
  }

  // 获取当前项目的所有 Mock 规则
  async function getMockRules() {
    if (!hasChromeStorage()) return [];
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) {
          resolve([]);
          return;
        }
        const raw = Array.isArray(items[key]) ? items[key] : [];
        // 读取时统一迁移，保证消费端（panel / mock-hook）始终拿到新结构
        resolve(raw.map(migrateRule));
      });
    });
  }

  // 保存单条规则（如果已存在则更新）
  async function saveMockRule(rule) {
    if (!hasChromeStorage()) return;
    const key = await getStorageKey();
    const rules = await getMockRules();

    const existingIndex = rules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      rules[existingIndex] = { ...rule, updatedAt: Date.now() };
    } else {
      rules.push({ ...rule, createdAt: Date.now(), updatedAt: Date.now() });
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: rules }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(rule);
      });
    });
  }

  // 删除规则
  async function deleteMockRule(ruleId) {
    if (!hasChromeStorage()) return;
    const key = await getStorageKey();
    const rules = await getMockRules();
    const filtered = rules.filter(r => r.id !== ruleId);

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: filtered }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve({ ok: true });
      });
    });
  }

  // 启用/禁用规则
  async function toggleMockRule(ruleId, enabled) {
    if (!hasChromeStorage()) return;
    const key = await getStorageKey();
    const rules = await getMockRules();

    const rule = rules.find(r => r.id === ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }

    rule.enabled = enabled;
    rule.updatedAt = Date.now();

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: rules }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(rule);
      });
    });
  }

  // 清空当前项目的全部 Mock 规则（“已编”手动清空）
  async function clearMockRules() {
    if (!hasChromeStorage()) return;
    const key = await getStorageKey();

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: [] }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve({ ok: true });
      });
    });
  }

  // 获取指定规则
  async function getMockRule(ruleId) {
    const rules = await getMockRules();
    return rules.find(r => r.id === ruleId);
  }

  // ===== 禁监接口池 =====
  // 按项目隔离存储被禁止监听的接口 key（method + ' ' + url）数组。
  // 开启禁监后，hook 不再记录该接口，也不上报，避免轮询接口刷屏且无法选中。
  async function getDisabledStorageKey() {
    if (ns.currentProject && ns.currentProject.getCurrentProjectId) {
      const projectId = await ns.currentProject.getCurrentProjectId();
      return `${DISABLED_PREFIX}:${projectId}`;
    }
    return `${DISABLED_PREFIX}:gpt-admin-pre`;
  }

  async function getMonitorDisabled() {
    if (!hasChromeStorage()) return [];
    const key = await getDisabledStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) {
          resolve([]);
          return;
        }
        resolve(Array.isArray(items[key]) ? items[key] : []);
      });
    });
  }

  async function addMonitorDisabled(entry) {
    if (!hasChromeStorage()) return;
    const key = await getDisabledStorageKey();
    const list = await getMonitorDisabled();
    const keyStr = typeof entry === 'string' ? entry : (entry && entry.key);
    if (!keyStr || list.includes(keyStr)) return list;
    list.push(keyStr);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: list }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(list);
      });
    });
  }

  async function removeMonitorDisabled(keyStr) {
    if (!hasChromeStorage()) return [];
    const key = await getDisabledStorageKey();
    const list = await getMonitorDisabled();
    const filtered = list.filter(k => k !== keyStr);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: filtered }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(filtered);
      });
    });
  }

  ns.mockStorage = {
    getMockRules,
    saveMockRule,
    deleteMockRule,
    toggleMockRule,
    clearMockRules,
    getMockRule,
    getMonitorDisabled,
    addMonitorDisabled,
    removeMonitorDisabled,
  };
})();
