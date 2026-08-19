/* 内部开发工具箱 — Mock 规则存储 */
/* 按项目命名空间隔离存储 Mock 规则 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});
  const KEY_PREFIX = 'mockRules';
  const DISABLED_PREFIX = 'monitorDisabled';
  const MOCK_ENABLED_KEY = 'mockEnabled'; // 接口 Mock 总开关（全局，不按项目隔离）
  let ruleMutationQueue = Promise.resolve();

  function normalizeRequestKey(key) {
    const raw = String(key || '');
    const separator = raw.indexOf(' ');
    if (separator <= 0) return raw;
    const method = raw.slice(0, separator).toUpperCase();
    const url = raw.slice(separator + 1).split('#', 1)[0].split('?', 1)[0];
    return `${method} ${url}`;
  }

  function endpointUrl(url) {
    return String(url || '').split('#', 1)[0].split('?', 1)[0];
  }

  function endpointPageOrigin(endpoint, fallbackEndpoint) {
    return endpoint?.pageOrigin || endpoint?.captured?.pageOrigin ||
      fallbackEndpoint?.pageOrigin || fallbackEndpoint?.captured?.pageOrigin;
  }

  function normalizedInterfaceUrl(endpoint, fallbackEndpoint) {
    const normalized = endpointUrl(endpoint?.url);
    if (!normalized) return '';
    try {
      return new URL(normalized).href;
    } catch (_) {
      const pageOrigin = endpointPageOrigin(endpoint, fallbackEndpoint);
      if (!pageOrigin) return `relative:${normalized}`;
      try {
        return new URL(normalized, pageOrigin).href;
      } catch (_) {
        return `relative:${normalized}`;
      }
    }
  }

  // 规则同步只认相同请求方式与去掉 Query Parameters 后的相同 URL。
  // 绝对 URL 保留 origin/端口；相对导入路径仅在有 pageOrigin 时还原比较。
  function rulesShareEndpoint(left, right) {
    if (!left || !right) return false;
    if (String(left.method || '').toUpperCase() !== String(right.method || '').toUpperCase()) return false;
    return normalizedInterfaceUrl(left, right) === normalizedInterfaceUrl(right, left);
  }

  function syncMockState(target, source, updatedAt) {
    const synchronized = { ...target, updatedAt };
    const fields = [
      'responseMock', 'requestMock', 'mockMethod', 'mockUrl',
      'enabled', 'mockMode', 'mockData', 'hasMockData', 'status',
    ];
    fields.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(source, field)) return;
      const value = source[field];
      synchronized[field] = Array.isArray(value)
        ? [...value]
        : value && typeof value === 'object'
          ? { ...value }
          : value;
    });
    return synchronized;
  }

  function isEmoRule(rule) {
    return rule?.listSource === 'emo' || rule?.captured?.source === 'capture';
  }

  function enqueueRuleMutation(mutation) {
    const task = ruleMutationQueue.then(mutation, mutation);
    ruleMutationQueue = task.catch(() => {});
    return task;
  }

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
    const oldHasMockData = rule.hasMockData !== undefined ? !!rule.hasMockData : oldData != null;
    const oldStatus = rule.status != null ? Number(rule.status) : 200;

    // 旧结构仅有单一 mockMode + mockData：归属到对应方向，另一方向留空（null）。
    // 切勿把 oldData 复制到另一方向——否则开启拦截后该方向会错误展示为
    // 另一方向的编辑数据（如入参显示为出参内容）。另一方向在用户尚未编辑时
    // 应为空，开启拦截时编辑器再用真实数据兜底，避免数据串台。
    const responseMock = rule.responseMock || {
      enabled: oldEnabled && oldMode === 'response',
      hasMockData: oldMode === 'response' && oldHasMockData,
      mockData: oldMode === 'response' ? oldData : null,
      status: oldStatus,
    };
    const requestMock = rule.requestMock || {
      enabled: oldEnabled && oldMode === 'request',
      hasMockData: oldMode === 'request' && oldHasMockData,
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
    return enqueueRuleMutation(async () => {
      const key = await getStorageKey();
      const rules = await getMockRules();

      const now = Date.now();
      const existingIndex = rules.findIndex(r => r.id === rule.id);
      if (existingIndex >= 0) {
        rules[existingIndex] = { ...rule, updatedAt: now };
      } else {
        rules.push({ ...rule, createdAt: now, updatedAt: now });
      }

      // 同一个接口可能同时拥有捕获来源和已编来源的规则。保存任意一条时同步其
      // Mock 配置，但保留其他规则各自的 id、真实 URL、来源与 captured 快照。
      const savedIndex = existingIndex >= 0 ? existingIndex : rules.length - 1;
      const savedRule = rules[savedIndex];
      rules.forEach((candidate, index) => {
        if (index === savedIndex || !rulesShareEndpoint(candidate, savedRule)) return;
        rules[index] = syncMockState(candidate, savedRule, now);
      });

      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: rules }, () => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(rule);
        });
      });
    });
  }

  // 删除规则
  async function deleteMockRule(ruleId) {
    if (!hasChromeStorage()) return;
    return enqueueRuleMutation(async () => {
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
    });
  }

  // 启用/禁用规则
  async function toggleMockRule(ruleId, enabled) {
    if (!hasChromeStorage()) return;
    return enqueueRuleMutation(async () => {
      const key = await getStorageKey();
      const rules = await getMockRules();

      const rule = rules.find(r => r.id === ruleId);
      if (!rule) throw new Error('Rule not found');

      if (rule.responseMock || rule.requestMock) {
        if (rule.responseMock) rule.responseMock.enabled = !!enabled;
        if (rule.requestMock) rule.requestMock.enabled = !!enabled;
      } else {
        rule.enabled = enabled;
      }
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
    });
  }

  // 原子应用导入冲突的最终选择：可写入“已编”候选，同时移除未被选择的
  // Emo 规则。捕获记录存放在 content script，不在这里改动。
  async function resolveImportConflict(selectedRuleOrRules, removeRuleIds = []) {
    if (!hasChromeStorage()) return { rules: [] };
    return enqueueRuleMutation(async () => {
      const key = await getStorageKey();
      const rules = await getMockRules();
      const removedIds = new Set((Array.isArray(removeRuleIds) ? removeRuleIds : []).map(String));
      const nextRules = rules.filter(rule => !removedIds.has(String(rule.id)));

      const selectedRules = Array.isArray(selectedRuleOrRules)
        ? selectedRuleOrRules
        : (selectedRuleOrRules ? [selectedRuleOrRules] : []);
      selectedRules.forEach((selectedRule) => {
        const now = Date.now();
        const savedRule = {
          ...selectedRule,
          listSource: selectedRule.listSource || 'edited',
          createdAt: selectedRule.createdAt || now,
          updatedAt: now,
        };
        const existingIndex = nextRules.findIndex(rule => rule.id === savedRule.id);
        if (existingIndex >= 0) nextRules[existingIndex] = savedRule;
        else nextRules.push(savedRule);
      });

      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: nextRules }, () => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve({ rules: nextRules });
        });
      });
    });
  }

  // 按来源清空当前项目的 Mock 规则。Emo 对应捕获后保存的规则，已编对应导入/手工规则。
  async function clearMockRules(scope = 'all') {
    if (!hasChromeStorage()) return;
    return enqueueRuleMutation(async () => {
      const key = await getStorageKey();
      const rules = await getMockRules();
      const remaining = scope === 'emo'
        ? rules.filter(rule => !isEmoRule(rule))
        : scope === 'edited'
          ? rules.filter(isEmoRule)
          : [];

      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: remaining }, () => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve({ ok: true, rules: remaining });
        });
      });
    });
  }

  // 获取指定规则
  async function getMockRule(ruleId) {
    const rules = await getMockRules();
    return rules.find(r => r.id === ruleId);
  }

  // ===== 禁监接口池 =====
  // 按项目隔离存储被禁止监听的接口 key（method + ' ' + 无 query/hash 的 url）数组。
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
        const raw = Array.isArray(items[key]) ? items[key] : [];
        resolve([...new Set(raw.map(normalizeRequestKey))]);
      });
    });
  }

  async function addMonitorDisabled(entry) {
    if (!hasChromeStorage()) return;
    const key = await getDisabledStorageKey();
    const list = await getMonitorDisabled();
    const keyStr = normalizeRequestKey(typeof entry === 'string' ? entry : (entry && entry.key));
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
    const normalizedKey = normalizeRequestKey(keyStr);
    const filtered = list.filter(k => normalizeRequestKey(k) !== normalizedKey);
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

  // 读取接口 Mock 总开关。默认 true（未写入过视为启用），保证存量用户行为不变。
  async function getMockEnabled() {
    if (!hasChromeStorage()) return true;
    return new Promise((resolve) => {
      chrome.storage.local.get(MOCK_ENABLED_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(true);
          return;
        }
        resolve(items[MOCK_ENABLED_KEY] !== false);
      });
    });
  }

  // 写入接口 Mock 总开关，返回最终生效值。
  async function setMockEnabled(enabled) {
    const value = enabled !== false;
    if (!hasChromeStorage()) return value;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [MOCK_ENABLED_KEY]: value }, () => {
        resolve(value);
      });
    });
  }

  ns.mockStorage = {
    getMockRules,
    saveMockRule,
    deleteMockRule,
    toggleMockRule,
    resolveImportConflict,
    clearMockRules,
    getMockRule,
    getMonitorDisabled,
    addMonitorDisabled,
    removeMonitorDisabled,
    getMockEnabled,
    setMockEnabled,
  };
})();
