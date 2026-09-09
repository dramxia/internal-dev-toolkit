const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto, createHash } = require('node:crypto');

const root = path.join(__dirname, '..');
const projectId = 'alpha';
const domainA = 'https://alpha.example.test';
const domainB = 'https://beta.example.test';
const jwt = (exp) => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
const validToken = jwt(Math.floor(Date.now() / 1000) + 3600);
const betaToken = jwt(Math.floor(Date.now() / 1000) + 7200);
const expiredToken = jwt(Math.floor(Date.now() / 1000) - 3600);
const hash = (value) => createHash('sha256').update(value).digest('hex');

function harness() {
  const storage = {};
  const requests = [];
  const responses = [];
  const injections = [];
  let failWrite = false;
  let cachedBaseUrl = domainA;
  let handler;
  let resolveUiRequest;
  const project = { id: projectId, enabledFeatures: ['adminPanel', 'quickLogin'], authPath: '/auth', cookieKeys: [], tenantApiPaths: { tenantPage: '/tenant/page' } };
  const context = vm.createContext({
    URL, TextEncoder, atob, crypto: webcrypto, console, setTimeout, clearTimeout,
    module: { exports: {} },
    InternalDevToolkit: {
      projects: { getById: (id) => id === projectId ? project : null },
      currentProject: {
        getCachedProjectId: () => projectId,
        getCurrentProjectId: async () => projectId,
        getBaseUrl: () => cachedBaseUrl,
        getAuthPath: () => project.authPath,
        getCookieKeys: () => [],
        getTenantApiPaths: () => project.tenantApiPaths,
        loadCurrentProject: async () => {}, migrateOldStorageKeys: async () => {}, getName: () => projectId,
      },
      customDomain: { setCachedOverride: (value) => { cachedBaseUrl = value; } },
      messages: { sendToBackground: () => new Promise((resolve) => { resolveUiRequest = resolve; }) },
    },
    InternalDevToolkitBg: {
      cookies: { getWafCookiesForUrl: async () => '' },
      adminTokenInjection: { autoInject: async (state) => { injections.push(state); return { injected: false }; } },
    },
    chrome: {
      runtime: { lastError: null, onMessage: { addListener: (fn) => { handler = fn; } } },
      storage: { local: {
        get(key, cb) { const result = { [key]: structuredClone(storage[key]) }; if (cb) cb(result); else return Promise.resolve(result); },
        set(values, cb) {
          if (failWrite) {
            context.chrome.runtime.lastError = { message: 'test write failure' };
            cb?.();
            context.chrome.runtime.lastError = null;
            return;
          }
          Object.assign(storage, structuredClone(values));
          cb?.();
        },
        remove(key, cb) { delete storage[key]; cb?.(); },
      } },
    },
    fetch: async (url, options) => {
      requests.push({ url, headers: options.headers, body: JSON.parse(options.body) });
      assert.ok(responses.length, '不得向未准备的接口发送请求');
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return { ok: !response.http || response.http < 400, status: response.http || 200, text: async () => JSON.stringify(response.data ?? response) };
    },
  });
  const load = (file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  for (const file of [
    'src/common/admin-login-history.js', 'src/common/token.js', 'src/common/tenant.js',
    'src/common/quick-login-state.js', 'src/background/api.js', 'src/background/tenant-api.js',
    'src/background/index.js', 'src/popup/quick-login-ui.js',
  ]) load(file);
  return {
    storage, requests, responses, injections,
    api: context.InternalDevToolkitBg.api,
    tenantApi: context.InternalDevToolkitBg.tenantApi,
    history: context.InternalDevToolkit.adminLoginHistory,
    queryStorage: context.InternalDevToolkit.quickLoginStateStorage,
    quickUi: context.module.exports,
    set failWrite(value) { failWrite = value; },
    resolveUi(value) { resolveUiRequest(value); },
    send(message) { return new Promise((resolve) => handler(message, {}, resolve)); },
  };
}

const record = (overrides = {}) => ({ account: 'same-account', password: 'test-password', token: validToken, baseUrl: domainA, userInfo: { userId: 'user-1' }, ...overrides });
const activeInfo = (h) => JSON.stringify({ credentials: h.storage['adminCredentials:alpha'], token: h.storage['adminToken:alpha'], domain: h.storage['customBaseUrl:alpha'], session: h.storage['adminSession:alpha'] });

(async () => {
  const h = harness();
  assert.equal(h.history.tokenExpiresAt(validToken) > Date.now(), true);
  assert.equal(h.history.tokenExpiresAt(`Bearer ${expiredToken}`) < Date.now(), true);
  assert.equal(h.history.tokenExpiresAt('opaque-token'), null);
  assert.equal(h.history.tokenExpiresAt('bad.invalid.token'), null);
  assert.equal(h.history.identity(' same-account ', `${domainA}/`), h.history.identity('same-account', domainA));
  assert.throws(() => h.history.normalizeBaseUrl('https://user:password@example.test'), /API 地址/);

  await h.history.activate(record());
  await h.history.activate(record({ baseUrl: `${domainB}/`, password: 'beta-password', token: betaToken }));
  const entries = await h.history.getRecords();
  assert.equal(entries.length, 2, '同一账号的不同 API 地址必须分开记录');
  assert.equal(entries[0].baseUrl, domainB);
  assert.equal(entries[0].password, 'beta-password');
  assert.equal(entries[1].password, 'test-password');
  await h.history.activate(record({ password: 'updated-password' }));
  assert.equal((await h.history.getRecords()).length, 2, '同一账号和域名更新原记录');

  h.storage['quickLoginQueryState:alpha'] = { state: { teacher: { selectedUser: { id: 'old-user' } } } };
  h.storage['quickLoginRecent:alpha'] = [{ id: 'old-user' }];
  const applied = await h.api.applyHistory({ id: entries[0].id, projectId });
  assert.equal(applied.reused, true);
  assert.equal(h.requests.length, 0, '有效 JWT 应直接应用，不调用登录接口');
  assert.equal(h.storage['adminCredentials:alpha'].password, 'beta-password');
  assert.equal(h.storage['adminToken:alpha'].token, betaToken);
  assert.equal(h.storage['adminToken:alpha'].origin, domainB);
  assert.equal(h.storage['adminToken:alpha'].userInfo.userId, 'user-1');
  assert.equal(h.storage['customBaseUrl:alpha'].baseUrl, domainB);
  assert.equal(h.storage['quickLoginQueryState:alpha'], null);
  assert.deepEqual(h.storage['quickLoginRecent:alpha'], []);
  h.responses.push({ data: { code: 200, data: { records: [], total: 0 } } });
  await h.tenantApi.fetchTenantPage({ size: 1 });
  assert.equal(h.requests.at(-1).url, `${domainB}/tenant/page`);
  assert.equal(h.requests.at(-1).headers.Authorization, `Bearer ${betaToken}`, '师生查询使用切换后的 Token');

  await h.history.activate(record({ token: expiredToken, account: 'expired-account', password: 'expired-password' }));
  const expiredEntry = (await h.history.getRecords())[0];
  await h.history.activate(record({ baseUrl: domainB, token: validToken }));
  const beforeLogin = activeInfo(h);
  h.responses.push(
    { data: { code: 200, data: { ticket: 'ticket', blockX: 50 } } },
    { data: { code: 200, data: '验证码已发送' } },
  );
  const pending = await h.api.applyHistory({ id: expiredEntry.id, projectId });
  assert.equal(pending.requiresVerification, true);
  assert.equal(activeInfo(h), beforeLogin, '等待验证码不能提前切换账号或域名');
  assert.equal(h.requests.at(-1).url, `${domainA}/auth/login`);
  assert.equal(h.requests.at(-1).body.password, hash('expired-password'));
  assert.equal(h.requests.at(-1).body.mobile, 'expired-account');
  h.responses.push({ data: { code: 500, message: '验证码错误' } });
  await assert.rejects(h.api.verifyLogin({ verification: pending.verification, code: 'wrong' }), /验证码错误/);
  assert.equal(activeInfo(h), beforeLogin, '验证失败保留当前账号及对应域名');
  h.responses.push({ data: { code: 200, data: { accessToken: `Bearer ${validToken}`, userId: 'renewed-user' } } });
  await h.api.verifyLogin({ verification: pending.verification, code: '123456' });
  const renewed = (await h.history.getRecords())[0];
  assert.equal(renewed.id, expiredEntry.id);
  assert.equal(renewed.token, validToken);
  assert.equal(renewed.password, 'expired-password');
  assert.equal(renewed.baseUrl, domainA);
  assert.equal(h.injections.at(-1).userInfo.userId, 'renewed-user');

  const direct = harness();
  direct.responses.push(
    { data: { code: 200, data: { ticket: 'ticket' } } },
    { data: { code: 200, data: { token: validToken, userId: 'direct-user' } } },
  );
  await direct.api.doLogin({ account: 'direct-account', password: 'direct-password', baseUrl: domainB, projectId });
  assert.equal((await direct.history.getRecords())[0].baseUrl, domainB, '历史必须记录实际登录地址');
  assert.equal((await direct.history.getRecords())[0].account, 'direct-account');
  assert.equal((await direct.history.getRecords())[0].password, 'direct-password');
  const beforeFailure = activeInfo(direct);
  direct.responses.push(
    { data: { code: 200, data: { ticket: 'ticket' } } },
    { data: { code: 500, message: '密码错误' } },
  );
  await assert.rejects(direct.api.doLogin({ account: 'failed-account', password: 'wrong-password' }), /密码错误/);
  assert.equal((await direct.history.getRecords()).length, 1, '登录失败不新增历史');
  assert.equal(activeInfo(direct), beforeFailure);
  direct.failWrite = true;
  await assert.rejects(direct.history.activate(record()), /write failure/);
  assert.equal(activeInfo(direct), beforeFailure, '存储失败不能只切换部分账号信息');

  const opaque = harness();
  await opaque.history.activate(record({ token: 'opaque-token', baseUrl: domainB }));
  const opaqueEntry = (await opaque.history.getRecords())[0];
  await opaque.history.activate(record());
  opaque.responses.push({ data: { code: 200, data: { records: [] } } });
  assert.equal((await opaque.api.applyHistory({ id: opaqueEntry.id, projectId })).reused, true);
  assert.equal(opaque.requests[0].url, `${domainB}/tenant/page`);
  assert.equal(opaque.requests[0].headers.Authorization, 'Bearer opaque-token', '验证历史 Token 不得使用当前账号的 Token');
  const beforeNetworkError = activeInfo(opaque);
  opaque.responses.push(new Error('network unavailable'));
  await assert.rejects(opaque.api.applyHistory({ id: opaqueEntry.id, projectId }), /network unavailable/);
  assert.equal(activeInfo(opaque), beforeNetworkError);
  opaque.responses.push({ http: 401 }, { data: { code: 200, data: { ticket: 'ticket' } } }, { data: { code: 200, data: { token: validToken } } });
  assert.equal((await opaque.api.applyHistory({ id: opaqueEntry.id, projectId })).token, validToken, '后台确认 Token 失效后应重新登录');

  const reset = harness();
  await reset.history.activate(record());
  const oldSession = await reset.history.getSession();
  reset.quickUi.resetForAdminSession(oldSession, true);
  Object.assign(reset.quickUi.state.teacher, { tenantKeyword: '旧租户', selectedTenant: { tenantId: 'old' }, selectedUser: { aiToken: 'old-ai-token' }, loadingUsers: true, userRequestId: 10 });
  Object.assign(reset.quickUi.state.student, { keyword: '旧学生', selectedAccount: { session: { aiToken: 'old-student-token' } }, relationTeacherCache: { old: ['old-teacher'] } });
  const snapshot = reset.quickUi.createPersistedState();
  await reset.queryStorage.save(snapshot);
  const delayed = reset.quickUi.request('FETCH_USERS', {});
  await reset.history.activate(record({ baseUrl: domainB, token: 'new-admin-token' }));
  const newSession = await reset.history.getSession();
  reset.quickUi.resetForAdminSession(newSession, true);
  reset.resolveUi({ ok: true, res: { records: ['old-response'] } });
  await assert.rejects(delayed, /已切换/);
  assert.equal(reset.quickUi.state.teacher.selectedTenant, null);
  assert.equal(reset.quickUi.state.teacher.selectedUser, null);
  assert.equal(reset.quickUi.state.teacher.tenantKeyword, '');
  assert.equal(reset.quickUi.state.teacher.userRequestId, 11);
  assert.equal(reset.quickUi.state.teacher.loadingUsers, false);
  assert.equal(reset.quickUi.state.student.selectedAccount, null);
  assert.equal(reset.quickUi.state.student.keyword, '');
  assert.equal(Object.keys(reset.quickUi.state.student.relationTeacherCache).length, 0);
  assert.equal(await reset.queryStorage.save(snapshot), null, '旧账号的延迟保存不得恢复旧查询信息');
  reset.storage['quickLoginQueryState:alpha'] = { version: 1, state: snapshot };
  assert.equal(await reset.queryStorage.load(), null, '重新打开侧栏时也不能恢复其他账号的查询快照');
  const staleMessage = await reset.send({ type: 'FETCH_TENANTS', payload: {}, adminSessionId: oldSession.id });
  assert.equal(staleMessage.ok, false);
  assert.match(staleMessage.error, /账号已切换/);
  assert.equal(reset.requests.length, 0, '旧账号排队中的请求不能用新 Token 发送');

  console.log('admin login history and account switching tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
