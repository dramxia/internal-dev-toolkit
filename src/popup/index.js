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

  async function renderToken() {
    const tokenState = await ns.token.getToken();
    const tokenEl = $('tokenValue');
    const tokenWrap = $('tokenWrap');
    if (tokenState.token) {
      tokenEl.textContent = tokenState.token;
      tokenEl.title = tokenState.token;
      tokenWrap.classList.remove('empty');
      const updatedAt = tokenState.updatedAt ? new Date(tokenState.updatedAt).toLocaleString() : '未知';
      $('tokenUpdated').textContent = `获取时间: ${updatedAt}`;
      $('copyTokenBtn').disabled = false;
    } else {
      tokenEl.textContent = '尚未获取';
      tokenEl.title = '';
      tokenWrap.classList.add('empty');
      $('tokenUpdated').textContent = '';
      $('copyTokenBtn').disabled = true;
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

  async function copyToClipboard(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setLoginStatus('Token 已复制', 'ok');
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
      await copyToClipboard(tokenState.token);
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
