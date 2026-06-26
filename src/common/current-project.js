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
    await chrome.storage.local.set({ [STORAGE_KEY]: id });
    cachedProjectId = id;
    cachedProject = ns.projects.getById(id);
  }

  async function loadCurrentProject() {
    cachedProjectId = await getCurrentProjectId();
    cachedProject = ns.projects.getById(cachedProjectId);
    return cachedProject;
  }

  function getCachedProjectId() {
    return cachedProjectId || ns.projects.DEFAULT_PROJECT_ID;
  }

  function getProject() {
    return cachedProject || ns.projects.getById(ns.projects.DEFAULT_PROJECT_ID);
  }

  function getBaseUrl() {
    return getProject().baseUrl;
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
  };
})();
