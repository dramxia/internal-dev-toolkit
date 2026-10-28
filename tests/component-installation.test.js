const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { createPackage, createTerminalCommand } = require('../src/popup/component-installer.js');
const { installationPaths, install } = require('../native-host/installation.cjs');
const { createHost } = require('../native-host/lib.cjs');
const run = promisify(execFile);
const repo = path.join(__dirname, '..');
async function runtimeDirectory(paths) {
  const current = JSON.parse(await fs.readFile(path.join(paths.hostDir, 'current.json'), 'utf8'));
  return path.join(paths.hostDir, 'releases', current.revision);
}

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "idt 安装 'test-"));
  const extensionId = 'abcdefghijklmnopabcdefghijklmnop';
  try {
    await assert.rejects(() => createPackage('bad-id'), /编号/);
    await assert.rejects(() => createTerminalCommand('bad-id'), /编号/);
    if (process.platform === 'darwin') {
      const commandHome = path.join(root, 'terminal-test-user');
      const preload = path.join(root, 'isolated-user.cjs');
      // 只将测试子进程的用户目录指向临时位置，保持本机实际安装与设置原样。
      await fs.writeFile(preload, `require('node:os').homedir = () => ${JSON.stringify(commandHome)};`);
      const quote = (value) => "'" + value.replace(/'/g, "'\\''") + "'";
      const unrelated = path.join(root, '任意工作目录'); await fs.mkdir(unrelated);
      const paths = installationPaths(commandHome);
      for (const action of ['install', 'uninstall']) {
        const command = await createTerminalCommand(extensionId, action, (file) => fs.readFile(path.join(repo, file), 'utf8'));
        assert.ok(command.startsWith("node <<'IDT_COMPONENT_SETUP'\n"));
        assert.ok(Math.max(...command.split('\n').map((line) => Buffer.byteLength(line))) < 1024, '完整命令的每行应适合终端粘贴');
        assert.doesNotMatch(command, /spctl\s+--|xattr\s+-[a-z]*d/);
        const isolated = command.replace(/^node /, `${quote(process.execPath)} --require ${quote(preload)} `);
        const result = await run('/bin/zsh', ['-f', '-c', isolated], { cwd: unrelated, timeout: 15000 });
        assert.match(result.stdout, action === 'install' ? /已安装/ : /已卸载/);
        if (action === 'install') {
          const manifest = JSON.parse(await fs.readFile(paths.manifestPath, 'utf8'));
          assert.deepEqual(manifest.allowed_origins, [`chrome-extension://${extensionId}/`]);
          for (const file of ['host.cjs', 'lib.cjs', 'installation.cjs']) assert.equal(await fs.readFile(path.join(await runtimeDirectory(paths), file), 'utf8'), await fs.readFile(path.join(repo, 'native-host', file), 'utf8'));
          await fs.writeFile(path.join(paths.dataDir, 'settings.json'), JSON.stringify({ editor: { name: 'Cursor' } }));
        } else {
          await assert.rejects(fs.stat(paths.hostDir), { code: 'ENOENT' });
          await assert.rejects(fs.stat(paths.manifestPath), { code: 'ENOENT' });
          assert.equal(JSON.parse(await fs.readFile(path.join(paths.dataDir, 'settings.json'), 'utf8')).editor.name, 'Cursor');
        }
      }
    }
    for (const action of ['install', 'uninstall']) {
      const archive = await createPackage(extensionId, action, (file) => fs.readFile(path.join(repo, file), 'utf8'));
      const zip = path.join(root, `${action}.zip`), output = path.join(root, action);
      await fs.writeFile(zip, Buffer.from(await archive.arrayBuffer()));
      if (process.platform === 'darwin') await run('/usr/bin/ditto', ['-x', '-k', zip, output]);
      else await run('unzip', ['-q', zip, '-d', output]);
      const sourceRoot = path.join(output, 'component-helper');
      const launcher = path.join(sourceRoot, action === 'install' ? '安装.command' : '卸载.command');
      assert.equal((await fs.stat(launcher)).mode & 0o111, 0o111, '解压后的双击文件须保留执行权限');
      const command = await fs.readFile(launcher, 'utf8');
      assert.match(command, action === 'install' ? new RegExp(extensionId) : /--uninstall/);
      if (process.platform === 'darwin') await run('/bin/zsh', ['-n', launcher]);
      assert.equal(await fs.readFile(path.join(sourceRoot, 'native-host/lib.cjs'), 'utf8'), await fs.readFile(path.join(repo, 'native-host/lib.cjs'), 'utf8'));
      if (action === 'install') {
        const paths = installationPaths(path.join(root, 'temporary-user'));
        await install({ extensionId, sourceRoot, paths });
        const manifest = JSON.parse(await fs.readFile(paths.manifestPath, 'utf8'));
        assert.deepEqual(manifest.allowed_origins, [`chrome-extension://${extensionId}/`]);
        assert.equal(manifest.path, path.join(paths.hostDir, 'launch.sh'));
        await run('/bin/sh', ['-n', manifest.path]);
        assert.ok(await fs.stat(path.join(await runtimeDirectory(paths), 'installation.cjs')));
        const configFile = path.join(paths.dataDir, 'settings.json');
        await fs.writeFile(configFile, JSON.stringify({ editor: { name: 'Cursor' }, projects: {} }));
        const sentinel = path.join(paths.dataDir, 'unrelated.txt'); await fs.writeFile(sentinel, 'keep');
        const host = createHost({ installation: paths, platform: 'darwin' });
        assert.ok((await host.handle({ action: 'status' })).capabilities.includes('uninstall'));
        const result = await host.handle({ action: 'uninstall', path: root });
        assert.equal(result.uninstalled, true);
        await assert.rejects(fs.stat(paths.manifestPath), { code: 'ENOENT' });
        await assert.rejects(fs.stat(paths.hostDir), { code: 'ENOENT' });
        assert.equal((JSON.parse(await fs.readFile(configFile, 'utf8'))).editor.name, 'Cursor');
        assert.equal(await fs.readFile(sentinel, 'utf8'), 'keep');
        await assert.rejects(() => host.handle({ action: 'status' }), /已卸载/);
        await install({ extensionId, sourceRoot, paths });
        assert.equal((await createHost({ installation: paths }).status()).editor.name, 'Cursor', '重装应保留编辑器选择');
      }
    }
    console.log('component installation tests passed (complete terminal commands from an unrelated directory, ZIP, isolated install/uninstall/reinstall)');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
