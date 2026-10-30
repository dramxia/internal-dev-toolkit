/* 加载完整扩展，以真实浏览器存储验证切换教师、关闭并重开侧栏。接口使用固定数据。 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const root = path.join(__dirname, '..');

async function fixtures() {
  const ns = window.InternalDevToolkit = {};
  window.scopeCalls = [];
  window.module = {
    get exports() { return {}; },
    set exports(value) { if (value.renderTeacherShell) window.scopeUi = value; },
  };
  const tree = [{ id: 'stage', deptName: '小学', subDeptType: 1, children: [
    { id: 'grade', deptName: '三年级', subDeptType: 2, children: [
      { id: 'c1', deptName: '1班', subDeptType: 3 },
      { id: 'c2', deptName: '2班', subDeptType: 3 },
      { id: 'c3', deptName: '3班', subDeptType: 3 },
    ] },
  ] }];
  const details = {
    a: { schoolSubjectTeachersDetail: [
      { subjectNames: ['数学'], deptIds: ['c1'] }, { subjectNames: ['语文'], deptIds: ['c2'] },
    ] },
    b: { schoolSubjectTeachersDetail: [{ subjectNames: ['英语'], deptIds: ['c3'] }] },
  };
  const roster = [
    { id: 's1', studentName: '学生甲', code: '202601', clazzId: 'c1', status: 1 },
    { id: 's2', studentName: '学生乙', code: '202602', clazzId: 'c2', status: 1 },
    { id: 's3', studentName: '学生丙', code: '202603', clazzId: 'c3', status: 1 },
  ];
  const reply = (data) => ({ ok: true, res: { code: 200, data } });
  function hook(name, update) {
    let value;
    Object.defineProperty(ns, name, { configurable: true, get: () => value, set(next) { value = update(next); } });
  }
  hook('token', (value) => ({ ...value, getToken: async () => ({ token: 'fixture-admin' }) }));
  hook('adminLoginHistory', (value) => ({ ...value, getSession: async () => ({ id: 'fixture-session' }) }));
  hook('messages', (value) => ({ ...value, sendToBackground: async (message) => {
    scopeCalls.push(message);
    const p = message.payload || {};
    if (message.type === 'GET_QUICK_LOGIN_RECENT') return { ok: true, records: [] };
    if (message.type === 'APP_GET_CREDENTIALS') return { ok: true, siteUrl: 'http://localhost:5173' };
    if (message.type === 'RESOLVE_USER_SESSION') return { ok: true, origin: 'https://school.example.test', aiToken: 'fixture-ai' };
    if (message.type === 'FETCH_TEACHER_DETAIL') {
      if (window.holdDetails) await new Promise((resolve) => { window.releaseDetails = resolve; });
      return reply(details[p.id]);
    }
    if (message.type === 'FETCH_SCHOOL_DEPT_TREE') return reply(tree);
    if (message.type === 'FETCH_STUDENTS') {
      if (window.holdStudents) await new Promise((resolve) => { window.releaseStudents = resolve; });
      const ids = p.clazzId ? [p.clazzId] : p.clazzIds || [];
      const records = roster.filter((s) => (!ids.length || ids.includes(s.clazzId)) &&
        (!p.name || s.studentName.includes(p.name)) && (!p.code || s.code.includes(p.code)));
      return reply({ records, total: records.length, current: p.current, size: p.size });
    }
    return reply({ records: [], total: 0 });
  } }));
}

(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'teacher-scope-lifecycle-'));
  let context;
  const errors = [];
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true, viewport: { width: 400, height: 850 }, locale: 'zh-CN',
      args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const url = `chrome-extension://${worker.url().split('/')[2]}/popup.html`;
    await context.addInitScript(fixtures);
    async function openPanel() {
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(url);
      await page.locator('#workspaceDock .workspace-dock-item').first().waitFor();
      await page.evaluate(async () => {
        await InternalDevToolkit.quickLoginUi.init();
        await InternalDevToolkit.workspaceUi.switchWorkspace('gpt-admin-pre:relations');
        await InternalDevToolkit.quickLoginUi.activate();
      });
      return page;
    }
    async function check(page, { teacher, subject = '', classId = '', student }) {
      await expect(page.locator('#studentList .student-item-name')).toHaveText([student]);
      assert.equal(await page.locator('#studentSubjectFilter').inputValue(), subject);
      assert.equal(await page.locator('#studentClassFilter').inputValue(), classId);
      assert.equal(await page.locator('#studentStageFilter').inputValue(), classId ? 'stage' : '');
      assert.equal(await page.locator('#studentGradeFilter').inputValue(), classId ? 'grade' : '');
      const selected = page.locator('#teacherDuties button[aria-pressed="true"]');
      await expect(selected).toHaveCount(classId ? 1 : 0);
      if (classId) assert.equal(await selected.textContent(), subject + ' · 小学三年级' + classId.slice(1) + '班');
      assert.equal(await page.evaluate(() => scopeUi.state.teacher.selectedTeacher.id), teacher);
      assert.equal(await page.locator('#studentSectionTitle').textContent(), (teacher === 'a' ? '甲老师' : '乙老师') + ' 的相关学生');
    }
    async function switchTeacher(page, name) {
      await page.locator('#changeTeacherIdentityBtn').click();
      await page.locator('#teacherList .teacher-item').filter({ hasText: name }).click();
    }

    let page = await openPanel();
    await page.evaluate(async () => {
      const t = scopeUi.state.teacher;
      t.selectedTenant = { tenantId: 'tenant', tenantName: '示例学校' };
      t.selectedUser = { id: 'user', tenantId: 'tenant', userName: '入口教师', phone: '13800001234', origin: 'https://school.example.test', aiToken: 'fixture-ai' };
      t.deptLoaded = true;
      t.teacherPage = { current: 1, size: 10, total: 2, records: [{ id: 'a', name: '甲老师' }, { id: 'b', name: '乙老师' }] };
      await scopeUi.selectTeacher(t.teacherPage.records[0]);
    });
    await page.locator('#teacherDuties button').first().click();
    await check(page, { teacher: 'a', subject: '数学', classId: 'c1', student: '学生甲' });
    await switchTeacher(page, '乙老师');
    await check(page, { teacher: 'b', student: '学生丙' });
    await expect(page.locator('#teacherDuties button')).toHaveText(['英语 · 小学三年级3班']);
    await switchTeacher(page, '甲老师');
    await expect(page.locator('#studentList .student-item-name')).toHaveText(['学生甲', '学生乙']);
    await page.locator('#teacherDuties button').nth(1).click();
    await check(page, { teacher: 'a', subject: '语文', classId: 'c2', student: '学生乙' });
    // pagehide 保存后销毁整个文档，新页面从 chrome.storage.local 恢复。
    await page.close();
    page = await openPanel();
    await check(page, { teacher: 'a', subject: '语文', classId: 'c2', student: '学生乙' });

    // 姓名、学号输入仍在等待查询时关闭，也按最新条件补查。
    await page.locator('#studentNameSearch').fill('学生');
    await page.locator('#studentCodeSearch').fill('2026');
    await page.close();
    page = await openPanel();
    await check(page, { teacher: 'a', subject: '语文', classId: 'c2', student: '学生乙' });
    assert.equal(await page.locator('#studentNameSearch').inputValue(), '学生');
    assert.equal(await page.locator('#studentCodeSearch').inputValue(), '2026');

    await page.evaluate(() => { window.holdStudents = true; });
    await page.locator('#teacherDuties button').first().click();
    await page.waitForFunction(() => Boolean(window.releaseStudents));
    await page.close();
    page = await openPanel();
    await check(page, { teacher: 'a', subject: '数学', classId: 'c1', student: '学生甲' });
    await page.locator('#teacherDuties button').first().click();
    await expect(page.locator('#studentList .student-item-name')).toHaveText(['学生甲', '学生乙']);
    await page.close();
    page = await openPanel();
    await expect(page.locator('#studentList .student-item-name')).toHaveText(['学生甲', '学生乙']);
    await expect(page.locator('#teacherDuties button[aria-pressed="true"]')).toHaveCount(0);
    assert.equal(await page.locator('#studentClassFilter').inputValue(), '');
    assert.equal(await page.locator('#studentSubjectFilter').inputValue(), '');

    await page.evaluate(() => { window.holdDetails = true; });
    await switchTeacher(page, '乙老师');
    await page.waitForFunction(() => Boolean(window.releaseDetails));
    await page.close();
    page = await openPanel();
    await check(page, { teacher: 'b', student: '学生丙' });
    await expect(page.locator('#teacherDuties button')).toHaveText(['英语 · 小学三年级3班']);
    await page.locator('#teacherDuties button').click();
    await check(page, { teacher: 'b', subject: '英语', classId: 'c3', student: '学生丙' });
    await page.close();
    page = await openPanel();
    await check(page, { teacher: 'b', subject: '英语', classId: 'c3', student: '学生丙' });
    await page.locator('#teacherDuties button').click();
    await check(page, { teacher: 'b', student: '学生丙' });

    // 关闭时位于“学生查教师”，回到“教师查学生”后补查未完成的标签筛选。
    await page.evaluate(() => { window.holdStudents = true; });
    await page.locator('#teacherDuties button').click();
    await page.waitForFunction(() => Boolean(window.releaseStudents));
    await page.locator('#modeStudentBtn').click();
    await page.close();
    page = await openPanel();
    assert.equal(await page.evaluate(() => scopeUi.state.mode), 'student');
    await page.locator('#modeTeacherBtn').click();
    await check(page, { teacher: 'b', subject: '英语', classId: 'c3', student: '学生丙' });
    assert.deepEqual(errors, []);
    console.log('teacher scope lifecycle browser tests passed: teacher changes, settled and pending queries, pending teacher details, real page close/reopen and cancellation after restore');
  } finally {
    await context?.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
