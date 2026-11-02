/* 浏览器中的真实页面与设置逻辑；连接使用可控响应，复现失败和边界情况。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const repo = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(repo, file), 'utf8');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 380, height: 850 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setContent(read('popup.html').replace('<script src="popup.js"></script>', ''));
    await page.evaluate(() => {
      document.querySelectorAll('.panel').forEach((panel) => { panel.classList.remove('active'); panel.inert = true; });
      const panel = document.getElementById('panel-component');
      panel.classList.add('active'); panel.inert = false; panel.setAttribute('aria-hidden', 'false');
      window.fixture = {
        failStatus: false, calls: [], toasts: [],
        tab: { id: 7, url: 'http://localhost:5173/dashboard' },
        settings: { origins: [], openShortcut: { meta: false, ctrl: true, alt: false, shift: false, code: 'KeyK' }, menuShortcut: { meta: true, ctrl: false, alt: false, shift: false, code: '' } },
        state: { status: 'off', origin: 'http://localhost:5173' },
        host: { connected: true, editorAvailable: true, editor: { name: 'Cursor', path: '/Applications/Cursor.app' }, capabilities: ['uninstall'] },
      };
      const event = () => ({ addListener() {} });
      window.chrome = {
        runtime: { id: 'abcdefghijklmnopabcdefghijklmnop', onMessage: event() },
        windows: { async getCurrent() { return { id: 1 }; } },
        tabs: { async query() { return [fixture.tab]; }, onActivated: event(), onUpdated: event() },
      };
      window.InternalDevToolkit = {
        messages: { async sendToBackground(message) {
          fixture.calls.push(message);
          if (message.type === 'COMPONENT_STATUS') {
            if (fixture.holdStatus) await new Promise((resolve) => { fixture.releaseStatus = resolve; });
            if (fixture.failStatus) throw new Error('测试连接中断');
            return structuredClone({ ok: true, settings: fixture.settings, state: fixture.state, host: fixture.host });
          }
          if (message.type === 'COMPONENT_SAVE_SETTINGS') {
            if (fixture.holdSave) await new Promise((resolve) => { fixture.releaseSave = resolve; });
            if (fixture.failSave) throw new Error('测试设置保存失败');
            fixture.settings = InternalDevToolkit.componentSettings.normalizeSettings(message.payload);
            return { ok: true, settings: fixture.settings };
          }
          if (message.type === 'COMPONENT_CHOOSE_EDITOR') fixture.host = { ...fixture.host, editorAvailable: true, editor: { name: 'Cursor', path: '/Applications/Cursor.app' } };
          if (message.type === 'COMPONENT_START') fixture.state = { status: 'on', origin: 'http://localhost:5173', frameworks: ['React'], project: { root: '/project/app' } };
          if (message.type === 'COMPONENT_STOP') fixture.state = { status: 'off', origin: 'http://localhost:5173' };
          return { ok: true };
        } },
      };
    });
    for (const file of ['src/common/component-settings.js', 'src/popup/ui.js', 'src/popup/component-inspector-ui.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      const toast = InternalDevToolkit.ui.toast;
      InternalDevToolkit.ui.toast = (...args) => { fixture.toasts.push(args); toast(...args); };
    });
    const refresh = () => page.evaluate(() => InternalDevToolkit.componentInspectorUi.activate());
    await page.evaluate(async () => { await InternalDevToolkit.componentInspectorUi.init(); await InternalDevToolkit.componentInspectorUi.activate(); });
    const value = (id) => page.locator(`#${id}`);
    const settle = () => page.waitForFunction(() => !document.getElementById('componentCheckHost').disabled);
    assert.equal(await page.locator('.component-setting[open]').count(), 0, '日常使用默认收起设置');
    for (const width of [380, 320]) {
      await page.setViewportSize({ width, height: 750 });
      const layout = await page.evaluate(() => {
        const toggle = document.getElementById('componentToggle').getBoundingClientRect();
        const main = document.getElementById('workspaceMain').getBoundingClientRect();
        return { fits: toggle.top >= main.top && toggle.bottom <= main.bottom, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(layout.fits, true, '启停开关应在首屏');
      assert.equal(layout.overflow, false, '窄侧栏应完整显示内容');
    }
    await value('componentToggle').click(); await settle();
    assert.equal(await value('componentToggle').getAttribute('aria-checked'), 'true');
    assert.equal(await value('componentPageState').textContent(), '已开启');
    assert.match(await value('componentStatusHint').textContent(), /同一开发地址共用开关/);
    await value('componentToggle').click(); await settle();
    assert.equal(await value('componentPageState').textContent(), '未开启');
    await page.evaluate(() => { fixture.holdStatus = true; });
    await value('componentToggle').click();
    await page.waitForFunction(() => typeof fixture.releaseStatus === 'function');
    assert.equal(await value('componentToggle').isDisabled(), true, '等新状态返回后才允许下一次启停');
    await page.evaluate(() => { fixture.holdStatus = false; fixture.releaseStatus(); delete fixture.releaseStatus; });
    await settle();
    assert.equal(await value('componentToggle').getAttribute('aria-checked'), 'true');
    await value('componentToggle').click(); await settle();
    assert.equal(await value('componentToggle').getAttribute('aria-checked'), 'false');

    for (const status of ['starting', 'restoring', 'waiting', 'recovering', 'paused']) {
      await page.evaluate((status) => { fixture.state = { status, enabled: true, origin: 'http://localhost:5173' }; }, status);
      await refresh();
      assert.equal(await value('componentToggle').getAttribute('aria-checked'), 'true', '等待和暂停时应显示已保存的地址开关');
      assert.equal(await value('componentToggle').isEnabled(), true, '等待时也应允许用户关闭开发地址');
      if (status === 'restoring') {
        assert.equal(await value('componentPageState').textContent(), '正在恢复');
        assert.match(await value('componentStatusHint').textContent(), /沿用已识别的项目/);
      }
      if (status === 'recovering') {
        assert.equal(await value('componentPageState').textContent(), '等待开发服务');
        assert.match(await value('componentStatusHint').textContent(), /开发服务恢复后会自动重新识别/);
      }
      await value('componentToggle').click(); await settle();
      assert.equal(await page.evaluate(() => fixture.calls.filter((call) => /COMPONENT_(START|STOP)$/.test(call.type)).at(-1).type), 'COMPONENT_STOP');
      assert.equal(await value('componentToggle').getAttribute('aria-checked'), 'false');
    }

    // 首次安装自动进入当前所需的设置，后续刷新保留用户的折叠选择。
    await page.evaluate(() => { fixture.host = { connected: false, error: '请先安装本机辅助程序' }; });
    await refresh();
    assert.equal(await value('componentPageState').textContent(), '待设置');
    assert.equal(await value('componentHostSection').getAttribute('open'), '');
    assert.equal(await page.locator('#componentSettingsList > :first-child').getAttribute('id'), 'componentHostSection');
    await page.evaluate(() => { fixture.host = { connected: true, editorAvailable: false, editor: null, capabilities: ['uninstall'] }; });
    await refresh();
    assert.equal(await value('componentEditorSection').getAttribute('open'), '');
    assert.equal(await value('componentHostSection').getAttribute('open'), null);
    await page.locator('#componentEditorSection > summary').click(); await refresh();
    assert.equal(await value('componentEditorSection').getAttribute('open'), null, '自动刷新应保留手动收起的设置');
    await page.locator('#componentEditorSection > summary').click();
    await value('componentChooseEditor').click(); await settle();
    assert.equal(await value('componentToggle').isEnabled(), true);
    assert.equal(await page.locator('.component-setting[open]').count(), 0);

    // 操作后的连接刷新失败，应恢复控件并提供直接重试。
    await page.locator('#componentHostSection > summary').click();
    await page.evaluate(() => { fixture.failStatus = true; });
    await value('componentCheckHost').click(); await settle();
    assert.equal(await value('componentToggle').isEnabled(), true);
    assert.equal(await value('componentChooseEditor').isEnabled(), true);
    assert.equal(await value('componentRetry').isEnabled(), true);
    assert.equal(await value('componentRefreshError').isVisible(), true);
    await page.evaluate(() => { fixture.failStatus = false; });
    await value('componentRetry').click(); await settle();
    assert.equal(await value('componentRefreshError').isHidden(), true);

    // 并排按钮单击切换；保存完成后使用全局 toast 反馈，重复点击当前选项保持安静。
    const saves = () => page.evaluate(() => fixture.calls.filter((item) => item.type === 'COMPONENT_SAVE_SETTINGS').length);
    const beforeSelectedClick = await saves();
    const beforeSelectedToast = await page.evaluate(() => fixture.toasts.length);
    assert.equal(await value('componentClickActionOpen').getAttribute('aria-pressed'), 'true');
    assert.equal(await value('componentOpenSourceHint').isVisible(), true);
    await value('componentClickActionOpen').click();
    assert.equal(await saves(), beforeSelectedClick);
    assert.equal(await page.evaluate(() => fixture.toasts.length), beforeSelectedToast);
    await page.evaluate(() => { fixture.holdSave = true; });
    await value('componentClickActionCopy').click();
    await page.waitForFunction(() => typeof fixture.releaseSave === 'function');
    assert.equal(await value('componentClickActionOpen').isDisabled(), true);
    assert.equal(await value('componentClickActionCopy').isDisabled(), true);
    assert.equal(await page.evaluate(() => fixture.toasts.length), beforeSelectedToast, '保存成功后才提示切换完成');
    await page.evaluate(() => { fixture.holdSave = false; fixture.releaseSave(); delete fixture.releaseSave; });
    await settle();
    assert.equal(await saves(), beforeSelectedClick + 1);
    assert.equal(await page.evaluate(() => fixture.settings.clickAction), 'copy');
    assert.equal(await value('componentClickActionOpen').getAttribute('aria-pressed'), 'false');
    assert.equal(await value('componentClickActionCopy').getAttribute('aria-pressed'), 'true');
    assert.equal(await value('componentOpenSourceHint').isHidden(), true);
    assert.equal(await value('componentCopyLocationHint').isVisible(), true);
    assert.equal(await value('componentClickShortcutTitle').textContent(), '复制源码位置');
    assert.deepEqual(await page.evaluate(() => fixture.toasts.at(-1)), ['已切换为复制源码位置', 'ok']);
    assert.equal(await value('globalToast').textContent(), '已切换为复制源码位置');
    assert.equal(await page.locator('#globalToast.show.ok').count(), 1);
    assert.doesNotMatch(await page.locator('.component-usage').textContent(), /已切换为/);
    const afterSwitchToast = await page.evaluate(() => fixture.toasts.length);
    await refresh(); assert.equal(await value('componentClickActionCopy').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => fixture.toasts.length), afterSwitchToast, '刷新保留选择并保持安静');
    await page.waitForFunction(() => !document.getElementById('globalToast').classList.contains('show'));
    assert.equal(await value('globalToast').textContent(), '');

    // 保存失败保留已保存的选择，提示错误并恢复两个按钮。
    await page.evaluate(() => { fixture.failSave = true; });
    await value('componentClickActionOpen').click(); await settle();
    assert.equal(await page.evaluate(() => fixture.settings.clickAction), 'copy');
    assert.equal(await value('componentClickActionCopy').getAttribute('aria-pressed'), 'true');
    assert.equal(await value('componentClickActionOpen').getAttribute('aria-pressed'), 'false');
    assert.equal(await value('componentClickActionOpen').isEnabled(), true);
    assert.equal(await value('componentClickActionCopy').isEnabled(), true);
    assert.deepEqual(await page.evaluate(() => fixture.toasts.at(-1)), ['测试设置保存失败', 'err']);
    assert.equal(await page.locator('#globalToast.show.err').count(), 1);
    await page.evaluate(() => { fixture.failSave = false; });

    // 复制模式在辅助程序就绪后即可开启，窄侧栏仍保留并排按钮。
    await page.evaluate(() => { fixture.host.editorAvailable = false; fixture.host.editor = null; });
    await refresh(); assert.equal(await value('componentToggle').isEnabled(), true);
    assert.equal(await value('componentEditorSection').getAttribute('open'), null);
    for (const width of [320, 380]) {
      await page.setViewportSize({ width, height: 750 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const buttons = await page.locator('#componentClickAction button').evaluateAll((items) => items.map(item => {
        const rect = item.getBoundingClientRect();
        const style = getComputedStyle(item);
        return { top: rect.top, width: rect.width, height: rect.height, background: style.backgroundColor, color: style.color };
      }));
      assert.equal(buttons[0].top, buttons[1].top);
      assert.ok(Math.abs(buttons[0].width - buttons[1].width) <= 1);
      assert.equal(buttons[0].height, 40);
      assert.notEqual(buttons[0].background, buttons[1].background);
      assert.notEqual(buttons[0].color, buttons[1].color);
    }
    fs.mkdirSync(path.join(repo, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(repo, 'test-results/component-copy-mode.png'), fullPage: true });
    await value('componentClickActionOpen').focus();
    await value('componentClickActionOpen').press('Space'); await settle();
    assert.equal(await value('componentClickActionOpen').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await page.evaluate(() => fixture.toasts.at(-1)), ['已切换为打开源码', 'ok']);
    assert.equal(await value('componentToggle').isDisabled(), true);
    await value('componentChooseEditor').click(); await settle();

    // 不支持的按键保留原快捷键，继续录制有效组合后才保存。
    await page.locator('#componentShortcutSection > summary').click();
    await value('componentOpenShortcut').click();
    assert.equal(await value('componentClickActionOpen').isDisabled(), true);
    assert.equal(await value('componentClickActionCopy').isDisabled(), true);
    const keys = async (events) => page.evaluate((items) => {
      for (const item of items) document.dispatchEvent(new KeyboardEvent(item.type, { ...item, bubbles: true }));
    }, events);
    const beforeInvalid = await saves();
    await keys([
      { type: 'keydown', key: 'Meta', code: 'MetaLeft', metaKey: true },
      { type: 'keydown', key: 'Backspace', code: 'Backspace', metaKey: true },
      { type: 'keyup', key: 'Backspace', code: 'Backspace', metaKey: true },
      { type: 'keyup', key: 'Meta', code: 'MetaLeft' },
    ]);
    assert.equal(await saves(), beforeInvalid);
    assert.equal(await page.evaluate(() => fixture.settings.openShortcut.code), 'KeyK');
    assert.match(await value('componentShortcutHint').textContent(), /字母、数字/);
    await keys([
      { type: 'keydown', key: 'Alt', code: 'AltLeft', altKey: true },
      { type: 'keydown', key: 'x', code: 'KeyX', altKey: true },
      { type: 'keyup', key: 'x', code: 'KeyX', altKey: true },
    ]);
    await settle();
    assert.equal(await value('componentClickActionOpen').isEnabled(), true);
    assert.equal(await value('componentClickActionCopy').isEnabled(), true);
    assert.equal(await page.evaluate(() => fixture.settings.openShortcut.code), 'KeyX');
    assert.match(await value('componentOpenShortcutLabel').textContent(), /Option \+ X/);

    // 第 51 个地址保留输入并提示；移除旧地址后可再次提交。
    await page.evaluate(() => { fixture.settings.origins = Array.from({ length: 50 }, (_, index) => `http://dev${index}.test:5173`); });
    await refresh(); await page.locator('#componentOriginSection > summary').click();
    await value('componentOriginInput').fill('http://extra.test:5173');
    const beforeLimit = await saves();
    await value('componentAddOrigin').click(); await settle();
    assert.equal(await saves(), beforeLimit);
    assert.equal(await value('componentOriginInput').inputValue(), 'http://extra.test:5173');
    assert.match(await value('componentOriginMessage').textContent(), /最多保存 50/);
    await page.locator('#componentOrigins button').first().click(); await settle();
    await value('componentAddOrigin').click(); await settle();
    assert.equal(await value('componentOriginInput').inputValue(), '');
    assert.equal(await page.evaluate(() => fixture.settings.origins.includes('http://extra.test:5173')), true);
    assert.equal(await value('componentOriginMessage').isHidden(), true);

    // 停留在同一个侧栏时，切换标签页应重置状态及项目详情。
    await page.evaluate(() => { fixture.tab = { id: 8, url: 'https://example.com' }; fixture.state = { status: 'on', origin: 'http://localhost:5173', project: { root: '/old-project' } }; });
    await refresh();
    assert.equal(await value('componentToggle').getAttribute('aria-checked'), 'false');
    assert.equal(await value('componentToggle').isDisabled(), true);
    assert.equal(await value('componentProjectRoot').textContent(), '开启时自动识别');

    // 检查两处界面的按钮规则，防止其他入口留下按下或悬浮位移。
    for (const file of ['popup.html', 'devtools/panel.html']) {
      for (const [, selector, body] of read(file).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (/:hover|:active/.test(selector)) assert.doesNotMatch(body, /\btransform\s*:/, `${file}: ${selector.trim()}`);
      }
    }
    assert.deepEqual(errors, []);
    console.log('component UI tests passed (first-screen controls, setup, connection recovery, shortcuts, origin limit, tab changes and button motion)');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
