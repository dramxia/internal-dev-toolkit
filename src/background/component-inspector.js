/* 组件定位：按开发地址记住开关，同地址刷新时沿用项目并恢复页面脚本。 */
(() => {
  'use strict';
  const ns = globalThis.InternalDevToolkit;
  const policy = ns.componentSettings;
  const HOST = 'com.internal_dev_toolkit.component_inspector';
  const transitions = new Map();
  const originToggles = new Map();
  const snapshots = new Map();
  const projectChecks = new Map();
  const htmlIndexes = new Map();
  const MAX_HTML_BYTES = 8 * 1024 * 1024;
  const CHECK_INTERVAL = 15000;
  const retryDelay = (failures) => Math.min(1000 * 2 ** Math.min(Math.max(0, failures - 1), 4), CHECK_INTERVAL);
  let port = null;
  let serial = 0;
  let uninstalling = false;
  let checkingHost = null;
  let updateFailure = '';
  let updatedRevision = '';
  const pending = new Map();
  const tabKey = (id) => policy.TAB_PREFIX + id;
  const projectCheckKey = (origin, html) => html ? 'html:' + origin : origin;
  const token = () => crypto.randomUUID();
  const fileAccessAllowed = () => new Promise((resolve) => chrome.extension.isAllowedFileSchemeAccess(resolve));
  async function withTimeout(task, duration, message) {
    let timer;
    try {
      return await Promise.race([task, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), duration); })]);
    } finally { clearTimeout(timer); }
  }
  function executeScript(options) {
    return withTimeout(chrome.scripting.executeScript({ ...options, injectImmediately: true }), 10000, '页面响应超时，请刷新页面或点击「检查连接」重试');
  }
  function canReuseProject(state, origin) {
    return state.origin === origin && ['on', 'restoring'].includes(state.status) && !!state.project?.id && !!state.frameworks?.length;
  }
  async function originEnabled(origin) {
    return !!(await chrome.storage.local.get(policy.ORIGIN_PREFIX + origin))[policy.ORIGIN_PREFIX + origin];
  }
  function pageAllowed(origin, settings) {
    return origin.startsWith('file:') ? fileAccessAllowed() : policy.isAllowed(origin, settings.origins);
  }

  function nativeRequest(action, payload = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!port) {
          const connection = chrome.runtime.connectNative(HOST);
          port = connection;
          connection.onMessage.addListener((message) => {
            const job = pending.get(message.id);
            if (!job) return;
            pending.delete(message.id); clearTimeout(job.timer);
            message.ok ? job.resolve(message) : job.reject(Object.assign(new Error(message.error || '本机操作失败'), { code: message.code, nativeResponse: true }));
          });
          connection.onDisconnect.addListener(() => {
            const detail = chrome.runtime.lastError?.message || '';
            const unexpected = port === connection;
            if (unexpected) port = null;
            const message = /not found|not registered|Specified native/i.test(detail) ? '请先安装本机辅助程序，再检查连接' : '本机辅助程序连接已断开，请检查连接后重试';
            for (const [id, job] of pending) {
              if (job.connection !== connection) continue;
              clearTimeout(job.timer); job.reject(new Error(message)); pending.delete(id);
            }
            if (unexpected) pauseAll(message).catch(() => {});
          });
        }
        const id = ++serial;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('本机操作超时，请重试')); }, action === 'chooseEditor' ? 130000 : action === 'agentSource' ? 60000 : 25000);
        pending.set(id, { resolve, reject, timer, connection: port });
        port.postMessage({ ...payload, id, action });
      } catch (error) { reject(error); }
    });
  }

  function disconnectHost() {
    if (port) { const previous = port; port = null; previous.disconnect(); }
  }

  async function readyHost() {
    if (uninstalling) throw new Error('辅助程序正在卸载，请稍候');
    if (!checkingHost) checkingHost = (async () => {
      let host = await nativeRequest('status');
      if (!host.capabilities?.includes('auto-update')) return { ...host, needsInstall: true };
      try {
        const bundle = await ns.componentRuntime.loadBundle();
        if (host.revision === bundle.revision) { updateFailure = ''; return { ...host, updated: updatedRevision === bundle.revision }; }
        if (updateFailure) return { ...host, updateError: updateFailure };
        await nativeRequest('update', { bundle });
        // 更新请求已经返回，此时再断开旧进程，Chrome 会从完整的新版本启动。
        disconnectHost();
        host = await nativeRequest('status');
        if (host.revision !== bundle.revision) throw new Error('辅助程序版本核对失败');
        updatedRevision = bundle.revision;
        return { ...host, updated: true };
      } catch (error) {
        updateFailure = `自动更新未完成：${error.message}。点击「检查连接」重试。`;
        return { ...host, updateError: updateFailure };
      }
    })().finally(() => { checkingHost = null; });
    return checkingHost;
  }

  function assertHostReady(host) {
    if (host.needsInstall) throw new Error('请最后复制并执行一次重装命令，启用辅助程序自动更新');
    if (host.updateError) throw new Error(host.updateError);
  }

  function serviceChanged(error) {
    return ['COMPONENT_SERVER_OFFLINE', 'COMPONENT_PROJECT_STALE'].includes(error.code) || /服务已重启|目录(?:记录)?已变化|未找到监听|开发服务的工作目录暂时无法读取/.test(error.message);
  }

  function serviceOffline(error) {
    return error.code === 'COMPONENT_SERVER_OFFLINE' || /未找到监听|开发服务的工作目录暂时无法读取/.test(error.message);
  }

  async function checkProject(state, { force = false, minInterval = 0 } = {}) {
    const key = projectCheckKey(state.origin, state.project?.html);
    const previous = projectChecks.get(key);
    if (previous?.project && previous.projectId !== state.project.id) {
      if (previous.pending) return previous.promise;
      if (!previous.failures) return checkProject({ ...state, project: previous.project }, { force, minInterval });
      if (serviceOffline(previous.error) && Date.now() < previous.nextAt && (!force || Date.now() - previous.checkedAt < minInterval)) return previous.promise;
    }
    if (previous?.projectId === state.project.id) {
      if (previous.pending || (Date.now() < previous.nextAt && (!force || Date.now() - previous.checkedAt < minInterval))) return previous.promise;
    }
    const check = { projectId: state.project.id, project: state.project, pending: true, failures: previous?.failures || 0 };
    check.promise = nativeRequest('checkProject', { origin: state.origin, projectId: state.project.id }).then((result) => {
      check.failures = 0;
      check.project = result.project;
      check.nextAt = Date.now() + CHECK_INTERVAL;
      return result;
    }, (error) => {
      check.error = error;
      check.failures++;
      check.nextAt = Date.now() + retryDelay(check.failures);
      throw error;
    }).finally(() => { check.pending = false; check.checkedAt = Date.now(); });
    projectChecks.set(key, check);
    return check.promise;
  }

  function watchState(state) {
    const nextAt = state.retryAt || projectChecks.get(projectCheckKey(state.origin, state.project?.html))?.nextAt;
    const retryAfter = state.status === 'on' ? CHECK_INTERVAL : state.status === 'recovering' && nextAt ? Math.max(1000, nextAt - Date.now()) : 1000;
    return { watch: ['on', 'waiting', 'restoring', 'recovering'].includes(state.status), observe: state.status === 'waiting', retryAfter };
  }

  async function readState(tabId) {
    const result = await chrome.storage.session.get(tabKey(tabId));
    const state = result[tabKey(tabId)] || { status: 'off', origin: '', generation: '' };
    return { ...state, enabled: !!state.origin && await originEnabled(state.origin) };
  }
  async function writeState(tabId, state) {
    await chrome.storage.session.set({ [tabKey(tabId)]: state });
    chrome.runtime.sendMessage({ type: 'COMPONENT_STATE_CHANGED', tabId }).catch(() => {});
    return state;
  }
  function lock(tabId, task) {
    const previous = transitions.get(tabId) || Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    transitions.set(tabId, next);
    next.finally(() => { if (transitions.get(tabId) === next) transitions.delete(tabId); }).catch(() => {});
    return next;
  }

  async function stopRuntime(tabId) {
    snapshots.delete(tabId);
    try {
      await executeScript({ target: { tabId, allFrames: true }, world: 'ISOLATED', func: () => globalThis.__IDT_COMPONENT_INSPECTOR__?.destroy() });
    } catch (_) { /* 标签页关闭或离开可注入页面。 */ }
  }

  async function pause(tabId, error) {
    const state = await readState(tabId);
    await writeState(tabId, { ...state, status: 'paused', error, generation: token() });
    await stopRuntime(tabId);
  }
  async function pauseAll(error) {
    const states = await chrome.storage.session.get(null);
    await Promise.all(Object.entries(states).filter(([key, state]) => key.startsWith(policy.TAB_PREFIX) && ['on', 'starting', 'restoring', 'waiting', 'recovering'].includes(state.status)).map(([key]) => {
      const tabId = Number(key.slice(policy.TAB_PREFIX.length));
      return lock(tabId, async () => {
        if (['on', 'starting', 'restoring', 'waiting', 'recovering'].includes((await readState(tabId)).status)) await pause(tabId, error);
      });
    }));
  }

  async function assertTarget(tabId, origin, active = false) {
    const tab = await chrome.tabs.get(tabId);
    if (active && !tab.active) throw new Error('当前标签页已切换，请在目标页面重新操作');
    if (policy.pageKey(tab.pendingUrl || tab.url) !== origin) throw new Error('当前页面地址已变化，请重试');
    const settings = await policy.getSettings();
    if (!await pageAllowed(origin, settings)) throw new Error(origin.startsWith('file:') ? '请在 Chrome 扩展详情中开启「允许访问文件网址」' : '请切换到允许的本地开发页面');
    return { tab, settings };
  }

  async function installRuntime(tabId, state, settings, frameId) {
    const target = frameId == null ? { tabId, allFrames: true } : { tabId, frameIds: [frameId] };
    await executeScript({ target, world: 'ISOLATED', files: ['component-inspector.js'] });
    const results = await executeScript({ target, world: 'ISOLATED', func: (config) => {
      globalThis.__IDT_COMPONENT_INSPECTOR__?.start(config);
      return globalThis.__IDT_COMPONENT_INSPECTOR__?.isRunning(config) === true;
    }, args: [{ origin: state.origin, generation: state.generation, clickAction: settings.clickAction, openShortcut: settings.openShortcut, menuShortcut: settings.menuShortcut }] });
    if (!results.some((result) => result.frameId === (frameId ?? 0) && result.result === true)) throw new Error('定位脚本尚未启动，请等待页面加载完成后重试');
  }

  async function startTab(tabId, origin, explicit, previous = {}) {
    if (uninstalling) throw new Error('辅助程序正在卸载，请稍候');
    const { tab, settings } = await assertTarget(tabId, origin, explicit);
    if (!await originEnabled(origin)) return readState(tabId);
    const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
    const generation = token();
    const reuse = canReuseProject(previous, origin);
    const initial = { ...(reuse ? previous : {}), status: reuse ? 'restoring' : 'starting', origin, generation, documentId: frame?.documentId, error: '' };
    IDTComponentSources.clearSourceCache(origin);
    await writeState(tabId, initial);
    try {
      await stopRuntime(tabId);
      const host = await readyHost();
      if (settings.clickAction === 'open' && (!host.editor || !host.editorAvailable)) throw new Error('请先选择有效的编辑器');
      assertHostReady(host);
      let project = previous.project, frameworks = previous.frameworks;
      if (reuse) {
        // 刷新只检查原服务是否仍有效；服务变化时才重新查找项目。
        try { ({ project } = await checkProject(previous, { force: true })); }
        catch (error) {
          if (!serviceChanged(error)) throw error;
          return startTab(tabId, origin, explicit);
        }
      } else {
        const results = await executeScript({ target: { tabId, allFrames: true }, world: 'MAIN', func: inspectComponentPage, args: [{ mode: 'detect', origin }] });
        const detections = results.map((result) => result.result).filter((result) => result && !result.error);
        const htmlUrl = results.find((result) => result.frameId === 0)?.result?.html ? tab.pendingUrl || tab.url : '';
        frameworks = [...new Set(detections.flatMap((result) => result.frameworks || []))];
        const waitForPage = () => writeState(tabId, { status: 'waiting', origin, generation, documentId: frame?.documentId, error: '' });
        if (!frameworks.length && !htmlUrl) return waitForPage();
        const hints = new Set(detections.flatMap((result) => result.hints || []));
        // React 19 通过调试栈提供路径；启动时也要还原源码，才能识别工作区中的子项目。
        const sources = new Map();
        for (const result of detections) {
          for (const source of result.sources || []) {
            if (sources.size < 12) sources.set(JSON.stringify(source), { source, scripts: result.scripts });
          }
        }
        const resolved = await withTimeout(Promise.allSettled([...sources.values()].map(({ source, scripts }) => IDTComponentSources.resolveComponentSource(source, origin, scripts))), 8000, '组件源码读取超时，请点击「检查连接」重试');
        for (const result of resolved) if (result.status === 'fulfilled' && result.value?.file) hints.add(result.value.file);
        try {
          ({ project } = await nativeRequest('identifyProject', {
            origin, hints: [...hints].slice(0, 32), ...(htmlUrl ? { htmlUrl, htmlOnly: !frameworks.length } : {}),
          }));
          if (project.html) frameworks = ['HTML'];
        } catch (error) {
          if (!frameworks.length && error.code === 'COMPONENT_HTML_NOT_FOUND' && !origin.startsWith('file:')) return waitForPage();
          throw error;
        }
        projectChecks.set(projectCheckKey(origin, project.html), { projectId: project.id, project, promise: Promise.resolve({ project }), checkedAt: Date.now(), nextAt: Date.now() + CHECK_INTERVAL, failures: 0 });
      }
      if (uninstalling) throw new Error('辅助程序正在卸载，请稍候');
      const state = { ...initial, status: 'on', project, frameworks, retryAt: 0, retryCount: 0 };
      await installRuntime(tabId, state, settings);
      await assertTarget(tabId, origin, explicit);
      const currentFrame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
      if (frame?.documentId !== currentFrame?.documentId) throw new Error('页面正在切换，加载完成后会自动恢复定位');
      if (!await originEnabled(origin)) return readState(tabId);
      const latest = await readState(tabId);
      if (latest.generation !== generation) throw new Error('页面加载状态已变化，请重试');
      await writeState(tabId, state);
      return state;
    } catch (error) {
      const latest = await readState(tabId);
      if (latest.generation === generation && serviceChanged(error) && await originEnabled(origin)) {
        const retryCount = (previous.retryCount || 0) + 1;
        return writeState(tabId, { ...latest, status: 'recovering', retryCount, retryAt: Date.now() + retryDelay(retryCount), error: '开发服务暂时离线，服务恢复后会自动启用定位。' });
      }
      if (latest.generation === generation) await pause(tabId, error.message);
      throw error;
    }
  }

  async function restoreTab(tabId, sender, payload = {}) {
    const tab = await chrome.tabs.get(tabId);
    const origin = policy.pageKey(tab.pendingUrl || tab.url);
    let state = await readState(tabId);
    if (!origin || !await originEnabled(origin) || !await pageAllowed(origin, await policy.getSettings())) return {};
    const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
    if (sender && (!policy.matchesPage(origin, sender.url) || (sender.frameId === 0 && sender.documentId && sender.documentId !== frame?.documentId))) return {};
    const activeCheck = payload.visible === true && ['visible', 'focus', 'pageshow', 'wake'].includes(payload.reason);
    if (sender?.frameId > 0 && state.status === 'recovering') return {};
    if (['on', 'recovering'].includes(state.status) && state.project?.id && state.origin === origin && state.documentId === frame?.documentId) {
      try {
        try {
          const { project } = await checkProject(state, { force: activeCheck, minInterval: 1000 });
          if (project.id !== state.project.id) {
            await stopRuntime(tabId);
            state = await writeState(tabId, { ...state, project, status: 'restoring', generation: token(), error: '', retryAt: 0, retryCount: 0 });
          }
        }
        catch (error) {
          if (!serviceChanged(error)) throw error;
          if (serviceOffline(error)) {
            let recovering = state;
            if (state.status === 'on') {
              await stopRuntime(tabId);
              recovering = await writeState(tabId, { ...state, status: 'recovering', generation: token(), error: '开发服务暂时离线，服务恢复后会自动启用定位。' });
            }
            return sender?.frameId > 0 ? {} : watchState(recovering);
          }
          return watchState(await startTab(tabId, origin, false));
        }
        if (state.status === 'restoring') await installRuntime(tabId, state, await policy.getSettings());
        else if (sender?.frameId > 0) {
          const child = await chrome.webNavigation.getFrame({ tabId, frameId: sender.frameId });
          if (sender.documentId && child?.documentId !== sender.documentId) return {};
          await installRuntime(tabId, state, await policy.getSettings(), sender.frameId);
        } else {
          const results = await executeScript({ target: { tabId, documentIds: [frame.documentId] }, world: 'ISOLATED', func: (config) => globalThis.__IDT_COMPONENT_INSPECTOR__?.isRunning(config) === true, args: [{ origin, generation: state.generation }] });
          if (!results[0]?.result) await installRuntime(tabId, state, await policy.getSettings());
        }
        if (['recovering', 'restoring'].includes(state.status)) {
          const restored = await writeState(tabId, { ...state, status: 'on', retryAt: 0, retryCount: 0, error: '' });
          return sender?.frameId > 0 ? {} : watchState(restored);
        }
      } catch (error) { await pause(tabId, error.message); throw error; }
      return sender?.frameId > 0 ? {} : watchState(state);
    }
    if (sender?.frameId > 0) return {};
    if (state.status === 'recovering' && state.retryAt > Date.now() && !activeCheck) return watchState(state);
    const restored = await startTab(tabId, origin, false, ['restoring', 'recovering'].includes(state.status) ? state : {});
    return watchState(restored);
  }

  async function matchingTabs(origin) {
    return (await chrome.tabs.query({})).filter((tab) => policy.pageKey(tab.pendingUrl || tab.url) === origin);
  }

  async function setOriginEnabled(tabId, origin, enabled) {
    await assertTarget(tabId, origin, true);
    await chrome.storage.local.set({ [policy.ORIGIN_PREFIX + origin]: enabled });
    if (!enabled) {
      projectChecks.delete(origin);
      projectChecks.delete(projectCheckKey(origin, true));
      IDTComponentSources.clearSourceCache(origin);
    }
    const tabs = await matchingTabs(origin);
    const results = await Promise.allSettled(tabs.map((tab) => lock(tab.id, async () => {
      if (!enabled) {
        await writeState(tab.id, { status: 'off', origin, generation: token() });
        await stopRuntime(tab.id);
        return {};
      }
      // 已经打开的页面也要重新唤醒加载通知，等待尚未挂载的组件。
      await executeScript({ target: { tabId: tab.id, allFrames: true }, world: 'ISOLATED', files: ['component-document-ready.js'] });
      return startTab(tab.id, origin, tab.id === tabId);
    })));
    const current = results[tabs.findIndex((tab) => tab.id === tabId)];
    if (current?.status === 'rejected') throw current.reason;
    return current?.value || {};
  }

  function toggleOrigin(tabId, origin, enabled) {
    return lock(`origin:${origin}`, async () => {
      const toggle = { enabled };
      originToggles.set(origin, toggle);
      const notify = () => chrome.runtime.sendMessage({ type: 'COMPONENT_STATE_CHANGED', origin }).catch(() => {});
      notify();
      try {
        toggle.previousEnabled = await originEnabled(origin);
        return await setOriginEnabled(tabId, origin, enabled);
      } finally {
        originToggles.delete(origin);
        notify();
      }
    });
  }

  async function restoreEnabledTabs() {
    const tabs = await chrome.tabs.query({});
    const settings = await policy.getSettings();
    await Promise.allSettled(tabs.map((tab) => lock(tab.id, async () => {
      const origin = policy.pageKey(tab.pendingUrl || tab.url);
      if (!origin || !await originEnabled(origin)) return;
      if (!await pageAllowed(origin, settings)) return;
      await executeScript({ target: { tabId: tab.id, allFrames: true }, world: 'ISOLATED', files: ['component-document-ready.js'] });
      await restoreTab(tab.id);
    })));
  }

  async function resolvePageSource(source, state, scripts) {
    if (source?.kind !== 'html' || !source.htmlElement?.length) return IDTComponentSources.resolveComponentSource(source, state.origin, scripts);
    const request = { origin: state.origin, projectId: state.project.id, htmlUrl: source.htmlUrl };
    const previous = htmlIndexes.get(source.htmlUrl);
    let part;
    try { part = await nativeRequest('readHtmlSource', { ...request, revision: previous?.revision }); }
    catch (error) {
      // 打开源码时沿用现有的服务重连流程，再用新项目重新读取 HTML。
      if (serviceChanged(error)) return IDTComponentSources.resolveComponentSource(source, state.origin);
      throw error;
    }
    const { file, revision, size } = part;
    htmlIndexes.delete(source.htmlUrl);
    let index = previous?.file === file && previous.revision === revision && previous.encoding === source.encoding ? previous.index : null;
    if (!index && size <= MAX_HTML_BYTES) {
      if (part.chunk == null) part = await nativeRequest('readHtmlSource', request);
      if (part.revision !== revision) throw new Error('HTML 文件已修改，请刷新页面后重新选择元素');
      const decoder = new TextDecoder(source.encoding || 'utf-8');
      let html = '', offset = 0;
      while (offset < size) {
        const bytes = Uint8Array.from(atob(part.chunk), (character) => character.charCodeAt(0));
        if (!bytes.length || offset + bytes.length > size) throw new Error('HTML 源码读取不完整');
        offset += bytes.length;
        html += decoder.decode(bytes, { stream: offset < size });
        if (offset < size) part = await nativeRequest('readHtmlSource', { ...request, offset, revision });
      }
      index = IDTHtmlSource.indexHtml(html);
    }
    if (index) {
      let cachedBytes = [...htmlIndexes.values()].reduce((sum, entry) => sum + entry.size, 0);
      while (htmlIndexes.size >= 4 || cachedBytes + size > MAX_HTML_BYTES) {
        const oldest = htmlIndexes.keys().next().value;
        cachedBytes -= htmlIndexes.get(oldest).size;
        htmlIndexes.delete(oldest);
      }
      htmlIndexes.set(source.htmlUrl, { file, revision, size, index, encoding: source.encoding });
    }
    const position = index && IDTHtmlSource.locateHtmlElement(index, source.htmlElement);
    return { file, htmlUrl: source.htmlUrl, revision, line: position?.line || null, column: position?.column || null, precision: position ? 'line' : 'file' };
  }

  async function inspect(sender, payload) {
    const tabId = sender.tab?.id;
    const state = await readState(tabId);
    if (state.status !== 'on' || state.generation !== payload.generation || !policy.matchesPage(state.origin, sender.url)) throw new Error('当前页面的组件定位已停止');
    await assertTarget(tabId, state.origin, true);
    const target = sender.documentId ? { tabId, documentIds: [sender.documentId] } : { tabId, frameIds: [sender.frameId || 0] };
    const html = state.frameworks?.includes('HTML');
    const results = await executeScript({ target, world: 'MAIN', func: inspectComponentPage, args: [{ mode: 'element', x: Number(payload.x), y: Number(payload.y), marker: payload.details ? payload.marker : '', props: payload.details === true, origin: policy.pageKey(sender.url), html }] });
    const result = results[0]?.result;
    if (!result || result.error) throw new Error(result?.error || '页面元素已变化');
    const latest = await readState(tabId);
    if (latest.status !== 'on' || latest.generation !== state.generation) throw new Error('页面状态已变化');
    if (!payload.details) return { components: result.components.map(({ name, framework }) => ({ name, framework })), rect: result.rect };
    if (html) {
      const url = new URL(sender.url);
      url.search = ''; url.hash = '';
      const file = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
      for (const component of result.components) {
        component.source = { kind: 'html', file, htmlUrl: url.href, htmlElement: result.htmlElement, encoding: result.htmlEncoding };
      }
    }
    const id = token();
    let entries = snapshots.get(tabId);
    if (!entries) { entries = new Map(); snapshots.set(tabId, entries); }
    const entry = { generation: state.generation, documentId: sender.documentId, frameId: sender.frameId || 0, created: Date.now(), rawComponents: result.components, scripts: result.scripts };
    entries.set(id, entry);
    if (entries.size > 8) entries.delete(entries.keys().next().value);
    const components = await Promise.all(result.components.map(async (component) => {
      const source = await resolvePageSource(component.source, state, result.scripts);
      return { ...component, source };
    }));
    const resolvedState = await readState(tabId);
    if (snapshots.get(tabId)?.get(id) !== entry || resolvedState.status !== 'on' || resolvedState.generation !== state.generation) throw new Error('组件信息已过期，请重新选择');
    entry.components = components;
    return { snapshotId: id, components, rect: result.rect };
  }

  async function useSnapshot(sender, payload, action) {
    const tabId = sender.tab?.id;
    const state = await readState(tabId);
    const entry = snapshots.get(tabId)?.get(payload.snapshotId);
    if (state.status !== 'on' || !entry || entry.generation !== state.generation || entry.documentId !== sender.documentId || entry.frameId !== (sender.frameId || 0) || Date.now() - entry.created > 300000) throw new Error('组件信息已过期，请重新选择');
    const settings = action === 'agentSource' ? await policy.getSettings() : null;
    const taskOptions = settings ? { text: payload.text, taskEditor: settings.taskEditor, autoSend: settings.autoSend } : {};
    const keepSnapshot = action === 'sourceLocation' || (action === 'copySource' && payload.keepSnapshot === true);
    if (action === 'copySource' && keepSnapshot) taskOptions.trailingSpace = false;
    if (action === 'agentSource' && entry.agentAttempted) throw new Error('已尝试打开这条草稿，请先在编辑器中检查结果');
    await assertTarget(tabId, state.origin, true);
    const source = entry.components?.[payload.index]?.source;
    if (!source?.file) throw new Error('此组件尚未提供源码位置');
    let openingState = state;
    try {
      assertHostReady(await readyHost());
      let result;
      if (action === 'agentSource') entry.agentAttempted = true;
      try { result = await nativeRequest(action, { origin: state.origin, projectId: state.project.id, source, ...taskOptions }); }
      catch (error) {
        if (!serviceChanged(error)) throw error;
        openingState = await lock(tabId, async () => {
          const latest = await readState(tabId);
          if (!latest.enabled || latest.origin !== state.origin || latest.documentId !== state.documentId) throw new Error('当前页面的组件定位已停止');
          if (latest.status === 'on' && latest.project.id !== state.project.id) return latest;
          return startTab(tabId, state.origin, false);
        });
        if (openingState.status !== 'on') throw Object.assign(new Error('正在等待开发服务恢复，恢复后会自动启用定位。'), { code: 'COMPONENT_SERVER_OFFLINE' });
        const frame = await chrome.webNavigation.getFrame({ tabId, frameId: sender.frameId || 0 });
        if (entry.documentId && entry.documentId !== frame?.documentId) throw new Error('页面已经切换，请重新选择组件');
        const rawSource = entry.rawComponents?.[payload.index]?.source;
        const refreshedSource = rawSource ? await resolvePageSource(rawSource, openingState, entry.scripts) : source;
        if (!refreshedSource?.file) throw new Error('此组件尚未提供源码位置');
        await assertTarget(tabId, state.origin, true);
        const latest = await readState(tabId);
        if (!latest.enabled || latest.status !== 'on' || latest.generation !== openingState.generation) throw new Error('当前页面的组件定位已停止');
        result = await nativeRequest(action, { origin: state.origin, projectId: openingState.project.id, source: refreshedSource, ...taskOptions });
      }
      if (!keepSnapshot) snapshots.get(tabId)?.delete(payload.snapshotId);
      const latest = await readState(tabId);
      if (action === 'openSource' && latest.status === 'on' && latest.generation === openingState.generation) await writeState(tabId, { ...latest, lastOpened: result });
      return result;
    } catch (error) {
      if (action === 'agentSource' && error.nativeResponse && error.code !== 'CHATGPT_OPEN_UNCERTAIN') entry.agentAttempted = false;
      const latest = await readState(tabId);
      if (serviceChanged(error)) {
        await lock(tabId, async () => {
          const current = await readState(tabId);
          if (current.enabled && current.status === 'on' && current.generation === openingState.generation) {
            await stopRuntime(tabId);
            await writeState(tabId, { ...current, status: 'recovering', generation: token(), error: '正在等待开发服务恢复，恢复后会自动启用定位。' });
          }
        });
      } else if (latest.generation === openingState.generation && /编辑器|连接/.test(error.message)) {
        const settings = await policy.getSettings();
        if (settings.clickAction === 'open' || /连接/.test(error.message)) await pause(tabId, error.message);
      }
      throw error;
    }
  }

  async function handle(msg, sender) {
    const payload = msg.payload || {};
    if (msg.type === 'COMPONENT_DOCUMENT_READY') {
      if (!sender.tab?.id) return {};
      const tabId = sender.tab.id;
      return lock(tabId, () => restoreTab(tabId, sender, payload));
    }
    if (msg.type === 'COMPONENT_INSPECT') return inspect(sender, payload);
    if (msg.type === 'COMPONENT_OPEN') return useSnapshot(sender, payload, 'openSource');
    if (['COMPONENT_AGENT', 'COMPONENT_CHATGPT'].includes(msg.type)) {
      if ((await policy.getSettings()).clickAction !== 'agent') throw new Error('请先选择「发送任务」');
      return lock(`agent:${sender.tab?.id}`, () => useSnapshot(sender, payload, 'agentSource'));
    }
    if (msg.type === 'COMPONENT_COPY') return useSnapshot(sender, payload, 'copySource');
    if (msg.type === 'COMPONENT_SOURCE_LOCATION') return useSnapshot(sender, payload, 'sourceLocation');
    // 设置和系统窗口只接受扩展页面发起的操作。
    if (!sender.url?.startsWith(chrome.runtime.getURL(''))) throw new Error('操作来源无效');
    switch (msg.type) {
      case 'COMPONENT_STATUS': {
        const settings = await policy.getSettings();
        let host;
        try { host = { connected: true, ...(await readyHost()) }; }
        catch (error) { host = { connected: false, editor: null, error: error.message }; }
        let state = { status: 'off', enabled: false };
        let toggle, fileAccess;
        if (Number.isInteger(payload.tabId)) {
          const tab = await chrome.tabs.get(payload.tabId);
          const origin = policy.pageKey(tab.pendingUrl || tab.url);
          if (origin.startsWith('file:')) fileAccess = await fileAccessAllowed();
          // 辅助程序检查可能较慢，最后再读状态；启停若恰好完成，则重新读取最终状态。
          do {
            toggle = originToggles.get(origin);
            state = await readState(payload.tabId);
            if (state.origin !== origin) state = { status: 'off', origin, enabled: await originEnabled(origin) };
          } while (toggle !== originToggles.get(origin));
        }
        return { settings, state, host, toggle: toggle ? { ...toggle } : null, fileAccess };
      }
      case 'COMPONENT_CHATGPT_ACCESS':
      case 'COMPONENT_AGENT_ACCESS':
        assertHostReady(await readyHost());
        return nativeRequest('agentAccess', { taskEditor: (await policy.getSettings()).taskEditor });
      case 'COMPONENT_CHOOSE_EDITOR': {
        const host = await readyHost();
        assertHostReady(host);
        return nativeRequest('chooseEditor');
      }
      case 'COMPONENT_RECONNECT_HOST': {
        if (checkingHost) await checkingHost.catch(() => {});
        updateFailure = '';
        // 正在识别项目或打开源码时沿用当前连接，避免检查连接中断这些操作。
        if (!pending.size) disconnectHost();
        await readyHost();
        await restoreEnabledTabs();
        return {};
      }
      case 'COMPONENT_UNINSTALL_HOST': {
        if (uninstalling) throw new Error('辅助程序正在卸载，请稍候');
        uninstalling = true;
        try {
          if (checkingHost) await checkingHost.catch(() => {});
          const host = await nativeRequest('status');
          if (!host.capabilities?.includes('uninstall')) throw new Error('当前版本请复制卸载命令到终端执行');
          await pauseAll('组件定位已暂停，重新安装辅助程序后可再次启动');
          const result = await nativeRequest('uninstall');
          disconnectHost();
          return result;
        } finally { uninstalling = false; }
      }
      case 'COMPONENT_CLEAR_EDITOR': {
        assertHostReady(await readyHost());
        const result = await nativeRequest('clearEditor');
        if ((await policy.getSettings()).clickAction === 'open') await pauseAll('请先选择编辑器，再启动当前页面');
        return result;
      }
      case 'COMPONENT_SAVE_SETTINGS': {
        const previousSettings = await policy.getSettings();
        const settings = policy.normalizeSettings(payload);
        await chrome.storage.local.set({ [policy.SETTINGS_KEY]: settings });
        // 编辑器和发送偏好由后台在提交时读取，保存时保留页面中的草稿。
        if (['clickAction', 'origins', 'openShortcut', 'menuShortcut'].every((key) => JSON.stringify(previousSettings[key]) === JSON.stringify(settings[key]))) return { settings };
        const all = await chrome.storage.session.get(null);
        for (const [key, state] of Object.entries(all)) {
          if (!key.startsWith(policy.TAB_PREFIX) || !['on', 'paused'].includes(state.status)) continue;
          const tabId = Number(key.slice(policy.TAB_PREFIX.length));
          await lock(tabId, async () => {
            const latest = await readState(tabId);
            if (latest.status === 'paused' && latest.enabled && settings.clickAction !== 'open' && /编辑器/.test(latest.error || '')) {
              await startTab(tabId, latest.origin, false); return;
            }
            if (latest.status !== 'on') return;
            if (!await pageAllowed(latest.origin, settings)) await pause(tabId, latest.origin.startsWith('file:') ? '当前页面的访问权限已关闭' : '该开发地址已从允许列表移除');
            else if (settings.clickAction === 'open' && !(await readyHost()).editorAvailable) await pause(tabId, '请先选择有效的编辑器');
            else await installRuntime(tabId, latest, settings).catch(() => {});
          });
        }
        return { settings };
      }
      case 'COMPONENT_START': return toggleOrigin(payload.tabId, payload.origin, true);
      case 'COMPONENT_STOP': return toggleOrigin(payload.tabId, payload.origin, false);
      default: throw new Error('未知组件定位操作');
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (!msg?.type?.startsWith('COMPONENT_') || msg.type === 'COMPONENT_STATE_CHANGED') return false;
    handle(msg, sender).then((result) => respond({ ...result, ok: true })).catch((error) => respond({ ok: false, error: error.message }));
    return true;
  });
  chrome.tabs.onRemoved.addListener((tabId) => { snapshots.delete(tabId); chrome.storage.session.remove(tabKey(tabId)).catch(() => {}); });
  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    const { tabId } = details;
    lock(tabId, async () => {
      const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
      if (frame?.documentId !== details.documentId) return;
      const state = await readState(tabId);
      if (state.status === 'on' && state.documentId === details.documentId) return;
      const origin = policy.pageKey(details.url);
      const enabled = origin && await originEnabled(origin) && await pageAllowed(origin, await policy.getSettings());
      const reuse = enabled && details.transitionType === 'reload' && canReuseProject(state, origin);
      await writeState(tabId, { ...(reuse ? state : {}), status: enabled ? reuse ? 'restoring' : 'waiting' : 'off', origin, generation: token(), documentId: details.documentId, error: '' });
      snapshots.delete(tabId);
    }).catch(() => {});
  });

  function routeChanged(details) {
    if (details.frameId !== 0) return;
    lock(details.tabId, async () => {
      const state = await readState(details.tabId);
      const frame = await chrome.webNavigation.getFrame({ tabId: details.tabId, frameId: 0 });
      if (frame?.documentId !== details.documentId) return;
      snapshots.delete(details.tabId);
      if (state.status !== 'on') { await restoreTab(details.tabId); return; }
      await restoreTab(details.tabId);
      await executeScript({ target: { tabId: details.tabId, documentIds: [details.documentId] }, world: 'ISOLATED', func: () => globalThis.__IDT_COMPONENT_INSPECTOR__?.resetInteraction() });
    }).catch(() => {});
  }
  chrome.webNavigation.onHistoryStateUpdated.addListener(routeChanged);
  chrome.webNavigation.onReferenceFragmentUpdated.addListener(routeChanged);
  chrome.tabs.onUpdated.addListener((tabId, change) => {
    if (change.status === 'complete') lock(tabId, () => restoreTab(tabId)).catch(() => {});
  });
  chrome.runtime.onStartup.addListener(() => { restoreEnabledTabs().catch(() => {}); });
  chrome.runtime.onInstalled.addListener(() => { restoreEnabledTabs().catch(() => {}); });
  ns.componentInspectorBackground = { readState, handle, nativeRequest };
})();
