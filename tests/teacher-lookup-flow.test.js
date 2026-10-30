/* 用真实页面和模拟接口验证教师匹配、返回、刷新、失败重试及学生 APP 登录。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');
const root = path.join(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 850 }, locale: 'zh-CN', reducedMotion: 'reduce' });
    page.setDefaultTimeout(10000);
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setContent(fs.readFileSync(path.join(root, 'popup.html'), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''));
    await page.evaluate(() => {
      window.module = { exports: {} };
      window.calls = [];
      window.teachers = [{ id: 'teacher-1', name: '张三', account: 'zhangsan02', userId: 'person-1', status: 0 }];
      window.InternalDevToolkit = {
        token: { getToken: async () => ({ token: 'fixture-admin' }) }, ui: { toast() {} },
        messages: { sendToBackground: async ({ type, payload = {} }) => {
          calls.push({ type, payload });
          const reply = (data) => ({ ok: true, res: { data } });
          if (type === 'RESOLVE_USER_SESSION') return { ok: true, res: { origin: 'https://school.example.test', aiToken: 'fixture-ai' } };
          if (type === 'FETCH_TENANTS') return reply({ records: [{ id: 'school-' + payload.current, tenantName: '明德学校' }], total: 21 });
          if (type === 'FETCH_USERS') return reply({ records: [{ id: 'account-1', username: '张三', account: 'zhangsan02', userId: 'person-1', phone: '13800001234' }], total: 1 });
          if (type === 'FETCH_TEACHERS') {
            if (window.holdTeacherQuery) {
              window.holdTeacherQuery = false;
              await new Promise((resolve) => { window.releaseTeacherQuery = resolve; });
            }
            if (window.failTeachers) return { ok: false, error: '教师查询暂时失败' };
            const records = window.accountMiss && payload.account ? [] : teachers;
            return reply({ records, total: window.teacherTotal ?? records.length });
          }
          if (type === 'FETCH_SCHOOL_DEPT_TREE') {
            if (window.failTree) return { ok: false, error: '班级读取暂时失败' };
            return reply([{ id: 'grade', deptName: '三年级', subDeptType: 2, children: [{ id: 'class-1', deptName: '1班', subDeptType: 3 }] }]);
          }
          if (type === 'FETCH_TEACHER_DETAIL') return reply({ schoolSubjectTeachersDetail: [{ subjectNames: ['数学'], deptIds: ['class-1'] }] });
          if (type === 'FETCH_STUDENTS') return reply({ records: [
            { id: 'student-1', name: '林知夏', account: '202601', clazzId: 'class-1', className: '三年级1班', status: 1 },
            { id: 'student-2', name: '陈一诺', account: '202602', clazzId: 'class-1', className: '三年级1班', status: 2 },
          ], total: 2 });
          return reply([]);
        } },
      };
    });
    for (const file of ['src/common/tenant.js', 'src/popup/ui.js', 'src/popup/user-card.js', 'src/popup/quick-login-ui.js']) await page.addScriptTag({ path: path.join(root, file) });
    await page.evaluate(() => {
      window.flow = module.exports;
      flow.state.adminTokenAvailable = true;
      document.querySelectorAll('.panel').forEach((e) => e.classList.remove('active'));
      document.getElementById('panel-quick').classList.add('active');
      document.getElementById('quickHistorySection').classList.add('hidden');
      document.getElementById('quickLoginSection').classList.add('expanded');
      flow.bindEvents();
      window.freshTeacherState = JSON.parse(JSON.stringify(flow.state.teacher));
      window.seed = () => {
        Object.assign(flow.state.teacher, JSON.parse(JSON.stringify(freshTeacherState)), {
          selectedTenant: { tenantId: 'school-2', tenantName: '明德学校' }, deptLoaded: true,
          selectedUser: { id: 'account-1', userId: 'person-1', tenantId: 'school-2', userName: '张三', account: 'zhangsan02', phone: '13800001234', origin: 'https://school.example.test', aiToken: 'fixture-ai' },
          activeStep: 2, teacherAccountKeyword: 'zhangsan02',
          userPage: { current: 1, size: 10, total: 1, records: [{ id: 'account-1', username: '张三', account: 'zhangsan02', userId: 'person-1', phone: '13800001234' }] },
        });
        window.calls.length = 0;
        window.failTree = false;
        window.failTeachers = false;
        window.teacherTotal = undefined;
        window.accountMiss = false;
        flow.renderTeacherShell();
      };
      document.getElementById('studentAppSiteUrl').value = 'http://localhost:5173';
      document.getElementById('studentAppSiteUrl').dispatchEvent(new Event('input'));
    });

    await page.evaluate(async () => { flow.state.teacher.tenantKeyword = '明德'; await flow.loadTenants(); });
    await expect(page.locator('#tenantPager')).toBeVisible();
    await page.locator('#tenantPager [aria-label="下一页"]').click();
    await page.waitForFunction(() => calls.filter((c) => c.type === 'FETCH_TENANTS').at(-1)?.payload.current === 2 && !flow.state.teacher.loadingTenants);
    assert.equal(await page.evaluate(() => flow.createPersistedState().teacher.tenantPage.current), 2);
    await page.locator('#tenantList button').click();
    await expect(page.locator('#teacherUserStepBody #teacherDeptField')).toBeVisible();
    await page.locator('#userList .quick-user-card').click({ position: { x: 2, y: 2 } });
    await expect(page.locator('#studentList .student-item-name')).toHaveText(['林知夏', '陈一诺']);
    assert.equal(await page.evaluate(() => calls.find((c) => c.type === 'FETCH_TEACHERS').payload.account), 'zhangsan02');
    await expect(page.locator('#studentResultCount')).toHaveText('共 2 人');
    await expect(page.locator('#teacherUserSummary')).toBeVisible();
    await expect(page.locator('#teacherUserSummary .quick-user-toolbar')).toBeVisible();
    await expect(page.locator('#teacherDeptField')).toBeHidden();
    await expect(page.locator('#studentAppSiteUrl')).toBeHidden();
    await expect(page.locator('#studentList .student-app-login-btn').first()).toHaveText('登录 APP');

    await page.evaluate(() => seed());
    await page.evaluate(async () => {
      teachers = [{ id: 'wrong', name: '张三', account: 'zhangsan01' }, { id: 'teacher-1', name: '张三', account: 'zhangsan02', userId: 'person-1' }];
      await flow.loadTeachers(true);
    });
    assert.equal(await page.evaluate(() => flow.state.teacher.activeStep), 2);
    assert.equal(await page.evaluate(() => calls.some((c) => c.type === 'FETCH_TEACHER_DETAIL')), false);
    await expect(page.locator('#teacherMatchStatus')).toContainText('找到 2 位教师');
    await page.locator('#teacherList .teacher-item').filter({ hasText: 'zhangsan02' }).click();
    assert.equal(await page.evaluate(() => flow.state.teacher.selectedTeacher.id), 'teacher-1');
    await page.evaluate(() => flow.setTeacherScopeFilter('subject', '数学'));
    const before = await page.evaluate(() => ({ scope: flow.state.teacher.scopeFilter, students: flow.state.teacher.studentPage }));
    const detailCount = await page.evaluate(() => calls.filter((c) => c.type === 'FETCH_TEACHER_DETAIL').length);
    await page.locator('#changeTeacherIdentityBtn').click();
    await page.locator('#teacherList .teacher-item').filter({ hasText: 'zhangsan02' }).click();
    assert.equal(await page.evaluate(() => flow.state.teacher.activeStep), 3);
    assert.equal(await page.evaluate(() => calls.filter((c) => c.type === 'FETCH_TEACHER_DETAIL').length), detailCount);
    await page.locator('#changeTeacherUserBtn').click();
    await page.locator('#userList .quick-row-select').click();
    assert.equal(await page.evaluate(() => flow.state.teacher.activeStep), 3);
    assert.deepEqual(await page.evaluate(() => ({ scope: flow.state.teacher.scopeFilter, students: flow.state.teacher.studentPage })), before);

    await page.locator('#changeTeacherIdentityBtn').click();
    await page.locator('#teacherRefreshBtn').click();
    await page.waitForFunction(() => !flow.state.teacher.loadingTeachers);
    assert.equal(await page.evaluate(() => flow.state.teacher.selectedTeacher.id), 'teacher-1');
    assert.deepEqual(await page.evaluate(() => ({ scope: flow.state.teacher.scopeFilter, students: flow.state.teacher.studentPage })), before);
    await page.evaluate(() => { failTeachers = true; });
    await page.locator('#teacherRefreshBtn').click();
    await expect(page.locator('#teacherMatchStatus')).toHaveText('教师查询暂时失败');
    assert.equal(await page.evaluate(() => flow.state.teacher.selectedTeacher.id), 'teacher-1');
    await page.evaluate(() => { failTeachers = false; teachers = [{ id: 'other', name: '李老师', account: 'lilaoshi' }]; });
    await page.locator('#teacherRefreshBtn').click();
    await expect(page.locator('#teacherMatchStatus')).toContainText('请重新选择');
    assert.equal(await page.evaluate(() => flow.state.teacher.selectedTeacher), null);
    await expect(page.locator('#studentSection')).toBeHidden();

    for (const candidate of [{ id: 'other', name: '张三', account: 'zhangsan01' }, { id: 'other', name: '张三' }]) {
      await page.evaluate(async (teacher) => { seed(); teachers = [teacher]; await flow.loadTeachers(true); }, candidate);
      assert.equal(await page.evaluate(() => flow.state.teacher.activeStep), 2, '同名或其他账号均保留手动选择');
    }
    await page.evaluate(async () => { seed(); teachers = [{ id: 'teacher-1', name: '张三', account: 'zhangsan02' }]; teacherTotal = 11; await flow.loadTeachers(true); });
    assert.equal(await page.evaluate(() => flow.state.teacher.activeStep), 2, '其他分页仍有候选人时保留手动选择');

    await page.evaluate(async () => {
      seed(); accountMiss = true;
      teachers = [{ id: 'teacher-1', name: '张三', phone: '13800001234' }];
      const user = flow.state.teacher.selectedUser;
      flow.state.teacher.selectedUser = null;
      await flow.selectTeacherUser(user);
    });
    assert.deepEqual(await page.evaluate(() => calls.filter((c) => c.type === 'FETCH_TEACHERS').map((c) => [c.payload.account, c.payload.name])), [['zhangsan02', ''], ['', '张三']]);
    assert.equal(await page.evaluate(() => flow.state.teacher.activeStep), 3);

    await page.evaluate(() => {
      seed(); holdTeacherQuery = true; teachers = [];
      const user = flow.state.teacher.selectedUser;
      flow.state.teacher.selectedUser = null;
      window.pendingSelection = flow.selectTeacherUser(user);
    });
    await page.waitForFunction(() => Boolean(window.releaseTeacherQuery));
    await page.evaluate(async () => {
      flow.state.teacher.teacherNameKeyword = '李老师';
      flow.state.teacher.teacherRequestId += 1;
      releaseTeacherQuery();
      await pendingSelection;
    });
    assert.equal(await page.evaluate(() => flow.state.teacher.teacherNameKeyword), '李老师', '旧账号查询结束后应保留用户新填的教师条件');
    assert.equal(await page.evaluate(() => calls.filter((c) => c.type === 'FETCH_TEACHERS').length), 1, '旧请求结束后应保留当前搜索流程');

    await page.evaluate(async () => { seed(); failTree = true; teachers = [{ id: 'teacher-1', name: '张三', account: 'zhangsan02' }]; await flow.loadTeachers(true); });
    await expect(page.locator('#studentEmpty')).toHaveText('班级读取暂时失败');
    await page.evaluate(() => { failTree = false; });
    await page.locator('#studentRefreshBtn').click();
    await expect(page.locator('#studentList .student-item-name')).toHaveText(['林知夏', '陈一诺']);
    assert.equal(await page.evaluate(() => calls.filter((c) => c.type === 'FETCH_SCHOOL_DEPT_TREE').length), 2);

    await page.evaluate(() => { document.getElementById('studentAppSiteUrl').value = ''; });
    await page.locator('#studentList .student-app-login-btn').first().click();
    await expect(page.locator('#studentAppSiteUrl')).toBeVisible();
    assert.equal(await page.evaluate(() => calls.some((c) => c.type === 'APP_LOGIN')), false);
    await page.locator('#studentAppSiteUrl').fill('http://localhost:5173');
    await page.locator('#studentAppSiteUrl').press('Tab');
    await page.locator('#studentAppSiteSettings > summary').click();
    await page.locator('#studentList .student-app-login-btn').first().click();
    await page.waitForFunction(() => calls.some((c) => c.type === 'APP_LOGIN'));
    assert.deepEqual(await page.evaluate(() => calls.find((c) => c.type === 'APP_LOGIN').payload), {
      siteUrl: 'http://localhost:5173', account: '202601', password: 'Xx@123456', tenantId: 'school-2', tenantName: '明德学校', recordHistory: true,
    });

    const output = path.join(root, 'test-results');
    fs.mkdirSync(output, { recursive: true });
    for (const width of [320, 400, 480]) {
      await page.setViewportSize({ width, height: 850 });
      await page.evaluate(() => window.scrollTo(0, 0));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, width + 'px 侧栏应完整显示');
      const bounds = await page.locator('#studentList .student-app-login-btn').first().boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, width + 'px 下登录按钮应在侧栏内');
      await page.screenshot({ path: path.join(output, 'teacher-lookup-' + width + '.png'), fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log('teacher lookup flow passed: identity matching, tenant pages, navigation, refresh, retry, APP login and 320/400/480px layouts');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
