/* 内部开发工具箱 — Popup 快捷登录 UI */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit;
  const tenantHelpers = ns.tenant;
  const messages = ns.messages;

  const DEFAULT_DEV_PORT = '8088';

  const IDs = {
    section: 'quickLoginSection',
    header: 'quickLoginHeader',
    body: 'quickLoginBody',
    envBadge: 'envBadge',
    envOnlineBtn: 'envOnlineBtn',
    envDevBtn: 'envDevBtn',
    portField: 'portField',
    localPort: 'localPort',
    tenantSearch: 'tenantSearch',
    tenantList: 'tenantList',
    tenantEmpty: 'tenantEmpty',
    deptSelect: 'deptSelect',
    userSearch: 'userSearch',
    userList: 'userList',
    userEmpty: 'userEmpty',
    pager: 'userPager',
    teacherLookupRefreshBtn: 'teacherLookupRefreshBtn',
    teacherLookupSemesterSelect: 'teacherLookupSemesterSelect',
    teacherLookupEmpty: 'teacherLookupEmpty',
    teacherLookupContent: 'teacherLookupContent',
    lookupByStudentBtn: 'lookupByStudentBtn',
    lookupByClassBtn: 'lookupByClassBtn',
    lookupStudentPanel: 'lookupStudentPanel',
    lookupStudentNameSearch: 'lookupStudentNameSearch',
    lookupStudentCodeSearch: 'lookupStudentCodeSearch',
    lookupStudentList: 'lookupStudentList',
    lookupStudentEmpty: 'lookupStudentEmpty',
    lookupStudentPager: 'lookupStudentPager',
    lookupClassPanel: 'lookupClassPanel',
    lookupClassSelect: 'lookupClassSelect',
    lookupTeacherResultHead: 'lookupTeacherResultHead',
    lookupTeacherResultTitle: 'lookupTeacherResultTitle',
    lookupTeacherResultCount: 'lookupTeacherResultCount',
    lookupTeacherList: 'lookupTeacherList',
    lookupTeacherEmpty: 'lookupTeacherEmpty',
    teacherList: 'teacherList',
    teacherEmpty: 'teacherEmpty',
    teacherPager: 'teacherPager',
    teacherRefreshBtn: 'teacherRefreshBtn',
    teacherNameSearch: 'teacherNameSearch',
    teacherAccountSearch: 'teacherAccountSearch',
    studentSection: 'studentSection',
    studentSectionTitle: 'studentSectionTitle',
    studentRefreshBtn: 'studentRefreshBtn',
    studentNameSearch: 'studentNameSearch',
    studentCodeSearch: 'studentCodeSearch',
    teacherDuties: 'teacherDuties',
    studentList: 'studentList',
    studentEmpty: 'studentEmpty',
    studentPager: 'studentPager',
    recent: 'recentList',
  };

  // SVG icons
  const icons = {
    open: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    copy: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    student: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    teacher: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    delete: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  };

  let state = {
    expanded: false,
    selectedTenant: null,
    deptId: '',
    userKeyword: '',
    userPage: { current: 1, size: 10, total: 0, records: [] },
    loadingTenants: false,
    loadingUsers: false,
    loadingLogin: false,
    tenantKeyword: '',
    recentExpanded: false,
    // 环境切换
    env: 'online', // 'online' | 'dev'
    devPort: DEFAULT_DEV_PORT,
    // 选中用户会话（virtualLogin 解析出的 origin + token）
    selectedUser: null,
    loadingSession: false,
    // 按学生 / 班级查询关联教师
    teacherLookupMode: 'student',
    teacherLookupSemesterId: '',
    teacherLookupSemesters: [],
    teacherLookupClasses: [],
    classTeacherMap: {},
    teacherLookupReady: false,
    teacherLookupLoading: false,
    teacherLookupError: '',
    teacherLookupRequestId: 0,
    lookupStudentPage: { current: 1, size: 10, total: 0, records: [] },
    lookupStudentNameKeyword: '',
    lookupStudentCodeKeyword: '',
    loadingLookupStudents: false,
    lookupStudentRequestId: 0,
    selectedLookupStudent: null,
    selectedLookupClassId: '',
    // 教师列表
    teacherPage: { current: 1, size: 10, total: 0, records: [] },
    loadingTeachers: false,
    selectedTeacher: null,
    teacherNameKeyword: '',
    teacherAccountKeyword: '',
    // 学生列表
    studentPage: { current: 1, size: 10, total: 0, records: [] },
    loadingStudents: false,
    studentNameKeyword: '',
    studentCodeKeyword: '',
    // 教师教学职务（选中教师后加载）
    loadingDuties: false,
  };

  function $(id) { return document.getElementById(IDs[id]); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function debounce(fn, ms) {
    let t = 0;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function setStatus(text, kind) {
    ns.ui.toast(text, kind);
  }

  async function hasAdminToken() {
    const t = await ns.token.getToken();
    return Boolean(t.token);
  }

  function updateEnvBadge() {
    const el = $('envBadge');
    if (!el) return;
    const projectName = ns.currentProject.getName();
    el.textContent = projectName;
    if (projectName.match(/生产|正式|prod/i)) {
      el.className = 'badge error';
    } else if (projectName.match(/预发布|预发|pre/i)) {
      el.className = 'badge warning';
    } else {
      el.className = 'badge success';
    }
  }

  // ── 环境切换 ──

  function getEffectivePort() {
    return state.env === 'dev' ? (state.devPort || DEFAULT_DEV_PORT) : '';
  }

  function getEnvForRequest() {
    return state.env === 'dev' ? 'local' : 'online';
  }

  function updateEnvUI() {
    const onlineBtn = $('envOnlineBtn');
    const devBtn = $('envDevBtn');
    const portField = $('portField');
    if (onlineBtn) onlineBtn.classList.toggle('active', state.env === 'online');
    if (devBtn) devBtn.classList.toggle('active', state.env === 'dev');
    if (portField) portField.classList.toggle('hidden', state.env !== 'dev');
  }

  function switchEnv(env) {
    state.env = env;
    updateEnvUI();
  }

  // ── 面板展开/收起 ──

  function toggleSection() {
    state.expanded = !state.expanded;
    const section = document.getElementById(IDs.section);
    section?.classList.toggle('expanded');
    if (state.expanded) {
      initIfNeeded();
      renderRecent();
    }
  }

  async function initIfNeeded() {
    const tokenOk = await hasAdminToken();
    if (!tokenOk) {
      setStatus('请先点击「API 登录」获取 admin token', 'err');
      return;
    }
    setStatus('', '');
    if (!$('tenantList').children.length && !state.tenantKeyword) {
      await loadTenants();
    }
  }

  // ── 租户 ──

  async function loadTenants() {
    if (state.loadingTenants) return;
    state.loadingTenants = true;
    setStatus('加载租户中...', '');
    try {
      const res = await messages.sendToBackground({
        type: 'FETCH_TENANTS',
        payload: { current: 1, size: 10, keyword: state.tenantKeyword },
      });
      if (!res || !res.ok) throw new Error(res?.error || '加载租户失败');
      const page = tenantHelpers.extractPageData(res.res);
      renderTenantList(page.records);
      setStatus('', '');
    } catch (err) {
      setStatus(err.message, 'err');
    } finally {
      state.loadingTenants = false;
    }
  }

  function renderTenantList(records) {
    const list = $('tenantList');
    const empty = $('tenantEmpty');
    list.innerHTML = '';
    if (!records || !records.length) {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    for (const item of records) {
      const t = tenantHelpers.normalizeTenant(item);
      const row = document.createElement('div');
      row.className = 'list-item' + (state.selectedTenant?.tenantId === t.tenantId ? ' active' : '');
      row.innerHTML =
        `<div class="list-item-content">` +
        `<div class="list-item-title">${escapeHtml(t.tenantName || '(未命名)')}</div>` +
        `<div class="list-item-meta">${escapeHtml(t.domain || t.contactPhone || t.tenantId)}</div>` +
        `</div>`;
      row.addEventListener('click', () => selectTenant(t));
      list.appendChild(row);
    }
  }

  async function selectTenant(tenant) {
    state.selectedTenant = tenant;
    state.deptId = '';
    state.userKeyword = '';
    state.userPage = { current: 1, size: 10, total: 0, records: [] };
    state.selectedUser = null;
    state.selectedTeacher = null;
    state.teacherPage = { current: 1, size: 10, total: 0, records: [] };
    state.studentPage = { current: 1, size: 10, total: 0, records: [] };

    $('tenantSearch').value = tenant.tenantName || '';
    $('tenantList').innerHTML = '';
    $('tenantList').classList.add('hidden');
    $('userSearch').value = '';
    $('userList').innerHTML = '';
    $('userList').classList.add('hidden');
    $('userEmpty').classList.add('hidden');
    $('pager').classList.add('hidden');

    // 重置教师/学生区域
    state.teacherNameKeyword = '';
    state.teacherAccountKeyword = '';
    const teacherNameInput = $('teacherNameSearch');
    if (teacherNameInput) teacherNameInput.value = '';
    const teacherAccountInput = $('teacherAccountSearch');
    if (teacherAccountInput) teacherAccountInput.value = '';
    resetTeacherUI();
    resetStudentUI();
    resetTeacherLookup();

    await loadUsers(true);
  }

  // ── 部门 ──

  async function loadDepts() {
    if (!state.selectedTenant) return;
    const deptSelect = $('deptSelect');
    deptSelect.innerHTML = '<option value="">全部部门</option>';
    try {
      const res = await messages.sendToBackground({
        type: 'FETCH_DEPTS',
        payload: { tenantId: state.selectedTenant.tenantId, industry: state.selectedTenant.industry },
      });
      if (!res || !res.ok) return;
      const list = tenantHelpers.extractListData(res.res);
      for (const item of list) {
        const d = tenantHelpers.normalizeDept(item);
        const opt = document.createElement('option');
        opt.value = d.deptId;
        opt.textContent = d.deptName || d.deptId;
        deptSelect.appendChild(opt);
      }
    } catch (_) {}
  }

  // ── 用户列表 ──

  async function loadUsers(reset = false) {
    if (!state.selectedTenant) return;
    if (state.loadingUsers) return;
    state.loadingUsers = true;
    if (reset) {
      state.userPage.current = 1;
      state.userPage.records = [];
      $('userList').innerHTML = '';
      $('userList').classList.add('hidden');
      $('userEmpty').classList.add('hidden');
      $('pager').classList.add('hidden');
    }
    setStatus('加载用户中...', '');
    try {
      const res = await messages.sendToBackground({
        type: 'FETCH_USERS',
        payload: {
          tenantId: state.selectedTenant.tenantId,
          deptId: state.deptId,
          industry: state.selectedTenant.industry,
          current: state.userPage.current,
          size: state.userPage.size,
          keyword: state.userKeyword,
        },
      });
      if (!res || !res.ok) throw new Error(res?.error || '加载用户失败');
      const page = tenantHelpers.extractPageData(res.res);
      state.userPage.total = page.total;
      state.userPage.records = page.records;
      renderUsers(state.userPage.records, page.total);
      setStatus('', '');
    } catch (err) {
      setStatus(err.message, 'err');
    } finally {
      state.loadingUsers = false;
    }
  }

  function renderUsers(records, total) {
    const list = $('userList');
    const empty = $('userEmpty');
    const pager = $('pager');
    list.innerHTML = '';
    if (!records || !records.length) {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
      pager.classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    for (const item of records) {
      const u = tenantHelpers.normalizeUser(item);
      const row = document.createElement('div');
      row.className = 'list-item fade-in' + (state.selectedUser?.id === u.id ? ' active' : '');
      const dataAttrs =
        `data-id="${escapeHtml(u.id)}" ` +
        `data-user-name="${escapeHtml(u.userName)}" ` +
        `data-user-id="${escapeHtml(u.userId)}"`;
      row.innerHTML =
        `<div class="list-item-content">` +
        `<div class="list-item-title">${escapeHtml(u.userName || '(未命名)')}${u.roleName ? `<span class="list-item-role">${escapeHtml(u.roleName)}</span>` : ''}</div>` +
        `<div class="list-item-meta">${escapeHtml(u.account || u.phone || u.deptName || u.userId)}</div>` +
        `</div>` +
        `<div class="list-item-actions">` +
        `<button class="action-btn" data-action="open" ${dataAttrs} title="直接跳转接口链接">${icons.open}</button>` +
        `<button class="action-btn" data-action="copy" ${dataAttrs} title="复制 token query">${icons.copy}</button>` +
        `<button class="action-btn" data-action="student" ${dataAttrs} title="跳转学生评价">${icons.student}</button>` +
        `<button class="action-btn primary" data-action="teacher" ${dataAttrs} title="跳转教师评价">${icons.teacher}</button>` +
        `</div>`;
      // 点击行（非操作按钮）→ 选中用户，用其会话加载教师/学生列表
      row.addEventListener('click', () => onUserSelect(u, row));
      list.appendChild(row);
    }
    renderPager(total);
  }

  function goToPage(page) {
    const pages = Math.max(1, Math.ceil(state.userPage.total / state.userPage.size));
    const target = Math.min(Math.max(1, page), pages);
    if (target === state.userPage.current && state.userPage.records.length) return;
    state.userPage.current = target;
    loadUsers(false);
  }

  function renderPager(total) {
    const pager = $('pager');
    if (!pager) return;
    buildPagerUI(pager, state.userPage, total, goToPage);
  }

  // ── 通用分页构建 ──

  function buildPagerUI(pagerEl, pageState, total, goFn) {
    pagerEl.innerHTML = '';
    const { current, size } = pageState;
    const pages = Math.ceil(total / size);
    if (!total || pages <= 1) {
      pagerEl.classList.add('hidden');
      return;
    }
    pagerEl.classList.remove('hidden');

    const mkBtn = (label, page, { disabled = false, active = false } = {}) => {
      const b = document.createElement('button');
      b.className = 'pager-btn' + (active ? ' active' : '');
      b.textContent = label;
      b.disabled = disabled;
      if (!disabled && !active) {
        b.addEventListener('click', () => goFn(page));
      }
      return b;
    };
    const mkEllipsis = () => {
      const s = document.createElement('span');
      s.className = 'pager-ellipsis';
      s.textContent = '…';
      return s;
    };

    pagerEl.appendChild(mkBtn('‹', current - 1, { disabled: current <= 1 }));

    const windowSize = 5;
    let start = Math.max(1, current - Math.floor(windowSize / 2));
    let end = Math.min(pages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);

    if (start > 1) {
      pagerEl.appendChild(mkBtn('1', 1));
      if (start > 2) pagerEl.appendChild(mkEllipsis());
    }
    for (let p = start; p <= end; p++) {
      pagerEl.appendChild(mkBtn(String(p), p, { active: p === current }));
    }
    if (end < pages) {
      if (end < pages - 1) pagerEl.appendChild(mkEllipsis());
      pagerEl.appendChild(mkBtn(String(pages), pages));
    }

    pagerEl.appendChild(mkBtn('›', current + 1, { disabled: current >= pages }));

    const info = document.createElement('span');
    info.className = 'pager-info';
    info.textContent = `共 ${total} 条`;
    pagerEl.appendChild(info);
  }

  // ── URL 构建 ──

  function extractTokenQuery(url) {
    const idx = url.indexOf('?');
    return idx >= 0 ? url.slice(idx) : '';
  }

  function buildEvaluateUrl(url, path, localPort = '') {
    const queryIdx = url.indexOf('?');
    const query = queryIdx >= 0 ? url.slice(queryIdx) : '';

    if (localPort) {
      return `http://localhost:${localPort}${path}${query}`;
    } else {
      const base = queryIdx >= 0 ? url.slice(0, queryIdx) : url;
      const origin = base.replace(/\/+$/, '');
      return `${origin}${path}${query}`;
    }
  }

  function buildDirectUrl(url, localPort = '') {
    if (!localPort) return url;
    try {
      const parsed = new URL(url);
      parsed.protocol = 'http:';
      parsed.host = `localhost:${localPort}`;
      parsed.hostname = 'localhost';
      parsed.port = String(localPort);
      return parsed.toString();
    } catch (_) {
      return url.replace(/^https?:\/\/[^\/]+/, `http://localhost:${localPort}`);
    }
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ── 一键登录操作 ──

  async function onLoginClick(e) {
    const btn = e.target.closest('.action-btn');
    if (!btn) return;
    // 阻止冒泡到行点击（选中用户）
    e.stopPropagation();
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!action || !id || !state.selectedTenant) return;
    if (state.loadingLogin) return;

    const row = btn.closest('.list-item');
    const groupBtns = row ? row.querySelectorAll('.action-btn') : [btn];
    const originalHtml = btn.innerHTML;

    const localPort = getEffectivePort();
    const env = getEnvForRequest();

    state.loadingLogin = true;
    groupBtns.forEach((b) => (b.disabled = true));
    btn.innerHTML = '<span class="spinner"></span>';
    setStatus('正在获取登录链接...', '');

    try {
      const res = await messages.sendToBackground({
        type: 'QUICK_LOGIN',
        payload: {
          tenantId: state.selectedTenant.tenantId,
          tenantName: state.selectedTenant.tenantName,
          domain: state.selectedTenant.domain,
          id,
          userName: btn.dataset.userName || '',
          industry: state.selectedTenant.industry,
          env,
          localPort,
        },
      });
      if (!res || !res.ok) throw new Error(res?.error || '登录失败');
      const url = res.url;
      if (!url || typeof url !== 'string') throw new Error('virtualLogin 未返回 URL');

      if (action === 'copy') {
        const query = extractTokenQuery(url);
        if (!query) throw new Error('URL 中未找到 token query');
        const ok = await copyToClipboard(query);
        setStatus(ok ? `已复制: ${query.slice(0, 50)}...` : '复制失败', ok ? 'ok' : 'err');
      } else if (action === 'open') {
        const target = buildDirectUrl(url, localPort);
        await messages.sendToBackground({ type: 'OPEN_LOGIN_URL', payload: { url: target } });
        setStatus('已打开链接', 'ok');
      } else if (action === 'student') {
        const target = buildEvaluateUrl(url, '/student-evaluate', localPort);
        await messages.sendToBackground({ type: 'OPEN_LOGIN_URL', payload: { url: target } });
        setStatus('已打开学生评价', 'ok');
      } else if (action === 'teacher') {
        const target = buildEvaluateUrl(url, '/teacher-evaluate', localPort);
        await messages.sendToBackground({ type: 'OPEN_LOGIN_URL', payload: { url: target } });
        setStatus('已打开教师评价', 'ok');
      }
      renderRecent();
    } catch (err) {
      setStatus(err.message, 'err');
    } finally {
      state.loadingLogin = false;
      groupBtns.forEach((b) => (b.disabled = false));
      btn.innerHTML = originalHtml;
    }
  }

  // ── 选中用户 → 解析会话 → 教师列表 ──

  // 选中某个用户：调用 virtualLogin 拿到用户态 origin + token，
  // 之后教师/学生/班级树接口都使用该用户的会话。
  async function onUserSelect(user, row) {
    if (state.loadingSession) return;

    // 再次点击已选中的用户 → 取消选中
    if (state.selectedUser?.id === user.id) {
      state.selectedUser = null;
      state.selectedTeacher = null;
      state.teacherPage = { current: 1, size: 10, total: 0, records: [] };
      state.studentPage = { current: 1, size: 10, total: 0, records: [] };
      state.teacherNameKeyword = '';
      state.teacherAccountKeyword = '';
      const nameInput = $('teacherNameSearch');
      if (nameInput) nameInput.value = '';
      const accountInput = $('teacherAccountSearch');
      if (accountInput) accountInput.value = '';
      row?.classList.remove('active');
      resetTeacherUI();
      resetStudentUI();
      resetTeacherLookup();
      return;
    }

    if (!state.selectedTenant) {
      setStatus('请先选择租户', 'err');
      return;
    }

    state.loadingSession = true;
    setStatus('正在获取用户会话...', '');
    try {
      const res = await messages.sendToBackground({
        type: 'RESOLVE_USER_SESSION',
        payload: {
          tenantId: state.selectedTenant.tenantId,
          id: user.id,
          industry: state.selectedTenant.industry,
        },
      });
      if (!res || !res.ok) throw new Error(res?.error || '获取用户会话失败');

      state.selectedUser = {
        id: user.id,
        userId: user.userId,
        userName: user.userName,
        account: user.account || user.phone || '',
        origin: res.origin,
        token: res.token,
      };

      // 高亮选中行
      const list = $('userList');
      list?.querySelectorAll('.list-item.active').forEach((el) => el.classList.remove('active'));
      row?.classList.add('active');

      // 重置教师/学生状态并加载教师列表
      state.selectedTeacher = null;
      state.teacherPage = { current: 1, size: 10, total: 0, records: [] };
      state.studentPage = { current: 1, size: 10, total: 0, records: [] };
      resetStudentUI();
      resetTeacherLookup();

      // 默认用选中用户的姓名填充教师姓名筛选
      state.teacherNameKeyword = user.userName || '';
      state.teacherAccountKeyword = '';
      const nameInput = $('teacherNameSearch');
      if (nameInput) nameInput.value = state.teacherNameKeyword;
      const accountInput = $('teacherAccountSearch');
      if (accountInput) accountInput.value = '';

      setStatus('', '');
      await loadTeachers(true);

      // 自动选中与当前用户匹配的教师（账号优先，其次姓名，仅一条记录时兜底）
      const defaultTeacher = findDefaultTeacher();
      if (defaultTeacher) {
        await onTeacherSelect(defaultTeacher);
      }
      await loadTeacherLookupData();
    } catch (err) {
      setStatus(err.message, 'err');
    } finally {
      state.loadingSession = false;
    }
  }

  function getTenantOrigin() {
    // 使用选中用户会话里的 origin（来自 virtualLogin URL），而非租户 domain
    return state.selectedUser?.origin || '';
  }

  function getUserToken() {
    return state.selectedUser?.token || '';
  }

  // ── 按学生 / 班级查询关联教师 ──

  function resetTeacherLookup() {
    state.teacherLookupRequestId += 1;
    state.lookupStudentRequestId += 1;
    state.teacherLookupMode = 'student';
    state.teacherLookupSemesterId = '';
    state.teacherLookupSemesters = [];
    state.teacherLookupClasses = [];
    state.classTeacherMap = {};
    state.teacherLookupReady = false;
    state.teacherLookupLoading = false;
    state.teacherLookupError = '';
    state.lookupStudentPage = { current: 1, size: 10, total: 0, records: [] };
    state.lookupStudentNameKeyword = '';
    state.lookupStudentCodeKeyword = '';
    state.loadingLookupStudents = false;
    state.selectedLookupStudent = null;
    state.selectedLookupClassId = '';

    const semesterSelect = $('teacherLookupSemesterSelect');
    if (semesterSelect) {
      semesterSelect.innerHTML = '<option value="">选择学期</option>';
      semesterSelect.disabled = true;
    }
    const nameInput = $('lookupStudentNameSearch');
    if (nameInput) nameInput.value = '';
    const codeInput = $('lookupStudentCodeSearch');
    if (codeInput) codeInput.value = '';
    const studentList = $('lookupStudentList');
    if (studentList) { studentList.innerHTML = ''; studentList.classList.add('hidden'); }
    const studentPager = $('lookupStudentPager');
    if (studentPager) { studentPager.innerHTML = ''; studentPager.classList.add('hidden'); }
    const classSelect = $('lookupClassSelect');
    if (classSelect) classSelect.innerHTML = '<option value="">选择班级</option>';
    clearLookupTeacherResult('请选择学生或班级');
    renderTeacherLookupShell();
  }

  function renderTeacherLookupShell() {
    const empty = $('teacherLookupEmpty');
    const content = $('teacherLookupContent');
    if (!empty || !content) return;

    $('lookupByStudentBtn')?.classList.toggle('active', state.teacherLookupMode === 'student');
    $('lookupByClassBtn')?.classList.toggle('active', state.teacherLookupMode === 'class');
    $('lookupStudentPanel')?.classList.toggle('hidden', state.teacherLookupMode !== 'student');
    $('lookupClassPanel')?.classList.toggle('hidden', state.teacherLookupMode !== 'class');
    const semesterSelect = $('teacherLookupSemesterSelect');
    if (semesterSelect) {
      semesterSelect.disabled = !state.selectedUser || state.teacherLookupLoading || !state.teacherLookupSemesters.length;
    }

    if (!state.selectedUser) {
      empty.textContent = '选中用户后可查询关联教师';
      empty.classList.remove('hidden');
      content.classList.add('hidden');
      return;
    }
    if (state.teacherLookupLoading) {
      empty.textContent = '正在加载班级与教师关系...';
      empty.classList.remove('hidden');
      content.classList.add('hidden');
      return;
    }
    if (state.teacherLookupError) {
      empty.textContent = state.teacherLookupError;
      empty.classList.remove('hidden');
      content.classList.add('hidden');
      return;
    }
    if (!state.teacherLookupReady) {
      empty.textContent = '等待加载班级与教师关系';
      empty.classList.remove('hidden');
      content.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    content.classList.remove('hidden');
  }

  function renderLookupClassOptions() {
    const select = $('lookupClassSelect');
    if (!select) return;
    const selectedId = state.selectedLookupClassId;
    select.innerHTML = '<option value="">选择班级</option>';
    for (const cls of state.teacherLookupClasses) {
      const option = document.createElement('option');
      option.value = cls.id;
      option.textContent = cls.label || cls.name || cls.id;
      select.appendChild(option);
    }
    select.value = state.teacherLookupClasses.some((item) => item.id === selectedId) ? selectedId : '';
  }

  function renderTeacherLookupSemesterOptions() {
    const select = $('teacherLookupSemesterSelect');
    if (!select) return;
    select.innerHTML = '<option value="">选择学期</option>';
    for (const semester of state.teacherLookupSemesters) {
      const option = document.createElement('option');
      option.value = semester.id;
      option.textContent = semester.label || semester.id;
      select.appendChild(option);
    }
    select.value = state.teacherLookupSemesterId;
    select.disabled = !state.selectedUser || state.teacherLookupLoading || !state.teacherLookupSemesters.length;
  }

  async function loadTeacherLookupData({ reloadSemesters = false } = {}) {
    if (!state.selectedUser || state.teacherLookupLoading) return;
    const origin = getTenantOrigin();
    const token = getUserToken();
    if (!origin || !token) return;

    const requestId = ++state.teacherLookupRequestId;
    state.teacherLookupLoading = true;
    state.teacherLookupError = '';
    state.teacherLookupReady = false;
    state.selectedLookupStudent = null;
    state.selectedLookupClassId = '';
    renderTeacherLookupShell();

    try {
      if (reloadSemesters || !state.teacherLookupSemesters.length) {
        const semesterRes = await messages.sendToBackground({
          type: 'FETCH_SEMESTERS',
          payload: { origin, token, current: 1, size: 999 },
        });
        if (requestId !== state.teacherLookupRequestId) return;
        if (!semesterRes || !semesterRes.ok) throw new Error(semesterRes?.error || '加载学期列表失败');

        const semesterPage = tenantHelpers.extractPageData(semesterRes.res);
        const semesters = (semesterPage.records || [])
          .map(tenantHelpers.normalizeSemester)
          .filter((semester) => semester.id);
        if (!semesters.length) throw new Error('暂无学期数据');

        const previousSemesterId = state.teacherLookupSemesterId;
        state.teacherLookupSemesters = semesters;
        state.teacherLookupSemesterId = tenantHelpers.resolveSemesterId(semesters, previousSemesterId);
        renderTeacherLookupSemesterOptions();
      }

      const semesterId = state.teacherLookupSemesterId || state.teacherLookupSemesters[0]?.id || '';
      if (!semesterId) throw new Error('请选择学期');
      const [treeRes, teacherRes] = await Promise.all([
        messages.sendToBackground({
          type: 'FETCH_SCHOOL_DEPT_TREE',
          payload: { origin, token, semesterId },
        }),
        messages.sendToBackground({
          type: 'FETCH_CLASS_TEACHERS',
          payload: { origin, token, semesterId },
        }),
      ]);
      if (requestId !== state.teacherLookupRequestId) return;
      if (!treeRes || !treeRes.ok) throw new Error(treeRes?.error || '加载班级树失败');
      if (!teacherRes || !teacherRes.ok) throw new Error(teacherRes?.error || '加载班级教师关系失败');

      state.teacherLookupClasses = tenantHelpers.extractClassOptions(treeRes.res);
      state.classTeacherMap = tenantHelpers.buildClassTeacherMap(teacherRes.res);
      if (!state.teacherLookupClasses.length) throw new Error('当前学期暂无班级数据');

      state.teacherLookupReady = true;
      renderTeacherLookupSemesterOptions();
      renderLookupClassOptions();
      renderTeacherLookupShell();
      clearLookupTeacherResult('请选择学生或班级');
      if (state.teacherLookupMode === 'student') await loadLookupStudents(true);
    } catch (err) {
      if (requestId !== state.teacherLookupRequestId) return;
      state.teacherLookupError = err.message;
      renderTeacherLookupShell();
      setStatus(err.message, 'err');
    } finally {
      if (requestId !== state.teacherLookupRequestId) return;
      state.teacherLookupLoading = false;
      renderTeacherLookupShell();
    }
  }

  function switchTeacherLookupMode(mode) {
    state.teacherLookupMode = mode === 'class' ? 'class' : 'student';
    state.selectedLookupStudent = null;
    state.selectedLookupClassId = '';
    const classSelect = $('lookupClassSelect');
    if (classSelect) classSelect.value = '';
    clearLookupTeacherResult('请选择学生或班级');
    renderTeacherLookupShell();
    if (state.teacherLookupMode === 'student' && state.teacherLookupReady && !state.lookupStudentPage.records.length) {
      loadLookupStudents(true);
    } else if (state.teacherLookupMode === 'student') {
      renderLookupStudents();
    }
  }

  async function loadLookupStudents(reset = false) {
    if (!state.selectedUser || !state.teacherLookupReady) return;
    const origin = getTenantOrigin();
    const token = getUserToken();
    if (!origin || !token) return;

    const requestId = ++state.lookupStudentRequestId;
    state.loadingLookupStudents = true;
    if (reset) {
      state.lookupStudentPage.current = 1;
      state.lookupStudentPage.records = [];
      state.selectedLookupStudent = null;
      state.selectedLookupClassId = '';
      clearLookupTeacherResult('请选择学生或班级');
      const list = $('lookupStudentList');
      const empty = $('lookupStudentEmpty');
      if (list) { list.innerHTML = ''; list.classList.add('hidden'); }
      if (empty) { empty.textContent = '加载中...'; empty.classList.remove('hidden'); }
    }

    try {
      const res = await messages.sendToBackground({
        type: 'FETCH_STUDENTS',
        payload: {
          origin,
          token,
          current: state.lookupStudentPage.current,
          size: state.lookupStudentPage.size,
          name: state.lookupStudentNameKeyword,
          code: state.lookupStudentCodeKeyword,
        },
      });
      if (requestId !== state.lookupStudentRequestId) return;
      if (!res || !res.ok) throw new Error(res?.error || '加载学生列表失败');
      const page = tenantHelpers.extractPageData(res.res);
      state.lookupStudentPage.records = (page.records || []).map(tenantHelpers.normalizeStudent);
      state.lookupStudentPage.total = page.total || 0;
      renderLookupStudents();
    } catch (err) {
      if (requestId !== state.lookupStudentRequestId) return;
      const empty = $('lookupStudentEmpty');
      if (empty) { empty.textContent = err.message; empty.classList.remove('hidden'); }
      setStatus(err.message, 'err');
    } finally {
      if (requestId !== state.lookupStudentRequestId) return;
      state.loadingLookupStudents = false;
    }
  }

  function renderLookupStudents() {
    const list = $('lookupStudentList');
    const empty = $('lookupStudentEmpty');
    const pager = $('lookupStudentPager');
    if (!list || !empty || !pager) return;
    list.innerHTML = '';

    const records = state.lookupStudentPage.records;
    if (!records.length) {
      list.classList.add('hidden');
      empty.textContent = '未找到学生';
      empty.classList.remove('hidden');
      pager.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');
    for (const student of records) {
      const matchedClass = tenantHelpers.findStudentClass(student, state.teacherLookupClasses);
      const row = document.createElement('div');
      row.className = 'student-item lookup-student-item fade-in' +
        (state.selectedLookupStudent?.id === student.id ? ' selected' : '');
      const classText = matchedClass?.label || student.className || '班级未识别';
      row.innerHTML =
        `<div class="student-item-info">` +
        `<div class="student-item-name">${escapeHtml(student.name || '(未命名)')}</div>` +
        `<div class="student-item-meta">` +
        (student.code ? `<span>学号: ${escapeHtml(student.code)}</span>` : '') +
        `<span>${escapeHtml(classText)}</span>` +
        `</div>` +
        `</div>`;
      row.addEventListener('click', () => selectLookupStudent(student));
      list.appendChild(row);
    }
    buildPagerUI(pager, state.lookupStudentPage, state.lookupStudentPage.total, goToLookupStudentPage);
  }

  function goToLookupStudentPage(page) {
    const pages = Math.max(1, Math.ceil(state.lookupStudentPage.total / state.lookupStudentPage.size));
    const target = Math.min(Math.max(1, page), pages);
    if (target === state.lookupStudentPage.current && state.lookupStudentPage.records.length) return;
    state.lookupStudentPage.current = target;
    loadLookupStudents(false);
  }

  function selectLookupStudent(student) {
    state.selectedLookupStudent = student;
    const matchedClass = tenantHelpers.findStudentClass(student, state.teacherLookupClasses);
    state.selectedLookupClassId = matchedClass?.id || '';
    renderLookupStudents();
    if (!matchedClass) {
      clearLookupTeacherResult(`${student.name || '该学生'}的班级无法唯一识别`);
      return;
    }
    renderLookupTeachers(matchedClass.id);
  }

  function selectLookupClass(classId) {
    state.selectedLookupStudent = null;
    state.selectedLookupClassId = String(classId || '');
    if (!state.selectedLookupClassId) {
      clearLookupTeacherResult('请选择班级');
      return;
    }
    renderLookupTeachers(state.selectedLookupClassId);
  }

  function clearLookupTeacherResult(message) {
    const head = $('lookupTeacherResultHead');
    const title = $('lookupTeacherResultTitle');
    const count = $('lookupTeacherResultCount');
    const list = $('lookupTeacherList');
    const empty = $('lookupTeacherEmpty');
    if (head) head.classList.add('hidden');
    if (title) title.textContent = '';
    if (count) count.textContent = '';
    if (list) { list.innerHTML = ''; list.classList.add('hidden'); }
    if (empty) { empty.textContent = message || '请选择学生或班级'; empty.classList.remove('hidden'); }
  }

  function renderLookupTeachers(classId) {
    const cls = state.teacherLookupClasses.find((item) => item.id === String(classId));
    if (!cls) {
      clearLookupTeacherResult('未找到对应班级');
      return;
    }

    const teachers = state.classTeacherMap[String(classId)] || [];
    const head = $('lookupTeacherResultHead');
    const title = $('lookupTeacherResultTitle');
    const count = $('lookupTeacherResultCount');
    const list = $('lookupTeacherList');
    const empty = $('lookupTeacherEmpty');
    if (!head || !title || !count || !list || !empty) return;

    const prefix = state.selectedLookupStudent?.name ? `${state.selectedLookupStudent.name} · ` : '';
    title.textContent = `${prefix}${cls.label || cls.name}`;
    count.textContent = `${teachers.length} 位教师`;
    head.classList.remove('hidden');
    list.innerHTML = '';

    if (!teachers.length) {
      list.classList.add('hidden');
      empty.textContent = '该班级暂无关联教师';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');
    for (const teacher of teachers) {
      const row = document.createElement('div');
      row.className = 'list-item lookup-teacher-item fade-in';
      const dataAttrs =
        `data-id="${escapeHtml(teacher.id)}" ` +
        `data-user-name="${escapeHtml(teacher.name || '')}" ` +
        `data-user-id="${escapeHtml(teacher.userId || '')}"`;
      const duties = teacher.duties?.length
        ? `<div class="lookup-teacher-duties">${teacher.duties.map((duty) => `<span class="teacher-badge teach">${escapeHtml(duty)}</span>`).join('')}</div>`
        : '';
      row.innerHTML =
        `<div class="list-item-content">` +
        `<div class="list-item-title">${escapeHtml(teacher.name || '(未命名)')}</div>` +
        `<div class="list-item-meta">${escapeHtml(teacher.account || teacher.userId || '')}</div>` +
        duties +
        `</div>` +
        `<div class="list-item-actions">` +
        `<button class="action-btn primary" data-action="open" ${dataAttrs} title="一键登录">${icons.open}</button>` +
        `<button class="action-btn" data-action="copy" ${dataAttrs} title="复制 token query">${icons.copy}</button>` +
        `<button class="action-btn" data-action="student" ${dataAttrs} title="跳转学生评价">${icons.student}</button>` +
        `<button class="action-btn" data-action="teacher" ${dataAttrs} title="跳转教师评价">${icons.teacher}</button>` +
        `</div>`;
      list.appendChild(row);
    }
  }

  function resetTeacherUI() {
    const list = $('teacherList');
    const empty = $('teacherEmpty');
    const pager = $('teacherPager');
    if (list) { list.innerHTML = ''; list.classList.add('hidden'); }
    if (empty) {
      empty.textContent = state.selectedUser ? '加载中...' : '选中用户后可加载教师列表';
      empty.classList.remove('hidden');
    }
    if (pager) { pager.innerHTML = ''; pager.classList.add('hidden'); }
  }

  async function loadTeachers(reset = false) {
    if (!state.selectedTenant) return;
    if (!state.selectedUser) {
      const empty = $('teacherEmpty');
      if (empty) { empty.textContent = '选中用户后可加载教师列表'; empty.classList.remove('hidden'); }
      return;
    }
    if (state.loadingTeachers) return;

    const origin = getTenantOrigin();
    if (!origin) {
      setStatus('用户会话缺少域名信息，无法加载教师列表', 'err');
      return;
    }

    state.loadingTeachers = true;
    if (reset) {
      state.teacherPage.current = 1;
      state.teacherPage.records = [];
      state.selectedTeacher = null;
      resetTeacherUI();
      resetStudentUI();
      const empty = $('teacherEmpty');
      if (empty) { empty.textContent = '加载中...'; empty.classList.remove('hidden'); }
    }

    try {
      const res = await messages.sendToBackground({
        type: 'FETCH_TEACHERS',
        payload: {
          origin,
          token: getUserToken(),
          current: state.teacherPage.current,
          size: state.teacherPage.size,
          name: state.teacherNameKeyword,
          account: state.teacherAccountKeyword,
        },
      });
      if (!res || !res.ok) throw new Error(res?.error || '加载教师列表失败');
      const page = tenantHelpers.extractPageData(res.res);
      state.teacherPage.total = page.total;
      state.teacherPage.records = (page.records || []).map(tenantHelpers.normalizeTeacher);
      renderTeachers();
    } catch (err) {
      if (reset) {
        const empty = $('teacherEmpty');
        if (empty) { empty.textContent = err.message; empty.classList.remove('hidden'); }
      }
      setStatus(err.message, 'err');
    } finally {
      state.loadingTeachers = false;
    }
  }

  function renderTeachers() {
    const list = $('teacherList');
    const empty = $('teacherEmpty');
    const pager = $('teacherPager');
    if (!list || !empty || !pager) return;

    list.innerHTML = '';
    const records = state.teacherPage.records;
    if (!records.length) {
      list.classList.add('hidden');
      empty.textContent = '暂无教师数据';
      empty.classList.remove('hidden');
      pager.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');

    for (const t of records) {
      const row = document.createElement('div');
      row.className = 'teacher-item fade-in' + (state.selectedTeacher?.id === t.id ? ' selected' : '');

      // 状态标签（0=在线，1=离线）
      const badges = [];
      const statusClass = t.statusOn === true ? 'status-on' : 'status-off';
      if (t.statusText) badges.push(`<span class="teacher-badge ${statusClass}">${escapeHtml(t.statusText)}</span>`);

      row.innerHTML =
        `<div class="teacher-item-header">` +
        `<span class="teacher-item-name">${escapeHtml(t.name || '(未命名)')}</span>` +
        `<span class="teacher-item-account">${escapeHtml(t.account || '')}</span>` +
        `</div>` +
        (badges.length ? `<div class="teacher-item-badges">${badges.join('')}</div>` : '');

      row.addEventListener('click', () => onTeacherSelect(t));
      list.appendChild(row);
    }

    // 教师分页
    buildPagerUI(pager, state.teacherPage, state.teacherPage.total, goToTeacherPage);
  }

  // 选中教师的教学职务：渲染在学生列表上方（加载中 / 职务列表 / 暂无）
  function renderTeacherDuties() {
    const el = $('teacherDuties');
    if (!el) return;
    const t = state.selectedTeacher;
    if (!t) {
      el.innerHTML = '';
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    if (t.detailDuties == null) {
      el.innerHTML = '<span class="teacher-duties-label">教学职务</span><span class="muted-text">加载中...</span>';
      return;
    }
    if (!t.detailDuties.length) {
      el.innerHTML = '<span class="teacher-duties-label">教学职务</span><span class="muted-text">暂无</span>';
      return;
    }
    el.innerHTML =
      '<span class="teacher-duties-label">教学职务</span>' +
      t.detailDuties.map((d) => `<span class="teacher-badge teach">${escapeHtml(d)}</span>`).join('');
  }

  function goToTeacherPage(page) {
    const pages = Math.max(1, Math.ceil(state.teacherPage.total / state.teacherPage.size));
    const target = Math.min(Math.max(1, page), pages);
    if (target === state.teacherPage.current && state.teacherPage.records.length) return;
    state.teacherPage.current = target;
    loadTeachers(false);
  }

  // ── 教师选中 → 学生列表 ──

  // 在教师列表中找出与当前选中用户匹配的教师：账号精确匹配 → 姓名精确匹配 → 仅一条记录时兜底
  function findDefaultTeacher() {
    const records = state.teacherPage.records || [];
    if (!records.length || !state.selectedUser) return null;
    const { userName, account } = state.selectedUser;
    if (account) {
      const byAccount = records.find((t) => t.account && t.account === account);
      if (byAccount) return byAccount;
    }
    if (userName) {
      const byName = records.find((t) => t.name && t.name === userName);
      if (byName) return byName;
    }
    return records.length === 1 ? records[0] : null;
  }

  function resetStudentUI() {
    const section = $('studentSection');
    const list = $('studentList');
    const empty = $('studentEmpty');
    const pager = $('studentPager');
    const duties = $('teacherDuties');
    if (section) section.classList.add('hidden');
    if (list) { list.innerHTML = ''; list.classList.add('hidden'); }
    if (empty) { empty.textContent = '选择教师后加载学生列表'; empty.classList.remove('hidden'); }
    if (pager) { pager.innerHTML = ''; pager.classList.add('hidden'); }
    if (duties) { duties.innerHTML = ''; duties.classList.add('hidden'); }
    // 清空学生筛选
    state.studentNameKeyword = '';
    state.studentCodeKeyword = '';
    const nameInput = $('studentNameSearch');
    if (nameInput) nameInput.value = '';
    const codeInput = $('studentCodeSearch');
    if (codeInput) codeInput.value = '';
  }

  async function onTeacherSelect(teacher) {
    // 如果点击已选中的教师，取消选中
    if (state.selectedTeacher?.id === teacher.id) {
      state.selectedTeacher = null;
      resetStudentUI();
      renderTeachers(); // 去掉选中高亮
      return;
    }

    state.selectedTeacher = teacher;
    teacher.detailDuties = null; // 标记加载中
    renderTeachers(); // 更新选中高亮
    renderTeacherDuties(); // 学生列表上方显示“加载中”

    // 并行：加载学生列表 + 加载教师教学职务（detail + schoolDept/tree）
    state.studentPage = { current: 1, size: 10, total: 0, records: [] };
    await Promise.all([
      loadStudents(true),
      loadTeacherDuties(teacher),
    ]);
  }

  // 教师详情 + 班级树 → 教学职务（科目 · 班级）
  async function loadTeacherDuties(teacher) {
    if (!teacher?.id || state.loadingDuties) return;
    const origin = getTenantOrigin();
    const token = getUserToken();
    if (!origin || !token) return;

    state.loadingDuties = true;
    try {
      const detailRes = await messages.sendToBackground({
        type: 'FETCH_TEACHER_DETAIL',
        payload: { origin, token, id: teacher.id },
      });
      if (!detailRes || !detailRes.ok) throw new Error(detailRes?.error || '获取教师详情失败');

      const detail = tenantHelpers.extractDetailData(detailRes.res);
      const semesterId = tenantHelpers.extractSemesterId(detail);

      // 用 semesterId 拉班级树，将 classId 翻译成班级名
      const treeRes = await messages.sendToBackground({
        type: 'FETCH_SCHOOL_DEPT_TREE',
        payload: { origin, token, semesterId },
      });
      const idNameMap = treeRes && treeRes.ok ? tenantHelpers.buildDeptIdNameMap(treeRes.res) : {};

      teacher.detailDuties = tenantHelpers.extractTeachDuties(detail, idNameMap);
    } catch (err) {
      console.warn('[内部开发工具箱] 加载教学职务失败:', err);
      teacher.detailDuties = [];
    } finally {
      state.loadingDuties = false;
      // 仅当该教师仍处于选中态时刷新职务区
      if (state.selectedTeacher?.id === teacher.id) renderTeacherDuties();
    }
  }

  async function loadStudents(reset = false) {
    if (!state.selectedTenant || !state.selectedTeacher || !state.selectedUser) return;
    if (state.loadingStudents) return;

    const origin = getTenantOrigin();
    if (!origin) return;
    const token = getUserToken();

    state.loadingStudents = true;

    const section = $('studentSection');
    const title = $('studentSectionTitle');
    if (section) section.classList.remove('hidden');
    if (title) title.textContent = `${state.selectedTeacher.name || ''} 的学生`;

    if (reset) {
      state.studentPage.current = 1;
      state.studentPage.records = [];
      const list = $('studentList');
      const empty = $('studentEmpty');
      if (list) { list.innerHTML = ''; list.classList.add('hidden'); }
      if (empty) { empty.textContent = '加载中...'; empty.classList.remove('hidden'); }
    }

    try {
      const res = await messages.sendToBackground({
        type: 'FETCH_STUDENTS',
        payload: {
          origin,
          token,
          current: state.studentPage.current,
          size: state.studentPage.size,
          name: state.studentNameKeyword,
          code: state.studentCodeKeyword,
        },
      });
      if (res && res.ok) {
        const page = tenantHelpers.extractPageData(res.res);
        state.studentPage.records = (page.records || []).map(tenantHelpers.normalizeStudent);
        state.studentPage.total = page.total || 0;
      } else if (res && !res.ok) {
        throw new Error(res.error || '加载学生列表失败');
      }
      renderStudents();
    } catch (err) {
      if (reset) {
        const empty = $('studentEmpty');
        if (empty) { empty.textContent = err.message; empty.classList.remove('hidden'); }
      }
      setStatus(err.message, 'err');
    } finally {
      state.loadingStudents = false;
    }
  }

  function renderStudents() {
    const list = $('studentList');
    const empty = $('studentEmpty');
    const pager = $('studentPager');
    if (!list || !empty || !pager) return;

    list.innerHTML = '';
    const records = state.studentPage.records;
    if (!records.length) {
      list.classList.add('hidden');
      empty.textContent = '暂无学生数据';
      empty.classList.remove('hidden');
      pager.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');

    for (const s of records) {
      const row = document.createElement('div');
      row.className = 'student-item fade-in';

      const statusClass = s.statusOn === true ? 'status-on' : 'status-off';
      const statusText = s.statusText || '';

      row.innerHTML =
        `<div class="student-item-info">` +
        `<div class="student-item-name">${escapeHtml(s.name || '(未命名)')}</div>` +
        `<div class="student-item-meta">` +
        (s.code ? `<span>学号: ${escapeHtml(s.code)}</span>` : '') +
        (s.className ? `<span>班级: ${escapeHtml(s.className)}</span>` : '') +
        `</div>` +
        `</div>` +
        (statusText ? `<span class="student-item-badge ${statusClass}">${escapeHtml(statusText)}</span>` : '');

      list.appendChild(row);
    }

    buildPagerUI(pager, state.studentPage, state.studentPage.total, goToStudentPage);
  }

  function goToStudentPage(page) {
    const pages = Math.max(1, Math.ceil(state.studentPage.total / state.studentPage.size));
    const target = Math.min(Math.max(1, page), pages);
    if (target === state.studentPage.current && state.studentPage.records.length) return;
    state.studentPage.current = target;
    loadStudents(false);
  }

  // ── 最近登录 ──

  async function renderRecent() {
    const wrap = $('recent');
    if (!wrap) return;
    let records = [];
    try {
      const res = await messages.sendToBackground({ type: 'GET_QUICK_LOGIN_RECENT' });
      if (res && res.ok && Array.isArray(res.records)) records = res.records;
    } catch (_) {}
    wrap.innerHTML = '';
    if (!records.length) {
      wrap.innerHTML = '<div class="recent-empty">暂无最近登录</div>';
      return;
    }

    const displayLimit = state.recentExpanded ? 10 : 5;
    const displayRecords = records.slice(0, displayLimit);
    const hasMore = records.length > displayLimit;

    for (const r of displayRecords) {
      const row = document.createElement('div');
      row.className = 'recent-item fade-in';
      const time = r.at ? new Date(r.at).toLocaleString() : '';
      const dataAttrs =
        `data-tenant-id="${escapeHtml(r.tenantId || '')}" ` +
        `data-tenant-name="${escapeHtml(r.tenantName || '')}" ` +
        `data-domain="${escapeHtml(r.domain || '')}" ` +
        `data-id="${escapeHtml(r.id || '')}" ` +
        `data-user-name="${escapeHtml(r.userName || '')}" ` +
        `data-industry="${escapeHtml(r.industry || '')}" ` +
        `data-env="${escapeHtml(r.env || 'online')}" ` +
        `data-local-port="${escapeHtml(r.localPort || '')}"`;
      const isLocal = r.env === 'local';
      const envBadgeHtml = isLocal
        ? `<span class="recent-env-badge local" title="本地端口 ${escapeHtml(r.localPort || '')}">本地${r.localPort ? ' :' + escapeHtml(r.localPort) : ''}</span>`
        : `<span class="recent-env-badge online">线上</span>`;
      row.innerHTML =
        `<div class="recent-item-info">` +
        `<div class="recent-item-text">${envBadgeHtml}${escapeHtml(r.tenantName || '(未知租户)')} · ${escapeHtml(r.userName || r.id)}</div>` +
        `<div class="recent-item-time">${escapeHtml(time)}</div>` +
        `</div>` +
        `<div class="recent-item-actions">` +
        `<button class="recent-action-btn" data-action="open" ${dataAttrs} title="直接跳转接口链接">${icons.open}</button>` +
        `<button class="recent-action-btn" data-action="copy" ${dataAttrs} title="复制 token">${icons.copy}</button>` +
        `<button class="recent-action-btn" data-action="student" ${dataAttrs} title="学生评价">${icons.student}</button>` +
        `<button class="recent-action-btn" data-action="teacher" ${dataAttrs} title="教师评价">${icons.teacher}</button>` +
        `<button class="recent-action-btn danger" data-action="delete" ${dataAttrs} title="删除记录">${icons.delete}</button>` +
        `</div>`;
      wrap.appendChild(row);
    }

    if (hasMore) {
      const expandBtn = document.createElement('button');
      expandBtn.className = 'load-more';
      expandBtn.textContent = state.recentExpanded ? '收起' : `显示更多 (${records.length - displayLimit} 条)`;
      expandBtn.addEventListener('click', () => {
        state.recentExpanded = !state.recentExpanded;
        renderRecent();
      });
      wrap.appendChild(expandBtn);
    }
  }

  async function onRecentClick(e) {
    const btn = e.target.closest('.recent-action-btn');
    if (!btn) return;
    const action = btn.dataset.action;
    const tenantId = btn.dataset.tenantId;
    const tenantName = btn.dataset.tenantName || '';
    const domain = btn.dataset.domain || '';
    const id = btn.dataset.id;
    const userName = btn.dataset.userName || '';
    const industry = btn.dataset.industry || '';
    const recordEnv = btn.dataset.env || 'online';
    const recordLocalPort = btn.dataset.localPort || '';
    if (!action) return;

    if (action === 'delete') {
      if (state.loadingLogin) return;
      try {
        await messages.sendToBackground({
          type: 'DELETE_QUICK_LOGIN_RECENT',
          payload: { tenantId, id },
        });
        setStatus('已删除', 'ok');
        renderRecent();
      } catch (err) {
        setStatus(`删除失败: ${err.message}`, 'err');
      }
      return;
    }

    if (!id || !tenantId) return;
    if (state.loadingLogin) return;

    const row = btn.closest('.recent-item');
    const groupBtns = row ? row.querySelectorAll('.recent-action-btn') : [btn];
    const originalHtml = btn.innerHTML;

    state.loadingLogin = true;
    groupBtns.forEach((b) => (b.disabled = true));
    btn.innerHTML = '<span class="spinner"></span>';
    setStatus('正在获取登录链接...', '');

    try {
      const res = await messages.sendToBackground({
        type: 'QUICK_LOGIN',
        payload: { tenantId, tenantName, domain, id, userName, industry, env: recordEnv, localPort: recordLocalPort },
      });
      if (!res || !res.ok) throw new Error(res?.error || '登录失败');
      const url = res.url;
      if (!url || typeof url !== 'string') throw new Error('virtualLogin 未返回 URL');

      if (action === 'copy') {
        const query = extractTokenQuery(url);
        if (!query) throw new Error('URL 中未找到 token query');
        const ok = await copyToClipboard(query);
        setStatus(ok ? `已复制: ${query.slice(0, 50)}...` : '复制失败', ok ? 'ok' : 'err');
      } else if (action === 'open') {
        const target = buildDirectUrl(url, recordLocalPort);
        await messages.sendToBackground({ type: 'OPEN_LOGIN_URL', payload: { url: target } });
        setStatus('已打开链接', 'ok');
      } else if (action === 'student') {
        const target = buildEvaluateUrl(url, '/student-evaluate', recordLocalPort);
        await messages.sendToBackground({ type: 'OPEN_LOGIN_URL', payload: { url: target } });
        setStatus('已打开学生评价', 'ok');
      } else if (action === 'teacher') {
        const target = buildEvaluateUrl(url, '/teacher-evaluate', recordLocalPort);
        await messages.sendToBackground({ type: 'OPEN_LOGIN_URL', payload: { url: target } });
        setStatus('已打开教师评价', 'ok');
      }
      renderRecent();
    } catch (err) {
      setStatus(err.message, 'err');
    } finally {
      state.loadingLogin = false;
      groupBtns.forEach((b) => (b.disabled = false));
      btn.innerHTML = originalHtml;
    }
  }

  // ── 事件绑定 ──

  function bindEvents() {
    $('header').addEventListener('click', toggleSection);

    // 环境切换
    $('envOnlineBtn')?.addEventListener('click', () => switchEnv('online'));
    $('envDevBtn')?.addEventListener('click', () => switchEnv('dev'));

    // 端口修改
    const portInput = $('localPort');
    if (portInput) {
      portInput.value = state.devPort;
      portInput.addEventListener('input', debounce(() => {
        state.devPort = portInput.value.trim() || DEFAULT_DEV_PORT;
      }, 300));
    }

    const tenantSearch = $('tenantSearch');
    tenantSearch.addEventListener('input', debounce(() => {
      state.tenantKeyword = tenantSearch.value.trim();
      loadTenants();
    }, 300));

    $('deptSelect').addEventListener('change', (e) => {
      state.deptId = e.target.value;
      loadUsers(true);
    });

    const userSearch = $('userSearch');
    userSearch.addEventListener('input', debounce(() => {
      state.userKeyword = userSearch.value.trim();
      loadUsers(true);
    }, 300));

    $('userList').addEventListener('click', onLoginClick);

    // 关联教师：按学生 / 按班级切换及学期数据刷新
    $('lookupByStudentBtn')?.addEventListener('click', () => switchTeacherLookupMode('student'));
    $('lookupByClassBtn')?.addEventListener('click', () => switchTeacherLookupMode('class'));
    $('teacherLookupRefreshBtn')?.addEventListener('click', () => {
      if (!state.selectedUser) {
        setStatus('请先在用户列表中选中用户', 'err');
        return;
      }
      loadTeacherLookupData({ reloadSemesters: true });
    });
    $('teacherLookupSemesterSelect')?.addEventListener('change', (event) => {
      const semesterId = event.target.value;
      if (!semesterId || semesterId === state.teacherLookupSemesterId) return;
      state.teacherLookupSemesterId = semesterId;
      loadTeacherLookupData();
    });
    $('lookupClassSelect')?.addEventListener('change', (event) => selectLookupClass(event.target.value));
    $('lookupTeacherList')?.addEventListener('click', onLoginClick);

    const lookupStudentNameSearch = $('lookupStudentNameSearch');
    lookupStudentNameSearch?.addEventListener('input', debounce(() => {
      state.lookupStudentNameKeyword = lookupStudentNameSearch.value.trim();
      loadLookupStudents(true);
    }, 300));
    const lookupStudentCodeSearch = $('lookupStudentCodeSearch');
    lookupStudentCodeSearch?.addEventListener('input', debounce(() => {
      state.lookupStudentCodeKeyword = lookupStudentCodeSearch.value.trim();
      loadLookupStudents(true);
    }, 300));

    // 教师姓名/账号筛选（防抖 300ms）
    const teacherNameSearch = $('teacherNameSearch');
    teacherNameSearch?.addEventListener('input', debounce(() => {
      state.teacherNameKeyword = teacherNameSearch.value.trim();
      loadTeachers(true);
    }, 300));
    const teacherAccountSearch = $('teacherAccountSearch');
    teacherAccountSearch?.addEventListener('input', debounce(() => {
      state.teacherAccountKeyword = teacherAccountSearch.value.trim();
      loadTeachers(true);
    }, 300));

    // 教师刷新按钮
    $('teacherRefreshBtn')?.addEventListener('click', () => {
      if (!state.selectedUser) {
        setStatus('请先在用户列表中选中用户', 'err');
        return;
      }
      loadTeachers(true);
    });

    // 学生姓名/学号筛选（防抖 300ms）
    const studentNameSearch = $('studentNameSearch');
    studentNameSearch?.addEventListener('input', debounce(() => {
      state.studentNameKeyword = studentNameSearch.value.trim();
      loadStudents(true);
    }, 300));
    const studentCodeSearch = $('studentCodeSearch');
    studentCodeSearch?.addEventListener('input', debounce(() => {
      state.studentCodeKeyword = studentCodeSearch.value.trim();
      loadStudents(true);
    }, 300));

    // 学生刷新按钮
    $('studentRefreshBtn')?.addEventListener('click', () => {
      if (!state.selectedTeacher) {
        setStatus('请先选中教师', 'err');
        return;
      }
      loadStudents(true);
    });

    $('recent').addEventListener('click', onRecentClick);
  }

  async function autoSelectFirstRecent() {
    try {
      const res = await messages.sendToBackground({ type: 'GET_QUICK_LOGIN_RECENT' });
      if (!res || !res.ok || !Array.isArray(res.records) || !res.records.length) return;
      const first = res.records[0];
      if (!first.tenantId || !first.id) return;

      $('tenantSearch').value = first.tenantName || '';
      state.tenantKeyword = first.tenantName || '';

      const tenant = {
        tenantId: first.tenantId,
        tenantName: first.tenantName || '',
        domain: first.domain || '',
        industry: first.industry || '',
      };

      state.selectedTenant = tenant;
      state.deptId = '';
      state.userKeyword = first.userName || '';
      state.userPage = { current: 1, size: 10, total: 0, records: [] };

      $('userSearch').value = first.userName || '';

      await loadUsers(true);

      // 在用户列表中找到最近登录的对应用户并自动选中（高亮 + 解析会话 + 加载教师列表）
      const targetId = String(first.id);
      const idx = state.userPage.records.findIndex(
        (item) => String(tenantHelpers.normalizeUser(item).id) === targetId,
      );
      if (idx < 0) return; // 不在当前页，保持仅填充搜索
      const u = tenantHelpers.normalizeUser(state.userPage.records[idx]);
      const row = $('userList')?.children[idx];
      await onUserSelect(u, row);
    } catch (err) {
      console.error('自动选中最近登录失败:', err);
    }
  }

  async function init() {
    const section = document.getElementById(IDs.section);
    updateEnvBadge();
    updateEnvUI();
    bindEvents();
    state.expanded = true;
    section?.classList.add('expanded');
    await renderRecent();
    await autoSelectFirstRecent();
  }

  ns.quickLoginUi = { init };
})();
