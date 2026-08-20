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
    teacherList: 'teacherList',
    teacherEmpty: 'teacherEmpty',
    teacherPager: 'teacherPager',
    teacherRefreshBtn: 'teacherRefreshBtn',
    studentSection: 'studentSection',
    studentSectionTitle: 'studentSectionTitle',
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
    // 教师列表
    teacherPage: { current: 1, size: 10, total: 0, records: [] },
    loadingTeachers: false,
    selectedTeacher: null,
    // 学生列表
    studentPage: { current: 1, size: 10, total: 0, records: [] },
    loadingStudents: false,
    // 班级树缓存（用于行政职务 → 班级匹配）
    classNames: [],
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
    state.selectedTeacher = null;
    state.teacherPage = { current: 1, size: 10, total: 0, records: [] };
    state.studentPage = { current: 1, size: 10, total: 0, records: [] };
    state.classNames = [];

    $('tenantSearch').value = tenant.tenantName || '';
    $('tenantList').innerHTML = '';
    $('tenantList').classList.add('hidden');
    $('userSearch').value = '';
    $('userList').innerHTML = '';
    $('userList').classList.add('hidden');
    $('userEmpty').classList.add('hidden');
    $('pager').classList.add('hidden');

    // 重置教师/学生区域
    resetTeacherUI();
    resetStudentUI();

    await loadUsers(true);
    // 选中租户后自动加载教师列表
    await loadTeachers(true);
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
      row.className = 'list-item fade-in';
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

  // ── 教师列表 ──

  function getTenantOrigin() {
    // 从选中的租户 domain 构造用户端 origin
    const domain = state.selectedTenant?.domain || '';
    if (!domain) return '';
    if (domain.startsWith('http')) return domain.replace(/\/+$/, '');
    return `https://${domain}`;
  }

  function resetTeacherUI() {
    const list = $('teacherList');
    const empty = $('teacherEmpty');
    const pager = $('teacherPager');
    if (list) { list.innerHTML = ''; list.classList.add('hidden'); }
    if (empty) { empty.textContent = '选中租户后可加载教师列表'; empty.classList.remove('hidden'); }
    if (pager) { pager.innerHTML = ''; pager.classList.add('hidden'); }
  }

  async function loadTeachers(reset = false) {
    if (!state.selectedTenant) return;
    if (state.loadingTeachers) return;

    const origin = getTenantOrigin();
    if (!origin) {
      setStatus('租户缺少域名信息，无法加载教师列表', 'err');
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
          current: state.teacherPage.current,
          size: state.teacherPage.size,
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

      // 职务标签
      const badges = [];
      if (t.adminDuties) badges.push(`<span class="teacher-badge admin">${escapeHtml(t.adminDuties)}</span>`);
      if (t.teachDuties) badges.push(`<span class="teacher-badge teach">${escapeHtml(t.teachDuties)}</span>`);
      const statusClass = String(t.status) === '1' || t.status === 1 ? 'status-on' : 'status-off';
      const statusText = t.statusText || t.status || '';
      if (statusText) badges.push(`<span class="teacher-badge ${statusClass}">${escapeHtml(statusText)}</span>`);

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

  function goToTeacherPage(page) {
    const pages = Math.max(1, Math.ceil(state.teacherPage.total / state.teacherPage.size));
    const target = Math.min(Math.max(1, page), pages);
    if (target === state.teacherPage.current && state.teacherPage.records.length) return;
    state.teacherPage.current = target;
    loadTeachers(false);
  }

  // ── 教师选中 → 学生列表 ──

  function isTeacher(user) {
    return Boolean(user.adminDuties || user.teachDuties);
  }

  function resetStudentUI() {
    const section = $('studentSection');
    const list = $('studentList');
    const empty = $('studentEmpty');
    const pager = $('studentPager');
    if (section) section.classList.add('hidden');
    if (list) { list.innerHTML = ''; list.classList.add('hidden'); }
    if (empty) { empty.textContent = '选择教师后加载学生列表'; empty.classList.remove('hidden'); }
    if (pager) { pager.innerHTML = ''; pager.classList.add('hidden'); }
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
    renderTeachers(); // 更新选中高亮

    // 如果不是教师（无行政职务且无教学职务），不加载学生
    if (!isTeacher(teacher)) {
      resetStudentUI();
      const section = $('studentSection');
      if (section) section.classList.remove('hidden');
      const empty = $('studentEmpty');
      if (empty) { empty.textContent = '该用户不是教师，无关联学生'; empty.classList.remove('hidden'); }
      return;
    }

    // 加载学生列表
    state.studentPage = { current: 1, size: 10, total: 0, records: [] };
    await loadStudents(true);
  }

  async function ensureClassNames() {
    if (state.classNames.length) return state.classNames;
    const origin = getTenantOrigin();
    if (!origin) return [];
    try {
      const res = await messages.sendToBackground({
        type: 'FETCH_SCHOOL_DEPT_TREE',
        payload: { origin },
      });
      if (!res || !res.ok) return [];
      state.classNames = tenantHelpers.extractClassNames(res.res) || [];
    } catch (_) {
      state.classNames = [];
    }
    return state.classNames;
  }

  // 从教师的行政职务中匹配班级名
  function matchClassNames(adminDuties) {
    if (!adminDuties) return [];
    const duties = adminDuties.split(/[,，、\/\s]+/).filter(Boolean);
    const matched = [];
    for (const cls of state.classNames) {
      for (const duty of duties) {
        if (cls.includes(duty) || duty.includes(cls)) {
          matched.push(cls);
          break;
        }
      }
    }
    // 如果没有匹配到，直接用行政职务作为班级名搜索
    if (!matched.length) {
      matched.push(...duties);
    }
    return [...new Set(matched)];
  }

  async function loadStudents(reset = false) {
    if (!state.selectedTenant || !state.selectedTeacher) return;
    if (state.loadingStudents) return;

    const origin = getTenantOrigin();
    if (!origin) return;

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
      // 确保已加载班级树
      await ensureClassNames();

      // 从行政职务匹配班级名
      const classNames = matchClassNames(state.selectedTeacher.adminDuties);

      // 如果有多个班级，逐个查询并合并；否则查询全部
      let allRecords = [];
      let total = 0;

      if (classNames.length) {
        // 按班级分别查询
        for (const cls of classNames) {
          const res = await messages.sendToBackground({
            type: 'FETCH_STUDENTS',
            payload: {
              origin,
              current: state.studentPage.current,
              size: state.studentPage.size,
              className: cls,
            },
          });
          if (res && res.ok) {
            const page = tenantHelpers.extractPageData(res.res);
            const records = (page.records || []).map(tenantHelpers.normalizeStudent);
            allRecords = allRecords.concat(records);
            total += page.total || 0;
          }
        }
      } else {
        // 无行政职务，查询全部学生
        const res = await messages.sendToBackground({
          type: 'FETCH_STUDENTS',
          payload: {
            origin,
            current: state.studentPage.current,
            size: state.studentPage.size,
          },
        });
        if (res && res.ok) {
          const page = tenantHelpers.extractPageData(res.res);
          allRecords = (page.records || []).map(tenantHelpers.normalizeStudent);
          total = page.total || 0;
        }
      }

      state.studentPage.total = total;
      state.studentPage.records = allRecords;
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

      const statusClass = String(s.status) === '1' || s.status === 1 ? 'status-on' : 'status-off';
      const statusText = s.statusText || s.status || '';

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

    // 教师刷新按钮
    $('teacherRefreshBtn')?.addEventListener('click', () => loadTeachers(true));

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
      // 也加载教师列表
      await loadTeachers(true);
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
