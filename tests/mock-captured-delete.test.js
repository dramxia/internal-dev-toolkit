const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const plainValue = value => JSON.parse(JSON.stringify(value));

async function testBackgroundDoesNotTouchRules() {
  const sentMessages = [];
  const sandbox = {
    console,
    InternalDevToolkit: {
      mockStorage: new Proxy({}, {
        get() {
          throw new Error('删除捕获记录时不应访问 Mock 规则存储');
        },
      }),
    },
    chrome: {
      runtime: { lastError: null },
      tabs: {
        sendMessage(tabId, message, callback) {
          sentMessages.push({ tabId, message });
          callback({ ok: true, deletedRequests: 1 });
        },
      },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'src', 'background', 'mock-handler.js'), 'utf8'),
    sandbox,
  );

  const result = await sandbox.InternalDevToolkit.mockHandler.handleDeleteCapturedRequest({
    tabId: 7,
    method: 'GET',
    url: 'https://example.com/api/users?page=1',
  });

  assert.deepEqual(plainValue(result), { ok: true, deletedRequests: 1 });
  assert.deepEqual(plainValue(sentMessages), [{
    tabId: 7,
    message: {
      type: 'DELETE_CAPTURED_REQUEST',
      method: 'GET',
      url: 'https://example.com/api/users?page=1',
    },
  }]);
}

async function testContentKeepsHookRules() {
  let pageMessageListener;
  let runtimeMessageListener;
  const pageMessages = [];
  const rules = [
    {
      id: 'emo-users',
      method: 'GET',
      url: '/api/users',
      listSource: 'emo',
      responseMock: { enabled: true, hasMockData: true, mockData: { source: 'mock' }, status: 200 },
      requestMock: { enabled: false, hasMockData: false, mockData: null },
    },
    { id: 'edited-users', method: 'GET', url: '/api/users', listSource: 'edited' },
  ];
  const windowObject = {
    addEventListener(type, listener) {
      if (type === 'message') pageMessageListener = listener;
    },
    postMessage(message) {
      pageMessages.push(message);
    },
  };
  const sandbox = {
    console,
    window: windowObject,
    InternalDevToolkit: {
      mockStorage: { async getMockRules() { return rules; } },
    },
    chrome: {
      runtime: {
        onMessage: { addListener(listener) { runtimeMessageListener = listener; } },
        sendMessage() { return Promise.resolve(); },
      },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'src', 'content', 'mock-interceptor.js'), 'utf8'),
    sandbox,
  );
  await sandbox.InternalDevToolkit.mockInterceptor.init();

  assert.deepEqual(plainValue(pageMessages), [{
    type: 'IDT_UPDATE_MOCK_RULES',
    rules,
  }], '页面刷新后必须把存储中的已启用规则重放给 MAIN world hook');

  const beforeActivation = pageMessages.length;
  runtimeMessageListener({ type: 'SET_HOOK_ACTIVE', active: true }, {}, () => {});
  assert.deepEqual(plainValue(pageMessages.slice(beforeActivation)), [
    { type: 'IDT_UPDATE_MOCK_RULES', rules },
    { type: 'IDT_SET_ACTIVE', active: true },
  ], '面板在导航后重新激活 hook 时必须再次重放规则');

  runtimeMessageListener({ type: 'APPLY_MOCK_RULES', rules }, {}, () => {});
  const ruleSyncCount = pageMessages.length;
  pageMessageListener({
    source: windowObject,
    data: {
      type: 'IDT_REQUEST_LOGGED',
      record: {
        id: 'captured-users',
        method: 'GET',
        url: 'https://example.com/api/users?page=1',
      },
    },
  });

  let deleteResult;
  runtimeMessageListener({
    type: 'DELETE_CAPTURED_REQUEST',
    method: 'GET',
    url: 'https://example.com/api/users?page=2',
  }, {}, (response) => { deleteResult = response; });

  let logResult;
  runtimeMessageListener({ type: 'GET_REQUEST_LOG' }, {}, (response) => { logResult = response; });
  assert.deepEqual(plainValue(deleteResult), { ok: true, deletedRequests: 1 });
  assert.equal(logResult.requests.length, 0, '相同接口的捕获记录应忽略 Query 后被删除');
  assert.equal(pageMessages.length, ruleSyncCount, '删除捕获记录不应更新页面 hook 的规则缓存');
}

async function testRefreshReplaysEnabledMockToPageHook() {
  const messageListeners = [];
  let runtimeMessageListener;
  let nativeFetchCount = 0;
  const enabledRule = {
    id: 'enabled-users',
    method: 'GET',
    url: '/api/users',
    conflictVersionSelected: true,
    conflictVersionSource: 'edited',
    responseMock: {
      enabled: true,
      hasMockData: true,
      mockData: { source: 'mock-after-refresh' },
      status: 200,
    },
    requestMock: { enabled: false, hasMockData: false, mockData: null },
  };

  class FakeXMLHttpRequest {
    open() {}
    send() {}
    addEventListener() {}
    dispatchEvent() {}
  }

  const windowObject = {
    fetch: async () => {
      nativeFetchCount++;
      return new Response(JSON.stringify({ source: 'network' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    },
    XMLHttpRequest: FakeXMLHttpRequest,
    addEventListener(type, listener) {
      if (type === 'message') messageListeners.push(listener);
    },
    postMessage(message) {
      messageListeners.forEach(listener => listener({ source: windowObject, data: message }));
    },
  };
  const sandbox = {
    console,
    window: windowObject,
    location: { href: 'https://example.com/dashboard', origin: 'https://example.com' },
    URL,
    Response,
    Event,
    setTimeout,
    clearTimeout,
    InternalDevToolkit: {
      mockStorage: { async getMockRules() { return [enabledRule]; } },
    },
    chrome: {
      runtime: {
        onMessage: { addListener(listener) { runtimeMessageListener = listener; } },
        sendMessage() { return Promise.resolve(); },
      },
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'src', 'content', 'mock-hook.js'), 'utf8'),
    sandbox,
  );
  vm.runInContext(
    fs.readFileSync(path.join(root, 'src', 'content', 'mock-interceptor.js'), 'utf8'),
    sandbox,
  );

  await sandbox.InternalDevToolkit.mockInterceptor.init();
  assert.equal(typeof runtimeMessageListener, 'function');

  const response = await windowObject.fetch('https://example.com/api/users?reload=1');
  assert.deepEqual(await response.json(), { source: 'mock-after-refresh' });
  assert.equal(nativeFetchCount, 0, '刷新恢复规则后不应再发起原生网络请求');
}

async function run() {
  await testBackgroundDoesNotTouchRules();
  await testContentKeepsHookRules();
  await testRefreshReplaysEnabledMockToPageHook();
  console.log('mock refresh and captured request deletion regression tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
