const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

function loadPanelHelpers() {
  const source = fs.readFileSync(path.join(root, 'devtools', 'panel.js'), 'utf8');
  const sourceWithoutStartup = source.split('// 启动')[0];
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    URL,
    chrome: { devtools: { inspectedWindow: { tabId: 1 } } },
  };

  vm.createContext(sandbox);
  vm.runInContext(
    `${sourceWithoutStartup}\n;globalThis.__conflictTest = { buildConflictVersion, buildConflictCandidates, buildRule, createConflictChoiceTemplate, defaultConflictChoice, findConflictChoiceByTemplate, findEmoRuleForRequest, shouldPersistInterceptToggle, withSelectedConflictVersion };`,
    sandbox,
  );
  return sandbox.__conflictTest;
}

function loadMockStorage(initialRules) {
  const storageKey = 'mockRules:gpt-admin-pre';
  const values = { [storageKey]: initialRules };
  const sandbox = {
    console,
    URL,
    InternalDevToolkit: {},
    chrome: {
      runtime: { lastError: null },
      storage: {
        local: {
          get(key, callback) {
            callback({ [key]: values[key] });
          },
          set(nextValues, callback) {
            Object.assign(values, nextValues);
            callback();
          },
        },
      },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'src', 'common', 'mock-storage.js'), 'utf8'),
    sandbox,
  );
  return { storage: sandbox.InternalDevToolkit.mockStorage, values, storageKey };
}

async function run() {
  const importedRule = {
    id: 'imported-users',
    method: 'GET',
    url: '/api/users',
    imported: true,
    listSource: 'edited',
    captured: {
      source: 'imported',
      pageOrigin: 'https://example.com',
      responsePayload: { source: 'openapi' },
    },
  };
  const capturedRequest = {
    id: 'captured-users',
    method: 'GET',
    url: 'https://example.com/api/users?refresh=1',
    status: 201,
    requestPayload: { page: 1 },
    responsePayload: { source: 'capture' },
    pageOrigin: 'https://example.com',
    timestamp: 12345,
    mocked: false,
  };

  const {
    buildConflictVersion,
    buildConflictCandidates,
    buildRule,
    createConflictChoiceTemplate,
    defaultConflictChoice,
    findConflictChoiceByTemplate,
    findEmoRuleForRequest,
    shouldPersistInterceptToggle,
    withSelectedConflictVersion,
  } = loadPanelHelpers();
  const importedVersion = buildConflictVersion({ mode: 'edited', rule: importedRule });
  const capturedVersion = buildConflictVersion({
    mode: 'capture',
    request: {
      ...capturedRequest,
      mocked: true,
      responsePayload: { source: 'mock-result' },
      original: {
        url: 'https://example.com/api/users?refresh=original',
        method: 'POST',
        status: 202,
        requestPayload: { page: 2 },
        responsePayload: { source: 'real-capture' },
      },
    },
  });
  assert.equal(importedVersion.dataSource, '导入文档');
  assert.equal(importedVersion.responsePayload.source, 'openapi', '已编列必须展示导入快照');
  assert.equal(capturedVersion.dataSource, '原始捕获');
  assert.equal(capturedVersion.method, 'POST');
  assert.equal(capturedVersion.status, 202);
  assert.equal(capturedVersion.requestPayload.page, 2);
  assert.equal(capturedVersion.responsePayload.source, 'real-capture', '捕获列不能展示 Mock 后的数据');
  assert.match(capturedVersion.url, /refresh=original/);
  assert.equal(
    defaultConflictChoice([
      { choice: 'capture', mode: 'capture' },
      { choice: 'edited', mode: 'edited' },
    ]),
    'edited',
    '冲突弹窗必须默认选中已编，不能依赖候选排列顺序',
  );

  const firstConflictCandidates = buildConflictCandidates(importedRule, [
    { choice: 'capture', mode: 'capture', label: '捕获', request: capturedRequest },
    { choice: 'emo:first-a', mode: 'emo', label: 'Emo 1', rule: { id: 'first-a' } },
    { choice: 'emo:first-b', mode: 'emo', label: 'Emo 2', rule: { id: 'first-b' } },
  ]);
  const choiceTemplate = createConflictChoiceTemplate(firstConflictCandidates, 'emo:first-b');
  assert.equal(choiceTemplate.mode, 'emo');
  assert.equal(choiceTemplate.modeIndex, 1, '应用到后续时应保留同来源候选的序号');
  const nextConflictCandidates = buildConflictCandidates(importedRule, [
    { choice: 'capture', mode: 'capture', label: '捕获', request: capturedRequest },
    { choice: 'emo:next-a', mode: 'emo', label: 'Emo 1', rule: { id: 'next-a' } },
    { choice: 'emo:next-b', mode: 'emo', label: 'Emo 2', rule: { id: 'next-b' } },
  ]);
  assert.equal(
    findConflictChoiceByTemplate(nextConflictCandidates, choiceTemplate),
    'emo:next-b',
    '后续接口必须选择相同来源与同序号的版本',
  );
  assert.equal(
    findConflictChoiceByTemplate(
      buildConflictCandidates(importedRule, [{ choice: 'capture', mode: 'capture', request: capturedRequest }]),
      choiceTemplate,
    ),
    null,
    '后续接口缺少对应候选时必须回到人工选择',
  );
  const markedRule = withSelectedConflictVersion(importedRule, 'edited');
  assert.equal(markedRule.conflictVersionSelected, true);
  assert.equal(markedRule.conflictVersionSource, 'edited');
  assert.equal(importedRule.conflictVersionSelected, undefined, '添加标识不能原地修改候选规则');

  const panelHtml = fs.readFileSync(path.join(root, 'devtools', 'panel.html'), 'utf8');
  assert.match(panelHtml, /id="importConflictApplyRemainingBtn"[^>]*>为后续接口都应用此项<\/button>/);
  assert.equal(shouldPersistInterceptToggle({ mode: 'capture' }), false, '捕获页开关不应直接持久化');
  assert.equal(shouldPersistInterceptToggle({ mode: 'emo' }), true);
  assert.equal(
    findEmoRuleForRequest(capturedRequest, [importedRule]),
    null,
    '同接口的已编规则不能被捕获页当作 Emo 规则复用',
  );

  const unrelatedEditedRule = {
    id: 'imported-health',
    method: 'GET',
    url: '/api/health',
    imported: true,
    listSource: 'edited',
  };
  const { storage, values, storageKey } = loadMockStorage([
    importedRule,
    unrelatedEditedRule,
  ]);

  await storage.resolveImportConflict({
    ...importedRule,
    captureConflictResolved: true,
    conflictVersionSelected: true,
    conflictVersionSource: 'edited',
  }, []);

  let savedRules = values[storageKey];
  assert.equal(savedRules.filter(rule => rule.listSource === 'emo').length, 0, '冲突确认不能自动生成 Emo');
  assert.equal(savedRules.find(rule => rule.id === importedRule.id).conflictVersionSelected, true);

  const emoRule = buildRule({
    mode: 'capture',
    url: capturedRequest.url,
    method: capturedRequest.method,
    status: capturedRequest.status,
    pageOrigin: capturedRequest.pageOrigin,
    requestPayload: capturedRequest.requestPayload,
    responsePayload: capturedRequest.responsePayload,
    hasRealSnapshot: true,
    conflictVersionSelected: true,
    existingRule: null,
  }, {
    activeTab: 'response',
    mockDataByTab: { response: capturedRequest.responsePayload },
    updateMockData: false,
    enabled: true,
  });
  await storage.saveMockRule(emoRule);
  assert.equal(emoRule.conflictVersionSelected, true, '捕获版本保存到 Emo 后必须继承差异选择标识');
  assert.equal(emoRule.conflictVersionSource, 'capture');

  savedRules = values[storageKey];
  const savedEndpointRules = savedRules.filter(rule =>
    rule.method === importedRule.method && String(rule.url).includes('/api/users')
  );
  assert.equal(savedEndpointRules.length, 2, '点击保存后 Emo 应与同接口的已编规则并存');
  assert.ok(savedEndpointRules.some(rule => rule.listSource === 'edited'));
  assert.ok(savedEndpointRules.some(rule => rule.listSource === 'emo' && rule.captured?.source === 'capture'));
  assert.equal(findEmoRuleForRequest(capturedRequest, savedRules).id, emoRule.id);
  assert.ok(
    savedRules.some(rule => rule.id === unrelatedEditedRule.id && rule.listSource === 'edited'),
    '保存捕获接口不应影响其他已编接口',
  );

  console.log('mock conflict resolution regression tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
