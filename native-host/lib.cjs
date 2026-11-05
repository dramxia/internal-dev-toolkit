'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const dns = require('node:dns/promises');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const runFile = promisify(execFile);
const { HOST_NAME, installationPaths, uninstall, runtimeBundle, updateRuntime } = require('./installation.cjs');
const EDITOR_PICKER_SCRIPT = 'POSIX path of (choose file with prompt "选择用于打开组件源码的编辑器（.app）" of type {"com.apple.application-bundle"} default location (path to applications folder) multiple selections allowed false invisibles false showing package contents false)';

// 此函数作为固定的 JXA 脚本运行，用户文字只通过参数传递。
function chatgptAutomation(argv) {
  ObjC.import('AppKit');
  ObjC.import('ApplicationServices');
  // 显式声明对象和输出指针类型，避免 JXA 把 CF 引用当成普通 Ref 对象传入。
  ObjC.bindFunction('AXUIElementCreateApplication', ['id', ['int']]);
  ObjC.bindFunction('AXUIElementCopyAttributeValue', ['int', ['id', 'id', 'id*']]);
  ObjC.bindFunction('AXUIElementSetAttributeValue', ['int', ['id', 'id', 'id']]);
  ObjC.bindFunction('AXUIElementPerformAction', ['int', ['id', 'id']]);
  ObjC.bindFunction('CFURLGetString', ['id', ['id']]);
  const input = JSON.parse(argv[0]);
  if (input.mode === 'access') {
    return JSON.stringify({ trusted: !!$.AXIsProcessTrustedWithOptions($({ AXTrustedCheckOptionPrompt: true })) });
  }
  if (!$.AXIsProcessTrusted()) return JSON.stringify({ sendStatus: 'draft', reason: 'accessibility' });
  function attribute(element, name) {
    const value = Ref();
    if ($.AXUIElementCopyAttributeValue(element, $(name), value) !== 0) return null;
    // AXURL 返回 CFURL；直接 unwrap 会丢失 absoluteString，变成 [object NSURL]。
    if (name === 'AXURL' && $.CFGetTypeID(value[0]) === $.CFURLGetTypeID())
      return ObjC.unwrap($.CFURLGetString(value[0]));
    return ObjC.unwrap(value[0]);
  }
  function descendants(element) {
    const entries = [element];
    for (let i = 0; i < entries.length; i++) {
      if (entries.length > 1500 || Date.now() >= deadline) { controls.treeLimited = true; return []; }
      const children = attribute(entries[i], 'AXChildren');
      if (Array.isArray(children)) entries.push.apply(entries, children);
    }
    return entries;
  }
  const expected = input.prompt.replace(/\r\n?/g, '\n');
  function pageKind(element) {
    const url = String(attribute(element, 'AXURL') || '');
    // 桌面端主窗口加载 index.html，聊天切换由页面内部路由处理。
    if (/^app:\/\/-\/index\.html(?:[?#].*)?$/.test(url)) return 'document';
    if (/^(?:app|codex):\/\/[^/]+\/(?:new|threads\/new)?(?:[?#].*)?$/.test(url)) return 'route';
    return url ? 'other' : 'missing';
  }
  function taskPage(element) {
    return attribute(element, 'AXRole') === 'AXWebArea' && ['document', 'route'].includes(pageKind(element));
  }
  function waitForUI() {
    // NSRunningApplication 的焦点状态依赖主运行循环更新。
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.2));
  }
  const started = Date.now();
  const deadline = started + 12000;
  const workspace = $.NSWorkspace.sharedWorkspace;
  let wasActive = false;
  let enabledPid = null;
  let targetPid = 0;
  let focusState = 'waiting';
  let reason = 'focus';
  let stage = 'application';
  const controls = { webAreaCount: 0, pageMatchCount: 0, textAreaCount: 0, draftMatchCount: 0, sendButtonCount: 0, treeLimited: false, pageKinds: [] };
  function frontmostTarget() {
    // 直接读取接收键盘事件的前台进程，避免误选同名应用列表里的后台进程。
    const app = workspace.frontmostApplication;
    if (!app || app.isNil() || ObjC.unwrap(app.bundleIdentifier) !== 'com.openai.codex') {
      focusState = wasActive ? 'lost' : 'waiting';
      return null;
    }
    if (targetPid && app.processIdentifier !== targetPid) {
      focusState = 'changed';
      return null;
    }
    targetPid = app.processIdentifier;
    focusState = 'matched';
    return app;
  }
  function finish(sendStatus, reason, extra) {
    return JSON.stringify(Object.assign({ sendStatus, reason, stage, focusState, targetPid, elapsedMs: Date.now() - started, controls }, extra || {}));
  }
  try {
    while (Date.now() < deadline) {
      stage = 'application';
      const app = frontmostTarget();
      if (!app) {
        if (wasActive) return finish('draft', 'focus');
        waitForUI(); continue;
      }
      wasActive = true;
      const application = $.AXUIElementCreateApplication(app.processIdentifier);
      if (enabledPid !== app.processIdentifier) {
        // Electron 按需提供页面控件。系统授权后还需主动开启控件读取。
        stage = 'accessibility';
        $.AXUIElementSetAttributeValue(application, $('AXManualAccessibility'), $(true));
        enabledPid = app.processIdentifier;
        waitForUI(); continue;
      }
      stage = 'window'; reason = 'window';
      const window = attribute(application, 'AXFocusedWindow');
      if (!window) { waitForUI(); continue; }
      stage = 'page'; reason = 'page';
      // 优先从当前输入框向上查找，避免侧边栏较长时扫描整窗耗尽时间。
      const focusedPath = [];
      let focused = attribute(application, 'AXFocusedUIElement');
      for (let depth = 0; focused && depth < 64; depth++) {
        focusedPath.push(focused);
        if ($.CFEqual(focused, window)) break;
        focused = attribute(focused, 'AXParent');
      }
      const inWindow = focusedPath.length && $.CFEqual(focusedPath[focusedPath.length - 1], window);
      const focusedPages = inWindow ? focusedPath.filter(taskPage) : [];
      const webAreas = (focusedPages.length === 1 ? focusedPath : descendants(window)).filter(element => attribute(element, 'AXRole') === 'AXWebArea');
      const pages = webAreas.filter(taskPage);
      controls.webAreaCount = webAreas.length;
      controls.pageMatchCount = pages.length;
      controls.pageKinds = webAreas.slice(0, 8).map(pageKind);
      if (pages.length === 1) {
        stage = 'draft'; reason = 'draft';
        const page = focusedPages.length === 1 ? focusedPath : descendants(pages[0]);
        const textAreas = page.filter(element => attribute(element, 'AXRole') === 'AXTextArea');
        const editors = textAreas.filter(function (element) {
          return String(attribute(element, 'AXValue') || '').replace(/\r\n?/g, '\n') === expected;
        });
        controls.textAreaCount = textAreas.length;
        controls.draftMatchCount = editors.length;
        let buttons = [];
        let group = editors.length === 1 ? attribute(editors[0], 'AXParent') : null;
        if (group) { stage = 'button'; reason = 'button'; }
        for (let depth = 0; group && depth < 16; depth++) {
          const role = attribute(group, 'AXRole');
          if (role === 'AXWindow') break;
          buttons = descendants(group).filter(function (element) {
            if (attribute(element, 'AXRole') !== 'AXButton' || !attribute(element, 'AXEnabled')) return false;
            return ['AXTitle', 'AXDescription'].some(function (name) {
              const label = String(attribute(element, name) || '').trim();
              return /^(Send|Send message|Send prompt|Submit prompt|发送|发送消息|发送提示词)$/.test(label);
            });
          });
          if (buttons.length) break;
          // 普通 div 可能被辅助功能树省略，输入框和按钮会直接同属新聊天页面。
          if (role === 'AXWebArea') break;
          group = attribute(group, 'AXParent');
        }
        controls.sendButtonCount = buttons.length;
        if (editors.length === 1 && buttons.length === 1) {
          stage = 'verify';
          // 点击前再次核对焦点与原文，用户切换窗口或修改内容时留在草稿。
          waitForUI();
          const currentWindow = attribute(application, 'AXFocusedWindow');
          if (Date.now() >= deadline || !frontmostTarget() || !currentWindow || !$.CFEqual(window, currentWindow) || !taskPage(pages[0]) ||
            String(attribute(editors[0], 'AXValue') || '').replace(/\r\n?/g, '\n') !== expected)
            return finish('draft', 'changed');
          stage = 'press';
          const result = $.AXUIElementPerformAction(buttons[0], $('AXPress'));
          return finish(result === 0 ? 'pressed' : 'draft', result === 0 ? '' : 'press');
        }
      }
      waitForUI();
    }
    return finish('draft', reason);
  } catch (error) {
    return finish('draft', 'automation', { errorName: String(error.name || 'Error') });
  }
}
const CHATGPT_AUTOMATION_SCRIPT = `function run(argv) { return (${chatgptAutomation.toString()})(argv); }`;

function copyTextToClipboard(text) {
  return new Promise((resolve, reject) => {
    const child = execFile('/usr/bin/pbcopy', [], { timeout: 8000, env: { ...process.env, LC_CTYPE: 'UTF-8' } }, (error) => {
      if (error) reject(new Error('复制失败，请重新点击组件重试'));
      else resolve();
    });
    child.stdin.on('error', () => reject(new Error('复制失败，请重新点击组件重试')));
    child.stdin.end(text, 'utf8');
  });
}

function within(root, file) {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function cleanSource(value) {
  let file = String(value || '').trim();
  if (!file || file.length > 8192 || /[\0\r\n]/.test(file)) throw new Error('源码路径无效');
  try {
    if (/^https?:\/\//.test(file)) file = new URL(file).pathname;
    else if (file.startsWith('file://')) file = new URL(file).pathname;
    else if (/^webpack(?:-internal)?:\/\//.test(file)) file = file.replace(/^webpack(?:-internal)?:\/\/[^/]*\//, '');
    file = decodeURIComponent(file.split('?')[0].split('#')[0]);
  } catch (_) { throw new Error('源码路径编码无效'); }
  return file.replace(/^\/@fs\//, '/').replace(/^\[project\]\//, '').replace(/^\.\//, '');
}

async function existingFile(file) {
  try { return (await fs.stat(file)).isFile() ? await fs.realpath(file) : ''; } catch (_) { return ''; }
}

async function resolveProjectFile(root, source) {
  const clean = cleanSource(source);
  const candidates = path.isAbsolute(clean) ? [clean, path.join(root, clean.replace(/^\/+/, ''))] : [path.resolve(root, clean)];
  for (const candidate of candidates) {
    const real = await existingFile(candidate);
    if (real && within(root, real)) return real;
  }
  throw new Error('当前项目中未找到对应源码文件');
}

function commandTokens(command) {
  return (command.match(/"(?:[^"\\]|\\.)*"|'[^']*'|[^\s]+/g) || []).map((token) => token.replace(/^(['"])(.*)\1$/, '$2'));
}

function rootFromCommand(command, cwd) {
  const tokens = commandTokens(command);
  for (let i = 0; i < tokens.length; i++) {
    if (/^--(?:root|context)=/.test(tokens[i])) return path.resolve(cwd, tokens[i].slice(tokens[i].indexOf('=') + 1));
    if (['--root', '--context'].includes(tokens[i]) && tokens[i + 1]) return path.resolve(cwd, tokens[i + 1]);
    if (/(?:^|\/)(?:vite|vite\.js)$/.test(tokens[i]) && tokens[i + 1] && !tokens[i + 1].startsWith('-') && !['dev', 'serve', 'build', 'preview'].includes(tokens[i + 1])) return path.resolve(cwd, tokens[i + 1]);
    if (/(?:^|\/)next$/.test(tokens[i]) && ['dev', 'start'].includes(tokens[i + 1]) && tokens[i + 2] && !tokens[i + 2].startsWith('-')) return path.resolve(cwd, tokens[i + 2]);
  }
  return '';
}

async function childProjects(root) {
  // 统一启动脚本可能运行在普通父目录。查找有限层级的本地包，再由页面源码路径确认。
  const ignored = new Set(['node_modules', 'dist', 'dist-ts', 'build', 'coverage', 'vendor']);
  const queue = [{ directory: root, depth: 0 }];
  const projects = [];
  for (let index = 0; index < queue.length; index++) {
    const { directory, depth } = queue[index];
    if (depth && await existingFile(path.join(directory, 'package.json'))) { projects.push(directory); continue; }
    if (depth >= 4) continue;
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (_) { continue; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || ignored.has(entry.name)) continue;
      if (queue.length >= 256) throw new Error('当前目录下的子目录较多，请从前端子项目目录启动开发服务后重试');
      queue.push({ directory: path.join(directory, entry.name), depth: depth + 1 });
    }
  }
  return projects;
}

function createHost({ installation = installationPaths(), dataDir = installation.dataDir, run = runFile, copyText = copyTextToClipboard, platform = process.platform } = {}) {
  const configPath = path.join(dataDir, 'settings.json');
  const instanceId = crypto.randomUUID();
  let removed = false;
  let revision;
  const runtimeRevision = () => revision ||= runtimeBundle(__dirname).then((bundle) => bundle.revision);
  async function readConfig() {
    try { return JSON.parse(await fs.readFile(configPath, 'utf8')); } catch (error) {
      if (error.code === 'ENOENT') return { editor: null, projects: {} };
      throw new Error('本机设置读取失败，请重新安装辅助程序');
    }
  }
  async function saveConfig(config) {
    await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });
    const temp = `${configPath}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(config, null, 2), { mode: 0o600 });
    await fs.rename(temp, configPath);
  }
  const execute = async (file, args, timeout = 8000) => (await run(file, args, { encoding: 'utf8', timeout, maxBuffer: 1024 * 1024 })).stdout.trim();

  async function editorAvailable(editor) {
    return !!editor?.path && editor.path.endsWith('.app') && !!(await fs.stat(editor.path).catch(() => null))?.isDirectory();
  }

  async function isTermRelayApp(editor) {
    let info;
    try {
      info = JSON.parse(await execute('/usr/bin/plutil', ['-convert', 'json', '-o', '-', path.join(editor.path, 'Contents', 'Info.plist')]));
      if (!info || typeof info !== 'object' || Array.isArray(info)) throw new Error();
    } catch (_) { throw new Error('所选应用的配置信息无法读取，请重新选择编辑器'); }
    const protocols = Array.isArray(info.CFBundleURLTypes) ? info.CFBundleURLTypes : [];
    const handlesFiles = protocols.some((entry) => entry && Array.isArray(entry.CFBundleURLSchemes) && entry.CFBundleURLSchemes.includes('web+termrelay'));
    if (!handlesFiles) {
      if (info.CrAppModeShortcutURL && (editor.name === 'TermRelay' || info.CFBundleDisplayName === 'TermRelay'))
        throw new Error('此 TermRelay 应用尚未登记文件定位入口，请打开最新版页面并通过 Chrome 重新安装应用后再选择');
      return false;
    }
    let appUrl;
    try { appUrl = new URL(info.CrAppModeShortcutURL); } catch (_) { throw new Error('TermRelay 应用的启动地址无效，请通过 Chrome 重新安装应用'); }
    if (appUrl.protocol !== 'http:' || appUrl.hostname !== '127.0.0.1' || appUrl.username || appUrl.password)
      throw new Error('请选择通过本机 TermRelay 页面安装的 Chrome 应用');
    return true;
  }

  async function status() {
    const config = await readConfig();
    return { version: 6, revision: await runtimeRevision(), instanceId, capabilities: ['uninstall', 'editor-file-picker', 'workspace-projects', 'project-search', 'auto-update'], platform, editor: config.editor || null, editorAvailable: await editorAvailable(config.editor) };
  }

  async function chooseEditor() {
    let selected;
    try {
      selected = await execute('/usr/bin/osascript', ['-e', EDITOR_PICKER_SCRIPT], 120000);
    } catch (error) {
      if (String(error.stderr || error.message).includes('-128')) return { cancelled: true, ...(await status()) };
      throw new Error('应用程序文件选择窗口打开失败，请重试');
    }
    const appPath = await fs.realpath(selected.replace(/\/$/, ''));
    if (!(await editorAvailable({ path: appPath }))) throw new Error('请选择有效的 macOS 应用程序（.app）');
    let bundleId;
    try { bundleId = await execute('/usr/bin/plutil', ['-extract', 'CFBundleIdentifier', 'raw', '-o', '-', path.join(appPath, 'Contents', 'Info.plist')]); }
    catch (_) { throw new Error('所选应用的配置信息不完整，请重新选择编辑器'); }
    const editor = { path: appPath, name: path.basename(appPath, '.app'), bundleId };
    const config = await readConfig();
    config.editor = editor;
    await saveConfig(config);
    return { editor, editorAvailable: true };
  }

  async function localOrigin(value) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('开发地址无效');
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = await dns.lookup(hostname, { all: true });
    const local = new Set(['127.0.0.1', '::1', ...Object.values(os.networkInterfaces()).flat().filter(Boolean).map((entry) => entry.address)]);
    if (!addresses.length || !addresses.every((item) => local.has(item.address) || item.address.startsWith('127.'))) throw new Error('该开发服务运行在其他电脑上，请使用本机启动的项目');
    return url;
  }

  async function serverProcesses(origin) {
    const url = await localOrigin(origin);
    const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
    let owners;
    try { owners = await execute('/usr/sbin/lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fp']); }
    catch (_) { throw Object.assign(new Error(`未找到监听 ${port} 端口的本机开发服务`), { code: 'COMPONENT_SERVER_OFFLINE' }); }
    const pids = [...new Set(owners.split('\n').filter((line) => /^p\d+$/.test(line)).map((line) => line.slice(1)))];
    const processes = [];
    for (const pid of pids) {
      try {
        const uid = await execute('/bin/ps', ['-p', pid, '-o', 'uid=']);
        if (Number(uid) !== process.getuid()) continue;
        const output = await execute('/usr/sbin/lsof', ['-a', '-p', pid, '-d', 'cwd', '-Fn']);
        const cwd = output.split('\n').find((line) => line.startsWith('n'))?.slice(1);
        if (!cwd) continue;
        const [command, started] = await Promise.all([
          execute('/bin/ps', ['-p', pid, '-o', 'command=']),
          execute('/bin/ps', ['-p', pid, '-o', 'lstart=']),
        ]);
        processes.push({ pid: Number(pid), cwd: await fs.realpath(cwd), command, started });
      } catch (_) { /* 服务可能在检查期间重启。 */ }
    }
    if (!processes.length) throw Object.assign(new Error('开发服务的工作目录暂时无法读取，请确认服务正在运行'), { code: 'COMPONENT_SERVER_OFFLINE' });
    return processes;
  }

  async function identifyProject({ origin, hints = [] }) {
    const url = await localOrigin(origin);
    const processes = await serverProcesses(url.origin);
    const candidates = [];
    for (const service of processes) {
      const explicit = rootFromCommand(service.command, service.cwd);
      const roots = [explicit, service.cwd].filter(Boolean);
      // __file 或调试信息可以直接定位子项目。
      for (const hint of hints.slice(0, 32)) {
        let file;
        try { file = cleanSource(hint); } catch (_) { continue; }
        if (!path.isAbsolute(file) || !within(service.cwd, file) || !(await existingFile(file))) continue;
        let directory = path.dirname(file);
        for (let depth = 0; depth < 8 && within(service.cwd, directory); depth++, directory = path.dirname(directory)) {
          if (await existingFile(path.join(directory, 'package.json'))) { roots.push(directory); break; }
        }
      }
      const direct = [];
      const checked = new Set();
      async function addCandidate(directory, requireSource = false) {
        let root, pkg;
        try {
          root = await fs.realpath(directory);
          if (checked.has(root)) return;
          checked.add(root);
          pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
        } catch (_) { return; }
        const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
        const relevant = Object.keys(deps).some((name) => /^(react|react-dom|vue|next|nuxt|@vue\/|@vitejs\/plugin-(react|vue))/.test(name));
        let matches = 0;
        for (const hint of hints.slice(0, 32)) {
          try { await resolveProjectFile(root, hint); matches++; } catch (_) {}
        }
        // 发现子包仅是候选；至少一条页面源码路径吻合后才可选中。
        if (requireSource && !matches) return;
        if (!relevant && !matches) return;
        direct.push({ root, service, matches, score: (root === explicit ? 100 : 0) + matches * 10 + (relevant ? 1 : 0), name: pkg.name || path.basename(root) });
      }
      for (const directory of new Set(roots)) await addCandidate(directory);
      // 已有明确启动目录或源码匹配时直接使用；其余情况搜索父目录下的项目，无需工作区声明。
      if (hints.length && !direct.some((item) => item.root === explicit || item.matches > 0)) {
        for (const directory of await childProjects(service.cwd)) await addCandidate(directory, true);
      }
      candidates.push(...direct);
    }
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (!best) throw new Error('已找到服务进程，但尚未识别到 React／Vue 项目目录');
    if (candidates.some((item) => item.score === best.score && item.root !== best.root)) throw new Error('找到多个可能的项目目录，当前页面已暂停，请检查开发服务的启动目录');
    const project = { origin: url.origin, root: best.root, name: best.name, pid: best.service.pid, started: best.service.started };
    project.id = crypto.createHash('sha256').update(JSON.stringify(project)).digest('hex').slice(0, 24);
    const config = await readConfig();
    config.projects ||= {};
    config.projects[url.origin] = project;
    // 限制本机记录，只保存最近使用的开发地址。
    const entries = Object.entries(config.projects);
    config.projects = Object.fromEntries(entries.slice(-50));
    await saveConfig(config);
    return { project };
  }

  async function validateProject(origin, projectId) {
    const config = await readConfig();
    const project = config.projects?.[origin];
    if (!project || project.id !== projectId) throw Object.assign(new Error('项目目录已变化，正在重新识别'), { code: 'COMPONENT_PROJECT_STALE' });
    const services = await serverProcesses(origin);
    if (!services.some((service) => service.pid === project.pid && service.started === project.started)) throw Object.assign(new Error('开发服务已重启，正在重新识别项目'), { code: 'COMPONENT_PROJECT_STALE' });
    return { config, project };
  }

  async function checkProject({ origin, projectId }) {
    const { project } = await validateProject(origin, projectId);
    return { project };
  }

  async function sourceLocation({ origin, projectId, source }) {
    const { project } = await validateProject(origin, projectId);
    const file = await resolveProjectFile(project.root, source?.file);
    const line = Number.isSafeInteger(source?.line) && source.line > 0 ? source.line : null;
    const endLine = line && Number.isSafeInteger(source?.endLine) && source.endLine > line ? source.endLine : null;
    const location = `${file}${line ? `#L${line}${endLine ? `-L${endLine}` : ''}` : ''}`;
    return { project, file, line, endLine, location, precision: line ? 'line' : 'file' };
  }

  async function copySource(message) {
    const { project, ...result } = await sourceLocation(message);
    const { location } = result;
    // 快捷复制沿用末尾空格；任务浮框复制其展示的完整地址。
    const text = message.trailingSpace === false ? location : `${location} `;
    await copyText(text);
    return { ...result, text };
  }

  async function chatgptSource(message) {
    const text = message.text;
    if (typeof text !== 'string' || !text.trim() || text.length > 10000 || text.includes('\0'))
      throw new Error('请输入 1 至 10000 字的内容');
    const { project, ...source } = await sourceLocation(message);
    let workspace = project.root;
    // 普通文件夹可以直接使用；Git 子项目和 worktree 使用各自的仓库根目录。
    let directory = project.root;
    while (true) {
      if (await fs.lstat(path.join(directory, '.git')).catch(() => null)) {
        try { workspace = await fs.realpath(await execute('/usr/bin/git', ['-C', project.root, 'rev-parse', '--show-toplevel'], 4000)); }
        catch (_) { throw new Error('读取 Git 仓库目录失败，请检查本机 Git 和项目目录'); }
        if (!within(workspace, source.file)) throw new Error('组件源码与 Git 仓库目录不匹配');
        break;
      }
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
    const prompt = `${text}\n\n组件源码\n${source.location}`;
    const url = new URL('codex://threads/new');
    url.searchParams.set('mode', 'codex');
    url.searchParams.set('path', workspace);
    url.searchParams.set('prompt', prompt);
    if (Buffer.byteLength(url.href) > 120000) throw new Error('内容和源码路径过长，请缩短内容后重试');
    try { await execute('/usr/bin/open', ['-b', 'com.openai.codex', url.href]); }
    catch (error) {
      if (error.killed) throw Object.assign(new Error('打开 ChatGPT 超时，请先在桌面端检查草稿'), { code: 'CHATGPT_OPEN_UNCERTAIN' });
      throw new Error('ChatGPT 桌面端打开失败，请确认已安装支持 Codex 的 ChatGPT 桌面端');
    }
    // 链接一旦交给桌面端，后续失败均返回草稿状态，避免重试再次打开聊天。
    let sending = { sendStatus: 'draft', reason: 'automation' };
    if (message.autoSend === false) sending = { sendStatus: 'draft', reason: 'disabled' };
    else try {
      const result = JSON.parse(await execute('/usr/bin/osascript', ['-l', 'JavaScript', '-e', CHATGPT_AUTOMATION_SCRIPT, JSON.stringify({ prompt })], 15000));
      if (['draft', 'pressed'].includes(result.sendStatus)) {
        sending.sendStatus = result.sendStatus;
        if (['', 'disabled', 'accessibility', 'focus', 'window', 'page', 'draft', 'button', 'changed', 'press', 'automation'].includes(result.reason)) sending.reason = result.reason;
        if (['application', 'accessibility', 'window', 'page', 'draft', 'button', 'verify', 'press'].includes(result.stage)) sending.stage = result.stage;
        if (['Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError'].includes(result.errorName)) sending.errorName = result.errorName;
        if (['waiting', 'matched', 'lost', 'changed'].includes(result.focusState)) sending.focusState = result.focusState;
        if (Number.isSafeInteger(result.targetPid) && result.targetPid >= 0) sending.targetPid = result.targetPid;
        if (Number.isSafeInteger(result.elapsedMs) && result.elapsedMs >= 0) sending.elapsedMs = result.elapsedMs;
        if (result.controls && typeof result.controls === 'object') {
          sending.controls = {};
          for (const key of ['webAreaCount', 'pageMatchCount', 'textAreaCount', 'draftMatchCount', 'sendButtonCount']) {
            if (Number.isSafeInteger(result.controls[key]) && result.controls[key] >= 0) sending.controls[key] = result.controls[key];
          }
          if (typeof result.controls.treeLimited === 'boolean') sending.controls.treeLimited = result.controls.treeLimited;
          if (Array.isArray(result.controls.pageKinds)) sending.controls.pageKinds = result.controls.pageKinds.filter(kind => ['document', 'route', 'other', 'missing'].includes(kind)).slice(0, 8);
        }
      }
    } catch (error) {
      sending.reason = error.killed ? 'timeout' : 'automation';
    }
    // 只保留最近一次的状态，供排查使用；原文、源码地址和命令输出均不写入。
    await fs.writeFile(path.join(dataDir, 'last-agent-send.json'), JSON.stringify({ at: new Date().toISOString(), revision: await runtimeRevision(), editor: 'chatgpt', autoSend: message.autoSend !== false, ...sending }), { mode: 0o600 }).catch(() => {});
    return { ...source, workspace, opened: true, ...sending };
  }

  async function openSource({ origin, projectId, source }) {
    const { config, project } = await validateProject(origin, projectId);
    if (!(await editorAvailable(config.editor))) throw new Error('请先选择有效的编辑器');
    const file = await resolveProjectFile(project.root, source?.file);
    const line = Number.isSafeInteger(source?.line) && source.line > 0 ? source.line : null;
    const column = line && Number.isSafeInteger(source?.column) && source.column > 0 ? source.column : null;
    const editor = config.editor;
    const vscode = /^com\.microsoft\.VSCode(Insiders)?$/.exec(editor.bundleId) || /^Visual Studio Code( - Insiders)?$/.exec(editor.name);
    const cursor = editor.bundleId === 'com.todesktop.230313mzl4w4u92' || editor.name === 'Cursor';
    let precise = false;
    if (vscode) {
      // 交给 macOS 向所选应用发送打开链接事件，沿用正在运行的 VS Code。
      const protocol = vscode[1] ? 'vscode-insiders' : 'vscode';
      const location = pathToFileURL(file).pathname + (line ? `:${line}${column ? `:${column}` : ''}` : '');
      await execute('/usr/bin/open', ['-a', editor.path, `${protocol}://file${location}`]);
      precise = !!line;
    } else if (cursor) {
      const bin = path.join(editor.path, 'Contents', 'Resources', 'app', 'bin');
      let cli;
      for (const name of ['cursor', 'code-insiders', 'code']) {
        if (await existingFile(path.join(bin, name))) { cli = path.join(bin, name); break; }
      }
      if (!cli) throw new Error('所选编辑器的启动程序缺失，请重新选择编辑器');
      await execute(cli, line ? ['--reuse-window', '--goto', `${file}:${line}${column ? `:${column}` : ''}`] : ['--reuse-window', file], 15000);
      precise = !!line;
    } else if (await isTermRelayApp(editor)) {
      if (file.length > 4096 || (line && line > 2147483647) || (column && column > 2147483647))
        throw new Error('文件路径或行列位置超出 TermRelay 支持范围');
      const url = new URL('web+termrelay://open');
      url.searchParams.set('file', file);
      if (line) url.searchParams.set('line', String(line));
      if (column) url.searchParams.set('column', String(column));
      await execute('/usr/bin/open', ['-a', editor.path, url.href]);
      precise = !!line;
    } else {
      await execute('/usr/bin/open', ['-a', editor.path, file]);
    }
    return { file, line: precise ? line : null, column: precise ? column : null, precision: precise ? 'line' : 'file', editor: editor.name };
  }

  async function handle(message) {
    if (platform !== 'darwin') throw new Error('本机辅助程序当前支持 macOS');
    if (removed) throw new Error('本机辅助程序已卸载');
    switch (message.action) {
      case 'status': return status();
      case 'update': return updateRuntime(installation, message.bundle, { expectedRevision: await runtimeRevision() });
      case 'uninstall': {
        const result = await uninstall(installation);
        removed = true;
        return result;
      }
      case 'chooseEditor': return chooseEditor();
      case 'clearEditor': {
        const config = await readConfig(); config.editor = null; await saveConfig(config); return { editor: null, editorAvailable: false };
      }
      case 'identifyProject': return identifyProject(message);
      case 'checkProject': return checkProject(message);
      case 'openSource': return openSource(message);
      case 'sourceLocation': {
        const { project, ...result } = await sourceLocation(message);
        return result;
      }
      case 'copySource': return copySource(message);
      case 'agentSource':
        if (message.taskEditor !== 'chatgpt') throw new Error('请选择受支持的编辑器');
        return chatgptSource(message);
      case 'agentAccess':
        if (message.taskEditor !== 'chatgpt') throw new Error('请选择受支持的编辑器');
        return JSON.parse(await execute('/usr/bin/osascript', ['-l', 'JavaScript', '-e', CHATGPT_AUTOMATION_SCRIPT, JSON.stringify({ mode: 'access' })]));
      case 'chatgptSource': return chatgptSource(message);
      case 'chatgptAccess': return JSON.parse(await execute('/usr/bin/osascript', ['-l', 'JavaScript', '-e', CHATGPT_AUTOMATION_SCRIPT, JSON.stringify({ mode: 'access' })]));
      default: throw new Error('未知的本机操作');
    }
  }
  return { handle, status, identifyProject, checkProject, openSource, copySource, readConfig, saveConfig };
}

module.exports = { HOST_NAME, EDITOR_PICKER_SCRIPT, CHATGPT_AUTOMATION_SCRIPT, createHost, cleanSource, resolveProjectFile, rootFromCommand, within };
