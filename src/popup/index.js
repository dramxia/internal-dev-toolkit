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
      $('copyDomainBtn').disabled = false;
    } else {
      $('domainUpdated').textContent = '';
      $('copyDomainBtn').disabled = true;
    }
    // 提示当前默认域名（便于用户参考）
    const hint = $('domainDefaultHint');
    if (hint) hint.textContent = defaultUrl;
    const summary = $('domainSummaryValue');
    if (summary) {
      summary.textContent = effective || '未配置';
      summary.title = effective || '未配置';
    }
  }

  // 点击即编辑、失焦自动保存：与 token 交互一致。
  // 清空或填回默认值 → 清除覆盖（恢复默认）；填入新值 → 保存覆盖并通知 background 刷新缓存。
  async function onDomainBlur() {
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
    for (const id of ['account', 'password', 'saveBtn', 'clearBtn', 'apiLoginBtn', 'clearTokenToolBtn']) {
      $(id).disabled = busy;
    }
    for (const id of ['injectAdminTokenBtn', 'injectAdminTokenToolBtn']) {
      const button = $(id);
      button.disabled = busy || !lastSavedToken.trim();
      button.textContent = adminInjectionPending ? '正在注入…' : '一键注入当前网站';
    }
  }

  function setAdminLoginPending(pending) {
    adminLoginPending = pending;
    syncAdminButtons();
    $('apiLoginBtn').textContent = pending ? '正在登录…' : '登录并保存';
  }

  async function injectAdminToken() {
    if (adminLoginPending || adminInjectionPending) return;
    adminInjectionPending = true;
    syncAdminButtons();
    try {
      // 用户可能刚在 Token 工具屏中编辑内容，先完成保存，再读取最新凭证。
      if (!(await onTokenBlur())) return;
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

    $('saveBtn').addEventListener('click', async () => {
      const account = $('account').value.trim();
      const password = $('password').value;
      if (!account || !password) {
        setLoginStatus('请输入账号和密码', 'err');
        return;
      }
      try {
        await ns.credentials.saveCredentials({ account, password });
        setLoginStatus('已保存', 'ok');
      } catch (err) {
        setLoginStatus(`保存失败: ${err.message}`, 'err');
      }
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
        let res = await ns.messages.sendToBackground({
          type: 'LOGIN_API',
          payload: { account, password },
        });
        if (!res?.ok) throw new Error(res?.error || '登录失败');
        if (res.requiresVerification) {
          res = await requestAdminVerification(res.verification);
          if (!res) {
            setLoginStatus('已取消登录', '');
            return;
          }
        } else if (!res.token) {
          throw new Error('登录接口未返回 Token');
        }
        await renderToken();
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

    // 域名地址：点击即编辑、失焦自动保存（与 token 交互一致）
    bindEditableField('domainValue', onDomainBlur);
    $('copyDomainBtn').addEventListener('click', async () => {
      // 复制当前生效地址（覆盖值或默认值）
      const state = await ns.customDomain.getDomain();
      const url = state.baseUrl || getDefaultBaseUrl();
      await copyToClipboard(url, '域名已复制');
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
    await Promise.all([renderCredentials(), renderToken(), renderDomain()]);
    bindCredentials();
    bindAdminPanelToggle();
    ns.workspaceUi?.registerBeforeLeave('admin-token', onTokenBlur);
    ns.workspaceUi?.registerBeforeLeave('admin-domain', onDomainBlur);
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
