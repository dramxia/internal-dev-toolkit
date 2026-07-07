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
  }

  // 点击即编辑、失焦自动保存并注入：
  // 可编辑内容区会随内容自然增高，无需 textarea 与显式「编辑/保存」按钮。
  async function onTokenBlur() {
    const tokenEl = $('tokenValue');
    const next = getEditableText(tokenEl).trim();
    // 内容未变化，仅刷新显示态
    if (next === lastSavedToken) {
      await renderToken();
      return;
    }
    if (!next) {
      // 清空了 token
      try {
        await ns.token.clearToken();
        await renderToken();
        setLoginStatus('Token 已清除', 'ok');
        ns.messages.sendToActiveTab({ type: 'CLEAR_TOKEN' }).catch(() => {});
      } catch (err) {
        setLoginStatus(`清除失败: ${err.message}`, 'err');
      }
      return;
    }
    try {
      await ns.token.saveToken(next);
      await renderToken();
      setLoginStatus('Token 已保存并注入页面', 'ok');
      // 立即向当前标签页注入新 token（与 API 登录成功后行为一致）
      ns.messages.sendToActiveTab({ type: 'INJECT_TOKEN' }).catch(() => {});
    } catch (err) {
      setLoginStatus(`保存失败: ${err.message}`, 'err');
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
      return;
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
    } catch (err) {
      setLoginStatus(`保存失败: ${err.message}`, 'err');
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
      const account = $('account').value.trim();
      const password = $('password').value;
      if (!account || !password) {
        setLoginStatus('请输入账号和密码', 'err');
        return;
      }

      setLoginStatus('正在登录...', '');
      try {
        await ns.credentials.saveCredentials({ account, password });
      } catch (err) {
        setLoginStatus(`保存失败: ${err.message}`, 'err');
        return;
      }

      try {
        const res = await ns.messages.sendToBackground({
          type: 'LOGIN_API',
          payload: { account, password },
        });
        if (res && res.ok) {
          await renderToken();
          setLoginStatus('登录成功，token 已保存', 'ok');
          ns.messages.sendToActiveTab({ type: 'INJECT_TOKEN' }).catch(() => {});
        } else {
          setLoginStatus(res?.error || '登录失败', 'err');
        }
      } catch (err) {
        setLoginStatus(`登录失败: ${err.message}`, 'err');
      }
    });

    $('copyTokenBtn').addEventListener('click', async () => {
      const tokenState = await ns.token.getToken();
      await copyToClipboard(tokenState.token, 'Token 已复制');
    });

    // 点击即编辑、失焦自动保存并注入（无需编辑/保存按钮）
    bindEditableField('tokenValue', onTokenBlur);

    // 域名地址：点击即编辑、失焦自动保存（与 token 交互一致）
    bindEditableField('domainValue', onDomainBlur);
    $('copyDomainBtn').addEventListener('click', async () => {
      // 复制当前生效地址（覆盖值或默认值）
      const state = await ns.customDomain.getDomain();
      const url = state.baseUrl || getDefaultBaseUrl();
      await copyToClipboard(url, '域名已复制');
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

  // Tab 切换：原写在 popup.html 的内联 <script> 里，但 MV3 的 CSP
  // (script-src 'self') 会拦截内联脚本，导致 tab 按钮绑不上事件、切不过去。
  // 这里改由外部 popup.js 绑定，CSP 允许 'self'。
  function bindTabSwitcher() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = {
      admin: $('panel-admin'),
      quick: $('panel-quick'),
    };
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.tab;
        if (!key || !panels[key]) return;
        tabs.forEach((t) => t.classList.remove('active'));
        btn.classList.add('active');
        Object.keys(panels).forEach((k) => {
          panels[k].classList.toggle('active', k === key);
        });
      });
    });
  }

  async function init() {
    // 加载当前项目
    await ns.currentProject.loadCurrentProject();

    // 初始化项目切换器
    if (ns.projectSwitcherUi) {
      await ns.projectSwitcherUi.init();
    }

    // 根据当前项目的 enabledFeatures 显示/隐藏功能卡
    const enabledFeatures = ns.currentProject.getEnabledFeatures();
    if (!enabledFeatures.includes('adminPanel')) {
      const adminPanelSection = $('adminPanelSection');
      if (adminPanelSection) adminPanelSection.style.display = 'none';
    }
    if (!enabledFeatures.includes('quickLogin')) {
      const quickLoginSection = $('quickLoginSection');
      if (quickLoginSection) quickLoginSection.style.display = 'none';
    }

    await renderCredentials();
    await renderToken();
    await renderDomain();
    bindCredentials();
    bindAdminPanelToggle();
    bindTabSwitcher();
    if (ns.quickLoginUi && enabledFeatures.includes('quickLogin')) {
      await ns.quickLoginUi.init();
    }
  }

  init().catch((err) => {
    console.error('[内部开发工具箱] 初始化失败:', err);
  });
})();
