'use strict';
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { createHost } = require('../native-host/lib.cjs');
const roots = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

async function fixture(factory = createHost, options = {}) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'idt-copy-')));
  roots.push(root);
  const file = path.join(root, 'src', '中文 %20+#?: Button.tsx');
  await fs.mkdir(path.dirname(file)); await fs.writeFile(file, 'export {};');
  const copied = [], commands = [];
  const origin = 'http://127.0.0.1:5173';
  const host = factory({ dataDir: path.join(root, 'state'), platform: 'darwin', copyText: async (text) => { copied.push(text); },
    run: async (command, args) => {
      commands.push(command);
      if (command === '/usr/sbin/lsof' && args.some((arg) => arg.startsWith('-iTCP:'))) return { stdout: 'p123' };
      if (command === '/usr/sbin/lsof') return { stdout: `p123\nn${root}` };
      if (command === '/bin/ps') return { stdout: args.at(-1) === 'uid=' ? String(process.getuid()) : args.at(-1) === 'lstart=' ? 'started' : 'node dev.js' };
      throw new Error(`Unexpected command: ${command}`);
    }, ...options });
  await host.saveConfig({ editor: null, projects: { [origin]: { id: 'project', root, pid: 123, started: 'started' } } });
  const copy = (source = {}, projectId = 'project') => host.handle({ action: 'copySource', origin, projectId, source: { file: pathToFileURL(file).href, ...source } });
  return { root, file, host, copy, copied, commands };
}

test('copies the absolute path with single-line, range and file-only formats without an editor', async () => {
  const f = await fixture();
  for (const [source, suffix] of [[{ line: 10, column: 4 }, '#L10'], [{ line: 10, endLine: 29 }, '#L10-L29'], [{ line: 10, endLine: 10 }, '#L10'], [{ line: 10, endLine: 9 }, '#L10'], [{ line: -1, endLine: 29 }, ''], [{}, '']]) {
    const result = await f.copy(source);
    assert.equal(result.location, f.file + suffix);
    assert.equal(f.copied.at(-1), `${f.file}${suffix} `);
  }
  assert.equal(f.commands.includes('/usr/bin/open'), false);
  assert.equal((await f.host.readConfig()).editor, null);
});

test('resolves development paths and rejects stale projects, missing files and files outside the project', async () => {
  const f = await fixture();
  await fs.writeFile(path.join(f.root, 'src', 'App.tsx'), 'export {};');
  assert.equal((await f.copy({ file: 'webpack://app/./src/App.tsx', line: 1 })).location, `${f.root}/src/App.tsx#L1`);
  await assert.rejects(() => f.copy({}, 'old-project'), (error) => error.code === 'COMPONENT_PROJECT_STALE');
  await assert.rejects(() => f.copy({ file: '/src/missing.tsx' }), /未找到/);
  await fs.symlink('/etc/hosts', path.join(f.root, 'src', 'outside'));
  await assert.rejects(() => f.copy({ file: 'src/outside' }), /未找到/);
  assert.equal(f.copied.length, 1);
});

test('reports clipboard errors without falling back to opening an editor', async () => {
  const f = await fixture(createHost, { copyText: async () => { throw new Error('clipboard unavailable'); } });
  await assert.rejects(() => f.copy({ line: 10 }), /clipboard unavailable/);
  assert.equal(f.commands.includes('/usr/bin/open'), false);
});

test('writes UTF-8 text to pbcopy through stdin and waits for its result', async () => {
  const filename = path.join(__dirname, '../native-host/lib.cjs');
  const localRequire = createRequire(filename), writes = [];
  let fail = false;
  const context = vm.createContext({ process, Buffer, URL, __dirname: path.dirname(filename), module: { exports: {} }, require(name) {
    if (name !== 'node:child_process') return localRequire(name);
    return { execFile(command, args, options, callback) {
      assert.equal(command, '/usr/bin/pbcopy'); assert.equal(args.length, 0);
      assert.equal(options.env.LC_CTYPE, 'UTF-8'); assert.equal(options.timeout, 8000);
      return { stdin: { on() {}, end(text, encoding) {
        assert.equal(encoding, 'utf8'); writes.push(text);
        queueMicrotask(() => callback(fail ? new Error('pbcopy failed') : null));
      } } };
    } };
  } });
  vm.runInContext(await fs.readFile(filename, 'utf8'), context);
  const f = await fixture(context.module.exports.createHost, { copyText: undefined });
  await f.copy({ line: 10, endLine: 29 });
  assert.deepEqual(writes, [`${f.file}#L10-L29 `]);
  fail = true;
  await assert.rejects(() => f.copy(), /复制失败/);
});
