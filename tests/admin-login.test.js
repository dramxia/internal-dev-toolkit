const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');

const root = path.join(__dirname, '..');

function createHarness() {
  const requests = [];
  const cookies = [];
  const responses = [];
  const storage = { 'adminToken:alpha': { token: 'previous-token', updatedAt: 1 } };
  let current = { projectId: 'alpha', baseUrl: 'https://alpha.example.test', cookieKeys: ['WAF_ALPHA'] };
  let messageHandler;
  const context = vm.createContext({
    URL,
    TextEncoder,
    crypto: webcrypto,
    console: { log() {}, error() {} },
    InternalDevToolkit: {
      currentProject: {
        getCachedProjectId: () => current.projectId,
        getCurrentProjectId: async () => current.projectId,
        getBaseUrl: () => current.baseUrl,
        getAuthPath: () => '/huayun-ai/admin/auth',
        getCookieKeys: () => current.cookieKeys,
        loadCurrentProject: async () => {},
        migrateOldStorageKeys: async () => {},
        getName: () => current.projectId,
      },
    },
    chrome: {
      runtime: { onMessage: { addListener(handler) { messageHandler = handler; } } },
      tabs: { query: async () => [] },
      scripting: { executeScript: async () => [] },
      cookies: {
        async get(query) {
          cookies.push({ ...query });
          return { name: query.name, value: 'test-cookie' };
        },
      },
      storage: {
        local: {
          get(key, callback) { callback({ [key]: storage[key] }); },
          set(values, callback) { Object.assign(storage, values); callback(); },
        },
      },
    },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      assert.ok(responses.length, '请求次数不应超出已准备的接口响应');
      const next = responses.shift();
      if (next instanceof Error) throw next;
      const response = typeof next === 'function' ? await next() : next;
      return { ok: true, text: async () => JSON.stringify(response) };
    },
  });
  function load(file) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  load('src/common/token.js');
  load('src/common/admin-login-history.js');
  load('src/background/cookies.js');
  load('src/background/admin-token-injection.js');
  load('src/background/api.js');
  load('src/background/index.js');
  return {
    requests, cookies, responses, storage,
    get api() { return context.InternalDevToolkitBg.api; },
    switchProject() {
      current = { projectId: 'beta', baseUrl: 'https://beta.example.test', cookieKeys: ['WAF_BETA'] };
    },
    restartApi() { load('src/background/api.js'); },
    send(type, payload) {
      return new Promise((resolve) => {
        assert.equal(messageHandler({ type, payload }, {}, resolve), true);
      });
    },
  };
}

const credentials = { account: 'test-account', password: 'test-password' };
const captcha = { code: 200, data: { ticket: 'test-ticket', blockX: 117 } };
const sent = { code: 200, success: true, data: '验证码已发送' };

(async () => {
  const h = createHarness();
  h.responses.push(captcha, sent);
  const start = await h.send('LOGIN_API', credentials);
  assert.equal(start.ok, true);
  assert.equal(start.requiresVerification, true, '登录接口成功后应等待用户输入验证码');
  assert.deepEqual(h.requests.map((item) => new URL(item.url).pathname.split('/').pop()), ['getCaptcha', 'login']);
  assert.deepEqual(h.requests[1].body, {
    mobile: credentials.account,
    ticket: 'test-ticket',
    moveLength: '117',
    password: createHash('sha256').update(credentials.password).digest('hex'),
  });
  assert.equal(h.storage['adminToken:alpha'].token, 'previous-token', '等待验证码时不能覆盖已有 Token');
  assert.deepEqual(Object.keys(h.storage), ['adminToken:alpha'], '验证码与待验证信息不得落盘');

  const empty = await h.send('VERIFY_LOGIN_API', { verification: start.verification, code: '   ' });
  assert.equal(empty.ok, false);
  assert.match(empty.error, /请输入验证码/);
  assert.equal(h.requests.length, 2, '空验证码不得发起验证请求');

  h.responses.push({ code: 200, success: false, msg: '验证码错误', data: { token: 'must-not-save' } });
  const wrong = await h.send('VERIFY_LOGIN_API', { verification: start.verification, code: '111111' });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.error, '验证码错误');
  assert.equal(h.storage['adminToken:alpha'].token, 'previous-token', '显式业务失败即使带有 Token 也不得保存');

  // 用户等待期间项目发生切换、后台模块重新加载，验证仍应沿用原登录信息。
  h.switchProject();
  h.restartApi();
  let finishValidation;
  h.responses.push(() => new Promise((resolve) => { finishValidation = resolve; }));
  const confirming = h.send('VERIFY_LOGIN_API', { verification: start.verification, code: ' 004321 ' });
  await new Promise(setImmediate);
  assert.equal(h.storage['adminToken:alpha'].token, 'previous-token', '接口返回前不得提前保存');
  finishValidation({ code: 200, success: true, data: { accessToken: 'Bearer verified-token' } });
  const completed = await confirming;
  assert.equal(completed.ok, true);
  assert.equal(completed.token, 'verified-token');
  assert.equal(h.storage['adminToken:alpha'].token, 'verified-token');
  assert.equal(h.storage['adminToken:beta'], undefined, '不能把原项目的 Token 写入后来切换的项目');
  assert.equal(h.requests.at(-1).url, 'https://alpha.example.test/huayun-ai/admin/auth/valid');
  assert.deepEqual(h.requests.at(-1).body, {
    mobile: credentials.account,
    code: '004321',
    password: h.requests[1].body.password,
  });
  assert.deepEqual(h.cookies.at(-1), { url: 'https://alpha.example.test', name: 'WAF_ALPHA' });

  for (const badResponse of [
    { code: 500, success: true, data: { token: 'must-not-save' } },
    { code: 200, success: true, data: '验证码已发送' },
    { code: 200, data: {} },
    new Error('网络连接失败'),
  ]) {
    h.responses.push(badResponse);
    const failed = await h.send('VERIFY_LOGIN_API', { verification: start.verification, code: '222222' });
    assert.equal(failed.ok, false, '业务失败、缺少 Token 或网络失败均不得完成登录');
    assert.equal(h.storage['adminToken:alpha'].token, 'verified-token');
  }

  const direct = createHarness();
  direct.responses.push(captcha, { code: 200, data: { token: 'direct-token' } });
  const directResult = await direct.send('LOGIN_API', credentials);
  assert.equal(directResult.token, 'direct-token', '仍兼容登录接口直接返回 Token');
  assert.equal(directResult.requiresVerification, undefined);
  assert.equal(direct.requests.length, 2);

  const failedLogin = createHarness();
  failedLogin.responses.push(captcha, { code: 500, success: false, data: 'invalid credentials' });
  assert.equal((await failedLogin.send('LOGIN_API', credentials)).ok, false);
  assert.equal(failedLogin.storage['adminToken:alpha'].token, 'previous-token');

  const noTicket = createHarness();
  noTicket.responses.push({ code: 200, data: {} });
  assert.match((await noTicket.send('LOGIN_API', credentials)).error, /ticket/);
  assert.equal(noTicket.requests.length, 1);

  console.log('admin login verification tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
