const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = { name: '钉钉', value: 'dingtalk', icon: 'dingtalk' };
const deptTree = [
  { id: '171', name: '示例学校', deptUserNum: 7 },
  { id: '106', name: '示例学校', deptUserNum: 58, children: [
    { id: '107', name: '总办公室', deptUserNum: 17, children: [
      { id: '108', name: '校长室', deptUserNum: 0 },
      { id: '109', name: '教学处', deptUserNum: 3 },
    ] },
  ] },
];
const clone = (value) => JSON.parse(JSON.stringify(value));

class Element {
  constructor() {
    this.dataset = {};
    this.attrs = {};
    this.children = [];
    this.value = '';
    this.textContent = '';
    this.style = { setProperty() {} };
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle(name, force) { const active = force ?? !classes.has(name); if (active) classes.add(name); else classes.delete(name); return active; },
    };
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ''; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] ?? null; }
  removeAttribute(name) { delete this.attrs[name]; }
  appendChild(child) { this.children.push(child); }
  addEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  focus() {}
  scrollIntoView() {}
}

function harness() {
  const elements = new Map();
  const calls = [];
  let respond = async (message) => message.type === 'FETCH_DEPTS'
    ? { ok: true, res: { code: 200, data: deptTree } }
    : { ok: true, res: { code: 200, data: { records: [], total: 0 } } };
  const context = vm.createContext({
    module: { exports: {} }, console, setTimeout, clearTimeout,
    requestAnimationFrame: (fn) => fn(),
    document: {
      getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
      createElement: () => new Element(),
      querySelectorAll: () => [],
    },
    InternalDevToolkit: {
      token: { getToken: async () => ({ token: 'test-admin-token' }) },
      messages: { sendToBackground: async (message) => { calls.push(clone(message)); return respond(message); } },
      ui: { toast() {} },
    },
  });
  for (const file of ['src/common/tenant.js', 'src/popup/quick-login-ui.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  return {
    calls, elements, ui: context.module.exports, tenant: context.InternalDevToolkit.tenant,
    set respond(fn) { respond = fn; },
  };
}

(async () => {
  const h = harness();
  const options = h.tenant.flattenDeptOptions({ code: 200, data: deptTree });
  assert.deepEqual(clone(options.map((item) => item.deptId)), ['171', '106', '107', '108', '109']);
  assert.equal(options[3].path, '示例学校 / 总办公室 / 校长室');
  assert.equal(options[3].depth, 2);
  assert.equal(options[3].userCount, 0, '0 人的部门仍须可选');
  assert.deepEqual(clone(options[3].deptSource), source);
  const alternateSource = { name: '企业微信', value: 'wecom', icon: 'wecom' };
  const inherited = h.tenant.flattenDeptOptions({ data: [{ id: 'parent', name: '组织', deptSource: alternateSource, children: [{ id: 'child', name: '部门' }] }] });
  assert.deepEqual(clone(inherited[1].deptSource), alternateSource, '子部门继承组织来源');
  assert.equal(h.tenant.flattenDeptOptions({ data: [{ id: 'removed', isDeleted: 1 }] }).length, 0);

  await h.ui.selectTeacherTenant({ tenantId: 'tenant-a', tenantName: '示例学校', industry: 1 });
  assert.equal(h.calls.filter((call) => call.type === 'FETCH_DEPTS').length, 1);
  assert.deepEqual(h.calls.find((call) => call.type === 'FETCH_DEPTS').payload, { tenantId: 'tenant-a', industry: 1 });
  assert.equal(h.calls.find((call) => call.type === 'FETCH_USERS').payload.deptId, '', '默认保留不指定部门的账号列表');
  assert.equal(h.elements.get('teacherDeptField').classList.contains('hidden'), false);
  assert.match(h.elements.get('deptSelect').innerHTML, /示例学校（7 人） · 编号 171/);
  assert.match(h.elements.get('deptSelect').innerHTML, /示例学校（58 人） · 编号 106/, '同名组织须能区分');
  assert.match(h.elements.get('deptSelect').innerHTML, /校长室（0 人） · 编号 108/);

  const t = h.ui.state.teacher;
  Object.assign(t, {
    selectedUser: { id: 'old-user', aiToken: 'old-ai-token' }, selectedTeacher: { id: 'old-teacher' },
    userKeyword: '旧账号条件', teacherNameKeyword: '旧教师条件', studentNameKeyword: '旧学生条件',
    studentPage: { current: 3, size: 10, total: 1, records: [{ id: 'old-student' }] },
  });
  await h.ui.selectTeacherDepartment('109');
  assert.equal(t.deptId, '109');
  assert.equal(t.activeStep, 1);
  assert.equal(t.selectedUser, null);
  assert.equal(t.selectedTeacher, null);
  assert.equal(t.studentPage.records.length, 0);
  assert.equal(t.userKeyword, '');
  assert.equal(t.teacherNameKeyword, '');
  assert.equal(t.studentNameKeyword, '');
  assert.equal(h.calls.at(-1).payload.deptId, '109');
  assert.equal(h.calls.at(-1).payload.current, 1);
  assert.deepEqual(clone(h.tenant.buildUserPageBody(h.calls.at(-1).payload)), {
    current: 1, size: 10, deptId: '109', tenantId: 'tenant-a', deptSource: source, searchKey: '', searchType: 'username,phone',
  });
  t.userKeyword = '王老师';
  t.userPage.current = 2;
  await h.ui.loadTeacherUsers(false);
  assert.equal(h.calls.at(-1).payload.deptId, '109', '搜索和翻页须保留部门');
  assert.equal(h.calls.at(-1).payload.keyword, '王老师');
  assert.equal(h.calls.at(-1).payload.current, 2);
  const snapshot = h.ui.createPersistedState();
  h.ui.resetForAdminSession({ id: 'another-admin' }, true);
  assert.equal(t.deptId, '');
  assert.equal(t.deptOptions.length, 0, '切换后台账号时清空组织架构');
  h.ui.restorePersistedState(snapshot);
  assert.equal(t.deptId, '109');
  assert.equal(t.deptOptions.length, 5, '查询快照保留组织选项和选择');
  assert.equal(t.deptLoaded, false, '重新打开后须重新确认组织架构');

  const pending = [];
  h.respond = (message) => new Promise((resolve) => pending.push({ message, resolve }));
  const oldUsers = h.ui.selectTeacherDepartment('171');
  await new Promise(setImmediate);
  const newUsers = h.ui.selectTeacherDepartment('106');
  await new Promise(setImmediate);
  pending[1].resolve({ ok: true, res: { data: { records: [{ id: 'new-user', username: '新部门教师' }], total: 1 } } });
  await newUsers;
  pending[0].resolve({ ok: true, res: { data: { records: [{ id: 'old-response', username: '旧部门教师' }], total: 1 } } });
  await oldUsers;
  assert.equal(t.userPage.records[0].id, 'new-user', '旧部门的慢响应不能覆盖新部门账号');

  let resolveOldDepartments;
  h.respond = (message) => message.type === 'FETCH_DEPTS' && message.payload.tenantId === 'tenant-a'
    ? new Promise((resolve) => { resolveOldDepartments = resolve; })
    : Promise.resolve(message.type === 'FETCH_DEPTS'
      ? { ok: true, res: { data: [{ id: 'new-dept', name: '新租户部门' }] } }
      : { ok: true, res: { data: { records: [], total: 0 } } });
  const oldDepartments = h.ui.loadTeacherDepartments();
  await new Promise(setImmediate);
  await h.ui.selectTeacherTenant({ tenantId: 'tenant-b', tenantName: '另一租户', industry: 1 });
  resolveOldDepartments({ ok: true, res: { data: deptTree } });
  await oldDepartments;
  assert.equal(t.deptId, '');
  assert.equal(t.deptOptions[0].deptId, 'new-dept', '旧租户的组织架构不能写入新租户');

  h.respond = async (message) => message.type === 'FETCH_DEPTS'
    ? { ok: false, error: 'network unavailable' }
    : { ok: true, res: { data: { records: [], total: 0 } } };
  await h.ui.loadTeacherDepartments();
  assert.match(t.deptError, /network unavailable/);
  assert.equal(h.elements.get('teacherDeptRetryBtn').classList.contains('hidden'), false);
  h.respond = async () => ({ ok: true, res: { data: [] } });
  await h.ui.loadTeacherDepartments();
  assert.equal(t.deptError, '');
  assert.equal(t.deptOptions.length, 0);
  assert.match(h.elements.get('teacherDeptStatus').textContent, /暂无组织架构/);

  console.log('teacher department selection tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
