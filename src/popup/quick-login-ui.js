/* 内部开发工具箱 — 师生关联查询 UI */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit;
  const tenant = ns.tenant;
  const messages = ns.messages;
  const DEFAULT_DEV_PORT = '8088';
  const SEARCH_DEBOUNCE = 300;
  const DEFAULT_RECENT_VISIBLE = 3;
  const DEFAULT_STUDENT_PASSWORD = 'Xx@123456';
  const REQUIRED_QUICK_IDS = Object.freeze([
    'quickLoginSection', 'quickLoginHeader', 'quickLoginBody', 'quickHistorySection',
    'quickAuthNotice', 'quickActionStatus', 'recentList', 'quickRecentCount', 'quickRecentHeading',
    'quickHistoryFilters', 'quickHistoryRoleFilter', 'quickHistoryEnvFilter',
    'quickStepProgress', 'quickStepProgressTrack', 'quickProgressCompact',
    'modeTeacherBtn', 'modeStudentBtn', 'teacherModePanel', 'studentModePanel',
    'teacherTenantStep', 'teacherTenantState', 'teacherTenantSummary',
    'teacherTenantSummaryTitle', 'teacherTenantSummaryMeta', 'changeTeacherTenantBtn',
    'teacherTenantStepBody', 'tenantSearchStatus',
    'teacherUserStep', 'teacherUserState', 'teacherUserSummary', 'teacherUserSummaryTitle',
    'teacherUserSummaryMeta', 'changeTeacherUserBtn', 'teacherUserSummaryActions',
    'teacherUserStepBody', 'teacherSessionStatus',
    'teacherIdentityStep', 'teacherIdentityState', 'teacherIdentitySummary',
    'teacherIdentitySummaryTitle', 'teacherIdentitySummaryMeta', 'changeTeacherIdentityBtn',
    'teacherIdentityStepBody',
    'tenantSearch', 'tenantList', 'tenantEmpty', 'deptSelect',
    'userSearch', 'userList', 'userEmpty', 'userPager',
    'teacherRefreshBtn', 'teacherNameSearch', 'teacherAccountSearch',
    'teacherList', 'teacherEmpty', 'teacherPager', 'studentSection',
    'studentSectionTitle', 'studentRefreshBtn', 'teacherDuties', 'studentAppSiteUrl',
    'studentNameSearch', 'studentCodeSearch', 'studentList', 'studentEmpty', 'studentPager',
    'accountSearchField', 'accountSearch', 'accountList', 'accountEmpty', 'accountPager',
    'studentAccountStep', 'studentAccountState', 'studentAccountSummary',
    'studentAccountSummaryTitle', 'studentAccountSummaryMeta', 'changeStudentAccountBtn',
    'studentAccountSummaryActions', 'studentAccountStepBody', 'accountSessionStatus',
    'studentRelationPanel', 'studentRelationRefreshBtn', 'lookupByStudentBtn',
    'lookupByClassBtn', 'teacherLookupSemesterSelect', 'studentSessionNote',
    'relationSelectionSummary', 'relationSelectionSummaryTitle', 'relationSelectionSummaryMeta',
    'changeRelationSelectionBtn',
    'lookupStudentPanel', 'lookupStudentList', 'lookupStudentEmpty', 'lookupStudentPager',
    'lookupClassPanel', 'lookupClassSelect', 'lookupTeacherResultHead',
    'lookupTeacherResultTitle', 'lookupTeacherResultCount', 'lookupTeacherList',
    'lookupTeacherEmpty',
  ]);
  let initialized = false;
  let activationPromise = null;
  let persistenceReady = false;
  let persistenceTimer = 0;
  let lastPersistedSignature = '';
  const renderSignatures = new Map();

  const icons = {
    login: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
    apply: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v14"/><path d="m6 11 6 6 6-6"/><path d="M5 21h14"/></svg>',
    open: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    copy: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    student: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    teacher: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    delete: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  };

  const state = {
    expanded: true,
    mode: 'teacher',
    loadingLogin: false,
    recentExpanded: false,
    recentRoleFilter: '',
    recentEnvFilter: '',
    adminTokenAvailable: null,
    teacher: {
      activeStep: 0,
      selectedTenant: null,
      tenantKeyword: '',
      tenantRecords: [],
      tenantRequestId: 0,
      loadingTenants: false,
      userKeyword: '',
      userRequestId: 0,
      loadingUsers: false,
      userError: '',
      userPage: { current: 1, size: 10, total: 0, records: [] },
      selectedUser: null,
      sessionRequestId: 0,
      loadingSession: false,
      sessionError: '',
      teacherNameKeyword: '',
      teacherAccountKeyword: '',
      teacherRequestId: 0,
      loadingTeachers: false,
      teacherError: '',
      teacherPage: { current: 1, size: 10, total: 0, records: [] },
      selectedTeacher: null,
      teacherDetailRequestId: 0,
      loadingDuties: false,
      classIds: [],
      studentNameKeyword: '',
      studentCodeKeyword: '',
      studentRequestId: 0,
      loadingStudents: false,
      studentError: '',
      studentPage: { current: 1, size: 10, total: 0, records: [] },
    },
    student: {
      activeStep: 0,
      editingRelationSelection: false,
      field: 'username',
      keyword: '',
      accountRequestId: 0,
      loadingAccounts: false,
      accountError: '',
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
      teacherResolveRequestId: 0,
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

  function shouldRender(key, value) {
    const signature = JSON.stringify(value);
    if (renderSignatures.get(key) === signature) return false;
    renderSignatures.set(key, signature);
    return true;
  }

  function setHtmlIfChanged(element, signatureValue, html) {
    if (!element) return false;
    const signature = JSON.stringify(signatureValue);
    if (element.dataset.renderSignature === signature) return false;
    element.dataset.renderSignature = signature;
    element.innerHTML = html;
    return true;
  }

  function createDebouncedSearch(invalidate, load, ms = SEARCH_DEBOUNCE) {
    const scheduledLoad = debounce(load, ms);
    return (...args) => {
      invalidate(...args);
      scheduledLoad(...args);
    };
  }

  function setStatus(text, kind) {
    ns.ui.toast(text || '', kind);
  }

  function setInlineStatus(id, text, kind = '') {
    const el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.dataset.kind = kind;
  }

  function setActionStatus(text, kind = '') {
    setInlineStatus('quickActionStatus', text, kind);
  }

  function setStageState(stepId, stateId, { visible = true, complete = false, current, status = '' } = {}) {
    const step = $(stepId);
    if (!step) return;
    const isCurrent = current == null ? visible && !complete : Boolean(current);
    step.classList.toggle('hidden', !visible);
    step.classList.toggle('is-complete', complete);
    step.classList.toggle('is-current', isCurrent);
    step.setAttribute('aria-busy', String(/中$/.test(status)));
    const stateEl = $(stateId);
    if (stateEl) stateEl.textContent = status;
  }

  function toggleRegion(id, visible) {
    const el = $(id);
    if (el) el.classList.toggle('hidden', !visible);
  }

  function focusControl(id) {
    requestAnimationFrame(() => $(id)?.focus({ preventScroll: true }));
  }

  function renderAuthAvailability() {
    const notice = $('quickAuthNotice');
    if (!notice) return;
    let text;
    if (state.adminTokenAvailable == null) {
      text = '正在检查后台 Token...';
      notice.dataset.kind = 'loading';
    } else if (state.adminTokenAvailable) {
      text = '后台 Token 已就绪';
      notice.dataset.kind = 'ready';
    } else {
      text = '需要后台 Token，请先在“后台账号”标签获取';
      notice.dataset.kind = 'warning';
    }
    notice.textContent = text;
    notice.title = text;
    const blocked = state.adminTokenAvailable === false;
    ['tenantSearch', 'accountSearchField', 'accountSearch'].forEach((id) => {
      const control = $(id);
      if (control) control.disabled = blocked;
    });
  }

  function resetPage(size = 10) {
    return { current: 1, size, total: 0, records: [] };
  }

  function boundedStep(value, max) {
    const step = Number(value);
    return Number.isInteger(step) ? Math.max(0, Math.min(step, max)) : 0;
  }

  function getTeacherReachableStep(teacherState = state.teacher) {
    if (!teacherState.selectedTenant) return 0;
    if (!teacherState.selectedUser) return 1;
    if (!teacherState.selectedTeacher) return 2;
    return 3;
  }

  function getStudentReachableStep(studentState = state.student) {
    return studentState.selectedAccount?.session ? 1 : 0;
  }

  function pageSnapshot(page, fallbackSize = 10) {
    return {
      current: Number(page?.current) || 1,
      size: Number(page?.size) || fallbackSize,
      total: Number(page?.total) || 0,
      records: Array.isArray(page?.records) ? page.records : [],
    };
  }

  function withoutRuntimeToken(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const copy = Object.assign({}, value);
    delete copy.aiToken;
    if (copy.session && typeof copy.session === 'object') {
      copy.session = Object.assign({}, copy.session);
      delete copy.session.aiToken;
    }
    return copy;
  }

  function createPersistedState(source = state) {
    const t = source.teacher;
    const s = source.student;
    return {
      mode: source.mode === 'student' ? 'student' : 'teacher',
      teacher: {
        activeStep: boundedStep(t.activeStep, 3),
        selectedTenant: t.selectedTenant,
        tenantKeyword: t.tenantKeyword,
        tenantRecords: Array.isArray(t.tenantRecords) ? t.tenantRecords : [],
        userKeyword: t.userKeyword,
        userPage: pageSnapshot(t.userPage),
        selectedUser: withoutRuntimeToken(t.selectedUser),
        teacherNameKeyword: t.teacherNameKeyword,
        teacherAccountKeyword: t.teacherAccountKeyword,
        teacherPage: pageSnapshot(t.teacherPage),
        selectedTeacher: t.selectedTeacher,
        classIds: Array.isArray(t.classIds) ? t.classIds : [],
        studentNameKeyword: t.studentNameKeyword,
        studentCodeKeyword: t.studentCodeKeyword,
        studentPage: pageSnapshot(t.studentPage),
      },
      student: {
        activeStep: boundedStep(s.activeStep, 1),
        field: ['username', 'account', 'tenantName'].includes(s.field) ? s.field : 'username',
        keyword: s.keyword,
        accountPage: pageSnapshot(s.accountPage),
        selectedAccount: withoutRuntimeToken(s.selectedAccount),
        relationMode: s.relationMode === 'class' ? 'class' : 'student',
        semesters: Array.isArray(s.semesters) ? s.semesters : [],
        semesterId: s.semesterId,
        classes: Array.isArray(s.classes) ? s.classes : [],
        classTeacherMap: s.classTeacherMap && typeof s.classTeacherMap === 'object' ? s.classTeacherMap : {},
        matchedStudents: Array.isArray(s.matchedStudents) ? s.matchedStudents : [],
        matchedBy: s.matchedBy,
        selectedStudent: s.selectedStudent,
        selectedClassId: s.selectedClassId,
        relationError: s.relationError,
      },
    };
  }

  function restorePersistedState(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return false;
    state.mode = snapshot.mode === 'student' ? 'student' : 'teacher';
    const t = snapshot.teacher;
    if (t && typeof t === 'object') {
      state.teacher.selectedTenant = t.selectedTenant && typeof t.selectedTenant === 'object' ? t.selectedTenant : null;
      state.teacher.tenantKeyword = typeof t.tenantKeyword === 'string' ? t.tenantKeyword : '';
      state.teacher.tenantRecords = Array.isArray(t.tenantRecords) ? t.tenantRecords : [];
      state.teacher.userKeyword = typeof t.userKeyword === 'string' ? t.userKeyword : '';
      state.teacher.userPage = pageSnapshot(t.userPage);
      state.teacher.selectedUser = withoutRuntimeToken(t.selectedUser);
      state.teacher.teacherNameKeyword = typeof t.teacherNameKeyword === 'string' ? t.teacherNameKeyword : '';
      state.teacher.teacherAccountKeyword = typeof t.teacherAccountKeyword === 'string' ? t.teacherAccountKeyword : '';
      state.teacher.teacherPage = pageSnapshot(t.teacherPage);
      state.teacher.selectedTeacher = t.selectedTeacher && typeof t.selectedTeacher === 'object' ? t.selectedTeacher : null;
      state.teacher.classIds = Array.isArray(t.classIds) ? t.classIds : [];
      state.teacher.studentNameKeyword = typeof t.studentNameKeyword === 'string' ? t.studentNameKeyword : '';
      state.teacher.studentCodeKeyword = typeof t.studentCodeKeyword === 'string' ? t.studentCodeKeyword : '';
      state.teacher.studentPage = pageSnapshot(t.studentPage);
      state.teacher.activeStep = Number.isInteger(t.activeStep)
        ? boundedStep(t.activeStep, getTeacherReachableStep(state.teacher))
        : getTeacherReachableStep(state.teacher);
    }
    const s = snapshot.student;
    if (s && typeof s === 'object') {
      state.student.field = ['username', 'account', 'tenantName'].includes(s.field) ? s.field : 'username';
      state.student.keyword = typeof s.keyword === 'string' ? s.keyword : '';
      state.student.accountPage = pageSnapshot(s.accountPage);
      state.student.selectedAccount = withoutRuntimeToken(s.selectedAccount);
      state.student.relationMode = s.relationMode === 'class' ? 'class' : 'student';
      state.student.semesters = Array.isArray(s.semesters) ? s.semesters : [];
      state.student.semesterId = typeof s.semesterId === 'string' ? s.semesterId : '';
      state.student.classes = Array.isArray(s.classes) ? s.classes : [];
      state.student.classTeacherMap = s.classTeacherMap && typeof s.classTeacherMap === 'object' ? s.classTeacherMap : {};
      state.student.matchedStudents = Array.isArray(s.matchedStudents) ? s.matchedStudents : [];
      state.student.matchedBy = typeof s.matchedBy === 'string' ? s.matchedBy : '';
      state.student.selectedStudent = s.selectedStudent && typeof s.selectedStudent === 'object' ? s.selectedStudent : null;
      state.student.selectedClassId = String(s.selectedClassId || '');
      state.student.relationError = typeof s.relationError === 'string' ? s.relationError : '';
      state.student.regularAccountsByTenant = s.regularAccountsByTenant && typeof s.regularAccountsByTenant === 'object'
        ? s.regularAccountsByTenant : {};
      state.student.relationTeacherCache = s.relationTeacherCache && typeof s.relationTeacherCache === 'object'
        ? s.relationTeacherCache : {};
      state.student.activeStep = Number.isInteger(s.activeStep)
        ? boundedStep(s.activeStep, getStudentReachableStep(state.student))
        : getStudentReachableStep(state.student);
    }
    return true;
  }

  async function flushPersistedState() {
    clearTimeout(persistenceTimer);
    persistenceTimer = 0;
    if (!persistenceReady || !ns.quickLoginStateStorage) return;
    const snapshot = createPersistedState();
    const signature = JSON.stringify(snapshot);
    if (signature === lastPersistedSignature) return;
    lastPersistedSignature = signature;
    try {
      await ns.quickLoginStateStorage.save(snapshot);
    } catch (error) {
      lastPersistedSignature = '';
      console.warn('[一键登录] 查询状态保存失败:', error?.message || error);
    }
  }

  function persistStateSoon() {
    if (!persistenceReady || !ns.quickLoginStateStorage) return;
    clearTimeout(persistenceTimer);
    persistenceTimer = setTimeout(flushPersistedState, 250);
  }

  async function loadPersistedState() {
    if (!ns.quickLoginStateStorage) {
      persistenceReady = true;
      return false;
    }
    try {
      const restored = restorePersistedState(await ns.quickLoginStateStorage.load());
      persistenceReady = true;
      return restored;
    } catch (error) {
      persistenceReady = true;
      console.warn('[一键登录] 查询状态恢复失败:', error?.message || error);
      return false;
    }
  }

  function restoreFormValues() {
    const t = state.teacher;
    const s = state.student;
    const values = {
      tenantSearch: t.selectedTenant?.tenantName || t.tenantKeyword,
      userSearch: t.userKeyword,
      teacherNameSearch: t.teacherNameKeyword,
      teacherAccountSearch: t.teacherAccountKeyword,
      studentNameSearch: t.studentNameKeyword,
      studentCodeSearch: t.studentCodeKeyword,
      accountSearch: s.keyword,
    };
    Object.entries(values).forEach(([id, value]) => {
      const input = $(id);
      if (input) input.value = value || '';
    });
    const field = $('accountSearchField');
    if (field) field.value = s.field;
    const accountSearch = $('accountSearch');
    if (accountSearch) {
      accountSearch.placeholder = s.field === 'username'
        ? '输入学生姓名'
        : (s.field === 'account' ? '输入学生账号' : '输入租户名称');
    }
  }

  async function rehydratePersistedSessions() {
    if (!state.adminTokenAvailable) return;
    const tasks = [];
    const t = state.teacher;
    if (t.selectedUser && !t.selectedUser.aiToken && t.selectedUser.id && t.selectedUser.tenantId) {
      t.loadingSession = true;
      tasks.push(request('RESOLVE_USER_SESSION', {
        tenantId: t.selectedUser.tenantId,
        id: t.selectedUser.id,
        industry: t.selectedUser.industry,
      }).then((result) => {
        t.selectedUser = Object.assign({}, t.selectedUser, {
          origin: result.origin,
          aiToken: result.aiToken,
          env: normalizeEnv(t.selectedUser.env),
          localPort: normalizePort(t.selectedUser.localPort),
        });
        t.sessionError = '';
      }).catch((error) => {
        t.sessionError = '查询结果已恢复，会话重建失败：' + error.message;
      }).finally(() => { t.loadingSession = false; }));
    }
    const s = state.student;
    if (s.selectedAccount?.session && !s.selectedAccount.session.aiToken && s.selectedAccount.loginId && s.selectedAccount.tenantId) {
      s.loadingSession = true;
      tasks.push(request('RESOLVE_USER_SESSION', {
        tenantId: s.selectedAccount.tenantId,
        id: s.selectedAccount.loginId,
        industry: s.selectedAccount.industry,
      }).then((result) => {
        s.selectedAccount = Object.assign({}, s.selectedAccount, {
          session: Object.assign({}, s.selectedAccount.session, {
            origin: result.origin,
            aiToken: result.aiToken,
          }),
        });
      }).catch((error) => {
        s.relationError = '查询结果已恢复，会话重建失败：' + error.message;
      }).finally(() => { s.loadingSession = false; }));
    }
    await Promise.all(tasks);
    persistStateSoon();
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

  function buildRecentTeacherSelection(record = {}) {
    if (record.role !== 'teacher') {
      throw new Error('仅教师最近记录可应用到教师查学生');
    }
    const selectedTenant = tenant.normalizeTenant(record);
    const selectedUser = tenant.normalizeUser({
      id: record.id,
      userId: record.userId,
      username: record.userName,
      account: record.account,
      tenantId: record.tenantId,
    });
    if (!selectedTenant.tenantId) throw new Error('最近登录记录缺少租户信息');
    if (!selectedUser.id) throw new Error('最近登录记录缺少账号信息');
    if (!selectedUser.userName) throw new Error('最近登录记录缺少教师姓名，无法匹配 AI 教师');
    return {
      selectedTenant,
      selectedUser,
      env: normalizeEnv(record.env),
      localPort: normalizePort(record.localPort),
    };
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
    t.sessionError = '';
    t.loadingTenants = false;
    t.loadingUsers = false;
    t.userError = '';
    t.loadingTeachers = false;
    t.teacherError = '';
    t.loadingStudents = false;
    t.studentError = '';
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
    s.teacherResolveRequestId += 1;
    s.sessionRequestId += 1;
    s.loadingAccounts = false;
    s.accountError = '';
    s.loadingSession = false;
    s.relationLoading = false;
    s.resolvingTeachers = false;
    s.relationError = '';
    s.editingRelationSelection = false;
  }

  function switchMode(mode) {
    if (state.loadingLogin) {
      setStatus('正在获取登录链接，请稍候再切换查询模式', '');
      return;
    }
    const next = mode === 'student' ? 'student' : 'teacher';
    if (next === state.mode) return;
    const update = () => {
      state.mode = next;
      // 两种查询模式各自维护独立状态，切换时保留已选账号、分页和关联结果。
      updateModeUI();
    };
    if (ns.ui?.transitionView) ns.ui.transitionView(update, 'quick');
    else update();
    persistStateSoon();
    setActionStatus('');
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
      teacherBtn.setAttribute('aria-selected', String(state.mode === 'teacher'));
      teacherBtn.tabIndex = state.mode === 'teacher' ? 0 : -1;
    }
    if (studentBtn) {
      studentBtn.classList.toggle('active', state.mode === 'student');
      studentBtn.setAttribute('aria-pressed', String(state.mode === 'student'));
      studentBtn.setAttribute('aria-selected', String(state.mode === 'student'));
      studentBtn.tabIndex = state.mode === 'student' ? 0 : -1;
    }
    if (teacherPanel) teacherPanel.classList.toggle('hidden', state.mode !== 'teacher');
    if (studentPanel) studentPanel.classList.toggle('hidden', state.mode !== 'student');
    renderProgress();
  }

  function navigateToStep(mode, index) {
    const studentMode = mode === 'student';
    const targetState = studentMode ? state.student : state.teacher;
    const maxStep = studentMode ? getStudentReachableStep(targetState) : getTeacherReachableStep(targetState);
    const requestedStep = Number(index);
    if (!Number.isInteger(requestedStep) || requestedStep < 0 || requestedStep > maxStep) return;
    targetState.activeStep = requestedStep;
    const update = () => {
      if (studentMode) renderStudentShell();
      else renderTeacherShell();
    };
    if (ns.ui?.transitionView) ns.ui.transitionView(update, 'quick');
    else update();
    const focusIds = studentMode
      ? ['accountSearch', 'lookupByStudentBtn']
      : ['tenantSearch', 'userSearch', 'teacherNameSearch', 'studentNameSearch'];
    focusControl(focusIds[requestedStep]);
  }

  function renderProgress() {
    const track = $('quickStepProgressTrack');
    const compact = $('quickProgressCompact');
    if (!track || !compact) return;
    const teacherMode = state.mode === 'teacher';
    const targetState = teacherMode ? state.teacher : state.student;
    const maxStep = teacherMode ? getTeacherReachableStep(targetState) : getStudentReachableStep(targetState);
    targetState.activeStep = boundedStep(targetState.activeStep, maxStep);
    const activeStep = targetState.activeStep;
    const steps = teacherMode
      ? [
        { label: '租户', complete: Boolean(state.teacher.selectedTenant) },
        { label: '账号', complete: Boolean(state.teacher.selectedUser) },
        { label: '教师', complete: Boolean(state.teacher.selectedTeacher) },
        { label: '学生', complete: Boolean(state.teacher.selectedTeacher) },
      ]
      : [
        { label: '学生账号', complete: Boolean(state.student.selectedAccount?.session) },
        { label: '关联教师', complete: Boolean(state.student.selectedClassId) },
      ];
    track.style.setProperty('--step-count', String(steps.length));
    const existing = [...track.querySelectorAll('.quick-progress-step')];
    steps.forEach((step, index) => {
      let button = existing[index];
      if (!button) {
        button = document.createElement('button');
        button.className = 'quick-progress-step';
        button.type = 'button';
        track.appendChild(button);
      }
      button.dataset.stepIndex = String(index);
      button.textContent = `${index + 1} ${step.label}`;
      button.classList.toggle('current', index === activeStep);
      button.classList.toggle('complete', index !== activeStep && step.complete);
      button.disabled = index > maxStep;
      button.setAttribute('aria-current', index === activeStep ? 'step' : 'false');
    });
    existing.slice(steps.length).forEach((button) => button.remove());
    compact.textContent = `步骤 ${activeStep + 1}/${steps.length} · ${steps[activeStep].label}`;
    ns.workspaceUi?.setPath(teacherMode ? '教师 -> 学生' : '学生 -> 教师');
  }

  function onProgressClick(event) {
    const button = event.target.closest('.quick-progress-step');
    if (!button || button.disabled) return;
    const index = Number(button.dataset.stepIndex);
    navigateToStep(state.mode, index);
  }

  function renderShell() {
    const body = $('quickLoginBody');
    if (!body) return;
    const missingIds = REQUIRED_QUICK_IDS.filter((id) => !$(id));
    if (missingIds.length) {
      throw new Error('一键登录静态结构缺少 DOM ID: ' + missingIds.join(', '));
    }
    updateModeUI();
  }

  async function hasAdminToken() {
    const tokenState = await ns.token.getToken();
    state.adminTokenAvailable = Boolean(tokenState && tokenState.token);
    renderAuthAvailability();
    return state.adminTokenAvailable;
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
    const add = (label, ariaLabel, target, disabled, active) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pager-btn quick-pager-btn' + (active ? ' active' : '');
      button.textContent = label;
      button.setAttribute('aria-label', ariaLabel);
      button.disabled = Boolean(disabled);
      if (active) button.setAttribute('aria-current', 'page');
      if (!disabled && !active) button.addEventListener('click', () => go(target));
      el.appendChild(button);
    };
    add('‹', '上一页', current - 1, current <= 1, false);
    const start = Math.max(1, Math.min(current - 2, pages - 4));
    const end = Math.min(pages, start + 4);
    for (let i = start; i <= end; i += 1) add(String(i), '第 ' + i + ' 页', i, false, i === current);
    add('›', '下一页', current + 1, current >= pages, false);
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
      'data-env="' + escapeHtml(meta.env ? normalizeEnv(meta.env) : '') + '"',
      'data-local-port="' + escapeHtml(meta.localPort ? normalizePort(meta.localPort) : '') + '"',
    ].join(' ');
    const unavailable = disabled || state.loadingLogin || state.adminTokenAvailable === false;
    const suffix = unavailable ? ' disabled aria-disabled="true"' : '';
    return '<div class="list-item-actions">' +
      '<button class="action-btn quick-action-btn primary" type="button" data-action="open" ' + attrs + suffix + ' title="打开 AI 平台" aria-label="打开 AI 平台">' + icons.open + '</button>' +
      '<button class="action-btn quick-action-btn" type="button" data-action="copy" ' + attrs + suffix + ' title="复制 AI 平台 Token query" aria-label="复制 AI 平台 Token query">' + icons.copy + '</button>' +
      '<button class="action-btn quick-action-btn" type="button" data-action="student" ' + attrs + suffix + ' title="学生评价" aria-label="学生评价">' + icons.student + '</button>' +
      '<button class="action-btn quick-action-btn" type="button" data-action="teacher" ' + attrs + suffix + ' title="教师评价" aria-label="教师评价">' + icons.teacher + '</button>' +
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

  function buildStudentCredentialsText(student = {}, fallbackTenantName = '') {
    const tenantName = String(student.tenantName || fallbackTenantName || '').trim();
    const account = String(student.account || student.code || '').trim();
    const password = String(student.password || '').trim() || DEFAULT_STUDENT_PASSWORD;
    return [
      '租户名称：' + tenantName,
      '学生账号：' + account,
      '学生密码：' + password,
    ].join('\n');
  }

  function normalizeAppSiteUrl(value) {
    const input = String(value || '').trim();
    if (!input) return '';
    const explicitScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(input);
    if (explicitScheme && !/^https?:\/\//i.test(input)) return '';
    try {
      const parsed = new URL(explicitScheme ? input : 'http://' + input);
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
        return '';
      }
      return parsed.origin;
    } catch (_) {
      return '';
    }
  }

  function buildStudentAppLoginPayload(student = {}, selectedTenant = {}, siteUrl = '') {
    const rawSiteUrl = String(siteUrl || '').trim();
    if (!rawSiteUrl) throw new Error('请输入 APP 站点地址');
    const normalizedSiteUrl = normalizeAppSiteUrl(rawSiteUrl);
    if (!normalizedSiteUrl) throw new Error('APP 站点地址无效，请输入 HTTP(S) 地址');
    const account = String(student.account || student.code || '').trim();
    if (!account) throw new Error('该学生缺少登录账号');
    const tenantId = String(selectedTenant.tenantId || '').trim();
    if (!tenantId) throw new Error('当前未选择租户');
    return {
      siteUrl: normalizedSiteUrl,
      account,
      password: String(student.password || '').trim() || DEFAULT_STUDENT_PASSWORD,
      tenantId,
      tenantName: String(selectedTenant.tenantName || student.tenantName || '').trim(),
      recordHistory: true,
    };
  }

  function formatAppLoginError(error) {
    const message = String(error?.message || '').trim();
    if (!message) return '登录失败';
    return /^登录失败\s*[:：]/.test(message) ? message : '登录失败：' + message;
  }

  function validateStudentAppSiteInput(notify = false) {
    const input = $('studentAppSiteUrl');
    if (!input) return '';
    const raw = input.value.trim();
    const normalized = normalizeAppSiteUrl(raw);
    input.setAttribute('aria-invalid', String(!normalized));
    if (normalized) {
      input.value = normalized;
      return normalized;
    }
    if (notify) {
      const message = raw ? 'APP 站点地址无效，请输入 HTTP(S) 地址' : '请输入 APP 站点地址';
      setActionStatus(message, 'error');
      setStatus(message, 'err');
    }
    return '';
  }

  async function loadStudentAppSiteUrl() {
    const input = $('studentAppSiteUrl');
    if (!input) return;
    try {
      const response = await messages.sendToBackground({ type: 'APP_GET_CREDENTIALS' });
      const siteUrl = response?.ok ? normalizeAppSiteUrl(response.siteUrl) : '';
      if (siteUrl) input.value = siteUrl;
    } catch (_) {}
    input.setAttribute('aria-invalid', String(!normalizeAppSiteUrl(input.value)));
  }

  async function performStudentAppLogin(student, button, row) {
    if (state.loadingLogin || !button) return;
    let payload;
    try {
      payload = buildStudentAppLoginPayload(
        student,
        state.teacher.selectedTenant,
        $('studentAppSiteUrl')?.value || '',
      );
    } catch (error) {
      validateStudentAppSiteInput(false);
      setActionStatus(error.message, 'error');
      setStatus(error.message, 'err');
      if (/站点地址/.test(error.message)) focusControl('studentAppSiteUrl');
      return;
    }

    const input = $('studentAppSiteUrl');
    if (input) {
      input.value = payload.siteUrl;
      input.setAttribute('aria-invalid', 'false');
    }
    const originalHtml = button.innerHTML;
    const originalAriaLabel = button.getAttribute('aria-label');
    state.loadingLogin = true;
    button.disabled = true;
    button.classList.add('is-loading');
    button.setAttribute('aria-busy', 'true');
    button.setAttribute('aria-label', '登录中');
    button.innerHTML = '<span class="spinner" aria-hidden="true"></span>';
    row?.setAttribute('aria-busy', 'true');
    setActionStatus('');
    try {
      const response = await messages.sendToBackground({ type: 'APP_LOGIN', payload });
      if (!response?.ok) throw new Error(response?.error || '登录失败');
    } catch (error) {
      const message = formatAppLoginError(error);
      setActionStatus(message, 'error');
      setStatus(message, 'err');
    } finally {
      state.loadingLogin = false;
      row?.removeAttribute('aria-busy');
      button.disabled = false;
      button.classList.remove('is-loading');
      button.removeAttribute('aria-busy');
      if (originalAriaLabel == null) button.removeAttribute('aria-label');
      else button.setAttribute('aria-label', originalAriaLabel);
      button.innerHTML = originalHtml;
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
      t.tenantRecords = [];
      setInlineStatus('tenantSearchStatus', '');
      clearList('tenantList', 'tenantEmpty', '请输入租户条件');
      renderTeacherShell();
      return;
    }
    const requestId = ++t.tenantRequestId;
    t.loadingTenants = true;
    setInlineStatus('tenantSearchStatus', '正在搜索租户...');
    clearList('tenantList', 'tenantEmpty', '正在搜索租户...');
    renderTeacherShell();
    try {
      if (!(await hasAdminToken())) throw new Error('请先在「后台账号」获取后台 Token');
      const response = await request('FETCH_TENANTS', { current: 1, size: 10, keyword });
      if (requestId !== t.tenantRequestId) return;
      setInlineStatus('tenantSearchStatus', '');
      renderTenantList(pageFrom(response).records || []);
    } catch (error) {
      if (requestId === t.tenantRequestId) {
        setInlineStatus('tenantSearchStatus', error.message, 'error');
        clearList('tenantList', 'tenantEmpty', error.message);
        setStatus(error.message, 'err');
      }
    } finally {
      if (requestId === t.tenantRequestId) {
        t.loadingTenants = false;
        renderTeacherShell();
      }
    }
  }

  function renderTenantList(records) {
    records = Array.isArray(records) ? records : [];
    state.teacher.tenantRecords = records;
    persistStateSoon();
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
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'list-item quick-list-button' + (state.teacher.selectedTenant?.tenantId === item.tenantId ? ' active' : '');
      row.setAttribute('aria-pressed', String(state.teacher.selectedTenant?.tenantId === item.tenantId));
      row.innerHTML = '<span class="list-item-content"><span class="list-item-title">' +
        escapeHtml(item.tenantName || '(未命名)') + '</span><span class="list-item-meta">' +
        escapeHtml(item.domain || item.contactPhone || item.tenantId) + '</span></span>';
      row.addEventListener('click', () => selectTeacherTenant(item));
      list.appendChild(row);
    });
  }

  async function selectTeacherTenant(item) {
    const t = state.teacher;
    t.selectedTenant = item;
    t.activeStep = 1;
    t.userKeyword = '';
    t.userPage = resetPage();
    clearTeacherSession();
    $('tenantSearch').value = item.tenantName || '';
    $('tenantList').classList.add('hidden');
    $('userSearch').value = '';
    $('teacherNameSearch').value = '';
    $('teacherAccountSearch').value = '';
    renderTeacherShell();
    focusControl('userSearch');
    await loadTeacherUsers(true);
  }

  async function loadTeacherUsers(reset) {
    if (state.mode !== 'teacher') return;
    const t = state.teacher;
    if (!t.selectedTenant) return;
    if (reset) {
      t.userPage = resetPage();
      clearList('userList', 'userEmpty', '正在加载租户用户...');
    }
    const requestId = ++t.userRequestId;
    t.loadingUsers = true;
    t.userError = '';
    setInlineStatus('teacherSessionStatus', '正在加载租户用户...');
    setStageState('teacherUserStep', 'teacherUserState', { visible: true, status: '加载中' });
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
      setInlineStatus('teacherSessionStatus', '');
      renderTeacherUsers();
    } catch (error) {
      if (requestId === t.userRequestId) {
        t.userPage.records = [];
        t.userPage.total = 0;
        t.userError = error.message;
        setInlineStatus('teacherSessionStatus', error.message, 'error');
        clearList('userList', 'userEmpty', error.message);
      }
      if (requestId === t.userRequestId) setStatus(error.message, 'err');
    } finally {
      if (requestId === t.userRequestId) {
        t.loadingUsers = false;
        renderTeacherShell();
      }
    }
  }

  function renderTeacherUsers(deps) {
    const d = deps || {};
    const getEl = d.$ || $;
    const t = state.teacher;
    const list = getEl('userList');
    const empty = getEl('userEmpty');
    const normalized = (t.userPage.records || []).map(tenant.normalizeUser);
    if (!list || !empty) return;
    if (!deps && !shouldRender('teacher-users', {
      tenantId: t.selectedTenant?.tenantId,
      selectedId: t.selectedUser?.id,
      selectedEnv: t.selectedUser?.env,
      selectedPort: t.selectedUser?.localPort,
      loadingUsers: t.loadingUsers,
      loadingSession: t.loadingSession,
      error: t.userError,
      page: [t.userPage.current, t.userPage.total],
      records: normalized.map((item) => [item.id, item.userName, item.account, item.phone, item.userId, item.roleName]),
    })) return;
    list.innerHTML = '';
    if (!t.selectedTenant) {
      list.classList.add('hidden');
      empty.textContent = '先选择租户';
      empty.classList.remove('hidden');
      getEl('userPager')?.classList.add('hidden');
      return;
    }
    if (!normalized.length) {
      list.classList.add('hidden');
      empty.textContent = t.loadingUsers
        ? '正在加载租户用户...'
        : (t.userError || (t.selectedTenant ? '未找到租户用户' : '先选择租户'));
      empty.classList.remove('hidden');
      const pager = getEl('userPager');
      if (pager) pager.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    const doc = d.document || document;
    normalized.forEach((user) => {
      const selected = t.selectedUser?.id === user.id;
      const env = 'online';
      const localPort = DEFAULT_DEV_PORT;
      const displayName = user.userName || '(未命名)';
      const avatarText = Array.from(String(user.userName || user.account || '?').trim())[0] || '?';
      const row = doc.createElement('div');
      row.className = 'list-item quick-action-row quick-target-container quick-tenant-user-row' + (selected ? ' active' : '');
      row.dataset.env = env;
      row.dataset.localPort = localPort;
      row.innerHTML = '<button class="quick-row-select" type="button" aria-pressed="' + selected + '"' + (t.loadingSession ? ' disabled' : '') + '>' +
        '<span class="quick-user-avatar" aria-hidden="true">' + escapeHtml(avatarText.toUpperCase()) + '</span>' +
        '<span class="list-item-content"><span class="list-item-title">' +
        '<span class="quick-user-name">' + escapeHtml(displayName) + '</span>' +
        (user.roleName ? '<span class="list-item-role">' + escapeHtml(user.roleName) + '</span>' : '') +
        '</span><span class="list-item-meta">' + escapeHtml(user.account || user.phone || user.userId) + '</span></span></button>' +
        '<div class="quick-user-toolbar">' +
        actionTargetControls({
          id: user.id,
          tenantName: t.selectedTenant.tenantName,
          userName: user.userName,
        }, env, localPort) +
        actionButtons({
          id: user.id,
          tenantId: t.selectedTenant.tenantId,
          tenantName: t.selectedTenant.tenantName,
          domain: t.selectedTenant.domain,
          industry: t.selectedTenant.industry,
          userName: user.userName,
          role: 'teacher',
          env,
          localPort,
        }, !user.id || t.loadingSession) +
        '</div>';
      if (!deps) {
        row.querySelector('.quick-row-select')?.addEventListener('click', () => selectTeacherUser(user, row));
      }
      syncActionTarget(row, env, localPort);
      list.appendChild(row);
    });
    const pagerEl = getEl('userPager');
    if (d.buildPagerUI) {
      d.buildPagerUI(pagerEl, t.userPage, d.onPage || (() => {}));
    } else {
      buildPagerUI(pagerEl, t.userPage, (page) => {
        t.userPage.current = page;
        loadTeacherUsers(false);
      });
    }
  }

  async function selectTeacherUser(user, row) {
    const t = state.teacher;
    if (t.loadingSession || !t.selectedTenant || !user.id) return false;
    if (t.selectedUser?.id === user.id) {
      changeTeacherUser();
      return false;
    }
    clearTeacherSession();
    const requestId = ++t.sessionRequestId;
    t.loadingSession = true;
    t.sessionError = '';
    renderTeacherShell();
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
        env: normalizeEnv(row?.dataset.env),
        localPort: normalizePort(row?.dataset.localPort),
      };
      t.activeStep = 2;
      t.sessionError = '';
      t.loadingSession = false;
      t.teacherNameKeyword = String(t.selectedUser.userName || '').trim();
      t.teacherAccountKeyword = '';
      $('teacherNameSearch').value = t.teacherNameKeyword;
      $('teacherAccountSearch').value = '';
      renderTeacherUsers();
      await loadTeachers(true);
      focusControl('teacherNameSearch');
      return true;
    } catch (error) {
      if (requestId === t.sessionRequestId) {
        t.sessionError = error.message;
        setStatus(error.message, 'err');
      }
      return false;
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
    }
    const requestId = ++t.teacherRequestId;
    t.loadingTeachers = true;
    t.teacherError = '';
    if (reset) clearList('teacherList', 'teacherEmpty', '正在加载 AI 教师...');
    renderTeacherShell();
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
      const firstMatchedTeacher = reset && (t.teacherNameKeyword || t.teacherAccountKeyword)
        ? t.teacherPage.records[0]
        : null;
      renderTeachers();
      if (firstMatchedTeacher) {
        t.loadingTeachers = false;
        await selectTeacher(firstMatchedTeacher);
      }
    } catch (error) {
      if (requestId === t.teacherRequestId) {
        t.teacherPage.records = [];
        t.teacherPage.total = 0;
        t.teacherError = error.message;
        clearList('teacherList', 'teacherEmpty', error.message);
        setStatus(error.message, 'err');
      }
    } finally {
      if (requestId === t.teacherRequestId) {
        t.loadingTeachers = false;
        renderTeacherShell();
      }
    }
  }

  function renderTeachers() {
    const t = state.teacher;
    const list = $('teacherList');
    const empty = $('teacherEmpty');
    if (!list || !empty) return;
    if (!shouldRender('teachers', {
      selectedId: t.selectedTeacher?.id,
      loading: t.loadingTeachers,
      error: t.teacherError,
      page: [t.teacherPage.current, t.teacherPage.total],
      records: t.teacherPage.records.map((item) => [item.id, item.name, item.account, item.statusText, item.statusOn]),
    })) return;
    list.innerHTML = '';
    if (!t.teacherPage.records.length) {
      list.classList.add('hidden');
      empty.textContent = t.loadingTeachers
        ? '正在加载 AI 教师...'
        : (t.teacherError || (t.selectedUser ? '未找到 AI 教师' : '选择租户用户后加载教师'));
      empty.classList.remove('hidden');
      const pager = $('teacherPager');
      if (pager) pager.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    t.teacherPage.records.forEach((teacherItem) => {
      const selected = t.selectedTeacher?.id === teacherItem.id;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'teacher-item quick-list-button' + (selected ? ' selected' : '');
      row.setAttribute('aria-pressed', String(selected));
      const status = teacherItem.statusText
        ? '<span class="teacher-badge ' + (teacherItem.statusOn === true ? 'status-on' : 'status-off') + '">' + escapeHtml(teacherItem.statusText) + '</span>'
        : '';
      row.innerHTML = '<span class="teacher-item-header"><span class="teacher-item-name">' +
        escapeHtml(teacherItem.name || '(未命名)') + '</span><span class="teacher-item-account">' +
        escapeHtml(teacherItem.account || '') + '</span></span>' +
        (status ? '<span class="teacher-item-badges">' + status + '</span>' : '');
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
      changeTeacherIdentity();
      return;
    }
    t.selectedTeacher = teacherItem;
    t.activeStep = 3;
    t.studentPage = resetPage();
    t.classIds = [];
    renderTeacherShell();
    await loadTeacherRelations(teacherItem);
    focusControl('studentNameSearch');
  }

  async function loadTeacherRelations(teacherItem) {
    if (state.mode !== 'teacher') return;
    const t = state.teacher;
    const requestId = ++t.teacherDetailRequestId;
    t.loadingDuties = true;
    t.studentError = '';
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
        t.studentError = error.message;
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
    persistStateSoon();
    if (!el || !t.selectedTeacher) return;
    const duties = t.selectedTeacher.detailDuties || [];
    if (!shouldRender('teacher-duties', {
      selectedId: t.selectedTeacher.id,
      loading: t.loadingDuties,
      duties,
    })) return;
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
    if (reset) {
      t.studentPage = resetPage();
      t.studentError = '';
    }
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
        t.studentError = error.message;
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
      const pager = $('studentPager');
      if (pager) {
        pager.innerHTML = '';
        pager.classList.add('hidden');
      }
      empty.textContent = message;
      empty.classList.remove('hidden');
    }
  }

  function renderTeacherStudents() {
    const t = state.teacher;
    persistStateSoon();
    const list = $('studentList');
    const empty = $('studentEmpty');
    if (!list || !empty) return;
    if (!shouldRender('teacher-students', {
      tenantId: t.selectedTenant?.tenantId,
      selectedTeacherId: t.selectedTeacher?.id,
      loading: t.loadingStudents,
      error: t.studentError,
      page: [t.studentPage.current, t.studentPage.total],
      records: t.studentPage.records.map((item) => [item.id, item.name, item.code, item.account, item.className, item.statusText, item.statusOn]),
    })) return;
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
      row.className = 'student-item';
      const status = student.statusText
        ? '<span class="student-item-badge ' + (student.statusOn === true ? 'status-on' : 'status-off') + '">' + escapeHtml(student.statusText) + '</span>'
        : '';
      row.innerHTML = '<div class="student-item-info"><div class="student-item-name">' +
        escapeHtml(student.name || '(未命名)') + '</div><div class="student-item-meta">' +
        (student.code ? '<span>学号: ' + escapeHtml(student.code) + '</span>' : '') +
        (student.className ? '<span>班级: ' + escapeHtml(student.className) + '</span>' : '') +
        '</div></div><div class="student-item-actions">' + status +
        '<button class="action-btn quick-action-btn student-app-login-btn" type="button" title="一键登录 APP" aria-label="一键登录 APP"' +
        (!(student.account || student.code) || !t.selectedTenant?.tenantId ? ' disabled aria-disabled="true"' : '') + '>' +
        icons.login + '</button>' +
        '<button class="action-btn quick-action-btn student-copy-btn" type="button" title="复制学生登录信息" aria-label="复制学生登录信息">' +
        icons.copy + '</button></div>';
      row.querySelector('.student-app-login-btn')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        performStudentAppLogin(student, event.currentTarget, row);
      });
      row.querySelector('.student-copy-btn')?.addEventListener('click', async () => {
        const credentials = buildStudentCredentialsText(student, t.selectedTenant?.tenantName);
        const copied = await copyToClipboard(credentials);
        if (!copied) {
          setActionStatus('复制失败，请检查浏览器剪贴板权限', 'error');
          setStatus('复制学生登录信息失败', 'err');
          return;
        }
        setActionStatus('已复制学生登录信息', 'success');
        setStatus('已复制学生登录信息', 'ok');
      });
      list.appendChild(row);
    });
    buildPagerUI($('studentPager'), t.studentPage, (page) => {
      t.studentPage.current = page;
      loadTeacherStudents(false, t.teacherDetailRequestId);
    });
  }

  function renderTeacherShell() {
    const t = state.teacher;
    const tenantReady = Boolean(t.selectedTenant);
    const userReady = Boolean(t.selectedUser);
    const teacherReady = Boolean(t.selectedTeacher);
    t.activeStep = boundedStep(t.activeStep, getTeacherReachableStep(t));
    const activeStep = t.activeStep;

    setStageState('teacherTenantStep', 'teacherTenantState', {
      visible: true,
      complete: tenantReady,
      current: activeStep === 0,
      status: t.loadingTenants ? '搜索中' : (tenantReady ? '已选择' : '当前'),
    });
    toggleRegion('teacherTenantSummary', tenantReady && activeStep !== 0);
    toggleRegion('teacherTenantStepBody', activeStep === 0);
    if (tenantReady) {
      $('teacherTenantSummaryTitle').textContent = t.selectedTenant.tenantName || '(未命名租户)';
      $('teacherTenantSummaryMeta').textContent = t.selectedTenant.domain || t.selectedTenant.contactPhone || t.selectedTenant.tenantId;
    }

    setStageState('teacherUserStep', 'teacherUserState', {
      visible: tenantReady,
      complete: userReady,
      current: activeStep === 1,
      status: t.loadingSession ? '连接中' : (t.loadingUsers ? '加载中' : (userReady ? '已选择' : '当前')),
    });
    toggleRegion('teacherUserSummary', userReady && activeStep !== 1);
    toggleRegion('teacherUserStepBody', tenantReady && activeStep === 1);
    if (userReady) {
      $('teacherUserSummaryTitle').textContent = t.selectedUser.userName || '(未命名账号)';
      $('teacherUserSummaryMeta').textContent = [t.selectedUser.account, t.selectedUser.tenantName].filter(Boolean).join(' / ');
      const env = normalizeEnv(t.selectedUser.env);
      const localPort = normalizePort(t.selectedUser.localPort);
      const summaryActions = $('teacherUserSummaryActions');
      const summaryChanged = setHtmlIfChanged(summaryActions, {
        id: t.selectedUser.id,
        tenantId: t.selectedUser.tenantId,
        env,
        localPort,
      }, '<div class="quick-summary-target">' +
        actionTargetControls({
          id: t.selectedUser.id,
          tenantName: t.selectedUser.tenantName,
          userName: t.selectedUser.userName,
        }, env, localPort) +
        '</div>' +
        actionButtons({
          id: t.selectedUser.id,
          tenantId: t.selectedUser.tenantId,
          tenantName: t.selectedUser.tenantName,
          domain: t.selectedUser.domain,
          industry: t.selectedUser.industry,
          userName: t.selectedUser.userName,
          role: 'teacher',
          env,
          localPort,
        }, false));
      if (summaryChanged) syncActionTarget(summaryActions, env, localPort);
    } else {
      setHtmlIfChanged($('teacherUserSummaryActions'), 'empty', '');
    }
    setInlineStatus(
      'teacherSessionStatus',
      t.loadingSession ? '正在建立 AI 会话...' : (t.sessionError || t.userError || (t.loadingUsers ? '正在加载租户用户...' : '')),
      t.sessionError || t.userError ? 'error' : '',
    );

    setStageState('teacherIdentityStep', 'teacherIdentityState', {
      visible: userReady,
      complete: teacherReady,
      current: activeStep === 2,
      status: t.loadingTeachers ? '加载中' : (t.loadingDuties ? '读取中' : (teacherReady ? '已选择' : '当前')),
    });
    toggleRegion('teacherIdentitySummary', teacherReady && activeStep !== 2);
    toggleRegion('teacherIdentityStepBody', userReady && activeStep === 2);
    if (teacherReady) {
      $('teacherIdentitySummaryTitle').textContent = t.selectedTeacher.name || '(未命名教师)';
      $('teacherIdentitySummaryMeta').textContent = [t.selectedTeacher.account, t.selectedTeacher.statusText].filter(Boolean).join(' / ');
    }

    toggleRegion('studentSection', teacherReady && activeStep === 3);
    renderTeacherUsers();
    renderTeachers();
    renderTeacherDuties();
    renderProgress();
    persistStateSoon();
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
      persistStateSoon();
      return;
    }
    const requestId = ++s.accountRequestId;
    s.loadingAccounts = true;
    s.accountError = '';
    clearList('accountList', 'accountEmpty', '正在搜索学生账号...');
    renderStudentShell();
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
        s.accountError = error.message;
        clearList('accountList', 'accountEmpty', error.message);
      }
      if (requestId === s.accountRequestId) setStatus(error.message, 'err');
    } finally {
      if (requestId === s.accountRequestId) {
        s.loadingAccounts = false;
        renderStudentShell();
      }
    }
  }

  function renderAccountUsers() {
    const s = state.student;
    const list = $('accountList');
    const empty = $('accountEmpty');
    if (!list || !empty) return;
    if (!shouldRender('student-accounts', {
      selectedId: s.selectedAccount?.id,
      selectedEnv: s.selectedAccount?.env,
      selectedPort: s.selectedAccount?.localPort,
      loadingAccounts: s.loadingAccounts,
      loadingSession: s.loadingSession,
      error: s.accountError,
      keyword: s.keyword,
      page: [s.accountPage.current, s.accountPage.total],
      records: s.accountPage.records.map((item) => [item.id, item.loginId, item.username, item.account, item.tenantId, item.tenantName, item.type, item.accountType, item.env, item.localPort]),
    })) return;
    list.innerHTML = '';
    if (!s.accountPage.records.length) {
      list.classList.add('hidden');
      empty.textContent = s.loadingAccounts
        ? '正在搜索学生账号...'
        : (s.accountError || (s.keyword ? '未找到学生账号' : '请输入学生姓名、账号或租户'));
      empty.classList.remove('hidden');
      const pager = $('accountPager');
      if (pager) pager.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    s.accountPage.records.forEach((account) => {
      const selected = s.selectedAccount?.id === account.id;
      const env = normalizeEnv(account.env);
      const localPort = normalizePort(account.localPort);
      const row = document.createElement('div');
      row.className = 'list-item quick-action-row quick-target-container' + (selected ? ' active' : '');
      row.dataset.env = env;
      row.dataset.localPort = localPort;
      const typeText = account.type === '1' || account.accountType === '1' || /学生|student/i.test(String(account.type || '')) ? '学生' : '账号';
      row.innerHTML = '<button class="quick-row-select" type="button" aria-pressed="' + selected + '"' + (s.loadingSession ? ' disabled' : '') + '><span class="list-item-content"><span class="list-item-title">' +
        escapeHtml(account.username || '(未命名)') + '<span class="list-item-role">' + typeText + '</span></span>' +
        '<span class="list-item-meta">' + escapeHtml(account.account || '无账号') + ' · ' +
        escapeHtml(account.tenantName || account.tenantId || '未知租户') + '</span></span></button>' +
        '<div class="quick-user-toolbar">' +
        actionTargetControls({
          id: account.loginId,
          tenantName: account.tenantName,
          userName: account.username,
        }, env, localPort, !account.loginId || !account.tenantId || s.loadingSession) +
        actionButtons({
          id: account.loginId,
          tenantId: account.tenantId,
          tenantName: account.tenantName,
          domain: account.domain,
          industry: account.industry,
          userName: account.username,
          role: 'student',
          env,
          localPort,
        }, !account.loginId || !account.tenantId || s.loadingSession) +
        '</div>';
      row.querySelector('.quick-row-select')?.addEventListener('click', () => selectStudentAccount(account, row));
      syncActionTarget(row, env, localPort);
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
      changeStudentAccount();
      return;
    }
    clearStudentSession();
    const env = normalizeEnv(row?.dataset.env);
    const localPort = normalizePort(row?.dataset.localPort);
    const requestId = ++s.sessionRequestId;
    s.loadingSession = true;
    s.relationError = '';
    s.selectedAccount = Object.assign({}, account, { env, localPort });
    renderStudentShell();
    try {
      const result = await request('RESOLVE_USER_SESSION', {
        tenantId: account.tenantId,
        id: account.loginId,
        industry: account.industry,
      });
      if (requestId !== s.sessionRequestId) return;
      s.selectedAccount = Object.assign({}, account, {
        env,
        localPort,
        session: {
          origin: result.origin,
          aiToken: result.aiToken,
        },
      });
      s.activeStep = 1;
      s.editingRelationSelection = false;
      s.loadingSession = false;
      renderStudentShell();
      await loadStudentRelationData();
      focusControl('lookupByStudentBtn');
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
    const signature = {
      semesterId: state.student.semesterId,
      semesters: state.student.semesters.map((item) => [item.id, item.label]),
    };
    if (!shouldRender('relation-semesters', signature)) {
      select.value = state.student.semesterId || '';
      select.disabled = state.student.relationLoading || !state.student.semesters.length;
      return;
    }
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
    const signature = {
      selectedClassId: state.student.selectedClassId,
      classes: state.student.classes.map((item) => [item.id, item.label, item.name]),
    };
    if (!shouldRender('relation-classes', signature)) {
      select.value = state.student.selectedClassId || '';
      return;
    }
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
    if (!shouldRender('matched-students', {
      error: s.relationError,
      selectedId: s.selectedStudent?.id,
      classes: s.classes.map((item) => [item.id, item.label, item.name]),
      students: s.matchedStudents.map((item) => [item.id, item.name, item.code, item.account, item.classId, item.className]),
    })) return;
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
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'student-item lookup-student-item quick-student-select' +
        (s.selectedStudent?.id === student.id ? ' selected' : '');
      row.setAttribute('aria-pressed', String(s.selectedStudent?.id === student.id));
      row.innerHTML = '<span class="student-item-info"><span class="student-item-name">' +
        escapeHtml(student.name || '(未命名)') + '</span><span class="student-item-meta">' +
        (student.code ? '<span>学号: ' + escapeHtml(student.code) + '</span>' : '') +
        (student.account ? '<span>账号: ' + escapeHtml(student.account) + '</span>' : '') +
        '<span>' + escapeHtml(matchedClass?.label || student.className || '班级未识别') + '</span>' +
        '</span></span>';
      row.addEventListener('click', () => selectMatchedStudent(student));
      list.appendChild(row);
    });
  }

  function updateRelationBusy() {
    const panel = $('studentRelationPanel');
    if (panel) panel.setAttribute('aria-busy', String(state.student.relationLoading || state.student.resolvingTeachers));
  }

  function invalidateRelationTeacherResolution() {
    const s = state.student;
    s.teacherResolveRequestId += 1;
    s.resolvingTeachers = false;
    updateRelationBusy();
    return s.teacherResolveRequestId;
  }

  function renderStudentRelationShell() {
    const s = state.student;
    const panel = $('studentRelationPanel');
    if (!panel) return;
    const ready = Boolean(s.selectedAccount?.session);
    panel.classList.toggle('hidden', !ready || s.activeStep !== 1);
    updateRelationBusy();
    const byStudent = $('lookupByStudentBtn');
    const byClass = $('lookupByClassBtn');
    byStudent?.classList.toggle('active', s.relationMode === 'student');
    byClass?.classList.toggle('active', s.relationMode === 'class');
    byStudent?.setAttribute('aria-pressed', String(s.relationMode === 'student'));
    byClass?.setAttribute('aria-pressed', String(s.relationMode === 'class'));
    const selectedClass = s.classes.find((item) => String(item.id) === String(s.selectedClassId));
    const selectionComplete = Boolean(selectedClass && (s.relationMode === 'class' || s.selectedStudent));
    const showingSelection = !selectionComplete || s.editingRelationSelection;
    toggleRegion('relationSelectionSummary', selectionComplete && !s.editingRelationSelection);
    toggleRegion('lookupStudentPanel', s.relationMode === 'student' && showingSelection);
    toggleRegion('lookupClassPanel', s.relationMode === 'class' && showingSelection);
    if (selectionComplete) {
      const semester = s.semesters.find((item) => String(item.id) === String(s.semesterId));
      $('relationSelectionSummaryTitle').textContent = s.selectedStudent?.name || selectedClass.label || selectedClass.name || selectedClass.id;
      $('relationSelectionSummaryMeta').textContent = [selectedClass.label || selectedClass.name, semester?.label].filter(Boolean).join(' / ');
    }
    const note = $('studentSessionNote');
    if (note) {
      note.dataset.kind = s.relationError ? 'error' : '';
      if (!ready) note.textContent = '';
      else if (s.relationLoading) note.textContent = '正在读取该学生所在租户的学期、班级与教师关系…';
      else if (s.relationError) note.textContent = s.relationError;
      else if (selectionComplete) note.textContent = '已定位班级，可查看关联教师。';
      else note.textContent = s.matchedBy ? '已按' + (s.matchedBy === 'account' ? '账号' : '姓名') + '严格匹配 AI 学生，请选择后查看班级教师。' : '';
    }
    renderRelationSemesters();
    renderRelationClasses();
    renderMatchedStudents();
  }

  function renderStudentShell() {
    const s = state.student;
    const accountReady = Boolean(s.selectedAccount?.session);
    s.activeStep = boundedStep(s.activeStep, getStudentReachableStep(s));
    const activeStep = s.activeStep;
    setStageState('studentAccountStep', 'studentAccountState', {
      visible: true,
      complete: accountReady,
      current: activeStep === 0,
      status: s.loadingAccounts ? '搜索中' : (s.loadingSession ? '连接中' : (accountReady ? '已选择' : '当前')),
    });
    toggleRegion('studentAccountSummary', accountReady && activeStep !== 0);
    toggleRegion('studentAccountStepBody', activeStep === 0);
    if (accountReady) {
      $('studentAccountSummaryTitle').textContent = s.selectedAccount.username || '(未命名学生)';
      $('studentAccountSummaryMeta').textContent = [s.selectedAccount.account, s.selectedAccount.tenantName].filter(Boolean).join(' / ');
      const env = normalizeEnv(s.selectedAccount.env);
      const localPort = normalizePort(s.selectedAccount.localPort);
      const summaryActions = $('studentAccountSummaryActions');
      const summaryChanged = setHtmlIfChanged(summaryActions, {
        id: s.selectedAccount.loginId,
        tenantId: s.selectedAccount.tenantId,
        env,
        localPort,
      }, '<div class="quick-summary-target">' +
        actionTargetControls({
          id: s.selectedAccount.loginId,
          tenantName: s.selectedAccount.tenantName,
          userName: s.selectedAccount.username,
        }, env, localPort, !s.selectedAccount.loginId || !s.selectedAccount.tenantId) +
        '</div>' +
        actionButtons({
          id: s.selectedAccount.loginId,
          tenantId: s.selectedAccount.tenantId,
          tenantName: s.selectedAccount.tenantName,
          domain: s.selectedAccount.domain,
          industry: s.selectedAccount.industry,
          userName: s.selectedAccount.username,
          role: 'student',
          env,
          localPort,
        }, !s.selectedAccount.loginId || !s.selectedAccount.tenantId));
      if (summaryChanged) syncActionTarget(summaryActions, env, localPort);
    } else {
      setHtmlIfChanged($('studentAccountSummaryActions'), 'empty', '');
    }
    setInlineStatus(
      'accountSessionStatus',
      s.loadingSession ? '正在建立 AI 会话...' : (!accountReady && s.relationError ? s.relationError : ''),
      !accountReady && s.relationError ? 'error' : '',
    );
    renderAccountUsers();
    renderStudentRelationShell();
    if (activeStep === 1) {
      if (s.selectedClassId) renderRelationTeachers(s.selectedClassId);
      else if (!s.selectedStudent) clearRelationTeacherResult('请选择学生或班级');
    }
    renderProgress();
    persistStateSoon();
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
    invalidateRelationTeacherResolution();
    s.relationError = '';
    s.semesters = [];
    s.semesterId = preferredSemesterId;
    s.classes = [];
    s.classTeacherMap = {};
    s.matchedStudents = [];
    s.matchedBy = '';
    s.selectedStudent = null;
    s.selectedClassId = '';
    s.editingRelationSelection = false;
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
    invalidateRelationTeacherResolution();
    s.selectedStudent = student;
    const matchedClass = tenant.findStudentClass(student, s.classes);
    s.selectedClassId = matchedClass?.id || '';
    s.editingRelationSelection = false;
    renderMatchedStudents();
    if (!matchedClass) {
      clearRelationTeacherResult((student.name || '该学生') + '的班级无法唯一识别');
      renderRelationClasses();
      return;
    }
    renderStudentRelationShell();
    renderRelationTeachers(matchedClass.id);
  }

  function switchRelationMode(mode) {
    const s = state.student;
    const nextMode = mode === 'class' ? 'class' : 'student';
    if (nextMode === s.relationMode) {
      s.editingRelationSelection = true;
      renderStudentRelationShell();
      return;
    }
    invalidateRelationTeacherResolution();
    s.relationMode = nextMode;
    s.editingRelationSelection = true;
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
    const relationRequestId = s.relationRequestId;
    const teacherResolveRequestId = invalidateRelationTeacherResolution();
    const cls = s.classes.find((item) => String(item.id) === String(classId));
    if (!cls) {
      clearRelationTeacherResult('未找到对应班级');
      return;
    }
    const rawTeachers = s.classTeacherMap[String(classId)] || [];
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
    updateRelationBusy();
    list.innerHTML = '<div class="list-empty">正在反查教师租户账号…</div>';

    // 无论后台账号反查是否成功，都保留 AI 平台返回的关系记录。反查失败时
    // 只禁用登录相关操作，避免用户误以为班级没有教师或丢失关系上下文。
    const renderRows = (teachers, note) => {
      list.innerHTML = '';
      teachers.forEach((teacherItem) => {
        const env = normalizeEnv(teacherItem.env);
        const localPort = normalizePort(teacherItem.localPort);
        const row = document.createElement('div');
        row.className = 'list-item lookup-teacher-item quick-action-row quick-target-container' + (!teacherItem.loginId ? ' relation-disabled' : '');
        row.dataset.env = env;
        row.dataset.localPort = localPort;
        const duties = teacherItem.duties?.length
          ? '<div class="lookup-teacher-duties">' + teacherItem.duties.map((duty) => '<span class="teacher-badge teach">' + escapeHtml(duty) + '</span>').join('') + '</div>'
          : '';
        const accountText = teacherItem.loginAccount || teacherItem.account || teacherItem.userId || '未解析后台账号';
        const unresolvedText = !teacherItem.loginId ? ' · 关系字段未反查到后台账号' : '';
        row.innerHTML = '<div class="list-item-content"><div class="list-item-title">' +
          escapeHtml(teacherItem.loginName || teacherItem.name || '(未命名)') + '</div><div class="list-item-meta">' +
          escapeHtml(accountText) + unresolvedText + (note ? ' · ' + escapeHtml(note) : '') + '</div>' + duties + '</div>' +
          '<div class="quick-user-toolbar">' +
          actionTargetControls({
            id: teacherItem.loginId,
            tenantName: teacherItem.tenantName,
            userName: teacherItem.loginName || teacherItem.name,
          }, env, localPort, !teacherItem.loginId) +
          actionButtons({
            id: teacherItem.loginId,
            tenantId: teacherItem.tenantId,
            tenantName: teacherItem.tenantName,
            domain: teacherItem.domain,
            industry: teacherItem.industry,
            userName: teacherItem.loginName || teacherItem.name,
            role: 'teacher',
            env,
            localPort,
          }, !teacherItem.loginId) +
          '</div>';
        syncActionTarget(row, env, localPort);
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
      if (relationRequestId !== s.relationRequestId || teacherResolveRequestId !== s.teacherResolveRequestId || s.selectedClassId !== String(classId)) return;
      renderRows(resolved, '');
    } catch (error) {
      if (relationRequestId !== s.relationRequestId || teacherResolveRequestId !== s.teacherResolveRequestId || s.selectedClassId !== String(classId)) return;
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
      if (relationRequestId === s.relationRequestId && teacherResolveRequestId === s.teacherResolveRequestId) {
        s.resolvingTeachers = false;
        updateRelationBusy();
        persistStateSoon();
      }
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
    s.accountError = '';
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

  function changeTeacherTenant() {
    navigateToStep('teacher', 0);
  }

  function changeTeacherUser() {
    navigateToStep('teacher', 1);
  }

  function changeTeacherIdentity() {
    navigateToStep('teacher', 2);
  }

  function changeStudentAccount() {
    navigateToStep('student', 0);
  }

  function changeRelationSelection() {
    const s = state.student;
    s.editingRelationSelection = true;
    renderStudentRelationShell();
    focusControl(s.relationMode === 'class' ? 'lookupClassSelect' : 'lookupByStudentBtn');
  }

  // ── 登录操作与最近记录 ──

  function actionMeta(button) {
    return {
      id: button.dataset.id || '',
      tenantId: button.dataset.tenantId || '',
      tenantName: button.dataset.tenantName || '',
      domain: button.dataset.domain || '',
      industry: button.dataset.industry || '',
      userName: button.dataset.userName || '',
      role: button.dataset.role || 'teacher',
      env: normalizeEnv(button.dataset.env),
      localPort: normalizePort(button.dataset.localPort),
    };
  }

  async function performLoginAction(meta, action, button, row) {
    if (!meta.id || !meta.tenantId || state.loadingLogin) return;
    const allActions = [...document.querySelectorAll('#quickLoginBody .action-btn, #quickLoginBody .recent-action-btn')];
    const disabledStates = new Map(allActions.map((item) => [item, item.disabled]));
    const original = button?.innerHTML || '';
    const originalLabel = button?.getAttribute('aria-label') || '';
    let refreshRecentAfter = false;
    state.loadingLogin = true;
    allActions.forEach((item) => { item.disabled = true; });
    if (row) row.setAttribute('aria-busy', 'true');
    if (button) {
      button.innerHTML = '<span class="spinner"></span>';
      button.setAttribute('aria-label', '处理中');
    }
    setActionStatus(action === 'copy' ? '正在获取 Token query...' : '正在获取登录链接...');
    try {
      const env = meta.env === 'local' ? 'local' : 'online';
      const savedLocalPort = meta.localPort ? normalizePort(meta.localPort) : '';
      const targetLocalPort = env === 'local' ? normalizePort(meta.localPort) : '';
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
        if (!copied) throw new Error('复制失败，请检查浏览器剪贴板权限');
        setActionStatus('已复制 Token query', 'success');
        setStatus('已复制 ?token=…', 'ok');
        return;
      }
      const result = await request('QUICK_LOGIN', Object.assign({}, meta, { env, localPort: savedLocalPort }));
      url = result.url;
      if (!url || typeof url !== 'string') throw new Error('virtualLogin 未返回有效 URL');
      let target = url;
      if (action === 'student') target = buildEvaluateUrl(url, '/student-evaluate', targetLocalPort);
      else if (action === 'teacher') target = buildEvaluateUrl(url, '/teacher-evaluate', targetLocalPort);
      else target = buildDirectUrl(url, targetLocalPort);
      await request('OPEN_LOGIN_URL', { url: target });
      const successText = action === 'open' ? '已打开 AI 平台' : '已打开评价页面';
      setActionStatus(successText, 'success');
      setStatus(successText, 'ok');
      refreshRecentAfter = true;
    } catch (error) {
      setActionStatus(error.message, 'error');
      setStatus(error.message, 'err');
    } finally {
      state.loadingLogin = false;
      disabledStates.forEach((wasDisabled, item) => { item.disabled = wasDisabled; });
      if (row) row.removeAttribute('aria-busy');
      if (button) {
        button.innerHTML = original;
        if (originalLabel) button.setAttribute('aria-label', originalLabel);
      }
      if (refreshRecentAfter) await renderRecent();
    }
  }

  function onActionClick(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) return;
    performLoginAction(
      actionMeta(button),
      button.dataset.action,
      button,
      button.closest('.quick-stage-summary, .list-item'),
    );
  }

  function actionTargetControls(meta, env, localPort, disabled = false) {
    const online = env === 'online';
    const unavailable = disabled ? ' disabled aria-disabled="true"' : '';
    const label = (meta.tenantName || '未知租户') + ' ' + (meta.userName || meta.id || '') + ' 登录环境';
    return '<div class="quick-recent-env-switcher quick-user-env-switcher" role="group" aria-label="' + escapeHtml(label) + '">' +
        '<button class="quick-recent-env-btn quick-user-env-btn' + (online ? ' active' : '') + '" type="button" data-target-env="online" aria-pressed="' + online + '"' + unavailable + '>线上</button>' +
        '<button class="quick-recent-env-btn quick-user-env-btn' + (!online ? ' active' : '') + '" type="button" data-target-env="local" aria-pressed="' + (!online) + '"' + unavailable + '>本地</button>' +
      '</div>' +
      '<label class="quick-recent-port-field quick-user-port-field' + (online ? ' hidden' : '') + '"><span>端口</span>' +
        '<input class="quick-recent-port quick-user-port" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="本地端口" value="' + escapeHtml(localPort) + '"' + unavailable + '>' +
      '</label>';
  }

  function syncActionTarget(container, env, localPort, syncInput = true) {
    if (!container) return;
    const normalizedEnv = normalizeEnv(env);
    const normalizedPort = normalizePort(localPort);
    container.dataset.env = normalizedEnv;
    container.dataset.localPort = normalizedPort;
    container.querySelectorAll('.quick-user-env-btn').forEach((button) => {
      const active = button.dataset.targetEnv === normalizedEnv;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    container.querySelector('.quick-user-port-field')?.classList.toggle('hidden', normalizedEnv !== 'local');
    const input = container.querySelector('.quick-user-port');
    if (input && syncInput) input.value = normalizedPort;
    container.querySelectorAll('.action-btn').forEach((button) => {
      button.dataset.env = normalizedEnv;
      button.dataset.localPort = normalizedPort;
      const baseLabel = button.dataset.baseLabel || button.getAttribute('aria-label') || '';
      button.dataset.baseLabel = baseLabel;
      const targetLabel = normalizedEnv === 'local' ? '本地端口 ' + normalizedPort : '线上';
      const label = baseLabel + '（' + targetLabel + '）';
      button.title = label;
      button.setAttribute('aria-label', label);
    });
  }

  function persistSummaryTarget(container) {
    if (container?.closest('#teacherUserSummary')) {
      const t = state.teacher;
      if (!t.selectedUser) return;
      t.selectedUser = Object.assign({}, t.selectedUser, {
        env: normalizeEnv(container.dataset.env),
        localPort: normalizePort(container.dataset.localPort),
      });
      persistStateSoon();
      return;
    }
    if (container?.closest('#studentAccountSummary')) {
      const s = state.student;
      if (!s.selectedAccount) return;
      s.selectedAccount = Object.assign({}, s.selectedAccount, {
        env: normalizeEnv(container.dataset.env),
        localPort: normalizePort(container.dataset.localPort),
      });
      persistStateSoon();
    }
  }

  function onActionTargetClick(event) {
    const envButton = event.target.closest('.quick-user-env-btn');
    if (!envButton) return;
    event.preventDefault();
    event.stopPropagation();
    const container = envButton.closest('.quick-target-container');
    const input = container?.querySelector('.quick-user-port');
    syncActionTarget(container, envButton.dataset.targetEnv, input?.value || container?.dataset.localPort);
    persistSummaryTarget(container);
  }

  function onActionTargetPortInput(event, commit) {
    const input = event.target.closest('.quick-user-port');
    if (!input) return;
    const container = input.closest('.quick-target-container');
    if (!container) return;
    syncActionTarget(container, container.dataset.env, input.value, commit);
    if (commit) persistSummaryTarget(container);
  }

  function recentTargetControls(record, env, localPort) {
    const online = env === 'online';
    const label = (record.tenantName || '未知租户') + ' ' + (record.userName || record.id || '') + ' 登录环境';
    return '<div class="quick-recent-target-controls">' +
      '<div class="quick-recent-env-switcher" role="group" aria-label="' + escapeHtml(label) + '">' +
        '<button class="quick-recent-env-btn' + (online ? ' active' : '') + '" type="button" data-recent-env="online" aria-pressed="' + online + '">线上</button>' +
        '<button class="quick-recent-env-btn' + (!online ? ' active' : '') + '" type="button" data-recent-env="local" aria-pressed="' + (!online) + '">本地</button>' +
      '</div>' +
      '<label class="quick-recent-port-field' + (online ? ' hidden' : '') + '"><span>端口</span>' +
        '<input class="quick-recent-port" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="本地端口" value="' + escapeHtml(localPort) + '">' +
      '</label>' +
    '</div>';
  }

  function syncRecentRowTarget(row, env, localPort, syncInput = true) {
    if (!row) return;
    const normalizedEnv = normalizeEnv(env);
    const normalizedPort = normalizePort(localPort);
    row.dataset.env = normalizedEnv;
    row.dataset.localPort = normalizedPort;
    row.querySelectorAll('.quick-recent-env-btn').forEach((button) => {
      const active = button.dataset.recentEnv === normalizedEnv;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    row.querySelector('.quick-recent-port-field')?.classList.toggle('hidden', normalizedEnv !== 'local');
    const input = row.querySelector('.quick-recent-port');
    if (input && syncInput) input.value = normalizedPort;
    row.querySelectorAll('.recent-action-btn').forEach((button) => {
      button.dataset.env = normalizedEnv;
      button.dataset.localPort = normalizedPort;
      const baseLabel = button.dataset.baseLabel || button.getAttribute('aria-label') || '';
      const targetLabel = normalizedEnv === 'local' ? '本地端口 ' + normalizedPort : '线上';
      const label = button.dataset.action === 'delete' || button.dataset.action === 'apply'
        ? baseLabel
        : baseLabel + '（' + targetLabel + '）';
      button.title = label;
      button.setAttribute('aria-label', label);
    });
  }

  function onRecentPortInput(event, commit) {
    const input = event.target.closest('.quick-recent-port');
    if (!input) return;
    const row = input.closest('.quick-recent-row');
    if (!row) return;
    syncRecentRowTarget(row, row.dataset.env, input.value, commit);
  }

  async function renderRecent() {
    const list = $('recentList');
    const count = $('quickRecentCount');
    if (!list) return;
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = '<div class="recent-empty">正在读取最近登录...</div>';
    let records = [];
    try {
      const response = await request('GET_QUICK_LOGIN_RECENT');
      records = Array.isArray(response.records) ? response.records : (Array.isArray(response) ? response : []);
    } catch (error) {
      list.innerHTML = '<div class="recent-empty">' + escapeHtml(error.message || '最近登录读取失败') + '</div>';
      if (count) count.textContent = '读取失败';
      list.removeAttribute('aria-busy');
      return;
    }
    list.innerHTML = '';
    const allRecords = records.slice(0, 10);
    records = allRecords.filter((record) => {
      if (state.recentRoleFilter && record.role !== state.recentRoleFilter) return false;
      if (state.recentEnvFilter && normalizeEnv(record.env) !== state.recentEnvFilter) return false;
      return true;
    });
    if (count) {
      count.textContent = records.length === allRecords.length
        ? `${allRecords.length} 条`
        : `${records.length}/${allRecords.length} 条`;
    }
    if (!allRecords.length) {
      list.innerHTML = '<div class="recent-empty">暂无最近登录记录</div>';
      list.removeAttribute('aria-busy');
      return;
    }
    if (!records.length) {
      list.innerHTML = '<div class="recent-empty">暂无符合筛选条件的记录</div>';
      list.removeAttribute('aria-busy');
      return;
    }
    const shown = state.recentExpanded ? records : records.slice(0, DEFAULT_RECENT_VISIBLE);
    shown.forEach((record) => {
      const env = normalizeEnv(record.env);
      const localPort = normalizePort(record.localPort);
      const row = document.createElement('div');
      row.className = 'recent-item quick-recent-row';
      row.dataset.env = env;
      row.dataset.localPort = localPort;
      row.innerHTML = '<div class="recent-item-info"><div class="recent-item-text"><span class="recent-role-badge">' +
        (record.role === 'student' ? '学生' : '教师') + '</span>' +
        escapeHtml(record.tenantName || '(未知租户)') + ' · ' + escapeHtml(record.userName || record.id) +
        '</div><div class="recent-item-time">' + escapeHtml(record.at ? new Date(record.at).toLocaleString() : '') + '</div></div>' +
        '<div class="recent-item-actions quick-recent-actions-main">' +
        recentActionButton('open', record, env, localPort, '打开 AI 平台') +
        recentActionButton('copy', record, env, localPort, '复制 AI 平台 Token query') +
        recentActionButton('student', record, env, localPort, '学生评价') +
        recentActionButton('teacher', record, env, localPort, '教师评价') +
        '</div>' +
        recentTargetControls(record, env, localPort) +
        '<div class="recent-item-actions quick-recent-actions-aux">' +
        recentActionButton('apply', record, env, localPort, '应用到教师查学生') +
        recentActionButton('delete', record, env, localPort, '删除记录', true) +
        '</div>';
      list.appendChild(row);
      syncRecentRowTarget(row, env, localPort);
    });
    if (records.length > DEFAULT_RECENT_VISIBLE) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'load-more';
      more.setAttribute('aria-expanded', String(state.recentExpanded));
      more.textContent = state.recentExpanded ? '收起' : '显示更多 (' + (records.length - shown.length) + ' 条)';
      more.addEventListener('click', () => {
        state.recentExpanded = !state.recentExpanded;
        renderRecent();
      });
      list.appendChild(more);
    }
    list.removeAttribute('aria-busy');
  }

  function recentActionButton(action, record, env, localPort, title, danger) {
    const attrs = [
      'data-action="' + action + '"',
      'data-base-label="' + escapeHtml(title) + '"',
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
    const disabledForRole = action === 'apply' && record.role !== 'teacher';
    const unavailable = !record.id || !record.tenantId || state.loadingLogin || disabledForRole ||
      (action !== 'delete' && state.adminTokenAvailable === false);
    const disabled = unavailable ? ' disabled aria-disabled="true"' : '';
    const primary = action === 'open' ? ' quick-recent-action-primary' : '';
    const apply = action === 'apply' ? ' quick-recent-action-apply' : '';
    return '<button class="recent-action-btn quick-recent-action' + primary + apply + (danger ? ' danger' : '') + '" type="button" ' + attrs + disabled + ' title="' + escapeHtml(title) + '" aria-label="' + escapeHtml(title) + '">' + icons[action === 'delete' ? 'delete' : action] + '</button>';
  }

  async function applyRecentToTeacherLookup(meta, button, row) {
    let selection;
    try {
      selection = buildRecentTeacherSelection(meta);
    } catch (error) {
      setActionStatus(error.message, 'error');
      setStatus(error.message, 'err');
      return;
    }
    if (state.loadingLogin) return;

    switchMode('teacher');
    const allActions = [...document.querySelectorAll('#quickLoginBody .action-btn, #quickLoginBody .recent-action-btn')];
    const disabledStates = new Map(allActions.map((item) => [item, item.disabled]));
    const original = button?.innerHTML || '';
    const originalLabel = button?.getAttribute('aria-label') || '';
    state.loadingLogin = true;
    allActions.forEach((item) => { item.disabled = true; });
    row?.setAttribute('aria-busy', 'true');
    if (button) {
      button.disabled = true;
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-label', '正在应用到教师查学生');
      button.innerHTML = '<span class="spinner" aria-hidden="true"></span>';
    }
    setActionStatus('正在应用最近登录信息...');

    try {
      const t = state.teacher;
      clearTeacherSession();
      t.selectedTenant = selection.selectedTenant;
      t.tenantKeyword = selection.selectedTenant.tenantName;
      t.tenantRecords = [
        selection.selectedTenant,
        ...(t.tenantRecords || []).filter((item) => item.tenantId !== selection.selectedTenant.tenantId),
      ];
      t.userKeyword = selection.selectedUser.userName;
      t.userPage = resetPage();
      t.userPage.total = 1;
      t.userPage.records = [selection.selectedUser];
      t.teacherNameKeyword = '';
      t.teacherAccountKeyword = '';
      t.studentNameKeyword = '';
      t.studentCodeKeyword = '';
      $('tenantSearch').value = selection.selectedTenant.tenantName;
      $('tenantList').classList.add('hidden');
      $('userSearch').value = selection.selectedUser.userName;
      $('teacherNameSearch').value = '';
      $('teacherAccountSearch').value = '';
      $('studentNameSearch').value = '';
      $('studentCodeSearch').value = '';
      renderTeacherShell();
      $('teacherModePanel')?.scrollIntoView({ block: 'start' });

      const selected = await selectTeacherUser(selection.selectedUser, {
        dataset: { env: selection.env, localPort: selection.localPort },
      });
      if (!selected) throw new Error(t.sessionError || '最近登录账号应用失败');
      if (!t.selectedTeacher) {
        throw new Error(t.teacherError || '未找到与该账号对应的 AI 教师');
      }
      if (t.studentError) throw new Error(t.studentError);
      setActionStatus('已应用最近登录信息', 'success');
      setStatus('已应用并查询相关学生', 'ok');
    } catch (error) {
      setActionStatus(error.message, 'error');
      setStatus(error.message, 'err');
    } finally {
      state.loadingLogin = false;
      disabledStates.forEach((wasDisabled, item) => { item.disabled = wasDisabled; });
      row?.removeAttribute('aria-busy');
      if (button) {
        button.classList.remove('is-loading');
        button.removeAttribute('aria-busy');
        button.innerHTML = original;
        if (originalLabel) button.setAttribute('aria-label', originalLabel);
      }
      renderTeacherShell();
    }
  }

  async function onRecentClick(event) {
    const envButton = event.target.closest('.quick-recent-env-btn');
    if (envButton) {
      event.preventDefault();
      event.stopPropagation();
      const row = envButton.closest('.quick-recent-row');
      const input = row?.querySelector('.quick-recent-port');
      syncRecentRowTarget(row, envButton.dataset.recentEnv, input?.value || row?.dataset.localPort);
      return;
    }

    const button = event.target.closest('.recent-action-btn');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (state.loadingLogin || button.disabled) return;
    const meta = actionMeta(button);
    const action = button.dataset.action;
    if (action === 'apply') {
      await applyRecentToTeacherLookup(meta, button, button.closest('.recent-item'));
      return;
    }
    if (action === 'delete') {
      const row = button.closest('.recent-item');
      row?.setAttribute('aria-busy', 'true');
      button.disabled = true;
      setActionStatus('正在删除最近登录记录...');
      try {
        await request('DELETE_QUICK_LOGIN_RECENT', {
          tenantId: meta.tenantId,
          id: meta.id,
          role: meta.role,
        });
        setActionStatus('已删除最近登录记录', 'success');
        setStatus('已删除最近登录记录', 'ok');
        await renderRecent();
      } catch (error) {
        button.disabled = false;
        row?.removeAttribute('aria-busy');
        setActionStatus(error.message, 'error');
        setStatus(error.message, 'err');
      }
      return;
    }
    await performLoginAction(meta, action, button, button.closest('.recent-item'));
  }

  // ── 事件绑定 / 初始化 ──

  function bindEvents() {
    const header = $('quickLoginHeader');
    if (header) {
      const toggleSection = () => {
        state.expanded = !state.expanded;
        $('quickLoginSection')?.classList.toggle('expanded', state.expanded);
        header.setAttribute('aria-expanded', String(state.expanded));
      };
      header.addEventListener('click', toggleSection);
      header.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggleSection();
      });
    }
    $('modeTeacherBtn')?.addEventListener('click', () => switchMode('teacher'));
    $('modeStudentBtn')?.addEventListener('click', () => switchMode('student'));
    $('quickStepProgressTrack')?.addEventListener('click', onProgressClick);
    document.querySelector('.quick-mode-switcher')?.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const nextMode = event.key === 'ArrowLeft' || event.key === 'Home' ? 'teacher' : 'student';
      switchMode(nextMode);
      $(nextMode === 'teacher' ? 'modeTeacherBtn' : 'modeStudentBtn')?.focus();
    });
    const tenantSearch = $('tenantSearch');
    const scheduleTenantSearch = createDebouncedSearch((keyword) => {
      const t = state.teacher;
      t.tenantRequestId += 1;
      t.loadingTenants = false;
      t.tenantRecords = [];
      if (t.selectedTenant) {
        t.selectedTenant = null;
        t.userPage = resetPage();
        clearTeacherSession();
      }
      t.tenantKeyword = keyword;
      renderTeacherShell();
      setInlineStatus('tenantSearchStatus', keyword ? '等待搜索...' : '');
      clearList('tenantList', 'tenantEmpty', keyword ? '等待搜索...' : '请输入租户条件');
    }, () => loadTenants());
    tenantSearch?.addEventListener('input', () => {
      if (state.mode !== 'teacher') return;
      scheduleTenantSearch(tenantSearch.value.trim());
    });

    const userSearch = $('userSearch');
    const scheduleUserSearch = createDebouncedSearch((keyword) => {
      const t = state.teacher;
      t.userRequestId += 1;
      t.loadingUsers = false;
      t.userError = '';
      if (t.selectedUser) clearTeacherSession();
      t.userKeyword = keyword;
      t.userPage = resetPage();
      renderTeacherShell();
      clearList('userList', 'userEmpty', '等待搜索...');
      const pager = $('userPager');
      if (pager) {
        pager.innerHTML = '';
        pager.classList.add('hidden');
      }
    }, () => loadTeacherUsers(true));
    userSearch?.addEventListener('input', () => {
      if (state.mode !== 'teacher') return;
      scheduleUserSearch(userSearch.value.trim());
    });

    const invalidateTeacherSearch = () => {
      const t = state.teacher;
      t.teacherRequestId += 1;
      t.teacherDetailRequestId += 1;
      t.studentRequestId += 1;
      t.loadingTeachers = false;
      t.loadingDuties = false;
      t.loadingStudents = false;
      t.teacherError = '';
      t.selectedTeacher = null;
      t.teacherPage = resetPage();
      t.studentPage = resetPage();
      t.classIds = [];
      renderTeacherShell();
      clearList('teacherList', 'teacherEmpty', '等待搜索...');
      const pager = $('teacherPager');
      if (pager) {
        pager.innerHTML = '';
        pager.classList.add('hidden');
      }
    };
    const scheduleTeacherSearch = createDebouncedSearch(invalidateTeacherSearch, () => loadTeachers(true));
    const teacherName = $('teacherNameSearch');
    teacherName?.addEventListener('input', () => {
      if (state.mode !== 'teacher') return;
      state.teacher.teacherNameKeyword = teacherName.value.trim();
      scheduleTeacherSearch();
    });
    const teacherAccount = $('teacherAccountSearch');
    teacherAccount?.addEventListener('input', () => {
      if (state.mode !== 'teacher') return;
      state.teacher.teacherAccountKeyword = teacherAccount.value.trim();
      scheduleTeacherSearch();
    });

    const invalidateTeacherStudentSearch = () => {
      const t = state.teacher;
      t.studentRequestId += 1;
      t.loadingStudents = false;
      t.studentPage = resetPage();
      renderTeacherStudentArea('等待搜索...');
    };
    const scheduleTeacherStudentSearch = createDebouncedSearch(
      invalidateTeacherStudentSearch,
      () => loadTeacherStudents(true, state.teacher.teacherDetailRequestId),
    );
    const studentName = $('studentNameSearch');
    studentName?.addEventListener('input', () => {
      if (state.mode !== 'teacher') return;
      state.teacher.studentNameKeyword = studentName.value.trim();
      scheduleTeacherStudentSearch();
    });
    const studentCode = $('studentCodeSearch');
    studentCode?.addEventListener('input', () => {
      if (state.mode !== 'teacher') return;
      state.teacher.studentCodeKeyword = studentCode.value.trim();
      scheduleTeacherStudentSearch();
    });
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
      persistStateSoon();
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
      persistStateSoon();
      scheduleAccountSearch();
    });
    $('changeTeacherTenantBtn')?.addEventListener('click', changeTeacherTenant);
    $('changeTeacherUserBtn')?.addEventListener('click', changeTeacherUser);
    $('changeTeacherIdentityBtn')?.addEventListener('click', changeTeacherIdentity);
    $('changeStudentAccountBtn')?.addEventListener('click', changeStudentAccount);
    $('changeRelationSelectionBtn')?.addEventListener('click', changeRelationSelection);
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
      invalidateRelationTeacherResolution();
      state.student.selectedStudent = null;
      state.student.selectedClassId = String(event.target.value || '');
      state.student.editingRelationSelection = !state.student.selectedClassId;
      if (state.student.selectedClassId) renderRelationTeachers(state.student.selectedClassId);
      else clearRelationTeacherResult('请选择班级');
      renderRelationClasses();
      renderStudentRelationShell();
    });
    $('studentAppSiteUrl')?.addEventListener('change', () => validateStudentAppSiteInput(true));
    $('quickLoginBody')?.addEventListener('click', onActionClick);
    $('quickLoginBody')?.addEventListener('click', onActionTargetClick);
    $('quickLoginBody')?.addEventListener('input', (event) => onActionTargetPortInput(event, false));
    $('quickLoginBody')?.addEventListener('change', (event) => onActionTargetPortInput(event, true));
    $('recentList')?.addEventListener('click', onRecentClick);
    $('recentList')?.addEventListener('input', (event) => onRecentPortInput(event, false));
    $('recentList')?.addEventListener('change', (event) => onRecentPortInput(event, true));
    $('quickHistoryRoleFilter')?.addEventListener('change', (event) => {
      state.recentRoleFilter = event.target.value || '';
      state.recentExpanded = false;
      renderRecent();
    });
    $('quickHistoryEnvFilter')?.addEventListener('change', (event) => {
      state.recentEnvFilter = event.target.value || '';
      state.recentExpanded = false;
      renderRecent();
    });
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !Object.keys(changes).some((key) => key.startsWith('adminToken:'))) return;
        hasAdminToken().then(async () => {
          await rehydratePersistedSessions();
          renderTeacherShell();
          renderStudentShell();
          renderRecent();
        }).catch(() => {});
      });
    }
    window.addEventListener('pagehide', () => { flushPersistedState(); });
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    await loadPersistedState();
    renderShell();
    bindEvents();
    await loadStudentAppSiteUrl();
    const section = $('quickLoginSection');
    state.expanded = true;
    section?.classList.add('expanded');
    $('quickLoginHeader')?.setAttribute('aria-expanded', 'true');
    restoreFormValues();
    updateModeUI();
    await hasAdminToken();
    if (!state.teacher.selectedTenant && state.teacher.tenantKeyword) {
      renderTenantList(state.teacher.tenantRecords);
    }
    renderTeacherShell();
    renderTeacherStudents();
    renderStudentShell();
    await renderRecent();
  }

  function activate() {
    if (activationPromise) return activationPromise;
    activationPromise = (async () => {
      await hasAdminToken();
      await rehydratePersistedSessions();
      renderTeacherShell();
      renderTeacherStudents();
      renderStudentShell();
      await renderRecent();
    })();
    return activationPromise;
  }

  const quickLoginUi = { init, activate };
  ns.quickLoginUi = quickLoginUi;
  /* 截图/冒烟测试用：以假数据直渲染租户用户列表（不触网、不绑选择事件） */
  ns.quickLoginUiDebug = {
    renderTeacherUsersForShot(selectedTenant, records, current) {
      const t = state.teacher;
      t.selectedTenant = selectedTenant;
      t.userPage = { current: current || 1, size: 10, total: records.length, records };
      renderTeacherUsers({
        $: (id) => (id === 'userPager' ? null : $(id)),
      });
    },
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      actionMeta,
      buildRecentTeacherSelection,
      buildStudentCredentialsText,
      buildStudentAppLoginPayload,
      createDebouncedSearch,
      createPersistedState,
      getStudentReachableStep,
      getTeacherReachableStep,
      normalizeAppSiteUrl,
      renderTeacherUsers,
      restorePersistedState,
      state,
    };
  }
})();
