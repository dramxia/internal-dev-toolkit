const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const clone = (value) => JSON.parse(JSON.stringify(value));

// 小学（学段）→ 三年级/五年级（年级）→ 班级；初中同构，用于验证同名班级可区分。
const deptTree = [
  { id: '2', deptName: '小学', subDeptType: 1, children: [
    { id: '3', deptName: '三年级', subDeptType: 2, children: [
      { id: '2979', parentId: '3', deptName: '1班', subDeptType: 3, children: [] },
      { id: '2980', parentId: '3', deptName: '2班', subDeptType: 3, children: [] },
    ] },
    { id: '5', deptName: '五年级', subDeptType: 2, children: [
      { id: '2989', parentId: '5', deptName: '1班', subDeptType: 3, children: [] },
    ] },
  ] },
  { id: '9', deptName: '初中', subDeptType: 1, children: [
    { id: '10', deptName: '初一', subDeptType: 2, children: [
      { id: '3001', parentId: '10', deptName: '1班', subDeptType: 3, children: [] },
    ] },
  ] },
];

// 数学挂在年级上（需展开到下级班级），语文挂在班级上，班主任没有学科。
const teacherDetail = {
  schoolSubjectTeachersDetail: [
    { teachType: 7, teachTypeName: '学科教师', subjectNames: ['数学'], deptIds: ['3'], deptNames: ['三年级'] },
    { teachType: 7, teachTypeName: '学科教师', subjectNames: ['语文'], deptIds: ['2989', '3001'], deptNames: ['1班', '1班'] },
  ],
  schoolManageTeachersDetail: [{ teachTypeName: '班主任', deptIds: ['2989'] }],
};

const roster = [
  { id: 's1', studentName: '学生甲', clazzId: '2979', status: 1 },
  { id: 's2', studentName: '学生乙', clazzId: '2980', status: 1 },
  { id: 's3', studentName: '学生丙', clazzId: '2989', status: 1 },
  { id: 's4', studentName: '学生丁', clazzId: '3001', status: 1 },
];

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

function harness(tree = deptTree) {
  const elements = new Map();
  const calls = [];
  // 学生接口按请求的班级返回，模拟后端正确支持班级筛选。
  const respond = async (message) => {
    const payload = message.payload || {};
    if (message.type === 'FETCH_TEACHER_DETAIL') return { ok: true, res: { code: 200, data: teacherDetail } };
    if (message.type === 'FETCH_SCHOOL_DEPT_TREE') return { ok: true, res: { code: 200, data: tree } };
    if (message.type === 'FETCH_STUDENTS') {
      const ids = payload.clazzIds?.length ? payload.clazzIds : (payload.clazzId ? [payload.clazzId] : []);
      const records = ids.length ? roster.filter((item) => ids.includes(item.clazzId)) : roster;
      return { ok: true, res: { code: 200, data: { records, total: records.length, current: 1, size: 10 } } };
    }
    return { ok: true, res: { code: 200, data: { records: [], total: 0 } } };
  };
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
  const ui = context.module.exports;
  ui.state.teacher.selectedTenant = { tenantId: 'tenant-a', tenantName: '示例学校' };
  ui.state.teacher.selectedUser = { id: 'user-1', userName: '教师入口', origin: 'https://ai.example.test', aiToken: 'ai-token' };
  return {
    calls, elements, ui, tenant: context.InternalDevToolkit.tenant,
    lastStudentCall: () => clone([...calls].reverse().find((call) => call.type === 'FETCH_STUDENTS')),
    optionValues: (id) => [...String(elements.get(id)?.innerHTML || '').matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)]
      .map(([, value, label]) => ({ value, label })),
  };
}

(async () => {
  // ── 纯函数：班级树层级与教学范围 ──
  const h = harness();
  const classes = h.tenant.extractClassOptions({ code: 200, data: deptTree });
  assert.deepEqual(
    clone(classes.map((item) => [item.id, item.stageName, item.gradeName, item.name])),
    [
      ['2979', '小学', '三年级', '1班'],
      ['2980', '小学', '三年级', '2班'],
      ['2989', '小学', '五年级', '1班'],
      ['3001', '初中', '初一', '1班'],
    ],
  );
  assert.deepEqual(clone(h.tenant.expandDeptIdsToClassIds(['3'], classes)), ['2979', '2980'], '挂在年级上的教学职务须展开到班级');

  const entries = h.tenant.buildTeacherScopeEntries(teacherDetail, classes);
  assert.deepEqual(
    clone(entries.map((item) => [item.subject, item.classId])),
    [['数学', '2979'], ['数学', '2980'], ['语文', '2989'], ['语文', '3001']],
  );
  assert.deepEqual(
    clone(h.tenant.buildTeacherScopeEntries({ schoolManageTeachersDetail: [{ deptIds: ['2980'] }] }, classes)
      .map((item) => [item.subject, item.classId])),
    [['', '2980']],
    '没有学科的任教关系归入空学科，仍可按学段/年级/班级筛选',
  );

  const all = h.tenant.resolveTeacherScope(entries, {});
  assert.deepEqual(clone(all.subjects.map((item) => item.value)), ['数学', '语文']);
  assert.deepEqual(clone(all.stages.map((item) => item.label)), ['小学', '初中']);
  assert.deepEqual(clone(all.classes.map((item) => item.label)), [
    '小学 / 三年级 / 1班', '小学 / 三年级 / 2班', '小学 / 五年级 / 1班', '初中 / 初一 / 1班',
  ], '未选定上级时同名班级用完整路径区分');
  assert.equal(all.active, false);
  assert.deepEqual(clone(all.classIds), ['2979', '2980', '2989', '3001']);

  const math = h.tenant.resolveTeacherScope(entries, { subject: '数学' });
  assert.deepEqual(clone(math.stages.map((item) => item.label)), ['小学'], '学段只保留所选学科覆盖的范围');
  assert.deepEqual(clone(math.grades.map((item) => item.label)), ['小学 / 三年级']);
  assert.deepEqual(clone(math.classIds), ['2979', '2980']);
  assert.equal(math.active, true);

  const chinese = h.tenant.resolveTeacherScope(entries, { subject: '语文', stageId: '2', gradeId: '5' });
  assert.deepEqual(clone(chinese.classes.map((item) => item.label)), ['1班'], '上级选定后班级只显示班级名');
  assert.deepEqual(clone(chinese.classIds), ['2989']);

  const stale = h.tenant.resolveTeacherScope(entries, { subject: '数学', stageId: '9', gradeId: '10', classId: '3001' });
  assert.deepEqual(clone(stale.filter), { subject: '数学', stageId: '', gradeId: '', classId: '' }, '换学科后失效的下级选择须清空');
  assert.deepEqual(clone(stale.classIds), ['2979', '2980']);

  // ── UI：选定教师后按四级筛选查询相关学生 ──
  const t = h.ui.state.teacher;
  await h.ui.selectTeacher({ id: 'teacher-1', name: '李老师' });
  assert.deepEqual(clone(t.classIds), ['2979', '2980', '2989', '3001']);
  assert.deepEqual(h.lastStudentCall().payload.clazzIds, ['2979', '2980', '2989', '3001']);
  assert.deepEqual(clone(t.studentPage.records.map((item) => item.id)), ['s1', 's2', 's3', 's4']);
  // 四级 scope 收在披露区里：有教学范围时只出现「筛选」入口，展开后才渲染下拉网格。
  assert.equal(h.elements.get('studentScopeToggle').classList.contains('hidden'), false, '有教学范围时出现筛选入口');
  assert.equal(h.elements.get('studentScopeFilters').classList.contains('hidden'), true, '筛选默认收起');
  h.ui.toggleTeacherScopeFilters();
  assert.equal(h.elements.get('studentScopeFilters').classList.contains('hidden'), false, '展开后显示四级筛选');
  assert.deepEqual(h.optionValues('studentSubjectFilter'), [
    { value: '', label: '全部学科' }, { value: '数学', label: '数学' }, { value: '语文', label: '语文' },
  ]);
  assert.deepEqual(h.optionValues('studentGradeFilter').map((item) => item.label),
    ['全部年级', '小学 / 三年级', '小学 / 五年级', '初中 / 初一']);

  await h.ui.setTeacherScopeFilter('subject', '数学');
  assert.deepEqual(clone(t.scopeFilter), { subject: '数学', stageId: '', gradeId: '', classId: '' });
  assert.deepEqual(h.lastStudentCall().payload.clazzIds, ['2979', '2980'], '按学科筛选后只查询该学科的班级');
  assert.deepEqual(clone(t.studentPage.records.map((item) => item.id)), ['s1', 's2']);
  assert.deepEqual(h.optionValues('studentStageFilter').map((item) => item.label), ['全部学段', '小学'], '下级选项随学科联动');
  assert.equal(h.elements.get('studentSubjectFilter').value, '数学');

  await h.ui.setTeacherScopeFilter('classId', '2980');
  assert.equal(h.lastStudentCall().payload.clazzId, '2980', '只剩一个班级时按单班级字段查询');
  assert.deepEqual(h.lastStudentCall().payload.clazzIds, []);
  assert.deepEqual(clone(t.studentPage.records.map((item) => item.id)), ['s2']);

  await h.ui.setTeacherScopeFilter('subject', '语文');
  assert.deepEqual(clone(t.scopeFilter), { subject: '语文', stageId: '', gradeId: '', classId: '' }, '切换学科后不属于该学科的班级选择被清空');
  assert.deepEqual(h.lastStudentCall().payload.clazzIds, ['2989', '3001']);

  await h.ui.setTeacherScopeFilter('stageId', '2');
  assert.deepEqual(h.optionValues('studentClassFilter').map((item) => item.label), ['全部班级', '五年级 / 1班']);
  assert.deepEqual(h.lastStudentCall().payload.clazzId, '2989');

  const callsBefore = h.calls.length;
  await h.ui.setTeacherScopeFilter('stageId', '2');
  assert.equal(h.calls.length, callsBefore, '重复选择同一筛选不再发起查询');

  // 关闭再打开侧栏：教学范围与筛选一并恢复。
  const snapshot = h.ui.createPersistedState();
  assert.deepEqual(clone(snapshot.teacher.scopeFilter), { subject: '语文', stageId: '2', gradeId: '', classId: '' });
  assert.equal(snapshot.teacher.classScopes.length, 4);
  h.ui.resetForAdminSession({ id: 'another-admin' }, true);
  assert.deepEqual(clone(t.classScopes), []);
  assert.deepEqual(clone(t.scopeFilter), { subject: '', stageId: '', gradeId: '', classId: '' });
  h.ui.restorePersistedState(snapshot);
  assert.deepEqual(clone(t.scopeFilter), { subject: '语文', stageId: '2', gradeId: '', classId: '' });
  assert.deepEqual(clone(t.classScopes.map((item) => item.classId)), ['2979', '2980', '2989', '3001']);

  // 换教师时教学范围与筛选整体失效，不能带到下一位教师。
  await h.ui.selectTeacher({ id: 'teacher-2', name: '王老师' });
  assert.deepEqual(clone(t.scopeFilter), { subject: '', stageId: '', gradeId: '', classId: '' });
  assert.deepEqual(h.lastStudentCall().payload.clazzIds, ['2979', '2980', '2989', '3001']);

  // ── 缺少学段层级的租户：学段筛选整格隐藏，年级仍可用 ──
  const flat = harness([
    { id: '3', deptName: '三年级', subDeptType: 2, children: [
      { id: '2979', parentId: '3', deptName: '1班', subDeptType: 3, children: [] },
      { id: '2980', parentId: '3', deptName: '2班', subDeptType: 3, children: [] },
    ] },
  ]);
  await flat.ui.selectTeacher({ id: 'teacher-1', name: '李老师' });
  assert.equal(flat.elements.get('studentScopeToggle').classList.contains('hidden'), false);
  flat.ui.toggleTeacherScopeFilters();
  assert.equal(flat.elements.get('studentScopeFilters').classList.contains('hidden'), false);
  assert.equal(flat.elements.get('studentStageFilter').classList.contains('hidden'), true, '没有学段层级时隐藏学段筛选');
  assert.deepEqual(flat.optionValues('studentGradeFilter').map((item) => item.label), ['全部年级', '三年级']);
  await flat.ui.setTeacherScopeFilter('gradeId', '3');
  assert.deepEqual(flat.lastStudentCall().payload.clazzIds, ['2979', '2980']);

  // ── 班级树缺失：回落教师详情里的班级，不显示筛选 ──
  const bare = harness([]);
  await bare.ui.selectTeacher({ id: 'teacher-1', name: '李老师' });
  assert.deepEqual(clone(bare.ui.state.teacher.classScopes), []);
  assert.equal(bare.elements.get('studentScopeFilters').classList.contains('hidden'), true);
  assert.equal(bare.elements.get('studentScopeToggle').classList.contains('hidden'), true, '无教学范围时连筛选入口都不出现');
  assert.deepEqual(bare.lastStudentCall().payload.clazzIds, ['3', '2989', '3001'], '班级树缺失时仍按教师详情的部门查询');

  console.log('teacher scope filter tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
