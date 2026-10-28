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

async function fixture({ name = 'TermRelay', registered = true, appUrl = 'http://127.0.0.1:4173/' } = {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'idt-termrelay-')));
  roots.push(root);
  const app = path.join(root, 'Chrome Apps', `${name}.app`);
  await fs.mkdir(path.join(app, 'Contents'), { recursive: true });
  const file = path.join(root, '中文 %20+#:Button.tsx');
  await fs.writeFile(file, 'export const Button = () => null;');
  const info = {
    CFBundleIdentifier: 'com.google.Chrome.app.example',
    CFBundleDisplayName: name,
    ...(appUrl ? { CrAppModeShortcutURL: appUrl } : {}),
    ...(registered ? { CFBundleURLTypes: [{ CFBundleURLSchemes: ['web+termrelay'] }] } : {}),
  };
  const launches = [];
  const host = createHost({ dataDir: path.join(root, 'state'), platform: 'darwin', run: async (command, args, options) => {
    assert.ok(options.timeout > 0);
    assert.ok(options.maxBuffer > 0);
    if (command === '/usr/bin/osascript') return { stdout: app };
    if (command === '/usr/bin/plutil') return { stdout: args[0] === '-extract' ? info.CFBundleIdentifier : JSON.stringify(info) };
    if (command === '/usr/bin/open') { launches.push(args); return { stdout: '' }; }
    if (command === '/usr/sbin/lsof' && args.some((arg) => arg.startsWith('-iTCP:'))) return { stdout: 'p123' };
    if (command === '/usr/sbin/lsof') return { stdout: `p123\nn${root}` };
    if (command === '/bin/ps') {
      const field = args.at(-1);
      return { stdout: field === 'uid=' ? String(process.getuid()) : field === 'lstart=' ? 'started' : 'node dev.js' };
    }
    throw new Error(`Unexpected command: ${command}`);
  } });
  const origin = 'http://127.0.0.1:5173';
  await host.saveConfig({ editor: null, projects: { [origin]: { id: 'project', pid: 123, started: 'started', root } } });
  const selected = await host.handle({ action: 'chooseEditor' });
  assert.equal(selected.editor.path, app);
  assert.equal(selected.editorAvailable, true);
  const open = (source) => host.openSource({ origin, projectId: 'project', source: { file: pathToFileURL(file).href, ...source } });
  return { open, file, app, info, launches };
}

test('selects a Chrome app through the existing picker and launches the exact app with encoded file and line/column', async () => {
  const { open, file, app, launches } = await fixture();
  const result = await open({ line: 17, column: 9 });
  assert.equal(result.precision, 'line');
  assert.equal(result.line, 17);
  assert.equal(result.column, 9);
  assert.deepEqual(launches, [['-a', app, `web+termrelay://open?${new URLSearchParams({ file, line: '17', column: '9' })}`]]);
  const url = new URL(launches[0][2]);
  assert.equal(url.searchParams.get('file'), file, 'literal %, +, #, spaces and Chinese must survive exactly');
});

test('recognizes a renamed Chrome app by its registered protocol and preserves file-only and line-only locations', async () => {
  const { open, launches } = await fixture({ name: 'My Workspace' });
  const fileOnly = await open({ column: 9 });
  assert.equal(fileOnly.precision, 'file');
  assert.equal(fileOnly.line, null);
  assert.equal(new URL(launches[0][2]).searchParams.has('column'), false);
  const lineOnly = await open({ line: 7 });
  assert.equal(lineOnly.line, 7);
  assert.equal(lineOnly.column, null);
  assert.equal(new URL(launches[1][2]).searchParams.get('line'), '7');
});

test('reports an old Chrome app that has not registered the file protocol', async () => {
  const { open, launches } = await fixture({ registered: false });
  await assert.rejects(() => open({ line: 7 }), /通过 Chrome 重新安装应用/);
  assert.deepEqual(launches, []);
});

test('checks the selected Chrome app startup address before sending local file paths', async () => {
  for (const appUrl of ['https://other.example/', 'http://127.0.0.1@other.example/', 'http://user@127.0.0.1:4173/', 'file:///private/file', 'invalid']) {
    const { open, launches } = await fixture({ appUrl });
    await assert.rejects(() => open({ line: 7 }), /TermRelay|本机/);
    assert.deepEqual(launches, []);
  }
});

test('retains the macOS file opening behavior for other selected apps', async () => {
  const { open, app, file, launches } = await fixture({ name: 'Text Editor', registered: false, appUrl: '' });
  const result = await open({ line: 17, column: 9 });
  assert.equal(result.precision, 'file');
  assert.deepEqual(launches, [['-a', app, file]]);
});

test('rejects unrepresentable line positions without launching the app', async () => {
  const { open, launches } = await fixture();
  await assert.rejects(() => open({ line: 2147483648 }), /支持范围/);
  assert.deepEqual(launches, []);
});
