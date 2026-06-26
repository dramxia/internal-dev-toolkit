/* 内部开发工具箱 — Mock 规则存储 */
/* 按项目命名空间隔离存储 Mock 规则 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});
  const KEY_PREFIX = 'mockRules';

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
        resolve(Array.isArray(items[key]) ? items[key] : []);
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

  // 获取指定规则
  async function getMockRule(ruleId) {
    const rules = await getMockRules();
    return rules.find(r => r.id === ruleId);
  }

  ns.mockStorage = {
    getMockRules,
    saveMockRule,
    deleteMockRule,
    toggleMockRule,
    getMockRule,
  };
})();
