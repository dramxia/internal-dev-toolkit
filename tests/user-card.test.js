const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const root = path.join(__dirname, '..');
const sources = ['src/common/tenant.js', 'src/popup/ui.js', 'src/popup/user-card.js', 'src/popup/quick-login-ui.js'];
const cards = [
  '#userList .quick-user-card', '#teacherUserSummary', '#accountList .quick-user-card',
  '#studentAccountSummary', '#lookupTeacherList .quick-user-card', '#recentList .quick-user-card',
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    async function openCardMenu(card) {
      await card.scrollIntoViewIfNeeded();
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await card.locator('.quick-user-more-btn').click();
    }
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const html = fs.readFileSync(path.join(root, 'popup.html'), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    await page.setContent(html);
    await page.evaluate(() => {
      window.module = { exports: {} };
      window.calls = [];
      window.copied = [];
      window.recentRecords = [{
        id: 'recent-1', tenantId: 'tenant-1', tenantName: '明德学校', userName: '陈老师',
        domain: 'https://school.example.test', role: 'teacher', account: 'chenlaoshi', at: 1793232000000,
      }];
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text) => copied.push(text) }, configurable: true });
      window.InternalDevToolkit = {
        ui: { toast() {} },
        token: { getToken: async () => ({ token: 'admin-test' }) },
        messages: { sendToBackground: async ({ type, payload }) => {
          calls.push({ type, payload });
          if (type === 'GET_QUICK_LOGIN_RECENT') return { ok: true, records: recentRecords };
          if (type === 'FETCH_USERS' && payload.tenantId === 'tenant-1') return { ok: true, res: { data: { records: [
            { id: 'wrong-id', tenantId: 'tenant-1', username: '陈老师', phone: '13000000000' },
            { id: 'recent-1', tenantId: 'wrong-tenant', username: '陈老师', phone: '13100000000' },
            { id: 'recent-1', tenantId: 'tenant-1', username: '陈老师', phone: '', mobile: '13500007890' },
          ], total: 3 } } };
          if (type === 'RESOLVE_USER_SESSION') return { ok: true, res: {
            url: 'https://school.example.test/newHome?token=test-token', origin: 'https://school.example.test', aiToken: 'test-token',
          } };
          if (type === 'QUICK_LOGIN') {
            if (window.holdLogin) await new Promise((resolve) => { window.releaseLogin = resolve; });
            recentRecords = recentRecords.map((record) => record.id === payload.id ? { ...record, env: payload.env, localPort: payload.localPort } : record);
            return { ok: true, res: { url: 'https://school.example.test/newHome?token=test-token' } };
          }
          if (type === 'OPEN_LOGIN_URL') return { ok: true, res: { reused: false } };
          if (type === 'FETCH_OTHER_APPS') return { ok: true, res: { data: [{ name: 'AI评价系统', linkUrl: '/ai-review' }] } };
          if (type === 'FETCH_TEACHERS' && window.applyMode) return { ok: true, res: { data: { records: [{ id: 'ai-teacher-1', name: '陈老师', phone: '13500007890' }], total: 1 } } };
          if (type === 'DELETE_QUICK_LOGIN_RECENT') {
            if (window.failDelete) return { ok: false, error: '删除失败，请重试' };
            recentRecords = recentRecords.filter((item) => item.id !== payload.id);
            return { ok: true, res: {} };
          }
          return { ok: true, res: { data: { records: [], total: 0 } } };
        } },
      };
    });
    for (const file of sources) await page.addScriptTag({ path: path.join(root, file) });
    await page.evaluate(async () => {
      window.ui = module.exports;
      const t = ui.state.teacher;
      t.selectedTenant = { tenantId: 'tenant-1', tenantName: '明德学校', domain: 'https://school.example.test', industry: 3 };
      t.deptLoaded = true;
      t.userPage = { current: 1, size: 10, total: 1, records: [{ id: 'teacher-1', username: '王丽华', account: 'wanglihua', phone: '', mobile: '13800001234', roleName: '校长' }] };
      t.selectedUser = {
        ...t.selectedTenant, id: 'teacher-1', userName: '王丽华', account: 'wanglihua', phone: '', roleName: '校长',
        origin: 'https://school.example.test', aiToken: 'private-session-token',
      };
      t.activeStep = 2;
      const s = ui.state.student;
      s.accountPage = { current: 1, size: 10, total: 1, records: [{
        id: 'account-1', loginId: 'student-1', tenantId: 'tenant-1', tenantName: '明德学校', username: '李同学', account: '13700002345', phone: '', accountType: '1',
      }] };
      s.selectedAccount = {
        ...s.accountPage.records[0], session: { origin: 'https://school.example.test', aiToken: 'private-student-token' },
      };
      s.activeStep = 1;
      s.selectedClassId = 'class-1';
      s.classes = [{ id: 'class-1', name: '一年级一班' }];
      s.classTeacherMap = { 'class-1': [{ id: 'relation-1', userId: 'teacher-uid', name: '张强', phone: '13900005678', duties: ['班主任', '数学教师'] }] };
      s.regularAccountsByTenant = { 'tenant-1': [{ loginId: 'relation-login-1', userId: 'teacher-uid', username: '张强', account: 'zhangqiang', phone: '' }] };
      ui.state.mode = 'student';
      ui.state.adminTokenAvailable = true;
      window.initialCardState = JSON.parse(JSON.stringify(ui.state));
      ui.renderTeacherShell();
      ui.renderStudentShell();
      await ui.renderRelationTeachers('class-1');
      await ui.renderRecent();
      ui.bindEvents();
      InternalDevToolkit.ui.observeActions();
      // 与正式工作台一样，把最近登录移出查询面板，验证独立页面中的事件。
      document.querySelector('.panels').appendChild(document.getElementById('quickHistorySection'));
      document.getElementById('panel-admin').classList.remove('active');
      document.getElementById('panel-quick').classList.add('active');
    });

    // 等页面级操作收起脚本处理完首轮和异步 DOM 更新，再检查公共卡片。
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.locator('.quick-user-card .action-overflow-btn').count(), 0, '公共卡片已自带更多菜单，通用脚本应保留它的三列操作栏');
    assert.equal(await page.locator('.quick-user-card [data-compacted-action="true"]').count(), 0, '通用脚本应保留公共卡片中的评价入口');

    // 同时展示六处真实挂载点，仍保留各自的事件委托与滚动容器。
    await page.addStyleTag({ content: '#teacherUserStep, #teacherUserStepBody, #teacherUserSummary, #studentAccountSummary, #studentAccountStepBody, #studentRelationPanel, #teacherModePanel, #studentModePanel { display: block !important; }' });
    for (const selector of cards) {
      assert.equal(await page.locator(selector).count(), 1, `${selector} 应使用一张公共用户卡片`);
      assert.equal(await page.locator(selector + ' .quick-user-avatar').count(), 1);
      assert.equal(await page.locator(selector + ' .quick-user-env-select').count(), 1);
      assert.equal(await page.locator(selector + ' .quick-user-phone-copy').count(), 1);
      assert.equal(await page.locator(selector + ' .quick-user-toolbar .action-btn').count(), 2);
      assert.equal(await page.locator(selector + ' .quick-user-more-btn').count(), 1);
      assert.deepEqual(await page.locator(selector + ' .action-btn').evaluateAll((buttons) => buttons.map((button) => button.dataset.action)),
        ['open', 'copy', 'student', 'aiReview', 'teacher']);
      assert.equal(await page.locator(selector).evaluate((card) => card.outerHTML.includes('private-')), false, '卡片及其渲染签名应只包含展示和登录定位信息');
    }
    const expectedPhones = ['13800001234', '13800001234', '13700002345', '13700002345', '13900005678', '13500007890'];
    // 用实际鼠标点击卡片边缘、号码和操作栏留白，同时核对控件与加载状态。
    await page.evaluate(() => {
      const probe = InternalDevToolkit.userCard.create({
        name: '周老师', account: 'zhou', phone: '13600001234', selectable: true,
        meta: { id: 'probe', tenantId: 'tenant-1' },
      });
      probe.id = 'selectionProbe';
      probe.style.cssText = 'position:fixed;top:20px;left:20px;width:360px;z-index:30';
      window.selectionClicks = 0;
      probe.querySelector('.quick-row-select').addEventListener('click', () => { selectionClicks += 1; });
      document.body.appendChild(probe);
    });
    const probe = page.locator('#selectionProbe');
    await probe.click({ position: { x: 2, y: 2 } });
    assert.equal(await page.evaluate(() => selectionClicks), 1, '卡片内边距应能选择账号');
    await probe.locator('.quick-user-phone').click();
    assert.equal(await page.evaluate(() => selectionClicks), 2, '手机号文字应能选择账号');
    await probe.locator('.quick-user-toolbar').click({ position: { x: 1, y: 1 } });
    assert.equal(await page.evaluate(() => selectionClicks), 3, '操作栏分隔线附近的留白应能选择账号');
    await probe.locator('.quick-row-select').press('Enter');
    assert.equal(await page.evaluate(() => selectionClicks), 4, '姓名按钮的键盘选择应只触发一次');
    for (const selector of ['.quick-user-env-select', '.quick-user-phone-copy', '[data-action="copy"]', '.quick-user-more-btn']) {
      await probe.locator(selector).dispatchEvent('click');
      assert.equal(await page.evaluate(() => selectionClicks), 4, selector + ' 应只执行自身操作');
    }
    await page.evaluate(() => InternalDevToolkit.userCard.closeMenu(document.getElementById('selectionProbe')));
    await page.evaluate(() => InternalDevToolkit.userCard.setBusy(document.getElementById('selectionProbe'), true));
    await probe.click({ position: { x: 2, y: 2 } });
    assert.equal(await page.evaluate(() => selectionClicks), 4, '正在处理时应保留当前选择');
    await page.evaluate(() => InternalDevToolkit.userCard.setBusy(document.getElementById('selectionProbe'), false));
    await probe.click({ position: { x: 2, y: 2 } });
    assert.equal(await page.evaluate(() => selectionClicks), 5, '处理结束后应恢复空白区域选择');
    await page.evaluate(() => document.getElementById('selectionProbe').remove());
    const selectionBeforeCopy = await page.evaluate(() => [ui.state.teacher.selectedUser.id, ui.state.student.selectedAccount.id]);
    for (const [index, selector] of cards.entries()) {
      assert.equal(await page.locator(selector + ' .quick-user-phone').textContent(), expectedPhones[index]);
      assert.equal(await page.locator(selector + ' .quick-user-more-menu').isVisible(), false);
      await page.evaluate(() => { calls.length = 0; });
      await page.locator(selector + ' .quick-user-phone-copy').dispatchEvent('click');
      await page.waitForFunction((phone) => copied.at(-1) === phone, expectedPhones[index]);
      assert.equal(await page.locator(selector + ' .quick-user-phone-copy').getAttribute('data-copied'), 'true');
      assert.deepEqual(await page.evaluate(() => [ui.state.teacher.selectedUser.id, ui.state.student.selectedAccount.id]), selectionBeforeCopy);
      assert.equal(await page.evaluate(() => calls.length), 0, '复制手机号应只操作剪贴板');
    }
    await page.evaluate(() => {
      navigator.clipboard.writeText = async () => { throw new Error('denied'); };
      document.execCommand = (command) => { if (command === 'copy') copied.push(document.activeElement.value); return true; };
    });
    await page.locator(cards[0] + ' .quick-user-phone-copy').dispatchEvent('click');
    await page.waitForFunction(() => copied.at(-1) === '13800001234');
    await page.evaluate(() => { document.execCommand = () => false; });
    await page.locator(cards[0] + ' .quick-user-phone-copy').dispatchEvent('click');
    await page.waitForFunction(() => document.getElementById('quickActionStatus').textContent.includes('复制失败'));
    assert.equal(await page.locator(cards[0] + ' .quick-user-phone-copy').isDisabled(), false);
    assert.equal(await page.locator(cards[0] + ' .quick-user-phone-copy').getAttribute('data-copied'), 'false');
    await page.evaluate(() => { navigator.clipboard.writeText = async (text) => { copied.push(text); }; });

    await page.locator(cards[0]).scrollIntoViewIfNeeded();
    const moreButton = page.locator(cards[0] + ' .quick-user-more-btn');
    await moreButton.press('ArrowDown');
    assert.equal(await page.locator(cards[0] + ' .quick-user-menu-item').first().evaluate((button) => document.activeElement === button), true);
    await page.locator(cards[0] + ' .quick-user-menu-item').first().press('ArrowDown');
    assert.equal(await page.locator(cards[0] + ' .quick-user-menu-item').nth(1).evaluate((button) => document.activeElement === button), true);
    await page.locator(cards[0] + ' .quick-user-menu-item').nth(1).press('Escape');
    assert.equal(await moreButton.evaluate((button) => document.activeElement === button), true);
    await moreButton.click();
    assert.equal(await page.locator(cards[0] + ' .quick-user-more-menu').evaluate((menu) => menu.matches(':popover-open')), true, '菜单应使用浏览器顶层显示，避开列表裁切');
    await page.evaluate(() => document.body.click());
    assert.equal(await page.locator(cards[0] + ' .quick-user-more-menu').isVisible(), false);

    assert.match(await page.locator(cards[4]).textContent(), /班主任.*数学教师/);
    await page.evaluate(() => ui.renderRelationTeachers('class-1', { force: true }));
    assert.equal(await page.locator(cards[4] + ' .list-item-meta').textContent(), 'zhangqiang', '重复读取关系缓存应保留已解析的账号');
    assert.equal(await page.locator(cards[4] + ' .quick-user-phone').textContent(), '13900005678', '重复读取关系缓存应保留手机号');
    assert.equal(await page.locator(cards[5] + ' .quick-user-time').count(), 1);
    assert.equal(await page.locator(cards[1] + ' [data-card-action="changeTeacherUser"]').count(), 1);
    assert.equal(await page.locator(cards[3] + ' [data-card-action="changeStudentAccount"]').count(), 1);
    const metaStyles = [];
    for (const selector of cards) {
      metaStyles.push(await page.locator(selector + ' .list-item-meta').evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.color, style.fontFamily, style.fontSize];
      }));
    }
    assert.ok(metaStyles.every((style) => JSON.stringify(style) === JSON.stringify(metaStyles[0])), '六个实际页面位置的账号文字样式应一致');
    assert.deepEqual(await page.evaluate(() => {
      const cases = [
        { account: '13800001234', phone: '13800001234' },
        { account: '13800001234', phone: ' +86 138-0000-1234 ', details: '明德学校' },
        { account: '008613800001234', phone: '13800001234' },
        { account: 'wanglihua', phone: '13800001234', details: '明德学校' },
        { account: '20260010001', phone: '' },
      ];
      return cases.map((item) => {
        const card = InternalDevToolkit.userCard.create({ name: '测试用户', ...item, meta: { id: 'test', tenantId: 'test' } });
        return card.querySelector('.list-item-meta')?.textContent || '';
      });
    }), ['', '明德学校', '', 'wanglihua · 明德学校', '20260010001'], '仅去掉重复的手机号账号，保留租户、独立账号和学号');

    for (const [index, selector] of cards.entries()) {
      await page.locator(selector).evaluate((card, port) => {
        const select = card.querySelector('.quick-user-env-select');
        select.value = 'local';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        const input = card.querySelector('.quick-user-port');
        input.value = port;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, String(5100 + index));
      const target = await page.locator(selector).evaluate((card) => ({
        env: card.dataset.env, port: card.dataset.localPort,
        buttons: [...card.querySelectorAll('.action-btn')].map((button) => [button.dataset.env, button.dataset.localPort]),
        hidden: card.querySelector('.quick-user-port-field').classList.contains('hidden'),
      }));
      assert.equal(target.env, 'local');
      assert.equal(target.port, String(5100 + index));
      assert.equal(target.hidden, false);
      assert.ok(target.buttons.every(([env, port]) => env === 'local' && port === String(5100 + index)));
    }
    assert.deepEqual(await page.evaluate(() => [ui.state.teacher.selectedUser.localPort, ui.state.student.selectedAccount.localPort]), ['5101', '5103']);

    // 输入中的数字保持原样，提交后再规范端口；重复同步标签时保留一份环境说明。
    await page.locator(cards[0]).evaluate((card) => {
      const input = card.querySelector('.quick-user-port');
      input.value = '00080';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    assert.equal(await page.locator(cards[0] + ' .quick-user-port').inputValue(), '00080');
    await page.locator(cards[0] + ' .quick-user-port').dispatchEvent('change');
    assert.equal(await page.locator(cards[0] + ' .quick-user-port').inputValue(), '80');
    await page.locator(cards[0] + ' .quick-user-port').fill('99999');
    await page.locator(cards[0] + ' .quick-user-port').dispatchEvent('change');
    assert.equal(await page.locator(cards[0] + ' .quick-user-port-error').isVisible(), true);
    await page.evaluate(() => { calls.length = 0; });
    await page.locator(cards[0] + ' [data-action="open"]').dispatchEvent('click');
    assert.equal(await page.evaluate(() => calls.length), 0, '无效端口应先显示校验信息');
    await page.locator(cards[0] + ' .quick-user-port').fill('80');
    await page.locator(cards[0] + ' .quick-user-port').dispatchEvent('change');
    const label = await page.locator(cards[0] + ' [data-action="open"]').getAttribute('aria-label');
    assert.equal(label, '打开 AI 平台（本地端口 80）');

    // 六个入口的五项公共操作都走相同处理器，逐项验证账号、环境和打开地址。
    for (const selector of cards) {
      await page.locator(selector + ' .quick-user-env-select').selectOption('local');
      for (const action of ['open', 'copy', 'student', 'aiReview', 'teacher']) {
        const button = page.locator(selector + ` [data-action="${action}"]`);
        const meta = await button.evaluate((element) => ({ id: element.dataset.id, port: element.dataset.localPort }));
        await page.evaluate(() => { calls.length = 0; });
        if (['student', 'aiReview', 'teacher'].includes(action)) {
          await page.locator(selector).scrollIntoViewIfNeeded();
          await page.locator(selector + ' .quick-user-more-btn').click();
          assert.equal(await page.locator(selector + ' .quick-user-more-menu').isVisible(), true);
          await button.click();
        } else await button.dispatchEvent('click');
        await page.waitForFunction(() => !ui.state.loadingLogin);
        const calls = await page.evaluate(() => window.calls);
        const request = calls.find((call) => call.type === (action === 'copy' ? 'RESOLVE_USER_SESSION' : 'QUICK_LOGIN'));
        assert.equal(request.payload.id, meta.id, `${selector} 的 ${action} 应使用当前账号`);
        assert.equal(request.payload.tenantId, 'tenant-1');
        if (action === 'copy') assert.equal(await page.evaluate(() => copied.at(-1)), '?token=test-token');
        else {
          assert.equal(request.payload.env, 'local');
          assert.equal(request.payload.localPort, meta.port);
          const open = calls.find((call) => call.type === 'OPEN_LOGIN_URL');
          assert.equal(new URL(open.payload.url).origin, new URL('http://localhost:' + meta.port).origin);
          assert.equal(open.payload.reuseCurrentTab, action === 'open');
        }
      }
    }

    await page.evaluate(() => { ui.renderTeacherShell(); ui.renderStudentShell(); });
    await page.locator(cards[1]).scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.locator(cards[1] + ' .quick-user-toolbar [data-card-action="changeTeacherUser"]').isVisible(), true, '更换账号应直接显示在卡片底部操作栏');
    await page.locator(cards[1] + ' [data-card-action="changeTeacherUser"]').press('Enter');
    assert.equal(await page.evaluate(() => ui.state.teacher.activeStep), 1);
    assert.equal(await page.evaluate(() => ui.state.teacher.selectedUser.id), 'teacher-1');
    assert.equal(await page.locator(cards[1] + ' .quick-user-more-menu').isVisible(), false);
    assert.equal(await page.locator(cards[3] + ' .quick-user-toolbar [data-card-action="changeStudentAccount"]').isVisible(), true);
    await page.locator(cards[3] + ' [data-card-action="changeStudentAccount"]').click();
    assert.equal(await page.evaluate(() => ui.state.student.activeStep), 0);
    assert.equal(await page.evaluate(() => ui.state.student.selectedAccount.loginId), 'student-1');

    // 选中态更新保留现有行、环境输入和焦点。
    assert.equal(await page.evaluate(() => {
      const oldRow = document.querySelector('#userList .quick-user-card');
      const input = oldRow.querySelector('.quick-user-port');
      ui.state.teacher.selectedUser = null;
      ui.renderTeacherUsers();
      return oldRow === document.querySelector('#userList .quick-user-card') && input.value === '80' && !oldRow.classList.contains('active');
    }), true);

    await page.evaluate(() => {
      ui.state.teacher.activeStep = 1;
      document.getElementById('panel-admin').classList.remove('active');
      document.getElementById('panel-quick').classList.add('active');
      ui.renderTeacherShell();
      const input = document.querySelector('#userList .quick-user-port');
      input.focus();
      ui.renderTeacherUsers();
      window.focusKept = document.activeElement === input;
      window.holdLogin = true;
    });
    assert.equal(await page.evaluate(() => focusKept), true, '更新选中态后应保留端口输入焦点');
    await page.locator(cards[0] + ' [data-action="open"]').dispatchEvent('click');
    await page.waitForFunction(() => typeof releaseLogin === 'function');
    assert.equal(await page.locator(cards[0] + ' [data-action="open"] .quick-user-action-label').textContent(), '处理中');
    assert.equal(await page.locator(cards[0] + ' [data-action="open"] .quick-user-spin').count(), 1);
    assert.equal(await page.evaluate(() => {
      const row = document.querySelector('#userList .quick-user-card');
      ui.renderTeacherShell();
      return row === document.querySelector('#userList .quick-user-card') && row.querySelector('.quick-user-port').value === '80';
    }), true, '登录等待期间的普通刷新应保留卡片和端口');
    await page.evaluate(() => {
      ui.state.teacher.userPage.records[0].username = '王丽华（更新）';
      ui.renderTeacherUsers();
    });
    assert.equal(await page.locator(cards[0] + ' [data-action="open"]').isDisabled(), true);
    assert.equal(await page.locator(cards[0] + ' [data-action="open"] .quick-user-action-label').textContent(), '处理中', '在途刷新新增的卡片应保留预览中的等待样式');
    await page.evaluate(() => { window.holdLogin = false; releaseLogin(); });
    await page.waitForFunction(() => !ui.state.loadingLogin);
    assert.equal(await page.locator(cards[0] + ' [data-action="open"]').isDisabled(), false, '登录结束后应恢复等待期间新建的卡片按钮');
    assert.equal(await page.locator(cards[0] + ' [data-action="open"] .quick-user-action-label').textContent(), 'AI 平台');
    assert.equal(await page.locator('.quick-user-spin').count(), 0);

    // 接口也没有手机号的记录展示缺省提示，学生学号保持原样。
    await page.evaluate(async () => {
      recentRecords.push({ id: 'no-phone', tenantId: 'tenant-2', userName: '无手机号', role: 'student', account: '20260010001' });
      await ui.renderRecent();
    });
    const noPhoneCard = page.locator('#recentList .quick-user-card').last();
    assert.equal(await noPhoneCard.locator('.quick-user-phone-missing').textContent(), '未提供手机号');
    assert.equal(await noPhoneCard.locator('.quick-user-phone-copy').count(), 0);
    await page.evaluate(() => { recentRecords = recentRecords.filter((item) => item.id !== 'no-phone'); });

    // 学生历史记录保留删除，应用入口禁用；后台凭证失效时仍可管理历史记录。
    await page.evaluate(async () => {
      recentRecords.push({ ...recentRecords[0], id: 'recent-student', role: 'student' });
      ui.state.adminTokenAvailable = false;
      await ui.renderRecent();
    });
    const studentRecent = page.locator('#recentList .quick-user-card').nth(1);
    assert.equal(await studentRecent.locator('[data-card-action="apply"]').isDisabled(), true);
    assert.equal(await studentRecent.locator('[data-card-action="delete"]').isDisabled(), false);
    assert.equal(await studentRecent.locator('[data-action="open"]').isDisabled(), true);
    await page.evaluate(() => { window.failDelete = true; });
    await openCardMenu(studentRecent);
    await studentRecent.locator('[data-card-action="delete"]').click();
    await page.waitForFunction(() => document.getElementById('quickActionStatus').textContent.includes('删除失败'));
    assert.equal(await studentRecent.locator('[data-card-action="delete"]').isDisabled(), false);
    await page.evaluate(() => { window.failDelete = false; });
    await openCardMenu(studentRecent);
    await studentRecent.locator('[data-card-action="delete"]').click();
    await page.waitForFunction(() => document.querySelectorAll('#recentList .quick-user-card').length === 1);

    await page.evaluate(async () => { window.applyMode = true; ui.state.adminTokenAvailable = true; await ui.renderRecent(); });
    await page.locator(cards[5]).evaluate((card) => {
      const select = card.querySelector('.quick-user-env-select');
      select.value = 'local';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const input = card.querySelector('.quick-user-port');
      input.value = '6020';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await openCardMenu(page.locator(cards[5]));
    await page.locator(cards[5] + ' [data-card-action="apply"]').click();
    await page.waitForFunction(() => !ui.state.loadingLogin && document.getElementById('quickActionStatus').textContent === '已应用最近登录信息');
    assert.deepEqual(await page.evaluate(() => ({
      tenant: ui.state.teacher.selectedTenant.tenantId, user: ui.state.teacher.selectedUser.id,
      env: ui.state.teacher.selectedUser.env, port: ui.state.teacher.selectedUser.localPort,
      teacher: ui.state.teacher.selectedTeacher.id,
    })), { tenant: 'tenant-1', user: 'recent-1', env: 'local', port: '6020', teacher: 'ai-teacher-1' });

    // 关系账号未解析时保留职责信息，并禁用环境和登录按钮。
    await page.evaluate(async () => {
      ui.state.mode = 'student';
      ui.state.student.regularAccountsByTenant['tenant-1'] = [];
      ui.state.student.relationTeacherCache = {};
      await ui.renderRelationTeachers('class-1', { force: true });
    });
    assert.match(await page.locator(cards[4]).textContent(), /班主任.*数学教师/);
    assert.equal(await page.locator(cards[4] + ' [data-action="open"]').isDisabled(), true);
    assert.equal(await page.locator(cards[4] + ' .quick-user-env-select').isDisabled(), true);

    // 使用实际生成的六张卡片核对宽、窄侧栏的尺寸和溢出，并保存预览。
    await page.evaluate(async () => {
      Object.assign(ui.state, initialCardState);
      ui.renderTeacherShell();
      ui.renderStudentShell();
      await ui.renderRelationTeachers('class-1', { force: true });
      await ui.renderRecent();
      const gallery = document.createElement('main');
      gallery.id = 'cardGallery';
      gallery.style.cssText = 'display:grid;gap:18px;width:360px;margin:24px auto;padding:8px;';
      const selectors = ['#userList .quick-user-card', '#teacherUserSummary', '#accountList .quick-user-card', '#studentAccountSummary', '#lookupTeacherList .quick-user-card', '#recentList .quick-user-card'];
      const labels = ['租户用户列表', '选中租户用户', '学生账号列表', '选中学生账号', '关联教师', '最近登录'];
      selectors.forEach((selector, index) => {
        const section = document.createElement('section');
        section.className = 'quick-user-card-host';
        section.innerHTML = '<h3 style="font-size:12px;margin-bottom:8px">' + labels[index] + '</h3>';
        const source = document.querySelector(selector);
        const card = source.cloneNode(true);
        card.querySelectorAll('select').forEach((select, selectIndex) => { select.value = source.querySelectorAll('select')[selectIndex].value; });
        card.classList.remove('hidden');
        section.appendChild(card);
        gallery.appendChild(section);
      });
      document.body.replaceChildren(gallery);
    });
    await page.addStyleTag({ content: 'html, body { height: auto !important; min-height: 0 !important; overflow: visible !important; }' });
    for (const width of [280, 320, 360, 480]) {
      await page.locator('#cardGallery').evaluate((gallery, width) => { gallery.style.width = width + 'px'; }, width);
      const measurements = await page.locator('#cardGallery .quick-user-card').evaluateAll((items) => items.map((card) => ({
        overflow: card.scrollWidth > card.clientWidth,
        phoneHeight: card.querySelector('.quick-user-phone-row').getBoundingClientRect().height,
        phoneIcon: card.querySelector('.quick-user-phone-copy svg').getBoundingClientRect().width,
        envWidth: card.querySelector('.quick-user-env-select').getBoundingClientRect().width,
        columns: getComputedStyle(card.querySelector('.quick-user-toolbar')).gridTemplateColumns.split(' ').map(Number.parseFloat),
      })));
      assert.ok(measurements.every((card) => !card.overflow), `${width}px 宽度下六张卡片均应完整容纳内容`);
      assert.ok(measurements.every((card) => card.phoneHeight === 16 && card.phoneIcon === 11 && card.envWidth === 104), '六处均应保留紧凑号码行、小复制图标和完整环境文字');
      assert.ok(measurements.every((card) => Math.max(...card.columns) - Math.min(...card.columns) < 1), '底部各项操作应保持等宽');
    }
    await page.locator('#cardGallery').evaluate((gallery) => { gallery.style.width = '360px'; });
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    await page.locator('#cardGallery').screenshot({ path: path.join(root, 'test-results/user-cards.png') });
    await require('./user-card-visual.test.js')(browser);
    assert.deepEqual(errors, []);
    console.log('user card browser tests passed: six locations, shared actions, special actions, port isolation, narrow layouts');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
