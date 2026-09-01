const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { PROJECTS } = require('../src/common/projects.js');
const { FEATURE_META, buildWorkspaceDefinitions } = require('../src/popup/workspace-ui.js');

const aiPlatform = PROJECTS.find((project) => project.name === 'AI平台');
const higherEducation = PROJECTS.find((project) => project.name === '高校');
const app = PROJECTS.find((project) => project.name === 'APP');

assert.ok(aiPlatform, '项目注册表应保留 AI平台');
assert.ok(higherEducation, '项目注册表应保留高校');
assert.ok(app, '项目注册表应保留 APP');
assert.deepEqual(aiPlatform.enabledFeatures, ['adminPanel', 'quickLogin']);
assert.deepEqual(higherEducation.enabledFeatures, ['otherLogin']);
assert.deepEqual(app.enabledFeatures, ['appLogin']);

assert.deepEqual(
  Object.keys(FEATURE_META),
  ['adminPanel', 'quickLogin', 'otherLogin', 'appLogin'],
  '任务工作台应覆盖当前全部 feature',
);

const workspaces = buildWorkspaceDefinitions(PROJECTS);
assert.deepEqual(
  workspaces.map((item) => item.workspaceId),
  [
    'gpt-admin-pre:admin',
    'gpt-admin-pre:relations',
    'higher-education:higher',
    'app:app',
  ],
  '任务坞应按项目 feature 生成四个稳定任务',
);
assert.deepEqual(
  workspaces.map((item) => item.shortLabel),
  ['后台', '关系', '高校', 'APP'],
);
assert.equal(workspaces[1].utilities.history, 'quick-history');
assert.equal(workspaces[1].utilities.token, 'admin-token');
assert.equal(workspaces[2].utilities.token, 'other-token');
assert.equal(workspaces[3].utilities.history, 'app-history');

const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const popupIndex = fs.readFileSync(path.join(root, 'src/popup/index.js'), 'utf8');
const workspaceUi = fs.readFileSync(path.join(root, 'src/popup/workspace-ui.js'), 'utf8');
const buildScript = fs.readFileSync(path.join(root, 'scripts/build.js'), 'utf8');

assert.match(popupHtml, /class="workspace-header"/);
assert.match(popupHtml, /id="workspaceDock"[^>]*aria-label="工具任务"/);
assert.match(popupHtml, /id="workspaceMain"/);
assert.match(popupHtml, /id="utilityHost"/);
assert.doesNotMatch(popupHtml, /id="projectPills"|class="project-pill|class="tab-rail|class="tab-btn/);
assert.doesNotMatch(popupHtml, /<header class="app-header"/);

for (const sourceId of [
  'adminTokenSection',
  'adminDomainSection',
  'quickHistorySection',
  'otherHistorySection',
  'otherTokenSection',
  'appHistorySection',
  'appTokenSection',
]) {
  assert.match(popupHtml, new RegExp(`id=["']${sourceId}["']`), `应保留工具屏来源 #${sourceId}`);
}

assert.match(workspaceUi, /const STORAGE_KEY = 'sidePanelActiveWorkspace'/);
assert.match(workspaceUi, /await ns\.currentProject\.setCurrentProjectId\(target\.projectId\)/);
assert.match(workspaceUi, /location\.reload\(\)/, '跨项目任务切换后应刷新侧栏上下文');
assert.match(workspaceUi, /registerBeforeLeave/);
assert.match(workspaceUi, /scrollTop: \$\('workspaceMain'\)\?\.scrollTop/);
assert.match(workspaceUi, /event\.key === 'Escape' && activeUtility/);
assert.match(popupIndex, /await ns\.workspaceUi\.init\(\)/);
assert.doesNotMatch(popupIndex, /projectSwitcherUi|bindTabSwitcher|featureTabs/);
assert.match(buildScript, /'src\/popup\/workspace-ui\.js'/);
assert.doesNotMatch(buildScript, /'src\/popup\/project-switcher-ui\.js'/);

for (const elementId of [
  'otherLoginSection',
  'otherSiteUrl',
  'otherAccount',
  'otherPassword',
  'otherLoginBtn',
  'otherEnterBtn',
  'otherZhiqueBtn',
  'otherHistoryList',
  'otherTeacherList',
  'otherTokenValue',
]) {
  assert.match(popupHtml, new RegExp(`id=["']${elementId}["']`), `重构后仍应保留 #${elementId}`);
}

const popupModule = fs.readFileSync(path.join(root, 'src/popup/other-login-ui.js'), 'utf8');
const backgroundModule = fs.readFileSync(path.join(root, 'src/background/other-login.js'), 'utf8');
const backgroundIndex = fs.readFileSync(path.join(root, 'src/background/index.js'), 'utf8');
for (const messageType of [
  'OTHER_LOGIN',
  'OTHER_ENTER',
  'OTHER_ZHIQUE_ENTER',
  'OTHER_GET_CREDENTIALS',
  'OTHER_GET_TOKEN',
  'OTHER_SAVE_TOKEN',
  'OTHER_CLEAR_TOKEN',
  'OTHER_GET_HISTORY',
  'OTHER_DELETE_HISTORY',
  'OTHER_LIST_TEACHERS',
]) {
  assert.ok(popupModule.includes(messageType), `Popup 应继续发送 ${messageType}`);
  assert.ok(backgroundIndex.includes(messageType), `后台应继续处理 ${messageType}`);
}
for (const storageKey of ['otherLoginCredentials', 'otherLoginToken', 'otherLoginHistory']) {
  assert.ok(backgroundModule.includes(storageKey), `后台应继续使用原存储键 ${storageKey}`);
}

console.log('task workspace navigation tests passed');
