'use strict';
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createHost, CHATGPT_AUTOMATION_SCRIPT } = require('../native-host/lib.cjs');
const roots = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

async function fixture() {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'idt-chat-')));
  roots.push(root);
  const project = path.join(root, 'apps', 'web');
  const file = path.join(project, 'src', '中文 App.tsx');
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, 'export {};');
  const state = { root, project, file, calls: [], failOpen: false, failAutomation: false, sendStatus: 'draft' };
  const origin = 'http://127.0.0.1:5173';
  const host = createHost({ dataDir: path.join(root, 'state'), platform: 'darwin', run: async (command, args) => {
    state.calls.push({ command, args });
    if (command === '/usr/sbin/lsof') return { stdout: args.some((arg) => arg.startsWith('-iTCP:')) ? 'p123' : `p123\nn${project}` };
    if (command === '/bin/ps') return { stdout: args.at(-1) === 'uid=' ? String(process.getuid()) : args.at(-1) === 'lstart=' ? 'started' : 'node dev.js' };
    if (command === '/usr/bin/git') return { stdout: root };
    if (command === '/usr/bin/open') {
      if (state.failOpen) throw new Error('missing app');
      return { stdout: '' };
    }
    if (command === '/usr/bin/osascript') {
      if (state.failAutomation) throw new Error('accessibility denied');
      if (state.automationError) throw state.automationError;
      return { stdout: JSON.stringify(state.automationResult || { sendStatus: state.sendStatus }) };
    }
    throw new Error(`Unexpected command ${command}`);
  } });
  await host.saveConfig({ editor: null, projects: { [origin]: { id: 'project', root: project, pid: 123, started: 'started' } } });
  state.host = host;
  state.send = (text = '修改按钮', source = {}, options = {}) => host.handle({ action: 'agentSource', taskEditor: 'chatgpt', autoSend: true, ...options, origin, projectId: 'project', source: { file: 'src/中文 App.tsx', line: 10, ...source }, text });
  return state;
}

test('opens a new desktop draft in the repository with intact Unicode, multiline text and source location', async () => {
  const f = await fixture();
  await fs.mkdir(path.join(f.root, '.git'));
  const text = '修改 "按钮" & 保留百分号 %\n`code` $(touch ignored) 😀';
  const result = await f.send(text, { endLine: 20 });
  const open = f.calls.find((call) => call.command === '/usr/bin/open');
  assert.deepEqual(open.args.slice(0, 2), ['-b', 'com.openai.codex']);
  const url = new URL(open.args[2]);
  assert.equal(url.href.startsWith('codex://threads/new?'), true);
  assert.equal(url.searchParams.get('mode'), 'codex');
  assert.equal(url.searchParams.get('path'), f.root);
  const prompt = `${text}\n\n组件源码\n${f.file}#L10-L20`;
  assert.equal(url.searchParams.get('prompt'), prompt);
  const automation = f.calls.find((call) => call.command === '/usr/bin/osascript');
  assert.equal(automation.args[3], CHATGPT_AUTOMATION_SCRIPT);
  assert.equal(JSON.parse(automation.args[4]).prompt, prompt);
  assert.equal(result.opened, true);
  assert.equal(result.sendStatus, 'draft');
});

test('ordinary folders use the detected project, and automation failure keeps the same desktop draft', async () => {
  const f = await fixture();
  f.failAutomation = true;
  const result = await f.send('描述', { line: null });
  assert.equal(result.workspace, f.project);
  assert.equal(result.location, f.file);
  assert.equal(result.sendStatus, 'draft');
  assert.equal(result.reason, 'automation');
  assert.equal(f.calls.filter((call) => call.command === '/usr/bin/open').length, 1);
});

test('keeps a readable failure reason and records only the latest diagnostic without prompt or paths', async () => {
  const f = await fixture();
  f.automationResult = { sendStatus: 'draft', reason: 'automation', stage: 'page', errorName: 'TypeError', focusState: 'matched', targetPid: 123, elapsedMs: 800, prompt: '隐私原文', stderr: f.file,
    controls: { webAreaCount: 1, pageMatchCount: 0, pageKinds: ['other', '隐私原文'], treeLimited: false, text: '隐私原文', file: f.file } };
  const result = await f.send('隐私原文');
  assert.equal(result.stage, 'page');
  const file = path.join(f.root, 'state', 'last-agent-send.json');
  const record = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.deepEqual(Object.keys(record).sort(), ['at', 'autoSend', 'controls', 'editor', 'elapsedMs', 'errorName', 'focusState', 'reason', 'revision', 'sendStatus', 'stage', 'targetPid']);
  assert.equal(record.errorName, 'TypeError');
  assert.equal(record.focusState, 'matched');
  assert.equal(record.targetPid, 123);
  assert.equal(record.elapsedMs, 800);
  assert.match(record.revision, /^[a-f0-9]{64}$/);
  assert.deepEqual(record.controls, { webAreaCount: 1, pageMatchCount: 0, treeLimited: false, pageKinds: ['other'] });
  assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  f.automationError = Object.assign(new Error('command contains private text'), { killed: true });
  assert.equal((await f.send()).reason, 'timeout');
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).reason, 'timeout');
  assert.equal((await f.send('只保留草稿', {}, { autoSend: false })).reason, 'disabled');
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).autoSend, false);
});

test('opening errors and invalid inputs report failures before automation', async () => {
  const f = await fixture();
  for (const text of ['', '  ', 'x'.repeat(10001), 'hello\0']) await assert.rejects(() => f.send(text), /请输入/);
  await assert.rejects(() => f.send('内容', { file: '/etc/hosts' }), /未找到/);
  assert.equal(f.calls.some((call) => call.command === '/usr/bin/open'), false);
  f.failOpen = true;
  await assert.rejects(() => f.send(), /打开失败/);
  assert.equal(f.calls.some((call) => call.command === '/usr/bin/osascript'), false);
});

test('disabled auto-send opens the draft without accessibility calls and preserves the file editor', async () => {
  const f = await fixture();
  const config = await f.host.readConfig();
  config.editor = { name: 'Cursor', path: '/Applications/Cursor.app', bundleId: 'com.todesktop.230313mzl4w4u92' };
  await f.host.saveConfig(config);
  const result = await f.send('只填写草稿', {}, { autoSend: false });
  assert.equal(result.reason, 'disabled');
  assert.equal(f.calls.filter((call) => call.command === '/usr/bin/open').length, 1);
  assert.equal(f.calls.some((call) => call.command === '/usr/bin/osascript'), false);
  assert.deepEqual((await f.host.readConfig()).editor, config.editor);
  await assert.rejects(() => f.send('内容', {}, { taskEditor: 'unsupported' }), /请选择受支持/);
  assert.equal(f.calls.filter((call) => call.command === '/usr/bin/open').length, 1);
});

function automate({ trusted = true, active = true, url = 'app://-/new', value = '本次草稿', labels = ['Send'], enabled = true,
  wrappers = 0, sidebarSize = 0, focusAvailable = true, activateAfterWait = false, throwOnEnable = false, changeBeforePress = false,
  cachedActive = active, backgroundInstanceFirst = false, flatGroup = false, loseFocusAtWait = 0, switchInstanceAtWait = 0 } = {}) {
  const button = (label) => ({ AXRole: 'AXButton', AXDescription: label, AXEnabled: enabled });
  const editor = { AXRole: 'AXTextArea', AXValue: value };
  let inputGroup = editor;
  for (let i = 0; i < wrappers; i++) {
    const parent = { AXRole: 'AXGroup', AXChildren: [inputGroup] };
    inputGroup.AXParent = parent; inputGroup = parent;
  }
  const group = { AXRole: 'AXGroup', AXChildren: [inputGroup, ...labels.map(button)] };
  inputGroup.AXParent = group;
  const web = { AXRole: 'AXWebArea', AXURL: { cfType: 'url', value: url }, AXChildren: [...(flatGroup ? group.AXChildren : [group]), ...Array.from({ length: sidebarSize }, () => ({ AXRole: 'AXGroup' }))] };
  group.AXParent = web;
  if (flatGroup) inputGroup.AXParent = web;
  const app = { active: cachedActive, bundleIdentifier: 'com.openai.codex', processIdentifier: 123, isNil() { return false; } };
  const backgroundApp = { ...app, active: false, processIdentifier: 456 };
  const otherApp = { ...app, bundleIdentifier: 'com.example.other-app', processIdentifier: 789 };
  let frontmost = active ? app : otherApp;
  const window = { AXRole: 'AXWindow', AXChildren: [web] };
  web.AXParent = window;
  const root = { AXFocusedWindow: window, AXFocusedUIElement: focusAvailable ? editor : null };
  let now = 0, clicks = 0, enables = 0, exposed = false, reads = 0, waits = 0;
  const bridge = Object.assign((value) => value, {
    AXIsProcessTrusted: () => trusted,
    CFEqual: (a, b) => a === b,
    CFGetTypeID: (value) => value?.cfType,
    CFURLGetTypeID: () => 'url',
    CFURLGetString: (url) => url.value,
    NSRunningApplication: { runningApplicationsWithBundleIdentifier: () => ({ firstObject: backgroundInstanceFirst ? backgroundApp : app }) },
    NSWorkspace: { sharedWorkspace: { get frontmostApplication() { return frontmost; } } },
    NSDate: { dateWithTimeIntervalSinceNow: (seconds) => seconds },
    NSRunLoop: { currentRunLoop: { runUntilDate() {
      now += 200; waits++;
      if (activateAfterWait) frontmost = app;
      if (loseFocusAtWait === waits) frontmost = otherApp;
      if (switchInstanceAtWait === waits) frontmost = backgroundApp;
    } } },
    AXUIElementCreateApplication: () => root,
    AXUIElementSetAttributeValue(element, name, value) {
      assert.equal(element, root); assert.equal(name, 'AXManualAccessibility'); assert.equal(value, true);
      if (throwOnEnable) throw new TypeError('模拟桥接异常');
      enables++; exposed = true; return 0;
    },
    AXUIElementCopyAttributeValue(element, name, out) {
      if (!exposed && (name === 'AXChildren' || name === 'AXFocusedUIElement')) return -1;
      if (changeBeforePress && name === 'AXValue' && ++reads > 1) editor.AXValue = '用户已修改';
      out[0] = element[name]; return element[name] == null ? -1 : 0;
    },
    AXUIElementPerformAction(element, action) { assert.equal(action, 'AXPress'); clicks++; return 0; },
  });
  const context = vm.createContext({ $: bridge, ObjC: { import() {}, bindFunction() {}, unwrap: (value) => value?.cfType === 'url' ? { toString: () => '[object NSURL]' } : value }, Ref: () => [], Date: { now: () => now } });
  vm.runInContext(CHATGPT_AUTOMATION_SCRIPT, context);
  const result = JSON.parse(context.run([JSON.stringify({ prompt: '本次草稿' })]));
  return { ...result, clicks, enables };
}

test('desktop automation presses once only for a uniquely identified new draft and send button', () => {
  const result = automate();
  assert.equal(result.sendStatus, 'pressed');
  assert.equal(result.clicks, 1);
  assert.equal(result.enables, 1);
  assert.equal(result.focusState, 'matched');
  assert.equal(result.targetPid, 123);
  assert.equal(automate({ labels: ['发送'] }).clicks, 1);
  for (const options of [{ trusted: false }, { active: false }, { url: 'app://-/local/existing-chat' }, { value: '另一条内容' }, { labels: ['Send', 'Send'] }, { labels: ['Stop'] }, { enabled: false }, { changeBeforePress: true }]) {
    const result = automate(options);
    assert.equal(result.sendStatus, 'draft');
    assert.equal(result.clicks, 0);
  }
});

test('uses the actual frontmost process even when the first instance or cached active flag is wrong', () => {
  assert.equal(automate({ cachedActive: false }).clicks, 1);
  assert.equal(automate({ backgroundInstanceFirst: true }).targetPid, 123);
  assert.equal(automate({ backgroundInstanceFirst: true }).clicks, 1);
  assert.equal(automate({ flatGroup: true }).clicks, 1);
  assert.equal(automate({ flatGroup: true, labels: ['Send', 'Send'] }).clicks, 0);
  const lost = automate({ loseFocusAtWait: 1 });
  assert.equal(lost.clicks, 0);
  assert.equal(lost.reason, 'focus');
  assert.equal(lost.focusState, 'lost');
  assert.equal(automate({ active: false }).focusState, 'waiting');
  for (const options of [{ loseFocusAtWait: 2 }, { switchInstanceAtWait: 2 }]) {
    const changed = automate(options);
    assert.equal(changed.clicks, 0);
    assert.equal(changed.reason, 'changed');
    assert.equal(changed.stage, 'verify');
  }
});

test('enables Electron controls, refreshes activation, and finds a deeply nested focused draft in a large window', () => {
  assert.equal(automate({ wrappers: 9, sidebarSize: 2000, url: 'app://-/' }).clicks, 1);
  assert.equal(automate({ active: false, activateAfterWait: true }).clicks, 1);
  assert.equal(automate({ focusAvailable: false }).clicks, 1);
  assert.equal(automate({ trusted: false }).enables, 0);
});

test('recognizes the packaged desktop index document and still verifies the exact draft and unique send button', () => {
  for (const url of ['app://-/index.html', 'app://-/index.html?initialRoute=%2F', 'app://-/index.html?initialRoute=%2Flocal%2Fprevious-chat']) {
    const sent = automate({ url });
    assert.equal(sent.sendStatus, 'pressed');
    assert.equal(sent.clicks, 1);
    assert.deepEqual(sent.controls.pageKinds, ['document']);
    assert.equal(sent.controls.draftMatchCount, 1);
    assert.equal(sent.controls.sendButtonCount, 1);
    assert.equal(automate({ url, value: '另一个草稿' }).clicks, 0);
    assert.equal(automate({ url, labels: ['Send', 'Send'] }).clicks, 0);
    assert.equal(automate({ url, loseFocusAtWait: 2 }).clicks, 0);
  }
  for (const url of ['app://-/settings.html', 'app://-/detached-window.html', 'app://-/index.html/extra', 'https://example.com/index.html']) {
    const result = automate({ url });
    assert.equal(result.reason, 'page');
    assert.equal(result.clicks, 0);
    assert.equal(result.controls.pageMatchCount, 0);
  }
});

test('returns the specific failed step instead of hiding every failure behind a draft status', () => {
  assert.equal(automate({ trusted: false }).reason, 'accessibility');
  assert.equal(automate({ active: false }).reason, 'focus');
  assert.equal(automate({ url: 'app://-/local/existing-chat' }).reason, 'page');
  assert.equal(automate({ value: '不同文字' }).reason, 'draft');
  assert.equal(automate({ enabled: false }).reason, 'button');
  assert.equal(automate({ changeBeforePress: true }).reason, 'changed');
  const failed = automate({ throwOnEnable: true });
  assert.equal(failed.reason, 'automation');
  assert.equal(failed.stage, 'accessibility');
  assert.equal(failed.errorName, 'TypeError');
  assert.equal(failed.clicks, 0);
});

test('the real macOS bridge preserves NSURL addresses, strings and arrays', { skip: process.platform !== 'darwin' }, () => {
  // 仅使用内存里的字典验证真实的 CF 输出指针和类型转换，完全不访问桌面应用。
  const reader = CHATGPT_AUTOMATION_SCRIPT.match(/function attribute\(element, name\) \{[\s\S]+?\n  \}/)[0];
  const script = `
    ObjC.import('AppKit');
    ObjC.bindFunction('CFURLGetString', ['id', ['id']]);
    ObjC.bindFunction('CFDictionaryGetValueIfPresent', ['bool', ['id', 'id', 'id*']]);
    const native = $;
    const bridge = Object.assign(value => native(value), {
      CFGetTypeID: native.CFGetTypeID, CFURLGetTypeID: native.CFURLGetTypeID, CFURLGetString: native.CFURLGetString,
      AXUIElementCopyAttributeValue: (element, name, out) => native.CFDictionaryGetValueIfPresent(element, name, out) ? 0 : -1
    });
    const read = (function($) { ${reader}; return attribute; })(bridge);
    const element = $({ AXURL: $.NSURL.URLWithString('app://-/'), AXRole: 'AXWebArea', AXChildren: ['one', 'two'] });
    JSON.stringify({ url: read(element, 'AXURL'), role: read(element, 'AXRole'), children: read(element, 'AXChildren').map(child => ObjC.unwrap(child)), missing: read(element, 'AXValue') });
  `;
  const result = JSON.parse(execFileSync('/usr/bin/osascript', ['-l', 'JavaScript'], { input: script, encoding: 'utf8', timeout: 5000 }));
  assert.deepEqual(result, { url: 'app://-/', role: 'AXWebArea', children: ['one', 'two'], missing: null });
});
