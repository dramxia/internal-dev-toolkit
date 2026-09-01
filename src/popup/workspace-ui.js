/* 内部开发工具箱 — 侧边栏任务工作台与工具屏路由 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});
  const STORAGE_KEY = 'sidePanelActiveWorkspace';

  const FEATURE_META = Object.freeze({
    adminPanel: {
      id: 'admin',
      label: '后台账号',
      shortLabel: '后台',
      panelId: 'panel-admin',
      path: '后台登录',
      utilities: { token: 'admin-token', domain: 'admin-domain' },
    },
    quickLogin: {
      id: 'relations',
      label: '师生关系',
      shortLabel: '关系',
      panelId: 'panel-quick',
      path: '教师 -> 学生',
      utilities: { history: 'quick-history', token: 'admin-token' },
    },
    otherLogin: {
      id: 'higher',
      label: '高校直达',
      shortLabel: '高校',
      panelId: 'panel-other',
      path: '账号登入',
      utilities: { history: 'other-history', token: 'other-token' },
    },
    appLogin: {
      id: 'app',
      label: 'APP 登录',
      shortLabel: 'APP',
      panelId: 'panel-app',
      path: '学生登录',
      utilities: { history: 'app-history', token: 'app-token' },
    },
  });

  const UTILITY_META = Object.freeze({
    'admin-token': { title: '后台 Token', sourceId: 'adminTokenSection' },
    'admin-domain': { title: 'API 域名', sourceId: 'adminDomainSection' },
    'quick-history': { title: '最近使用', sourceId: 'quickHistorySection' },
    'other-history': { title: '高校登录历史', sourceId: 'otherHistorySection' },
    'other-token': { title: '高校 Token', sourceId: 'otherTokenSection' },
    'app-history': { title: 'APP 登录历史', sourceId: 'appHistorySection' },
    'app-token': { title: 'APP Token', sourceId: 'appTokenSection' },
  });

  const ICONS = Object.freeze({
    admin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M12 14v3"/></svg>',
    relations: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9.5 8.5l5 7M17 7h-5a5 5 0 0 0-5 5v2"/></svg>',
    higher: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>',
    app: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/></svg>',
    history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
    token: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 4l4 4M14 6l4 4"/></svg>',
    domain: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  });

  let definitions = [];
  let activeWorkspace = null;
  let activeUtility = '';
  let returnState = null;
  const beforeLeave = new Map();

  function createNavigationGate() {
    let active = false;
    return {
      tryEnter() {
        if (active) return false;
        active = true;
        return true;
      },
      leave() { active = false; },
      isActive() { return active; },
    };
  }

  const navigationGate = createNavigationGate();

  const $ = (id) => document.getElementById(id);

  function buildWorkspaceDefinitions(projects, featureMeta = FEATURE_META) {
    const result = [];
    for (const project of Array.isArray(projects) ? projects : []) {
      for (const feature of project.enabledFeatures || []) {
        const meta = featureMeta[feature];
        if (!meta) continue;
        result.push(Object.assign({}, meta, {
          feature,
          projectId: project.id,
          projectName: project.name,
          workspaceId: `${project.id}:${meta.id}`,
        }));
      }
    }
    return result;
  }

  function selectInitialWorkspace(items, currentProjectId, storedWorkspaceId) {
    const source = Array.isArray(items) ? items : [];
    const stored = source.find((item) => item.workspaceId === storedWorkspaceId) || null;
    if (stored?.projectId === currentProjectId) return stored;
    return source.find((item) => item.projectId === currentProjectId) || source[0] || null;
  }

  async function readStoredWorkspace() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return String(result?.[STORAGE_KEY] || '');
  }

  async function storeWorkspace(workspaceId) {
    await chrome.storage.local.set({ [STORAGE_KEY]: workspaceId });
  }

  function workspaceForId(workspaceId) {
    return definitions.find((item) => item.workspaceId === workspaceId) || null;
  }

  function renderDock() {
    const dock = $('workspaceDock');
    if (!dock) return;
    dock.innerHTML = definitions.map((item) => (
      `<button class="workspace-dock-item" type="button" data-workspace-id="${item.workspaceId}" ` +
      `aria-label="${item.projectName} / ${item.label}">` +
      `<span class="workspace-dock-icon">${ICONS[item.id]}</span>` +
      `<span>${item.shortLabel}</span></button>`
    )).join('');
    dock.classList.toggle('is-scrollable', definitions.length > 4);
  }

  function createUtilityScreens() {
    const host = $('utilityHost');
    if (!host) return;
    Object.entries(UTILITY_META).forEach(([id, meta]) => {
      const source = $(meta.sourceId);
      if (!source) return;
      const screen = document.createElement('section');
      screen.className = 'utility-screen';
      screen.id = `utility-${id}`;
      screen.dataset.utilityId = id;
      screen.hidden = true;
      screen.appendChild(source);
      host.appendChild(screen);
    });
  }

  function setHeaderAction(buttonId, utilityId) {
    const button = $(buttonId);
    if (!button) return;
    const available = Boolean(utilityId && $(`utility-${utilityId}`));
    button.hidden = !available;
    button.dataset.utilityId = available ? utilityId : '';
  }

  function currentWorkspaceStatus() {
    if (!activeWorkspace) return '';
    if (activeWorkspace.feature === 'quickLogin') {
      const notice = $('quickAuthNotice');
      if (notice?.dataset.kind === 'warning') return '需要 Token';
      if (notice?.dataset.kind === 'ready') return 'Token 就绪';
      return '检查 Token';
    }
    const utilityId = activeWorkspace.utilities.token;
    const screen = utilityId ? $(`utility-${utilityId}`) : null;
    const shell = screen?.querySelector('.token-shell');
    return shell && !shell.classList.contains('empty') ? 'Token 就绪' : '未登录';
  }

  function syncHeader() {
    if (!activeWorkspace || activeUtility) return;
    $('workspaceTitle').textContent = activeWorkspace.label;
    $('workspaceProject').textContent = activeWorkspace.projectName;
    $('workspacePath').textContent = activeWorkspace.path;
    $('workspaceStatus').textContent = currentWorkspaceStatus();
    setHeaderAction('workspaceHistoryBtn', activeWorkspace.utilities.history);
    setHeaderAction('workspaceTokenBtn', activeWorkspace.utilities.token);
    setHeaderAction('workspaceDomainBtn', activeWorkspace.utilities.domain);
  }

  function syncDock() {
    document.querySelectorAll('.workspace-dock-item').forEach((button) => {
      const selected = button.dataset.workspaceId === activeWorkspace?.workspaceId;
      button.classList.toggle('active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function activateWorkspace(workspace, options = {}) {
    if (!workspace) return false;
    activeWorkspace = workspace;
    activeUtility = '';
    document.body.classList.remove('utility-open');
    $('workspaceBackBtn').hidden = true;
    document.querySelectorAll('.utility-screen').forEach((screen) => { screen.hidden = true; });
    document.querySelectorAll('.panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === workspace.panelId);
    });
    syncHeader();
    syncDock();
    if (options.restoreScroll && $('workspaceMain')) {
      requestAnimationFrame(() => { $('workspaceMain').scrollTop = options.restoreScroll; });
    } else if ($('workspaceMain')) {
      $('workspaceMain').scrollTop = 0;
    }
    return true;
  }

  async function runBeforeLeave(key) {
    const handler = beforeLeave.get(key);
    if (!handler) return true;
    try {
      return (await handler()) !== false;
    } catch (error) {
      ns.ui.toast(error?.message || '保存失败，请重试', 'err');
      return false;
    }
  }

  async function openUtility(utilityId, trigger = document.activeElement) {
    const screen = $(`utility-${utilityId}`);
    const meta = UTILITY_META[utilityId];
    if (!screen || !meta || !activeWorkspace) return false;
    if (activeUtility && !(await runBeforeLeave(activeUtility))) return false;
    returnState = {
      workspaceId: activeWorkspace.workspaceId,
      scrollTop: $('workspaceMain')?.scrollTop || 0,
      trigger,
    };
    activeUtility = utilityId;
    document.body.classList.add('utility-open');
    document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active'));
    document.querySelectorAll('.utility-screen').forEach((item) => { item.hidden = item !== screen; });
    $('workspaceBackBtn').hidden = false;
    $('workspaceTitle').textContent = meta.title;
    $('workspaceProject').textContent = activeWorkspace.projectName;
    $('workspacePath').textContent = '工具屏';
    $('workspaceStatus').textContent = '';
    ['workspaceHistoryBtn', 'workspaceTokenBtn', 'workspaceDomainBtn'].forEach((id) => { $(id).hidden = true; });
    if ($('workspaceMain')) $('workspaceMain').scrollTop = 0;
    requestAnimationFrame(() => screen.querySelector('button, input, [contenteditable="true"]')?.focus({ preventScroll: true }));
    return true;
  }

  async function back() {
    if (!activeUtility || !returnState) return false;
    if (!(await runBeforeLeave(activeUtility))) return false;
    const previous = returnState;
    const workspace = workspaceForId(previous.workspaceId) || activeWorkspace;
    returnState = null;
    activateWorkspace(workspace, { restoreScroll: previous.scrollTop });
    requestAnimationFrame(() => previous.trigger?.focus?.({ preventScroll: true }));
    return true;
  }

  function setDockBusy(active) {
    const dock = $('workspaceDock');
    if (dock) dock.setAttribute('aria-busy', String(active));
    document.querySelectorAll('.workspace-dock-item').forEach((button) => {
      button.disabled = active;
    });
  }

  async function switchWorkspace(workspaceId) {
    if (!navigationGate.tryEnter()) return;
    const target = workspaceForId(workspaceId);
    if (!target || target.workspaceId === activeWorkspace?.workspaceId) {
      navigationGate.leave();
      return;
    }
    setDockBusy(true);
    let reloadScheduled = false;
    try {
      if (activeUtility && !(await back())) return;
      await storeWorkspace(target.workspaceId);
      if (target.projectId !== ns.currentProject.getCachedProjectId()) {
        await ns.currentProject.setCurrentProjectId(target.projectId);
        location.reload();
        reloadScheduled = true;
        return;
      }
      activateWorkspace(target);
    } catch (error) {
      ns.ui.toast(`切换任务失败: ${error.message}`, 'err');
    } finally {
      if (!reloadScheduled) {
        navigationGate.leave();
        setDockBusy(false);
      }
    }
  }

  function switchOtherView(view) {
    const teacherView = view === 'teachers';
    const section = $('otherLoginSection');
    const teacherSection = $('otherTeacherSection');
    if (!section || !teacherSection) return;
    section.classList.toggle('show-teachers', teacherView);
    teacherSection.classList.toggle('hidden', !teacherView);
    document.querySelectorAll('#otherSubviewNav [data-other-view]').forEach((button) => {
      const active = button.dataset.otherView === (teacherView ? 'teachers' : 'account');
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    setPath(teacherView ? '教师直达' : '账号登入');
  }

  function bindEvents() {
    $('workspaceDock')?.addEventListener('click', (event) => {
      const button = event.target.closest('.workspace-dock-item');
      if (button) switchWorkspace(button.dataset.workspaceId);
    });
    document.querySelector('.workspace-header-actions')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-utility-id]');
      if (button?.dataset.utilityId) openUtility(button.dataset.utilityId, button);
    });
    $('workspaceBackBtn')?.addEventListener('click', () => back());
    $('otherSubviewNav')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-other-view]');
      if (button) switchOtherView(button.dataset.otherView);
    });
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-utility]');
      if (button) openUtility(button.dataset.openUtility, button);
    });
    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape' && activeUtility) {
        event.preventDefault();
        back();
      }
    });
  }

  function observeStatus() {
    const observer = new MutationObserver(() => syncHeader());
    ['quickAuthNotice', 'tokenWrap', 'otherTokenWrap', 'appTokenWrap'].forEach((id) => {
      const element = $(id);
      if (element) observer.observe(element, { attributes: true, childList: true, subtree: true });
    });
  }

  function registerBeforeLeave(utilityId, handler) {
    if (typeof handler === 'function') beforeLeave.set(utilityId, handler);
  }

  function setPath(path) {
    if (!activeWorkspace || activeUtility) return;
    activeWorkspace.path = String(path || '');
    syncHeader();
  }

  async function init() {
    definitions = buildWorkspaceDefinitions(ns.projects.PROJECTS);
    renderDock();
    createUtilityScreens();
    bindEvents();

    const currentProjectId = ns.currentProject.getCachedProjectId();
    let storedWorkspaceId = '';
    try {
      storedWorkspaceId = await readStoredWorkspace();
    } catch (_) {}
    const workspace = selectInitialWorkspace(definitions, currentProjectId, storedWorkspaceId);
    activateWorkspace(workspace);
    if (workspace) {
      try { await storeWorkspace(workspace.workspaceId); } catch (_) {}
    }
    observeStatus();
  }

  ns.workspaceUi = {
    init,
    back,
    openUtility,
    setPath,
    switchWorkspace,
    registerBeforeLeave,
    syncHeader,
    buildWorkspaceDefinitions,
    selectInitialWorkspace,
    createNavigationGate,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      FEATURE_META,
      buildWorkspaceDefinitions,
      selectInitialWorkspace,
      createNavigationGate,
    };
  }
})();
