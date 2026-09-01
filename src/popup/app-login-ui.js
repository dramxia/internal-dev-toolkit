/* 内部开发工具箱 — Popup APP 端登录 UI（学生 APP token 获取） */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit;
  const messages = ns.messages;

  const IDs = {
    siteUrl: 'appSiteUrl',
    schoolSearch: 'appSchoolSearch',
    schoolList: 'appSchoolList',
    schoolEmpty: 'appSchoolEmpty',
    account: 'appAccount',
    password: 'appPassword',
    pwdToggle: 'appPwdToggle',
    loginBtn: 'appLoginBtn',
    tokenWrap: 'appTokenWrap',
    tokenValue: 'appTokenValue',
    tokenUpdated: 'appTokenUpdated',
    copyTokenBtn: 'appCopyTokenBtn',
    userMeta: 'appUserMeta',
    historyFilters: 'appHistoryFilters',
    historyTenantFilter: 'appHistoryTenantFilter',
    historyClassFilter: 'appHistoryClassFilter',
    historyPager: 'appHistoryPager',
    history: 'appHistoryList',
  };

  const icons = {
    login: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
    delete: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  };

  let state = {
    schools: [],
    selectedSchool: null,
    schoolsLoaded: false,
    loading: false,
    historyPage: 1,
    historyTenantKey: '',
    historyClassName: '',
    listOpen: false,
  };

  let lastSavedToken = '';
  let eventsBound = false;
  let initialized = false;
  let activationPromise = null;

  function $(id) {
    return document.getElementById(IDs[id] || id);
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, ms) {
    let t = 0;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  const APP_ERROR_AUTO_HIDE_MS = 3200;
  const HISTORY_PAGE_SIZE = 5;

  function setStatus(text, kind) {
    ns.ui.toast(text, kind, {
      duration: kind === 'err' ? APP_ERROR_AUTO_HIDE_MS : undefined,
    });
  }

  function formatLoginError(error) {
    const message = String(error?.message || '').trim();
    if (!message) return '登录失败';
    return /^登录失败\s*[:：]/.test(message) ? message : `登录失败：${message}`;
  }

  function getEditableText(el) {
    return (el.textContent || '').replace(/ /g, ' ');
  }

  function setEditableText(el, text) {
    el.textContent = text || '';
  }

  function syncEditableState(el, wrap, text) {
    const isEmpty = !text;
    el.classList.toggle('empty', isEmpty);
    wrap.classList.toggle('empty', isEmpty);
  }

  function fillForm(form = {}) {
    if ($('siteUrl') && form.siteUrl != null) $('siteUrl').value = form.siteUrl;
    if ($('account') && form.account != null) $('account').value = form.account;
    if ($('password') && form.password != null) $('password').value = form.password;
  }

  function readForm() {
    return {
      siteUrl: ($('siteUrl')?.value || '').trim(),
      account: ($('account')?.value || '').trim(),
      password: $('password')?.value || '',
    };
  }

  function validateForm() {
    const form = readForm();
    if (!form.siteUrl) {
      setStatus('请输入站点地址', 'err');
      return null;
    }
    if (!form.account || !form.password) {
      setStatus('请输入账号和密码', 'err');
      return null;
    }
    if (!state.selectedSchool) {
      setStatus('请选择学校', 'err');
      return null;
    }
    return form;
  }

  function setButtonsLoading(active, updateButton = true) {
    state.loading = active;
    if (!updateButton) return;
    const loginBtn = $('loginBtn');
    const labels = { login: '一键登录' };
    const loadingLabels = { login: '登录中...' };
    if (loginBtn) {
      loginBtn.disabled = active;
      loginBtn.textContent = active ? loadingLabels.login : labels.login;
    }
  }

  // ── 凭据 ──
  async function renderCredentials() {
    try {
      const res = await messages.sendToBackground({ type: 'APP_GET_CREDENTIALS' });
      if (!res || !res.ok) return;
      if ($('siteUrl')) $('siteUrl').value = res.siteUrl || '';
      if ($('account')) $('account').value = res.account || '';
      if ($('password')) $('password').value = res.password || '';
    } catch (_) {}
  }

  // ── Token ──
  async function renderToken() {
    const tokenEl = $('tokenValue');
    const tokenWrap = $('tokenWrap');
    if (!tokenEl || !tokenWrap) return;

    let tokenState = {
      token: '',
      updatedAt: 0,
      user: null,
      gradeName: '',
      className: '',
    };
    try {
      const res = await messages.sendToBackground({ type: 'APP_GET_TOKEN' });
      if (res && res.ok) {
        tokenState = {
          token: res.token || '',
          updatedAt: res.updatedAt || 0,
          user: res.user || null,
          gradeName: res.gradeName || '',
          className: res.className || '',
        };
      }
    } catch (_) {}

    lastSavedToken = tokenState.token || '';
    if (document.activeElement !== tokenEl) {
      setEditableText(tokenEl, lastSavedToken);
    }
    syncEditableState(tokenEl, tokenWrap, lastSavedToken);

    const updatedEl = $('tokenUpdated');
    const copyBtn = $('copyTokenBtn');
    if (lastSavedToken) {
      const updatedAt = tokenState.updatedAt
        ? new Date(tokenState.updatedAt).toLocaleString()
        : '未知';
      if (updatedEl) updatedEl.textContent = `获取时间: ${updatedAt}`;
      if (copyBtn) copyBtn.disabled = false;
    } else {
      if (updatedEl) updatedEl.textContent = '';
      if (copyBtn) copyBtn.disabled = true;
    }

    const metaEl = $('userMeta');
    if (metaEl) {
      const u = tokenState.user || {};
      const parts = [
        u.username || u.account || '',
        u.tenantName || '',
        tokenState.gradeName ? `年级：${tokenState.gradeName}` : '',
        tokenState.className ? `班级：${tokenState.className}` : '',
        Array.isArray(u.roleNames) && u.roleNames.length ? u.roleNames.join('/') : '',
      ].filter(Boolean);
      if (parts.length) {
        metaEl.textContent = parts.join(' · ');
        metaEl.classList.remove('hidden');
      } else {
        metaEl.textContent = '';
        metaEl.classList.add('hidden');
      }
    }
  }

  async function onTokenBlur() {
    const tokenEl = $('tokenValue');
    if (!tokenEl) return;
    const next = getEditableText(tokenEl).trim();
    if (next === lastSavedToken) {
      await renderToken();
      return true;
    }
    try {
      if (!next) {
        await messages.sendToBackground({ type: 'APP_CLEAR_TOKEN' });
        setStatus('Token 已清除', 'ok');
      } else {
        await messages.sendToBackground({
          type: 'APP_SAVE_TOKEN',
          payload: { token: next },
        });
        setStatus('Token 已保存', 'ok');
      }
      await renderToken();
      return true;
    } catch (err) {
      setStatus(`保存失败: ${err.message}`, 'err');
      return false;
    }
  }

  // ── 学校列表 ──
  // 模糊匹配：按空格分词，所有分词都命中 tenantName 即算匹配
  function matchSchools(keyword) {
    const kw = String(keyword || '').trim().toLowerCase();
    if (!kw) return state.schools;
    const tokens = kw.split(/\s+/).filter(Boolean);
    return state.schools.filter((s) => {
      const name = String(s.tenantName || '').toLowerCase();
      return tokens.every((t) => name.includes(t));
    });
  }

  function renderSchoolList(records) {
    const list = $('schoolList');
    const empty = $('schoolEmpty');
    if (!list || !empty) return;
    list.innerHTML = '';
    if (!records || !records.length) {
      list.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.classList.remove('hidden');
    for (const s of records) {
      const row = document.createElement('div');
      row.className = 'list-item' + (state.selectedSchool?.tenantId === s.tenantId ? ' active' : '');
      row.innerHTML =
        `<div class="list-item-content">` +
        `<div class="list-item-title">${escapeHtml(s.tenantName || '(未命名)')}</div>` +
        `<div class="list-item-meta">${escapeHtml(s.tenantId)}</div>` +
        `</div>`;
      row.addEventListener('mousedown', (e) => e.preventDefault()); // 防止失焦收起
      row.addEventListener('click', () => selectSchool(s));
      list.appendChild(row);
    }
  }

  function selectSchool(school) {
    state.selectedSchool = school;
    const search = $('schoolSearch');
    if (search) search.value = school.tenantName || '';
    collapseSchoolList();
  }

  function expandSchoolList() {
    state.listOpen = true;
    renderSchoolList(matchSchools($('schoolSearch')?.value || ''));
  }

  function collapseSchoolList() {
    state.listOpen = false;
    const list = $('schoolList');
    const empty = $('schoolEmpty');
    if (list) {
      list.innerHTML = '';
      list.classList.add('hidden');
    }
    if (empty) empty.classList.add('hidden');
  }

  function onSchoolSearchBlur() {
    // 延迟收起，留出点击事件触发时间
    setTimeout(() => {
      if (state.listOpen) collapseSchoolList();
      // 若搜索框内容与已选学校不一致，回填已选学校名
      const search = $('schoolSearch');
      if (search && state.selectedSchool && search.value.trim() !== state.selectedSchool.tenantName) {
        search.value = state.selectedSchool.tenantName || '';
      }
    }, 150);
  }

  async function loadSchools() {
    const siteUrl = ($('siteUrl')?.value || '').trim();
    if (!siteUrl) {
      state.schools = [];
      state.selectedSchool = null;
      state.schoolsLoaded = false;
      return;
    }
    setStatus('加载学校列表...', '');
    try {
      const res = await messages.sendToBackground({
        type: 'APP_LIST_SCHOOLS',
        payload: { siteUrl },
      });
      if (!res || !res.ok) throw new Error(res?.error || '获取学校列表失败');
      state.schools = Array.isArray(res.schools) ? res.schools : [];
      state.schoolsLoaded = true;
      // 默认选中「未来智慧学校AI平台」，无则选首条
      const defaultName = res.defaultSchoolName;
      const target =
        state.schools.find((s) => s.tenantName === defaultName) ||
        state.schools[0] ||
        null;
      state.selectedSchool = target;
      const search = $('schoolSearch');
      if (search && target) search.value = target.tenantName || '';
      setStatus('', '');
    } catch (err) {
      state.schools = [];
      state.selectedSchool = null;
      state.schoolsLoaded = false;
      setStatus(err.message, 'err');
    }
  }

  // ── 一键登录 ──
  async function handleLogin(formOverride, options = {}) {
    if (state.loading) return;
    const form = formOverride || validateForm();
    if (!form) return;
    const updateMainButton = options.updateMainButton !== false;
    const refreshHistory = options.refreshHistory !== false;
    const shouldRecordHistory = options.recordHistory !== false;

    setStatus('', '');
    setButtonsLoading(true, updateMainButton);
    try {
      const res = await messages.sendToBackground({
        type: 'APP_LOGIN',
        payload: {
          siteUrl: form.siteUrl,
          account: form.account,
          password: form.password,
          tenantId: state.selectedSchool?.tenantId || '',
          tenantName: state.selectedSchool?.tenantName || '',
          recordHistory: shouldRecordHistory,
        },
      });
      if (!res || !res.ok) throw new Error(res?.error || '登录失败');
      await renderToken();
      if (refreshHistory) {
        if (shouldRecordHistory) state.historyPage = 1;
        await renderHistory();
      }
    } catch (err) {
      await renderToken();
      setStatus(formatLoginError(err), 'err');
    } finally {
      setButtonsLoading(false, updateMainButton);
    }
  }

  // ── 历史记录 ──
  function historyTenantKey(record = {}) {
    const tenantId = String(record.tenantId || '').trim();
    if (tenantId) return `id:${tenantId}`;
    const tenantName = String(record.tenantName || '').trim();
    return tenantName ? `name:${tenantName}` : '';
  }

  function buildHistoryFilterOptions(records = [], tenantKey = '') {
    const tenants = new Map();
    const classes = new Set();
    for (const record of Array.isArray(records) ? records : []) {
      const key = historyTenantKey(record);
      if (key && !tenants.has(key)) {
        tenants.set(key, String(record.tenantName || record.tenantId || '').trim());
      }
      if (!tenantKey || key === tenantKey) {
        const className = String(record.className || '').trim();
        if (className) classes.add(className);
      }
    }
    return {
      tenants: [...tenants].map(([value, label]) => ({ value, label })),
      classes: [...classes].map((value) => ({ value, label: value })),
    };
  }

  function filterHistoryRecords(records = [], filters = {}) {
    const tenantKey = String(filters.tenantKey || '');
    const className = String(filters.className || '').trim();
    return (Array.isArray(records) ? records : []).filter((record) => {
      if (tenantKey && historyTenantKey(record) !== tenantKey) return false;
      if (className && String(record.className || '').trim() !== className) return false;
      return true;
    });
  }

  function paginateHistoryRecords(records = [], page = 1, pageSize = HISTORY_PAGE_SIZE) {
    const source = Array.isArray(records) ? records : [];
    const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : HISTORY_PAGE_SIZE;
    const total = source.length;
    const totalPages = Math.ceil(total / size);
    const requestedPage = Number.isInteger(page) ? page : Number.parseInt(page, 10);
    const current = totalPages
      ? Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages)
      : 1;
    const start = (current - 1) * size;
    return {
      records: source.slice(start, start + size),
      current,
      pageSize: size,
      total,
      totalPages,
    };
  }

  function renderHistoryPager(page) {
    const pager = $('historyPager');
    if (!pager) return;
    pager.innerHTML = '';
    if (!page || page.totalPages <= 1) {
      pager.classList.add('hidden');
      return;
    }
    pager.classList.remove('hidden');
    const addButton = (label, targetPage, disabled, active, ariaLabel) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pager-btn' + (active ? ' active' : '');
      button.textContent = label;
      button.disabled = disabled;
      button.setAttribute('aria-label', ariaLabel);
      if (active) button.setAttribute('aria-current', 'page');
      if (!disabled && !active) {
        button.addEventListener('click', () => {
          state.historyPage = targetPage;
          renderHistory();
        });
      }
      pager.appendChild(button);
    };

    addButton('‹', page.current - 1, page.current <= 1, false, '上一页');
    const start = Math.max(1, Math.min(page.current - 2, page.totalPages - 4));
    const end = Math.min(page.totalPages, start + 4);
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      addButton(String(pageNumber), pageNumber, false, pageNumber === page.current, `第 ${pageNumber} 页`);
    }
    addButton('›', page.current + 1, page.current >= page.totalPages, false, '下一页');
    const info = document.createElement('span');
    info.className = 'pager-info';
    info.textContent = `共 ${page.total} 条`;
    pager.appendChild(info);
  }

  function setHistoryFilterOptions(select, allLabel, options, selectedValue) {
    if (!select) return;
    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = allLabel;
    select.appendChild(allOption);
    for (const item of options) {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      select.appendChild(option);
    }
    select.value = selectedValue;
  }

  function renderHistoryFilters(records) {
    const controls = $('historyFilters');
    const tenantSelect = $('historyTenantFilter');
    const classSelect = $('historyClassFilter');
    const hasRecords = Array.isArray(records) && records.length > 0;
    controls?.classList.toggle('hidden', !hasRecords);
    if (!hasRecords) {
      state.historyPage = 1;
      state.historyTenantKey = '';
      state.historyClassName = '';
      setHistoryFilterOptions(tenantSelect, '全部租户', [], '');
      setHistoryFilterOptions(classSelect, '全部班级', [], '');
      if (tenantSelect) tenantSelect.disabled = true;
      if (classSelect) classSelect.disabled = true;
      return;
    }

    const allOptions = buildHistoryFilterOptions(records);
    if (state.historyTenantKey && !allOptions.tenants.some((item) => item.value === state.historyTenantKey)) {
      state.historyTenantKey = '';
      state.historyPage = 1;
    }
    const scopedOptions = buildHistoryFilterOptions(records, state.historyTenantKey);
    if (state.historyClassName && !scopedOptions.classes.some((item) => item.value === state.historyClassName)) {
      state.historyClassName = '';
      state.historyPage = 1;
    }
    setHistoryFilterOptions(tenantSelect, '全部租户', allOptions.tenants, state.historyTenantKey);
    setHistoryFilterOptions(classSelect, '全部班级', scopedOptions.classes, state.historyClassName);
    if (tenantSelect) tenantSelect.disabled = !allOptions.tenants.length;
    if (classSelect) classSelect.disabled = !scopedOptions.classes.length;
  }

  async function renderHistory() {
    const wrap = $('history');
    if (!wrap) return;

    let records = [];
    try {
      const res = await messages.sendToBackground({ type: 'APP_GET_HISTORY' });
      if (res && res.ok && Array.isArray(res.records)) records = res.records;
    } catch (_) {}

    renderHistoryFilters(records);
    const filteredRecords = filterHistoryRecords(records, {
      tenantKey: state.historyTenantKey,
      className: state.historyClassName,
    });
    wrap.innerHTML = '';
    if (!records.length) {
      renderHistoryPager(null);
      wrap.innerHTML = '<div class="recent-empty">暂无历史记录</div>';
      return;
    }
    if (!filteredRecords.length) {
      renderHistoryPager(null);
      wrap.innerHTML = '<div class="recent-empty">暂无符合筛选条件的历史记录</div>';
      return;
    }

    const page = paginateHistoryRecords(filteredRecords, state.historyPage);
    state.historyPage = page.current;
    renderHistoryPager(page);

    for (const r of page.records) {
      const row = document.createElement('div');
      row.className = 'recent-item fade-in';
      const time = r.at ? new Date(r.at).toLocaleString() : '';
      const titleName = r.username || r.account || '(未知账号)';
      const tenant = r.tenantName || '';
      const metaParts = [
        r.account || '',
        r.gradeName ? `年级：${r.gradeName}` : '',
        r.className ? `班级：${r.className}` : '',
        time,
      ].filter(Boolean);
      const dataAttrs =
        `data-site-url="${escapeHtml(r.siteUrl || '')}" ` +
        `data-account="${escapeHtml(r.account || '')}" ` +
        `data-tenant-id="${escapeHtml(r.tenantId || '')}" ` +
        `data-tenant-name="${escapeHtml(r.tenantName || '')}"`;

      row.innerHTML =
        `<div class="recent-item-info">` +
        `<div class="recent-item-text">${escapeHtml(titleName)}${tenant ? ` · ${escapeHtml(tenant)}` : ''}</div>` +
        `<div class="recent-item-time">${escapeHtml(metaParts.join(' · '))}</div>` +
        `</div>` +
        `<div class="recent-item-actions">` +
        `<button class="recent-action-btn" data-action="login" ${dataAttrs} title="一键登录">${icons.login}</button>` +
        `<button class="recent-action-btn danger" data-action="delete" ${dataAttrs} title="删除记录">${icons.delete}</button>` +
        `</div>`;
      wrap.appendChild(row);
    }
  }

  async function findHistoryRecord(siteUrl, account, tenantId) {
    try {
      const res = await messages.sendToBackground({ type: 'APP_GET_HISTORY' });
      const records = res && res.ok && Array.isArray(res.records) ? res.records : [];
      return records.find((r) =>
        (r.siteUrl || '') === siteUrl &&
        (r.account || '') === account &&
        (r.tenantId || '') === tenantId
      ) || null;
    } catch (_) {
      return null;
    }
  }

  async function onHistoryClick(e) {
    const btn = e.target.closest('.recent-action-btn');
    if (!btn) return;

    const action = btn.dataset.action;
    const siteUrl = btn.dataset.siteUrl || '';
    const account = btn.dataset.account || '';
    const tenantId = btn.dataset.tenantId || '';
    const tenantName = btn.dataset.tenantName || '';
    if (!action) return;

    if (action === 'delete') {
      if (state.loading) return;
      try {
        await messages.sendToBackground({
          type: 'APP_DELETE_HISTORY',
          payload: { siteUrl, account, tenantId },
        });
        setStatus('已删除历史记录', 'ok');
        await renderHistory();
      } catch (err) {
        setStatus(`删除失败: ${err.message}`, 'err');
      }
      return;
    }

    if (action !== 'login') return;
    if (!account || !tenantId) {
      setStatus('历史记录缺少账号或学校', 'err');
      return;
    }
    if (state.loading) return;

    const originalHtml = btn.innerHTML;
    const originalAriaLabel = btn.getAttribute('aria-label');
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    btn.setAttribute('aria-label', '登录中');
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>';

    try {
      const record = await findHistoryRecord(siteUrl, account, tenantId);
      if (!record?.password) {
        setStatus('历史记录缺少密码，请重新填写后登录', 'err');
        return;
      }

      const form = {
        siteUrl: record.siteUrl || siteUrl,
        account: record.account || account,
        password: record.password,
      };
      fillForm(form);
      state.selectedSchool = {
        tenantId: record.tenantId || tenantId,
        tenantName: record.tenantName || tenantName,
      };
      const search = $('schoolSearch');
      if (search) search.value = state.selectedSchool.tenantName || '';
      await handleLogin(form, {
        updateMainButton: false,
        refreshHistory: false,
        recordHistory: false,
      });
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
      if (originalAriaLabel == null) {
        btn.removeAttribute('aria-label');
      } else {
        btn.setAttribute('aria-label', originalAriaLabel);
      }
      btn.innerHTML = originalHtml;
    }
  }

  // ── 事件绑定 ──
  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    const pwdToggle = $('pwdToggle');
    const passwordEl = $('password');
    if (pwdToggle && passwordEl) {
      pwdToggle.addEventListener('click', () => {
        const showing = passwordEl.type === 'text';
        passwordEl.type = showing ? 'password' : 'text';
        pwdToggle.textContent = showing ? '显示' : '隐藏';
      });
    }

    // 站点地址变更：清空学校缓存，重新加载
    const siteUrlEl = $('siteUrl');
    if (siteUrlEl) {
      siteUrlEl.addEventListener('change', () => {
        state.schools = [];
        state.selectedSchool = null;
        state.schoolsLoaded = false;
        const search = $('schoolSearch');
        if (search) search.value = '';
        loadSchools();
      });
    }

    // 学校搜索框
    const schoolSearch = $('schoolSearch');
    if (schoolSearch) {
      schoolSearch.addEventListener('focus', () => {
        if (!state.schools.length) {
          loadSchools();
          return;
        }
        expandSchoolList();
      });
      schoolSearch.addEventListener('input', debounce(() => {
        if (!state.schools.length) return;
        renderSchoolList(matchSchools(schoolSearch.value || ''));
      }, 300));
      schoolSearch.addEventListener('blur', onSchoolSearchBlur);
    }

    $('loginBtn')?.addEventListener('click', () => handleLogin());
    $('history')?.addEventListener('click', onHistoryClick);
    $('historyTenantFilter')?.addEventListener('change', (event) => {
      state.historyTenantKey = event.target.value || '';
      state.historyClassName = '';
      state.historyPage = 1;
      renderHistory();
    });
    $('historyClassFilter')?.addEventListener('change', (event) => {
      state.historyClassName = event.target.value || '';
      state.historyPage = 1;
      renderHistory();
    });

    $('copyTokenBtn')?.addEventListener('click', async () => {
      try {
        const res = await messages.sendToBackground({ type: 'APP_GET_TOKEN' });
        const token = res?.token || '';
        if (!token) {
          setStatus('暂无 Token', 'err');
          return;
        }
        await navigator.clipboard.writeText(token);
        setStatus('Token 已复制', 'ok');
      } catch (err) {
        setStatus(`复制失败: ${err.message}`, 'err');
      }
    });
    $('appClearTokenToolBtn')?.addEventListener('click', async () => {
      try {
        await messages.sendToBackground({ type: 'APP_CLEAR_TOKEN' });
        await renderToken();
        setStatus('Token 已清空', 'ok');
      } catch (err) {
        setStatus(`清除失败: ${err.message}`, 'err');
      }
    });

    const tokenEl = $('tokenValue');
    const tokenWrap = $('tokenWrap');
    if (tokenEl && tokenWrap) {
      tokenEl.addEventListener('input', () => {
        syncEditableState(tokenEl, tokenWrap, getEditableText(tokenEl).trim());
      });
      tokenEl.addEventListener('blur', onTokenBlur);
    }
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    bindEvents();
    ns.workspaceUi?.registerBeforeLeave('app-token', onTokenBlur);
    await Promise.all([renderCredentials(), renderToken(), renderHistory()]);
  }

  function activate() {
    if (activationPromise) return activationPromise;
    activationPromise = (async () => {
      const siteUrl = ($('siteUrl')?.value || '').trim();
      if (siteUrl) await loadSchools();
    })();
    return activationPromise;
  }

  ns.appLoginUi = {
    init,
    activate,
    renderToken,
    renderCredentials,
    renderHistory,
    loadSchools,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      buildHistoryFilterOptions,
      filterHistoryRecords,
      historyTenantKey,
      paginateHistoryRecords,
    };
  }
})();
