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
      usesProjectContext: true,
    },
    quickLogin: {
      id: 'relations',
      label: '师生关系',
      shortLabel: '关系',
      panelId: 'panel-quick',
      path: '教师 -> 学生',
      utilities: { history: 'quick-history', token: 'admin-token' },
      usesProjectContext: true,
    },
    otherLogin: {
      id: 'higher',
      label: '高校直达',
      shortLabel: '高校',
      panelId: 'panel-other',
      path: '账号登入',
      utilities: { history: 'other-history', token: 'other-token' },
      usesProjectContext: false,
    },
    appLogin: {
      id: 'app',
      label: 'APP 登录',
      shortLabel: 'APP',
      panelId: 'panel-app',
      path: '学生登录',
      utilities: { history: 'app-history', token: 'app-token' },
      usesProjectContext: false,
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
  const featureLifecycles = new Map();
  const featureInitPromises = new Map();
  const workspaceScroll = new Map();
  const otherViewScroll = new Map([['account', 0], ['teachers', 0]]);
  let activeOtherView = 'account';

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
          contextProjectId: meta.usesProjectContext ? project.id : '',
        }));
      }
    }
    return result;
  }

  function selectInitialWorkspace(items, currentProjectId, storedWorkspaceId) {
    const source = Array.isArray(items) ? items : [];
    const stored = source.find((item) => item.workspaceId === storedWorkspaceId) || null;
    if (stored) return stored;
    return source.find((item) => item.projectId === currentProjectId) || source[0] || null;
  }

  function registerFeatureLifecycle(feature, lifecycle) {
    if (!feature || !lifecycle) return;
    featureLifecycles.set(feature, lifecycle);
  }

  function ensureFeatureInitialized(feature) {
    if (!featureLifecycles.has(feature)) return Promise.resolve();
    if (!featureInitPromises.has(feature)) {
      const lifecycle = featureLifecycles.get(feature);
      featureInitPromises.set(feature, Promise.resolve().then(() => lifecycle.init?.()));
    }
    return featureInitPromises.get(feature);
  }

  function activateFeature(workspace) {
    if (!workspace) return;
    const lifecycle = featureLifecycles.get(workspace.feature);
    ensureFeatureInitialized(workspace.feature)
      .then(() => lifecycle?.activate?.(workspace))
      .catch((error) => ns.ui.toast(error?.message || '模块初始化失败', 'err'));
  }

  function warmInactiveFeatures(activeFeature) {
    const queue = [...new Set(definitions.map((item) => item.feature))]
      .filter((feature) => feature !== activeFeature);
    const scheduleNext = () => {
      if (!queue.length) return;
      const run = () => {
        const feature = queue.shift();
        ensureFeatureInitialized(feature)
          .catch(() => {})
          .finally(scheduleNext);
      };
      if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1500 });
      else setTimeout(run, 32);
    };
    scheduleNext();
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
    const main = $('workspaceMain');
    if (activeWorkspace && main && !activeUtility) workspaceScroll.set(activeWorkspace.workspaceId, main.scrollTop);
    activeWorkspace = workspace;
    activeUtility = '';
    document.body.classList.remove('utility-open');
    $('workspaceBackBtn').hidden = true;
    document.querySelectorAll('.utility-screen').forEach((screen) => { screen.hidden = true; });
    document.querySelectorAll('.panel').forEach((panel) => {
      const selected = panel.id === workspace.panelId;
      panel.classList.toggle('active', selected);
      panel.setAttribute('aria-hidden', String(!selected));
      panel.inert = !selected;
    });
    syncHeader();
    syncDock();
    const targetScroll = Number.isFinite(options.restoreScroll)
      ? options.restoreScroll
      : (workspaceScroll.get(workspace.workspaceId) || 0);
    if (main) main.scrollTop = targetScroll;
    activateFeature(workspace);
    return true;
  }

  function commitWorkspace(workspace, options = {}) {
    const update = () => activateWorkspace(workspace, options);
    if (options.transition === false || !ns.ui?.transitionView) return update();
    ns.ui.transitionView(update, 'workspace');
    return true;
  }

  async function ensureProjectContext(projectId) {
    if (!projectId || projectId === ns.currentProject.getCachedProjectId()) return;
    const response = await ns.messages.sendToBackground({
      type: 'SET_PROJECT_CONTEXT',
      payload: { projectId },
    });
    if (!response?.ok) throw new Error(response?.error || '后端项目上下文切换失败');
    await ns.currentProject.switchProjectContext(projectId);
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
    commitWorkspace(workspace, { restoreScroll: previous.scrollTop });
    requestAnimationFrame(() => previous.trigger?.focus?.({ preventScroll: true }));
    return true;
  }

  async function switchWorkspace(workspaceId) {
    if (!navigationGate.tryEnter()) return;
    const target = workspaceForId(workspaceId);
    if (!target || target.workspaceId === activeWorkspace?.workspaceId) {
      navigationGate.leave();
      return;
    }
    try {
      if (activeUtility && !(await back())) return;
      await ensureProjectContext(target.contextProjectId);
      commitWorkspace(target);
      storeWorkspace(target.workspaceId).catch(() => {});
    } catch (error) {
      ns.ui.toast(`切换任务失败: ${error.message}`, 'err');
    } finally {
      navigationGate.leave();
    }
  }

  function switchOtherView(view) {
    const nextView = view === 'teachers' ? 'teachers' : 'account';
    if (nextView === activeOtherView) return;
    const main = $('workspaceMain');
    if (main) otherViewScroll.set(activeOtherView, main.scrollTop);
    const teacherView = nextView === 'teachers';
    const section = $('otherLoginSection');
    const teacherSection = $('otherTeacherSection');
    if (!section || !teacherSection) return;
    const update = () => {
      activeOtherView = nextView;
      section.classList.toggle('show-teachers', teacherView);
      teacherSection.classList.toggle('hidden', !teacherView);
      document.querySelectorAll('#otherSubviewNav [data-other-view]').forEach((button) => {
        const active = button.dataset.otherView === nextView;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      setPath(teacherView ? '教师直达' : '账号登入');
      if (main) main.scrollTop = otherViewScroll.get(nextView) || 0;
    };
    if (ns.ui?.transitionView) ns.ui.transitionView(update, 'higher');
    else update();
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
    const validContexts = definitions.map((item) => item.contextProjectId).filter(Boolean);
    if (!validContexts.includes(ns.currentProject.getCachedProjectId())) {
      await ensureProjectContext(validContexts[0] || ns.projects.DEFAULT_PROJECT_ID);
    }
    renderDock();
    createUtilityScreens();
    bindEvents();

    const currentProjectId = ns.currentProject.getCachedProjectId();
    let storedWorkspaceId = '';
    try {
      storedWorkspaceId = await readStoredWorkspace();
    } catch (_) {}
    const workspace = selectInitialWorkspace(definitions, currentProjectId, storedWorkspaceId);
    commitWorkspace(workspace, { transition: false });
    if (workspace) {
      try { await storeWorkspace(workspace.workspaceId); } catch (_) {}
    }
    observeStatus();
    warmInactiveFeatures(workspace?.feature);
  }

  ns.workspaceUi = {
    init,
    back,
    openUtility,
    setPath,
    switchWorkspace,
    registerBeforeLeave,
    registerFeatureLifecycle,
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
