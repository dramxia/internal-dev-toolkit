/* 组件定位管理页；始终操作侧栏所属窗口中的当前标签页。 */
(() => {
  'use strict';
  const ns = globalThis.InternalDevToolkit;
  const policy = ns.componentSettings;
  const actionLabels = { open: '打开源码', copy: '复制源码位置', agent: '发送任务' };
  const $ = (id) => document.getElementById(id);
  let initialized = false, visible = false, busy = false, revision = 0;
  let currentTab = null, response = null, recording = null, captured = null;
  let windowId = null;
  let pollTimer = null, watchConnection = true, confirmingUninstall = false, pendingSetupAction = '';
  let setupKind = '', setupTarget = '', refreshError = '';
  let renderedOrigins = '';
  let invalidShortcut = false;
  let observedTabId = null, observedOrigin = '', changingTab = false, refreshQueued = false, toggleProgress = '';

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
  const tabUrl = (tab) => tab?.pendingUrl || tab?.url;
  const toggleLabel = (enabled) => enabled ? '正在开启' : '正在关闭';
  function pageState() {
    return response?.state.origin === policy.pageKey(tabUrl(currentTab)) ? response.state : { status: 'off' };
  }
  function openSettings(id) {
    $(id).open = true;
  }
  function setAvailability(control, unavailable = false, pending = busy) {
    const keepFocus = control.matches('.component-switch, .component-click-action');
    control.disabled = unavailable || (pending && !keepFocus);
    control.classList.toggle('component-pending', pending && !unavailable);
    if (keepFocus && pending && !unavailable) control.setAttribute('aria-disabled', 'true');
    else control.removeAttribute('aria-disabled');
  }
  function render() {
    $('componentRefreshError').hidden = !refreshError;
    $('componentRefreshMessage').textContent = refreshError;
    setAvailability($('componentRetry'));
    $('componentStatusHint').hidden = !response && !!refreshError;
    if (!response) {
      $('componentPageState').textContent = refreshError ? '检查失败' : '正在检查';
      return;
    }
    const { host, settings, toggle } = response;
    const state = pageState();
    const origin = policy.pageKey(tabUrl(currentTab));
    const localFile = origin.startsWith('file:');
    const allowed = localFile ? response.fileAccess : policy.isAllowed(origin, settings.origins);
    const scopeHint = localFile ? '同一个 HTML 文件共用开关，刷新或重新打开后继续生效。' : '同一开发地址的所有路由和标签页共用开关。';
    const status = state.status;
    const needsHostUpdate = host.connected && host.needsInstall;
    const updateFailed = !!host.updateError;
    const hostReady = host.connected && !needsHostUpdate && !updateFailed;
    const clickAction = settings.clickAction || 'open';
    const taskMode = clickAction === 'agent';
    const taskEditor = policy.TASK_EDITORS.find((editor) => editor.id === settings.taskEditor) || policy.TASK_EDITORS[0];
    const needsEditor = clickAction === 'open';
    const ready = hostReady && (!needsEditor || host.editorAvailable);
    const running = toggle?.previousEnabled ?? state.enabled ?? status === 'on';
    const progress = toggleProgress || (toggle ? toggleLabel(toggle.enabled) : '');
    const nextTarget = !hostReady ? 'componentHostSection' : needsEditor && !host.editorAvailable ? 'componentEditorSection' : '';
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
    if (status === 'starting') hint = '正在识别页面类型和项目目录…';
    else if (status === 'restoring') hint = '正在恢复当前页面的定位，沿用已识别的项目。';
    else if (!ready) {
      label = needsHostUpdate || updateFailed ? '待更新' : '待设置'; tone = 'setup';
      hint = updateFailed ? '辅助程序更新失败，请检查连接重试。'
        : needsHostUpdate ? '重装一次辅助程序，即可启用自动更新。'
        : !host.connected ? !needsEditor ? '先连接本机辅助程序。' : '先连接辅助程序，再选择编辑器。'
        : host.editor ? '编辑器已移动或删除，请重新选择。' : '选择编辑器后，即可开启。';
    } else if (!allowed) {
      label = '暂不可用'; tone = 'off';
      hint = localFile ? '请在 Chrome 扩展详情中开启「允许访问文件网址」。'
        : origin ? '请添加当前开发地址，或切换到本地开发页面。' : '请打开本地 React、Vue 或 HTML 页面。';
    } else if (status === 'paused') hint = '开关已保存。处理提示后，点击「检查连接」重试。';
    else if (status === 'recovering') hint = '开关已保存，开发服务恢复后会自动重新识别项目。';
    else if (status === 'waiting') hint = '开关已保存，页面组件加载完成后会自动启用。';
    else hint = localFile ? scopeHint : running ? '同一开发地址共用开关，切路由、刷新和重新打开后继续生效。' : '开启后，同一开发地址的所有路由和标签页共用。';
    $('componentStatus').dataset.state = toggle ? (running ? 'on' : 'off') : tone;
    $('componentPageState').textContent = progress || label;
    $('componentStatusHint').textContent = progress ? scopeHint : hint;
    $('componentNotice').textContent = state.error || '';
    $('componentNotice').hidden = !state.error;
    $('componentToggle').setAttribute('aria-checked', String(running));
    $('componentToggle').setAttribute('aria-label', running ? '停止当前页面的组件定位' : '启用当前页面的组件定位');
    setAvailability($('componentToggle'), !allowed || (!running && !ready), busy || changingTab || !!toggle);

    $('componentPageOrigin').textContent = origin && !localFile ? new URL(origin).host : currentTab?.title || (localFile ? '本地 HTML 文件' : '尚未找到当前页面');
    $('componentPageUrl').textContent = tabUrl(currentTab) || '尚未找到当前页面';
    const frameworks = state.frameworks?.join(' / ');
    $('componentFrameworkSummary').textContent = frameworks || '页面信息';
    $('componentFramework').textContent = frameworks || '开启时自动识别';
    $('componentProjectRoot').textContent = state.project?.root || '开启时自动识别';
    $('componentEditorName').textContent = taskMode ? taskEditor.name : host.editor?.name || '待选择';
    $('componentEditorName').dataset.pending = String(!taskMode && !host.editorAvailable);
    $('componentEditorPath').textContent = host.editor?.path || '';
    $('componentEditorPath').hidden = taskMode || !host.editor?.path;
    $('componentEditorHint').hidden = taskMode || !!host.editorAvailable;
    $('componentEditorHint').textContent = !hostReady ? '先连接辅助程序，再选择编辑器。' : '从“应用程序”中选择编辑器 .app 文件。';
    $('componentFileEditorActions').hidden = taskMode;
    $('componentTaskEditor').hidden = !taskMode;
    $('componentTaskEditor').value = taskEditor.id;
    setAvailability($('componentTaskEditor'));
    $('componentChooseEditor').textContent = host.editor ? '更换编辑器' : '选择编辑器';
    $('componentChooseEditor').classList.toggle('btn-primary', !host.editorAvailable);
    $('componentChooseEditor').classList.toggle('btn-ghost', !!host.editorAvailable);
    setAvailability($('componentChooseEditor'), !hostReady);
    $('componentClearEditor').hidden = !host.editor;
    setAvailability($('componentClearEditor'), !hostReady || !host.editor);

    if (setupKind === 'connected') setupMessage(host.connected && !host.editorAvailable && needsEditor ? '辅助程序已连接，请选择编辑器。' : '', 'connected');
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
    for (const id of ['componentCopyInstall', 'componentDownloadInstall', 'componentCopyQuarantine', 'componentUninstallHost', 'componentConfirmUninstall', 'componentCancelUninstall', 'componentCheckHost', 'componentResetShortcuts', 'componentAddOrigin', 'componentOriginInput']) setAvailability($(id));
    $('componentUninstallHost').textContent = host.connected && host.capabilities?.includes('uninstall') ? '卸载' : '复制卸载命令';
    $('componentUninstallConfirm').hidden = !confirmingUninstall;

    for (const button of $('componentClickAction').querySelectorAll('[data-click-action]')) {
      button.setAttribute('aria-pressed', String(button.dataset.clickAction === clickAction));
      setAvailability(button, !!recording);
    }
    $('componentOpenSourceHint').hidden = !needsEditor;
    $('componentCopyLocationHint').hidden = clickAction !== 'copy';
    $('componentAgentHint').hidden = !taskMode;
    $('componentAutoSendSection').hidden = !taskMode;
    $('componentAutoSend').setAttribute('aria-checked', String(settings.autoSend !== false));
    setAvailability($('componentAutoSend'));
    $('componentAutoSendHint').textContent = settings.autoSend === false ? '内容填入新聊天后，由你点击发送。' : '打开新聊天后自动发送内容，需要辅助功能授权。';
    $('componentAgentAccess').hidden = settings.autoSend === false;
    setAvailability($('componentAgentAccess'), !hostReady);
    $('componentClickShortcutTitle').textContent = actionLabels[clickAction];

    for (const [field, id, labelId] of [['openShortcut', 'componentOpenShortcut', 'componentOpenShortcutLabel'], ['menuShortcut', 'componentMenuShortcut', 'componentMenuShortcutLabel']]) {
      const shortcut = policy.shortcutLabel(settings[field]);
      if (recording !== field) $(id).textContent = shortcut;
      $(labelId).textContent = shortcut;
      setAvailability($(id));
    }
    $('componentOriginSummary').textContent = settings.origins.length ? `另有 ${settings.origins.length} 个地址` : '默认本地地址';
    const originList = $('componentOrigins');
    const origins = settings.origins.join('\n');
    if (origins !== renderedOrigins) {
      originList.replaceChildren(...settings.origins.map((address) => {
        const row = document.createElement('li');
        const text = document.createElement('span'); text.textContent = address;
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn btn-ghost component-text-btn'; remove.textContent = '移除';
        remove.addEventListener('click', () => action(async () => {
          await saveSettings({ origins: response.settings.origins.filter((item) => item !== address) });
          originMessage('');
        }));
        row.append(text, remove);
        return row;
      }));
      renderedOrigins = origins;
    }
    for (const button of originList.querySelectorAll('button')) setAvailability(button);
    const opened = state.lastOpened;
    $('componentLastOpened').hidden = !opened;
    $('componentLastOpened').textContent = opened ? `最近打开：${opened.file}${opened.line ? `:${opened.line}` : ' · 文件定位'}` : '';
    $('panel-component').classList.remove('component-loading');
    ns.workspaceUi?.syncHeader();
  }
  function originMessage(message) {
    $('componentOriginMessage').textContent = message;
    $('componentOriginMessage').hidden = !message;
  }
  async function refresh({ afterAction = false } = {}) {
    if (busy && !afterAction) { refreshQueued = true; return; }
    const version = ++revision;
    const superseded = () => version !== revision || (afterAction && refreshQueued);
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId });
      if (superseded()) return;
      const tab = tabs[0] || null;
      observedTabId = tab?.id;
      observedOrigin = policy.pageKey(tabUrl(tab));
      const result = await request('COMPONENT_STATUS', { tabId: tab?.id });
      if (superseded()) return;
      if (result.host.connected && pendingSetupAction === 'install' && (!response?.host.connected || (result.host.instanceId && result.host.instanceId !== response?.host.instanceId))) {
        setupMessage('辅助程序已连接，请选择编辑器。', 'connected'); pendingSetupAction = '';
        $('componentCommandDetails').open = false; $('componentCommandDetails').hidden = true;
      }
      refreshError = '';
      currentTab = tab; response = result; changingTab = false;
    } catch (error) {
      if (superseded()) return;
      refreshError = `状态刷新失败：${error.message}`;
      throw error;
    } finally {
      if (!afterAction && !superseded()) { render(); scheduleConnectionCheck(); }
    }
  }
  async function action(task, progress = '') {
    if (busy) return;
    busy = true; toggleProgress = progress; revision++; render();
    try { await task(); }
    catch (error) { ns.ui.toast(error.message, 'err'); }
    finally {
      // 操作过程中的通知合并到最后一次读取。如果读到一半又切了标签页，重新读取当前页。
      do {
        refreshQueued = false;
        try { await refresh({ afterAction: true }); }
        catch (_) { /* render 会显示刷新错误。 */ }
      } while (refreshQueued);
      busy = false; toggleProgress = ''; refreshQueued = false;
      render(); scheduleConnectionCheck();
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
    $('componentTaskEditor').replaceChildren(...policy.TASK_EDITORS.map((editor) => {
      const option = document.createElement('option');
      option.value = editor.id; option.textContent = editor.name;
      return option;
    }));
    $('componentTaskEditor').addEventListener('change', () => action(() => saveSettings({ taskEditor: $('componentTaskEditor').value })));
    $('componentAutoSend').addEventListener('click', () => action(() => saveSettings({ autoSend: response.settings.autoSend === false })));
    $('componentExtensionId').textContent = chrome.runtime.id;
    $('componentInstallCommand').textContent = `node scripts/install-component-host.js ${chrome.runtime.id}`;
    $('componentToggle').addEventListener('click', () => {
      if (changingTab || response?.toggle) return;
      const tab = currentTab, state = pageState();
      const running = state.enabled ?? state.status === 'on';
      action(() => request(running ? 'COMPONENT_STOP' : 'COMPONENT_START', { tabId: tab?.id, origin: policy.pageKey(tabUrl(tab)) }), toggleLabel(!running));
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
    for (const button of $('componentClickAction').querySelectorAll('[data-click-action]')) {
      button.addEventListener('click', () => {
        const clickAction = button.dataset.clickAction;
        const currentAction = response?.settings.clickAction || 'open';
        if (recording || clickAction === currentAction) return;
        action(async () => {
          await saveSettings({ clickAction });
          ns.ui.toast(`已切换为${actionLabels[clickAction]}`, 'ok');
        });
      });
    }
    $('componentAgentAccess').addEventListener('click', () => action(async () => {
      const result = await request('COMPONENT_AGENT_ACCESS');
      ns.ui.toast(result.trusted ? '自动发送权限已开启' : '请按系统提示开启辅助功能权限，随后可在网页重新操作', 'ok');
    }));
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
    chrome.tabs.onActivated.addListener((info) => {
      if (info.windowId !== windowId) return;
      observedTabId = info.tabId;
      observedOrigin = '';
      changingTab = currentTab?.id !== info.tabId;
      const toggle = $('componentToggle');
      setAvailability(toggle, toggle.disabled, busy || changingTab || !!response?.toggle);
      if (visible || busy) refresh().catch(() => {});
    });
    chrome.tabs.onUpdated.addListener((tabId, change) => { if ((visible || busy) && observedTabId === tabId && (change.url || change.status)) refresh().catch(() => {}); });
    chrome.runtime.onMessage.addListener((message) => {
      if ((!visible && !busy) || message.type !== 'COMPONENT_STATE_CHANGED') return;
      if ((message.tabId != null && message.tabId === observedTabId) || (message.origin && message.origin === observedOrigin)) refresh().catch(() => {});
    });
    window.addEventListener('focus', () => {
      if (!visible || busy) return;
      const reconnect = pendingSetupAction && response?.host.connected;
      (reconnect ? request('COMPONENT_RECONNECT_HOST') : Promise.resolve()).then(() => refresh()).catch(() => {});
    });
  }
  ns.componentInspectorUi = {
    init,
    activate: async () => {
      visible = true; watchConnection = true;
      if (!busy) await refresh();
    },
    deactivate: () => {
      visible = false;
      // 离开时取消普通刷新，正在处理的操作继续等待确认并保存结果。
      if (!busy) revision++;
      clearTimeout(pollTimer);
      confirmingUninstall = false; stopRecording();
    },
    getStatus: () => response ? $('componentPageState').textContent : '检查中',
  };
})();
