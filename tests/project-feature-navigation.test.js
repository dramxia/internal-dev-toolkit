const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { PROJECTS } = require('../src/common/projects.js');

const aiPlatform = PROJECTS.find((project) => project.name === 'AI平台');
const higherEducation = PROJECTS.find((project) => project.name === '高校');
const app = PROJECTS.find((project) => project.name === 'APP');

assert.ok(aiPlatform, '顶部项目中应保留「AI平台」');
assert.ok(higherEducation, '顶部项目中应新增与「AI平台」同级的「高校」');
assert.ok(app, '顶部项目中应保留「APP」');
assert.ok(
  PROJECTS.indexOf(higherEducation) > PROJECTS.indexOf(aiPlatform),
  '「高校」应排列在「AI平台」之后',
);
assert.ok(
  PROJECTS.indexOf(higherEducation) < PROJECTS.indexOf(app),
  '「高校」应排列在「APP」之前',
);

assert.deepEqual(
  aiPlatform.enabledFeatures,
  ['adminPanel', 'quickLogin'],
  '「AI平台」不应再包含原「其它」功能',
);
assert.deepEqual(
  higherEducation.enabledFeatures,
  ['otherLogin'],
  '原「其它」内容应由「高校」独占承载',
);
assert.deepEqual(
  PROJECTS.filter((project) => project.enabledFeatures.includes('otherLogin')),
  [higherEducation],
  'otherLogin 不应同时归属其它顶部项目',
);

const popupIndex = fs.readFileSync(path.join(root, 'src/popup/index.js'), 'utf8');
assert.match(
  popupIndex,
  /ns\.otherLoginUi\s*&&\s*enabledFeatures\.includes\('otherLogin'\)/,
  '原「其它」UI 只应在当前项目启用 otherLogin 时初始化',
);
assert.match(
  popupIndex,
  /\{\s*tab:\s*null,\s*feature:\s*'otherLogin',\s*panel:\s*'panel-other'\s*\}/,
  '「高校」应直接激活原功能面板，不应再映射到内层 tab',
);

const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
assert.doesNotMatch(
  popupHtml,
  /data-tab=["']other["']/,
  '迁移后不应再保留内层「其它」tab',
);
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
  assert.match(
    popupHtml,
    new RegExp(`id=["']${elementId}["']`),
    `迁移后仍应保留原有控件 #${elementId}`,
  );
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

for (const storageKey of [
  'otherLoginCredentials',
  'otherLoginToken',
  'otherLoginHistory',
]) {
  assert.ok(backgroundModule.includes(storageKey), `后台应继续使用原存储键 ${storageKey}`);
}

console.log('project feature navigation tests passed');
