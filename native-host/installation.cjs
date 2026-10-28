'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const HOST_NAME = 'com.internal_dev_toolkit.component_inspector';
const RUNTIME_FILES = ['host.cjs', 'lib.cjs', 'installation.cjs'];
const MAX_BUNDLE_BYTES = 512 * 1024;

function validateBundle(bundle) {
  const files = bundle?.files;
  if (!files || Object.keys(files).length !== RUNTIME_FILES.length || RUNTIME_FILES.some((file) => typeof files[file] !== 'string')) throw new Error('辅助程序更新文件不完整');
  const contents = JSON.stringify(RUNTIME_FILES.map((file) => [file, files[file]]));
  if (Buffer.byteLength(contents) > MAX_BUNDLE_BYTES) throw new Error('辅助程序更新文件过大');
  const revision = crypto.createHash('sha256').update(contents).digest('hex');
  if (bundle.revision && bundle.revision !== revision) throw new Error('辅助程序更新文件校验失败');
  return { revision, files };
}

async function runtimeBundle(directory) {
  const files = Object.fromEntries(await Promise.all(RUNTIME_FILES.map(async (file) => [file, await fs.readFile(path.join(directory, file), 'utf8')])));
  return validateBundle({ files });
}

async function atomicWrite(file, text, mode = 0o600) {
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, text, { mode });
    await fs.rename(temporary, file);
  } finally { await fs.rm(temporary, { force: true }); }
}

async function currentRuntime(paths) {
  try {
    const current = JSON.parse(await fs.readFile(path.join(paths.hostDir, 'current.json'), 'utf8'));
    if (!/^[a-f0-9]{64}$/.test(current.revision)) throw new Error('辅助程序版本记录无效');
    return current;
  } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function checkRuntime(directory, paths, revision, nodePath) {
  // 用真实原生通信检查新程序，检查进程仅发送 status，沿用现有设置。
  return new Promise((resolve, reject) => {
    const script = 'globalThis.__IDT_COMPONENT_PATHS = JSON.parse(process.argv[1]); require(process.argv[2]);';
    const child = spawn(nodePath, ['-e', script, JSON.stringify(paths), path.join(directory, 'host.cjs')], { stdio: ['pipe', 'pipe', 'ignore'] });
    let output = Buffer.alloc(0), finished = false;
    const finish = (error) => {
      if (finished) return;
      finished = true; clearTimeout(timer);
      if (error) { child.kill(); reject(error); } else resolve();
    };
    const timer = setTimeout(() => finish(new Error('新版辅助程序启动检查超时，原版本已保留')), 8000);
    child.on('error', () => finish(new Error('新版辅助程序启动检查失败，原版本已保留')));
    child.stdin.on('error', () => {});
    child.stdout.on('data', (chunk) => {
      output = Buffer.concat([output, chunk]);
      if (output.length > 1024 * 1024) finish(new Error('新版辅助程序响应过大，原版本已保留'));
    });
    child.on('close', (code) => {
      try {
        if (code !== 0 || output.length < 4 || output.readUInt32LE(0) !== output.length - 4) throw new Error();
        const status = JSON.parse(output.subarray(4).toString('utf8'));
        if (!status.ok || status.revision !== revision || !status.capabilities?.includes('auto-update')) throw new Error();
        finish();
      } catch (_) { finish(new Error('新版辅助程序启动检查失败，原版本已保留')); }
    });
    const body = Buffer.from(JSON.stringify({ id: 1, action: 'status' }));
    const header = Buffer.alloc(4); header.writeUInt32LE(body.length);
    child.stdin.end(Buffer.concat([header, body]));
  });
}

async function updateRuntime(paths, input, { nodePath = process.execPath, expectedRevision } = {}) {
  const bundle = validateBundle(input);
  const previous = await currentRuntime(paths);
  if (expectedRevision && previous?.revision !== expectedRevision && previous?.revision !== bundle.revision) throw new Error('辅助程序版本已变化，请重新检查连接');
  const releases = path.join(paths.hostDir, 'releases');
  const destination = path.join(releases, bundle.revision);
  if (previous?.revision === bundle.revision && (await runtimeBundle(destination).catch(() => null))?.revision === bundle.revision) return { updated: false, revision: bundle.revision };
  await fs.mkdir(releases, { recursive: true, mode: 0o700 });
  const staging = await fs.mkdtemp(path.join(releases, '.incoming-'));
  try {
    for (const file of RUNTIME_FILES) await fs.writeFile(path.join(staging, file), bundle.files[file], { mode: 0o600 });
    await checkRuntime(staging, paths, bundle.revision, nodePath);
    try { await fs.rename(staging, destination); }
    catch (error) {
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
      if ((await runtimeBundle(destination).catch(() => null))?.revision !== bundle.revision) {
        const damaged = path.join(releases, `.damaged-${crypto.randomUUID()}`);
        await fs.rename(destination, damaged);
        try { await fs.rename(staging, destination); }
        catch (replaceError) { await fs.rename(damaged, destination); throw replaceError; }
        await fs.rm(damaged, { recursive: true, force: true });
      }
    }
    const latest = await currentRuntime(paths);
    if (latest?.revision !== previous?.revision && latest?.revision !== bundle.revision) throw new Error('辅助程序版本已变化，请重新检查连接');
    const previousRevision = previous?.revision === bundle.revision ? previous.previous : previous?.revision;
    await atomicWrite(path.join(paths.hostDir, 'current.json'), JSON.stringify({ revision: bundle.revision, previous: previousRevision || null }));
    // 保留当前与上一版，清理更早的完整版本；设置位于 hostDir 外。
    const keep = new Set([bundle.revision, previousRevision]);
    for (const name of await fs.readdir(releases).catch(() => [])) {
      if (/^[a-f0-9]{64}$/.test(name) && !keep.has(name)) await fs.rm(path.join(releases, name), { recursive: true, force: true }).catch(() => {});
    }
    return { updated: true, revision: bundle.revision };
  } finally { await fs.rm(staging, { recursive: true, force: true }); }
}

function installationPaths(homeDirectory = os.homedir()) {
  const dataDir = path.join(homeDirectory, 'Library', 'Application Support', 'InternalDevToolkit');
  return {
    dataDir,
    hostDir: path.join(dataDir, 'component-host'),
    manifestPath: path.join(homeDirectory, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts', `${HOST_NAME}.json`),
  };
}

async function install({ extensionId, sourceRoot, paths = installationPaths(), nodePath = process.execPath }) {
  if (!/^[a-p]{32}$/.test(extensionId || '')) throw new Error('扩展编号无效，请从工具箱重新复制安装命令');
  await fs.mkdir(paths.hostDir, { recursive: true, mode: 0o700 });
  await fs.mkdir(path.dirname(paths.manifestPath), { recursive: true });
  await updateRuntime(paths, await runtimeBundle(path.join(sourceRoot, 'native-host')), { nodePath });
  const loader = `'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
globalThis.__IDT_COMPONENT_PATHS = ${JSON.stringify(paths)};
const current = JSON.parse(fs.readFileSync(path.join(__dirname, 'current.json'), 'utf8'));
function load(revision) {
  if (!/^[a-f0-9]{64}$/.test(revision || '')) throw new Error('Invalid helper revision');
  const directory = path.join(__dirname, 'releases', revision);
  const files = ${JSON.stringify(RUNTIME_FILES)}.map(file => [file, fs.readFileSync(path.join(directory, file), 'utf8')]);
  if (crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex') !== revision) throw new Error('Helper integrity check failed');
  require(path.join(directory, 'host.cjs'));
}
try { load(current.revision); }
catch (error) { if (!current.previous) throw error; load(current.previous); }
`;
  await atomicWrite(path.join(paths.hostDir, 'loader.cjs'), loader);
  const quote = (value) => "'" + value.replace(/'/g, "'\\''") + "'";
  const launcher = path.join(paths.hostDir, 'launch.sh');
  await atomicWrite(launcher, `#!/bin/sh\nexec ${quote(nodePath)} ${quote(path.join(paths.hostDir, 'loader.cjs'))}\n`, 0o700);
  await atomicWrite(paths.manifestPath, JSON.stringify({ name: HOST_NAME, description: '内部开发工具箱：组件定位', path: launcher, type: 'stdio', allowed_origins: [`chrome-extension://${extensionId}/`] }, null, 2));
  for (const file of RUNTIME_FILES) await fs.rm(path.join(paths.hostDir, file), { force: true });
}

async function uninstall(paths = installationPaths()) {
  // 路径由本机程序确定，消息中传来的路径不参与卸载。
  await fs.rm(paths.manifestPath, { force: true });
  await fs.rm(paths.hostDir, { force: true, recursive: true });
  return { uninstalled: true, settingsPreserved: true };
}

module.exports = { HOST_NAME, installationPaths, install, uninstall, runtimeBundle, updateRuntime };
