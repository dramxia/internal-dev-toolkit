/* 内部开发工具箱 — Popup「其它」站点登录 UI（知雀） */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit;
  const messages = ns.messages;

  const IDs = {
    siteUrl: 'otherSiteUrl',
    account: 'otherAccount',
    password: 'otherPassword',
    pwdToggle: 'otherPwdToggle',
    loginBtn: 'otherLoginBtn',
    enterBtn: 'otherEnterBtn',
    zhiqueBtn: 'otherZhiqueBtn',
    tokenWrap: 'otherTokenWrap',
    tokenValue: 'otherTokenValue',
    tokenUpdated: 'otherTokenUpdated',
    copyTokenBtn: 'otherCopyTokenBtn',
    userMeta: 'otherUserMeta',
    history: 'otherHistoryList',
    teacherList: 'otherTeacherList',
    teacherEmpty: 'otherTeacherEmpty',
    teacherLoadMore: 'otherTeacherLoadMore',
    teacherRefreshBtn: 'otherTeacherRefreshBtn',
  };

  const icons = {
    enter: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
    zhique: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    delete: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  };

  const DEFAULT_TEACHER_PASSWORD = 'Xx@123456';
  const TEACHER_PAGE_SIZE = 10;

  let lastSavedToken = '';
  let loading = false;
  let historyExpanded = false;
  let teacherLoading = false;
  let initialized = false;
  let activationPromise = null;
  let teacherState = {
    records: [],
    total: 0,
    current: 0,
    size: TEACHER_PAGE_SIZE,
    siteUrl: '',
    defaultPassword: DEFAULT_TEACHER_PASSWORD,
  };

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

  function setStatus(text, kind) {
    ns.ui.toast(text, kind);
  }

  function fillForm(form = {}) {
    if ($('siteUrl') && form.siteUrl != null) $('siteUrl').value = form.siteUrl;
    if ($('account') && form.account != null) $('account').value = form.account;
    if ($('password') && form.password != null) $('password').value = form.password;
  }

  function getEditableText(el) {
    return (el.textContent || '').replace(/ /g, ' ');
  }

  function setEditableText(el, text) {
    el.textContent = text || '';
  }

  function syncEditableState(el, wrap, text) {
    const isEmpty = !text;
    el.classList.toggle('empty', isEmpty);
    wrap.classList.toggle('empty', isEmpty);
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
      setStatus('请输入网站地址', 'err');
      return null;
    }
    if (!form.account || !form.password) {
      setStatus('请输入账号和密码', 'err');
      return null;
    }
    return form;
  }

  function setButtonsLoading(active, focus = '') {
    loading = active;
    const loginBtn = $('loginBtn');
    const enterBtn = $('enterBtn');
    const zhiqueBtn = $('zhiqueBtn');
    const labels = {
      login: '仅获取 Token',
      enter: '一键登入',
      zhique: '知雀 SSO',
    };
    const loadingLabels = {
      login: '登录中...',
      enter: '登入中...',
      zhique: '跳转中...',
    };

    [loginBtn, enterBtn, zhiqueBtn].forEach((btn) => {
      if (btn) btn.disabled = active;
    });

    if (loginBtn) loginBtn.textContent = active && focus === 'login' ? loadingLabels.login : labels.login;
    if (enterBtn) enterBtn.textContent = active && focus === 'enter' ? loadingLabels.enter : labels.enter;
    if (zhiqueBtn) zhiqueBtn.textContent = active && focus === 'zhique' ? loadingLabels.zhique : labels.zhique;
  }

  async function renderCredentials() {
    try {
      const res = await messages.sendToBackground({ type: 'OTHER_GET_CREDENTIALS' });
      if (!res || !res.ok) return;
      if ($('siteUrl')) $('siteUrl').value = res.siteUrl || '';
      if ($('account')) $('account').value = res.account || '';
      if ($('password')) $('password').value = res.password || '';
    } catch (_) {}
  }

  async function renderToken() {
    const tokenEl = $('tokenValue');
    const tokenWrap = $('tokenWrap');
    if (!tokenEl || !tokenWrap) return;

    let tokenState = { token: '', updatedAt: 0, user: null };
    try {
      const res = await messages.sendToBackground({ type: 'OTHER_GET_TOKEN' });
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
      return true;
    }
    try {
      if (!next) {
        await messages.sendToBackground({ type: 'OTHER_CLEAR_TOKEN' });
        setStatus('Token 已清除', 'ok');
      } else {
        await messages.sendToBackground({
          type: 'OTHER_SAVE_TOKEN',
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

  async function handleLoginOnly() {
    if (loading) return;
    const form = validateForm();
    if (!form) return;

    setButtonsLoading(true, 'login');
    setStatus('正在获取 token...', '');
    try {
      const res = await messages.sendToBackground({
        type: 'OTHER_LOGIN',
        payload: form,
      });
      if (!res || !res.ok) throw new Error(res?.error || '登录失败');
      if (res.siteUrl && $('siteUrl')) $('siteUrl').value = res.siteUrl;
      await renderToken();
      if (res.needResetPassword) {
        setStatus('登录成功，但该账号需要修改密码', 'err');
        return;
      }
      const name = res.user?.username || res.user?.account || '';
      setStatus(name ? `登录成功：${name}` : '登录成功，token 已保存', 'ok');
      await loadTeachers(true);
    } catch (err) {
      setStatus(`登录失败: ${err.message}`, 'err');
    } finally {
      setButtonsLoading(false);
    }
  }

  async function handleEnter(formOverride) {
    if (loading) return;
    const form = formOverride || validateForm();
    if (!form) return;

    setButtonsLoading(true, 'enter');
    setStatus('正在获取 token 并进入系统...', '');
    try {
      const res = await messages.sendToBackground({
        type: 'OTHER_ENTER',
        payload: form,
      });
      // 即使失败也可能已拿到 token（例如需改密），刷新展示
      await renderToken();
      if (!res || !res.ok) throw new Error(res?.error || '一键登入失败');
      if (res.siteUrl) fillForm({ siteUrl: res.siteUrl, account: form.account, password: form.password });
      const name = res.user?.username || res.user?.account || '';
      setStatus(name ? `已登入：${name}` : '已获取 token 并打开系统', 'ok');
      await renderHistory();
      await loadTeachers(true);
    } catch (err) {
      await renderToken();
      setStatus(err.message || '一键登入失败', 'err');
    } finally {
      setButtonsLoading(false);
    }
  }

  // 对齐教师端「AI数字课」：登录 → zhique/redirectUrl → OAuth SSO → a.zhique.cn/home
  async function handleZhiqueEnter(formOverride) {
    if (loading) return;
    const form = formOverride || validateForm();
    if (!form) return;

    setButtonsLoading(true, 'zhique');
    setStatus('正在登录并跳转知雀...', '');
    try {
      const res = await messages.sendToBackground({
        type: 'OTHER_ZHIQUE_ENTER',
        payload: form,
      });
      await renderToken();
      if (!res || !res.ok) throw new Error(res?.error || '知雀跳转失败');
      if (res.siteUrl) fillForm({ siteUrl: res.siteUrl, account: form.account, password: form.password });
      const name = res.user?.username || res.user?.account || '';
      setStatus(name ? `已跳转知雀：${name}` : '已打开知雀 SSO 链接', 'ok');
      await renderHistory();
      await loadTeachers(true);
    } catch (err) {
      await renderToken();
      setStatus(err.message || '知雀跳转失败', 'err');
    } finally {
      setButtonsLoading(false);
    }
  }

  async function renderHistory() {
    const wrap = $('history');
    if (!wrap) return;

    let records = [];
    try {
      const res = await messages.sendToBackground({ type: 'OTHER_GET_HISTORY' });
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
      const actionBadge = r.lastAction === 'zhique'
        ? '<span class="recent-env-badge online" title="最近操作：知雀">知雀</span>'
        : '<span class="recent-env-badge local" title="最近操作：一键登入">登入</span>';
      const dataAttrs =
        `data-site-url="${escapeHtml(r.siteUrl || '')}" ` +
        `data-account="${escapeHtml(r.account || '')}"`;

      row.innerHTML =
        `<div class="recent-item-info">` +
        `<div class="recent-item-text">${actionBadge}${escapeHtml(titleName)}${tenant ? ` · ${escapeHtml(tenant)}` : ''}</div>` +
        `<div class="recent-item-time">${escapeHtml(r.account || '')}${time ? ` · ${escapeHtml(time)}` : ''}</div>` +
        `</div>` +
        `<div class="recent-item-actions">` +
        `<button class="recent-action-btn" data-action="enter" ${dataAttrs} title="一键登入">${icons.enter}</button>` +
        `<button class="recent-action-btn" data-action="zhique" ${dataAttrs} title="知雀">${icons.zhique}</button>` +
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

  async function findHistoryRecord(siteUrl, account) {
    try {
      const res = await messages.sendToBackground({ type: 'OTHER_GET_HISTORY' });
      const records = res && res.ok && Array.isArray(res.records) ? res.records : [];
      return records.find((r) =>
        (r.siteUrl || '') === siteUrl && (r.account || '') === account
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
    if (!action) return;

    if (action === 'delete') {
      if (loading) return;
      try {
        await messages.sendToBackground({
          type: 'OTHER_DELETE_HISTORY',
          payload: { siteUrl, account },
        });
        setStatus('已删除历史记录', 'ok');
        await renderHistory();
      } catch (err) {
        setStatus(`删除失败: ${err.message}`, 'err');
      }
      return;
    }

    if (!account) {
      setStatus('历史记录缺少账号', 'err');
      return;
    }
    if (loading) return;

    const record = await findHistoryRecord(siteUrl, account);
    if (!record?.password) {
      setStatus('历史记录缺少密码，请重新填写后登录', 'err');
      if (record) fillForm({ siteUrl: record.siteUrl, account: record.account, password: '' });
      return;
    }

    const form = {
      siteUrl: record.siteUrl || siteUrl,
      account: record.account || account,
      password: record.password,
    };
    fillForm(form);

    const row = btn.closest('.recent-item');
    const groupBtns = row ? row.querySelectorAll('.recent-action-btn') : [btn];
    const originalHtml = btn.innerHTML;
    groupBtns.forEach((b) => { b.disabled = true; });
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      if (action === 'enter') {
        await handleEnter(form);
      } else if (action === 'zhique') {
        await handleZhiqueEnter(form);
      }
    } finally {
      groupBtns.forEach((b) => { b.disabled = false; });
      btn.innerHTML = originalHtml;
    }
  }

  function resetTeacherState(message = '登录后可加载教师列表') {
    teacherState = {
      records: [],
      total: 0,
      current: 0,
      size: TEACHER_PAGE_SIZE,
      siteUrl: '',
      defaultPassword: DEFAULT_TEACHER_PASSWORD,
    };
    renderTeacherList(message);
  }

  function renderTeacherList(emptyText = '暂无教师数据') {
    const list = $('teacherList');
    const empty = $('teacherEmpty');
    const loadMore = $('teacherLoadMore');
    if (!list || !empty || !loadMore) return;

    list.innerHTML = '';
    const records = teacherState.records || [];
    if (!records.length) {
      list.classList.add('hidden');
      empty.textContent = emptyText;
      empty.classList.remove('hidden');
      loadMore.classList.add('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.classList.remove('hidden');

    for (const t of records) {
      const row = document.createElement('div');
      row.className = 'list-item fade-in';
      const phone = t.phone || t.account || '';
      const dataAttrs =
        `data-phone="${escapeHtml(phone)}" ` +
        `data-name="${escapeHtml(t.name || '')}"`;
      row.innerHTML =
        `<div class="list-item-content">` +
        `<div class="list-item-title">${escapeHtml(t.name || '(未命名)')}${t.roleName ? `<span class="list-item-role">${escapeHtml(t.roleName)}</span>` : ''}</div>` +
        `<div class="list-item-meta">${escapeHtml(phone || '无手机号')}</div>` +
        `</div>` +
        `<div class="list-item-actions">` +
        `<button class="action-btn primary" data-action="enter" ${dataAttrs} title="一键登入" ${phone ? '' : 'disabled'}>${icons.enter}</button>` +
        `<button class="action-btn" data-action="zhique" ${dataAttrs} title="知雀" ${phone ? '' : 'disabled'}>${icons.zhique}</button>` +
        `</div>`;
      list.appendChild(row);
    }

    const hasMore = records.length < (teacherState.total || 0);
    loadMore.classList.toggle('hidden', !hasMore);
    loadMore.disabled = teacherLoading;
    loadMore.textContent = teacherLoading ? '加载中...' : '加载更多';
  }

  async function loadTeachers(reset = false) {
    if (teacherLoading) return;

    const list = $('teacherList');
    const empty = $('teacherEmpty');
    const loadMore = $('teacherLoadMore');
    const refreshBtn = $('teacherRefreshBtn');

    teacherLoading = true;
    if (refreshBtn) refreshBtn.disabled = true;
    if (loadMore) {
      loadMore.disabled = true;
      loadMore.textContent = '加载中...';
    }

    try {
      // 无 token 时不请求，保持引导文案
      const tokenRes = await messages.sendToBackground({ type: 'OTHER_GET_TOKEN' });
      const token = tokenRes?.token || '';
      if (!token) {
        resetTeacherState('登录后可加载教师列表');
        return;
      }

      if (reset) {
        teacherState.records = [];
        teacherState.current = 0;
        teacherState.total = 0;
        if (list) {
          list.innerHTML = '';
          list.classList.add('hidden');
        }
        if (empty) {
          empty.textContent = '加载中...';
          empty.classList.remove('hidden');
        }
        if (loadMore) loadMore.classList.add('hidden');
      }

      const nextPage = reset ? 1 : (teacherState.current || 0) + 1;
      const siteUrl = ($('siteUrl')?.value || '').trim() || teacherState.siteUrl;
      const res = await messages.sendToBackground({
        type: 'OTHER_LIST_TEACHERS',
        payload: {
          siteUrl,
          current: nextPage,
          size: teacherState.size || TEACHER_PAGE_SIZE,
        },
      });
      if (!res || !res.ok) throw new Error(res?.error || '获取教师列表失败');

      const pageRecords = Array.isArray(res.records) ? res.records : [];
      teacherState = {
        records: reset ? pageRecords : teacherState.records.concat(pageRecords),
        total: Number(res.total) || 0,
        current: Number(res.current) || nextPage,
        size: Number(res.size) || TEACHER_PAGE_SIZE,
        siteUrl: res.siteUrl || siteUrl,
        defaultPassword: res.defaultPassword || DEFAULT_TEACHER_PASSWORD,
      };
      renderTeacherList(reset ? '暂无教师数据' : '暂无更多教师');
    } catch (err) {
      if (reset || !teacherState.records.length) {
        resetTeacherState(err.message || '获取教师列表失败');
      }
      setStatus(err.message || '获取教师列表失败', 'err');
    } finally {
      teacherLoading = false;
      if (refreshBtn) refreshBtn.disabled = false;
      if (loadMore) {
        const hasMore = teacherState.records.length < (teacherState.total || 0);
        loadMore.disabled = false;
        loadMore.textContent = '加载更多';
        loadMore.classList.toggle('hidden', !hasMore);
      }
    }
  }

  async function onTeacherClick(e) {
    const btn = e.target.closest('.action-btn');
    if (!btn) return;

    const action = btn.dataset.action;
    const phone = (btn.dataset.phone || '').trim();
    if (!action || !phone) {
      setStatus('该教师缺少手机号，无法登录', 'err');
      return;
    }
    if (loading) return;

    const siteUrl = ($('siteUrl')?.value || '').trim() || teacherState.siteUrl;
    const form = {
      siteUrl,
      account: phone,
      password: teacherState.defaultPassword || DEFAULT_TEACHER_PASSWORD,
    };
    fillForm(form);

    const row = btn.closest('.list-item');
    const groupBtns = row ? row.querySelectorAll('.action-btn') : [btn];
    const originalHtml = btn.innerHTML;
    groupBtns.forEach((b) => { b.disabled = true; });
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      if (action === 'enter') {
        await handleEnter(form);
      } else if (action === 'zhique') {
        await handleZhiqueEnter(form);
      }
    } finally {
      groupBtns.forEach((b) => { b.disabled = false; });
      btn.innerHTML = originalHtml;
    }
  }

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

    $('loginBtn')?.addEventListener('click', () => handleLoginOnly());
    $('enterBtn')?.addEventListener('click', () => handleEnter());
    $('zhiqueBtn')?.addEventListener('click', () => handleZhiqueEnter());
    $('history')?.addEventListener('click', onHistoryClick);
    $('teacherList')?.addEventListener('click', onTeacherClick);
    $('teacherLoadMore')?.addEventListener('click', () => loadTeachers(false));
    $('teacherRefreshBtn')?.addEventListener('click', () => loadTeachers(true));

    $('copyTokenBtn')?.addEventListener('click', async () => {
      try {
        const res = await messages.sendToBackground({ type: 'OTHER_GET_TOKEN' });
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
    $('otherClearTokenToolBtn')?.addEventListener('click', async () => {
      try {
        await messages.sendToBackground({ type: 'OTHER_CLEAR_TOKEN' });
        await renderToken();
        resetTeacherState();
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
    ns.workspaceUi?.registerBeforeLeave('other-token', onTokenBlur);
    await Promise.all([renderCredentials(), renderToken(), renderHistory()]);
  }

  function activate() {
    if (!activationPromise) activationPromise = loadTeachers(true);
    return activationPromise;
  }

  ns.otherLoginUi = {
    init,
    activate,
    renderToken,
    renderCredentials,
    renderHistory,
    loadTeachers,
  };
})();
