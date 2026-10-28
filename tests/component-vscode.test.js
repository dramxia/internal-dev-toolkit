'use strict';
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { createHost } = require('../native-host/lib.cjs');

const roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

async function fixture({ name = 'Visual Studio Code', bundleId = 'com.microsoft.VSCode', failOpen = false } = {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'idt-vscode-')));
  roots.push(root);
  const app = path.join(root, "Editor's Apps", `${name}.app`);
  await fs.mkdir(app, { recursive: true });
  const file = path.join(root, '中文 %20+#?:Button.tsx');
  await fs.writeFile(file, 'export const Button = () => null;');
  const launches = [];
  const host = createHost({ dataDir: path.join(root, 'state'), platform: 'darwin', run: async (command, args) => {
    if (command === '/usr/bin/open') {
      launches.push({ command, args });
      if (failOpen) throw new Error('编辑器打开失败');
      return { stdout: '' };
    }
    if (command === '/usr/sbin/lsof' && args.some((arg) => arg.startsWith('-iTCP:'))) return { stdout: 'p123' };
    if (command === '/usr/sbin/lsof') return { stdout: `p123\nn${root}` };
    if (command === '/bin/ps') return { stdout: args.at(-1) === 'uid=' ? String(process.getuid()) : args.at(-1) === 'lstart=' ? 'started' : 'node dev.js' };
    throw new Error(`Unexpected command: ${command}`);
  } });
  const origin = 'http://127.0.0.1:5173';
  await host.saveConfig({ editor: { path: app, name, bundleId }, projects: { [origin]: { id: 'project', pid: 123, started: 'started', root } } });
  const open = (source = {}) => host.openSource({ origin, projectId: 'project', source: { file: pathToFileURL(file).href, ...source } });
  return { open, file, app, launches, host };
}

test('sends a file link to the selected VS Code app with exact path and line/column', async () => {
  const { open, file, app, launches } = await fixture();
  const result = await open({ line: 17, column: 9 });
  assert.equal(result.file, file);
  assert.equal(result.precision, 'line');
  assert.equal(result.line, 17);
  assert.equal(result.column, 9);
  assert.equal(launches.length, 1);
  assert.equal(launches[0].command, '/usr/bin/open');
  assert.deepEqual(launches[0].args.slice(0, 2), ['-a', app]);
  const url = new URL(launches[0].args[2]);
  assert.equal(url.protocol, 'vscode:');
  assert.equal(url.host, 'file');
  assert.equal(decodeURIComponent(url.pathname), `${file}:17:9`, '中文、空格、百分号、加号、井号和问号应完整保留');
  assert.equal(url.search, '');
  assert.equal(url.hash, '');
});

test('targets a renamed VS Code app and uses the correct protocol for Insiders', async () => {
  for (const [bundleId, protocol] of [['com.microsoft.VSCode', 'vscode:'], ['com.microsoft.VSCodeInsiders', 'vscode-insiders:']]) {
    const { open, file, app, launches } = await fixture({ name: 'My Editor', bundleId });
    await open({ line: 7 });
    assert.deepEqual(launches[0].args.slice(0, 2), ['-a', app]);
    const url = new URL(launches[0].args[2]);
    assert.equal(url.protocol, protocol);
    assert.equal(decodeURIComponent(url.pathname), `${file}:7`);
  }
});

test('opens file-only locations without claiming line precision', async () => {
  const { open, file, launches } = await fixture();
  const result = await open({ column: 9 });
  assert.equal(result.precision, 'file');
  assert.equal(result.line, null);
  assert.equal(result.column, null);
  assert.equal(decodeURIComponent(new URL(launches[0].args[2]).pathname), file);
});

test('reports an open failure and leaves the selected editor intact', async () => {
  const { open, app, launches, host } = await fixture({ failOpen: true });
  await assert.rejects(() => open({ line: 7 }), /编辑器打开失败/);
  assert.equal(launches.length, 1, '系统打开失败后应直接提示，避免改用启动命令再次打开窗口');
  assert.equal((await host.readConfig()).editor.path, app);
});
