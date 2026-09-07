const assert = require('assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function testOtherAppsMessage() {
  let listener;
  const calls = [];
  let response = { code: 200, data: [{ name: 'AI评价系统', linkUrl: 'https://review.example.test/' }] };
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    InternalDevToolkit: {
      currentProject: {
        async loadCurrentProject() {},
        async migrateOldStorageKeys() {},
        getName() { return 'test'; },
      },
      token: { getToken() { throw new Error('不得读取后台 token'); } },
    },
    InternalDevToolkitBg: {
      cookies: { async getWafCookiesForUrl() { return ''; } },
    },
    chrome: { runtime: { onMessage: { addListener(fn) { listener = fn; } } } },
    async fetch(url, options) {
      calls.push({ url, options });
      return { ok: true, async text() { return JSON.stringify(response); } };
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/common/tenant.js'), 'utf8'), context);
  for (const file of ['tenant-api.js', 'index.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/background', file), 'utf8'), context);
  }
  const payload = { origin: 'https://tenant.example.test', aiToken: 'selected-user-token' };
  const send = (value = payload) => new Promise(resolve => listener({ type: 'FETCH_OTHER_APPS', payload: value }, {}, resolve));
  const result = await send();
  assert.equal(result.ok, true);
  assert.equal(result.res.data[0].name, 'AI评价系统');
  assert.equal(calls[0].url, 'https://tenant.example.test/huayun-ai/client/other/app/list');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer selected-user-token', '应用列表必须使用选中账号的 AI 平台 token');
  assert.equal(calls[0].options.body, '{}');

  response = { code: 200, success: false, msg: '账号会话已失效' };
  const failed = await send();
  assert.equal(failed.ok, false);
  assert.match(failed.error, /账号会话已失效/, '应用列表请求失败应返回实际错误');
  const missingToken = await send({ origin: payload.origin });
  assert.equal(missingToken.ok, false);
  assert.match(missingToken.error, /未获取 AI 平台 token/);
  assert.equal(calls.length, 2, '缺少用户 token 时不得发送请求或回退到后台 token');

  delete context.InternalDevToolkitBg.tenantApi.fetchOtherAppList;
  const missingModule = await send();
  assert.equal(missingModule.ok, false);
  assert.match(missingModule.error, /重新加载扩展/);
}

async function loadMessagesWithRuntime(sendMessage) {
  globalThis.InternalDevToolkit = {};
  globalThis.chrome = {
    runtime: {
      lastError: null,
      sendMessage,
      onMessage: { addListener() {} },
    },
    tabs: {},
  };
  delete require.cache[require.resolve('../src/content/messages.js')];
  require('../src/content/messages.js');
  return globalThis.InternalDevToolkit.messages;
}

(async () => {
  const failedMessages = await loadMessagesWithRuntime((_message, callback) => {
    globalThis.chrome.runtime.lastError = {
      message: 'The message port closed before a response was received.',
    };
    callback(undefined);
  });

  await assert.rejects(
    failedMessages.sendToBackground({ type: 'FETCH_CLASS_TEACHERS' }),
    (error) => error.message.includes('FETCH_CLASS_TEACHERS') && error.message.includes('重新加载'),
  );

  const successfulMessages = await loadMessagesWithRuntime((_message, callback) => {
    globalThis.chrome.runtime.lastError = null;
    callback({ ok: true, value: 1 });
  });
  assert.deepStrictEqual(
    await successfulMessages.sendToBackground({ type: 'PING' }),
    { ok: true, value: 1 },
  );

  await testOtherAppsMessage();
  console.log('message transport tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
