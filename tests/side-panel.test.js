const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.ok(manifest.permissions.includes('sidePanel'), 'manifest 应声明 sidePanel 权限');
assert.equal(manifest.side_panel?.default_path, 'popup.html', '侧边栏应加载现有工具箱页面');
assert.equal(manifest.action?.default_popup, undefined, 'action 不应继续打开工具栏 popup');
assert.equal(manifest.action?.default_title, '打开内部开发工具箱');
assert.ok(Number(manifest.minimum_chrome_version) >= 116, '点击图标打开侧边栏需要 Chrome 116+');

const backgroundIndex = fs.readFileSync(path.join(root, 'src/background/index.js'), 'utf8');
assert.match(
  backgroundIndex,
  /setPanelBehavior\(\{\s*openPanelOnActionClick:\s*true\s*\}\)/,
  '后台应将扩展图标点击行为绑定到侧边栏',
);

const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
assert.match(popupHtml, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
assert.match(popupHtml, /body\s*\{[^}]*width:\s*100%;[^}]*min-height:\s*100dvh;/s);
assert.doesNotMatch(popupHtml, /body\s*\{[^}]*width:\s*420px;/s, '侧边栏页面不应保留固定 popup 宽度');

console.log('side panel regression tests passed');
