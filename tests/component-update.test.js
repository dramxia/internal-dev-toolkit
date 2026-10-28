const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { install, installationPaths, runtimeBundle } = require('../native-host/installation.cjs');
const repo = path.join(__dirname, '..');

function nativeCall(launcher, message) {
  return new Promise((resolve, reject) => {
    const child = spawn(launcher, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = Buffer.alloc(0), errors = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('原生通信测试超时')); }, 15000);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.stdout.on('data', (chunk) => { output = Buffer.concat([output, chunk]); });
    child.stderr.on('data', (chunk) => { errors += chunk; });
    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        assert.equal(code, 0, errors);
        assert.equal(output.readUInt32LE(0), output.length - 4);
        resolve(JSON.parse(output.subarray(4).toString('utf8')));
      } catch (error) { reject(error); }
    });
    const body = Buffer.from(JSON.stringify({ id: 1, ...message }));
    const header = Buffer.alloc(4); header.writeUInt32LE(body.length);
    child.stdin.end(Buffer.concat([header, body]));
  });
}

function bundleWithFiles(files) {
  const entries = ['host.cjs', 'lib.cjs', 'installation.cjs'].map((file) => [file, files[file]]);
  return { files, revision: crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex') };
}

(async () => {
  if (process.platform !== 'darwin') { console.log('macOS helper update test skipped'); return; }
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'idt-component-update-'));
  try {
    const paths = installationPaths(path.join(temp, 'user'));
    const oldSource = path.join(temp, 'old-source');
    await fs.cp(path.join(repo, 'native-host'), path.join(oldSource, 'native-host'), { recursive: true });
    await fs.appendFile(path.join(oldSource, 'native-host', 'lib.cjs'), '\n// Old build with the same API version.\n');
    await install({ extensionId: 'abcdefghijklmnopabcdefghijklmnop', sourceRoot: oldSource, paths });
    const launcher = path.join(paths.hostDir, 'launch.sh');
    const currentFile = path.join(paths.hostDir, 'current.json');
    const before = JSON.parse(await fs.readFile(currentFile, 'utf8'));
    const settingsFile = path.join(paths.dataDir, 'settings.json');
    const settings = JSON.stringify({ editor: { name: 'Cursor' }, projects: { 'http://localhost:5173': { id: 'keep-project' } } });
    await fs.writeFile(settingsFile, settings);
    const oldStatus = await nativeCall(launcher, { action: 'status' });
    assert.equal(oldStatus.revision, before.revision);
    const bundle = await runtimeBundle(path.join(repo, 'native-host'));
    assert.notEqual(bundle.revision, oldStatus.revision, 'API 版本相同、源码内容变化时仍需更新');
    const badHash = await nativeCall(launcher, { action: 'update', bundle: { ...bundle, revision: '0'.repeat(64) } });
    assert.equal(badHash.ok, false);
    assert.match(badHash.error, /校验失败/);
    const extraPath = await nativeCall(launcher, { action: 'update', bundle: { ...bundle, files: { ...bundle.files, '../settings.json': 'overwrite' } } });
    assert.equal(extraPath.ok, false);
    const broken = bundleWithFiles({ ...bundle.files, 'lib.cjs': 'const = broken;' });
    const rejected = await nativeCall(launcher, { action: 'update', bundle: broken });
    assert.equal(rejected.ok, false);
    assert.match(rejected.error, /启动检查失败/);
    assert.equal(JSON.parse(await fs.readFile(currentFile, 'utf8')).revision, before.revision);
    assert.equal((await nativeCall(launcher, { action: 'status' })).revision, before.revision, '失败后旧版应继续启动');
    const updated = await nativeCall(launcher, { action: 'update', bundle });
    assert.equal(updated.ok, true); assert.equal(updated.updated, true);
    const status = await nativeCall(launcher, { action: 'status' });
    assert.equal(status.revision, bundle.revision);
    assert.equal(status.version, oldStatus.version);
    assert.equal(status.editor.name, 'Cursor');
    assert.equal(await fs.readFile(settingsFile, 'utf8'), settings, '更新应逐字保留编辑器与项目记录');
    assert.equal((await nativeCall(launcher, { action: 'update', bundle })).updated, false, '内容相同应跳过写入');
    const unfinished = path.join(paths.hostDir, 'releases', '.incoming-interrupted');
    await fs.mkdir(unfinished); await fs.writeFile(path.join(unfinished, 'lib.cjs'), 'incomplete');
    assert.equal((await nativeCall(launcher, { action: 'status' })).revision, bundle.revision, '未完成写入应保持当前完整版本');
    const liveLib = path.join(paths.hostDir, 'releases', bundle.revision, 'lib.cjs');
    await fs.appendFile(liveLib, '\ncorrupt');
    assert.equal((await nativeCall(launcher, { action: 'status' })).revision, before.revision, '文件损坏时启动器应使用保留的上一版');
    assert.equal((await nativeCall(launcher, { action: 'update', bundle })).ok, true);
    assert.equal((await nativeCall(launcher, { action: 'status' })).revision, bundle.revision, '重试应恢复当前版本');
    assert.equal(await fs.readFile(settingsFile, 'utf8'), settings);
    console.log('component automatic update tests passed (real native IPC, same-version changes, validation, atomic activation, fallback and settings preservation)');
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
