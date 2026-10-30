/* 在完整扩展页面中验证卡片，包含启动入口、工作台路由和通用操作收起脚本。 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const root = path.join(__dirname, '..');

(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'user-card-page-'));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium', headless: true, viewport: { width: 400, height: 850 }, locale: 'zh-CN',
      args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const extensionId = worker.url().split('/')[2];
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      // 读取现有测试导出；页面仍执行完整 popup.js 及其正常启动流程。
      window.module = { get exports() { return {}; }, set exports(value) { if (value.renderTeacherShell) window.cardUi = value; } };
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text) => { window.copiedPhone = text; } } });
    });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.locator('#workspaceDock .workspace-dock-item').first().waitFor();
    await page.evaluate(async () => {
      const ns = InternalDevToolkit;
      ns.token.getToken = async () => ({ token: 'fixture-admin' });
      ns.messages.sendToBackground = async ({ type }) => {
        if (type === 'GET_QUICK_LOGIN_RECENT') return { ok: true, records: [{
          id: 'teacher-1', tenantId: 'tenant-1', tenantName: '明德学校', userName: '王丽华',
          account: '13800001234', phone: '13800001234', role: 'teacher', env: 'local', localPort: '8088', at: 1793232000000,
        }] };
        return { ok: true, res: { data: { records: [], total: 0 } } };
      };
      await ns.quickLoginUi.init();
      await ns.workspaceUi.switchWorkspace('gpt-admin-pre:relations');
      await ns.quickLoginUi.activate();
      const t = cardUi.state.teacher;
      t.selectedTenant = { tenantId: 'tenant-1', tenantName: '明德学校', domain: 'https://school.example.test' };
      t.deptLoaded = true;
      t.userPage = { current: 1, size: 10, total: 2, records: [
        { id: 'teacher-1', username: '王丽华', account: '13800001234', phone: '13800001234', roleName: '校长' },
        { id: 'teacher-2', username: '张强', account: 'zhangqiang02', phone: '13900005678', roleName: '教师' },
      ] };
      t.selectedUser = { ...t.selectedTenant, id: 'teacher-1', userName: '王丽华', account: '13800001234', phone: '13800001234', roleName: '校长' };
      t.activeStep = 1;
      const s = cardUi.state.student;
      const account = { id: 'account-1', loginId: 'student-1', tenantId: 'tenant-1', tenantName: '明德学校', username: '李同学', account: '13700002345', phone: '13700002345', accountType: '1' };
      s.accountPage = { current: 1, size: 10, total: 1, records: [account] };
      s.selectedAccount = { ...account, session: { origin: 'https://school.example.test', aiToken: 'fixture-session' } };
      s.activeStep = 0;
      s.relationMode = 'class';
      s.selectedClassId = 'class-1';
      s.classes = [{ id: 'class-1', name: '一年级一班' }];
      s.classTeacherMap = { 'class-1': [{ id: 'relation-1', userId: 'teacher-uid', name: '张强', duties: ['班主任', '数学教师'] }] };
      s.regularAccountsByTenant = { 'tenant-1': [{ loginId: 'teacher-2', userId: 'teacher-uid', username: '张强', account: '13900005678', phone: '13900005678' }] };
      cardUi.state.adminTokenAvailable = true;
      cardUi.renderTeacherShell();
      cardUi.renderStudentShell();
    });
    const output = path.join(root, 'test-results');
    await fs.mkdir(output, { recursive: true });
    async function checkCard(selector, name) {
      const card = page.locator(selector).first();
      await card.scrollIntoViewIfNeeded();
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(() => window.scrollX), 0, `${name} 聚焦后页面应保持水平位置`);
      assert.equal(await page.evaluate(() => document.body.scrollLeft), 0, `${name} 聚焦后页头和卡片应保持对齐`);
      assert.equal(await card.locator('.action-overflow-btn').count(), 0, `${name} 应只有组件自带的更多入口`);
      assert.equal(await card.locator('[data-compacted-action="true"]').count(), 0, `${name} 的评价项应保留`);
      const toolbar = await card.locator('.quick-user-toolbar').evaluate((element) => {
        const children = [...element.children].map((child) => child.getBoundingClientRect());
        return { count: children.length, height: element.getBoundingClientRect().height, y: children.map((rect) => rect.y) };
      });
      assert.equal(toolbar.count, name.endsWith('-summary') ? 4 : 3);
      assert.equal(toolbar.height, 32, `${name} 操作栏应保持紧凑的单行高度`);
      assert.equal(new Set(toolbar.y).size, 1);
      const phone = await card.locator('.quick-user-phone').textContent();
      assert.equal((await card.innerText()).split(phone).length - 1, 1, `${name} 相同的账号与手机号应只显示一次`);
      assert.equal(await card.locator(':scope > .quick-user-extra-actions').count(), 0, `${name} 卡片底部应保持一行操作`);
      if (['teacher-summary', 'student', 'student-summary'].includes(name)) assert.equal(await card.locator('.list-item-meta').textContent(), '明德学校', '去重后应保留租户名称');
      await card.locator('.quick-user-env-select').selectOption('local');
      const controls = await card.evaluate((element) => {
        const env = element.querySelector('.quick-user-env-field').getBoundingClientRect();
        const port = element.querySelector('.quick-user-port-field').getBoundingClientRect();
        const phone = element.querySelector('.quick-user-phone-row').getBoundingClientRect();
        return { envX: env.x, portX: port.x, envWidth: env.width, portWidth: port.width, gap: port.top - env.bottom, phoneRight: phone.right, portLeft: port.left, overflow: element.scrollWidth > element.clientWidth };
      });
      assert.equal(controls.portX, controls.envX, `${name} 端口应与环境框左边对齐`);
      assert.equal(controls.portWidth, controls.envWidth, `${name} 端口应与环境框等宽`);
      assert.ok(controls.gap >= 3 && controls.gap <= 5, `${name} 环境和端口应紧凑排列`);
      assert.ok(controls.phoneRight < controls.portLeft && !controls.overflow, `${name} 号码和端口应各占一列`);
      if (name.endsWith('-summary')) {
        assert.equal(await card.locator('.quick-user-toolbar .quick-user-direct-action').isVisible(), true, '更换账号应直接显示在底部操作栏');
        assert.equal(await card.locator('.quick-user-toolbar > button:last-child').getAttribute('class'), 'quick-user-action quick-user-more-btn', '更多应保持在最右侧');
      }
      await card.locator('.quick-user-more-btn').click();
      const menu = card.locator('.quick-user-more-menu');
      assert.equal(await menu.isVisible(), true);
      const extraCount = name === 'recent' ? 2 : 0;
      assert.equal(await menu.locator('button:visible').count(), 3 + extraCount, `${name} 应保留三项评价和场景操作`);
      assert.equal(await menu.evaluate((el) => el.getBoundingClientRect().height), 116 + (extraCount ? 9 + 34 * extraCount : 0));
      if (page.viewportSize().width === 400) await page.screenshot({ path: path.join(output, `user-card-page-${name}.png`) });
      await card.locator('.quick-user-more-btn').press('Escape');
      if (name === 'recent') assert.equal(await page.locator('#quickHistorySection').isVisible(), true, '关闭卡片菜单后应停留在历史页');
      await card.locator('.quick-user-phone-copy').click();
      assert.match(await page.evaluate(() => window.copiedPhone), /^1\d{10}$/);
      await page.evaluate(() => InternalDevToolkit.ui.toast(''));
    }
    for (const width of [320, 400, 500]) {
      await page.setViewportSize({ width, height: 850 });
      await page.evaluate(async () => {
        await InternalDevToolkit.workspaceUi.back();
        cardUi.state.teacher.activeStep = 1;
        cardUi.renderTeacherShell();
      });
      await page.locator('#modeTeacherBtn').click();
      await checkCard('#userList .quick-user-card', 'tenant');
      await page.evaluate(() => { cardUi.state.teacher.activeStep = 2; cardUi.renderTeacherShell(); });
      await checkCard('#teacherUserSummary', 'teacher-summary');
      await page.locator('#modeStudentBtn').click();
      await page.evaluate(() => { cardUi.state.student.activeStep = 0; cardUi.renderStudentShell(); });
      await checkCard('#accountList .quick-user-card', 'student');
      await page.evaluate(async () => {
        cardUi.state.student.activeStep = 1;
        cardUi.renderStudentShell();
        await cardUi.renderRelationTeachers('class-1');
      });
      await checkCard('#studentAccountSummary', 'student-summary');
      await checkCard('#lookupTeacherList .quick-user-card', 'relation');
      await page.locator('#workspaceHistoryBtn').click();
      await checkCard('#recentList .quick-user-card', 'recent');
    }
    assert.deepEqual(errors, []);
    console.log('user card complete extension page tests passed: six scenes at 320/400/500px, duplicate account removal, aligned environment/port, one toolbar, contextual menus, clipboard and workspace navigation');
  } finally {
    await context?.close();
    await fs.rm(profile, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
