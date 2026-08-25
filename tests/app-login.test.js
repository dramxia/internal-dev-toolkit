const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const storage = {};
const requests = [];
const pageStorage = {};
const operationOrder = [];
let reloadCount = 0;
let assignCount = 0;
let assignedUrl = '';
let executeDetails = null;
let siteTabsAvailable = true;

const loginUserInfo = {
  accessToken: 'Bearer app-session-token',
  userId: 'student-user-1',
  username: '测试学生',
  account: '20250003',
  tenantId: '139',
  tenantName: '未来智慧学校AI平台',
  studentId: 'student-1',
  customField: 'must-be-preserved',
};

const userDetailResponse = {
  code: 200,
  success: true,
  data: {
    id: 'student-1',
    account: '20250003',
    tenantId: '139',
    tenantName: '未来智慧学校AI平台',
    gradeName: '高一',
    className: '一班',
  },
};

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    async text() {
      return JSON.stringify(payload);
    },
  };
}

globalThis.InternalDevToolkitBg = {};
globalThis.fetch = async (url, options) => {
  requests.push({
    url: String(url),
    body: JSON.parse(options.body),
    headers: { ...options.headers },
  });

  if (String(url).includes('/getCaptcha?')) {
    return jsonResponse({ code: 200, success: true, data: true });
  }
  if (String(url).endsWith('/huayun-ai/app/auth/getCaptcha')) {
    return jsonResponse({
      code: 200,
      success: true,
      data: { ticket: 'captcha-ticket', blockX: 183 },
    });
  }
  if (String(url).endsWith('/huayun-ai/app/auth/studentLogin')) {
    return jsonResponse({ code: 200, success: true, data: loginUserInfo });
  }
  if (String(url).endsWith('/huayun-ai/app/user/detail')) {
    operationOrder.push('detail');
    return jsonResponse(userDetailResponse);
  }
  throw new Error(`unexpected request: ${url}`);
};

globalThis.localStorage = {
  setItem(key, value) {
    pageStorage[key] = String(value);
  },
};
globalThis.window = {
  location: {
    origin: 'http://localhost:5173',
    assign(url) {
      assignCount += 1;
      assignedUrl = String(url);
    },
    reload() {
      reloadCount += 1;
    },
  },
};

globalThis.chrome = {
  runtime: { lastError: null },
  storage: {
    local: {
      get(key, callback) {
        callback({ [key]: storage[key] });
      },
      set(values, callback) {
        if (Object.prototype.hasOwnProperty.call(values, 'appLoginHistory')) {
          operationOrder.push('history');
        }
        Object.assign(storage, values);
        callback();
      },
      remove(key, callback) {
        delete storage[key];
        callback();
      },
    },
  },
  cookies: {
    async get({ name }) {
      return name === 'JSESSIONID'
        ? { name: 'JSESSIONID', value: 'test-session-id' }
        : null;
    },
  },
  tabs: {
    query(queryInfo, callback) {
      if (!siteTabsAvailable) {
        callback([]);
        return;
      }
      if (queryInfo.active) {
        callback([{ id: 7, url: 'http://localhost:5173/student/home' }]);
        return;
      }
      callback([]);
    },
  },
  scripting: {
    async executeScript(details) {
      operationOrder.push('inject');
      executeDetails = details;
      details.func(...details.args);
      return [];
    },
  },
};

const modulePath = require.resolve('../src/background/app-login.js');
delete require.cache[modulePath];
require(modulePath);

(async () => {
  const appLogin = globalThis.InternalDevToolkitBg.appLogin;
  storage.appLoginCredentials = { siteUrl: '', account: '', password: '' };
  assert.equal(appLogin.DEFAULT_SITE_URL, 'http://localhost:5173');
  assert.equal(
    (await appLogin.getCredentials()).siteUrl,
    'http://localhost:5173',
    '没有已保存地址时应使用本地 App 默认站点',
  );
  assert.equal(appLogin.normalizeSiteUrl('localhost:5173/student/home'), 'http://localhost:5173');
  assert.equal(appLogin.normalizeSiteUrl('https://app.example.com/path?x=1'), 'https://app.example.com');
  assert.equal(appLogin.normalizeSiteUrl('ftp://app.example.com'), '', '站点地址只允许 HTTP(S)');
  assert.equal(appLogin.normalizeSiteUrl('https://user:secret@app.example.com'), '', '站点地址不得包含账号信息');
  await assert.rejects(
    () => appLogin.loginAndInject({ siteUrl: 'ftp://app.example.com' }),
    /站点地址无效，请输入 HTTP\(S\) 地址/,
  );
  assert.equal(requests.length, 0, '无效站点地址不得发起登录 API 请求');
  siteTabsAvailable = false;
  await assert.rejects(
    () => appLogin.loginAndInject({ siteUrl: 'http://localhost:5173' }),
    /未找到已打开的 http:\/\/localhost:5173 页面/,
  );
  assert.equal(requests.length, 0, '找不到同源注入页面时不得发起登录 API 请求');
  siteTabsAvailable = true;
  assert.deepEqual(
    appLogin.extractStudentPlacement(userDetailResponse),
    { gradeName: '高一', className: '一班' },
    '应从用户详情直接字段提取年级班级',
  );
  assert.deepEqual(
    appLogin.extractStudentPlacement({
      data: {
        grade: { name: '初二' },
        clazz: { deptName: '三班' },
      },
    }),
    { gradeName: '初二', className: '三班' },
    '应兼容嵌套年级和班级对象',
  );

  const result = await appLogin.loginAndInject({
    account: '20250003',
    password: 'student-password',
    tenantId: '139',
  });

  assert.equal(requests.length, 4, '登录应依次发起验证码、验证码校验、学生登录和用户详情请求');
  assert.equal(requests[0].url, 'http://localhost:5173/huayun-ai/app/auth/getCaptcha');
  assert.equal(
    requests[1].url,
    'http://localhost:5173/huayun-ai/app/auth/getCaptcha?moveLength=183&ticket=captcha-ticket',
  );
  assert.deepEqual(requests[1].body, {
    params: { moveLength: 183, ticket: 'captcha-ticket' },
  });

  const expectedHash = crypto.createHash('sha256').update('student-password').digest('hex');
  assert.equal(requests[2].url, 'http://localhost:5173/huayun-ai/app/auth/studentLogin');
  assert.deepEqual(requests[2].body, {
    account: '20250003',
    password: expectedHash,
    tenantId: '139',
    moveLength: 183,
    ticket: 'captcha-ticket',
  });
  assert.equal(requests[3].url, 'http://localhost:5173/huayun-ai/app/user/detail');
  assert.deepEqual(requests[3].body, { id: 'student-1' }, '用户详情请求应使用登录返回的 studentId');
  assert.equal(requests[3].headers.Accept, '*/*');
  assert.equal(requests[3].headers.Authorization, 'Bearer app-session-token');
  assert.equal(requests[3].headers['anxun-auth'], 'bearer Bearer app-session-token');
  assert.match(requests[3].headers.Cookie, /(?:^|; )JSESSIONID=test-session-id(?:;|$)/);

  assert.equal(result.token, 'app-session-token');
  assert.deepEqual(result.userInfo, loginUserInfo, '完整登录 data 应作为 userInfo 保留');
  assert.deepEqual(result.userDetail, userDetailResponse, '完整用户详情接口出参应保留在登录结果中');
  assert.equal(result.gradeName, '高一');
  assert.equal(result.className, '一班');
  assert.equal(result.tabId, 7);
  assert.equal(storage.appLoginToken.token, 'app-session-token');
  assert.deepEqual(storage.appLoginToken.user, loginUserInfo);
  assert.deepEqual(storage.appLoginToken.userDetail, userDetailResponse, 'Token 状态应保存用户详情以便重新打开时恢复展示');
  assert.equal(storage.appLoginToken.gradeName, '高一');
  assert.equal(storage.appLoginToken.className, '一班');

  assert.equal(executeDetails.target.tabId, 7);
  assert.equal(executeDetails.world, 'MAIN');
  assert.equal(pageStorage.token, 'Bearer app-session-token');
  assert.deepEqual(JSON.parse(pageStorage.userInfo), loginUserInfo);
  assert.equal(reloadCount, 0, '注入登录态后不得刷新当前页面');
  assert.equal(assignedUrl, 'http://localhost:5173/', '注入登录态后应跳转到当前页面根地址');

  // 注入成功后应记录历史（供历史列表一键登录复用）
  assert.ok(Array.isArray(storage.appLoginHistory), '登录成功后应写入历史记录');
  assert.equal(storage.appLoginHistory.length, 1, '同一账号重复登录时历史应去重');
  const historyRecord = storage.appLoginHistory[0];
  assert.equal(historyRecord.siteUrl, 'http://localhost:5173');
  assert.equal(historyRecord.account, '20250003');
  assert.equal(historyRecord.password, 'student-password');
  assert.equal(historyRecord.tenantId, '139');
  assert.equal(historyRecord.tenantName, '未来智慧学校AI平台');
  assert.equal(historyRecord.username, '测试学生', '历史记录应冗余用户名便于展示');
  assert.deepEqual(historyRecord.userDetail, userDetailResponse, '历史记录应保存完整用户详情接口出参');
  assert.equal(historyRecord.gradeName, '高一', '历史记录应保存规范化年级名称');
  assert.equal(historyRecord.className, '一班', '历史记录应保存规范化班级名称');
  assert.ok(
    operationOrder.indexOf('detail') < operationOrder.indexOf('history'),
    '必须先获取用户详情再写入历史记录',
  );
  assert.ok(
    operationOrder.indexOf('history') < operationOrder.indexOf('inject'),
    '登录历史必须在页面注入跳转前完成持久化',
  );

  const historyBeforeRelogin = structuredClone(storage.appLoginHistory);
  const historyWritesBeforeRelogin = operationOrder.filter((item) => item === 'history').length;
  await appLogin.loginAndInject({
    siteUrl: historyRecord.siteUrl,
    account: historyRecord.account,
    password: historyRecord.password,
    tenantId: historyRecord.tenantId,
    tenantName: historyRecord.tenantName,
    recordHistory: false,
  });
  assert.equal(requests.length, 8, '历史一键登录应重新执行包含用户详情在内的四段请求');
  assert.deepEqual(storage.appLoginHistory, historyBeforeRelogin, '历史一键登录不得改写、重排或更新时间');
  assert.equal(
    operationOrder.filter((item) => item === 'history').length,
    historyWritesBeforeRelogin,
    '历史一键登录不得再次写入 appLoginHistory',
  );
  assert.equal(assignCount, 2, '普通登录和历史登录都应跳转到当前页面根地址');

  const backgroundIndex = fs.readFileSync(
    path.resolve(__dirname, '../src/background/index.js'),
    'utf8',
  );
  assert.match(
    backgroundIndex,
    /APP_LOGIN:\s*\(p\)\s*=>\s*ns\.appLogin\.loginAndInject\(p\)/,
    'App tab 的 APP_LOGIN 消息应执行登录、注入和根地址跳转完整链路',
  );

  let backgroundMessageListener = null;
  globalThis.InternalDevToolkit = {
    currentProject: {
      async loadCurrentProject() {},
      async migrateOldStorageKeys() {},
      getName() { return 'test'; },
    },
  };
  globalThis.chrome.runtime.onMessage = {
    addListener(listener) {
      backgroundMessageListener = listener;
    },
  };
  const backgroundIndexPath = require.resolve('../src/background/index.js');
  delete require.cache[backgroundIndexPath];
  require(backgroundIndexPath);
  assert.equal(typeof backgroundMessageListener, 'function', 'Background 应注册消息监听器');

  const historyResponse = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('APP_GET_HISTORY 响应超时')), 100);
    const keepAlive = backgroundMessageListener(
      { type: 'APP_GET_HISTORY' },
      {},
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
    );
    assert.equal(keepAlive, true, 'APP_GET_HISTORY 应保持异步消息通道');
  });
  assert.equal(historyResponse.ok, true);
  assert.ok(Array.isArray(historyResponse.records), 'APP_GET_HISTORY 应通过 records 字段返回数组');
  assert.equal(historyResponse.records.length, 1, '消息响应应包含已写入的登录历史');
  assert.equal(historyResponse.records[0].account, '20250003');
  assert.deepEqual(historyResponse.records[0].userDetail, userDetailResponse, '历史消息应返回完整用户详情');
  assert.equal(historyResponse.records[0].gradeName, '高一');
  assert.equal(historyResponse.records[0].className, '一班');

  const popupUi = fs.readFileSync(
    path.resolve(__dirname, '../src/popup/app-login-ui.js'),
    'utf8',
  );
  const popupHtml = fs.readFileSync(
    path.resolve(__dirname, '../popup.html'),
    'utf8',
  );
  const loginHandler = popupUi.match(/async function handleLogin\([\s\S]*?\n  \}\n\n  \/\/ ── 历史记录/);
  assert.ok(loginHandler, '应能提取 App 一键登录处理器');
  assert.doesNotMatch(loginHandler[0], /登录成功|正在获取 token/, '成功过程不应显示提示');
  assert.match(loginHandler[0], /setStatus\('', ''\);[\s\S]*?type: 'APP_LOGIN'/, '重试登录前应清理旧提示');
  assert.match(loginHandler[0], /setStatus\(formatLoginError\(err\), 'err'\)/, '登录错误应使用统一格式和自动关闭策略');
  assert.match(loginHandler[0], /tenantName: state\.selectedSchool\?\.tenantName \|\| ''/, '登录时应记录所选学校名称');
  assert.match(popupUi, /gradeName: res\.gradeName \|\| ''[\s\S]*className: res\.className \|\| ''/, '顶部学生信息应读取 Token 中的年级班级');
  assert.match(popupUi, /`年级：\$\{tokenState\.gradeName\}`[\s\S]*`班级：\$\{tokenState\.className\}`/, '顶部学生信息应展示年级班级标签');
  assert.match(popupUi, /r\.gradeName \? `年级：\$\{r\.gradeName\}`[\s\S]*r\.className \? `班级：\$\{r\.className\}`/, '历史记录应展示年级班级标签');
  assert.match(popupUi, /escapeHtml\(metaParts\.join\(' · '\)\)/, '历史记录元信息应安全输出年级班级');
  assert.doesNotMatch(popupUi, /data-password=/, '历史记录 DOM 不应暴露密码');
  assert.match(popupUi, /findHistoryRecord\(siteUrl, account, tenantId\)[\s\S]*record\?\.password[\s\S]*await handleLogin\(form, \{[\s\S]*recordHistory: false,[\s\S]*\}\)/, '历史一键登录应读取存储凭据并显式禁止重复记录');
  const historyClickHandler = popupUi.match(/async function onHistoryClick\(e\)[\s\S]*?\n  \}\n\n  \/\/ ── 事件绑定/);
  assert.ok(historyClickHandler, '应能提取 App 历史记录点击处理器');
  assert.doesNotMatch(historyClickHandler[0], /groupBtns|querySelectorAll\('\.recent-action-btn'\)/, '历史重登不得批量修改同一行按钮');
  assert.match(historyClickHandler[0], /btn\.classList\.add\('is-loading'\);[\s\S]*btn\.setAttribute\('aria-busy', 'true'\);[\s\S]*<span class="spinner" aria-hidden="true"><\/span>/, '历史重登应为当前按钮设置可见 loading 和忙碌状态');
  assert.match(historyClickHandler[0], /btn\.classList\.remove\('is-loading'\);[\s\S]*btn\.removeAttribute\('aria-busy'\);[\s\S]*btn\.innerHTML = originalHtml;/, '历史重登完成后应恢复当前按钮');
  assert.match(historyClickHandler[0], /updateMainButton: false,[\s\S]*refreshHistory: false,[\s\S]*recordHistory: false,/, '历史重登不得修改顶部按钮、重绘历史或重复记录');
  assert.match(popupHtml, /\.recent-action-btn\.is-loading:disabled \{[\s\S]*opacity: 1;[\s\S]*cursor: wait;/, 'loading 按钮不得套用不可见的禁用透明度');
  assert.match(popupHtml, /\.spinner \{[\s\S]*width: 14px;[\s\S]*height: 14px;[\s\S]*animation: spinner-rotate \.65s linear infinite;/, 'spinner 应有稳定尺寸和旋转动画');
  assert.match(popupHtml, /@keyframes spinner-rotate \{[\s\S]*transform: rotate\(360deg\);/, 'spinner 旋转关键帧必须存在');
  assert.match(popupUi, /let eventsBound = false;/, 'App UI 应维护事件绑定状态');
  assert.match(popupUi, /function bindEvents\(\) \{\s*if \(eventsBound\) return;\s*eventsBound = true;/, 'App UI 重复初始化时不得叠加事件监听器');
  const historyRenderer = popupUi.match(/async function renderHistory\(\)[\s\S]*?\n  \}\n\n  async function findHistoryRecord/);
  assert.ok(historyRenderer, '应能提取 App 历史记录渲染器');
  assert.match(historyRenderer[0], /const displayLimit = state\.historyExpanded \? 20 : 5;/, '非空历史应从 App 状态读取展开标记');
  assert.match(historyRenderer[0], /state\.historyExpanded = !state\.historyExpanded;/, '历史展开按钮应更新 App 状态');
  assert.match(popupUi, /const APP_ERROR_AUTO_HIDE_MS = 3200;/, 'App 错误提示应短时自动关闭');

  console.log('app login injection tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
