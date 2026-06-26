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
      return new Promise((resolve) => {
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
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 导出处理器
  ns.mockHandler = {
    handleGetMockRules,
    handleAddMockRule,
    handleDeleteMockRule,
    handleToggleMockRule,
    handleGetCurrentProject,
    handleGetRequestLog,
  };
})();
