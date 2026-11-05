'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const { CHATGPT_AUTOMATION_SCRIPT } = require('../native-host/lib.cjs');

// 单独运行：测试会打开一个临时窗口，并使用真实的 macOS 辅助功能点击它的按钮。
test('sends the exact draft through a real macOS window', { skip: process.platform !== 'darwin', timeout: 45000 }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'idt-agent-desktop-'));
  const app = path.join(root, 'Fixture.app');
  const executable = path.join(app, 'Contents', 'MacOS', 'Fixture');
  const output = path.join(root, 'sent.json');
  const bundleId = `com.internal-dev-toolkit.agent-fixture.${crypto.randomUUID()}`;
  let opened;
  try {
    await fs.mkdir(path.dirname(executable), { recursive: true });
    await fs.writeFile(path.join(app, 'Contents', 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>${bundleId}</string><key>CFBundleExecutable</key><string>Fixture</string><key>CFBundleName</key><string>IDT Agent Fixture</string><key>CFBundlePackageType</key><string>APPL</string></dict></plist>`);
    await execute('/usr/bin/clang', ['-fobjc-arc', '-framework', 'Cocoa', '-framework', 'WebKit', path.join(__dirname, 'fixtures', 'component-agent-app.m'), '-o', executable], { timeout: 20000 });
    opened = execute('/usr/bin/open', ['-W', '-n', app, '--args', output], { timeout: 40000 }).catch(() => {});
    // 只替换目标为本次创建的测试应用，生产脚本的识别和点击过程保持一致。
    const script = CHATGPT_AUTOMATION_SCRIPT.replaceAll('com.openai.codex', bundleId);
    const { stdout } = await execute('/usr/bin/osascript', ['-l', 'JavaScript', '-e', script, JSON.stringify({ prompt: '本次草稿' })], { timeout: 16000 });
    const result = JSON.parse(stdout);
    if (result.reason === 'accessibility') { t.skip('测试进程需要辅助功能权限'); return; }
    assert.equal(result.sendStatus, 'pressed', JSON.stringify(result));
    assert.equal(result.focusState, 'matched');
    await opened;
    assert.deepEqual(JSON.parse(await fs.readFile(output, 'utf8')), { sent: '本次草稿' });
  } finally {
    // 清理限定在本次随机编号的测试应用。
    if (opened) {
      await execute('/usr/bin/osascript', ['-l', 'JavaScript', '-e', `ObjC.import('AppKit'); ObjC.unwrap($.NSRunningApplication.runningApplicationsWithBundleIdentifier($(${JSON.stringify(bundleId)}))).forEach(app => app.terminate());`]).catch(() => {});
      await opened;
    }
    await fs.rm(root, { recursive: true, force: true });
  }
});
