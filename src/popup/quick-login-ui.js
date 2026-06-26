/* 内部开发工具箱 — Popup 快捷登录 UI */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit;
  const tenantHelpers = ns.tenant;
  const messages = ns.messages;

  const IDs = {
    section: 'quickLoginSection',
    header: 'quickLoginHeader',
    body: 'quickLoginBody',
    envBadge: 'envBadge',
    localPort: 'localPort',
    tenantSearch: 'tenantSearch',
    tenantList: 'tenantList',
    tenantEmpty: 'tenantEmpty',
    deptSelect: 'deptSelect',
    userSearch: 'userSearch',
    userList: 'userList',
    userEmpty: 'userEmpty',
    loadMore: 'loadMoreUsers',
    status: 'quickLoginStatus',
    recent: 'recentList',
  };

  // SVG icons
  const icons = {
    copy: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    student: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    teacher: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    delete: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
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
    const el = $('status');
    el.textContent = text || '';
    el.className = 'status-msg' + (kind ? ` ${kind}` : '');
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
    // 简单启发式：名字包含"生产/正式/prod"显示红色警告
    if (projectName.match(/生产|正式|prod/i)) {
      el.className = 'badge error';
    } else if (projectName.match(/预发布|预发|pre/i)) {
      el.className = 'badge warning';
    } else {
      el.className = 'badge success';
    }
  }

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
    $('tenantSearch').value = tenant.tenantName || '';
    $('tenantList').innerHTML = '';
    $('tenantList').classList.add('hidden');
    $('userSearch').value = '';
    $('userList').innerHTML = '';
    $('userList').classList.add('hidden');
    $('userEmpty').classList.add('hidden');
    $('loadMore').classList.add('hidden');

    await loadUsers(true);
  }

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
      state.userPage.records = reset ? page.records : state.userPage.records.concat(page.records);
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
    const loadMore = $('loadMore');
    list.innerHTML = '';
    if (!records || !records.length) {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
      loadMore.classList.add('hidden');
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
        `<button class="action-btn" data-action="copy" ${dataAttrs} title="复制 token query">${icons.copy}</button>` +
        `<button class="action-btn" data-action="student" ${dataAttrs} title="跳转学生评价">${icons.student}</button>` +
        `<button class="action-btn primary" data-action="teacher" ${dataAttrs} title="跳转教师评价">${icons.teacher}</button>` +
        `</div>`;
      list.appendChild(row);
    }
    const hasMore = records.length < total;
    loadMore.classList.toggle('hidden', !hasMore);
  }

  function extractTokenQuery(url) {
    const idx = url.indexOf('?');
    return idx >= 0 ? url.slice(idx) : '';
  }

  function buildEvaluateUrl(url, path, localPort = '') {
    const queryIdx = url.indexOf('?');
    const query = queryIdx >= 0 ? url.slice(queryIdx) : '';

    if (localPort) {
      // 使用本地环境
      return `http://localhost:${localPort}${path}${query}`;
    } else {
      // 使用线上环境
      const base = queryIdx >= 0 ? url.slice(0, queryIdx) : url;
      const origin = base.replace(/\/+$/, '');
      return `${origin}${path}${query}`;
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

    const localPort = $('localPort') ? $('localPort').value.trim() : '';
    const env = localPort ? 'local' : 'online';

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
      const envBadge = isLocal
        ? `<span class="recent-env-badge local" title="本地端口 ${escapeHtml(r.localPort || '')}">本地${r.localPort ? ' :' + escapeHtml(r.localPort) : ''}</span>`
        : `<span class="recent-env-badge online">线上</span>`;
      row.innerHTML =
        `<div class="recent-item-info">` +
        `<div class="recent-item-text">${envBadge}${escapeHtml(r.tenantName || '(未知租户)')} · ${escapeHtml(r.userName || r.id)}</div>` +
        `<div class="recent-item-time">${escapeHtml(time)}</div>` +
        `</div>` +
        `<div class="recent-item-actions">` +
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

  function bindEvents() {
    $('header').addEventListener('click', toggleSection);

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

    $('loadMore').addEventListener('click', () => {
      state.userPage.current += 1;
      loadUsers(false);
    });

    $('recent').addEventListener('click', onRecentClick);
  }

  async function autoSelectFirstRecent() {
    try {
      const res = await messages.sendToBackground({ type: 'GET_QUICK_LOGIN_RECENT' });
      if (!res || !res.ok || !Array.isArray(res.records) || !res.records.length) return;
      const first = res.records[0];
      if (!first.tenantId || !first.id) return;

      // 自动填充租户搜索框并触发租户查询
      $('tenantSearch').value = first.tenantName || '';
      state.tenantKeyword = first.tenantName || '';

      // 模拟选中该租户（构造 tenant 对象）
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

      // 填充用户搜索框
      $('userSearch').value = first.userName || '';

      // 加载该租户下的用户列表
      await loadUsers(true);
    } catch (err) {
      console.error('自动选中最近登录失败:', err);
    }
  }

  async function init() {
    const section = document.getElementById(IDs.section);
    updateEnvBadge();
    bindEvents();
    // 默认展开快捷登录面板
    state.expanded = true;
    section?.classList.add('expanded');
    await renderRecent();
    await autoSelectFirstRecent();
  }

  ns.quickLoginUi = { init };
})();
