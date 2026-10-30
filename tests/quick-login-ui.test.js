const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const quickUi = fs.readFileSync(path.join(root, 'src/popup/quick-login-ui.js'), 'utf8');
const quickStateStorage = fs.readFileSync(path.join(root, 'src/common/quick-login-state.js'), 'utf8');
const buildScript = fs.readFileSync(path.join(root, 'scripts/build.js'), 'utf8');
const tenantModulePath = require.resolve('../src/common/tenant.js');
const quickUiModulePath = require.resolve('../src/popup/quick-login-ui.js');
const namespaceBeforeFormatTest = globalThis.InternalDevToolkit;
globalThis.InternalDevToolkit = { tenant: {}, messages: {}, userCard: require('../src/popup/user-card.js') };
delete require.cache[tenantModulePath];
require(tenantModulePath);
const {
  actionMeta,
  buildAiReviewUrl,
  buildRecentTeacherSelection,
  buildStudentAppLoginPayload,
  buildStudentCredentialsText,
  createPersistedState,
  getStudentReachableStep,
  getTeacherReachableStep,
  findUniqueTeacherMatch,
  normalizeAppSiteUrl,
  state: quickUiState,
} = require(quickUiModulePath);
delete require.cache[quickUiModulePath];
delete require.cache[tenantModulePath];
globalThis.InternalDevToolkit = namespaceBeforeFormatTest;

const panelMatch = popupHtml.match(/<div class="panel" id="panel-quick">([\s\S]*?)<div class="panel" id="panel-other">/);
assert.ok(panelMatch, '应能提取 #panel-quick 静态结构');
const panel = panelMatch[1];
assert.doesNotMatch(popupHtml, /class="tab-btn|data-tab=/, '任务工作台不应继续渲染旧功能 Tab');
assert.match(popupHtml, /id="workspaceDock"[^>]*aria-label="工具任务"/, '侧边栏应提供固定任务坞');
assert.match(panel, /id="quickStepProgress"[^>]*aria-label="查询步骤"/, '师生关系应使用步骤画布');
assert.match(panel, /section-header-title">师生关联查询<\/span>/, '快捷查询面板应保留能力名称供辅助状态使用');
assert.doesNotMatch(popupHtml, />一键快捷登录<\//, '“一键快捷登录”不得继续作为模块标题');

const legacyIds = [
  'quickLoginSection', 'quickLoginHeader', 'quickLoginBody',
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
assert.doesNotMatch(panel, /查询环境|开发端口|id="(?:envBadge|targetEnvBadge|envOnlineBtn|envDevBtn|portField|localPort|quickEnvLabel)"/, '师生查询不得保留全局目标环境控件');
assert.doesNotMatch(quickUi, /state\.(?:env|devPort)|function (?:targetEnv|switchEnv|updateEnvUI|updateEnvBadge|clearAllSessions)\b/, '目标环境不得再使用会清空查询会话的全局状态');
const persistedStateBlock = quickUi.match(/function createPersistedState\(source = state\) \{([\s\S]*?)\n  \}\n\n  function restorePersistedState/);
assert.ok(persistedStateBlock, '应能提取查询快照构建逻辑');
assert.doesNotMatch(persistedStateBlock[1], /\benv:\s*source\.env|\bdevPort:/, '查询快照不得再保存全局环境和端口');
assert.match(quickUi, /function actionMeta\([\s\S]*env: normalizeEnv\(button\.dataset\.env\)[\s\S]*localPort: normalizePort\(button\.dataset\.localPort\)/, '登录操作只能读取对应记录上的目标环境');
const persistedWithoutGlobalTarget = createPersistedState(Object.assign({}, quickUiState, { env: 'dev', devPort: '5173' }));
assert.equal(Object.hasOwn(persistedWithoutGlobalTarget, 'env'), false, '旧全局环境字段不得继续写入查询快照');
assert.equal(Object.hasOwn(persistedWithoutGlobalTarget, 'devPort'), false, '旧全局端口字段不得继续写入查询快照');
assert.equal(actionMeta({ dataset: {} }).env, 'online', '未设置记录级环境时应默认线上');
assert.equal(actionMeta({ dataset: {} }).localPort, '8088', '未设置记录级端口时应保留本地默认端口');
const reviewToken = 'Bearer demo+token/with=symbols';
const reviewLoginUrl = 'https://tenant.example.test/newHome?token=' + encodeURIComponent(reviewToken);
const reviewApps = { code: 200, data: [
  { name: '其他应用', linkUrl: 'https://other.example.test/' },
  { name: 'AI评价系统', linkUrl: 'https://review.example.test/evaluate?school=1&token=old#home' },
] };
const reviewUrl = new URL(buildAiReviewUrl(reviewLoginUrl, reviewApps));
assert.equal(reviewUrl.origin, 'https://review.example.test', '线上应打开 AI评价系统配置的域名');
assert.equal(reviewUrl.pathname, '/evaluate');
assert.equal(reviewUrl.searchParams.get('school'), '1', '应保留应用链接已有参数');
assert.deepEqual(reviewUrl.searchParams.getAll('token'), [reviewToken], '应使用当前账号完整 token 替换旧 token，且不重复编码');
assert.equal(reviewUrl.hash, '#home');
const localReviewUrl = new URL(buildAiReviewUrl(reviewLoginUrl, reviewApps, '5173'));
assert.equal(localReviewUrl.origin, 'http://localhost:5173', '本地模式应使用当前行的端口');
assert.equal(localReviewUrl.pathname, reviewUrl.pathname);
assert.equal(localReviewUrl.search, reviewUrl.search);
assert.equal(localReviewUrl.hash, reviewUrl.hash);
const relativeReviewUrl = new URL(buildAiReviewUrl(reviewLoginUrl, [{ name: 'AI评价系统', linkUrl: '/ai-review' }]));
assert.equal(relativeReviewUrl.origin, 'https://tenant.example.test', '应用使用相对地址时应基于租户域名');
assert.equal(relativeReviewUrl.pathname, '/ai-review');
assert.throws(() => buildAiReviewUrl(reviewLoginUrl, { data: [] }), /未配置 AI评价系统链接/);
assert.throws(() => buildAiReviewUrl('https://tenant.example.test', reviewApps), /未找到 AI 平台 token/);
assert.throws(() => buildAiReviewUrl('invalid', reviewApps), /AI 平台登录地址无效/);
assert.throws(
  () => buildAiReviewUrl(reviewLoginUrl, [{ name: 'AI评价系统', linkUrl: 'javascript:alert(1)' }], '5173'),
  /必须是 HTTP\(S\) 地址/,
  '切换本地环境前也必须验证应用链接协议',
);
assert.equal(getTeacherReachableStep({}), 0, '未选择租户时只能停留在教师流程第一步');
assert.equal(getTeacherReachableStep({ selectedTenant: {} }), 1, '选择租户后应解锁账号步骤');
assert.equal(getTeacherReachableStep({ selectedTenant: {}, selectedUser: {} }), 2, '选择账号后应解锁教师步骤');
assert.equal(
  getTeacherReachableStep({ selectedTenant: {}, selectedUser: {}, selectedTeacher: {} }),
  3,
  '选择教师后应解锁学生步骤',
);
assert.equal(getStudentReachableStep({ selectedAccount: {} }), 0, '学生账号没有会话时不得进入关联教师步骤');
assert.equal(getStudentReachableStep({ selectedAccount: { session: {} } }), 1, '学生账号会话就绪后应解锁关联教师步骤');

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
const progressNavigation = quickUi.match(/function onProgressClick\(event\) \{([\s\S]*?)\n  \}\n\n  function renderShell/);
assert.ok(progressNavigation, '应能提取步骤导航点击逻辑');
assert.match(progressNavigation[1], /navigateToStep\(state\.mode, index\)/, '点击步骤只应切换当前展开步骤');
assert.doesNotMatch(
  progressNavigation[1],
  /changeTeacher|changeStudent|clearTeacherSession|clearStudentSession/,
  '步骤导航不得复用会清空选择的修改流程',
);
const changeStepHandlers = quickUi.match(/function changeTeacherTenant\(\) \{([\s\S]*?)\n  \}\n\n  \/\/ ── 登录操作/);
assert.ok(changeStepHandlers, '应能提取步骤汇总条的更换逻辑');
assert.match(changeStepHandlers[0], /navigateToStep\('teacher', 0\)/);
assert.match(changeStepHandlers[0], /navigateToStep\('teacher', 1\)/);
assert.match(changeStepHandlers[0], /navigateToStep\('teacher', 2\)/);
assert.match(changeStepHandlers[0], /navigateToStep\('student', 0\)/);
assert.doesNotMatch(
  changeStepHandlers[0],
  /selected(?:Tenant|User|Teacher|Account|Student)\s*=\s*null|clearTeacherSession|clearStudentSession/,
  '点击已完成步骤或“更换”只应展开原数据，不应清空任何已选项',
);
assert.match(quickUi, /activeStep: boundedStep\(t\.activeStep, 3\)/, '教师流程当前步骤应写入查询快照');
assert.match(quickUi, /activeStep: boundedStep\(s\.activeStep, 1\)/, '学生流程当前步骤应写入查询快照');
assert.match(quickUi, /button\.disabled = index > maxStep;/, '所有已解锁步骤都应可以反复切换');
const renderProgress = quickUi.match(/function renderProgress\(\) \{([\s\S]*?)\n  \}\n\n  function onProgressClick/);
assert.ok(renderProgress, '应能提取步骤进度渲染逻辑');
assert.doesNotMatch(renderProgress[1], /track\.innerHTML\s*=/, '步骤状态更新不得重建全部进度按钮');
assert.match(renderProgress[1], /track\.querySelectorAll\('\.quick-progress-step'\)/, '步骤按钮应复用现有节点');
assert.match(quickUi, /persistenceTimer = setTimeout\(flushPersistedState, 250\)/, '查询快照写入应使用 250ms debounce');
assert.match(quickUi, /if \(signature === lastPersistedSignature\) return;/, '相同查询快照不得重复写 storage');
assert.doesNotMatch(persistedStateBlock[1], /regularAccountsByTenant|relationTeacherCache/, '大型运行时关系缓存不得写入持久化快照');
// 列表行改为按 key 就地复用：选中态不进签名，所以「换个选中项」不再整列拆掉重建
// （点击时焦点会随行一起消失，那正是面板闪烁的来源）。
assert.match(quickUi, /function reconcileList\(listEl, items, spec = \{\}\)/, '应提供按 key 复用列表行的工具');
assert.match(quickUi, /row\.dataset\.rowSignature === signature/, '内容签名未变的行必须原样复用');
const teacherUsersRenderer = quickUi.match(/function renderTeacherUsers\(deps\) \{([\s\S]*?)\n  \}\n\n  async function selectTeacherUser/);
assert.ok(teacherUsersRenderer, '应能提取教师账号列表渲染逻辑');
assert.match(teacherUsersRenderer[1], /reconcileList\(list, normalized/, '教师账号列表应复用行而非整列重建');
assert.match(teacherUsersRenderer[1], /sync: \(row, user\)[\s\S]*userCard\.setSelected\(row, selected\)/, '教师账号选中态应就地改写');
const accountUsersRenderer = quickUi.match(/function renderAccountUsers\(\) \{([\s\S]*?)\n  \}\n\n  async function selectStudentAccount/);
assert.ok(accountUsersRenderer, '应能提取学生账号列表渲染逻辑');
assert.match(accountUsersRenderer[1], /reconcileList\(list, s\.accountPage\.records/, '学生账号列表应复用行而非整列重建');
assert.match(accountUsersRenderer[1], /sync: \(row, account\)[\s\S]*userCard\.setSelected\(row, selected\)/, '学生账号选中态应就地改写');
assert.match(quickUi, /el\.dataset\.pagerSignature === signature/, '分页结构未变时不得重建分页器');
assert.match(quickUi, /resultList\?\.dataset\.relationRenderKey === renderKey/, '班级与学生都没变时不得重放关联教师列表');
assert.match(quickUi, /transitionView\(update, 'quick'\)/, '关系模式和步骤切换应使用显式视图过渡');
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
  /t\.teacherAccountKeyword = String\(t\.selectedUser\.account \|\| t\.selectedUser\.phone \|\| ''\)\.trim\(\);[\s\S]*\$\('teacherAccountSearch'\)\.value = t\.teacherAccountKeyword;[\s\S]*await loadTeachers\(true\);/,
  '选择账号后应优先按账号或手机号查询 AI 教师',
);
const loadTeachers = quickUi.match(/async function loadTeachers\(reset, preserveSelection = false\) \{([\s\S]*?)\n  \}\n\n  function renderTeachers/);
assert.ok(loadTeachers, '应能提取 AI 教师加载流程');
assert.match(
  loadTeachers[1],
  /findUniqueTeacherMatch\(t\.teacherPage, t\.selectedUser\)/,
  '自动选择应核对教师与登录账号的身份',
);
const matchingUser = { tenantId: 'school', userId: 'person-1', account: 'zhangsan02', phone: '13800001234' };
const matchingTeacher = { id: 'teacher-1', tenantId: 'school', account: 'zhangsan02' };
assert.equal(findUniqueTeacherMatch({ total: 1, records: [matchingTeacher] }, matchingUser), matchingTeacher);
assert.equal(findUniqueTeacherMatch({ total: 2, records: [matchingTeacher] }, matchingUser), null, '跨页存在多个候选人时保留人工选择');
assert.equal(findUniqueTeacherMatch({ total: 1, records: [{ id: 'teacher-2', name: '张三' }] }, matchingUser), null, '姓名相同仍需核对账号身份');
assert.equal(findUniqueTeacherMatch({ total: 1, records: [{ ...matchingTeacher, userId: 'person-2' }] }, matchingUser), null, '共有用户编号冲突时保留人工选择');
assert.equal(findUniqueTeacherMatch({ total: 1, records: [{ ...matchingTeacher, tenantId: 'other' }] }, matchingUser), null, '其他租户的教师保留人工选择');
assert.equal(findUniqueTeacherMatch({ total: 1, records: [{ id: 'teacher-3', phone: '13800001234' }] }, matchingUser)?.id, 'teacher-3');

assert.ok(panel.indexOf('quick-recent-section') < panel.indexOf('quick-mode-switcher'), '最近登录应位于任务模式之前');
assert.match(panel, /id="teacherTenantSummary"/);
assert.match(panel, /id="teacherUserSummary"/);
assert.match(panel, /id="teacherIdentitySummary"/);
assert.match(panel, /id="studentAccountSummary"/);
assert.match(panel, /id="relationSelectionSummary"/);
assert.match(quickUi, /const DEFAULT_RECENT_VISIBLE = 3;/, '最近登录默认应只展示 3 条');
assert.match(quickUi, /const allRecords = records\.slice\(0, 10\)/, '最近登录仍应限制为最多 10 条');
assert.match(quickUi, /recentRoleFilter[\s\S]*recentEnvFilter/, '最近使用工具屏应支持角色与环境过滤');
assert.ok(buildScript.indexOf("'src/popup/user-card.js'") < buildScript.indexOf("'src/popup/quick-login-ui.js'"), '公共用户卡片应在查询界面前加载');
assert.match(quickUi, /renderUserSummary\('teacherUserSummary'/);
assert.match(quickUi, /renderUserSummary\('studentAccountSummary'/);
assert.match(
  quickUi,
  /async function selectStudentAccount\([\s\S]*const env = normalizeEnv\(row\?\.dataset\.env\);[\s\S]*const localPort = normalizePort\(row\?\.dataset\.localPort\);[\s\S]*s\.selectedAccount = Object\.assign\(\{\}, account, \{ env, localPort \}\)/,
  '选择学生账号时应把该行环境和端口写入选中记录',
);
const actionTargetChange = quickUi.match(/function onActionTargetChange\(event\) \{([\s\S]*?)\n  \}\n\n  async function onUserPhoneCopy/);
assert.ok(actionTargetChange, '应能提取记录级环境选择处理器');
assert.match(actionTargetChange[1], /syncActionTarget\(container, select\.value/);
assert.doesNotMatch(actionTargetChange[1], /clearTeacherSession\(\)|clearStudentSession\(\)/, '切换环境应保留查询会话');
assert.match(quickUi, /for \(const id of \['quickLoginBody', 'recentList'\]\)[\s\S]*addEventListener\('change', onActionTargetChange\)/, '查询结果与历史页面应共用环境选择处理器');
assert.match(
  quickUi,
  /function persistSummaryTarget\(container\) \{[\s\S]*?#teacherUserSummary[\s\S]*?t\.selectedUser = Object\.assign[\s\S]*?#studentAccountSummary[\s\S]*?s\.selectedAccount = Object\.assign/,
  '教师和学生汇总条的目标环境都应写回查询快照',
);
const extraClickHandler = quickUi.match(/async function onUserCardExtraClick\(event\) \{([\s\S]*?)\n  \}\n\n  \/\/ ── 事件绑定/);
assert.ok(extraClickHandler, '应能提取卡片扩展操作处理器');
assert.match(extraClickHandler[1], /action === 'apply'[\s\S]*applyRecentToTeacherLookup\(meta, button/);
assert.match(extraClickHandler[1], /action === 'changeTeacherUser'[\s\S]*changeTeacherUser\(\)/);
assert.match(extraClickHandler[1], /action === 'changeStudentAccount'[\s\S]*changeStudentAccount\(\)/);
assert.match(quickUi, /if \(t\.studentError\) throw new Error\(t\.studentError\)/, '学生查询失败不得被应用成功提示覆盖');
assert.doesNotMatch(extraClickHandler[1], /DELETE_QUICK_LOGIN_RECENT[\s\S]*?env:\s*meta\.env/, '删除最近记录不应再按环境匹配');

assert.deepEqual(
  buildRecentTeacherSelection({
    tenantId: 'tenant-139',
    tenantName: '示例租户',
    domain: 'tenant.example.test',
    industry: 3,
    id: 'login-user-7',
    userName: '王老师',
    role: 'teacher',
    env: 'local',
    localPort: '5173',
  }),
  {
    selectedTenant: {
      tenantId: 'tenant-139',
      tenantName: '示例租户',
      domain: 'tenant.example.test',
      contactName: '',
      contactPhone: '',
      industry: 3,
    },
    selectedUser: {
      id: 'login-user-7',
      userId: '',
      userName: '王老师',
      phone: '',
      account: '',
      deptId: '',
      deptName: '',
      tenantId: 'tenant-139',
      accessKey: '',
      roleName: '',
    },
    env: 'local',
    localPort: '5173',
  },
  '教师最近记录应恢复租户、账号和该记录自己的目标环境',
);
const recentWithPhone = buildRecentTeacherSelection({ tenantId: 'tenant-139', id: 'user-1', userName: '王老师', role: 'teacher', account: 'wang', phone: '13800001234', roleName: '校长' });
assert.equal(recentWithPhone.selectedUser.phone, '13800001234', '应用最近记录时应保留手机号');
assert.equal(recentWithPhone.selectedUser.account, 'wang');
assert.equal(recentWithPhone.selectedUser.roleName, '校长');
assert.throws(
  () => buildRecentTeacherSelection({ tenantId: 'tenant-139', id: 'student-1', userName: '学生甲', role: 'student' }),
  /仅教师最近记录可应用到教师查学生/,
);

function tagFor(id) {
  const match = panel.match(new RegExp(`<(?:input|select)\\b[^>]*\\bid="${id}"[^>]*>`));
  assert.ok(match, `应存在字段 #${id}`);
  return match[0];
}

[
  'tenantSearch', 'userSearch', 'teacherNameSearch',
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
  'DELETE_QUICK_LOGIN_RECENT', 'FETCH_ACCOUNT_USERS', 'FETCH_CLASS_TEACHERS', 'FETCH_DEPTS', 'FETCH_OTHER_APPS',
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
assert.match(
  quickUi,
  /request\('OPEN_LOGIN_URL', \{ url: target, reuseCurrentTab: action === 'open' \}\)/,
  '仅「打开 AI 平台」允许在同源时复用当前标签页',
);
assert.match(quickUi, /opened\?\.reused \? '已在当前标签页打开 AI 平台' : '已打开 AI 平台'/, '应区分原地跳转与新开标签页的提示');
assert.doesNotMatch(quickUi, /chrome\.storage\.local\.(?:set|remove)/, 'quick UI 不得直接持久化 token 或会话');
assert.doesNotMatch(quickUi, /ns\.token\.saveToken/, 'quick UI 不得写入 admin token');

[
  '正在检查后台 Token...', '正在搜索租户...', '正在搜索学生账号...',
  '正在建立 AI 会话...', '正在复制 Token…', '已选择', '读取失败',
].forEach((text) => assert.ok(popupHtml.includes(text) || quickUi.includes(text), `应覆盖状态文案：${text}`));
assert.match(panel, /role="status" aria-live="polite"/);
assert.match(
  panel,
  /section-header-right[\s\S]*id="quickAuthNotice"[\s\S]*class="chevron"[\s\S]*id="quickLoginBody"/,
  '后台 Token 状态应位于查询区标题栏，避免打断主内容',
);
assert.doesNotMatch(
  panel.match(/<div class="quick-context">([\s\S]*?)<\/div>/)?.[1] || '',
  /quickAuthNotice/,
  '主内容状态区不应重复展示后台 Token 成功标识',
);
assert.match(quickUi, /notice\.title = text;/, '窄屏截断 Token 状态时应保留完整提示');
assert.match(panel, /role="tablist"/);
assert.match(panel, /aria-controls="teacherModePanel"/);
assert.match(popupHtml, /\.quick-list-button:focus-visible/);
assert.match(popupHtml, /@media \(prefers-reduced-motion: reduce\)/);
assert.doesNotMatch(popupHtml, /\.quick-env-row/, '全局查询环境布局样式应一并删除');
assert.match(popupHtml, /#userList\s*\{[\s\S]*max-height:\s*340px/);
assert.match(popupHtml, /\.quick-user-card\.list-item\s*\{[\s\S]*display:\s*block/);
assert.match(popupHtml, /\.quick-user-avatar\s*\{[\s\S]*width:\s*30px[\s\S]*height:\s*30px/);

const visiblePanelText = panel.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');
assert.doesNotMatch(visiblePanelText, /[—–]/, '目标面板可见文本不得包含长破折号或分隔用短破折号');

assert.match(popupHtml, /--sage-500:\s*#4A7C59/);
assert.match(popupHtml, /--mint-400:\s*#6E8C7F/);
assert.match(popupHtml, /font-family:\s*'Inter', -apple-system, BlinkMacSystemFont, sans-serif/);
assert.match(popupHtml, /--radius-sm:\s*10px/);
assert.match(popupHtml, /--radius-md:\s*16px/);
assert.match(popupHtml, /--radius-lg:\s*22px/);
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
  globalThis.InternalDevToolkit = { tenant: {}, messages: {}, userCard: require('../src/popup/user-card.js') };

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
// 行会被 reconcileList 复用，所以处理器读 row.__item（每轮渲染都会刷新）而不是捕获
// 创建当时的 student，避免复用行上挂着上一轮的数据。
assert.match(
  quickUi,
  /row\.querySelector\('\.student-copy-btn'\)[\s\S]*addEventListener\('click'[\s\S]*buildStudentCredentialsText\(row\.__item, t\.selectedTenant\?\.tenantName\)[\s\S]*copyToClipboard\(credentials\)/,
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
  /student-app-login-btn[\s\S]*performStudentAppLogin\(row\.__item, event\.currentTarget, row\)/,
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
const relationRenderer = quickUi.match(/async function renderRelationTeachers\(classId[^)]*\) \{([\s\S]*?)\n  \}\n\n  async function refreshStudentRelation/);
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

async function testTenantUserRowRender() {
  const originalNamespace = globalThis.InternalDevToolkit;
  globalThis.InternalDevToolkit = { tenant: {}, messages: {}, userCard: require('../src/popup/user-card.js') };
  delete require.cache[tenantModulePath];
  require(tenantModulePath);
  delete require.cache[quickUiModulePath];
  const { renderTeacherUsers, state } = require(quickUiModulePath);

  class StubClassList {
    constructor(owner) { this.owner = owner; }
    _set(values) { this.owner._classes = new Set(values); }
    add(...names) { names.forEach((n) => this.owner._classes.add(n)); }
    remove(...names) { names.forEach((n) => this.owner._classes.delete(n)); }
    contains(name) { return this.owner._classes.has(name); }
    toggle(name, force) {
      const on = force === undefined ? !this.owner._classes.has(name) : !!force;
      if (on) this.owner._classes.add(name); else this.owner._classes.delete(name);
      return on;
    }
  }
  const VOID_TAGS = new Set(['input', 'br', 'hr', 'img', 'meta', 'link', 'path', 'polyline', 'rect', 'circle', 'line']);
  class StubElement {
    constructor(tagName) {
      this.tagName = String(tagName).toUpperCase();
      this.children = [];
      this.parentNode = null;
      this.attributes = {};
      this.dataset = {};
      this.style = {};
      this._classes = new Set();
      this.classList = new StubClassList(this);
      this.textContent = '';
      this._innerHTML = '';
    }
    set className(value) { this.classList._set(String(value).split(/\s+/).filter(Boolean)); }
    get className() { return [...this._classes].join(' '); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; }
    /* 简化解析：扫描所有开标签，按闭合标签维护父子栈；SVG 子标签视为 void */
    set innerHTML(value) {
      this._innerHTML = String(value);
      this.children = [];
      if (VOID_TAGS.has(this.tagName.toLowerCase())) return;
      const stack = [this];
      const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
      let match;
      while ((match = tagRe.exec(this._innerHTML)) !== null) {
        const [, closeSlash, rawTag, rawAttrs] = match;
        const tag = rawTag.toLowerCase();
        if (closeSlash) {
          for (let i = stack.length - 1; i > 0; i -= 1) {
            if (stack[i].tagName === tag.toUpperCase()) { stack.length = i; break; }
          }
          continue;
        }
        const el = new StubElement(tag);
        String(rawAttrs || '').replace(/([\w-]+)(?:="([^"]*)")?/g, (m, name, val) => {
          if (name.startsWith('data-')) {
            const key = name.replace(/^data-/, '').replace(/-([a-z])/g, (s, c) => c.toUpperCase());
            el.dataset[key] = val === undefined ? '' : val;
          } else if (name === 'class') {
            el.className = val || '';
          } else if (name === 'disabled') {
            el.disabled = true;
          } else {
            el.setAttribute(name, val === undefined ? '' : val);
          }
          return m;
        });
        const parent = stack[stack.length - 1];
        el.parentNode = parent;
        parent.children.push(el);
        if (!VOID_TAGS.has(tag) && !/\/>$/.test(match[0])) stack.push(el);
      }
    }
    get innerHTML() { return this._innerHTML; }
    get disabled() { return !!this._disabled; }
    set disabled(value) { this._disabled = !!value; }
    _walk(visit) {
      for (const child of this.children) {
        if (visit(child) === false) return false;
        if (child._walk(visit) === false) return false;
      }
      return true;
    }
    querySelector(selector) {
      let found = null;
      this._walk((el) => {
        if (matchesSelector(el, selector)) { found = el; return false; }
        return true;
      });
      return found;
    }
    querySelectorAll(selector) {
      const out = [];
      this._walk((el) => { if (matchesSelector(el, selector)) out.push(el); return true; });
      return out;
    }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      child.parentNode = null;
      return child;
    }
    insertBefore(child, ref) {
      const existing = this.children.indexOf(child);
      if (existing >= 0) this.children.splice(existing, 1);
      const at = ref ? this.children.indexOf(ref) : -1;
      if (at >= 0) this.children.splice(at, 0, child);
      else this.children.push(child);
      child.parentNode = this;
      return child;
    }
    addEventListener() {}
  }
  function matchesSelector(el, selector) {
    if (selector.startsWith('.')) return el._classes.has(selector.slice(1));
    if (selector.startsWith('[') && selector.endsWith(']')) {
      const name = selector.slice(1, -1);
      return name in el.attributes;
    }
    return el.tagName === selector.toUpperCase();
  }

  const listEl = new StubElement('div');
  const emptyEl = new StubElement('div');
  const pagerEl = new StubElement('div');
  const ids = { userList: listEl, userEmpty: emptyEl, userPager: pagerEl };
  const pagerCalls = [];
  const deps = {
    $: (id) => ids[id] || null,
    document: { createElement: (tag) => new StubElement(tag) },
    buildPagerUI: (el, page, cb) => { pagerCalls.push({ el, page: Object.assign({}, page), cb }); },
  };

  state.teacher.selectedTenant = {
    tenantId: 'tenant-1', tenantName: '示例租户', domain: 'example.test', industry: 3,
  };
  state.teacher.selectedUser = null;
  state.teacher.loadingSession = false;
  state.teacher.userError = '';
  state.teacher.loadingUsers = false;
  state.teacher.userPage = {
    current: 1,
    size: 10,
    total: 2,
    records: [
      { id: 'u-1', username: '王丽华', account: 'wanglihua01', roleName: '校长' },
      { id: 'u-2', username: '张强', account: '13800001111', roleName: '' },
    ],
  };

  renderTeacherUsers(deps);

  assert.equal(listEl.children.length, 2, '应渲染两条租户用户行');
  assert.ok(!listEl.classList.contains('hidden'), '列表应可见');
  assert.ok(emptyEl.classList.contains('hidden'), '空态应隐藏');

  const row = listEl.children[0];
  assert.ok(row.classList.contains('quick-tenant-user-row'), '行应使用租户用户样式');
  assert.equal(row.dataset.env, 'online', '行默认目标环境应为线上');

  const selectBtn = row.querySelector('.quick-row-select');
  assert.ok(selectBtn, '行内应有选择按钮');
  assert.equal(selectBtn.getAttribute('aria-pressed'), 'false');
  assert.ok(row.querySelector('.quick-user-avatar'), '行内应有头像');

  const toolbar = row.querySelector('.quick-user-toolbar');
  assert.ok(toolbar, '行内应有工具栏');
  const envSelect = row.querySelector('.quick-user-env-select');
  assert.ok(envSelect, '身份区应有原生环境选择框');
  assert.equal(envSelect.value, 'online');
  const portInput = row.querySelector('.quick-user-port');
  assert.ok(portInput, '卡片应有本地端口输入');
  assert.equal(portInput.getAttribute('aria-label'), '王丽华的本地端口');
  const actionBtns = row.querySelectorAll('.action-btn');
  assert.equal(actionBtns.length, 5, '工具栏应包含 AI评价（前海港湾）等 5 个登录操作');
  ['open', 'copy', 'student', 'aiReview', 'teacher'].forEach((action, index) => {
    assert.equal(actionBtns[index].dataset.action, action);
    assert.equal(actionBtns[index].dataset.env, 'online', '操作按钮应同步行环境');
    assert.equal(actionBtns[index].dataset.tenantId, 'tenant-1');
  });
  assert.match(actionBtns[0].getAttribute('aria-label'), /打开 AI 平台（线上）/, '操作按钮标签应包含目标环境');

  assert.equal(pagerCalls.length, 1, '应渲染分页');
  assert.equal(pagerCalls[0].el, pagerEl);
  assert.equal(typeof pagerCalls[0].cb, 'function');

  // 面板闪烁的根因就在这里：以前换个选中项会把整列拆掉重建，正在被点击的按钮随之
  // 从 DOM 消失（焦点掉回 body、每行重排）。现在必须原地复用同一批节点。
  const rowsBefore = [...listEl.children];
  state.teacher.selectedUser = { id: 'u-2' };
  renderTeacherUsers(deps);
  assert.equal(listEl.children.length, 2, '换选中项后行数不变');
  assert.ok(listEl.children[0] === rowsBefore[0] && listEl.children[1] === rowsBefore[1],
    '换选中项不得重建列表行');
  assert.ok(!listEl.children[0].classList.contains('active'), '旧选中行应取消高亮');
  assert.ok(listEl.children[1].classList.contains('active'), '新选中行应就地高亮');
  assert.equal(listEl.children[1].querySelector('.quick-row-select').getAttribute('aria-pressed'), 'true',
    '选中态应同步到行内按钮');

  // 记录变化时该行重建，未变的行继续复用。
  state.teacher.userPage.records = [
    { id: 'u-1', username: '王丽华', account: 'wanglihua01', roleName: '校长' },
    { id: 'u-3', username: '李雷', account: '13900002222', roleName: '' },
  ];
  renderTeacherUsers(deps);
  assert.ok(listEl.children[0] === rowsBefore[0], '数据未变的行应继续复用');
  assert.ok(listEl.children[1] !== rowsBefore[1], '换成新记录的行应重建');
  assert.equal(listEl.children.length, 2, '重建后行数仍为 2');

  delete require.cache[quickUiModulePath];
  delete require.cache[tenantModulePath];
  globalThis.InternalDevToolkit = originalNamespace;
}

testTenantUserRowRender();

testImmediateInvalidationBeforeDebouncedLoad()
  .then(() => console.log('quick login UI regression tests passed'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
