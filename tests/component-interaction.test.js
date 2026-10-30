/* 使用真实鼠标、键盘和页面组件快照检查定位样式、源码索引及退出后的恢复。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const repo = path.join(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('http://localhost:5173/**', (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html>
      <html style="overflow:auto!important"><head><meta charset="utf-8"></head><body style="font:16px system-ui;min-height:1800px;overflow:scroll;padding-right:7px">
      <input id="previous" aria-label="原输入框"><button id="target" style="position:fixed;left:48px;top:100px;padding:16px 24px;border-radius:16px"><span id="label" style="pointer-events:none">保存</span></button>
      <button id="outside" style="position:fixed;left:48px;top:300px">业务按钮</button><div id="shadow-host"></div>
      </body></html>` }));
    await page.goto('http://localhost:5173/');
    await page.addScriptTag({ path: path.join(repo, 'src/inspector/page-probe.js') });
    await page.evaluate(() => {
      window.fixture = { opened: [], copied: [], queries: [], businessClicks: 0, holdInspect: false, failOpen: false, failCopy: false };
      function Parent() {}
      function SaveButton() {}
      SaveButton.defaultProps = { appearance: 'primary' };
      const props = { label: '保存更改', count: 7, enabled: true, key: 'private-key', appearance: 'primary', options: { nested: true }, onSave() {} };
      Object.defineProperty(props, 'computed', { enumerable: true, get() { throw new Error('读取了业务参数访问器'); } });
      const parent = { type: Parent, memoizedProps: { title: '设置' }, _debugSource: { fileName: '/workspace/src/Settings.tsx', lineNumber: 30, columnNumber: 4 } };
      const child = { type: SaveButton, memoizedProps: props, _debugOwner: parent, _debugSource: { fileName: '/workspace/src/SaveButton.tsx', lineNumber: 12, columnNumber: 8 } };
      document.getElementById('target').__reactFiber$fixture = { type: 'button', memoizedProps: { children: '保存' }, _debugOwner: child };
      for (const id of ['target', 'outside']) document.getElementById(id).addEventListener('click', () => fixture.businessClicks++);
      const root = document.getElementById('shadow-host').attachShadow({ mode: 'open' });
      root.innerHTML = '<button id="nested" style="position:fixed;left:250px;top:100px">Shadow 按钮</button>';
      root.querySelector('button').__reactFiber$fixture = { type: 'button', memoizedProps: {}, _debugOwner: child };
      window.chrome = { runtime: { async sendMessage({ type, payload }) {
        if (type === 'COMPONENT_INSPECT') {
          fixture.queries.push(payload);
          if (fixture.holdInspect) await new Promise((resolve) => { fixture.releaseInspect = resolve; });
          return { ok: true, snapshotId: 'fixture-snapshot', ...inspectComponentPage({ ...payload, props: true }) };
        }
        if (type === 'COMPONENT_OPEN') {
          if (fixture.failOpen) return { ok: false, error: '编辑器暂时无法打开文件' };
          fixture.opened.push(payload); return { ok: true };
        }
        if (type === 'COMPONENT_COPY') {
          if (fixture.failCopy) return { ok: false, error: '复制失败，请重新点击组件重试' };
          fixture.copied.push(payload); return { ok: true, location: '/workspace/src/SaveButton.tsx#L12' };
        }
      } } };
      document.getElementById('previous').focus();
    });
    for (const file of ['src/common/component-settings.js', 'src/inspector/content.js']) await page.addScriptTag({ path: path.join(repo, file) });
    const start = (custom = false, clickAction = 'open') => page.evaluate(({ custom, clickAction }) => {
      const policy = InternalDevToolkit.componentSettings;
      __IDT_COMPONENT_INSPECTOR__.start({ origin: location.origin, generation: 'fixture', clickAction,
        openShortcut: custom ? policy.normalizeShortcut({ alt: true, code: 'KeyX' }) : policy.DEFAULT_SHORTCUT,
        menuShortcut: custom ? policy.normalizeShortcut({ alt: true, shift: true }) : policy.DEFAULT_SHORTCUT });
    }, { custom, clickAction });
    await start();
    const target = page.locator('#target');
    const items = page.locator('[data-idt-component-overlay] .item');
    const menu = page.locator('[data-idt-component-overlay] .menu');
    const mouseClick = async (element, button = 'left') => {
      const rect = await element.boundingBox();
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2, { button });
    };
    const openMenu = async (key = 'Meta', element = target) => {
      await page.keyboard.down(key); await mouseClick(element, 'right'); await page.keyboard.up(key);
      await items.first().waitFor();
    };
    const assertClean = async () => {
      assert.equal(await page.locator('[data-idt-component-overlay]').count(), 0);
      assert.equal(await page.locator('[data-idt-component-target]').count(), 0);
      assert.equal(await page.locator('[data-idt-component-state]').count(), 0);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('*')].some((element) => element.getAttributeNames().some((name) => name.startsWith('data-idt-query-')))), false);
      assert.deepEqual(await page.evaluate(() => [document.documentElement.style.overflow, document.documentElement.style.getPropertyPriority('overflow'), document.body.style.overflow, document.body.style.paddingRight]), ['auto', 'important', 'scroll', '7px']);
    };

    // 鼠标先停住，再按快捷键也应立即出现轮廓；页面已有的圆角、背景与尺寸保持原样。
    await target.hover();
    const before = await target.boundingBox();
    await page.keyboard.down('Meta');
    assert.equal(await target.getAttribute('data-idt-component-target'), 'HOVER');
    assert.deepEqual(await target.boundingBox(), before);
    assert.deepEqual(await target.evaluate((element) => {
      const style = getComputedStyle(element);
      return [style.outlineColor, style.outlineStyle, style.outlineWidth, style.cursor, style.borderRadius];
    }), ['rgb(54, 139, 87)', 'auto', '1px', 'context-menu', '16px']);
    assert.equal(await page.locator('[data-idt-component-overlay] .badge, [data-idt-component-overlay] .outline').count(), 0);
    fs.mkdirSync(path.join(repo, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(repo, 'test-results/component-inspector-hover.png') });
    await page.keyboard.up('Meta'); await assertClean();

    // 停在同一元素内连续移动、长按快捷键，均不应重复写入高亮属性。
    await page.mouse.move(55, 110); await page.keyboard.down('Meta');
    await page.evaluate(() => {
      fixture.indicatorMutations = [];
      fixture.indicatorObserver = new MutationObserver((records) => fixture.indicatorMutations.push(...records.map((record) => record.attributeName)));
      fixture.indicatorObserver.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-idt-component-state', 'data-idt-component-target'] });
    });
    for (let i = 0; i < 12; i++) await page.mouse.move(55 + i, 110);
    await page.keyboard.down('Meta');
    assert.deepEqual(await page.evaluate(() => fixture.indicatorMutations), [], '同一目标内移动和按键重复应保持高亮属性稳定');
    await page.mouse.move(55, 305);
    await page.waitForFunction(() => document.getElementById('outside').getAttribute('data-idt-component-target') === 'HOVER');
    assert.deepEqual(await page.evaluate(() => fixture.indicatorMutations), ['data-idt-component-target', 'data-idt-component-target'], '切换目标只更新新旧元素，整页状态保持稳定');
    await page.evaluate(() => fixture.indicatorObserver.disconnect());
    await page.keyboard.up('Meta'); await assertClean();

    // 暂缓绘制，模拟一次刷新前的多次真实鼠标输入，验证最终目标和取消时机。
    await page.evaluate(() => {
      const request = window.requestAnimationFrame.bind(window);
      const cancel = window.cancelAnimationFrame.bind(window);
      fixture.frames = new Map(); fixture.nextFrame = 1000000000;
      window.requestAnimationFrame = (callback) => {
        if (!fixture.holdFrames) return request(callback);
        const id = fixture.nextFrame++; fixture.frames.set(id, callback); return id;
      };
      window.cancelAnimationFrame = (id) => { if (!fixture.frames.delete(id)) cancel(id); };
      fixture.flushFrames = () => {
        const frames = [...fixture.frames.values()]; fixture.frames.clear();
        frames.forEach((callback) => callback(performance.now()));
      };
      fixture.restoreFrames = () => { window.requestAnimationFrame = request; window.cancelAnimationFrame = cancel; };
    });
    await page.mouse.move(55, 110); await page.keyboard.down('Meta');
    await page.evaluate(() => { fixture.holdFrames = true; });
    await page.mouse.move(55, 305); await page.mouse.move(55, 110); await page.mouse.move(260, 110);
    assert.equal(await page.evaluate(() => fixture.frames.size), 1, '一个绘制周期只保留一次高亮更新');
    assert.equal(await target.getAttribute('data-idt-component-target'), 'HOVER');
    await page.evaluate(() => fixture.flushFrames());
    assert.equal(await page.locator('#shadow-host #nested').getAttribute('data-idt-component-target'), 'HOVER', '绘制时应使用最新的 Shadow DOM 目标');
    assert.equal(await target.getAttribute('data-idt-component-target'), null);
    await page.mouse.move(55, 305); await page.keyboard.up('Meta');
    assert.equal(await page.evaluate(() => fixture.frames.size), 0, '松开快捷键应取消待绘制高亮');
    await page.evaluate(() => fixture.flushFrames()); await assertClean();

    await page.mouse.move(55, 110); await page.keyboard.down('Meta');
    await page.mouse.move(260, 110);
    assert.equal(await page.evaluate(() => fixture.frames.size), 1);
    await page.mouse.click(260, 110, { button: 'right' }); await page.keyboard.up('Meta');
    await items.first().waitFor();
    assert.equal(await page.evaluate(() => fixture.frames.size), 0, '点击应立即确定目标并取消旧的绘制任务');
    assert.equal(await page.locator('#shadow-host #nested').getAttribute('data-idt-component-target'), 'SELECT');
    assert.equal(await page.locator('#shadow-host #nested').evaluate((element) => getComputedStyle(element).outlineColor), 'rgb(54, 139, 87)');
    await page.keyboard.press('Escape'); await assertClean();
    await page.evaluate(() => fixture.restoreFrames());

    await openMenu();
    assert.equal(await items.count(), 2, '菜单只展示提供源码的组件');
    assert.equal(await items.first().locator('code').textContent(), '<SaveButton label count enabled>');
    assert.deepEqual(await items.first().locator('var').evaluateAll((elements) => elements.map((element) => [element.textContent, element.title])), [['label', '保存更改'], ['count', '7'], ['enabled', 'true']]);
    assert.equal(await items.first().locator('.path').textContent(), 'src/SaveButton.tsx');
    assert.equal(await items.first().locator('data').getAttribute('value'), '12:8');
    assert.equal(await page.locator('[data-idt-component-overlay] .head, [data-idt-component-overlay] .foot, [data-idt-component-overlay] .details').count(), 0);
    assert.equal(await menu.getAttribute('data-placement'), 'right');
    assert.deepEqual(await menu.evaluate((element) => [getComputedStyle(element).padding, getComputedStyle(element).borderRadius, getComputedStyle(element).borderWidth]), ['5px', '6px', '0px']);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    assert.equal(await menu.evaluate((element) => element.getRootNode().activeElement === element), true);
    await items.first().hover();
    assert.deepEqual(await items.first().evaluate((element) => [getComputedStyle(element).backgroundColor, getComputedStyle(element.querySelector('code')).color]), ['rgb(54, 139, 87)', 'rgb(255, 255, 255)']);
    await page.evaluate(() => {
      fixture.menuScrolls = 0;
      const scroll = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function (...args) { if (this.classList.contains('item')) fixture.menuScrolls++; return scroll.apply(this, args); };
      fixture.restoreMenuScroll = () => { Element.prototype.scrollIntoView = scroll; };
    });
    const itemRect = await items.first().boundingBox();
    for (let i = 0; i < 12; i++) await page.mouse.move(itemRect.x + 8 + i, itemRect.y + 8);
    assert.equal(await page.evaluate(() => fixture.menuScrolls), 0, '鼠标在菜单项内移动应保持滚动位置稳定');
    await items.nth(1).hover(); await items.first().hover();
    assert.equal(await page.evaluate(() => fixture.menuScrolls), 0, '鼠标切换菜单项时也无需自动滚动');
    await page.screenshot({ path: path.join(repo, 'test-results/component-inspector-menu.png') });
    await page.keyboard.press('ArrowDown');
    assert.equal(await items.nth(1).evaluate((element) => element.getRootNode().activeElement === element), true);
    assert.equal(await page.evaluate(() => fixture.menuScrolls), 1, '方向键仍应将所选项滚动到可见位置');
    await page.evaluate(() => fixture.restoreMenuScroll());
    await page.keyboard.press('Enter'); await menu.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => fixture.opened.at(-1).index), 2, '过滤后的菜单仍应打开正确的父组件');
    await assertClean();
    assert.equal(await page.locator('#previous').evaluate((element) => document.activeElement === element), true);

    // 左键打开最近的源码；快捷键松开后，普通业务按钮照常响应。
    await page.keyboard.down('Meta'); await target.click(); await page.keyboard.up('Meta');
    await page.waitForFunction(() => fixture.opened.length === 2);
    assert.equal(await page.evaluate(() => fixture.opened.at(-1).index), 1);
    assert.equal(await page.evaluate(() => fixture.businessClicks), 0);
    await assertClean();
    await target.click(); assert.equal(await page.evaluate(() => fixture.businessClicks), 1);

    // 菜单在四角和窄窗口均能放下，右侧空间不足时翻到左侧，箭头保留。
    for (const position of ['right:2px;bottom:2px', 'left:2px;top:2px', 'right:2px;top:2px', 'left:2px;bottom:2px']) {
      await target.evaluate((element, position) => { element.style.cssText = `position:fixed;padding:16px 24px;${position}`; }, position);
      await openMenu();
      const rect = await menu.boundingBox();
      assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 1001 && rect.y + rect.height <= 721, `菜单超出窗口：${position}`);
      assert.equal(await menu.getAttribute('data-placement'), position.startsWith('right') ? 'left' : 'right');
      assert.equal(await menu.locator('.arrow').isVisible(), true);
      await page.keyboard.press('Escape'); await assertClean();
    }
    await page.setViewportSize({ width: 320, height: 480 }); await openMenu();
    const narrow = await menu.boundingBox();
    assert.ok(narrow.x >= 0 && narrow.x + narrow.width <= 321 && narrow.y + narrow.height <= 481);
    await page.keyboard.press('Escape'); await page.setViewportSize({ width: 1000, height: 720 });

    await openMenu(); await mouseClick(page.locator('#outside')); await assertClean();
    assert.equal(await page.evaluate(() => fixture.businessClicks), 1, '点击菜单外关闭时应拦住这次业务点击');

    // 打开失败后仍可重试；关闭等待中的菜单后，迟到的请求应保持关闭状态。
    await openMenu(); await page.evaluate(() => { fixture.failOpen = true; });
    await items.first().click(); await page.locator('[data-idt-component-overlay] .toast').waitFor();
    await page.evaluate(() => { fixture.failOpen = false; });
    await items.first().click(); await menu.waitFor({ state: 'detached' }); await assertClean();
    await page.evaluate(() => { fixture.holdInspect = true; });
    await page.keyboard.down('Meta'); await mouseClick(target, 'right'); await page.keyboard.up('Meta');
    await page.waitForFunction(() => !!fixture.releaseInspect);
    await page.keyboard.press('Escape'); await assertClean();
    await page.evaluate(() => { fixture.holdInspect = false; fixture.releaseInspect(); });
    await page.waitForFunction(() => !document.querySelector('[data-idt-component-overlay]'));

    // 复制操作使用同一个源码索引，松开按键后仍显示结果，右键菜单继续打开源码。
    await start(false, 'copy');
    const opensBeforeCopy = await page.evaluate(() => fixture.opened.length);
    await page.keyboard.down('Meta'); await target.click(); await page.keyboard.up('Meta');
    assert.equal(await page.evaluate(() => fixture.copied.at(-1).index), 1);
    assert.equal(await page.evaluate(() => fixture.opened.length), opensBeforeCopy);
    assert.match(await page.locator('[data-idt-component-overlay] .toast').textContent(), /已复制：\/workspace\/src\/SaveButton.tsx#L12/);
    await page.keyboard.press('Escape'); await assertClean();
    await page.evaluate(() => { fixture.failCopy = true; });
    await page.keyboard.down('Meta'); await target.click(); await page.keyboard.up('Meta');
    assert.match(await page.locator('[data-idt-component-overlay] .toast').textContent(), /复制失败/);
    assert.equal(await page.evaluate(() => fixture.opened.length), opensBeforeCopy);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { fixture.failCopy = false; });
    await openMenu(); await items.first().click(); await menu.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => fixture.opened.length), opensBeforeCopy + 1);
    await assertClean();

    // 两个快捷键各自可配置；Shadow DOM 内也使用相同的轮廓与菜单。
    await start(true);
    await target.hover(); await page.keyboard.down('Alt'); await page.keyboard.down('x');
    assert.equal(await target.getAttribute('data-idt-component-target'), 'HOVER');
    const openedBefore = await page.evaluate(() => fixture.opened.length);
    await target.click(); await page.keyboard.up('x'); await page.keyboard.up('Alt');
    await page.waitForFunction((count) => fixture.opened.length === count + 1, openedBefore);
    await page.keyboard.down('Shift'); await openMenu('Alt'); await page.keyboard.up('Shift');
    await page.keyboard.press('Escape'); await assertClean();
    await start();
    const nested = page.locator('#shadow-host #nested');
    await nested.hover(); await page.keyboard.down('Meta');
    assert.equal(await nested.evaluate((element) => getComputedStyle(element).outlineColor), 'rgb(54, 139, 87)');
    await mouseClick(nested, 'right'); await page.keyboard.up('Meta'); await items.first().waitFor();
    await page.evaluate(() => __IDT_COMPONENT_INSPECTOR__.destroy()); await assertClean();
    assert.equal(await nested.getAttribute('data-idt-component-target'), null);
    assert.equal(await page.locator('#shadow-host style').count(), 0);
    assert.deepEqual(errors, []);
    console.log('component interaction tests passed (green reference styles, props, source indices, mouse/keyboard, viewport edges, restoration and Shadow DOM)');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
