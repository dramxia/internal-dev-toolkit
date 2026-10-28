const assert = require('node:assert/strict');
const policy = require('../src/common/component-settings');
for (const url of ['http://localhost:5173', 'https://127.0.0.1:3000/path', 'http://[::1]:8080']) assert.equal(policy.isAllowed(url), true);
for (const url of ['https://example.com', 'https://localhost.example.com', 'http://127.0.0.1.example.com', 'file:///tmp/a', 'http://user:pass@localhost']) assert.equal(policy.isAllowed(url), false);
assert.equal(policy.isAllowed('http://dev.test:5173/a', ['http://dev.test:5173']), true);
assert.equal(policy.isAllowed('http://dev.test:5174', ['http://dev.test:5173']), false);
assert.equal(policy.matchesShortcut({ metaKey: true }, policy.DEFAULT_SHORTCUT), true);
assert.equal(policy.matchesShortcut({ metaKey: true, shiftKey: true }, policy.DEFAULT_SHORTCUT), false);
assert.throws(() => policy.normalizeShortcut({ code: 'KeyA' }), /至少包含/);
const custom = policy.normalizeShortcut({ alt: true, shift: true, code: 'KeyX' });
assert.equal(policy.matchesShortcut({ altKey: true, shiftKey: true }, custom, new Set(['KeyX'])), true);
assert.equal(policy.matchesShortcut({ altKey: true, shiftKey: true }, custom), false);
assert.deepEqual(policy.normalizeSettings().openShortcut, policy.DEFAULT_SHORTCUT);
for (const code of ['Backspace', 'Space', 'ArrowLeft', 'F13']) {
  assert.throws(() => policy.normalizeShortcut({ meta: true, code }), /字母、数字/, '不支持的按键应明确报错，保留原快捷键');
}
const origins = Array.from({ length: 50 }, (_, index) => `http://dev${index}.test:5173`);
assert.equal(policy.normalizeSettings({ origins }).origins.length, 50);
assert.equal(policy.normalizeSettings({ origins: [...origins, origins[0]] }).origins.length, 50, '重复地址不占用额外名额');
assert.throws(() => policy.normalizeSettings({ origins: [...origins, 'http://extra.test:5173'] }), /最多保存 50/, '超出地址上限时应报错，避免静默丢弃');
console.log('component settings tests passed');
