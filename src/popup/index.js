/* 内部开发工具箱 — Popup 入口 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit;
  const $ = (id) => document.getElementById(id);

  async function renderCredentials() {
    const creds = await ns.credentials.getCredentials();
    $('account').value = creds.account || '';
    $('password').value = creds.password || '';
  }

  // 记录最近一次从存储读到的 token，用于 blur 时判断用户是否改动了内容
  let lastSavedToken = '';
  // 记录最近一次从存储读到的自定义域名覆盖；空串表示未覆盖（使用项目默认）
  let lastSavedDomain = '';
  let adminInitialized = false;
  let adminLoginPending = false;
  let adminInjectionPending = false;
  let adminHistoryRecords = [];

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

  async function renderToken() {
    const tokenState = await ns.token.getToken();
    const tokenEl = $('tokenValue');
    const tokenWrap = $('tokenWrap');
    lastSavedToken = tokenState.token || '';

    // 仅在编辑区未聚焦时刷新内容，避免覆盖用户正在编辑的输入
    if (document.activeElement !== tokenEl) {
      setEditableText(tokenEl, lastSavedToken);
    }
    syncEditableState(tokenEl, tokenWrap, lastSavedToken);
    if (lastSavedToken) {
      const updatedAt = tokenState.updatedAt ? new Date(tokenState.updatedAt).toLocaleString() : '未知';
      $('tokenUpdated').textContent = `获取时间: ${updatedAt}`;
      $('copyTokenBtn').disabled = false;
    } else {
      $('tokenUpdated').textContent = '';
      $('copyTokenBtn').disabled = true;
    }
    syncAdminButtons();
  }

  // 点击即编辑、失焦自动保存；向网站注入由登录成功或手动按钮触发。
  // 可编辑内容区会随内容自然增高，无需 textarea 与显式「编辑/保存」按钮。
  async function onTokenBlur() {
    if (adminLoginPending) return true;
    const tokenEl = $('tokenValue');
    const next = getEditableText(tokenEl).trim();
    // 内容未变化，仅刷新显示态
    if (next === lastSavedToken) {
      await renderToken();
      return true;
    }
    if (!next) {
      // 清空了 token
      try {
        await ns.token.clearToken();
        await renderToken();
        setLoginStatus('Token 已清除', 'ok');
        ns.messages.sendToActiveTab({ type: 'CLEAR_TOKEN' }).catch(() => {});
        return true;
      } catch (err) {
        setLoginStatus(`清除失败: ${err.message}`, 'err');
        return false;
      }
    }
    try {
      await ns.token.saveToken(next);
      await renderToken();
      setLoginStatus('Token 已保存', 'ok');
      return true;
    } catch (err) {
      setLoginStatus(`保存失败: ${err.message}`, 'err');
      return false;
    }
  }

  // 项目默认 baseUrl，用于「无覆盖」时回填输入框与判断是否回到默认
  function getDefaultBaseUrl() {
    return ns.currentProject.getProject().baseUrl || '';
  }

  async function renderDomain() {
    const domainState = await ns.customDomain.getDomain();
    const domainEl = $('domainValue');
    const domainWrap = $('domainWrap');
    const defaultUrl = getDefaultBaseUrl();
    lastSavedDomain = domainState.baseUrl || '';

    // 显示当前生效地址：有覆盖用覆盖，否则回填默认值便于在其基础上修改
    const effective = lastSavedDomain || defaultUrl;
    if (document.activeElement !== domainEl) {
      setEditableText(domainEl, effective);
    }
    syncEditableState(domainEl, domainWrap, effective);
    if (effective) {
      if (lastSavedDomain) {
        const updatedAt = domainState.updatedAt ? new Date(domainState.updatedAt).toLocaleString() : '未知';
        $('domainUpdated').textContent = `自定义 · 更新于 ${updatedAt}`;
      } else {
        $('domainUpdated').textContent = defaultUrl ? `项目默认 · ${defaultUrl}` : '';
      }
    } else {
      $('domainUpdated').textContent = '';
    }
    $('copyDomainBtn').disabled = !getEditableText(domainEl).trim();
    // 提示当前默认域名（便于用户参考）
    const hint = $('domainDefaultHint');
    if (hint) hint.textContent = defaultUrl;
    const summary = $('domainSummaryValue');
    if (summary) {
      summary.textContent = effective || '未配置';
      summary.title = effective || '未配置';
    }
    const openButton = $('openCurrentDomainBtn');
    if (openButton) openButton.disabled = !effective.trim();
  }

  // 点击即编辑、失焦自动保存：与 token 交互一致。
  // 清空或填回默认值 → 清除覆盖（恢复默认）；填入新值 → 保存覆盖并通知 background 刷新缓存。
  async function onDomainBlur() {
    if (adminLoginPending) return true;
    const domainEl = $('domainValue');
    const next = getEditableText(domainEl).trim();
    const defaultUrl = getDefaultBaseUrl();

    // 视为「未覆盖」的两种情况：空串 / 等于默认值
    const isDefault = !next || next === defaultUrl;
    const normalizedNext = isDefault ? '' : next;

    if (normalizedNext === lastSavedDomain) {
      // 内容未实质变化，仅刷新显示态
      await renderDomain();
      return true;
    }
    try {
      if (normalizedNext) {
        await ns.customDomain.saveDomain(normalizedNext);
        setLoginStatus('域名已保存，后台请求将使用新地址', 'ok');
      } else {
        await ns.customDomain.clearDomain();
        setLoginStatus('已恢复项目默认域名', 'ok');
      }
      await renderDomain();
      // 通知 background 刷新内存缓存（getBaseUrl 同步读取该缓存）
      ns.messages.sendToBackground({ type: 'REFRESH_BASE_URL' }).catch(() => {});
      return true;
    } catch (err) {
      setLoginStatus(`保存失败: ${err.message}`, 'err');
      return false;
    }
  }

  function setLoginStatus(text, kind) {
    // 统一走顶部悬浮 toast，不再占用面板内容空间
    ns.ui.toast(text, kind);
  }

  async function saveAdminSettings() {
    if (!(await onTokenBlur())) return false;
    return onDomainBlur();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function bindEditableField(id, onBlur) {
    const el = $(id);
    const wrap = el?.closest('.token-shell');
    if (!el || !wrap) return;
    el.addEventListener('input', () => {
      syncEditableState(el, wrap, getEditableText(el).trim());
    });
    el.addEventListener('blur', onBlur);
  }

  async function copyToClipboard(text, successText = '内容已复制') {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setLoginStatus(successText, 'ok');
    } catch (err) {
      setLoginStatus(`复制失败: ${err.message}`, 'err');
    }
  }

  function syncAdminButtons() {
    const busy = adminLoginPending || adminInjectionPending;
    for (const id of ['account', 'password', 'clearBtn', 'apiLoginBtn', 'clearTokenToolBtn', 'applyDomainBtn', 'restoreDomainBtn']) {
      $(id).disabled = busy;
    }
    for (const id of ['tokenValue', 'domainValue']) $(id).contentEditable = adminLoginPending ? 'false' : 'true';
    document.querySelectorAll('[data-apply-admin-history]').forEach((button) => { button.disabled = busy; });
    for (const id of ['injectAdminTokenBtn', 'injectAdminTokenToolBtn']) {
      const button = $(id);
      button.disabled = busy || !lastSavedToken.trim();
      button.textContent = adminInjectionPending ? '正在注入…' : '一键注入当前网站';
    }
  }

  function setAdminLoginPending(pending) {
    adminLoginPending = pending;
    syncAdminButtons();
    $('apiLoginBtn').textContent = pending ? '正在登录…' : '登录';
  }

  async function renderAdminHistory() {
    adminHistoryRecords = await ns.adminLoginHistory.getRecords();
    $('adminHistoryCount').textContent = `${adminHistoryRecords.length} 条`;
    $('adminHistoryList').innerHTML = adminHistoryRecords.length ? adminHistoryRecords.map((record, index) => {
      const expiresAt = ns.adminLoginHistory.tokenExpiresAt(record.token);
      const tokenStatus = expiresAt == null ? 'Token 待验证' : (expiresAt <= Date.now() ? 'Token 已过期，应用时重新登录' : 'Token 未过期');
      const usedAt = new Date(record.lastUsedAt || record.updatedAt).toLocaleString();
      return `<div class="admin-history-item"><div class="admin-history-info">` +
        `<strong class="admin-history-account">${escapeHtml(record.account)}</strong>` +
        `<div class="admin-history-domain">${escapeHtml(record.baseUrl)}</div>` +
        `<div class="admin-history-meta">密码已保存 · ${tokenStatus}<br>最近使用：${escapeHtml(usedAt)}</div></div>` +
        `<button class="btn btn-primary" type="button" data-apply-admin-history="${index}" aria-label="应用 ${escapeHtml(record.account)}，${escapeHtml(record.baseUrl)}">应用</button></div>`;
    }).join('') : '<div class="recent-empty">暂无登录历史，成功登录后会自动保存。</div>';
    syncAdminButtons();
  }

  async function refreshAdminSession() {
    await ns.currentProject.refreshBaseUrlCache();
    await Promise.all([renderCredentials(), renderToken(), renderDomain(), renderAdminHistory()]);
    ns.workspaceUi?.syncHeader();
  }

  async function finishLoginResponse(response) {
    if (!response?.ok) throw new Error(response?.error || '登录失败');
    let result = response;
    if (result.requiresVerification) {
      result = await requestAdminVerification(result.verification);
      if (!result) {
        setLoginStatus('已取消登录', '');
        return null;
      }
    }
    if (!result.token) throw new Error('登录接口未返回 Token');
    await refreshAdminSession();
    return result;
  }

  async function applyAdminHistory(record) {
    if (!record || adminLoginPending || adminInjectionPending) return;
    setAdminLoginPending(true);
    setLoginStatus('正在检查历史 Token，过期时将重新登录…', '');
    try {
      const response = await ns.messages.sendToBackground({
        type: 'APPLY_ADMIN_LOGIN_HISTORY',
        payload: { id: record.id, projectId: ns.currentProject.getCachedProjectId() },
      });
      const result = await finishLoginResponse(response);
      if (!result) return;
      setLoginStatus(result.reused ? '已应用账号及对应 API 域名' : '已重新登录并应用账号信息', 'ok');
    } catch (error) {
      setLoginStatus(`应用失败: ${error.message}`, 'err');
    } finally {
      setAdminLoginPending(false);
    }
  }

  async function injectAdminToken() {
    if (adminLoginPending || adminInjectionPending) return;
    adminInjectionPending = true;
    syncAdminButtons();
    try {
      // 先保存同页的 Token 和 API 域名，再读取最新凭证与地址。
      if (!(await saveAdminSettings())) return;
      const response = await ns.messages.sendToBackground({
        type: 'INJECT_ADMIN_TOKEN',
        payload: {
          projectId: ns.currentProject.getCachedProjectId(),
          baseUrl: ns.currentProject.getBaseUrl(),
        },
      });
      if (!response?.ok || !response.injected) throw new Error(response?.error || 'Token 注入失败');
      setLoginStatus('已注入当前网站并跳转到根目录', 'ok');
    } catch (error) {
      setLoginStatus(`注入失败: ${error.message}`, 'err');
    } finally {
      adminInjectionPending = false;
      syncAdminButtons();
    }
  }

  function requestAdminVerification(verification) {
    const dialog = $('adminVerificationDialog');
    const form = $('adminVerificationForm');
    const input = $('adminVerificationCode');
    const errorEl = $('adminVerificationError');
    const confirmBtn = $('adminVerificationConfirm');
    const cancelBtn = $('adminVerificationCancel');
    let submitting = false;
    let result = null;

    function showError(message = '') {
      errorEl.textContent = message;
      errorEl.hidden = !message;
      input.setAttribute('aria-invalid', String(Boolean(message)));
    }

    function setSubmitting(value) {
      submitting = value;
      input.disabled = value;
      confirmBtn.disabled = value;
      cancelBtn.disabled = value;
      confirmBtn.textContent = value ? '验证中…' : '确定';
      form.setAttribute('aria-busy', String(value));
    }

    form.reset();
    showError();
    setSubmitting(false);
    setLoginStatus('', '');
    $('apiLoginBtn').textContent = '等待验证码…';

    return new Promise((resolve, reject) => {
      async function onSubmit(event) {
        event.preventDefault();
        if (submitting) return;
        const code = input.value.trim();
        if (!code) {
          showError('请输入验证码');
          input.focus();
          return;
        }
        showError();
        setSubmitting(true);
        try {
          const response = await ns.messages.sendToBackground({
            type: 'VERIFY_LOGIN_API',
            payload: { verification, code },
          });
          if (!response?.ok || !response.token) throw new Error(response?.error || '验证失败，请重试');
          result = response;
          dialog.close();
        } catch (err) {
          showError(err.message || '验证失败，请重试');
        } finally {
          setSubmitting(false);
          if (dialog.open) {
            input.focus();
            input.select();
          }
        }
      }

      function onCancel(event) {
        event.preventDefault();
        if (!submitting) dialog.close();
      }

      function onKeyDown(event) {
        if (event.key !== 'Escape') return;
        // 弹窗内的 Escape 只处理本次验证，不触发工作台返回。
        event.stopPropagation();
        if (submitting) event.preventDefault();
      }

      function cleanup() {
        form.removeEventListener('submit', onSubmit);
        cancelBtn.removeEventListener('click', onCancel);
        dialog.removeEventListener('cancel', onCancel);
        dialog.removeEventListener('keydown', onKeyDown);
        dialog.removeEventListener('close', onClose);
        form.reset();
      }

      function onClose() {
        cleanup();
        resolve(result);
      }

      form.addEventListener('submit', onSubmit);
      cancelBtn.addEventListener('click', onCancel);
      dialog.addEventListener('cancel', onCancel);
      dialog.addEventListener('keydown', onKeyDown);
      dialog.addEventListener('close', onClose);
      try {
        dialog.showModal();
        input.focus();
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  function bindCredentials() {
    $('pwdToggle').addEventListener('click', () => {
      const input = $('password');
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      $('pwdToggle').textContent = showing ? '显示' : '隐藏';
    });

    $('clearBtn').addEventListener('click', async () => {
      try {
        await ns.credentials.clearCredentials();
        await ns.token.clearToken();
        $('account').value = '';
        $('password').value = '';
        await renderToken();
        setLoginStatus('已清除', 'ok');
      } catch (err) {
        setLoginStatus(`清除失败: ${err.message}`, 'err');
      }
    });

    $('apiLoginBtn').addEventListener('click', async () => {
      if (adminLoginPending || adminInjectionPending) return;
      const account = $('account').value.trim();
      const password = $('password').value;
      if (!account || !password) {
        setLoginStatus('请输入账号和密码', 'err');
        return;
      }

      setAdminLoginPending(true);
      setLoginStatus('正在登录...', '');
      try {
        await ns.credentials.saveCredentials({ account, password });
        const response = await ns.messages.sendToBackground({
          type: 'LOGIN_API',
          payload: {
            account, password,
            projectId: ns.currentProject.getCachedProjectId(),
            baseUrl: getEditableText($('domainValue')).trim() || getDefaultBaseUrl(),
          },
        });
        const res = await finishLoginResponse(response);
        if (!res) return;
        if (res.injection?.injected) {
          setLoginStatus('登录成功，已注入当前网站并跳转到根目录', 'ok');
        } else if (res.injection?.error) {
          setLoginStatus(`登录成功，Token 已保存；自动注入失败: ${res.injection.error}`, 'err');
        } else {
          setLoginStatus('登录成功，Token 已保存', 'ok');
        }
      } catch (err) {
        setLoginStatus(`登录失败: ${err.message}`, 'err');
      } finally {
        setAdminLoginPending(false);
      }
    });

    $('injectAdminTokenBtn').addEventListener('click', injectAdminToken);
    $('injectAdminTokenToolBtn').addEventListener('click', injectAdminToken);
    $('adminHistoryList').addEventListener('click', (event) => {
      const button = event.target.closest('[data-apply-admin-history]');
      if (button && !button.disabled) applyAdminHistory(adminHistoryRecords[Number(button.dataset.applyAdminHistory)]);
    });

    $('copyTokenBtn').addEventListener('click', async () => {
      const tokenState = await ns.token.getToken();
      await copyToClipboard(tokenState.token, 'Token 已复制');
    });
    $('clearTokenToolBtn')?.addEventListener('click', async () => {
      try {
        await ns.token.clearToken();
        await renderToken();
        setLoginStatus('Token 已清空', 'ok');
        ns.messages.sendToActiveTab({ type: 'CLEAR_TOKEN' }).catch(() => {});
      } catch (err) {
        setLoginStatus(`清除失败: ${err.message}`, 'err');
      }
    });

    // 点击即编辑、失焦自动保存（无需编辑/保存按钮）
    bindEditableField('tokenValue', onTokenBlur);

    // 点击“应用”时由按钮保存，避免失焦与点击同时发起保存。
    bindEditableField('domainValue', (event) => {
      if (event.relatedTarget?.id === 'applyDomainBtn') return;
      return onDomainBlur();
    });
    $('domainValue').addEventListener('input', () => {
      $('copyDomainBtn').disabled = !getEditableText($('domainValue')).trim();
    });
    $('copyDomainBtn').addEventListener('click', async () => {
      const url = getEditableText($('domainValue')).trim();
      await copyToClipboard(url, '域名已复制');
    });
    $('openCurrentDomainBtn')?.addEventListener('click', async () => {
      try {
        const url = new URL((lastSavedDomain || getDefaultBaseUrl()).trim());
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('API 地址须以 http:// 或 https:// 开头');
        }
        await chrome.tabs.create({ url: url.href });
      } catch (err) {
        setLoginStatus(`打开失败: ${err.message}`, 'err');
      }
    });
    $('applyDomainBtn').addEventListener('click', async () => {
      const button = $('applyDomainBtn');
      button.disabled = true;
      button.textContent = '应用中…';
      try {
        if (await onDomainBlur()) setLoginStatus('API 域名已应用', 'ok');
      } finally {
        button.disabled = false;
        button.textContent = '应用';
      }
    });
    $('restoreDomainBtn')?.addEventListener('click', async () => {
      try {
        await ns.customDomain.clearDomain();
        await renderDomain();
        ns.messages.sendToBackground({ type: 'REFRESH_BASE_URL' }).catch(() => {});
        setLoginStatus('已恢复项目默认域名', 'ok');
      } catch (err) {
        setLoginStatus(`恢复失败: ${err.message}`, 'err');
      }
    });
  }

  function bindAdminPanelToggle() {
    const section = $('adminPanelSection');
    const header = $('adminPanelHeader');
    const body = $('adminPanelBody');
    if (!section || !header || !body) return;
    header.addEventListener('click', () => {
      section.classList.toggle('expanded');
    });
  }

  async function initAdminPanel() {
    if (adminInitialized) return;
    adminInitialized = true;
    await Promise.all([renderCredentials(), renderToken(), renderDomain(), renderAdminHistory()]);
    bindCredentials();
    bindAdminPanelToggle();
    ns.workspaceUi?.registerBeforeLeave('admin-token', saveAdminSettings);
    ns.workspaceUi?.registerBeforeLeave('admin-history', () => !adminLoginPending);
    chrome.storage.onChanged.addListener((changes, areaName) => {
      const projectId = ns.currentProject.getCachedProjectId();
      if (areaName !== 'local' || !changes[`adminSession:${projectId}`]) return;
      refreshAdminSession().catch((error) => setLoginStatus(`账号信息刷新失败: ${error.message}`, 'err'));
    });
  }

  async function init() {
    await ns.currentProject.loadCurrentProject();
    ns.workspaceUi?.registerFeatureLifecycle('adminPanel', { init: initAdminPanel });
    ns.workspaceUi?.registerFeatureLifecycle('quickLogin', ns.quickLoginUi);
    ns.workspaceUi?.registerFeatureLifecycle('otherLogin', ns.otherLoginUi);
    ns.workspaceUi?.registerFeatureLifecycle('appLogin', ns.appLoginUi);
    await ns.workspaceUi?.init();
    ns.ui.observeActions?.();
    ns.workspaceUi?.syncHeader();
  }

  init().catch((err) => {
    console.error('[内部开发工具箱] 初始化失败:', err);
  });
})();
