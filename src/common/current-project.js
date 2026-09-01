/* ===== src/common/current-project.js ===== */
// 当前激活项目管理：chrome.storage 读写 + 缓存 + 数据迁移

(function() {
  const ns = globalThis.InternalDevToolkit;
  const STORAGE_KEY = 'currentProjectId';
  let cachedProjectId = null;
  let cachedProject = null;

  async function getCurrentProjectId() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || ns.projects.DEFAULT_PROJECT_ID;
  }

  async function setCurrentProjectId(id) {
    const project = ns.projects.getById(id);
    if (!project) throw new Error(`未知项目: ${id}`);
    await chrome.storage.local.set({ [STORAGE_KEY]: id });
    cachedProjectId = id;
    cachedProject = project;
    return cachedProject;
  }

  async function switchProjectContext(id) {
    const project = await setCurrentProjectId(id);
    if (ns.customDomain) await ns.customDomain.loadCachedOverride();
    return project;
  }

  async function loadCurrentProject() {
    cachedProjectId = await getCurrentProjectId();
    cachedProject = ns.projects.getById(cachedProjectId);
    // 同步加载自定义域名覆盖到内存缓存，供 getBaseUrl() 同步读取
    if (ns.customDomain) {
      await ns.customDomain.loadCachedOverride();
    }
    return cachedProject;
  }

  function getCachedProjectId() {
    return cachedProjectId || ns.projects.DEFAULT_PROJECT_ID;
  }

  function getProject() {
    return cachedProject || ns.projects.getById(ns.projects.DEFAULT_PROJECT_ID);
  }

  // 优先返回自定义域名覆盖，否则回落到项目配置的 baseUrl
  function getBaseUrl() {
    if (ns.customDomain) {
      const override = ns.customDomain.getCachedOverride();
      if (override) return override;
    }
    return getProject().baseUrl;
  }

  // 跨上下文刷新内存缓存（popup 保存后通知 background 调用）
  async function refreshBaseUrlCache() {
    if (ns.customDomain) {
      return ns.customDomain.loadCachedOverride();
    }
    return '';
  }

  function getAuthPath() {
    return getProject().authPath;
  }

  function getTenantApiPaths() {
    return getProject().tenantApiPaths;
  }

  function getCookieKeys() {
    return getProject().cookieKeys;
  }

  function getEnabledFeatures() {
    return getProject().enabledFeatures;
  }

  function getName() {
    return getProject().name;
  }

  function getHosts() {
    return getProject().hosts;
  }

  // 数据迁移：将旧版本无项目前缀的 key 迁移到默认项目命名空间
  async function migrateOldStorageKeys() {
    const OLD_KEYS = ['adminToken', 'adminCredentials', 'quickLoginRecent'];
    const result = await chrome.storage.local.get(OLD_KEYS);

    if (!result.adminToken && !result.adminCredentials && !result.quickLoginRecent) {
      return; // 无旧数据，跳过
    }

    const defaultId = ns.projects.DEFAULT_PROJECT_ID;
    const newKeys = {};

    if (result.adminToken) {
      newKeys[`adminToken:${defaultId}`] = result.adminToken;
    }

    if (result.adminCredentials) {
      newKeys[`adminCredentials:${defaultId}`] = result.adminCredentials;
    }

    if (result.quickLoginRecent) {
      newKeys[`quickLoginRecent:${defaultId}`] = result.quickLoginRecent.map(r => ({
        ...r,
        projectId: defaultId
      }));
    }

    await chrome.storage.local.set(newKeys);
    await chrome.storage.local.remove(OLD_KEYS);
    console.log('[Migrate] Moved old storage to project:', defaultId);
  }

  ns.currentProject = {
    getCurrentProjectId,
    setCurrentProjectId,
    switchProjectContext,
    loadCurrentProject,
    getCachedProjectId,
    getProject,
    getBaseUrl,
    getAuthPath,
    getTenantApiPaths,
    getCookieKeys,
    getEnabledFeatures,
    getName,
    getHosts,
    migrateOldStorageKeys,
    refreshBaseUrlCache,
  };
})();
