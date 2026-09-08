const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const origin = 'https://admin.example.test';
const loginUser = { accessToken: 'Bearer new-token', userId: 'new-user', username: '新账号' };

function createHarness() {
  const storage = {
    'adminToken:alpha': {
      token: 'saved-token', origin, siteToken: 'Bearer saved-token',
      userInfo: { userId: 'saved-user', accessToken: 'Bearer saved-token' },
    },
  };
  const pageStorage = { token: 'Bearer old-token', userInfo: JSON.stringify({ userId: 'old-user' }), theme: 'light' };
  const requests = [];
  const responses = [];
  const injections = [];
  const operations = [];
  const queries = [];
  let activeTab = { id: 7, active: true, url: `${origin}/login?redirect=%2Ftenant#signin` };
  let pageOrigin = origin;
  let scriptError = null;
  let writeError = null;
  let handler;
  const site = vm.createContext({
    window: { location: { get origin() { return pageOrigin; }, assign(url) { operations.push(`navigate:${url}`); } } },
    localStorage: {
      getItem(key) { return pageStorage[key] || null; },
      setItem(key, value) {
        if (writeError) throw writeError;
        operations.push(`write:${key}`);
        pageStorage[key] = String(value);
      },
      removeItem(key) { operations.push(`remove:${key}`); delete pageStorage[key]; },
    },
  });
  const background = vm.createContext({
    URL, TextEncoder, crypto: webcrypto,
    console: { log() {}, error() {} },
    InternalDevToolkit: {
      currentProject: {
        getCachedProjectId: () => 'alpha',
        getCurrentProjectId: async () => 'alpha',
        getBaseUrl: () => origin,
        getAuthPath: () => '/auth',
        getCookieKeys: () => [],
        loadCurrentProject: async () => {},
        migrateOldStorageKeys: async () => {},
        getName: () => 'alpha',
      },
    },
    chrome: {
      runtime: { onMessage: { addListener(fn) { handler = fn; } } },
      storage: { local: {
        get(key, callback) { callback({ [key]: storage[key] }); },
        set(value, callback) { operations.push('save'); Object.assign(storage, value); callback(); },
      } },
      tabs: { async query(info) { queries.push({ ...info }); return activeTab ? [{ ...activeTab }] : []; } },
      scripting: {
        async executeScript(details) {
          injections.push(details);
          if (scriptError) throw scriptError;
          site.args = structuredClone(details.args);
          const result = vm.runInContext(`(${details.func.toString()})(...args)`, site);
          return [{ frameId: 0, result }];
        },
      },
    },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      assert.ok(responses.length, '不应额外调用登录接口');
      return { ok: true, text: async () => JSON.stringify(responses.shift()) };
    },
  });
  for (const file of ['src/common/token.js', 'src/background/cookies.js', 'src/background/admin-token-injection.js', 'src/background/api.js', 'src/background/index.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), background, { filename: file });
  }
  return {
    storage, pageStorage, requests, responses, injections, operations, queries,
    token: background.InternalDevToolkit.token,
    setActiveTab(tab) { activeTab = tab; },
    navigatePage(url) { pageOrigin = new URL(url).origin; },
    failScript(error) { scriptError = error; },
    failWrite(error) { writeError = error; },
    send(type, payload) {
      return new Promise((resolve) => {
        assert.equal(handler({ type, payload }, {}, resolve), true);
      });
    },
  };
}

const captcha = { code: 200, data: { ticket: 'ticket', blockX: 117 } };
const credentials = { account: 'account', password: 'password' };
const manualPayload = { projectId: 'alpha', baseUrl: origin };

(async () => {
  const direct = createHarness();
  direct.responses.push(captcha, { code: 200, data: loginUser });
  const completed = await direct.send('LOGIN_API', credentials);
  assert.equal(completed.ok, true);
  assert.equal(completed.injection.injected, true);
  assert.equal(direct.pageStorage.token, 'Bearer new-token');
  assert.deepEqual(JSON.parse(direct.pageStorage.userInfo), loginUser, '页面应同步新账号信息');
  assert.equal(direct.pageStorage.theme, 'light', '不能清空无关网站设置');
  assert.deepEqual(direct.operations, ['save', 'write:token', 'write:userInfo', `navigate:${origin}/`]);
  assert.deepEqual(direct.queries, [{ active: true, lastFocusedWindow: true }], '只能查询当前激活标签页');
  assert.equal(direct.injections[0].target.tabId, 7);
  assert.deepEqual(Array.from(direct.injections[0].target.frameIds), [0], '只写入主页面');

  const verified = createHarness();
  verified.responses.push(captcha, { code: 200, data: '验证码已发送' });
  const pending = await verified.send('LOGIN_API', credentials);
  assert.equal(pending.requiresVerification, true);
  assert.equal(verified.injections.length, 0, '等待验证码期间不得注入');
  verified.responses.push({ code: 400, msg: '验证码错误' });
  assert.equal((await verified.send('VERIFY_LOGIN_API', { verification: pending.verification, code: 'wrong' })).ok, false);
  assert.equal(verified.injections.length, 0, '验证码错误时不得注入');
  verified.responses.push({ code: 200, data: loginUser });
  assert.equal((await verified.send('VERIFY_LOGIN_API', { verification: pending.verification, code: '123456' })).injection.injected, true);
  assert.equal(verified.operations.at(-1), `navigate:${origin}/`, '验证码登录成功后应跳转到网站根目录');

  for (const target of [
    'https://other.example.test/tenant',
    'https://admin.example.test.evil.test/tenant',
    'https://sub.admin.example.test/tenant',
    'http://admin.example.test/tenant',
    'https://admin.example.test:8443/tenant',
    'chrome://extensions/',
  ]) {
    const h = createHarness();
    h.setActiveTab({ id: 8, active: true, url: target });
    h.responses.push(captcha, { code: 200, data: loginUser });
    const result = await h.send('LOGIN_API', credentials);
    assert.equal(result.ok, true, '不匹配的网站不影响插件登录');
    assert.equal(result.injection.injected, false);
    assert.equal(h.storage['adminToken:alpha'].token, 'new-token');
    assert.equal(h.injections.length, 0, `不应注入 ${target}`);
    assert.equal((await h.send('INJECT_ADMIN_TOKEN', manualPayload)).ok, false, '手动注入也必须检查网站地址');
    assert.equal(h.injections.length, 0);
  }

  const noTab = createHarness();
  noTab.setActiveTab(null);
  assert.equal((await noTab.send('INJECT_ADMIN_TOKEN', manualPayload)).ok, false);
  const changed = createHarness();
  changed.navigatePage('https://other.example.test');
  const changedResult = await changed.send('INJECT_ADMIN_TOKEN', manualPayload);
  assert.equal(changedResult.ok, false);
  assert.match(changedResult.error, /跳转/);
  assert.deepEqual(changed.operations, [], '写入前页面已跳到其他域名时，不能写入或跳转');

  const manual = createHarness();
  assert.equal((await manual.send('INJECT_ADMIN_TOKEN', manualPayload)).injected, true);
  assert.equal(manual.requests.length, 0, '手动按钮不能重新调用登录接口');
  assert.equal(manual.pageStorage.token, 'Bearer saved-token');
  assert.equal(JSON.parse(manual.pageStorage.userInfo).userId, 'saved-user');
  assert.equal(manual.operations.at(-1), `navigate:${origin}/`, '手动注入成功后应跳转到网站根目录');

  await manual.token.saveToken('edited-token', 'alpha');
  assert.equal(manual.storage['adminToken:alpha'].userInfo, null, '手填 Token 必须清除旧账号元数据');
  assert.equal(manual.storage['adminToken:alpha'].origin, '');
  const operationsBeforeEditInjection = manual.operations.length;
  const editedResult = await manual.send('INJECT_ADMIN_TOKEN', manualPayload);
  assert.equal(editedResult.ok, false);
  assert.match(editedResult.error, /缺少用户信息.*登录并保存/);
  assert.equal(manual.operations.length, operationsBeforeEditInjection, '缺少用户信息时不能写入或跳转');
  assert.equal(manual.pageStorage.token, 'Bearer saved-token', '不能破坏网站原有的登录状态');
  assert.equal(JSON.parse(manual.pageStorage.userInfo).userId, 'saved-user');
  await manual.token.saveToken('', 'alpha');
  const count = manual.injections.length;
  assert.equal((await manual.send('INJECT_ADMIN_TOKEN', manualPayload)).ok, false);
  assert.equal(manual.injections.length, count, '没有 Token 时不得注入');

  for (const pageInfo of [undefined, 'null', '{invalid', '[]', '{}', '"text"']) {
    const legacy = createHarness();
    legacy.storage['adminToken:alpha'] = { token: 'saved-token', updatedAt: 1 };
    legacy.pageStorage.token = 'Bearer saved-token';
    if (pageInfo === undefined) delete legacy.pageStorage.userInfo;
    else legacy.pageStorage.userInfo = pageInfo;
    const result = await legacy.send('INJECT_ADMIN_TOKEN', manualPayload);
    assert.equal(result.ok, false, '旧 Token 缺少有效用户信息时不能误报注入成功');
    assert.match(result.error, /缺少用户信息.*登录并保存/);
    assert.deepEqual(legacy.operations, [], '用户信息不完整时不得写入或跳转');
  }

  const sameSession = createHarness();
  sameSession.storage['adminToken:alpha'] = { token: 'old-token', updatedAt: 1 };
  assert.equal((await sameSession.send('INJECT_ADMIN_TOKEN', manualPayload)).injected, true);
  assert.equal(JSON.parse(sameSession.pageStorage.userInfo).userId, 'old-user', '同一个 Token 可以复用网站现有用户信息');
  assert.equal(sameSession.operations.at(-1), `navigate:${origin}/`);

  const tokenOnlyLogin = createHarness();
  tokenOnlyLogin.responses.push(captcha, { code: 200, data: 'Bearer new-token' });
  const tokenOnlyResult = await tokenOnlyLogin.send('LOGIN_API', credentials);
  assert.equal(tokenOnlyResult.ok, true, '接口返回的有效 Token 仍应保存到插件');
  assert.equal(tokenOnlyResult.injection.injected, false);
  assert.match(tokenOnlyResult.injection.error, /缺少用户信息/);
  assert.deepEqual(tokenOnlyLogin.operations, ['save'], '登录响应缺少用户信息时不得自动写入或跳转');

  const source = createHarness();
  const sourceResult = await source.send('INJECT_ADMIN_TOKEN', { ...manualPayload, baseUrl: 'https://changed.example.test' });
  assert.equal(sourceResult.injected, true, '已登录 Token 应使用其实际来源，而非后来修改的 API 域名');

  for (const failure of ['script', 'write']) {
    const h = createHarness();
    if (failure === 'script') h.failScript(new Error('网站拒绝注入'));
    else h.failWrite(new Error('网站存储不可用'));
    h.responses.push(captcha, { code: 200, data: loginUser });
    const result = await h.send('LOGIN_API', credentials);
    assert.equal(result.ok, true, '注入失败不能变成验证码登录失败');
    assert.equal(result.injection.injected, false);
    assert.ok(result.injection.error);
    assert.equal(h.storage['adminToken:alpha'].token, 'new-token');
    assert.equal(h.operations.some((operation) => operation.startsWith('navigate:')), false, '未写入成功不能跳转');
  }

  console.log('admin token injection tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
