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
globalThis.InternalDevToolkit = { tenant: {}, messages: {} };
delete require.cache[tenantModulePath];
require(tenantModulePath);
const {
  actionMeta,
  buildRecentTeacherSelection,
  buildStudentAppLoginPayload,
  buildStudentCredentialsText,
  createPersistedState,
  getStudentReachableStep,
  getTeacherReachableStep,
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
assert.match(quickUi, /shouldRender\('teacher-users'/, '教师账号列表应按数据签名跳过无关重绘');
assert.match(quickUi, /shouldRender\('student-accounts'/, '学生账号列表应按数据签名跳过无关重绘');
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
assert.match(quickUi, /const allRecords = records\.slice\(0, 10\)/, '最近登录仍应限制为最多 10 条');
assert.match(quickUi, /recentRoleFilter[\s\S]*recentEnvFilter/, '最近使用工具屏应支持角色与环境过滤');
assert.match(quickUi, /function recentTargetControls\([\s\S]*data-recent-env="online"[\s\S]*data-recent-env="local"/);
assert.match(quickUi, /recentActionButton\('apply',[\s\S]*'应用到教师查学生'\)/, '最近登录项应渲染应用图标');
assert.match(
  quickUi,
  /action === 'apply' && record\.role !== 'teacher'/,
  '学生最近记录的应用图标应禁用',
);
assert.match(quickUi, /function syncRecentRowTarget\([\s\S]*button\.dataset\.env = normalizedEnv;[\s\S]*button\.dataset\.localPort = normalizedPort;/);
assert.match(quickUi, /class="quick-recent-port"[^>]*inputmode="numeric"[^>]*autocomplete="off"/);
assert.match(quickUi, /function actionTargetControls\([\s\S]*data-target-env="online"[\s\S]*data-target-env="local"/);
assert.match(quickUi, /class="quick-recent-port quick-user-port"[^>]*inputmode="numeric"[^>]*autocomplete="off"/);
assert.match(
  quickUi,
  /function renderTeacherUsers\([\s\S]*actionTargetControls\([\s\S]*syncActionTarget\(row, env, localPort\)/,
  '教师账号列表每行都应渲染并同步独立环境开关',
);
assert.match(
  quickUi,
  /function renderAccountUsers\([\s\S]*quick-target-container[\s\S]*actionTargetControls\([\s\S]*syncActionTarget\(row, env, localPort\)/,
  '学生账号列表每行都应渲染并同步独立环境开关',
);
assert.match(
  quickUi,
  /function renderStudentShell\([\s\S]*studentAccountSummaryActions[\s\S]*actionTargetControls\([\s\S]*syncActionTarget\(summaryActions, env, localPort\)/,
  '学生账号汇总条应保留记录级环境开关',
);
assert.match(
  quickUi,
  /async function selectStudentAccount\([\s\S]*const env = normalizeEnv\(row\?\.dataset\.env\);[\s\S]*const localPort = normalizePort\(row\?\.dataset\.localPort\);[\s\S]*s\.selectedAccount = Object\.assign\(\{\}, account, \{ env, localPort \}\)/,
  '选择学生账号时应把该行环境和端口写入选中记录',
);
assert.match(
  quickUi,
  /function renderRelationTeachers\([\s\S]*lookup-teacher-item quick-action-row quick-target-container[\s\S]*actionTargetControls\([\s\S]*syncActionTarget\(row, env, localPort\)/,
  '关联教师列表每行都应渲染并同步独立环境开关',
);
assert.match(
  quickUi,
  /function syncActionTarget\([\s\S]*button\.dataset\.env = normalizedEnv;[\s\S]*button\.dataset\.localPort = normalizedPort/,
  '记录级环境应写入对应登录操作按钮',
);
const actionTargetClick = quickUi.match(/function onActionTargetClick\(event\) \{([\s\S]*?)\n  \}\n\n  function onActionTargetPortInput/);
assert.ok(actionTargetClick, '应能提取记录级环境点击处理器');
assert.match(actionTargetClick[1], /syncActionTarget\(container, envButton\.dataset\.targetEnv/);
assert.doesNotMatch(actionTargetClick[1], /clearAllSessions\(\)|clearTeacherSession\(\)|clearStudentSession\(\)/, '记录级环境切换不得清空查询会话');
assert.match(quickUi, /\$\('quickLoginBody'\)\?\.addEventListener\('click', onActionTargetClick\)/, '所有结果区域应统一委托记录级环境事件');
assert.match(
  quickUi,
  /function persistSummaryTarget\(container\) \{[\s\S]*?#teacherUserSummary[\s\S]*?t\.selectedUser = Object\.assign[\s\S]*?#studentAccountSummary[\s\S]*?s\.selectedAccount = Object\.assign/,
  '教师和学生汇总条的目标环境都应写回查询快照',
);
assert.match(panel, /class="quick-summary-actions quick-target-container" id="teacherUserSummaryActions"/);
assert.match(panel, /class="quick-summary-actions quick-target-container" id="studentAccountSummaryActions"/);
const recentClickHandler = quickUi.match(/async function onRecentClick\(event\) \{([\s\S]*?)\n  \}\n\n  \/\/ ── 事件绑定/);
assert.ok(recentClickHandler, '应能提取最近登录点击处理器');
assert.doesNotMatch(recentClickHandler[1], /state\.env\s*=|state\.mode\s*=|clearAllSessions\(\)/, '单条最近记录不得联动顶部环境或任务模式');
assert.match(recentClickHandler[1], /syncRecentRowTarget\(row, envButton\.dataset\.recentEnv/);
assert.match(recentClickHandler[1], /action === 'apply'[\s\S]*applyRecentToTeacherLookup\(meta, button/);
assert.match(quickUi, /if \(t\.studentError\) throw new Error\(t\.studentError\)/, '学生查询失败不得被应用成功提示覆盖');
assert.doesNotMatch(recentClickHandler[1], /DELETE_QUICK_LOGIN_RECENT[\s\S]*?env:\s*meta\.env/, '删除最近记录不应再按环境匹配');

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
assert.match(popupHtml, /\.quick-recent-row[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
assert.match(popupHtml, /\.quick-recent-env-switcher[\s\S]*grid-template-columns: repeat\(2/);
assert.match(popupHtml, /\.quick-recent-port\s*\{[\s\S]*width:\s*72px/);
assert.match(popupHtml, /#userList\s*\{[\s\S]*max-height:\s*340px/);
assert.match(popupHtml, /\.quick-tenant-user-row\s*\{[\s\S]*display:\s*grid/, '租户用户行应为两行网格布局');
assert.match(
  popupHtml,
  /\.quick-tenant-user-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/,
  '租户用户行首列身份区应可收缩、次列工具栏自适应',
);
assert.doesNotMatch(
  popupHtml.match(/\.quick-tenant-user-row\s*\{([^}]*)\}/)[1],
  /background:\s*var\(--panel\)/,
  '租户用户行不应使用独立卡片底色',
);
assert.match(popupHtml, /\.quick-user-avatar\s*\{[\s\S]*width:\s*30px[\s\S]*height:\s*30px/);
assert.match(popupHtml, /\.quick-user-toolbar\s*\{[\s\S]*display:\s*flex[\s\S]*flex-wrap:\s*wrap/, '工具栏应可整体换行');
assert.doesNotMatch(popupHtml, /quick-user-target-controls/, '环境控件外层包装已移除');
assert.match(popupHtml, /\.quick-user-env-btn\s*\{[\s\S]*min-height:\s*24px/);
assert.match(popupHtml, /\.quick-user-port\s*\{[\s\S]*width:\s*56px[\s\S]*height:\s*26px/);
assert.match(popupHtml, /\.quick-user-toolbar \.quick-action-btn\s*\{[\s\S]*width:\s*26px[\s\S]*height:\s*26px/);
assert.match(quickUi, /class="quick-user-avatar"[\s\S]*class="quick-user-toolbar"/);
assert.match(quickUi, /<div class="quick-user-toolbar">' \+\s*actionTargetControls[\s\S]*actionButtons\(/, '工具栏应紧跟环境控件与操作按钮');
assert.match(popupHtml, /\.quick-tenant-user-row:hover\s*\{\s*background:\s*var\(--sage-50\)/);
assert.match(popupHtml, /\.quick-tenant-user-row\.active:hover\s*\{\s*background:\s*var\(--sage-50\)/);

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

async function testTenantUserRowRender() {
  const originalNamespace = globalThis.InternalDevToolkit;
  globalThis.InternalDevToolkit = { tenant: {}, messages: {} };
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
  const envBtns = toolbar.querySelectorAll('.quick-user-env-btn');
  assert.equal(envBtns.length, 2, '工具栏应有线上/本地切换');
  assert.equal(envBtns[0].dataset.targetEnv, 'online');
  assert.equal(envBtns[1].dataset.targetEnv, 'local');
  assert.ok(envBtns[0].classList.contains('active'), '线上应默认激活');

  const portInput = toolbar.querySelector('.quick-user-port');
  assert.ok(portInput, '工具栏应有端口输入');
  assert.equal(portInput.getAttribute('aria-label'), '本地端口');

  const actionBtns = toolbar.querySelectorAll('.action-btn');
  assert.equal(actionBtns.length, 4, '工具栏应有 4 个登录操作按钮');
  ['open', 'copy', 'student', 'teacher'].forEach((action, index) => {
    assert.equal(actionBtns[index].dataset.action, action);
    assert.equal(actionBtns[index].dataset.env, 'online', '操作按钮应同步行环境');
    assert.equal(actionBtns[index].dataset.tenantId, 'tenant-1');
  });
  assert.match(actionBtns[0].getAttribute('aria-label'), /打开 AI 平台（线上）/, '操作按钮标签应包含目标环境');

  assert.equal(pagerCalls.length, 1, '应渲染分页');
  assert.equal(pagerCalls[0].el, pagerEl);
  assert.equal(typeof pagerCalls[0].cb, 'function');

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
