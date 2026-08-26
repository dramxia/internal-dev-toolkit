const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const quickUi = fs.readFileSync(path.join(root, 'src/popup/quick-login-ui.js'), 'utf8');
const quickStateStorage = fs.readFileSync(path.join(root, 'src/common/quick-login-state.js'), 'utf8');
const buildScript = fs.readFileSync(path.join(root, 'scripts/build.js'), 'utf8');
const quickUiModulePath = require.resolve('../src/popup/quick-login-ui.js');
const namespaceBeforeFormatTest = globalThis.InternalDevToolkit;
globalThis.InternalDevToolkit = { tenant: {}, messages: {} };
const {
  buildStudentAppLoginPayload,
  buildStudentCredentialsText,
  normalizeAppSiteUrl,
} = require(quickUiModulePath);
delete require.cache[quickUiModulePath];
globalThis.InternalDevToolkit = namespaceBeforeFormatTest;

const panelMatch = popupHtml.match(/<div class="panel" id="panel-quick">([\s\S]*?)<div class="panel" id="panel-other">/);
assert.ok(panelMatch, '应能提取 #panel-quick 静态结构');
const panel = panelMatch[1];

const legacyIds = [
  'quickLoginSection', 'quickLoginHeader', 'envBadge', 'quickLoginBody',
  'envOnlineBtn', 'envDevBtn', 'portField', 'localPort', 'targetEnvBadge',
  'modeTeacherBtn', 'modeStudentBtn', 'teacherModePanel', 'tenantSearch',
  'tenantList', 'tenantEmpty', 'deptSelect', 'userSearch', 'userList',
  'userEmpty', 'userPager', 'teacherRefreshBtn', 'teacherNameSearch',
  'teacherAccountSearch', 'teacherList', 'teacherEmpty', 'teacherPager',
  'studentSection', 'studentSectionTitle', 'studentRefreshBtn', 'teacherDuties',
  'studentNameSearch', 'studentCodeSearch', 'studentList', 'studentEmpty',
  'studentPager', 'studentModePanel', 'accountSearchField', 'accountSearch',
  'accountList', 'accountEmpty', 'accountPager', 'studentRelationPanel',
  'studentRelationRefreshBtn', 'lookupByStudentBtn', 'lookupByClassBtn',
  'teacherLookupSemesterSelect', 'studentSessionNote', 'lookupStudentPanel',
  'lookupStudentList', 'lookupStudentEmpty', 'lookupStudentPager',
  'lookupClassPanel', 'lookupClassSelect', 'lookupTeacherResultHead',
  'lookupTeacherResultTitle', 'lookupTeacherResultCount', 'lookupTeacherList',
  'lookupTeacherEmpty', 'recentList',
];

function staticIds(source) {
  return [...source.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
}

function requiredIds(source) {
  const block = source.match(/const REQUIRED_QUICK_IDS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(block, 'quick UI 应声明完整 DOM ID 契约');
  return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

const ids = staticIds(panel);
const required = requiredIds(quickUi);
assert.equal(new Set(ids).size, ids.length, '#panel-quick 内不得出现重复 ID');
assert.deepEqual([...required].sort(), [...ids].sort(), '静态结构应与 renderShell 校验契约完全一致');
legacyIds.forEach((id) => assert.ok(ids.includes(id), `必须保留原有 DOM ID #${id}`));

const renderShell = quickUi.match(/function renderShell\(\) \{([\s\S]*?)\n  \}\n\n  async function hasAdminToken/);
assert.ok(renderShell, '应保留 renderShell 初始化入口');
assert.doesNotMatch(renderShell[1], /innerHTML\s*=/, 'renderShell 不应再用第二份模板覆盖静态结构');
assert.match(renderShell[1], /REQUIRED_QUICK_IDS\.filter/, 'renderShell 应在运行时校验静态 DOM 契约');

const switchMode = quickUi.match(/function switchMode\(mode\) \{([\s\S]*?)\n  \}\n\n  function updateModeUI/);
assert.ok(switchMode, '应能提取查询模式切换逻辑');
assert.match(switchMode[1], /state\.mode = next;[\s\S]*updateModeUI\(\)/, '切换模式应只更新当前模式与可见面板');
assert.doesNotMatch(
  switchMode[1],
  /clearAllSessions\(\)|clearTeacherSession\(\)|clearStudentSession\(/,
  '教师查学生与学生查教师的查询状态应在模式切换后同时保留',
);
assert.match(buildScript, /'src\/common\/quick-login-state\.js'[\s\S]*'src\/popup\/quick-login-ui\.js'/, '查询状态存储模块应先于 UI 打包');
assert.match(quickUi, /await loadPersistedState\(\);[\s\S]*renderShell\(\);[\s\S]*bindEvents\(\);/, '首次渲染前应恢复查询快照');
assert.match(quickUi, /teacher:\s*\{[\s\S]*student:\s*\{/, '同一个快照应同时保存教师与学生查询状态');
assert.match(quickUi, /await rehydratePersistedSessions\(\);/, '恢复快照后应静默重建运行时会话');
assert.match(quickStateStorage, /normalized\.includes\('token'\)/, '存储层必须递归过滤 token 字段');
assert.match(quickStateStorage, /normalized === 'raw'/, '存储层不得保存原始接口响应');
const selectTeacherUser = quickUi.match(/async function selectTeacherUser\(user, row\) \{([\s\S]*?)\n  \}\n\n  async function loadTeachers/);
assert.ok(selectTeacherUser, '应能提取教师账号选择流程');
assert.match(
  selectTeacherUser[1],
  /t\.teacherNameKeyword = String\(t\.selectedUser\.userName \|\| ''\)\.trim\(\);[\s\S]*\$\('teacherNameSearch'\)\.value = t\.teacherNameKeyword;[\s\S]*await loadTeachers\(true\);/,
  '选择账号后应以账号名称自动填充并筛选 AI 教师',
);
const loadTeachers = quickUi.match(/async function loadTeachers\(reset\) \{([\s\S]*?)\n  \}\n\n  function renderTeachers/);
assert.ok(loadTeachers, '应能提取 AI 教师加载流程');
assert.match(
  loadTeachers[1],
  /const firstMatchedTeacher = reset && \(t\.teacherNameKeyword \|\| t\.teacherAccountKeyword\)[\s\S]*if \(firstMatchedTeacher\) \{[\s\S]*await selectTeacher\(firstMatchedTeacher\);/,
  'AI 教师筛选有结果时应自动选中第一项',
);

assert.ok(panel.indexOf('quick-recent-section') < panel.indexOf('quick-mode-switcher'), '最近登录应位于任务模式之前');
assert.match(panel, /id="teacherTenantSummary"/);
assert.match(panel, /id="teacherUserSummary"/);
assert.match(panel, /id="teacherIdentitySummary"/);
assert.match(panel, /id="studentAccountSummary"/);
assert.match(panel, /id="relationSelectionSummary"/);
assert.match(quickUi, /const DEFAULT_RECENT_VISIBLE = 3;/, '最近登录默认应只展示 3 条');
assert.match(quickUi, /records = records\.slice\(0, 10\)/, '最近登录仍应限制为最多 10 条');
assert.match(quickUi, /function recentTargetControls\([\s\S]*data-recent-env="online"[\s\S]*data-recent-env="local"/);
assert.match(quickUi, /function syncRecentRowTarget\([\s\S]*button\.dataset\.env = normalizedEnv;[\s\S]*button\.dataset\.localPort = normalizedPort;/);
assert.match(quickUi, /class="quick-recent-port"[^>]*inputmode="numeric"[^>]*autocomplete="off"/);
assert.match(quickUi, /function tenantUserTargetControls\([\s\S]*data-user-env="online"[\s\S]*data-user-env="local"/);
assert.match(quickUi, /class="quick-recent-port quick-user-port"[^>]*inputmode="numeric"[^>]*autocomplete="off"/);
assert.match(
  quickUi,
  /function renderTeacherUsers\([\s\S]*tenantUserTargetControls\(t\.selectedTenant, user, env, localPort\)[\s\S]*syncTenantUserRowTarget\(row, env, localPort\)/,
  '租户用户列表每行都应渲染并同步独立环境开关',
);
assert.match(
  quickUi,
  /function syncTenantUserRowTarget\([\s\S]*button\.dataset\.env = normalizedEnv;[\s\S]*button\.dataset\.localPort = normalizedPort/,
  '租户用户行级环境应写入该行登录操作按钮',
);
const tenantUserTargetClick = quickUi.match(/function onTenantUserTargetClick\(event\) \{([\s\S]*?)\n  \}\n\n  function onTenantUserPortInput/);
assert.ok(tenantUserTargetClick, '应能提取租户用户环境点击处理器');
assert.match(tenantUserTargetClick[1], /syncTenantUserRowTarget\(row, envButton\.dataset\.userEnv/);
assert.doesNotMatch(tenantUserTargetClick[1], /state\.env\s*=|clearAllSessions\(\)/, '租户用户行级切换不得联动顶部环境或清空会话');
assert.match(quickUi, /\$\('userList'\)\?\.addEventListener\('click', onTenantUserTargetClick\)/);
const recentClickHandler = quickUi.match(/async function onRecentClick\(event\) \{([\s\S]*?)\n  \}\n\n  \/\/ ── 事件绑定/);
assert.ok(recentClickHandler, '应能提取最近登录点击处理器');
assert.doesNotMatch(recentClickHandler[1], /state\.env\s*=|state\.mode\s*=|clearAllSessions\(\)/, '单条最近记录不得联动顶部环境或任务模式');
assert.match(recentClickHandler[1], /syncRecentRowTarget\(row, envButton\.dataset\.recentEnv/);
assert.doesNotMatch(recentClickHandler[1], /DELETE_QUICK_LOGIN_RECENT[\s\S]*?env:\s*meta\.env/, '删除最近记录不应再按环境匹配');

function tagFor(id) {
  const match = panel.match(new RegExp(`<(?:input|select)\\b[^>]*\\bid="${id}"[^>]*>`));
  assert.ok(match, `应存在字段 #${id}`);
  return match[0];
}

[
  'localPort', 'tenantSearch', 'userSearch', 'teacherNameSearch',
  'teacherAccountSearch', 'studentAppSiteUrl', 'studentNameSearch', 'studentCodeSearch', 'accountSearch',
].forEach((id) => {
  const tag = tagFor(id);
  assert.match(tag, /\btype="text"/);
  assert.match(tag, /\bautocomplete="off"/);
  assert.doesNotMatch(tag, /\bname=/);
});

['deptSelect', 'accountSearchField', 'teacherLookupSemesterSelect', 'lookupClassSelect'].forEach((id) => {
  const tag = tagFor(id);
  assert.doesNotMatch(tag, /\bname=/);
  assert.doesNotMatch(tag, /\bautocomplete=/);
});
assert.match(tagFor('teacherLookupSemesterSelect'), /\bdisabled\b/);

const expectedMessages = [
  'DELETE_QUICK_LOGIN_RECENT', 'FETCH_ACCOUNT_USERS', 'FETCH_CLASS_TEACHERS',
  'FETCH_SCHOOL_DEPT_TREE', 'FETCH_SEMESTERS', 'FETCH_STUDENTS',
  'FETCH_TEACHERS', 'FETCH_TEACHER_DETAIL', 'FETCH_TENANTS', 'FETCH_USERS',
  'GET_QUICK_LOGIN_RECENT', 'OPEN_LOGIN_URL', 'QUICK_LOGIN', 'RESOLVE_USER_SESSION',
].sort();
const requestMessages = [...quickUi.matchAll(/request\('([A-Z_]+)'/g)].map((match) => match[1]);
assert.deepEqual([...new Set(requestMessages)].sort(), expectedMessages, '消息类型契约不得增删或重命名');
assert.match(quickUi, /const savedLocalPort = meta\.localPort \? normalizePort\(meta\.localPort\) : '';/);
assert.match(quickUi, /request\('QUICK_LOGIN', Object\.assign\(\{\}, meta, \{ env, localPort: savedLocalPort \}\)\)/);
assert.match(quickUi, /buildDirectUrl\(url, targetLocalPort\)/);
assert.match(quickUi, /action === 'copy'[\s\S]*request\('RESOLVE_USER_SESSION'/, '复制应只解析运行时会话');
assert.match(quickUi, /request\('QUICK_LOGIN',[\s\S]*request\('OPEN_LOGIN_URL'/, '打开和评价应继续执行 QUICK_LOGIN 后打开 URL');
assert.doesNotMatch(quickUi, /chrome\.storage\.local\.(?:set|remove)/, 'quick UI 不得直接持久化 token 或会话');
assert.doesNotMatch(quickUi, /ns\.token\.saveToken/, 'quick UI 不得写入 admin token');

[
  '正在检查后台 Token...', '正在搜索租户...', '正在搜索学生账号...',
  '正在建立 AI 会话...', '正在获取登录链接...', '已选择', '读取失败',
].forEach((text) => assert.ok(popupHtml.includes(text) || quickUi.includes(text), `应覆盖状态文案：${text}`));
assert.match(panel, /role="status" aria-live="polite"/);
assert.match(panel, /role="tablist"/);
assert.match(panel, /aria-controls="teacherModePanel"/);
assert.match(popupHtml, /\.quick-list-button:focus-visible/);
assert.match(popupHtml, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(popupHtml, /@media \(max-width: 380px\)[\s\S]*\.quick-env-row/);
assert.match(popupHtml, /\.quick-recent-row[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
assert.match(popupHtml, /\.quick-recent-env-switcher[\s\S]*grid-template-columns: repeat\(2/);
assert.match(popupHtml, /\.quick-recent-port\s*\{[\s\S]*width:\s*72px/);
assert.match(popupHtml, /#userList\s*\{[\s\S]*max-height:\s*340px/);
assert.match(popupHtml, /\.quick-tenant-user-row\s*\{[\s\S]*display:\s*block/);
assert.match(popupHtml, /\.quick-user-avatar\s*\{[\s\S]*width:\s*34px[\s\S]*height:\s*34px/);
assert.match(popupHtml, /\.quick-user-toolbar\s*\{[\s\S]*grid-template-columns: minmax\(112px, 1fr\) auto/);
const quickUserToolbarStyles = popupHtml.match(/\.quick-user-toolbar\s*\{([^}]*)\}/);
assert.ok(quickUserToolbarStyles, '应定义租户用户操作工具栏样式');
assert.doesNotMatch(quickUserToolbarStyles[1], /border-top/, '租户用户项内部不应显示分割线');
assert.match(popupHtml, /\.quick-user-port\s*\{[\s\S]*width:\s*60px[\s\S]*height:\s*32px/);
assert.match(quickUi, /class="quick-user-avatar"[\s\S]*class="quick-user-toolbar"/);
assert.match(popupHtml, /\.quick-tenant-user-row:hover\s*\{\s*background:\s*var\(--sage-50\)/);
assert.match(popupHtml, /\.quick-tenant-user-row\.active:hover\s*\{\s*background:\s*var\(--sage-100\)/);

const visiblePanelText = panel.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
assert.doesNotMatch(visiblePanelText, /[—–]/, '目标面板可见文本不得包含长破折号或分隔用短破折号');

assert.match(popupHtml, /--sage-500:\s*#4A8C3F/);
assert.match(popupHtml, /--mint-400:\s*#34C98A/);
assert.match(popupHtml, /font-family:\s*'Inter', -apple-system, BlinkMacSystemFont, sans-serif/);
assert.match(popupHtml, /--radius-sm:\s*8px/);
assert.match(popupHtml, /--radius-md:\s*14px/);
assert.match(popupHtml, /--radius-lg:\s*20px/);
assert.match(popupHtml, /--radius-xl:\s*28px/);

async function testImmediateInvalidationBeforeDebouncedLoad() {
  const originalNamespace = globalThis.InternalDevToolkit;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = new Map();
  let timerId = 0;
  globalThis.setTimeout = (fn) => {
    const id = ++timerId;
    timers.set(id, fn);
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  globalThis.InternalDevToolkit = { tenant: {}, messages: {} };

  const modulePath = require.resolve('../src/popup/quick-login-ui.js');
  delete require.cache[modulePath];
  const { createDebouncedSearch } = require(modulePath);
  const requestState = { requestId: 0, rendered: [] };
  let resolveOldRequest;

  const load = async (keyword) => {
    const requestId = ++requestState.requestId;
    if (keyword === 'old') {
      await new Promise((resolve) => { resolveOldRequest = resolve; });
    }
    if (requestId === requestState.requestId) requestState.rendered.push(keyword);
  };
  const search = createDebouncedSearch(
    () => { requestState.requestId += 1; },
    load,
    300,
  );
  const flushTimer = () => {
    const entry = timers.entries().next().value;
    assert.ok(entry, '应存在待执行的防抖任务');
    timers.delete(entry[0]);
    return entry[1]();
  };

  search('old');
  assert.equal(requestState.requestId, 1, '输入时应立即使旧请求失效');
  const oldTask = flushTimer();
  assert.equal(requestState.requestId, 2, '旧请求已开始并捕获自己的 request ID');

  search('new');
  assert.equal(requestState.requestId, 3, '新输入应在新请求发出前立即淘汰旧响应');
  resolveOldRequest();
  await oldTask;
  assert.deepEqual(requestState.rendered, [], '延迟返回的旧响应不得渲染');

  await flushTimer();
  assert.deepEqual(requestState.rendered, ['new'], '防抖结束后只渲染最新搜索');

  delete require.cache[modulePath];
  globalThis.InternalDevToolkit = originalNamespace;
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
}

assert.match(quickUi, /createDebouncedSearch\(\(keyword\) => \{[\s\S]*t\.tenantRequestId \+= 1/);
assert.match(quickUi, /renderTeacherStudentArea\(message\)[\s\S]*pager\.classList\.add\('hidden'\)/);
assert.match(quickUi, /class="action-btn quick-action-btn student-copy-btn"/);
assert.match(
  quickUi,
  /row\.querySelector\('\.student-copy-btn'\)[\s\S]*addEventListener\('click'[\s\S]*buildStudentCredentialsText\(student, t\.selectedTenant\?\.tenantName\)[\s\S]*copyToClipboard\(credentials\)/,
  '学生复制按钮应复制当前行的登录信息',
);
assert.equal(
  buildStudentCredentialsText({ tenantName: '测试租户', account: 'student001', password: 'Student@789' }),
  '租户名称：测试租户\n学生账号：student001\n学生密码：Student@789',
);
assert.equal(
  buildStudentCredentialsText({ code: '202506002' }, '回退租户'),
  '租户名称：回退租户\n学生账号：202506002\n学生密码：Xx@123456',
);
assert.equal(normalizeAppSiteUrl('localhost:5173/student/home'), 'http://localhost:5173');
assert.equal(normalizeAppSiteUrl('https://app.example.com/path?x=1'), 'https://app.example.com');
assert.equal(normalizeAppSiteUrl('ftp://app.example.com'), '', 'APP 站点只允许 HTTP(S)');
assert.equal(normalizeAppSiteUrl('https://user:secret@app.example.com'), '', 'APP 站点不得包含账号信息');
assert.deepEqual(
  buildStudentAppLoginPayload(
    { code: '202506002' },
    { tenantId: 'tenant-139', tenantName: '指定租户' },
    'localhost:5173/path',
  ),
  {
    siteUrl: 'http://localhost:5173',
    account: '202506002',
    password: 'Xx@123456',
    tenantId: 'tenant-139',
    tenantName: '指定租户',
    recordHistory: true,
  },
  '学生 APP 登录应使用当前选中租户并规范化站点地址',
);
assert.throws(
  () => buildStudentAppLoginPayload({ code: '202506002' }, { tenantId: 'tenant-139' }, 'ftp://invalid.example.com'),
  /APP 站点地址无效/,
);
assert.match(quickUi, /type: 'APP_GET_CREDENTIALS'/, '相关学生区域应读取 APP 默认站点地址');
assert.match(
  quickUi,
  /student-app-login-btn[\s\S]*performStudentAppLogin\(student, event\.currentTarget, row\)/,
  '相关学生项应提供 APP 登录图标并绑定当前学生',
);
assert.match(
  quickUi,
  /button\.classList\.add\('is-loading'\)[\s\S]*button\.innerHTML = '<span class="spinner" aria-hidden="true"><\/span>'[\s\S]*type: 'APP_LOGIN', payload/,
  '学生 APP 登录应复用 APP_LOGIN 并展示单按钮 loading',
);
assert.match(popupHtml, /\.student-app-login-btn\.is-loading:disabled[\s\S]*cursor: wait;/);
assert.match(popupHtml, /id="studentAppSiteUrl"[^>]*aria-invalid="false"/, '相关学生区域应提供可校验的 APP 站点地址');
assert.match(quickUi, /s\.resolvingTeachers = true;\s*updateRelationBusy\(\)/);
const relationRenderer = quickUi.match(/async function renderRelationTeachers\(classId\) \{([\s\S]*?)\n  \}\n\n  async function refreshStudentRelation/);
assert.ok(relationRenderer, '应能提取教师账号反查流程');
assert.ok(
  relationRenderer[1].indexOf('invalidateRelationTeacherResolution()') < relationRenderer[1].indexOf('if (!cls)'),
  '新班级解析必须在无班级提前返回前取消旧反查',
);
assert.ok(
  relationRenderer[1].indexOf('invalidateRelationTeacherResolution()') < relationRenderer[1].indexOf('if (!rawTeachers.length)'),
  '无教师班级提前返回前必须清除旧 busy 状态',
);
const relationLoader = quickUi.match(/async function loadStudentRelationData\(\) \{([\s\S]*?)\n  \}\n\n  function selectMatchedStudent/);
assert.ok(relationLoader, '应能提取学生关系刷新流程');
assert.match(relationLoader[1], /s\.relationLoading = true;\s*invalidateRelationTeacherResolution\(\)/, '刷新或切学期应取消旧教师反查');

testImmediateInvalidationBeforeDebouncedLoad()
  .then(() => console.log('quick login UI regression tests passed'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
