const assert = require('node:assert/strict');

// 「打开 AI 平台」在目标与当前标签页同源时原地跳转，否则新开标签页。
globalThis.InternalDevToolkitBg = {};
globalThis.InternalDevToolkit = {
  currentProject: {
    async getCurrentProjectId() { return 'gpt-admin-pre'; },
  },
};

let activeTabs = [];
let queries = [];
let updates = [];
let creates = [];
let queryError = '';

globalThis.chrome = {
  runtime: { lastError: null },
  storage: { local: { get(key, cb) { cb({}); }, set(_v, cb) { cb?.(); } } },
  tabs: {
    query(queryInfo, cb) {
      queries.push(queryInfo);
      if (queryError) {
        chrome.runtime.lastError = { message: queryError };
        cb(undefined);
        chrome.runtime.lastError = null;
        return;
      }
      cb(activeTabs);
    },
    update(tabId, props, cb) {
      updates.push({ tabId, ...props });
      cb({ id: tabId, url: props.url });
    },
    create(props, cb) {
      creates.push(props);
      cb({ id: 900 + creates.length, url: props.url });
    },
  },
};

const modulePath = require.resolve('../src/background/quick-login.js');
delete require.cache[modulePath];
const { openLoginUrl } = require(modulePath);

function reset(tabs = []) {
  activeTabs = tabs;
  queries = [];
  updates = [];
  creates = [];
  queryError = '';
}

async function run() {
  // 线上：当前标签页已在该租户线上域名 → 原地跳转
  reset([{ id: 11, active: true, url: 'https://tenant.example.test/home/index' }]);
  let result = await openLoginUrl('https://tenant.example.test/?token=abc', { reuseCurrentTab: true });
  assert.deepEqual(result, { tabId: 11, reused: true }, '同源应复用当前标签页');
  assert.deepEqual(queries, [{ active: true, lastFocusedWindow: true }], '只应查询当前窗口的活动标签页');
  assert.deepEqual(updates, [{ tabId: 11, url: 'https://tenant.example.test/?token=abc', active: true }]);
  assert.equal(creates.length, 0, '同源时不得新开标签页');

  // 线上：当前标签页是别的域名 → 新开标签页
  reset([{ id: 12, active: true, url: 'https://other.example.test/home' }]);
  result = await openLoginUrl('https://tenant.example.test/?token=abc', { reuseCurrentTab: true });
  assert.equal(result.reused, false);
  assert.equal(updates.length, 0, '异源不得顶掉当前页面');
  assert.deepEqual(creates, [{ url: 'https://tenant.example.test/?token=abc', active: true }]);

  // 线上目标 vs 同域名但协议不同的当前页 → 视为不符合
  reset([{ id: 13, active: true, url: 'http://tenant.example.test/home' }]);
  assert.equal((await openLoginUrl('https://tenant.example.test/?token=abc', { reuseCurrentTab: true })).reused, false);
  assert.equal(creates.length, 1, '协议不一致应新开标签页');

  // 本地：地址与端口全部一致 → 原地跳转
  reset([{ id: 21, active: true, url: 'http://localhost:8088/student-evaluate' }]);
  result = await openLoginUrl('http://localhost:8088/?token=abc', { reuseCurrentTab: true });
  assert.deepEqual(result, { tabId: 21, reused: true }, '本地同端口应复用当前标签页');

  // 本地：端口不一致 → 新开标签页
  reset([{ id: 22, active: true, url: 'http://localhost:8089/' }]);
  assert.equal((await openLoginUrl('http://localhost:8088/?token=abc', { reuseCurrentTab: true })).reused, false);
  assert.equal(creates.length, 1, '端口不一致应新开标签页');

  // 本地：主机不一致（127.0.0.1 与 localhost 不等价）→ 新开标签页
  reset([{ id: 23, active: true, url: 'http://127.0.0.1:8088/' }]);
  assert.equal((await openLoginUrl('http://localhost:8088/?token=abc', { reuseCurrentTab: true })).reused, false);

  // 当前标签页是扩展页/新标签页等非 HTTP 页面 → 新开标签页
  reset([{ id: 24, active: true, url: 'chrome://newtab/' }]);
  assert.equal((await openLoginUrl('https://tenant.example.test/?token=abc', { reuseCurrentTab: true })).reused, false);

  // 标签页仍在导航时用 pendingUrl 判断
  reset([{ id: 25, active: true, url: '', pendingUrl: 'https://tenant.example.test/loading' }]);
  assert.equal((await openLoginUrl('https://tenant.example.test/?token=abc', { reuseCurrentTab: true })).reused, true);

  // 评价类入口不传 reuseCurrentTab：即使同源也始终新开标签页
  reset([{ id: 31, active: true, url: 'https://tenant.example.test/home' }]);
  result = await openLoginUrl('https://tenant.example.test/student-evaluate?token=abc');
  assert.equal(result.reused, false, '未开启复用时必须新开标签页');
  assert.equal(queries.length, 0, '未开启复用时不应查询标签页');
  assert.equal(creates.length, 1);

  // 查询标签页失败不应让打开操作失败
  reset([{ id: 41, active: true, url: 'https://tenant.example.test/home' }]);
  queryError = '无可用窗口';
  result = await openLoginUrl('https://tenant.example.test/?token=abc', { reuseCurrentTab: true });
  assert.equal(result.reused, false);
  assert.equal(creates.length, 1, '查询失败应回退为新开标签页');

  // 地址校验保持不变
  reset();
  await assert.rejects(() => openLoginUrl('', { reuseCurrentTab: true }), /缺少 URL/);
  await assert.rejects(() => openLoginUrl('not a url', { reuseCurrentTab: true }), /登录地址无效/);
  await assert.rejects(() => openLoginUrl('javascript:alert(1)', { reuseCurrentTab: true }), /仅允许打开 HTTP\(S\) 登录地址/);
  assert.equal(creates.length, 0, '非法地址不得打开任何标签页');
}

run().then(() => {
  console.log('quick-login-open-tab tests passed');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
