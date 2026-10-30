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

  async function copySource({ origin, projectId, source }) {
    const { project } = await validateProject(origin, projectId);
    const file = await resolveProjectFile(project.root, source?.file);
    const line = Number.isSafeInteger(source?.line) && source.line > 0 ? source.line : null;
    const endLine = line && Number.isSafeInteger(source?.endLine) && source.endLine > line ? source.endLine : null;
    const location = `${file}${line ? `#L${line}${endLine ? `-L${endLine}` : ''}` : ''}`;
    // 沿用 Copy Code Path 的末尾空格，路径和行号范围采用用户指定的格式。
    const text = `${location} `;
    await copyText(text);
    return { file, line, endLine, location, text, precision: line ? 'line' : 'file' };
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
      case 'copySource': return copySource(message);
      default: throw new Error('未知的本机操作');
    }
  }
  return { handle, status, identifyProject, checkProject, openSource, copySource, readConfig, saveConfig };
}

module.exports = { HOST_NAME, EDITOR_PICKER_SCRIPT, createHost, cleanSource, resolveProjectFile, rootFromCommand, within };
