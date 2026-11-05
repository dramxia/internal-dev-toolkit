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
      window.fixture = { opened: [], copied: [], chats: [], queries: [], businessClicks: 0, holdInspect: false, failOpen: false, failCopy: false };
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
      window.chrome = { runtime: { id: 'fixture-extension', async sendMessage({ type, payload }) {
        if (type === 'COMPONENT_INSPECT') {
          fixture.queries.push(payload);
          if (fixture.holdInspect) await new Promise((resolve) => { fixture.releaseInspect = resolve; });
          return { ok: true, snapshotId: 'fixture-snapshot', ...inspectComponentPage({ ...payload, props: true }) };
        }
        if (type === 'COMPONENT_OPEN') {
          if (fixture.failOpen) return { ok: false, error: '编辑器暂时无法打开文件' };
          fixture.opened.push(payload); return { ok: true };
        }
        if (type === 'COMPONENT_AGENT') {
          fixture.chats.push(payload);
          if (fixture.holdChat) await new Promise((resolve) => { fixture.releaseChat = resolve; });
          if (fixture.failChat) return { ok: false, error: 'ChatGPT 桌面端打开失败' };
          return { ok: true, opened: true, sendStatus: 'draft', reason: fixture.chatReason };
        }
        if (type === 'COMPONENT_SOURCE_LOCATION') {
          if (fixture.holdLocation) await new Promise((resolve) => { fixture.releaseLocation = resolve; });
          return { ok: true, location: fixture.sourceLocation || '/workspace/src/SaveButton.tsx#L12' };
        }
        if (type === 'COMPONENT_COPY') {
          if (fixture.holdCopy) await new Promise((resolve) => { fixture.releaseCopy = resolve; });
          if (fixture.failCopy) return { ok: false, error: '复制失败，请重新点击组件重试' };
          fixture.copied.push(payload); return { ok: true, location: fixture.sourceLocation || '/workspace/src/SaveButton.tsx#L12' };
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

    // 复制完成后继续按住快捷键移动鼠标，再松开按键，提示仍保留到原定时间。
    await start(false, 'copy');
    const toast = page.locator('[data-idt-component-overlay] .toast');
    await page.keyboard.down('Meta'); await mouseClick(target);
    await toast.waitFor();
    await page.mouse.move(55, 305);
    await page.waitForFunction(() => document.getElementById('outside').getAttribute('data-idt-component-target') === 'HOVER');
    await page.keyboard.up('Meta');
    assert.equal(await toast.isVisible(), true, '松开 Command 应保留复制结果');
    assert.equal(await page.locator('[data-idt-component-target], [data-idt-component-state]').count(), 0, '高亮和鼠标状态照常恢复');
    const businessClicks = await page.evaluate(() => fixture.businessClicks);
    await page.locator('#outside').click();
    assert.equal(await page.evaluate(() => fixture.businessClicks), businessClicks + 1, '提示显示期间普通网页点击照常响应');
    await page.keyboard.down('Meta'); await page.keyboard.up('Meta');
    assert.equal(await toast.isVisible(), true, '再次按下和松开快捷键应保留现有提示');
    await toast.waitFor({ state: 'detached' }); await assertClean();

    // 左键打开失败的提示也独立计时；窗口失焦后保留提示，Escape 仍可提前关闭。
    await start();
    await page.evaluate(() => { fixture.failOpen = true; });
    await page.keyboard.down('Meta'); await mouseClick(target);
    await toast.waitFor();
    assert.match(await toast.textContent(), /编辑器暂时无法打开文件/);
    await page.keyboard.up('Meta');
    assert.equal(await toast.isVisible(), true, '松开 Command 应保留打开失败的提示');
    await page.evaluate(() => window.dispatchEvent(new FocusEvent('blur')));
    assert.equal(await toast.isVisible(), true, '窗口失焦应保留提示');
    await page.keyboard.press('Escape'); await assertClean();
    await page.evaluate(() => { fixture.failOpen = false; });

    // 路由重置仍完整清理提示及计时器。
    await start(false, 'copy');
    await page.keyboard.down('Meta'); await mouseClick(target); await page.keyboard.up('Meta');
    await toast.waitFor();
    await page.evaluate(() => __IDT_COMPONENT_INSPECTOR__.resetInteraction()); await assertClean();
    await start();
    const nested = page.locator('#shadow-host #nested');
    await nested.hover(); await page.keyboard.down('Meta');
    assert.equal(await nested.evaluate((element) => getComputedStyle(element).outlineColor), 'rgb(54, 139, 87)');
    await mouseClick(nested, 'right'); await page.keyboard.up('Meta'); await items.first().waitFor();
    await page.evaluate(() => __IDT_COMPONENT_INSPECTOR__.destroy()); await assertClean();
    assert.equal(await nested.getAttribute('data-idt-component-target'), null);
    assert.equal(await page.locator('#shadow-host style').count(), 0);
    await page.addScriptTag({ path: path.join(repo, 'src/inspector/content.js') });
    await start(false, 'agent');
    const draft = page.getByRole('textbox', { name: '任务内容' });
    const openDraft = async () => {
      const rect = await target.boundingBox();
      await page.keyboard.down('Meta'); await page.mouse.click(rect.x + 8, rect.y + 8); await page.keyboard.up('Meta');
      await draft.waitFor();
    };
    await openDraft();
    assert.equal(await draft.evaluate((element) => element.getRootNode().activeElement === element), true);
    const source = menu.locator('.draft-source');
    const copyButton = menu.getByRole('button', { name: '复制完整组件地址' });
    const copyFeedback = menu.locator('.draft-copy-feedback');
    const sendButton = menu.locator('.draft-send');
    const assertDraftHighlight = async (element = target) => {
      assert.equal(await element.getAttribute('data-idt-component-target'), 'DRAFT');
      assert.deepEqual(await element.evaluate((el) => {
        const style = getComputedStyle(el);
        return [style.outlineColor, style.outlineStyle, style.outlineWidth, style.outlineOffset];
      }), ['rgb(54, 139, 87)', 'solid', '2px', '2px'], '输入和操作浮框时，组件保持清晰的绿色轮廓');
    };
    const assertDraftBounds = async () => {
      const rect = await menu.boundingBox();
      const viewport = page.viewportSize();
      assert.ok(rect.x >= 11 && rect.y >= 11 && rect.x + rect.width <= viewport.width - 11 && rect.y + rect.height <= viewport.height - 11,
        `浮框应完整留在页面内：${JSON.stringify({ rect, viewport })}`);
      return rect;
    };
    const dragDraftTo = async (x, y, release = true) => {
      const rect = await menu.boundingBox();
      const header = await menu.locator('.draft-top').boundingBox();
      const start = { x: header.x + 60, y: header.y + header.height / 2 };
      await page.mouse.move(start.x, start.y); await page.mouse.down();
      await page.mouse.move(start.x + x - rect.x, start.y + y - rect.y, { steps: 5 });
      if (release) {
        await page.mouse.up();
        assert.equal(await menu.getAttribute('data-dragging'), null);
      }
      await assertDraftHighlight();
      return assertDraftBounds();
    };
    await assertDraftHighlight();
    await page.mouse.move(800, 120);
    await assertDraftHighlight();
    assert.equal(await page.locator('#outside').getAttribute('data-idt-component-target'), null, '浮框打开后保持选中原组件');

    // 标题栏自由拖动，输入和复制后仍保留手动摆放的位置。
    const moved = await dragDraftTo(450, 70);
    assert.ok(Math.abs(moved.x - 450) < 1 && Math.abs(moved.y - 70) < 1);
    assert.equal(await source.textContent(), '/workspace/src/SaveButton.tsx#L12');
    await draft.fill('复制时保留任务');
    const beforeCopy = await menu.boundingBox();
    assert.deepEqual(beforeCopy, moved, '输入文字应保留拖动后的位置');
    await copyButton.click();
    await page.waitForFunction(() => document.querySelector('[data-idt-component-overlay]').shadowRoot.querySelector('.draft-copy-feedback').textContent === '已复制');
    assert.equal(await draft.inputValue(), '复制时保留任务');
    assert.equal(await page.evaluate(() => fixture.copied.at(-1).keepSnapshot), true);
    assert.equal(await page.evaluate(() => fixture.copied.at(-1).index), 1);
    assert.deepEqual(await menu.boundingBox(), beforeCopy, '复制反馈保持浮框尺寸与位置稳定');
    await assertDraftHighlight();
    await page.waitForFunction(() => !document.querySelector('[data-idt-component-overlay]').shadowRoot.querySelector('.draft-copy-feedback').textContent);

    // 指针移出窗口后继续拖动，四个角均限制在页面内，松开后停止移动。
    for (const [x, y] of [[-500, -500], [2000, -500], [-500, 2000], [2000, 2000]]) {
      const rect = await dragDraftTo(x, y);
      assert.ok(Math.abs(rect.x - (x < 0 ? 12 : 1000 - rect.width - 12)) < 1);
      assert.ok(Math.abs(rect.y - (y < 0 ? 12 : 720 - rect.height - 12)) < 1);
      await page.mouse.move(500, 20);
      assert.deepEqual(await menu.boundingBox(), rect, '松开鼠标后浮框停止移动');
    }
    // 浮框变高时收回底部；重试或清除提示保留当前位置。
    await draft.fill(''); await page.keyboard.press('Enter');
    const errorBounds = await assertDraftBounds();
    await draft.fill('复制时保留任务');
    const afterError = await menu.boundingBox();
    assert.equal(afterError.x, errorBounds.x);
    assert.equal(afterError.y, errorBounds.y);
    await page.setViewportSize({ width: 320, height: 240 });
    await page.waitForFunction(() => {
      const rect = document.querySelector('[data-idt-component-overlay]').shadowRoot.querySelector('.draft').getBoundingClientRect();
      return rect.right <= innerWidth - 11 && rect.bottom <= innerHeight - 11;
    });
    await assertDraftBounds(); await assertDraftHighlight();
    await page.setViewportSize({ width: 1000, height: 720 });
    await page.keyboard.press('Escape'); await assertClean();

    // 拖动中关闭浮框，释放指针捕获；下次打开重新放在组件旁。
    await openDraft();
    const reopened = await menu.boundingBox();
    assert.ok(reopened.x < 200, '关闭后重新打开应回到组件附近');
    await dragDraftTo(450, 70, false);
    await page.keyboard.press('Escape'); await page.mouse.up(); await assertClean();
    await openDraft();
    await draft.fill('拖选这里的文字');
    const inputRect = await draft.boundingBox();
    const beforeSelection = await menu.boundingBox();
    await page.mouse.move(inputRect.x + 8, inputRect.y + 15); await page.mouse.down();
    await page.mouse.move(inputRect.x + 100, inputRect.y + 15); await page.mouse.up();
    assert.deepEqual(await menu.boundingBox(), beforeSelection, '输入框内拖选文字保持浮框位置');
    await draft.focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await copyButton.evaluate(el => el.getRootNode().activeElement === el), true, '键盘可以访问复制按钮');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => fixture.chats.length), 0, '复制按钮上的回车只复制地址');
    await draft.fill('');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => fixture.chats.length), 0);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '测试', selectionStart: 2, selectionEnd: 2 });
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => fixture.chats.length), 0, '中文选词回车保留输入');
    await cdp.send('Input.insertText', { text: '测试' });
    await draft.fill('调整按钮'); await page.keyboard.press('Shift+Enter'); await page.keyboard.type('second line');
    assert.equal(await draft.inputValue(), '调整按钮\nsecond line');
    await page.screenshot({ path: path.join(repo, 'test-results/component-chatgpt-draft.png') });
    await page.evaluate(() => { fixture.holdChat = true; });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!fixture.releaseChat);
    assert.equal(await sendButton.isDisabled(), true);
    assert.equal(await draft.getAttribute('readonly'), '');
    await assertDraftHighlight();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => fixture.chats.length), 1);
    assert.equal(await page.evaluate(() => fixture.chats[0].text), '调整按钮\nsecond line');
    assert.equal(await page.evaluate(() => fixture.chats[0].index), 1);
    await page.evaluate(() => { fixture.holdChat = false; fixture.releaseChat(); });
    await draft.waitFor({ state: 'detached' });
    assert.match(await toast.textContent(), /自动发送未完成.*草稿已保留/);
    await page.keyboard.press('Escape');
    for (const [reason, message] of [['button', '尚未找到可用的发送按钮'], ['accessibility', '辅助程序尚未获得辅助功能权限'], ['disabled', '自动发送已关闭'], ['automation', '自动发送脚本运行失败']]) {
      await page.evaluate((reason) => { fixture.chatReason = reason; }, reason);
      await openDraft(); await draft.fill('验证失败提示'); await page.keyboard.press('Enter');
      await draft.waitFor({ state: 'detached' });
      assert.equal(await toast.textContent(), `${message}，草稿已保留，请在桌面发送`);
      await page.keyboard.press('Escape');
    }
    await openDraft(); await draft.fill('保留我的文字');
    await page.evaluate(() => { fixture.failChat = true; });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-idt-component-overlay]').shadowRoot.querySelector('.draft-status').textContent.includes('打开失败'));
    assert.equal(await draft.inputValue(), '保留我的文字');
    assert.equal(await draft.getAttribute('readonly'), null);
    assert.equal(await sendButton.isEnabled(), true);
    await assertDraftHighlight();
    await page.evaluate(() => { fixture.failChat = false; });
    await sendButton.click(); await draft.waitFor({ state: 'detached' });
    await page.keyboard.press('Escape');
    await openDraft(); await draft.fill('复制失败仍保留');
    await page.evaluate(() => { fixture.failCopy = true; });
    await copyButton.click();
    await page.waitForFunction(() => document.querySelector('[data-idt-component-overlay]').shadowRoot.querySelector('.draft-copy-feedback').textContent.includes('已选中'));
    assert.equal(await draft.inputValue(), '复制失败仍保留');
    assert.equal(await page.evaluate(() => window.getSelection().toString()), await source.textContent());
    await page.evaluate(() => { fixture.failCopy = false; });
    await page.mouse.click(800, 600); await assertClean();
    await openDraft(); await page.keyboard.press('Escape'); await assertClean();
    await page.evaluate(() => { fixture.holdCopy = true; });
    await openDraft(); await copyButton.click();
    await page.waitForFunction(() => !!fixture.releaseCopy);
    await menu.getByRole('button', { name: '关闭发送任务' }).click(); await assertClean();
    await openDraft();
    await page.evaluate(() => { fixture.holdCopy = false; fixture.releaseCopy(); });
    assert.equal(await copyFeedback.textContent(), '', '上一次浮框的复制回调应丢弃');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { fixture.sourceLocation = '/Users/demo/projects/company-platform/apps/management-console/src/features/organization/components/member-profile/UserCard.vue#L42-L60'; });
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 320, height: 480 });
      await openDraft();
      const bounds = await menu.boundingBox();
      assert.ok(bounds.x >= 8 && bounds.x + bounds.width <= 312 && bounds.y >= 8 && bounds.y + bounds.height <= 472);
      assert.equal(await source.textContent(), await page.evaluate(() => fixture.sourceLocation));
      assert.equal(await source.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, '长地址完整换行');
      assert.equal(await menu.locator('.arrow').isVisible(), false, '轻量便签保持完整圆角轮廓');
      await page.screenshot({ path: path.join(repo, `test-results/component-task-${scheme}-narrow.png`) });
      await menu.getByRole('button', { name: '关闭发送任务' }).click(); await assertClean();
    }
    await page.emulateMedia({ colorScheme: 'light' });
    await page.setViewportSize({ width: 1000, height: 720 });
    await page.evaluate(() => { fixture.holdLocation = true; });
    await page.keyboard.down('Meta'); await mouseClick(target); await page.keyboard.up('Meta');
    await page.waitForFunction(() => !!fixture.releaseLocation);
    await page.keyboard.press('Escape'); await assertClean();
    await page.evaluate(() => { fixture.holdLocation = false; fixture.releaseLocation(); });
    await page.waitForTimeout(30); await assertClean();
    await openDraft();
    await page.evaluate(() => __IDT_COMPONENT_INSPECTOR__.resetInteraction()); await assertClean();
    await page.keyboard.down('Meta'); await mouseClick(nested); await page.keyboard.up('Meta');
    await draft.waitFor(); await assertDraftHighlight(nested);
    await page.keyboard.press('Escape'); await assertClean();
    assert.equal(await page.locator('#shadow-host style').count(), 0, '关闭浮框后清理 Shadow DOM 内的轮廓样式');
    await target.hover(); await page.keyboard.down('Meta'); await mouseClick(page.locator('#label')); await page.keyboard.up('Meta');
    await draft.waitFor(); await draft.fill('普通文本元素也保持高亮');
    await assertDraftHighlight(page.locator('#label'));
    await page.keyboard.press('Escape'); await assertClean();
    assert.deepEqual(errors, []);
    console.log('component interaction tests passed (green reference styles, props, source indices, mouse/keyboard, viewport edges, restoration and Shadow DOM)');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
