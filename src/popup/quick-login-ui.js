/* 内部开发工具箱 — 一键登录双向查询 UI */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit;
  const tenant = ns.tenant;
  const messages = ns.messages;
  const DEFAULT_DEV_PORT = '8088';
  const SEARCH_DEBOUNCE = 300;
  let initialized = false;

  const icons = {
    open: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    copy: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    student: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    teacher: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    delete: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  };

  const state = {
    expanded: true,
    mode: 'teacher',
    env: 'online',
    devPort: DEFAULT_DEV_PORT,
    loadingLogin: false,
    recentExpanded: false,
    teacher: {
      selectedTenant: null,
      tenantKeyword: '',
      tenantRequestId: 0,
      loadingTenants: false,
      userKeyword: '',
      userRequestId: 0,
      loadingUsers: false,
      userPage: { current: 1, size: 10, total: 0, records: [] },
      selectedUser: null,
      sessionRequestId: 0,
      loadingSession: false,
      teacherNameKeyword: '',
      teacherAccountKeyword: '',
      teacherRequestId: 0,
      loadingTeachers: false,
      teacherPage: { current: 1, size: 10, total: 0, records: [] },
      selectedTeacher: null,
      teacherDetailRequestId: 0,
      loadingDuties: false,
      classIds: [],
      studentNameKeyword: '',
      studentCodeKeyword: '',
      studentRequestId: 0,
      loadingStudents: false,
      studentPage: { current: 1, size: 10, total: 0, records: [] },
    },
    student: {
      field: 'username',
      keyword: '',
      accountRequestId: 0,
      loadingAccounts: false,
      accountPage: { current: 1, size: 10, total: 0, records: [] },
      selectedAccount: null,
      sessionRequestId: 0,
      loadingSession: false,
      relationRequestId: 0,
      relationLoading: false,
      relationError: '',
      relationMode: 'student',
      semesters: [],
      semesterId: '',
      classes: [],
      classTeacherMap: {},
      matchedStudents: [],
      matchedBy: '',
      selectedStudent: null,
      selectedClassId: '',
      resolvingTeachers: false,
      regularAccountsByTenant: {},
      relationTeacherCache: {},
    },
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function debounce(fn, ms) {
    let timer = 0;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function setStatus(text, kind) {
    ns.ui.toast(text || '', kind);
  }

  function resetPage(size = 10) {
    return { current: 1, size, total: 0, records: [] };
  }

  function normalizeEnv(env) {
    return env === 'local' || env === 'dev' ? 'local' : 'online';
  }

  function normalizePort(value) {
    const raw = String(value || '').trim();
    if (!/^\d+$/.test(raw)) return DEFAULT_DEV_PORT;
    const n = Number.parseInt(raw, 10);
    return Number.isInteger(n) && n >= 1 && n <= 65535 ? String(n) : DEFAULT_DEV_PORT;
  }

  function targetEnv() {
    return state.env === 'dev' ? 'local' : 'online';
  }

  function updateEnvBadge() {
    const text = state.env === 'dev'
      ? 'AI平台 · 开发 :' + normalizePort(state.devPort)
      : 'AI平台 · 线上';
    const className = state.env === 'dev' ? 'badge success' : 'badge warning';
    ['envBadge', 'targetEnvBadge'].forEach((id) => {
      const badge = $(id);
      if (!badge) return;
      badge.textContent = text;
      badge.className = className;
    });
  }

  function updateEnvUI() {
    const online = $('envOnlineBtn');
    const dev = $('envDevBtn');
    const portField = $('portField');
    const port = $('localPort');
    if (online) {
      online.classList.toggle('active', state.env === 'online');
      online.setAttribute('aria-pressed', String(state.env === 'online'));
    }
    if (dev) {
      dev.classList.toggle('active', state.env === 'dev');
      dev.setAttribute('aria-pressed', String(state.env === 'dev'));
    }
    if (portField) portField.classList.toggle('hidden', state.env !== 'dev');
    if (port && state.env === 'dev') port.value = normalizePort(state.devPort);
    updateEnvBadge();
  }

  function clearTeacherSession() {
    const t = state.teacher;
    t.selectedUser = null;
    t.selectedTeacher = null;
    t.teacherPage = resetPage();
    t.studentPage = resetPage();
    t.classIds = [];
    t.tenantRequestId += 1;
    t.userRequestId += 1;
    t.teacherRequestId += 1;
    t.sessionRequestId += 1;
    t.teacherDetailRequestId += 1;
    t.studentRequestId += 1;
    t.loadingSession = false;
    t.loadingTenants = false;
    t.loadingUsers = false;
    t.loadingTeachers = false;
    t.loadingStudents = false;
    t.loadingDuties = false;
  }

  function clearStudentSession(preserveAccount = true) {
    const s = state.student;
    s.selectedAccount = preserveAccount && s.selectedAccount
      ? Object.assign({}, s.selectedAccount, { session: null })
      : null;
    s.selectedStudent = null;
    s.matchedStudents = [];
    s.selectedClassId = '';
    s.semesters = [];
    s.semesterId = '';
    s.classes = [];
    s.classTeacherMap = {};
    s.accountRequestId += 1;
    s.relationRequestId += 1;
    s.sessionRequestId += 1;
    s.loadingAccounts = false;
    s.loadingSession = false;
    s.relationLoading = false;
    s.resolvingTeachers = false;
    s.relationError = '';
  }

  function clearAllSessions() {
    clearTeacherSession();
    state.teacher.userPage = resetPage();
    clearStudentSession(false);
    renderTeacherShell();
    renderStudentShell();
  }

  function switchEnv(env) {
    if (state.loadingLogin) {
      setStatus('正在获取登录链接，请稍候再切换环境', '');
      return;
    }
    const next = env === 'dev' ? 'dev' : 'online';
    if (next === state.env) return;
    state.env = next;
    if (state.env === 'dev') state.devPort = normalizePort(state.devPort);
    clearAllSessions();
    updateEnvUI();
    setStatus('环境已切换，请重新选择账号建立 AI 会话', '');
  }

  function switchMode(mode) {
    if (state.loadingLogin) {
      setStatus('正在获取登录链接，请稍候再切换查询模式', '');
      return;
    }
    const next = mode === 'student' ? 'student' : 'teacher';
    if (next === state.mode) return;
    state.mode = next;
    clearAllSessions();
    updateModeUI();
    setStatus('', '');
  }

  function updateModeUI() {
    const teacherBtn = $('modeTeacherBtn');
    const studentBtn = $('modeStudentBtn');
    const teacherPanel = $('teacherModePanel');
    const studentPanel = $('studentModePanel');
    if (teacherBtn) {
      teacherBtn.classList.toggle('active', state.mode === 'teacher');
      teacherBtn.setAttribute('aria-pressed', String(state.mode === 'teacher'));
    }
    if (studentBtn) {
      studentBtn.classList.toggle('active', state.mode === 'student');
      studentBtn.setAttribute('aria-pressed', String(state.mode === 'student'));
    }
    if (teacherPanel) teacherPanel.classList.toggle('hidden', state.mode !== 'teacher');
    if (studentPanel) studentPanel.classList.toggle('hidden', state.mode !== 'student');
  }

  function renderShell() {
    const body = $('quickLoginBody');
    if (!body) return;
    const content = body.querySelector('.section-content') || body;
    content.innerHTML =
      '<div class="quick-target-row">' +
        '<span class="quick-target-label">目标环境</span><span class="badge warning" id="targetEnvBadge">AI平台 · 线上</span>' +
      '</div>' +
      '<div class="field">' +
        '<div class="env-switcher"><button class="env-btn active" id="envOnlineBtn" type="button">线上</button><button class="env-btn" id="envDevBtn" type="button">开发</button></div>' +
      '</div>' +
      '<div class="field hidden" id="portField"><label class="field-label">开发端口</label><input class="field-input" id="localPort" type="text" autocomplete="off" placeholder="默认 8088"></div>' +
      '<div class="quick-api-note">后台/API 来源：gpt-admin-pre.hwzxs.com · AI token 仅在当前会话内使用 · 开发环境只切换打开目标</div>' +
      '<div class="divider"></div>' +
      '<div class="quick-mode-switcher"><button class="env-btn active" id="modeTeacherBtn" type="button">教师查学生</button><button class="env-btn" id="modeStudentBtn" type="button">学生查教师</button></div>' +
      '<div id="teacherModePanel" class="quick-mode-panel">' +
        '<div class="quick-flow-step"><span class="quick-step-number">1</span><div><div class="quick-subhead">选择租户</div><input class="field-input" id="tenantSearch" type="text" autocomplete="off" placeholder="搜索租户名称 / 域名 / 联系人"><div class="list hidden" id="tenantList"></div><div class="list-empty hidden" id="tenantEmpty">请输入租户条件</div></div></div>' +
        '<div class="quick-flow-step"><span class="quick-step-number">2</span><div><div class="quick-subhead">选择租户用户（教师会话入口）</div><input class="field-input" id="userSearch" type="text" autocomplete="off" placeholder="姓名 / 手机号"><div class="list hidden" id="userList"></div><div class="list-empty" id="userEmpty">先选择租户</div><div class="pager hidden" id="userPager"></div></div></div>' +
        '<div class="quick-flow-step"><span class="quick-step-number">3</span><div><div class="quick-subhead-row"><div class="quick-subhead">AI 教师</div><button class="btn btn-ghost compact" id="teacherRefreshBtn" type="button">刷新</button></div><div class="teacher-search-row"><input class="field-input" id="teacherNameSearch" type="text" autocomplete="off" placeholder="姓名"><input class="field-input" id="teacherAccountSearch" type="text" autocomplete="off" placeholder="账号"></div><div class="list hidden" id="teacherList"></div><div class="list-empty" id="teacherEmpty">选择租户用户后加载教师</div><div class="pager hidden" id="teacherPager"></div></div></div>' +
        '<div class="student-section hidden" id="studentSection"><div class="divider"></div><div class="quick-subhead-row"><div class="quick-subhead" id="studentSectionTitle">相关学生</div><button class="btn btn-ghost compact" id="studentRefreshBtn" type="button">刷新</button></div><div class="teacher-duties hidden" id="teacherDuties"></div><div class="teacher-search-row"><input class="field-input" id="studentNameSearch" type="text" autocomplete="off" placeholder="姓名"><input class="field-input" id="studentCodeSearch" type="text" autocomplete="off" placeholder="学号"></div><div class="list hidden" id="studentList"></div><div class="list-empty" id="studentEmpty">选择 AI 教师后加载相关学生</div><div class="pager hidden" id="studentPager"></div></div>' +
      '</div>' +
      '<div id="studentModePanel" class="quick-mode-panel hidden">' +
        '<div class="quick-flow-step"><span class="quick-step-number">1</span><div><div class="quick-subhead">搜索学生账号</div><div class="teacher-search-row"><select class="field-input" id="accountSearchField"><option value="username">姓名</option><option value="account">账号</option><option value="tenantName">租户</option></select><input class="field-input" id="accountSearch" type="text" autocomplete="off" placeholder="输入姓名"></div><div class="list hidden" id="accountList"></div><div class="list-empty" id="accountEmpty">请输入学生姓名、账号或租户</div><div class="pager hidden" id="accountPager"></div></div></div>' +
        '<div class="quick-flow-step hidden" id="studentRelationPanel"><span class="quick-step-number">2</span><div><div class="quick-subhead-row"><div class="quick-subhead">学生关联教师</div><button class="btn btn-ghost compact" id="studentRelationRefreshBtn" type="button">刷新</button></div><div class="teacher-lookup-toolbar"><div class="env-switcher"><button class="env-btn active" id="lookupByStudentBtn" type="button">按学生</button><button class="env-btn" id="lookupByClassBtn" type="button">按班级</button></div><select class="field-input" id="teacherLookupSemesterSelect" disabled><option value="">选择学期</option></select></div><div class="quick-session-note" id="studentSessionNote"></div><div id="lookupStudentPanel"><div class="list hidden" id="lookupStudentList"></div><div class="list-empty hidden" id="lookupStudentEmpty">正在匹配 AI 学生</div><div class="pager hidden" id="lookupStudentPager"></div></div><div class="hidden" id="lookupClassPanel"><select class="field-input" id="lookupClassSelect"><option value="">选择班级</option></select></div><div class="teacher-lookup-result-head hidden" id="lookupTeacherResultHead"><span id="lookupTeacherResultTitle"></span><span class="teacher-lookup-result-count" id="lookupTeacherResultCount"></span></div><div class="list hidden" id="lookupTeacherList"></div><div class="list-empty hidden" id="lookupTeacherEmpty">请选择学生或班级</div></div></div>' +
      '</div>' +
      '<div class="divider"></div><div class="quick-subhead">最近登录</div><div class="recent-list" id="recentList"><div class="recent-empty">暂无最近登录记录</div></div>';
    $('localPort').value = state.devPort;
    updateEnvUI();
    updateModeUI();
  }

  async function hasAdminToken() {
    const tokenState = await ns.token.getToken();
    return Boolean(tokenState && tokenState.token);
  }

  async function request(type, payload) {
    const response = await messages.sendToBackground({ type, payload });
    if (!response || !response.ok) throw new Error(response?.error || '请求失败');
    return response.res ?? response;
  }

  function pageFrom(response) {
    return tenant.extractPageData(response);
  }

  function clearList(id, emptyId, message) {
    const list = $(id);
    const empty = $(emptyId);
    if (list) { list.innerHTML = ''; list.classList.add('hidden'); }
    if (empty) { empty.textContent = message || ''; empty.classList.remove('hidden'); }
  }

  function buildPagerUI(el, page, go) {
    if (!el) return;
    el.innerHTML = '';
    const total = Number(page.total) || 0;
    const size = Number(page.size) || 10;
    const current = Number(page.current) || 1;
    const pages = Math.ceil(total / size);
    if (!total || pages <= 1) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const add = (label, target, disabled, active) => {
      const button = document.createElement('button');
      button.className = 'pager-btn' + (active ? ' active' : '');
      button.textContent = label;
      button.disabled = Boolean(disabled);
      if (!disabled && !active) button.addEventListener('click', () => go(target));
      el.appendChild(button);
    };
    add('‹', current - 1, current <= 1, false);
    const start = Math.max(1, Math.min(current - 2, pages - 4));
    const end = Math.min(pages, start + 4);
    for (let i = start; i <= end; i += 1) add(String(i), i, false, i === current);
    add('›', current + 1, current >= pages, false);
    const info = document.createElement('span');
    info.className = 'pager-info';
    info.textContent = '共 ' + total + ' 条';
    el.appendChild(info);
  }

  function actionButtons(meta, disabled) {
    const attrs = [
      'data-id="' + escapeHtml(meta.id || '') + '"',
      'data-tenant-id="' + escapeHtml(meta.tenantId || '') + '"',
      'data-tenant-name="' + escapeHtml(meta.tenantName || '') + '"',
      'data-domain="' + escapeHtml(meta.domain || '') + '"',
      'data-industry="' + escapeHtml(meta.industry || '') + '"',
      'data-user-name="' + escapeHtml(meta.userName || '') + '"',
      'data-role="' + escapeHtml(meta.role || 'teacher') + '"',
    ].join(' ');
    const suffix = disabled ? ' disabled aria-disabled="true"' : '';
    return '<div class="list-item-actions">' +
      '<button class="action-btn primary" data-action="open" ' + attrs + suffix + ' title="打开 AI 平台" aria-label="打开 AI 平台">' + icons.open + '</button>' +
      '<button class="action-btn" data-action="copy" ' + attrs + suffix + ' title="复制 AI 平台 Token query" aria-label="复制 AI 平台 Token query">' + icons.copy + '</button>' +
      '<button class="action-btn" data-action="student" ' + attrs + suffix + ' title="学生评价" aria-label="学生评价">' + icons.student + '</button>' +
      '<button class="action-btn" data-action="teacher" ' + attrs + suffix + ' title="教师评价" aria-label="教师评价">' + icons.teacher + '</button>' +
      '</div>';
  }

  function extractTokenQuery(url) {
    const raw = String(url || '');
    try {
      const parsed = new URL(raw);
      const tokenPart = parsed.search.slice(1).split('&').find((part) => /^token=/i.test(part));
      return tokenPart ? '?' + tokenPart : '';
    } catch (_) {
      const query = raw.split('?')[1] || '';
      const tokenPart = query.split('&').find((part) => /^token=/i.test(part));
      return tokenPart ? '?' + tokenPart.split('#')[0] : '';
    }
  }

  function extractSearchQuery(url) {
    try {
      return new URL(String(url || '')).search || '';
    } catch (_) {
      const index = String(url || '').indexOf('?');
      return index >= 0 ? String(url).slice(index).split('#')[0] : '';
    }
  }

  function buildDirectUrl(url, localPort) {
    if (!localPort) return String(url);
    try {
      const parsed = new URL(String(url));
      parsed.protocol = 'http:';
      parsed.hostname = 'localhost';
      parsed.port = String(localPort);
      return parsed.toString();
    } catch (_) {
      return String(url).replace(/^https?:\/\/[^/]+/i, 'http://localhost:' + localPort);
    }
  }

  function buildEvaluateUrl(url, path, localPort) {
    const query = extractSearchQuery(url);
    if (localPort) return 'http://localhost:' + localPort + path + query;
    try {
      const parsed = new URL(String(url));
      return parsed.origin + path + query;
    } catch (_) {
      return String(url).replace(/[?#].*$/, '') + path + query;
    }
  }

  async function copyToClipboard(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── 教师查学生 ──

  async function loadTenants() {
    if (state.mode !== 'teacher') return;
    const t = state.teacher;
    const keyword = t.tenantKeyword.trim();
    if (!keyword) {
      // 清空输入时也要使在途请求失效，避免旧租户结果回填到空搜索状态。
      t.tenantRequestId += 1;
      t.loadingTenants = false;
      clearList('tenantList', 'tenantEmpty', '请输入租户条件');
      return;
    }
    const requestId = ++t.tenantRequestId;
    t.loadingTenants = true;
    try {
      if (!(await hasAdminToken())) throw new Error('请先在「后台账号」获取后台 Token');
      const response = await request('FETCH_TENANTS', { current: 1, size: 10, keyword });
      if (requestId !== t.tenantRequestId) return;
      renderTenantList(pageFrom(response).records || []);
    } catch (error) {
      if (requestId === t.tenantRequestId) clearList('tenantList', 'tenantEmpty', error.message);
      if (requestId === t.tenantRequestId) setStatus(error.message, 'err');
    } finally {
      if (requestId === t.tenantRequestId) t.loadingTenants = false;
    }
  }

  function renderTenantList(records) {
    const list = $('tenantList');
    const empty = $('tenantEmpty');
    if (!list || !empty) return;
    list.innerHTML = '';
    if (!records.length) {
      list.classList.add('hidden');
      empty.textContent = '未找到租户';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    records.forEach((raw) => {
      const item = tenant.normalizeTenant(raw);
      const row = document.createElement('div');
      row.className = 'list-item' + (state.teacher.selectedTenant?.tenantId === item.tenantId ? ' active' : '');
      row.innerHTML = '<div class="list-item-content"><div class="list-item-title">' +
        escapeHtml(item.tenantName || '(未命名)') + '</div><div class="list-item-meta">' +
        escapeHtml(item.domain || item.contactPhone || item.tenantId) + '</div></div>';
      row.addEventListener('click', () => selectTeacherTenant(item));
      list.appendChild(row);
    });
  }

  async function selectTeacherTenant(item) {
    const t = state.teacher;
    t.selectedTenant = item;
    t.userKeyword = '';
    t.userPage = resetPage();
    clearTeacherSession();
    $('tenantSearch').value = item.tenantName || '';
    $('tenantList').classList.add('hidden');
    $('userSearch').value = '';
    $('teacherNameSearch').value = '';
    $('teacherAccountSearch').value = '';
    renderTeacherShell();
    await loadTeacherUsers(true);
  }

  async function loadTeacherUsers(reset) {
    if (state.mode !== 'teacher') return;
    const t = state.teacher;
    if (!t.selectedTenant) return;
    if (reset) {
      t.userPage = resetPage();
      clearList('userList', 'userEmpty', '加载租户用户中...');
    }
    const requestId = ++t.userRequestId;
    t.loadingUsers = true;
    try {
      if (!(await hasAdminToken())) throw new Error('请先在「后台账号」获取后台 Token');
      const response = await request('FETCH_USERS', {
        tenantId: t.selectedTenant.tenantId,
        deptId: '',
        industry: t.selectedTenant.industry,
        current: t.userPage.current,
        size: t.userPage.size,
        keyword: t.userKeyword,
      });
      if (requestId !== t.userRequestId) return;
      const page = pageFrom(response);
      t.userPage.total = page.total || 0;
      t.userPage.records = page.records || [];
      renderTeacherUsers();
    } catch (error) {
      if (requestId === t.userRequestId) {
        t.userPage.records = [];
        t.userPage.total = 0;
        clearList('userList', 'userEmpty', error.message);
      }
      if (requestId === t.userRequestId) setStatus(error.message, 'err');
    } finally {
      if (requestId === t.userRequestId) t.loadingUsers = false;
    }
  }

  function renderTeacherUsers() {
    const t = state.teacher;
    const list = $('userList');
    const empty = $('userEmpty');
    const normalized = (t.userPage.records || []).map(tenant.normalizeUser);
    if (!list || !empty) return;
    list.innerHTML = '';
    if (!t.selectedTenant) {
      list.classList.add('hidden');
      empty.textContent = '先选择租户';
      empty.classList.remove('hidden');
      $('userPager')?.classList.add('hidden');
      return;
    }
    if (!normalized.length) {
      list.classList.add('hidden');
      empty.textContent = t.selectedTenant ? '未找到租户用户' : '先选择租户';
      empty.classList.remove('hidden');
      const pager = $('userPager');
      if (pager) pager.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    normalized.forEach((user) => {
      const row = document.createElement('div');
      row.className = 'list-item fade-in' + (t.selectedUser?.id === user.id ? ' active' : '');
      row.innerHTML = '<div class="list-item-content"><div class="list-item-title">' +
        escapeHtml(user.userName || '(未命名)') +
        (user.roleName ? '<span class="list-item-role">' + escapeHtml(user.roleName) + '</span>' : '') +
        '</div><div class="list-item-meta">' + escapeHtml(user.account || user.phone || user.userId) + '</div></div>' +
        actionButtons({
          id: user.id,
          tenantId: t.selectedTenant.tenantId,
          tenantName: t.selectedTenant.tenantName,
          domain: t.selectedTenant.domain,
          industry: t.selectedTenant.industry,
          userName: user.userName,
          role: 'teacher',
        }, !user.id);
      row.addEventListener('click', (event) => {
        if (!event.target.closest('.action-btn')) selectTeacherUser(user, row);
      });
      list.appendChild(row);
    });
    buildPagerUI($('userPager'), t.userPage, (page) => {
      t.userPage.current = page;
      loadTeacherUsers(false);
    });
  }

  async function selectTeacherUser(user, row) {
    const t = state.teacher;
    if (t.loadingSession || !t.selectedTenant || !user.id) return;
    if (t.selectedUser?.id === user.id) {
      clearTeacherSession();
      renderTeacherShell();
      return;
    }
    clearTeacherSession();
    const requestId = ++t.sessionRequestId;
    t.loadingSession = true;
    try {
      const result = await request('RESOLVE_USER_SESSION', {
        tenantId: t.selectedTenant.tenantId,
        id: user.id,
        industry: t.selectedTenant.industry,
      });
      if (requestId !== t.sessionRequestId) return;
      t.selectedUser = {
        id: user.id,
        userId: user.userId,
        userName: user.userName,
        account: user.account || user.phone || '',
        tenantId: t.selectedTenant.tenantId,
        tenantName: t.selectedTenant.tenantName,
        domain: t.selectedTenant.domain,
        industry: t.selectedTenant.industry,
        origin: result.origin,
        aiToken: result.aiToken,
        env: state.env,
      };
      t.teacherNameKeyword = '';
      t.teacherAccountKeyword = '';
      $('teacherNameSearch').value = '';
      $('teacherAccountSearch').value = '';
      renderTeacherUsers();
      await loadTeachers(true);
    } catch (error) {
      if (requestId === t.sessionRequestId) setStatus(error.message, 'err');
    } finally {
      if (requestId === t.sessionRequestId) {
        t.loadingSession = false;
        renderTeacherShell();
      }
    }
  }

  async function loadTeachers(reset) {
    if (state.mode !== 'teacher') return;
    const t = state.teacher;
    if (!t.selectedUser || !t.selectedUser.aiToken) {
      renderTeacherShell();
      return;
    }
    if (reset) {
      t.teacherPage = resetPage();
      t.selectedTeacher = null;
      t.studentPage = resetPage();
      t.classIds = [];
      t.teacherDetailRequestId += 1;
      t.studentRequestId += 1;
      t.loadingDuties = false;
      t.loadingStudents = false;
      renderTeacherShell();
    }
    const requestId = ++t.teacherRequestId;
    t.loadingTeachers = true;
    try {
      const response = await request('FETCH_TEACHERS', {
        origin: t.selectedUser.origin,
        aiToken: t.selectedUser.aiToken,
        current: t.teacherPage.current,
        size: t.teacherPage.size,
        name: t.teacherNameKeyword,
        account: t.teacherAccountKeyword,
      });
      if (requestId !== t.teacherRequestId) return;
      const page = pageFrom(response);
      t.teacherPage.total = page.total || 0;
      t.teacherPage.records = (page.records || []).map(tenant.normalizeTeacher);
      renderTeachers();
    } catch (error) {
      if (requestId === t.teacherRequestId) {
        t.teacherPage.records = [];
        t.teacherPage.total = 0;
        clearList('teacherList', 'teacherEmpty', error.message);
        setStatus(error.message, 'err');
      }
    } finally {
      if (requestId === t.teacherRequestId) t.loadingTeachers = false;
    }
  }

  function renderTeachers() {
    const t = state.teacher;
    const list = $('teacherList');
    const empty = $('teacherEmpty');
    if (!list || !empty) return;
    list.innerHTML = '';
    if (!t.teacherPage.records.length) {
      list.classList.add('hidden');
      empty.textContent = t.selectedUser ? '未找到 AI 教师' : '选择租户用户后加载教师';
      empty.classList.remove('hidden');
      const pager = $('teacherPager');
      if (pager) pager.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    t.teacherPage.records.forEach((teacherItem) => {
      const row = document.createElement('div');
      row.className = 'teacher-item fade-in' + (t.selectedTeacher?.id === teacherItem.id ? ' selected' : '');
      const status = teacherItem.statusText
        ? '<span class="teacher-badge ' + (teacherItem.statusOn === true ? 'status-on' : 'status-off') + '">' + escapeHtml(teacherItem.statusText) + '</span>'
        : '';
      row.innerHTML = '<div class="teacher-item-header"><span class="teacher-item-name">' +
        escapeHtml(teacherItem.name || '(未命名)') + '</span><span class="teacher-item-account">' +
        escapeHtml(teacherItem.account || '') + '</span></div>' +
        (status ? '<div class="teacher-item-badges">' + status + '</div>' : '');
      row.addEventListener('click', () => selectTeacher(teacherItem));
      list.appendChild(row);
    });
    buildPagerUI($('teacherPager'), t.teacherPage, (page) => {
      t.teacherPage.current = page;
      loadTeachers(false);
    });
  }

  async function selectTeacher(teacherItem) {
    const t = state.teacher;
    if (!t.selectedUser) return;
    if (t.selectedTeacher?.id === teacherItem.id) {
      t.selectedTeacher = null;
      t.studentPage = resetPage();
      t.classIds = [];
      t.teacherDetailRequestId += 1;
      t.studentRequestId += 1;
      t.loadingDuties = false;
      renderTeacherShell();
      return;
    }
    t.selectedTeacher = teacherItem;
    t.studentPage = resetPage();
    t.classIds = [];
    renderTeachers();
    await loadTeacherRelations(teacherItem);
  }

  async function loadTeacherRelations(teacherItem) {
    if (state.mode !== 'teacher') return;
    const t = state.teacher;
    const requestId = ++t.teacherDetailRequestId;
    t.loadingDuties = true;
    t.classIds = [];
    renderTeacherStudentArea('加载教师教学班级中...');
    try {
      const detailResponse = await request('FETCH_TEACHER_DETAIL', {
        origin: t.selectedUser.origin,
        aiToken: t.selectedUser.aiToken,
        id: teacherItem.id,
      });
      if (requestId !== t.teacherDetailRequestId) return;
      const detail = tenant.extractDetailData(detailResponse);
      const semesterId = tenant.extractSemesterId(detail);
      const treeResponse = await request('FETCH_SCHOOL_DEPT_TREE', {
        origin: t.selectedUser.origin,
        aiToken: t.selectedUser.aiToken,
        semesterId,
      });
      if (requestId !== t.teacherDetailRequestId) return;
      const idNameMap = tenant.buildDeptIdNameMap(treeResponse);
      const classOptions = tenant.extractClassOptions(treeResponse);
      teacherItem.detailDuties = tenant.extractTeachDuties(detail, idNameMap);
      const extractedClassIds = tenant.extractTeacherClassIds(detail);
      const extractedSet = new Set(extractedClassIds.map((id) => String(id)));
      const classIdsInTree = classOptions
        .filter((item) => extractedSet.has(String(item.id)))
        .map((item) => String(item.id));
      // 教师教学职务可以挂在班级、年级或学段；若详情给的是上级部门，
      // 将班级树中所有下级班级展开，确保“教师查学生”不漏掉下级班级。
      const expandedClassIds = new Set(classIdsInTree);
      classOptions.forEach((item) => {
        const ancestors = Array.isArray(item.ancestorIds) ? item.ancestorIds : [];
        if (ancestors.some((id) => extractedSet.has(String(id)))) expandedClassIds.add(String(item.id));
      });
      t.classIds = expandedClassIds.size ? [...expandedClassIds] : extractedClassIds;
      renderTeacherDuties();
      if (!t.classIds.length) {
        renderTeacherStudentArea('未找到该教师的教学班级');
        return;
      }
      await loadTeacherStudents(true, requestId);
    } catch (error) {
      if (requestId === t.teacherDetailRequestId) {
        teacherItem.detailDuties = [];
        renderTeacherStudentArea(error.message);
        setStatus(error.message, 'err');
      }
    } finally {
      if (requestId === t.teacherDetailRequestId) {
        t.loadingDuties = false;
        renderTeacherDuties();
      }
    }
  }

  // 某些 client/student/page 版本会忽略多班级筛选字段，或只返回第一页。
  // 发生这种情况时扫描分页后再按教师详情中的 classIds 过滤，避免把无关学生展示出来，
  // 也避免跨页的相关学生被漏掉。
  async function fetchAllTeacherStudentPages(payload, requestId, detailRequestId) {
    const records = [];
    const seen = new Set();
    const size = 100;
    const maxPages = 50;
    let current = 1;
    let reportedTotal = 0;
    while (current <= maxPages) {
      if (requestId !== state.teacher.studentRequestId || detailRequestId !== state.teacher.teacherDetailRequestId) {
        return { stale: true, records: [] };
      }
      const response = await request('FETCH_STUDENTS', Object.assign({}, payload, {
        current,
        size,
        clazzId: '',
        clazzIds: [],
      }));
      const page = pageFrom(response);
      const normalized = (page.records || []).map(tenant.normalizeStudent);
      const pageKey = normalized.map((item) => item.id || [item.tenantId, item.code, item.name, item.classId].join('|')).join('¦');
      if (current > 1 && pageKey && seen.has(pageKey)) break;
      if (pageKey) seen.add(pageKey);
      records.push(...normalized);
      const rawPayload = response?.data ?? response?.result ?? response;
      const rawTotal = Number(rawPayload?.total);
      reportedTotal = Number.isFinite(rawTotal) && rawTotal >= 0 ? rawTotal : reportedTotal;
      const pageSize = Number(rawPayload?.size) || Number(page.size) || size;
      if (!normalized.length || (reportedTotal > 0 && records.length >= reportedTotal) ||
          (!reportedTotal && normalized.length < pageSize)) break;
      current += 1;
    }
    const deduped = new Map();
    records.forEach((item) => {
      const key = item.id || [item.tenantId, item.code, item.name, item.classId].join('|');
      if (!deduped.has(key)) deduped.set(key, item);
    });
    return { stale: false, records: [...deduped.values()] };
  }

  function renderTeacherDuties() {
    const el = $('teacherDuties');
    const t = state.teacher;
    if (!el || !t.selectedTeacher) return;
    const duties = t.selectedTeacher.detailDuties || [];
    if (t.loadingDuties) {
      el.textContent = '正在读取教学班级…';
      el.classList.remove('hidden');
      return;
    }
    if (!duties.length) {
      el.textContent = '';
      el.classList.add('hidden');
      return;
    }
    el.innerHTML = duties.map((item) => '<span class="teacher-badge teach">' + escapeHtml(item) + '</span>').join('');
    el.classList.remove('hidden');
  }

  async function loadTeacherStudents(reset, detailRequestId) {
    if (state.mode !== 'teacher') return;
    const t = state.teacher;
    if (!t.selectedUser || !t.selectedTeacher || !t.classIds.length) return;
    if (reset) t.studentPage = resetPage();
    const requestId = ++t.studentRequestId;
    t.loadingStudents = true;
    renderTeacherStudentArea('加载相关学生中...');
    const classIds = new Set(t.classIds.map((id) => String(id)));
    const isRelated = (student) => {
      const raw = student.raw && typeof student.raw === 'object' ? student.raw : {};
      const values = [student.classId, raw.classId, raw.clazzId, raw.deptId, raw.schoolDeptId]
        .concat(Array.isArray(raw.classIds) ? raw.classIds : [])
        .concat(Array.isArray(raw.clazzIds) ? raw.clazzIds : [])
        .concat(Array.isArray(raw.deptIds) ? raw.deptIds : [])
        .map((id) => String(id || ''));
      return values.some((id) => id && classIds.has(id));
    };
    const requestPayload = {
      origin: t.selectedUser.origin,
      aiToken: t.selectedUser.aiToken,
      current: t.studentPage.current,
      size: t.studentPage.size,
      name: t.studentNameKeyword,
      code: t.studentCodeKeyword,
      clazzId: t.classIds.length === 1 ? t.classIds[0] : '',
      clazzIds: t.classIds.length > 1 ? t.classIds : [],
    };
    try {
      let response;
      let usedFallback = false;
      try {
        response = await request('FETCH_STUDENTS', requestPayload);
      } catch (_) {
        // 兼容旧版 client/student/page 不接受多班级筛选字段；后面会扫描分页并严格过滤。
        usedFallback = true;
      }
      if (requestId !== t.studentRequestId || detailRequestId !== t.teacherDetailRequestId) return;
      let page = response ? pageFrom(response) : { records: [], total: 0 };
      let normalized = (page.records || []).map(tenant.normalizeStudent);
      const hasClassInfo = normalized.some((student) => {
        const raw = student.raw && typeof student.raw === 'object' ? student.raw : {};
        return [student.classId, raw.classId, raw.clazzId, raw.deptId, raw.schoolDeptId]
          .concat(Array.isArray(raw.classIds) ? raw.classIds : [])
          .concat(Array.isArray(raw.clazzIds) ? raw.clazzIds : [])
          .concat(Array.isArray(raw.deptIds) ? raw.deptIds : [])
          .some((id) => String(id || ''));
      });
      const related = normalized.filter(isRelated);
      // 筛选被忽略、返回空页或缺少班级字段时，扫描完整分页再过滤。
      const needsFullScan = Boolean(t.classIds.length) && (
        usedFallback || !normalized.length || !hasClassInfo || related.length !== normalized.length
      );
      let scannedAll = false;
      if (needsFullScan) {
        const scanned = await fetchAllTeacherStudentPages(requestPayload, requestId, detailRequestId);
        if (scanned.stale) return;
        normalized = scanned.records;
        scannedAll = true;
      }
      const filtered = normalized.filter(isRelated);
      if (scannedAll) {
        const start = Math.max(0, (Number(t.studentPage.current) - 1) * t.studentPage.size);
        t.studentPage.total = filtered.length;
        t.studentPage.records = filtered.slice(start, start + t.studentPage.size);
      } else {
        t.studentPage.total = page.total || filtered.length;
        t.studentPage.records = filtered;
      }
      renderTeacherStudents();
    } catch (error) {
      if (requestId === t.studentRequestId) {
        t.studentPage.records = [];
        t.studentPage.total = 0;
        renderTeacherStudentArea(error.message);
      }
      if (requestId === t.studentRequestId) setStatus(error.message, 'err');
    } finally {
      if (requestId === t.studentRequestId) t.loadingStudents = false;
    }
  }

  function renderTeacherStudentArea(message) {
    const section = $('studentSection');
    const list = $('studentList');
    const empty = $('studentEmpty');
    if (!section || !empty) return;
    if (!state.teacher.selectedTeacher) {
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    $('studentSectionTitle').textContent = (state.teacher.selectedTeacher.name || '') + ' 的相关学生';
    if (message) {
      if (list) {
        list.innerHTML = '';
        list.classList.add('hidden');
      }
      empty.textContent = message;
      empty.classList.remove('hidden');
    }
  }

  function renderTeacherStudents() {
    const t = state.teacher;
    const list = $('studentList');
    const empty = $('studentEmpty');
    if (!list || !empty) return;
    list.innerHTML = '';
    if (!t.studentPage.records.length) {
      list.classList.add('hidden');
      empty.textContent = '暂无相关学生';
      empty.classList.remove('hidden');
      const pager = $('studentPager');
      if (pager) pager.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    t.studentPage.records.forEach((student) => {
      const row = document.createElement('div');
      row.className = 'student-item fade-in';
      const status = student.statusText
        ? '<span class="student-item-badge ' + (student.statusOn === true ? 'status-on' : 'status-off') + '">' + escapeHtml(student.statusText) + '</span>'
        : '';
      row.innerHTML = '<div class="student-item-info"><div class="student-item-name">' +
        escapeHtml(student.name || '(未命名)') + '</div><div class="student-item-meta">' +
        (student.code ? '<span>学号: ' + escapeHtml(student.code) + '</span>' : '') +
        (student.className ? '<span>班级: ' + escapeHtml(student.className) + '</span>' : '') +
        '</div></div>' + status;
      list.appendChild(row);
    });
    buildPagerUI($('studentPager'), t.studentPage, (page) => {
      t.studentPage.current = page;
      loadTeacherStudents(false, t.teacherDetailRequestId);
    });
  }

  function renderTeacherShell() {
    const t = state.teacher;
    const userEmpty = $('userEmpty');
    const teacherEmpty = $('teacherEmpty');
    if (userEmpty && !t.selectedTenant) {
      userEmpty.textContent = '先选择租户';
      userEmpty.classList.remove('hidden');
    }
    if (teacherEmpty && !t.selectedUser) {
      teacherEmpty.textContent = '选择租户用户后加载教师';
      teacherEmpty.classList.remove('hidden');
    }
    renderTeacherUsers();
    renderTeachers();
    renderTeacherDuties();
    if (!t.selectedTeacher) {
      const section = $('studentSection');
      if (section) section.classList.add('hidden');
    }
  }

  // ── 学生查教师 ──

  async function loadAccountUsers() {
    if (state.mode !== 'student') return;
    const s = state.student;
    const keyword = s.keyword.trim();
    if (!keyword) {
      // 空条件也要使在途请求失效，避免清空输入后旧响应把结果重新画回来。
      s.accountRequestId += 1;
      s.loadingAccounts = false;
      clearList('accountList', 'accountEmpty', '请输入学生姓名、账号或租户');
      s.accountPage = resetPage();
      return;
    }
    const requestId = ++s.accountRequestId;
    s.loadingAccounts = true;
    clearList('accountList', 'accountEmpty', '搜索学生账号中…');
    try {
      if (!(await hasAdminToken())) throw new Error('请先在「后台账号」获取后台 Token');
      const payload = { current: s.accountPage.current, size: s.accountPage.size, accountType: 1 };
      payload[s.field] = keyword;
      const response = await request('FETCH_ACCOUNT_USERS', payload);
      if (requestId !== s.accountRequestId) return;
      const page = pageFrom(response);
      s.accountPage.total = page.total || 0;
      s.accountPage.records = (page.records || []).map(tenant.normalizeAccount).filter((item) => {
        const typeText = String(item.type || '').toLowerCase();
        const explicitTypes = [item.accountType, item.type].filter(Boolean);
        if (explicitTypes.some((value) => value === '0' || value === '4')) return false;
        return !explicitTypes.length || explicitTypes.some((value) => value === '1') || /学生|student/i.test(typeText);
      });
      renderAccountUsers();
    } catch (error) {
      if (requestId === s.accountRequestId) {
        s.accountPage.records = [];
        s.accountPage.total = 0;
        clearList('accountList', 'accountEmpty', error.message);
      }
      if (requestId === s.accountRequestId) setStatus(error.message, 'err');
    } finally {
      if (requestId === s.accountRequestId) s.loadingAccounts = false;
    }
  }

  function renderAccountUsers() {
    const s = state.student;
    const list = $('accountList');
    const empty = $('accountEmpty');
    if (!list || !empty) return;
    list.innerHTML = '';
    if (!s.accountPage.records.length) {
      list.classList.add('hidden');
      empty.textContent = '未找到学生账号';
      empty.classList.remove('hidden');
      const pager = $('accountPager');
      if (pager) pager.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    s.accountPage.records.forEach((account) => {
      const row = document.createElement('div');
      row.className = 'list-item fade-in' + (s.selectedAccount?.id === account.id ? ' active' : '');
      const typeText = account.type === '1' || account.accountType === '1' || /学生|student/i.test(String(account.type || '')) ? '学生' : '账号';
      row.innerHTML = '<div class="list-item-content"><div class="list-item-title">' +
        escapeHtml(account.username || '(未命名)') + '<span class="list-item-role">' + typeText + '</span></div>' +
        '<div class="list-item-meta">' + escapeHtml(account.account || '无账号') + ' · ' +
        escapeHtml(account.tenantName || account.tenantId || '未知租户') + '</div></div>' +
        actionButtons({
          id: account.loginId,
          tenantId: account.tenantId,
          tenantName: account.tenantName,
          domain: account.domain,
          industry: account.industry,
          userName: account.username,
          role: 'student',
        }, !account.loginId || !account.tenantId);
      row.addEventListener('click', (event) => {
        if (!event.target.closest('.action-btn')) selectStudentAccount(account, row);
      });
      list.appendChild(row);
    });
    buildPagerUI($('accountPager'), s.accountPage, (page) => {
      s.accountPage.current = page;
      loadAccountUsers();
    });
  }

  async function selectStudentAccount(account, row) {
    const s = state.student;
    if (s.loadingSession || !account.loginId || !account.tenantId) return;
    if (s.selectedAccount?.id === account.id && s.selectedAccount?.session) {
      clearStudentSession(false);
      renderStudentShell();
      return;
    }
    clearStudentSession();
    const requestId = ++s.sessionRequestId;
    s.loadingSession = true;
    s.selectedAccount = account;
    renderAccountUsers();
    try {
      const result = await request('RESOLVE_USER_SESSION', {
        tenantId: account.tenantId,
        id: account.loginId,
        industry: account.industry,
      });
      if (requestId !== s.sessionRequestId) return;
      s.selectedAccount = Object.assign({}, account, {
        session: {
          origin: result.origin,
          aiToken: result.aiToken,
          env: state.env,
        },
      });
      await loadStudentRelationData();
    } catch (error) {
      if (requestId === s.sessionRequestId) {
        s.relationError = error.message;
        renderStudentShell();
        setStatus(error.message, 'err');
      }
    } finally {
      if (requestId === s.sessionRequestId) {
        s.loadingSession = false;
        renderStudentShell();
      }
    }
  }

  function getStudentSession() {
    return state.student.selectedAccount?.session || null;
  }

  function clearRelationTeacherResult(message) {
    const head = $('lookupTeacherResultHead');
    const title = $('lookupTeacherResultTitle');
    const count = $('lookupTeacherResultCount');
    const list = $('lookupTeacherList');
    const empty = $('lookupTeacherEmpty');
    if (head) head.classList.add('hidden');
    if (title) title.textContent = '';
    if (count) count.textContent = '';
    if (list) {
      list.innerHTML = '';
      list.classList.add('hidden');
    }
    if (empty) {
      empty.textContent = message || '请选择学生或班级';
      empty.classList.remove('hidden');
    }
  }

  function renderRelationSemesters() {
    const select = $('teacherLookupSemesterSelect');
    if (!select) return;
    select.innerHTML = '<option value="">选择学期</option>';
    state.student.semesters.forEach((semester) => {
      const option = document.createElement('option');
      option.value = semester.id;
      option.textContent = semester.label || semester.id;
      select.appendChild(option);
    });
    select.value = state.student.semesterId || '';
    select.disabled = state.student.relationLoading || !state.student.semesters.length;
  }

  function renderRelationClasses() {
    const select = $('lookupClassSelect');
    if (!select) return;
    select.innerHTML = '<option value="">选择班级</option>';
    state.student.classes.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.label || item.name || item.id;
      select.appendChild(option);
    });
    select.value = state.student.selectedClassId || '';
  }

  function renderMatchedStudents() {
    const s = state.student;
    const list = $('lookupStudentList');
    const empty = $('lookupStudentEmpty');
    const pager = $('lookupStudentPager');
    if (!list || !empty || !pager) return;
    list.innerHTML = '';
    pager.classList.add('hidden');
    if (!s.matchedStudents.length) {
      list.classList.add('hidden');
      empty.textContent = s.relationLoading ? '正在匹配 AI 学生…' : (s.relationError || '未找到严格匹配的 AI 学生');
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    s.matchedStudents.forEach((student) => {
      const matchedClass = tenant.findStudentClass(student, s.classes);
      const row = document.createElement('div');
      row.className = 'student-item lookup-student-item fade-in' +
        (s.selectedStudent?.id === student.id ? ' selected' : '');
      row.innerHTML = '<div class="student-item-info"><div class="student-item-name">' +
        escapeHtml(student.name || '(未命名)') + '</div><div class="student-item-meta">' +
        (student.code ? '<span>学号: ' + escapeHtml(student.code) + '</span>' : '') +
        (student.account ? '<span>账号: ' + escapeHtml(student.account) + '</span>' : '') +
        '<span>' + escapeHtml(matchedClass?.label || student.className || '班级未识别') + '</span>' +
        '</div></div>';
      row.addEventListener('click', () => selectMatchedStudent(student));
      list.appendChild(row);
    });
  }

  function renderStudentRelationShell() {
    const s = state.student;
    const panel = $('studentRelationPanel');
    if (!panel) return;
    const ready = Boolean(s.selectedAccount?.session);
    panel.classList.toggle('hidden', !ready);
    const byStudent = $('lookupByStudentBtn');
    const byClass = $('lookupByClassBtn');
    byStudent?.classList.toggle('active', s.relationMode === 'student');
    byClass?.classList.toggle('active', s.relationMode === 'class');
    byStudent?.setAttribute('aria-pressed', String(s.relationMode === 'student'));
    byClass?.setAttribute('aria-pressed', String(s.relationMode === 'class'));
    $('lookupStudentPanel')?.classList.toggle('hidden', s.relationMode !== 'student');
    $('lookupClassPanel')?.classList.toggle('hidden', s.relationMode !== 'class');
    const note = $('studentSessionNote');
    if (note) {
      if (!ready) note.textContent = '';
      else if (s.relationLoading) note.textContent = '正在读取该学生所在租户的学期、班级与教师关系…';
      else if (s.relationError) note.textContent = s.relationError;
      else note.textContent = s.matchedBy ? '已按' + (s.matchedBy === 'account' ? '账号' : '姓名') + '严格匹配 AI 学生，请选择后查看班级教师。' : '';
    }
    renderRelationSemesters();
    renderRelationClasses();
    renderMatchedStudents();
  }

  function renderStudentShell() {
    renderAccountUsers();
    renderStudentRelationShell();
    if (state.student.selectedClassId) renderRelationTeachers(state.student.selectedClassId);
    else if (!state.student.selectedStudent) clearRelationTeacherResult('请选择学生或班级');
  }

  async function fetchStudentPageAll(session, query, requestId) {
    const records = [];
    let current = 1;
    let total = 0;
    const size = 100;
    const maxPages = 50;
    do {
      if (requestId !== state.student.relationRequestId) return records;
      const response = await request('FETCH_STUDENTS', Object.assign({
        origin: session.origin,
        aiToken: session.aiToken,
        current,
        size,
      }, query || {}));
      const page = pageFrom(response);
      const pageRecords = (page.records || []).map(tenant.normalizeStudent);
      records.push(...pageRecords);
      const rawPayload = response?.data ?? response?.result ?? response;
      const reportedTotal = Number(rawPayload?.total);
      const pageSize = Number(rawPayload?.size) || Number(page.size) || size;
      total = Number.isFinite(reportedTotal) && reportedTotal >= 0 ? reportedTotal : 0;
      const noMoreByTotal = total > 0 && records.length >= total;
      const noMoreByPage = !total && pageRecords.length < pageSize;
      if (!pageRecords.length || noMoreByTotal || noMoreByPage || current >= maxPages) break;
      current += 1;
    } while (true);
    return records;
  }

  async function fetchStudentCandidates(account, session, requestId) {
    const queries = [];
    if (account.account) queries.push({ account: account.account });
    if (account.username) queries.push({ name: account.username });
    const collected = new Map();
    for (const query of queries) {
      if (requestId !== state.student.relationRequestId) return { matches: [], matchedBy: '' };
      let records;
      try {
        // 不同 AI 平台版本对 account/code 等可选筛选字段支持不一致；
        // 单个精确筛选被拒绝时继续尝试其它字段，最后仍会做一次无筛选扫描。
        records = await fetchStudentPageAll(session, query, requestId);
      } catch (error) {
        continue;
      }
      if (requestId !== state.student.relationRequestId) return { matches: [], matchedBy: '' };
      records.forEach((item) => {
        const key = item.id || [item.tenantId, item.code, item.name, item.classId].join('|');
        if (!collected.has(key)) collected.set(key, item);
      });
    }
    let candidates = tenant.matchStudentCandidates(account, [...collected.values()]);
    if (candidates.matches.length) return candidates;

    // 某些版本的 client/student/page 不支持 name/account 参数；仅在精确筛选无结果时扫描分页。
    if (requestId !== state.student.relationRequestId) return { matches: [], matchedBy: '' };
    let fallback;
    try {
      fallback = await fetchStudentPageAll(session, {}, requestId);
    } catch (error) {
      // 全量扫描失败时抛出实际错误，供 UI 展示。
      throw error;
    }
    fallback.forEach((item) => {
      const key = item.id || [item.tenantId, item.code, item.name, item.classId].join('|');
      if (!collected.has(key)) collected.set(key, item);
    });
    candidates = tenant.matchStudentCandidates(account, [...collected.values()]);
    return candidates;
  }

  async function loadStudentRelationData() {
    if (state.mode !== 'student') return;
    const s = state.student;
    const account = s.selectedAccount;
    const session = getStudentSession();
    if (!account || !session?.origin || !session?.aiToken) return;
    const preferredSemesterId = s.semesterId;
    const requestId = ++s.relationRequestId;
    s.relationLoading = true;
    s.relationError = '';
    s.semesters = [];
    s.semesterId = preferredSemesterId;
    s.classes = [];
    s.classTeacherMap = {};
    s.matchedStudents = [];
    s.matchedBy = '';
    s.selectedStudent = null;
    s.selectedClassId = '';
    clearRelationTeacherResult('正在加载班级与教师关系…');
    renderStudentRelationShell();
    try {
      const semesterResponse = await request('FETCH_SEMESTERS', {
        origin: session.origin,
        aiToken: session.aiToken,
        current: 1,
        size: 999,
      });
      if (requestId !== s.relationRequestId) return;
      const semesters = (pageFrom(semesterResponse).records || [])
        .map(tenant.normalizeSemester)
        .filter((item) => item.id);
      if (!semesters.length) throw new Error('该 AI 平台暂无学期数据');
      s.semesters = semesters;
      s.semesterId = tenant.resolveSemesterId(semesters, preferredSemesterId);

      const [treeResponse, teacherResponse] = await Promise.all([
        request('FETCH_SCHOOL_DEPT_TREE', {
          origin: session.origin,
          aiToken: session.aiToken,
          semesterId: s.semesterId,
        }),
        request('FETCH_CLASS_TEACHERS', {
          origin: session.origin,
          aiToken: session.aiToken,
          semesterId: s.semesterId,
        }),
      ]);
      if (requestId !== s.relationRequestId) return;
      s.classes = tenant.extractClassOptions(treeResponse);
      s.classTeacherMap = tenant.buildClassTeacherMap(teacherResponse);
      if (!s.classes.length) throw new Error('该学期暂无班级数据');
      const candidates = await fetchStudentCandidates(account, session, requestId);
      if (requestId !== s.relationRequestId) return;
      s.matchedStudents = candidates.matches || [];
      s.matchedBy = candidates.matchedBy || '';
      if (!s.matchedStudents.length) s.relationError = '未找到严格匹配的 AI 学生，请检查账号/姓名或租户';
      renderStudentShell();
    } catch (error) {
      if (requestId !== s.relationRequestId) return;
      s.relationError = error.message;
      clearRelationTeacherResult(error.message);
      renderStudentRelationShell();
      setStatus(error.message, 'err');
    } finally {
      if (requestId === s.relationRequestId) {
        s.relationLoading = false;
        renderStudentRelationShell();
      }
    }
  }

  function selectMatchedStudent(student) {
    const s = state.student;
    s.selectedStudent = student;
    const matchedClass = tenant.findStudentClass(student, s.classes);
    s.selectedClassId = matchedClass?.id || '';
    renderMatchedStudents();
    if (!matchedClass) {
      clearRelationTeacherResult((student.name || '该学生') + '的班级无法唯一识别');
      renderRelationClasses();
      return;
    }
    renderRelationTeachers(matchedClass.id);
  }

  function switchRelationMode(mode) {
    const s = state.student;
    s.relationMode = mode === 'class' ? 'class' : 'student';
    if (s.relationMode === 'class') {
      s.selectedStudent = null;
      s.selectedClassId = '';
      clearRelationTeacherResult('请选择班级');
    } else {
      s.selectedClassId = s.selectedStudent ? (tenant.findStudentClass(s.selectedStudent, s.classes)?.id || '') : '';
      clearRelationTeacherResult('请选择学生');
    }
    renderStudentRelationShell();
    if (s.selectedClassId) renderRelationTeachers(s.selectedClassId);
  }

  async function loadRegularAccounts(tenantId, tenantName, requestId) {
    const key = String(tenantId || '');
    if (!key) return [];
    if (Array.isArray(state.student.regularAccountsByTenant[key])) return state.student.regularAccountsByTenant[key];
    if (!(await hasAdminToken())) throw new Error('请先在「后台账号」获取后台 Token');
    const records = [];
    let current = 1;
    const size = 100;
    const maxPages = 50;
    const seenPages = new Set();
    while (current <= maxPages) {
      if (requestId != null && requestId !== state.student.relationRequestId) return [];
      const response = await request('FETCH_ACCOUNT_USERS', {
        current,
        size,
        tenantName: tenantName || '',
        accountType: 0,
      });
      const page = pageFrom(response);
      const rows = (page.records || []).map(tenant.normalizeAccount);
      const pageKey = rows.map((item) => item.loginId || [item.tenantId, item.account, item.username].join('|')).join('¦');
      if (current > 1 && pageKey && seenPages.has(pageKey)) break;
      if (pageKey) seenPages.add(pageKey);
      records.push(...rows.filter((item) => {
        const typeText = String(item.type || '').toLowerCase();
        const explicitTypes = [item.accountType, item.type].filter(Boolean);
        const regular = !explicitTypes.some((value) => value === '1' || value === '4') &&
          (explicitTypes.some((value) => value === '0') || !/(学生|校外|outside|student)/i.test(typeText));
        return regular && String(item.tenantId || '') === key;
      }));
      const rawPayload = response?.data ?? response?.result ?? response;
      const reportedTotal = Number(rawPayload?.total);
      const pageSize = Number(rawPayload?.size) || Number(page.size) || size;
      // 某些版本会在返回记录时把 total 填成 0；此时不能把第一页误判为全量。
      const hasTotal = Number.isFinite(reportedTotal) && reportedTotal > 0;
      if (!rows.length || (hasTotal ? current * pageSize >= reportedTotal : rows.length < pageSize) || current >= maxPages) break;
      current += 1;
    }
    const deduped = new Map();
    records.forEach((item) => {
      const recordKey = item.loginId || [item.tenantId, item.account, item.username].join('|');
      if (!deduped.has(recordKey)) deduped.set(recordKey, item);
    });
    const result = [...deduped.values()];
    state.student.regularAccountsByTenant[key] = result;
    return result;
  }

  function relationCacheKey(relation, tenantId) {
    return [tenantId, relation?.tmbId, relation?.userId, relation?.name, relation?.account].map((v) => String(v || '')).join('|');
  }

  function resolveRelationAccount(relation, accounts, tenantId) {
    const exact = (value, field) => value && accounts.find((item) => String(item[field] || '') === String(value));
    // 关系接口通常给 tmbId/userId；兼容少数版本把关系里的 id 直接返回为账号分页主键。
    const byTmb = relation.tmbId && accounts.find((item) =>
      String(item.tmbId || '') === String(relation.tmbId) || String(item.loginId || '') === String(relation.tmbId));
    const byUser = exact(relation.userId, 'userId');
    const byRelationId = exact(relation.id, 'loginId');
    const byAccount = relation.account && accounts.find((item) =>
      String(item.account || '') === String(relation.account) || String(item.phone || '') === String(relation.account));
    const name = String(relation.name || '').trim();
    const byName = name ? accounts.filter((item) => String(item.username || '').trim() === name) : [];
    return byTmb || byUser || byRelationId || byAccount || (byName.length === 1 ? byName[0] : null);
  }

  async function resolveRelationTeachers(teachers, account, session, requestId) {
    const accounts = await loadRegularAccounts(account.tenantId, account.tenantName, requestId);
    if (requestId !== state.student.relationRequestId) return [];
    return teachers.map((relation) => {
      const cacheKey = relationCacheKey(relation, account.tenantId);
      const cached = state.student.relationTeacherCache[cacheKey];
      const matched = cached || resolveRelationAccount(relation, accounts, account.tenantId);
      const result = Object.assign({}, relation, {
        loginId: matched?.loginId || '',
        loginName: matched?.username || relation.name || '',
        loginAccount: matched?.account || relation.account || '',
        tenantId: account.tenantId,
        tenantName: account.tenantName,
        domain: session.origin,
        industry: account.industry,
      });
      state.student.relationTeacherCache[cacheKey] = result.loginId ? result : null;
      return result;
    });
  }

  async function renderRelationTeachers(classId) {
    if (state.mode !== 'student') return;
    const s = state.student;
    const cls = s.classes.find((item) => String(item.id) === String(classId));
    if (!cls) {
      clearRelationTeacherResult('未找到对应班级');
      return;
    }
    const rawTeachers = s.classTeacherMap[String(classId)] || [];
    const relationRequestId = s.relationRequestId;
    const head = $('lookupTeacherResultHead');
    const title = $('lookupTeacherResultTitle');
    const count = $('lookupTeacherResultCount');
    const list = $('lookupTeacherList');
    const empty = $('lookupTeacherEmpty');
    if (!head || !title || !count || !list || !empty) return;
    head.classList.remove('hidden');
    title.textContent = (s.selectedStudent?.name ? s.selectedStudent.name + ' · ' : '') + (cls.label || cls.name || cls.id);
    count.textContent = rawTeachers.length + ' 位教师';
    list.innerHTML = '';
    if (!rawTeachers.length) {
      list.classList.add('hidden');
      empty.textContent = '该班级暂无关联教师';
      empty.classList.remove('hidden');
      return;
    }
    list.classList.remove('hidden');
    empty.classList.add('hidden');
    s.resolvingTeachers = true;
    list.innerHTML = '<div class="list-empty">正在反查教师租户账号…</div>';

    // 无论后台账号反查是否成功，都保留 AI 平台返回的关系记录。反查失败时
    // 只禁用登录相关操作，避免用户误以为班级没有教师或丢失关系上下文。
    const renderRows = (teachers, note) => {
      list.innerHTML = '';
      teachers.forEach((teacherItem) => {
        const row = document.createElement('div');
        row.className = 'list-item lookup-teacher-item fade-in' + (!teacherItem.loginId ? ' relation-disabled' : '');
        const duties = teacherItem.duties?.length
          ? '<div class="lookup-teacher-duties">' + teacherItem.duties.map((duty) => '<span class="teacher-badge teach">' + escapeHtml(duty) + '</span>').join('') + '</div>'
          : '';
        const accountText = teacherItem.loginAccount || teacherItem.account || teacherItem.userId || '未解析后台账号';
        const unresolvedText = !teacherItem.loginId ? ' · 关系字段未反查到后台账号' : '';
        row.innerHTML = '<div class="list-item-content"><div class="list-item-title">' +
          escapeHtml(teacherItem.loginName || teacherItem.name || '(未命名)') + '</div><div class="list-item-meta">' +
          escapeHtml(accountText) + unresolvedText + (note ? ' · ' + escapeHtml(note) : '') + '</div>' + duties + '</div>' +
          actionButtons({
            id: teacherItem.loginId,
            tenantId: teacherItem.tenantId,
            tenantName: teacherItem.tenantName,
            domain: teacherItem.domain,
            industry: teacherItem.industry,
            userName: teacherItem.loginName || teacherItem.name,
            role: 'teacher',
          }, !teacherItem.loginId);
        list.appendChild(row);
      });
      if (!teachers.length) {
        list.classList.add('hidden');
        empty.textContent = '该班级暂无关联教师';
        empty.classList.remove('hidden');
      } else {
        list.classList.remove('hidden');
        empty.classList.add('hidden');
      }
    };
    try {
      const resolved = await resolveRelationTeachers(rawTeachers, s.selectedAccount, getStudentSession(), s.relationRequestId);
      if (relationRequestId !== s.relationRequestId || s.selectedClassId !== String(classId)) return;
      renderRows(resolved, '');
    } catch (error) {
      if (relationRequestId !== s.relationRequestId || s.selectedClassId !== String(classId)) return;
      const message = error?.message || '后台账号反查失败';
      const unresolved = rawTeachers.map((relation) => Object.assign({}, relation, {
        loginId: '',
        loginName: relation.name || relation.username || relation.account || relation.userId || '未命名教师',
        loginAccount: relation.account || relation.userId || relation.tmbId || '',
        tenantId: s.selectedAccount?.tenantId || '',
        tenantName: s.selectedAccount?.tenantName || '',
        domain: getStudentSession()?.origin || '',
        industry: s.selectedAccount?.industry || '',
      }));
      renderRows(unresolved, message);
      setStatus(message, 'err');
    } finally {
      if (relationRequestId === s.relationRequestId) s.resolvingTeachers = false;
    }
  }

  async function refreshStudentRelation() {
    if (!getStudentSession()) {
      setStatus('请先选择学生账号', 'err');
      return;
    }
    const s = state.student;
    delete s.regularAccountsByTenant[String(s.selectedAccount?.tenantId || '')];
    s.relationTeacherCache = {};
    await loadStudentRelationData();
  }

  function resetStudentSelectionForSearch() {
    // 字段/关键词变化时，无论是否已经选中账号，都要使旧的后台分页请求失效。
    // 否则慢响应可能覆盖新的姓名/账号/租户筛选结果。
    const s = state.student;
    s.accountRequestId += 1;
    s.loadingAccounts = false;
    s.accountPage = resetPage();
    if (s.selectedAccount) {
      clearStudentSession(false);
      renderStudentShell();
    }
    clearList('accountList', 'accountEmpty', '请输入学生姓名、账号或租户');
    const pager = $('accountPager');
    if (pager) {
      pager.innerHTML = '';
      pager.classList.add('hidden');
    }
  }

  // ── 登录操作与最近记录 ──

  function actionMeta(button) {
    const currentPort = targetEnv() === 'local'
      ? normalizePort($('localPort')?.value || state.devPort)
      : '';
    if (targetEnv() === 'local') state.devPort = currentPort;
    return {
      id: button.dataset.id || '',
      tenantId: button.dataset.tenantId || '',
      tenantName: button.dataset.tenantName || '',
      domain: button.dataset.domain || '',
      industry: button.dataset.industry || '',
      userName: button.dataset.userName || '',
      role: button.dataset.role || 'teacher',
      env: button.dataset.env || targetEnv(),
      localPort: button.dataset.localPort || currentPort,
    };
  }

  async function performLoginAction(meta, action, button, row) {
    if (!meta.id || !meta.tenantId || state.loadingLogin) return;
    const group = row ? row.querySelectorAll('.action-btn,.recent-action-btn') : [button];
    const original = button?.innerHTML || '';
    state.loadingLogin = true;
    group.forEach((item) => { item.disabled = true; });
    if (button) button.innerHTML = '<span class="spinner"></span>';
    try {
      const env = meta.env === 'local' ? 'local' : 'online';
      const localPort = env === 'local' ? normalizePort(meta.localPort) : '';
      let url;
      if (action === 'copy') {
        const result = await request('RESOLVE_USER_SESSION', {
          tenantId: meta.tenantId,
          id: meta.id,
          industry: meta.industry,
        });
        url = result.url;
        const query = extractTokenQuery(url);
        if (!query) throw new Error('URL 中未找到 token query');
        const copied = await copyToClipboard(query);
        setStatus(copied ? '已复制 ?token=…' : '复制失败，请检查浏览器剪贴板权限', copied ? 'ok' : 'err');
        return;
      }
      const result = await request('QUICK_LOGIN', Object.assign({}, meta, { env, localPort }));
      url = result.url;
      if (!url || typeof url !== 'string') throw new Error('virtualLogin 未返回有效 URL');
      let target = url;
      if (action === 'student') target = buildEvaluateUrl(url, '/student-evaluate', localPort);
      else if (action === 'teacher') target = buildEvaluateUrl(url, '/teacher-evaluate', localPort);
      else target = buildDirectUrl(url, localPort);
      await request('OPEN_LOGIN_URL', { url: target });
      setStatus(action === 'open' ? '已打开 AI 平台' : '已打开评价页面', 'ok');
      await renderRecent();
    } catch (error) {
      setStatus(error.message, 'err');
    } finally {
      state.loadingLogin = false;
      group.forEach((item) => { item.disabled = false; });
      if (button) button.innerHTML = original;
    }
  }

  function onActionClick(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;
    performLoginAction(actionMeta(button), button.dataset.action, button, button.closest('.list-item'));
  }

  async function renderRecent() {
    const list = $('recentList');
    if (!list) return;
    let records = [];
    try {
      const response = await request('GET_QUICK_LOGIN_RECENT');
      records = Array.isArray(response.records) ? response.records : (Array.isArray(response) ? response : []);
    } catch (_) {}
    list.innerHTML = '';
    if (!records.length) {
      list.innerHTML = '<div class="recent-empty">暂无最近登录记录</div>';
      return;
    }
    records = records.slice(0, 10);
    const shown = state.recentExpanded ? records : records.slice(0, 5);
    shown.forEach((record) => {
      const env = normalizeEnv(record.env);
      const localPort = env === 'local' ? normalizePort(record.localPort) : '';
      const row = document.createElement('div');
      row.className = 'recent-item fade-in';
      row.innerHTML = '<div class="recent-item-info"><div class="recent-item-text"><span class="recent-env-badge ' +
        (env === 'local' ? 'local' : 'online') + '">' + (env === 'local' ? '本地 :' + escapeHtml(localPort) : '线上') +
        '</span><span class="recent-role-badge">' + (record.role === 'student' ? '学生' : '教师') + '</span>' +
        escapeHtml(record.tenantName || '(未知租户)') + ' · ' + escapeHtml(record.userName || record.id) +
        '</div><div class="recent-item-time">' + escapeHtml(record.at ? new Date(record.at).toLocaleString() : '') + '</div></div>' +
        '<div class="recent-item-actions">' +
        recentActionButton('open', record, env, localPort, '打开 AI 平台') +
        recentActionButton('copy', record, env, localPort, '复制 AI 平台 Token query') +
        recentActionButton('student', record, env, localPort, '学生评价') +
        recentActionButton('teacher', record, env, localPort, '教师评价') +
        recentActionButton('delete', record, env, localPort, '删除记录', true) +
        '</div>';
      list.appendChild(row);
    });
    if (records.length > shown.length) {
      const more = document.createElement('button');
      more.className = 'load-more';
      more.textContent = state.recentExpanded ? '收起' : '显示更多 (' + (records.length - shown.length) + ' 条)';
      more.addEventListener('click', () => {
        state.recentExpanded = !state.recentExpanded;
        renderRecent();
      });
      list.appendChild(more);
    }
  }

  function recentActionButton(action, record, env, localPort, title, danger) {
    const attrs = [
      'data-action="' + action + '"',
      'data-id="' + escapeHtml(record.id || '') + '"',
      'data-tenant-id="' + escapeHtml(record.tenantId || '') + '"',
      'data-tenant-name="' + escapeHtml(record.tenantName || '') + '"',
      'data-domain="' + escapeHtml(record.domain || '') + '"',
      'data-industry="' + escapeHtml(record.industry || '') + '"',
      'data-user-name="' + escapeHtml(record.userName || '') + '"',
      'data-role="' + escapeHtml(record.role || 'teacher') + '"',
      'data-env="' + env + '"',
      'data-local-port="' + escapeHtml(localPort) + '"',
    ].join(' ');
    const disabled = !record.id || !record.tenantId ? ' disabled aria-disabled="true"' : '';
    return '<button class="recent-action-btn' + (danger ? ' danger' : '') + '" ' + attrs + disabled + ' title="' + escapeHtml(title) + '" aria-label="' + escapeHtml(title) + '">' + icons[action === 'delete' ? 'delete' : action] + '</button>';
  }

  async function onRecentClick(event) {
    const button = event.target.closest('.recent-action-btn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (state.loadingLogin || button.disabled) return;
    const meta = actionMeta(button);
    const action = button.dataset.action;
    if (action === 'delete') {
      try {
        await request('DELETE_QUICK_LOGIN_RECENT', {
          tenantId: meta.tenantId,
          id: meta.id,
          env: meta.env,
          localPort: meta.localPort,
          role: meta.role,
        });
        setStatus('已删除最近登录记录', 'ok');
        await renderRecent();
      } catch (error) {
        setStatus(error.message, 'err');
      }
      return;
    }
    state.env = meta.env === 'local' ? 'dev' : 'online';
    if (state.env === 'dev') state.devPort = normalizePort(meta.localPort);
    state.mode = meta.role === 'student' ? 'student' : 'teacher';
    clearAllSessions();
    updateEnvUI();
    updateModeUI();
    await performLoginAction(meta, action, button, button.closest('.recent-item'));
  }

  // ── 事件绑定 / 初始化 ──

  function bindEvents() {
    const header = $('quickLoginHeader');
    if (header) {
      header.addEventListener('click', () => {
        state.expanded = !state.expanded;
        $('quickLoginSection')?.classList.toggle('expanded', state.expanded);
      });
    }
    $('envOnlineBtn')?.addEventListener('click', () => switchEnv('online'));
    $('envDevBtn')?.addEventListener('click', () => switchEnv('dev'));
    $('modeTeacherBtn')?.addEventListener('click', () => switchMode('teacher'));
    $('modeStudentBtn')?.addEventListener('click', () => switchMode('student'));
    const port = $('localPort');
    port?.addEventListener('input', debounce(() => {
      const next = normalizePort(port.value);
      if (next !== state.devPort) {
        state.devPort = next;
        clearAllSessions();
      }
      port.value = state.devPort;
      updateEnvBadge();
    }, SEARCH_DEBOUNCE));

    const tenantSearch = $('tenantSearch');
    tenantSearch?.addEventListener('input', debounce(() => {
      if (state.mode !== 'teacher') return;
      if (state.teacher.selectedTenant) {
        state.teacher.selectedTenant = null;
        state.teacher.userPage = resetPage();
        clearTeacherSession();
        renderTeacherShell();
      }
      state.teacher.tenantKeyword = tenantSearch.value.trim();
      loadTenants();
    }, SEARCH_DEBOUNCE));
    const userSearch = $('userSearch');
    userSearch?.addEventListener('input', debounce(() => {
      if (state.mode !== 'teacher') return;
      if (state.teacher.selectedUser) {
        clearTeacherSession();
        renderTeacherShell();
      }
      state.teacher.userKeyword = userSearch.value.trim();
      loadTeacherUsers(true);
    }, SEARCH_DEBOUNCE));
    const teacherName = $('teacherNameSearch');
    teacherName?.addEventListener('input', debounce(() => {
      if (state.mode !== 'teacher') return;
      state.teacher.teacherNameKeyword = teacherName.value.trim();
      loadTeachers(true);
    }, SEARCH_DEBOUNCE));
    const teacherAccount = $('teacherAccountSearch');
    teacherAccount?.addEventListener('input', debounce(() => {
      if (state.mode !== 'teacher') return;
      state.teacher.teacherAccountKeyword = teacherAccount.value.trim();
      loadTeachers(true);
    }, SEARCH_DEBOUNCE));
    const studentName = $('studentNameSearch');
    studentName?.addEventListener('input', debounce(() => {
      if (state.mode !== 'teacher') return;
      state.teacher.studentNameKeyword = studentName.value.trim();
      loadTeacherStudents(true, state.teacher.teacherDetailRequestId);
    }, SEARCH_DEBOUNCE));
    const studentCode = $('studentCodeSearch');
    studentCode?.addEventListener('input', debounce(() => {
      if (state.mode !== 'teacher') return;
      state.teacher.studentCodeKeyword = studentCode.value.trim();
      loadTeacherStudents(true, state.teacher.teacherDetailRequestId);
    }, SEARCH_DEBOUNCE));
    $('teacherRefreshBtn')?.addEventListener('click', () => {
      if (state.mode === 'teacher') loadTeachers(true);
    });
    $('studentRefreshBtn')?.addEventListener('click', () => {
      if (state.mode === 'teacher') loadTeacherStudents(true, state.teacher.teacherDetailRequestId);
    });

    const field = $('accountSearchField');
    field?.addEventListener('change', () => {
      resetStudentSelectionForSearch();
      state.student.field = field.value;
      const input = $('accountSearch');
      if (input) input.placeholder = field.value === 'username' ? '输入学生姓名' : field.value === 'account' ? '输入学生账号' : '输入租户名称';
      state.student.keyword = '';
      if (input) input.value = '';
      clearList('accountList', 'accountEmpty', '请输入学生姓名、账号或租户');
    });
    const accountSearch = $('accountSearch');
    const scheduleAccountSearch = debounce(() => {
      if (state.mode !== 'student') return;
      state.student.keyword = accountSearch.value.trim();
      state.student.accountPage.current = 1;
      loadAccountUsers();
    }, SEARCH_DEBOUNCE);
    accountSearch?.addEventListener('input', () => {
      if (state.mode !== 'student') return;
      // 在等待防抖计时器期间也立即淘汰旧响应，避免旧关键词结果短暂覆盖新输入。
      resetStudentSelectionForSearch();
      state.student.keyword = accountSearch.value.trim();
      state.student.accountPage.current = 1;
      clearList('accountList', 'accountEmpty', state.student.keyword ? '等待搜索…' : '请输入学生姓名、账号或租户');
      scheduleAccountSearch();
    });
    $('studentRelationRefreshBtn')?.addEventListener('click', () => {
      if (state.mode === 'student') refreshStudentRelation();
    });
    $('lookupByStudentBtn')?.addEventListener('click', () => switchRelationMode('student'));
    $('lookupByClassBtn')?.addEventListener('click', () => switchRelationMode('class'));
    $('teacherLookupSemesterSelect')?.addEventListener('change', () => {
      const next = $('teacherLookupSemesterSelect').value;
      if (!next || next === state.student.semesterId) return;
      state.student.semesterId = next;
      loadStudentRelationData();
    });
    $('lookupClassSelect')?.addEventListener('change', (event) => {
      state.student.selectedStudent = null;
      state.student.selectedClassId = String(event.target.value || '');
      if (state.student.selectedClassId) renderRelationTeachers(state.student.selectedClassId);
      else clearRelationTeacherResult('请选择班级');
      renderRelationClasses();
    });
    $('userList')?.addEventListener('click', onActionClick);
    $('accountList')?.addEventListener('click', onActionClick);
    $('lookupTeacherList')?.addEventListener('click', onActionClick);
    $('recentList')?.addEventListener('click', onRecentClick);
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    renderShell();
    bindEvents();
    const section = $('quickLoginSection');
    state.expanded = true;
    section?.classList.add('expanded');
    updateEnvUI();
    updateModeUI();
    // 初始化只读取最近记录，不自动恢复账号、会话或发起业务接口请求。
    await renderRecent();
  }

  ns.quickLoginUi = { init };
})();
