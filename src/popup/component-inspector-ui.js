/* 组件定位管理页；始终操作侧栏所属窗口中的当前标签页。 */
(() => {
  'use strict';
  const ns = globalThis.InternalDevToolkit;
  const policy = ns.componentSettings;
  const $ = (id) => document.getElementById(id);
  let initialized = false, visible = false, busy = false, revision = 0;
  let currentTab = null, response = null, recording = null, captured = null;
  let windowId = null;
  let pollTimer = null, watchConnection = true, confirmingUninstall = false, pendingSetupAction = '';
  let setupKind = '', setupTarget = '', refreshError = '';
  let invalidShortcut = false;

  async function request(type, payload = {}) {
    const result = await ns.messages.sendToBackground({ type, payload });
    if (!result?.ok) throw new Error(result?.error || '组件定位操作失败');
    return result;
  }
  function statusLabel(state) {
    return ({ on: '已开启', off: '未开启', starting: '正在识别', restoring: '正在恢复', waiting: '等待页面加载', recovering: '等待开发服务', paused: '已暂停' })[state?.status] || '未开启';
  }
  function setupMessage(text, kind = 'notice') {
    setupKind = kind;
    $('componentSetupMessage').textContent = text;
    $('componentSetupMessage').hidden = !text;
  }
  function scheduleConnectionCheck() {
    clearTimeout(pollTimer); pollTimer = null;
    if (!visible || !watchConnection || response?.host.connected) return;
    pollTimer = setTimeout(async () => {
      if (!busy) await refresh().catch(() => {});
      else scheduleConnectionCheck();
    }, 3000);
  }
  async function downloadPackage(actionName) {
    const blob = await ns.componentInstaller.createPackage(chrome.runtime.id, actionName);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = actionName === 'uninstall' ? '组件定位-卸载.zip' : '组件定位-安装.zip';
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    pendingSetupAction = actionName;
    watchConnection = true;
    setupMessage(actionName === 'uninstall'
      ? '卸载文件已下载。若系统拦截双击操作，可按下方步骤解除本次安装包的隔离标记。'
      : '备用安装包已下载。若出现「Apple 无法验证」提示，可点击「复制解除隔离命令」，按下方步骤处理本次安装包。');
  }
  async function copyQuarantineCommand() {
    const command = ns.componentInstaller.QUARANTINE_COMMAND;
    $('componentCommandPreview').value = command;
    $('componentCommandDetails').hidden = false;
    $('componentCommandTitle').textContent = '查看解除隔离命令';
    try {
      await navigator.clipboard.writeText(command);
      setupMessage('命令已复制。粘贴到终端后，将本次解压的 component-helper 文件夹拖到命令末尾，再按回车。随后双击「安装.command」。');
    } catch (_) {
      $('componentCommandDetails').open = true;
      $('componentCommandPreview').focus(); $('componentCommandPreview').select();
      setupMessage('请手动复制已选中的命令，粘贴到终端，再把本次解压的 component-helper 文件夹拖到末尾并按回车。');
    }
  }
  async function copySetupCommand(actionName) {
    const command = await ns.componentInstaller.createTerminalCommand(chrome.runtime.id, actionName);
    $('componentCommandPreview').value = command;
    $('componentCommandDetails').hidden = false;
    $('componentCommandTitle').textContent = actionName === 'uninstall' ? '查看完整卸载命令' : '查看完整安装命令';
    pendingSetupAction = actionName; watchConnection = true;
    try {
      await navigator.clipboard.writeText(command);
      setupMessage(`${actionName === 'uninstall' ? '卸载' : '安装'}命令已复制。下一步：打开「终端」，粘贴并按回车。可在任意目录执行，完成后返回本页。`);
    } catch (_) {
      $('componentCommandDetails').open = true;
      $('componentCommandPreview').focus(); $('componentCommandPreview').select();
      setupMessage('自动复制失败，完整命令已展开并选中。按 Command + C 复制，再到终端粘贴并按回车。');
    }
  }
  function pageState() {
    return response?.state.origin === policy.originOf(currentTab?.url) ? response.state : { status: 'off' };
  }
  function openSettings(id) {
    $(id).open = true;
  }
  function render() {
    $('componentRefreshError').hidden = !refreshError;
    $('componentRefreshMessage').textContent = refreshError;
    $('componentRetry').disabled = busy;
    if (!response) return;
    const { host, settings } = response;
    const state = pageState();
    const origin = policy.originOf(currentTab?.url);
    const allowed = policy.isAllowed(origin, settings.origins);
    const status = state.status;
    const needsHostUpdate = host.connected && host.needsInstall;
    const updateFailed = !!host.updateError;
    const hostReady = host.connected && !needsHostUpdate && !updateFailed;
    const copyMode = settings.clickAction === 'copy';
    const ready = hostReady && (copyMode || host.editorAvailable);
    const running = state.enabled ?? status === 'on';
    const nextTarget = !hostReady ? 'componentHostSection' : !copyMode && !host.editorAvailable ? 'componentEditorSection' : '';
    // 仅在缺少的设置发生变化时展开，保留用户手动收起、展开的选择。
    if (nextTarget !== setupTarget) {
      if (setupTarget) $(setupTarget).open = false;
      if (nextTarget) openSettings(nextTarget);
      setupTarget = nextTarget;
    }
    const hostSection = $('componentHostSection');
    const settingsList = $('componentSettingsList');
    if (!hostReady && settingsList.firstElementChild !== hostSection) settingsList.prepend(hostSection);
    else if (hostReady && settingsList.lastElementChild !== hostSection) settingsList.append(hostSection);

    let label = statusLabel(state), tone = status, hint = '';
    if (status === 'starting') hint = '正在识别框架和项目目录…';
    else if (status === 'restoring') hint = '正在恢复当前页面的定位，沿用已识别的项目。';
    else if (!ready) {
      label = needsHostUpdate || updateFailed ? '待更新' : '待设置'; tone = 'setup';
      hint = updateFailed ? '辅助程序更新失败，请检查连接重试。'
        : needsHostUpdate ? '重装一次辅助程序，即可启用自动更新。'
        : !host.connected ? copyMode ? '先连接本机辅助程序。' : '先连接辅助程序，再选择编辑器。'
        : host.editor ? '编辑器已移动或删除，请重新选择。' : '选择编辑器后，即可开启。';
    } else if (!allowed) {
      label = '暂不可用'; tone = 'off';
      hint = origin ? '请添加当前开发地址，或切换到本地开发页面。' : '请切换到本地 React／Vue 开发页面。';
    } else if (status === 'paused') hint = '开关已保存。处理提示后，点击「检查连接」重试。';
    else if (status === 'recovering') hint = '开关已保存，开发服务恢复后会自动重新识别项目。';
    else if (status === 'waiting') hint = '开关已保存，页面组件加载完成后会自动启用。';
    else hint = running ? '同一开发地址共用开关，切路由、刷新和重新打开后继续生效。' : '开启后，同一开发地址的所有路由和标签页共用。';
    $('componentStatus').dataset.state = tone;
    $('componentPageState').textContent = label;
    $('componentStatusHint').textContent = hint;
    $('componentNotice').textContent = state.error || '';
    $('componentNotice').hidden = !state.error;
    $('componentToggle').setAttribute('aria-checked', String(running));
    $('componentToggle').setAttribute('aria-label', running ? '停止当前开发地址的组件定位' : '启用当前开发地址的组件定位');
    $('componentToggle').disabled = busy || !allowed || (!running && !ready);

    $('componentPageOrigin').textContent = origin ? new URL(origin).host : currentTab?.title || '尚未找到当前页面';
    $('componentPageUrl').textContent = currentTab?.url || '尚未找到当前页面';
    const frameworks = state.frameworks?.join(' / ');
    $('componentFrameworkSummary').textContent = frameworks || '页面信息';
    $('componentFramework').textContent = frameworks || '开启时自动识别';
    $('componentProjectRoot').textContent = state.project?.root || '开启时自动识别';
    $('componentEditorName').textContent = host.editor?.name || '待选择';
    $('componentEditorName').dataset.pending = String(!host.editorAvailable);
    $('componentEditorPath').textContent = host.editor?.path || '';
    $('componentEditorPath').hidden = !host.editor?.path;
    $('componentEditorHint').hidden = !!host.editorAvailable;
    $('componentEditorHint').textContent = !hostReady ? '先连接辅助程序，再选择编辑器。' : '从“应用程序”中选择编辑器 .app 文件。';
    $('componentChooseEditor').textContent = host.editor ? '更换编辑器' : '选择编辑器';
    $('componentChooseEditor').classList.toggle('btn-primary', !host.editorAvailable);
    $('componentChooseEditor').classList.toggle('btn-ghost', !!host.editorAvailable);
    $('componentChooseEditor').disabled = busy || !hostReady;
    $('componentClearEditor').hidden = !host.editor;
    $('componentClearEditor').disabled = busy || !hostReady || !host.editor;

    if (setupKind === 'connected') setupMessage(host.connected && !host.editorAvailable && !copyMode ? '辅助程序已连接，请选择编辑器。' : '', 'connected');
    $('componentHostSummary').textContent = updateFailed ? '更新失败' : needsHostUpdate ? '待更新' : host.connected ? '已连接' : '待连接';
    $('componentHostSummary').dataset.pending = String(!hostReady);
    $('componentHostStatus').textContent = host.connected ? host.updated ? '本机程序已连接 · 已自动更新' : '已连接，后续随扩展自动更新。' : host.error || '请先安装本机辅助程序，再检查连接。';
    const installing = !hostReady || pendingSetupAction === 'install';
    const installActions = $('componentInstallActions');
    if (installing && installActions.previousElementSibling !== $('componentInstallGuide')) $('componentInstallGuide').after(installActions);
    else if (!installing && installActions.parentElement !== $('componentRepairActions')) $('componentRepairActions').append(installActions);
    $('componentInstallGuide').hidden = !installing;
    $('componentInstallHint').hidden = !installing;
    $('componentHostUpdateHint').hidden = !needsHostUpdate && !updateFailed;
    $('componentHostUpdateHint').textContent = updateFailed ? host.updateError : '当前辅助程序需要重装一次，后续随扩展自动更新。';
    $('componentCopyInstall').textContent = host.connected ? '复制重装命令' : '复制安装命令';
    $('componentCopyInstall').classList.toggle('btn-primary', !hostReady);
    $('componentCopyInstall').classList.toggle('btn-ghost', !!hostReady);
    for (const id of ['componentCopyInstall', 'componentDownloadInstall', 'componentCopyQuarantine', 'componentUninstallHost', 'componentConfirmUninstall', 'componentCancelUninstall', 'componentCheckHost', 'componentResetShortcuts', 'componentAddOrigin', 'componentOriginInput']) $(id).disabled = busy;
    $('componentUninstallHost').textContent = host.connected && host.capabilities?.includes('uninstall') ? '卸载' : '复制卸载命令';
    $('componentUninstallConfirm').hidden = !confirmingUninstall;

    $('componentClickAction').value = copyMode ? 'copy' : 'open';
    $('componentClickAction').disabled = busy || !!recording;
    $('componentCopyLocationHint').hidden = !copyMode;
    $('componentClickShortcutTitle').textContent = copyMode ? '复制源码位置' : '打开源码';

    for (const [field, id, labelId] of [['openShortcut', 'componentOpenShortcut', 'componentOpenShortcutLabel'], ['menuShortcut', 'componentMenuShortcut', 'componentMenuShortcutLabel']]) {
      const shortcut = policy.shortcutLabel(settings[field]);
      if (recording !== field) $(id).textContent = shortcut;
      $(labelId).textContent = shortcut;
      $(id).disabled = busy;
    }
    $('componentOriginSummary').textContent = settings.origins.length ? `另有 ${settings.origins.length} 个地址` : '默认本地地址';
    $('componentOrigins').replaceChildren();
    for (const address of settings.origins) {
      const row = document.createElement('li');
      const text = document.createElement('span'); text.textContent = address;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn btn-ghost component-text-btn'; remove.textContent = '移除'; remove.disabled = busy;
      remove.addEventListener('click', () => action(async () => {
        await saveSettings({ origins: response.settings.origins.filter((item) => item !== address) });
        originMessage('');
      }));
      row.append(text, remove); $('componentOrigins').append(row);
    }
    const opened = state.lastOpened;
    $('componentLastOpened').hidden = !opened;
    $('componentLastOpened').textContent = opened ? `最近打开：${opened.file}${opened.line ? `:${opened.line}` : ' · 文件定位'}` : '';
    ns.workspaceUi?.syncHeader();
  }
  function originMessage(message) {
    $('componentOriginMessage').textContent = message;
    $('componentOriginMessage').hidden = !message;
  }
  async function refresh() {
    const version = ++revision;
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId });
      const tab = tabs[0] || null;
      const result = await request('COMPONENT_STATUS', { tabId: tab?.id });
      if (version !== revision) return;
      if (result.host.connected && pendingSetupAction === 'install' && (!response?.host.connected || (result.host.instanceId && result.host.instanceId !== response?.host.instanceId))) {
        setupMessage('辅助程序已连接，请选择编辑器。', 'connected'); pendingSetupAction = '';
        $('componentCommandDetails').open = false; $('componentCommandDetails').hidden = true;
      }
      refreshError = '';
      currentTab = tab; response = result; render();
      scheduleConnectionCheck();
    } catch (error) {
      if (version !== revision) return;
      refreshError = `状态刷新失败：${error.message}`;
      render(); scheduleConnectionCheck();
      throw error;
    }
  }
  async function action(task) {
    if (busy) return;
    busy = true; render();
    try { await task(); }
    catch (error) { ns.ui.toast(error.message, 'err'); }
    finally {
      // 等新状态返回后再恢复控件；刷新失败也会执行 finally，保留重试入口。
      try { await refresh(); }
      catch (_) { /* refresh 已显示具体错误。 */ }
      finally { busy = false; render(); }
    }
  }
  async function saveSettings(patch) {
    const result = await request('COMPONENT_SAVE_SETTINGS', { ...response.settings, ...patch });
    response.settings = result.settings;
  }
  function stopRecording() {
    recording = captured = null; invalidShortcut = false;
    $('componentShortcutHint').hidden = true;
    render();
  }
  function record(field) {
    if (busy) return;
    if (recording === field) { stopRecording(); return; }
    recording = field; captured = null; invalidShortcut = false;
    render();
    $(field === 'openShortcut' ? 'componentOpenShortcut' : 'componentMenuShortcut').textContent = '请按下组合键…';
    $('componentShortcutHint').hidden = false;
    $('componentShortcutHint').textContent = '按下组合键，松开保存；Escape 取消。';
  }
  function keyDown(event) {
    if (!recording) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.key === 'Escape') { stopRecording(); return; }
    try {
      // 保留非修饰键的真实 code，让不支持的按键明确报错。
      const modifier = /^(Meta|Control|Alt|Shift)$/.test(event.key);
      captured = policy.normalizeShortcut({ meta: event.metaKey, ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey, code: modifier ? '' : event.code || event.key });
      invalidShortcut = false;
      $(recording === 'openShortcut' ? 'componentOpenShortcut' : 'componentMenuShortcut').textContent = policy.shortcutLabel(captured);
      $('componentShortcutHint').textContent = '松开组合键即可保存；Escape 取消。';
    } catch (error) {
      captured = null; invalidShortcut = true;
      $('componentShortcutHint').textContent = `${error.message}；Escape 取消。`;
    }
  }
  function keyUp(event) {
    if (!recording) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!captured || invalidShortcut) return;
    const field = recording, shortcut = captured;
    stopRecording();
    action(() => saveSettings({ [field]: shortcut }));
  }
  async function init() {
    if (initialized) return;
    initialized = true;
    windowId = (await chrome.windows.getCurrent()).id;
    $('componentExtensionId').textContent = chrome.runtime.id;
    $('componentInstallCommand').textContent = `node scripts/install-component-host.js ${chrome.runtime.id}`;
    $('componentToggle').addEventListener('click', () => {
      const tab = currentTab, state = pageState();
      action(() => request((state.enabled ?? state.status === 'on') ? 'COMPONENT_STOP' : 'COMPONENT_START', { tabId: tab?.id, origin: policy.originOf(tab?.url) }));
    });
    $('componentRetry').addEventListener('click', () => action(async () => {}));
    $('componentChooseEditor').addEventListener('click', () => action(() => request('COMPONENT_CHOOSE_EDITOR')));
    $('componentClearEditor').addEventListener('click', () => action(() => request('COMPONENT_CLEAR_EDITOR')));
    $('componentCheckHost').addEventListener('click', () => action(async () => {
      watchConnection = true;
      await request('COMPONENT_RECONNECT_HOST');
    }));
    $('componentDownloadInstall').addEventListener('click', () => action(() => downloadPackage('install')));
    $('componentCopyQuarantine').addEventListener('click', () => action(copyQuarantineCommand));
    $('componentUninstallHost').addEventListener('click', () => {
      if (response?.host.connected && response.host.capabilities?.includes('uninstall')) { confirmingUninstall = true; openSettings('componentHostSection'); render(); $('componentConfirmUninstall').focus(); }
      else action(() => copySetupCommand('uninstall'));
    });
    $('componentCancelUninstall').addEventListener('click', () => { confirmingUninstall = false; render(); $('componentUninstallHost').focus(); });
    $('componentConfirmUninstall').addEventListener('click', () => action(async () => {
      await request('COMPONENT_UNINSTALL_HOST');
      confirmingUninstall = false; watchConnection = false; pendingSetupAction = '';
      setupMessage('辅助程序已卸载，所有页面的组件定位已停止。编辑器设置已保留。');
    }));
    $('componentCopyInstall').addEventListener('click', () => action(() => copySetupCommand('install')));
    $('componentClickAction').addEventListener('change', (event) => {
      const clickAction = event.target.value;
      action(() => saveSettings({ clickAction }));
    });
    $('componentOpenShortcut').addEventListener('click', () => record('openShortcut'));
    $('componentMenuShortcut').addEventListener('click', () => record('menuShortcut'));
    $('componentResetShortcuts').addEventListener('click', () => action(() => saveSettings({ openShortcut: policy.DEFAULT_SHORTCUT, menuShortcut: policy.DEFAULT_SHORTCUT })));
    $('componentOriginForm').addEventListener('submit', (event) => {
      event.preventDefault();
      action(async () => {
        const origin = policy.originOf($('componentOriginInput').value.trim());
        let message = !origin ? '请输入完整开发地址，例如 http://dev.local:5173' : '';
        if (!message && (policy.isAllowed(origin) || response.settings.origins.includes(origin))) message = '这个地址已支持，可以直接开启定位。';
        if (!message && response.settings.origins.length >= policy.MAX_ORIGINS) message = `最多保存 ${policy.MAX_ORIGINS} 个开发地址，请先移除旧地址。`;
        if (message) { originMessage(message); return; }
        try {
          await saveSettings({ origins: [...response.settings.origins, origin] });
          $('componentOriginInput').value = '';
          originMessage('');
          ns.ui.toast('开发地址已添加', 'ok');
        } catch (error) { originMessage(error.message); }
      });
    });
    $('componentShortcutSection').addEventListener('toggle', () => { if (!$('componentShortcutSection').open && recording) stopRecording(); });
    document.addEventListener('pointerdown', (event) => {
      if (recording && !event.target.closest('#componentOpenShortcut, #componentMenuShortcut')) stopRecording();
    }, true);
    window.addEventListener('blur', () => { if (recording) stopRecording(); });
    document.addEventListener('keydown', keyDown, true);
    document.addEventListener('keyup', keyUp, true);
    chrome.tabs.onActivated.addListener((info) => { if (visible && info.windowId === windowId) refresh().catch(() => {}); });
    chrome.tabs.onUpdated.addListener((tabId, change) => { if (visible && currentTab?.id === tabId && (change.url || change.status)) refresh().catch(() => {}); });
    chrome.runtime.onMessage.addListener((message) => {
      if (visible && message.type === 'COMPONENT_STATE_CHANGED' && message.tabId === currentTab?.id) refresh().catch(() => {});
    });
    window.addEventListener('focus', () => {
      if (!visible || busy) return;
      const reconnect = pendingSetupAction && response?.host.connected;
      (reconnect ? request('COMPONENT_RECONNECT_HOST') : Promise.resolve()).then(refresh).catch(() => {});
    });
  }
  ns.componentInspectorUi = {
    init,
    activate: async () => { visible = true; watchConnection = true; await refresh(); },
    deactivate: () => { visible = false; revision++; clearTimeout(pollTimer); confirmingUninstall = false; stopRecording(); },
    getStatus: () => response ? $('componentPageState').textContent : '检查中',
  };
})();
