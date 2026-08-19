/* 内部开发工具箱 — Mock 消息处理 */
/* 处理 DevTools Panel 和 Content Script 之间的 Mock 消息 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  // 处理：获取 Mock 规则
  async function handleGetMockRules(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const rules = await ns.mockStorage.getMockRules();
      return { ok: true, rules };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：添加/更新 Mock 规则
  async function handleAddMockRule(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { rule, tabId } = msg;
      await ns.mockStorage.saveMockRule(rule);

      // 通知 content script 更新规则
      if (tabId) {
        const allRules = await ns.mockStorage.getMockRules();
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_RULES',
          rules: allRules,
        }).catch(() => {
          // Tab 可能已关闭，忽略错误
        });
      }

      return { ok: true, rule };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理导入冲突弹窗的最终选择，并一次性同步最新规则到页面。
  async function handleResolveImportConflict(msg) {
    try {
      if (!ns.mockStorage?.resolveImportConflict) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { selectedRule, selectedRules, removeRuleIds, tabId } = msg;
      const rulesToSave = Array.isArray(selectedRules) ? selectedRules : (selectedRule || null);
      const result = await ns.mockStorage.resolveImportConflict(rulesToSave, removeRuleIds);
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_RULES',
          rules: result.rules,
        }).catch(() => {});
      }
      return { ok: true, rules: result.rules };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：删除 Mock 规则
  async function handleDeleteMockRule(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { ruleId, tabId } = msg;
      await ns.mockStorage.deleteMockRule(ruleId);

      // 通知 content script 更新规则
      if (tabId) {
        const allRules = await ns.mockStorage.getMockRules();
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_RULES',
          rules: allRules,
        }).catch(() => {});
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  function sendTabMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || response.ok === false) {
          reject(new Error(response?.error || 'content script did not confirm cache deletion'));
          return;
        }
        resolve(response);
      });
    });
  }

  // 删除一个接口的持久化规则（如有），并彻底清理当前标签页中的日志/规则缓存。
  async function handleDeleteMockEndpoint(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { ruleId, tabId, method, url } = msg;
      if (!tabId) return { ok: false, error: 'tabId required' };
      if (!method || !url) return { ok: false, error: 'method and url required' };

      if (ruleId) await ns.mockStorage.deleteMockRule(ruleId);
      const rules = await ns.mockStorage.getMockRules();
      const cacheResult = await sendTabMessage(tabId, {
        type: 'DELETE_MOCK_ENDPOINT_CACHE',
        method,
        url,
        rules,
      });

      return { ok: true, deletedRequests: cacheResult.deletedRequests || 0 };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 仅删除当前标签页中的捕获记录，不读取、删除或重新下发持久化 Mock 规则。
  async function handleDeleteCapturedRequest(msg) {
    try {
      const { tabId, method, url } = msg;
      if (!tabId) return { ok: false, error: 'tabId required' };
      if (!method || !url) return { ok: false, error: 'method and url required' };

      const result = await sendTabMessage(tabId, {
        type: 'DELETE_CAPTURED_REQUEST',
        method,
        url,
      });
      return { ok: true, deletedRequests: result.deletedRequests || 0 };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：启用/禁用 Mock 规则
  async function handleToggleMockRule(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { ruleId, enabled, tabId } = msg;
      await ns.mockStorage.toggleMockRule(ruleId, enabled);

      // 通知 content script 更新规则
      if (tabId) {
        const allRules = await ns.mockStorage.getMockRules();
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_RULES',
          rules: allRules,
        }).catch(() => {});
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：按面板来源清空当前项目的 Mock 规则（Emo / 已编）
  async function handleClearMockRules(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { tabId, scope } = msg;
      await ns.mockStorage.clearMockRules(scope);
      const remainingRules = await ns.mockStorage.getMockRules();

      // 通知 content script：仅停止已清空来源的拦截，其他来源继续生效。
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_RULES',
          rules: remainingRules,
        }).catch(() => {});
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：获取当前项目
  async function handleGetCurrentProject() {
    try {
      if (!ns.currentProject) {
        return { ok: true, projectId: 'gpt-admin-pre' }; // Fallback
      }

      const projectId = await ns.currentProject.getCurrentProjectId();
      return { ok: true, projectId };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：获取接口记录（从 content script）
  async function handleGetRequestLog(msg) {
    try {
      const { tabId } = msg;
      if (!tabId) {
        return { ok: false, error: 'tabId required' };
      }

      // 向 content script 请求日志
      const logResult = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'GET_REQUEST_LOG' }, (response) => {
          if (chrome.runtime?.lastError) {
            // Tab 未加载 content script（页面在扩展安装/重载前就已打开，或 URL 不匹配）
            // 显式标记 csReady:false，让 Panel 提示刷新，而非显示为"暂无记录"
            resolve({ ok: true, requests: [], csReady: false, reason: 'no_content_script' });
            return;
          }
          // response 为空也视为 content script 未就绪
          if (!response) {
            resolve({ ok: true, requests: [], csReady: false, reason: 'no_response' });
            return;
          }
          resolve({ ok: true, requests: response.requests || [], csReady: true });
        });
      });

      return logResult;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：获取禁监接口池（按项目持久化）
  async function handleGetMonitorDisabled() {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }
      const disabled = await ns.mockStorage.getMonitorDisabled();
      return { ok: true, disabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：加入禁监接口池（entry 可为 key 字符串或 {key} 对象），并同步 content script
  async function handleAddMonitorDisabled(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }
      const { entry, tabId } = msg;
      const disabled = await ns.mockStorage.addMonitorDisabled(entry);
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MONITOR_DISABLED',
          disabled,
        }).catch(() => {});
      }
      return { ok: true, disabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：从禁监接口池移除（放开监听），并同步 content script
  async function handleRemoveMonitorDisabled(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }
      const { key, tabId } = msg;
      const disabled = await ns.mockStorage.removeMonitorDisabled(key);
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MONITOR_DISABLED',
          disabled,
        }).catch(() => {});
      }
      return { ok: true, disabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：获取接口 Mock 总开关（默认启用）
  async function handleGetMockEnabled() {
    try {
      if (!ns.mockStorage?.getMockEnabled) {
        return { ok: false, error: 'mockStorage not available' };
      }
      const enabled = await ns.mockStorage.getMockEnabled();
      return { ok: true, enabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：设置接口 Mock 总开关。
  // 开启时：先按需向该标签页注入页面 hook（未注入过时），再同步状态到 content → 页面；
  // 关闭时：仅同步状态（已注入的 hook 收到后变为透传，页面刷新后彻底不再注入）。
  async function handleSetMockEnabled(msg) {
    try {
      if (!ns.mockStorage?.setMockEnabled) {
        return { ok: false, error: 'mockStorage not available' };
      }
      const { tabId } = msg;
      const enabled = await ns.mockStorage.setMockEnabled(msg.enabled !== false);
      const bgNs = globalThis.InternalDevToolkitBg;
      if (tabId && enabled && bgNs?.mockHook?.ensureInjected) {
        // 确保 hook 已注入后再下发开关状态，否则页面无 hook 接收
        await bgNs.mockHook.ensureInjected(tabId).catch(() => ({ ok: false }));
      }
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_ENABLED',
          enabled,
        }).catch(() => {});
      }
      return { ok: true, enabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 导出处理器
  ns.mockHandler = {
    handleGetMockRules,
    handleAddMockRule,
    handleResolveImportConflict,
    handleDeleteMockRule,
    handleDeleteMockEndpoint,
    handleDeleteCapturedRequest,
    handleToggleMockRule,
    handleClearMockRules,
    handleGetCurrentProject,
    handleGetRequestLog,
    handleGetMonitorDisabled,
    handleAddMonitorDisabled,
    handleRemoveMonitorDisabled,
    handleGetMockEnabled,
    handleSetMockEnabled,
  };
})();
