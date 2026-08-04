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
    historyExpanded: false,
    listOpen: false,
  };

  let lastSavedToken = '';

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

  function setStatus(text, kind) {
    ns.ui.toast(text, kind);
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

  function setButtonsLoading(active) {
    state.loading = active;
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

    let tokenState = { token: '', updatedAt: 0, user: null };
    try {
      const res = await messages.sendToBackground({ type: 'APP_GET_TOKEN' });
      if (res && res.ok) {
        tokenState = {
          token: res.token || '',
          updatedAt: res.updatedAt || 0,
          user: res.user || null,
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
      const u = tokenState.user;
      if (u && (u.username || u.account || u.tenantName)) {
        const parts = [
          u.username || u.account || '',
          u.tenantName || '',
          Array.isArray(u.roleNames) && u.roleNames.length ? u.roleNames.join('/') : '',
        ].filter(Boolean);
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
      return;
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
    } catch (err) {
      setStatus(`保存失败: ${err.message}`, 'err');
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
  async function handleLogin(formOverride) {
    if (state.loading) return;
    const form = formOverride || validateForm();
    if (!form) return;

    setButtonsLoading(true);
    setStatus('正在获取 token...', '');
    try {
      const res = await messages.sendToBackground({
        type: 'APP_LOGIN',
        payload: {
          siteUrl: form.siteUrl,
          account: form.account,
          password: form.password,
          tenantId: state.selectedSchool?.tenantId || '',
        },
      });
      await renderToken();
      if (!res || !res.ok) throw new Error(res?.error || '登录失败');
      const name = res.user?.username || res.user?.account || '';
      setStatus(name ? `登录成功：${name}` : '登录成功，token 已保存', 'ok');
      await renderHistory();
    } catch (err) {
      await renderToken();
      setStatus(`登录失败: ${err.message}`, 'err');
    } finally {
      setButtonsLoading(false);
    }
  }

  // ── 历史记录 ──
  async function renderHistory() {
    const wrap = $('history');
    if (!wrap) return;

    let records = [];
    try {
      const res = await messages.sendToBackground({ type: 'APP_GET_HISTORY' });
      if (res && res.ok && Array.isArray(res.records)) records = res.records;
    } catch (_) {}

    wrap.innerHTML = '';
    if (!records.length) {
      wrap.innerHTML = '<div class="recent-empty">暂无历史记录</div>';
      return;
    }

    const displayLimit = historyExpanded ? 20 : 5;
    const displayRecords = records.slice(0, displayLimit);
    const hasMore = records.length > displayLimit;

    for (const r of displayRecords) {
      const row = document.createElement('div');
      row.className = 'recent-item fade-in';
      const time = r.at ? new Date(r.at).toLocaleString() : '';
      const titleName = r.username || r.account || '(未知账号)';
      const tenant = r.tenantName || '';
      const dataAttrs =
        `data-site-url="${escapeHtml(r.siteUrl || '')}" ` +
        `data-account="${escapeHtml(r.account || '')}" ` +
        `data-password="${escapeHtml(r.password || '')}" ` +
        `data-tenant-id="${escapeHtml(r.tenantId || '')}" ` +
        `data-tenant-name="${escapeHtml(r.tenantName || '')}"`;

      row.innerHTML =
        `<div class="recent-item-info">` +
        `<div class="recent-item-text">${escapeHtml(titleName)}${tenant ? ` · ${escapeHtml(tenant)}` : ''}</div>` +
        `<div class="recent-item-time">${escapeHtml(r.account || '')}${time ? ` · ${escapeHtml(time)}` : ''}</div>` +
        `</div>` +
        `<div class="recent-item-actions">` +
        `<button class="recent-action-btn" data-action="login" ${dataAttrs} title="一键登录">${icons.login}</button>` +
        `<button class="recent-action-btn danger" data-action="delete" ${dataAttrs} title="删除记录">${icons.delete}</button>` +
        `</div>`;
      wrap.appendChild(row);
    }

    if (hasMore || historyExpanded) {
      const expandBtn = document.createElement('button');
      expandBtn.className = 'load-more';
      expandBtn.textContent = historyExpanded
        ? '收起'
        : `显示更多 (${records.length - displayLimit} 条)`;
      expandBtn.addEventListener('click', () => {
        historyExpanded = !historyExpanded;
        renderHistory();
      });
      wrap.appendChild(expandBtn);
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
    const password = btn.dataset.password || '';
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

    if (!account || !tenantId) {
      setStatus('历史记录缺少账号或学校', 'err');
      return;
    }
    if (state.loading) return;

    const form = { siteUrl, account, password };
    fillForm(form);
    // 选中对应学校
    state.selectedSchool = { tenantId, tenantName };
    const search = $('schoolSearch');
    if (search) search.value = tenantName || '';

    const row = btn.closest('.recent-item');
    const groupBtns = row ? row.querySelectorAll('.recent-action-btn') : [btn];
    const originalHtml = btn.innerHTML;
    groupBtns.forEach((b) => { b.disabled = true; });
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      if (action === 'login') {
        await handleLogin(form);
      }
    } finally {
      groupBtns.forEach((b) => { b.disabled = false; });
      btn.innerHTML = originalHtml;
    }
  }

  // ── 事件绑定 ──
  function bindEvents() {
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
    bindEvents();
    await renderCredentials();
    await renderToken();
    await renderHistory();
    // 有站点地址时预加载学校列表
    const siteUrl = ($('siteUrl')?.value || '').trim();
    if (siteUrl) {
      await loadSchools();
    }
  }

  ns.appLoginUi = {
    init,
    renderToken,
    renderCredentials,
    renderHistory,
    loadSchools,
  };
})();
