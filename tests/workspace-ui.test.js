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
  'beta:app',
  '已保存工作区应跨项目恢复，视图路由不得绑定后端项目上下文',
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
assert.match(popupHtml, /\.workspace-main\s*\{[\s\S]*scrollbar-width:\s*none;/, '主体滚动区应隐藏 Firefox 滚动条');
assert.match(popupHtml, /\.workspace-main::\-webkit-scrollbar\s*\{[\s\S]*display:\s*none;/, '主体滚动区应隐藏 Chromium 滚动条');
assert.match(popupHtml, /body\.utility-open\s*\{\s*grid-template-rows:/);
assert.match(popupHtml, /\.utility-open \.workspace-dock\s*\{\s*display:\s*none/);
assert.match(popupHtml, /@media \(max-width: 359px\)/);
assert.match(popupHtml, /\.quick-progress-compact\s*\{\s*display:\s*none/);

assert.match(workspaceSource, /createUtilityScreens\(\)/);
assert.match(workspaceSource, /runBeforeLeave\(activeUtility\)/);
assert.match(workspaceSource, /previous\.trigger\?\.focus/);
assert.match(workspaceSource, /if \(!navigationGate\.tryEnter\(\)\) return;/, '任务切换应互斥');
assert.match(workspaceSource, /contextProjectId: meta\.usesProjectContext \? project\.id : ''/);
assert.match(workspaceSource, /ensureProjectContext\(target\.contextProjectId\)/, '仅依赖后台项目的工作区才同步上下文');
assert.doesNotMatch(workspaceSource, /location\.reload\(\)/, '工作区切换不得刷新侧边栏文档');
assert.match(workspaceSource, /workspaceScroll\.set\(activeWorkspace\.workspaceId, main\.scrollTop\)/, '工作区应保留独立滚动位置');
assert.match(workspaceSource, /panel\.inert = !selected;/, '隐藏面板不得保留交互焦点');
assert.match(workspaceSource, /ensureFeatureInitialized\(workspace\.feature\)[\s\S]*lifecycle\?\.activate/, '模块应先幂等初始化再按需激活');
assert.match(workspaceSource, /requestIdleCallback\(run/, '非首屏模块应分批在空闲阶段预热');
assert.match(workspaceSource, /transitionView\(update, 'workspace'\)/, '底部模块应使用显式轻量视图过渡');
assert.doesNotMatch(uiSource, /document\.startViewTransition|::view-transition/, '主内容动画不得使用会覆盖任务坞的 top-layer View Transition');
assert.match(uiSource, /activeContentAnimation\?\.cancel\(\)/, '快速切换应取消上一段内容动画');
assert.match(uiSource, /target\.animate\(\[/, '主内容应使用容器内 WAAPI 动画');
assert.match(popupHtml, /\.workspace-main\s*\{[\s\S]*position:\s*relative;[\s\S]*isolation:\s*isolate;/, '主内容动画必须限制在独立层叠上下文');
assert.doesNotMatch(popupHtml, /::view-transition|view-transition-name|data-view-transition/, '样式不得创建浏览器 top-layer 过渡快照');
assert.doesNotMatch(popupHtml, /fonts\.googleapis\.com|@import\s+url/, '扩展页不得依赖远程字体');
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
