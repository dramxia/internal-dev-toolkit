const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
globalThis.InternalDevToolkit = {};
const {
  FEATURE_META,
  buildWorkspaceDefinitions,
  selectInitialWorkspace,
  createNavigationGate,
} = require('../src/popup/workspace-ui.js');

const projects = [
  { id: 'alpha', name: 'Alpha', enabledFeatures: ['adminPanel', 'quickLogin', 'unknown'] },
  { id: 'beta', name: 'Beta', enabledFeatures: ['appLogin'] },
];
const items = buildWorkspaceDefinitions(projects);
assert.deepEqual(items.map((item) => item.workspaceId), [
  'alpha:admin',
  'alpha:relations',
  'beta:app',
]);
assert.equal(items.some((item) => item.feature === 'unknown'), false, '未知 feature 不应生成失效任务');
assert.equal(items[0].panelId, 'panel-admin');
assert.deepEqual(items[1].utilities, FEATURE_META.quickLogin.utilities);

assert.equal(
  selectInitialWorkspace(items, 'alpha', 'alpha:relations').workspaceId,
  'alpha:relations',
  '同项目已保存任务应优先恢复',
);
assert.equal(
  selectInitialWorkspace(items, 'alpha', 'beta:app').workspaceId,
  'alpha:admin',
  '已保存任务属于其他项目时应回退到当前项目首项',
);
assert.equal(
  selectInitialWorkspace(items, 'missing', 'missing:task').workspaceId,
  'alpha:admin',
  '无效项目与任务应回退到第一个可用任务',
);
assert.equal(selectInitialWorkspace([], 'alpha', ''), null);

const navigationGate = createNavigationGate();
assert.equal(navigationGate.tryEnter(), true, '第一次任务切换应进入临界区');
assert.equal(navigationGate.tryEnter(), false, '切换完成前的快速重复点击应被拒绝');
assert.equal(navigationGate.isActive(), true);
navigationGate.leave();
assert.equal(navigationGate.tryEnter(), true, '前一次切换结束后应允许新任务');
navigationGate.leave();

const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'src/popup/ui.js'), 'utf8');
const workspaceSource = fs.readFileSync(path.join(root, 'src/popup/workspace-ui.js'), 'utf8');

const ids = [...popupHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, '工作台静态 DOM 不应出现重复 ID');
assert.match(popupHtml, /body\.utility-open\s*\{\s*grid-template-rows:/);
assert.match(popupHtml, /\.utility-open \.workspace-dock\s*\{\s*display:\s*none/);
assert.match(popupHtml, /@media \(max-width: 359px\)/);
assert.match(popupHtml, /\.quick-progress-compact\s*\{\s*display:\s*none/);

assert.match(workspaceSource, /createUtilityScreens\(\)/);
assert.match(workspaceSource, /runBeforeLeave\(activeUtility\)/);
assert.match(workspaceSource, /previous\.trigger\?\.focus/);
assert.match(workspaceSource, /if \(!navigationGate\.tryEnter\(\)\) return;/, '跨项目任务切换应互斥');
assert.match(workspaceSource, /setDockBusy\(true\)/, '切换期间应禁用任务坞');
assert.match(workspaceSource, /if \(event\.defaultPrevented\) return;/, '工具屏 Escape 应尊重子控件已处理事件');
assert.match(workspaceSource, /storeWorkspace\(target\.workspaceId\)/);
assert.match(uiSource, /className = 'action-menu'/);
assert.match(uiSource, /className = 'action-overflow-btn'/);
assert.match(uiSource, /event\.key === 'ArrowDown' \|\| event\.key === 'ArrowUp'/);
assert.match(uiSource, /event\.stopPropagation\(\)/, '更多菜单键盘事件不得冒泡到工具屏路由');
assert.match(uiSource, /aria-haspopup', 'menu'/, '更多按钮应暴露弹出菜单语义');
assert.match(uiSource, /aria-expanded', 'true'/, '打开菜单时应同步展开状态');
assert.match(uiSource, /closeActionMenu\(true\)/, '执行菜单动作前应恢复触发按钮焦点');
assert.match(uiSource, /source\?\.click\(\)/, '更多菜单应复用原业务按钮事件');
assert.match(uiSource, /MutationObserver/, '动态列表渲染后应重新压缩行操作');

console.log('workspace UI tests passed');
