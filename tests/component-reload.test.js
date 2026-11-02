/* 真实重载扩展，检查原网页、未保存输入、多个标签页与定位交互的恢复。 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const repo = path.join(__dirname, '..');

async function until(check, message, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { const result = await check(); if (result) return result; } catch (error) { last = error; }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`${message}${last ? `: ${last.message}` : ''}`);
}

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'idt-component-reload-'));
  const extension = path.join(root, 'extension');
  const pendingResources = new Set();
  let context;
  const server = http.createServer((request, response) => {
    if (request.url === '/pending.svg') {
      pendingResources.add(response);
      response.on('close', () => pendingResources.delete(response));
      return;
    }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(`<!doctype html><html><body style="padding:40px;font:16px system-ui">
      <input id="draft" aria-label="未保存的内容"><button id="target" style="padding:16px">保存</button>
      ${request.url === '/first' ? '<img src="/pending.svg" alt="">' : ''}
      <script>
        window.documentIdentity = crypto.randomUUID();
        window.businessClicks = 0;
        function SaveButton() {}
        document.getElementById('target').__reactFiber$fixture = {
          type: 'button', memoizedProps: {}, _debugOwner: {
            type: SaveButton, memoizedProps: {},
            _debugSource: { fileName: '/workspace/src/SaveButton.tsx', lineNumber: 12 }
          }
        };
        document.getElementById('target').addEventListener('click', () => window.businessClicks++);
      </script></body></html>`);
  });
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    await fs.mkdir(extension);
    await fs.writeFile(path.join(extension, 'manifest.json'), JSON.stringify({
      manifest_version: 3, name: 'Component reload test', version: '1.0.0',
      permissions: ['storage', 'tabs', 'scripting', 'webNavigation'], host_permissions: ['http://127.0.0.1/*'],
      background: { service_worker: 'background.js' },
      content_scripts: [{ matches: ['http://127.0.0.1/*'], js: ['component-document-ready.js'], run_at: 'document_end', all_frames: true }],
    }));
    const read = file => fs.readFile(path.join(repo, file), 'utf8');
    // 本机通信返回固定项目，扩展重载、浏览器存储、脚本注入及鼠标键盘均使用真实浏览器。
    const nativeFixture = `
      globalThis.bootId = crypto.randomUUID();
      globalThis.nativeCalls = [];
      const event = () => ({ listeners: [], addListener(fn) { this.listeners.push(fn); } });
      chrome.runtime.connectNative = () => {
        const connection = { onMessage: event(), onDisconnect: event(), disconnect() {}, postMessage(message) {
          nativeCalls.push(message);
          const project = { id: 'fixture-project', root: '/workspace' };
          const values = {
            status: { editor: { name: 'Cursor' }, editorAvailable: true, capabilities: ['auto-update'], revision: 'fixture' },
            identifyProject: { project }, checkProject: { project },
            copySource: { location: '/workspace/src/SaveButton.tsx#L12' },
            openSource: { file: '/workspace/src/SaveButton.tsx' }
          };
          queueMicrotask(() => connection.onMessage.listeners.forEach(fn => fn({ id: message.id, ok: true, ...values[message.action] })));
        } };
        return connection;
      };
      InternalDevToolkit.componentRuntime = { async loadBundle() { return { revision: 'fixture' }; } };
      globalThis.IDTComponentSources = { clearSourceCache() {}, async resolveComponentSource(source) { return source; } };
    `;
    await fs.writeFile(path.join(extension, 'background.js'), [
      await read('src/common/component-settings.js'), await read('src/inspector/page-probe.js'),
      nativeFixture, await read('src/background/component-inspector.js'),
    ].join('\n'));
    await fs.writeFile(path.join(extension, 'component-inspector.js'), [
      await read('src/common/component-settings.js'), await read('src/inspector/content.js'),
    ].join('\n'));
    await fs.writeFile(path.join(extension, 'component-document-ready.js'), await read('src/inspector/document-ready.js'));
    context = await chromium.launchPersistentContext(path.join(root, 'profile'), {
      channel: 'chromium', headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    let worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    await until(() => worker.evaluate(() => !!globalThis.InternalDevToolkit?.componentInspectorBackground), '后台未启动');
    const page = await context.newPage(); await page.goto(origin + '/first', { waitUntil: 'domcontentloaded' });
    const peer = await context.newPage(); await peer.goto(origin + '/second');
    await page.bringToFront();
    await page.locator('#draft').fill('保留这段尚未保存的内容');
    const identity = await page.evaluate(() => documentIdentity);
    const peerIdentity = await peer.evaluate(() => documentIdentity);
    const tabId = await worker.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, page.url());
    await worker.evaluate(async ({ tabId, origin }) => {
      const background = InternalDevToolkit.componentInspectorBackground;
      const sender = { url: chrome.runtime.getURL('popup.html') };
      await background.handle({ type: 'COMPONENT_SAVE_SETTINGS', payload: { clickAction: 'copy' } }, sender);
      await background.handle({ type: 'COMPONENT_START', payload: { tabId, origin } }, sender);
    }, { tabId, origin });
    const installed = () => worker.evaluate(async origin => {
      const tabs = (await chrome.tabs.query({})).filter(tab => tab.url?.startsWith(origin));
      return Promise.all(tabs.map(async tab => {
        const state = await InternalDevToolkit.componentInspectorBackground.readState(tab.id);
        const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'ISOLATED', func: config =>
          !!chrome.runtime.id && globalThis.__IDT_COMPONENT_INSPECTOR__?.isRunning(config) === true,
          args: [{ origin, generation: state.generation }] });
        return state.status === 'on' && results[0]?.result === true;
      }));
    }, origin);
    await until(async () => (await installed()).every(Boolean), '初次定位脚本未启动');
    const target = page.locator('#target');
    await page.keyboard.down('Meta'); await target.click({ button: 'right' }); await page.keyboard.up('Meta');
    await page.locator('[data-idt-component-overlay] .item').waitFor();
    const manager = await context.newPage(); await manager.goto('chrome://extensions/');
    await manager.locator('extensions-toolbar #devMode').click();

    for (let attempt = 0; attempt < 2; attempt++) {
      const oldBoot = await worker.evaluate(() => bootId);
      await manager.bringToFront();
      await manager.locator('extensions-item').filter({ hasText: 'Component reload test' }).locator('#dev-reload-button').click();
      await until(async () => {
        for (const next of context.serviceWorkers()) {
          if (await next.evaluate(previous => globalThis.bootId && bootId !== previous, oldBoot)) { worker = next; return true; }
        }
      }, '重载后的后台未启动');
      await until(async () => (await installed()).every(Boolean), '更新扩展后应自动恢复所有已开启页面');
      await page.bringToFront();
      assert.equal(await page.evaluate(() => documentIdentity), identity, '更新扩展应保留原网页');
      assert.equal(await peer.evaluate(() => documentIdentity), peerIdentity, '隐藏标签页也应保留原网页');
      assert.equal(await page.locator('#draft').inputValue(), '保留这段尚未保存的内容');
      assert.equal(await page.evaluate(() => document.readyState), 'interactive', '资源持续加载期间也应恢复定位');
      assert.equal(await page.locator('[data-idt-component-overlay]').count(), 0, '旧版组件菜单应被清除');
      await page.keyboard.down('Meta'); await target.hover();
      await until(() => target.getAttribute('data-idt-component-target'), '更新后应直接显示高亮');
      await target.click(); await page.keyboard.up('Meta');
      await until(() => worker.evaluate(() => nativeCalls.filter(call => call.action === 'copySource').length === 1), '更新后首次点击应直接复制源码位置');
      assert.equal(await page.evaluate(() => businessClicks), 0, '定位操作应继续拦截业务点击');
      assert.equal(await page.locator('[data-idt-component-overlay] .toast').count(), 1, '一次操作应只显示一条结果');
      await page.keyboard.press('Escape');
    }
    console.log('component reload tests passed (same document, unsaved input, pending resources, active/hidden tabs, stale overlays and first-click copying across repeated extension reloads)');
  } finally {
    await context?.close();
    for (const response of pendingResources) response.end();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
