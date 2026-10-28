/* 真浏览器 + 真扩展 + macOS 原生通信；编辑器使用临时测试程序记录参数。 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const esbuild = require('esbuild');
const { chromium } = require('@playwright/test');
const { install, runtimeBundle } = require('../native-host/installation.cjs');
const repo = path.join(__dirname, '..');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn, message, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { const result = await fn(); if (result) return result; } catch (error) { last = error; }
    await sleep(100);
  }
  throw new Error(`${message}${last ? `: ${last.message}` : ''}`);
}

(async () => {
  if (process.platform !== 'darwin') { console.log('macOS component browser test skipped'); return; }
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'idt-component-browser-'));
  const root = await fs.realpath(temp);
  const webRoot = path.join(root, 'apps', 'web');
  const hostName = `com.internal_dev_toolkit.component_test_${process.pid}`;
  const registrations = [];
  const registrationContents = new Map();
  let context, server;
  try {
    await fs.mkdir(path.join(webRoot, 'src'), { recursive: true }); await fs.mkdir(path.join(webRoot, 'assets'));
    // 普通父目录统一启动多个前端，不声明 workspaces。
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'component-browser-collection', private: true }));
    await fs.writeFile(path.join(webRoot, 'package.json'), JSON.stringify({ name: 'component-browser-web', dependencies: { react: '19', vue: '3' } }));
    for (const version of [18, 19]) {
      const name = `React${version}.jsx`;
      await fs.writeFile(path.join(webRoot, 'src', name), `import React from 'react';
import { createRoot } from 'react-dom/client';
function Child({ label }) {
  return <button id="target" onClick={() => { window.businessClicks = (window.businessClicks || 0) + 1; }}>{label}</button>;
}
function Parent() { return <section><h1>React ${version}</h1><Child label="hello React ${version}" /></section>; }
createRoot(document.getElementById('app')).render(<Parent />);
`);
      await esbuild.build({ absWorkingDir: webRoot, entryPoints: [path.join(webRoot, 'src', name)], outfile: path.join(webRoot, 'assets', `react${version}.js`), bundle: true, sourcemap: 'inline', jsx: 'automatic', jsxDev: true, define: { 'process.env.NODE_ENV': '"development"' }, alias: { react: path.dirname(require.resolve(`${version === 18 ? 'react18' : 'react'}/package.json`)), 'react-dom': path.dirname(require.resolve(`${version === 18 ? 'react-dom18' : 'react-dom'}/package.json`)) } });
    }
    for (const version of [2, 3]) {
      const file = path.join(webRoot, 'src', `Vue${version}.vue`);
      await fs.writeFile(file, '<template><button id="target">Vue component</button></template>\n');
      const source = version === 3
        ? `import {createApp,h,defineComponent} from 'vue'; const Child=defineComponent({name:'VueChild',__file:${JSON.stringify(file)},props:['label'],setup:p=>()=>h('button',{id:'target',onClick:()=>window.businessClicks=(window.businessClicks||0)+1},p.label)});const Parent=defineComponent({name:'VueParent',__file:${JSON.stringify(file)},setup:()=>()=>h('section',[h('h1','Vue 3'),h(Child,{label:'hello Vue 3'})])});createApp(Parent).mount('#app');`
        : `import Vue from 'vue2'; const Child={name:'VueChild',__file:${JSON.stringify(file)},props:['label'],render(h){return h('button',{attrs:{id:'target'},on:{click:()=>window.businessClicks=(window.businessClicks||0)+1}},this.label)}};new Vue({name:'VueParent',__file:${JSON.stringify(file)},render:h=>h('section',[h('h1','Vue 2'),h(Child,{props:{label:'hello Vue 2'}})])}).$mount('#app');`;
      await esbuild.build({ stdin: { contents: source, resolveDir: repo, sourcefile: `Vue${version}.js` }, outfile: path.join(webRoot, 'assets', `vue${version}.js`), bundle: true, sourcemap: 'inline', define: { 'process.env.NODE_ENV': '"development"', __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false' } });
    }
    for (const name of ['Users', 'Orders']) {
      await fs.writeFile(path.join(webRoot, 'src', `${name}.jsx`), `import React from 'react';
export default function ${name}Page({ label }) {
  return <button id="target" onClick={() => { window.businessClicks = (window.businessClicks || 0) + 1; }}>{label}</button>;
}
`);
    }
    await fs.writeFile(path.join(webRoot, 'src', 'spa.jsx'), `import React from 'react';
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('app'));
let version = 0;
function RouteFrame({ Component, label }) { return <section><h1>异步路由</h1><Component label={label} /></section>; }
async function renderRoute() {
  const current = ++version;
  const orders = (location.hash || location.pathname).includes('orders');
  const { default: Component } = await (orders ? import('./Orders.jsx') : import('./Users.jsx'));
  if (current === version) root.render(<RouteFrame Component={Component} label={'hello ' + (orders ? 'Orders' : 'Users')} />);
}
window.navigateComponentRoute = (url, replace = false) => { history[replace ? 'replaceState' : 'pushState']({}, '', url); renderRoute(); };
window.addEventListener('popstate', renderRoute);
window.addEventListener('hashchange', renderRoute);
renderRoute();
`);
    await esbuild.build({ absWorkingDir: webRoot, entryPoints: [path.join(webRoot, 'src', 'spa.jsx')], outdir: path.join(webRoot, 'assets'), bundle: true, splitting: true, format: 'esm', sourcemap: 'inline', jsx: 'automatic', jsxDev: true, define: { 'process.env.NODE_ENV': '"development"' }, alias: { react: path.dirname(require.resolve('react/package.json')), 'react-dom': path.dirname(require.resolve('react-dom/package.json')) } });
    const serverFile = path.join(root, 'server.cjs');
    await fs.writeFile(serverFile, `const fs=require('node:fs');const path=require('node:path');require('node:http').createServer((q,s)=>{const u=new URL(q.url,'http://localhost');if(u.pathname.startsWith('/assets/')){s.setHeader('Content-Type','application/javascript');s.end(fs.readFileSync(path.join(process.cwd(),'apps/web',u.pathname)));return;}const name=u.pathname.slice(1)||'react19';s.setHeader('Content-Type','text/html');const script=name.startsWith('spa/')?'<script type="module" src="/assets/spa.js"></script>':name==='delayed'?'<script>setTimeout(()=>{const s=document.createElement("script");s.src="/assets/react19.js";document.body.append(s)},1500)</script>':'<script src="/assets/'+name+'.js"></script>';s.end('<!doctype html><html><body style="font:16px system-ui;padding:50px"><div id="app"></div><a id="link" href="/vue3">Link</a>'+script+'</body></html>');}).listen(Number(process.argv[2]||0),'127.0.0.1',function(){console.log(this.address().port)});`);
    const startServer = (servicePort = 0) => new Promise((resolve, reject) => {
      server = spawn(process.execPath, [serverFile, String(servicePort)], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
      server.once('error', reject);
      server.once('exit', (code) => reject(new Error(`测试服务启动失败：${code}`)));
      server.stdout.once('data', (chunk) => resolve(Number(chunk.toString().trim())));
    });
    const stopServer = async () => {
      const previous = server; server = null;
      const exit = new Promise((resolve) => previous.once('exit', resolve)); previous.kill(); await exit;
    };
    const port = await startServer();
    const origin = `http://127.0.0.1:${port}`;
    const extension = path.join(root, 'extension'); await fs.cp(path.join(repo, 'dist'), extension, { recursive: true });
    const background = await fs.readFile(path.join(extension, 'background.js'), 'utf8');
    await fs.writeFile(path.join(extension, 'background.js'), background.replaceAll('com.internal_dev_toolkit.component_inspector', hostName));
    const launchOptions = { channel: 'chromium', headless: true, viewport: { width: 1080, height: 760 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--host-resolver-rules=MAP remote.test 127.0.0.1'] };
    context = await chromium.launchPersistentContext(path.join(root, 'browser-profile'), launchOptions);
    let worker = context.serviceWorkers()[0]; if (!worker) worker = await context.waitForEvent('serviceworker');
    const extensionId = worker.url().split('/')[2];
    await until(() => worker.evaluate(() => !!globalThis.InternalDevToolkit?.componentInspectorBackground), '扩展后台未启动');
    await worker.evaluate(() => {
      globalThis.componentNativeTrace = [];
      const connect = chrome.runtime.connectNative.bind(chrome.runtime);
      chrome.runtime.connectNative = (...args) => {
        const connection = connect(...args), actions = new Map();
        const post = connection.postMessage.bind(connection);
        connection.postMessage = (message) => { actions.set(message.id, message.action); componentNativeTrace.push(['send', message.id, message.action, Date.now()]); post(message); };
        connection.onMessage.addListener((message) => componentNativeTrace.push(['reply', message.id, actions.get(message.id), message.ok, message.error, Date.now()]));
        connection.onDisconnect.addListener(() => componentNativeTrace.push(['disconnect', chrome.runtime.lastError?.message, Date.now()]));
        return connection;
      };
    });
    const dataDir = path.join(root, 'host-state');
    const hostDir = path.join(dataDir, 'component-host'); await fs.mkdir(hostDir, { recursive: true });
    const manifestPath = path.join(root, 'browser-profile', 'NativeMessagingHosts', `${hostName}.json`);
    const oldSource = path.join(root, 'old-helper');
    await fs.cp(path.join(repo, 'native-host'), path.join(oldSource, 'native-host'), { recursive: true });
    await fs.appendFile(path.join(oldSource, 'native-host', 'lib.cjs'), '\n// Previous helper build used to verify automatic updates.\n');
    await install({ extensionId, sourceRoot: oldSource, paths: { dataDir, hostDir, manifestPath } });
    await fs.rm(manifestPath);
    const quote = (s) => "'" + s.replace(/'/g, "'\\''") + "'";
    const launcher = path.join(hostDir, 'launch.sh');
    for (const directory of [path.join(root, 'browser-profile', 'NativeMessagingHosts')]) {
      await fs.mkdir(directory, { recursive: true });
      const file = path.join(directory, `${hostName}.json`);
      registrationContents.set(file, JSON.stringify({ name: hostName, description: 'Temporary component inspector test', path: launcher, type: 'stdio', allowed_origins: [`chrome-extension://${extensionId}/`] }));
      registrations.push(file);
    }
    let page = await context.newPage(); await page.goto(`${origin}/react19`); await page.waitForSelector('#target');
    let panel = await context.newPage(); await panel.setViewportSize({ width: 380, height: 850 });
    // 记录复制内容，避免测试覆盖用户电脑的剪贴板。
    await panel.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { async writeText(text) { window.componentClipboard = text; } } }));
    await panel.goto(`chrome-extension://${extensionId}/popup.html`);
    await until(() => panel.locator('[data-workspace-id="global:component"]').count(), '定位入口缺失');
    await page.bringToFront();
    await panel.evaluate(() => document.querySelector('[data-workspace-id="global:component"]').click());
    await until(async () => (await panel.locator('#componentHostStatus').textContent()).includes('安装'), '首次使用缺少安装提示');
    assert.equal(await panel.locator('#componentHostSection').getAttribute('open'), '', '首次使用应自动展开辅助程序');
    assert.equal(await panel.locator('#componentPageState').textContent(), '待设置');
    assert.equal(await panel.locator('#componentChooseEditor').isDisabled(), true);
    await fs.mkdir(path.join(repo, 'test-results'), { recursive: true });
    await panel.screenshot({ path: path.join(repo, 'test-results/component-first-use.png'), fullPage: true });
    const downloading = panel.waitForEvent('download');
    await panel.evaluate(() => document.getElementById('componentDownloadInstall').click());
    const download = await downloading;
    assert.equal(download.suggestedFilename(), '组件定位-安装.zip');
    await download.saveAs(path.join(root, 'downloaded-installer.zip'));
    assert.match(await panel.locator('#componentSetupMessage').textContent(), /Apple 无法验证/);
    await until(async () => !(await panel.locator('#componentCopyQuarantine').isDisabled()), '下载后解除隔离命令按钮未恢复');
    await panel.evaluate(() => { const button = document.getElementById('componentCopyQuarantine'); button.closest('details').open = true; button.click(); });
    await until(async () => (await panel.locator('#componentSetupMessage').textContent()).includes('拖到命令末尾'), '解除隔离说明缺少所选目录步骤');
    assert.equal(await panel.evaluate(() => window.componentClipboard), '/usr/bin/xattr -dr com.apple.quarantine ', '复制的命令仅处理指定隔离属性，目录由用户拖入');
    await until(async () => !(await panel.locator('#componentCopyInstall').isDisabled()), '下载后复制按钮未恢复');
    await panel.evaluate(() => document.getElementById('componentCopyInstall').click());
    await until(async () => (await panel.locator('#componentSetupMessage').textContent()).includes('安装命令已复制'), '完整安装命令未复制');
    const terminalCommand = await panel.evaluate(() => window.componentClipboard);
    assert.ok(terminalCommand.startsWith("node <<'IDT_COMPONENT_SETUP'\n"));
    assert.ok(terminalCommand.includes(extensionId));
    assert.ok(terminalCommand.includes('installer.install'));
    for (const [file, contents] of registrationContents) await fs.writeFile(file, contents);
    await until(async () => (await panel.locator('#componentHostStatus').textContent()).includes('已连接'), '原生通信连接失败');
    assert.match(await panel.locator('#componentHostStatus').textContent(), /已自动更新/);
    const currentRevision = (await runtimeBundle(path.join(repo, 'native-host'))).revision;
    assert.equal(JSON.parse(await fs.readFile(path.join(hostDir, 'current.json'), 'utf8')).revision, currentRevision, '应自动同步扩展中的当前辅助程序');
    assert.equal(await panel.locator('#componentEditorSection').getAttribute('open'), '', '连接后应自动展开编辑器');
    assert.equal(await panel.locator('#componentHostSection').getAttribute('open'), null, '安装完成后应收起辅助程序');
    assert.equal(await panel.locator('#componentHostUpdateHint').isHidden(), true);
    assert.match(await panel.locator('#componentEditorHint').textContent(), /应用程序.*\.app/);
    assert.equal(await panel.locator('#componentToggle').isDisabled(), true, '编辑器初始为空，启动应禁用');
    const app = path.join(root, 'Cursor.app'), bin = path.join(app, 'Contents', 'Resources', 'app', 'bin');
    await fs.mkdir(bin, { recursive: true });
    const log = path.join(root, 'opened.jsonl'), capture = path.join(root, 'capture.cjs');
    await fs.writeFile(capture, `require('node:fs').appendFileSync(${JSON.stringify(log)},JSON.stringify(process.argv.slice(2))+'\\n');`);
    await fs.writeFile(path.join(bin, 'cursor'), `#!/bin/sh\nexec ${quote(process.execPath)} ${quote(capture)} "$@"\n`, { mode: 0o700 });
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, 'settings.json'), JSON.stringify({ editor: { path: app, name: 'Cursor', bundleId: 'com.todesktop.230313mzl4w4u92' }, projects: {} }));
    await panel.evaluate(() => document.getElementById('componentCheckHost').click());
    await until(async () => !(await panel.locator('#componentToggle').isDisabled()), '选择编辑器后启动仍禁用');
    let tabId = await worker.evaluate(async (url) => (await chrome.tabs.query({})).find((tab) => tab.url === url).id, page.url());
    const state = () => worker.evaluate((id) => InternalDevToolkit.componentInspectorBackground.readState(id), tabId);
    const togglePage = async () => {
      await until(() => panel.locator('#componentToggle').isEnabled(), '启停操作尚未恢复');
      // 保持业务标签页激活，模拟侧栏操作；等状态刷新完成后再点击。
      await panel.evaluate(() => document.getElementById('componentToggle').click());
    };
    const installed = (id = tabId) => worker.evaluate(async (targetId) => {
      const state = await InternalDevToolkit.componentInspectorBackground.readState(targetId);
      return (await chrome.scripting.executeScript({ target: { tabId: targetId }, world: 'ISOLATED', func: (config) => globalThis.__IDT_COMPONENT_INSPECTOR__?.isRunning(config) === true, args: [{ origin: state.origin, generation: state.generation }] }))[0]?.result === true;
    }, id);
    const opened = async () => { try { return (await fs.readFile(log, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); } catch (_) { return []; } };
    async function assertLocatorWorks(targetPage, file, label, openKey = 'Meta') {
      await targetPage.bringToFront();
      const targetId = await worker.evaluate(async () => (await chrome.tabs.query({ active: true }))[0].id);
      await until(() => installed(targetId), `${file} 定位脚本尚未启动`);
      const target = targetPage.locator('#target');
      await until(async () => await target.textContent() === label, `${file} 页面组件尚未显示`);
      const businessClicks = await targetPage.evaluate(() => window.businessClicks || 0);
      await targetPage.mouse.move(8, 8);
      await targetPage.keyboard.down('Meta'); await target.hover();
      await until(async () => /^(React|Vue [23]) · /.test(await targetPage.locator('[data-idt-component-overlay] .badge').textContent()), `${file} 未识别出实际组件`);
      const highlighted = await targetPage.locator('[data-idt-component-overlay] .outline').boundingBox();
      const bounds = await target.boundingBox();
      for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(highlighted[key] - bounds[key]) < 1, `${file} 高亮位置错误：${key}`);
      await target.click({ button: 'right' }); await targetPage.keyboard.up('Meta');
      const items = targetPage.locator('[data-idt-component-overlay] .item');
      await until(async () => await items.count() >= 2, `${file} 组件菜单缺少父组件`);
      assert.ok((await items.first().locator('.path').textContent()).includes(file), `${file} 菜单指向了其他组件的源码`);
      await targetPage.keyboard.press('ArrowRight');
      assert.ok((await targetPage.locator('[data-idt-component-overlay] .details').textContent()).includes(label), `${file} 组件参数未更新`);
      await targetPage.keyboard.press('Escape');
      const before = (await opened()).length;
      await targetPage.keyboard.down(openKey); await target.click(); await targetPage.keyboard.up(openKey);
      await until(async () => (await opened()).length > before, `${file} 未调用编辑器打开源码`);
      const args = (await opened()).at(-1), actualFile = args.at(-1), expectedFile = path.join(webRoot, 'src', file);
      assert.ok(actualFile === expectedFile || actualFile.startsWith(`${expectedFile}:`), `${file} 打开了错误的源码：${actualFile}`);
      if (file.endsWith('.jsx')) {
        assert.ok(args.includes('--goto'), `${file} 未向编辑器传入行列位置`);
        const expectedLine = file.startsWith('React') ? 4 : 3;
        assert.equal(actualFile, `${expectedFile}:${expectedLine}:10`, `${file} 源码行列错误`);
      }
      assert.equal(await targetPage.evaluate(() => window.businessClicks || 0), businessClicks, `${file} 定位时触发了业务点击`);
    }
    await togglePage();
    await until(async () => (await state()).status === 'on', '首次启动失败');
    assert.equal((await state()).project.root, webRoot);
    await assertLocatorWorks(page, 'React19.jsx', 'hello React 19');
    // 图片持续加载时也应沿用项目，立即恢复定位，避免停在加载状态。
    const slowResourceUrl = `${origin}/component-refresh-pending.svg`;
    let releaseSlowResource, finishSlowResource;
    const slowResourceFinished = new Promise((resolve) => { finishSlowResource = resolve; });
    await context.route(slowResourceUrl, async (route) => {
      await new Promise((resolve) => { releaseSlowResource = resolve; });
      try { await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }); }
      finally { finishSlowResource(); }
    });
    await page.route(`${origin}/react19`, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('</body>', `<img src="${slowResourceUrl}" alt=""></body>`) });
    });
    try {
      const beforeSlowRefresh = await worker.evaluate(() => componentNativeTrace.filter((item) => item[0] === 'send' && item[2] === 'identifyProject').length);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await until(() => !!releaseSlowResource, '延迟资源请求尚未发出');
      await until(async () => (await state()).status === 'on' && await installed(), '图片仍在加载时应恢复定位');
      assert.equal(await page.evaluate(() => document.readyState), 'interactive', '验证期间页面应继续加载资源');
      assert.equal(await worker.evaluate(() => componentNativeTrace.filter((item) => item[0] === 'send' && item[2] === 'identifyProject').length), beforeSlowRefresh, '资源未加载完成的刷新应跳过项目识别');
      await assertLocatorWorks(page, 'React19.jsx', 'hello React 19');
    } finally {
      releaseSlowResource?.();
      if (releaseSlowResource) await slowResourceFinished;
      await page.unroute(`${origin}/react19`);
      await context.unroute(slowResourceUrl);
    }
    await page.waitForLoadState('load');
    console.log('same-address refresh restores highlighting and source opening while page resources remain pending, without project identification');
    const firstGeneration = (await state()).generation;
    await worker.evaluate((id) => chrome.scripting.executeScript({ target: { tabId: id }, world: 'ISOLATED', func: () => globalThis.__IDT_COMPONENT_INSPECTOR__?.destroy() }), tabId);
    assert.equal(await installed(), false);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await assertLocatorWorks(page, 'React19.jsx', 'hello React 19');
    assert.equal((await state()).generation, firstGeneration, '页面恢复通知应修复失效脚本并沿用开启状态');
    const inactive = await context.newPage(); await inactive.goto(`${origin}/react18`); await inactive.waitForSelector('#target');
    const inactiveId = await worker.evaluate(async () => (await chrome.tabs.query({ active: true }))[0].id);
    await until(() => installed(inactiveId), '新开的同地址标签页应自动开启');
    assert.equal((await state()).generation, firstGeneration, '新开同地址页面应保留原页面的定位实例');
    await assertLocatorWorks(inactive, 'React18.jsx', 'hello React 18');
    const setFromOtherTab = (type) => worker.evaluate(({ type, id, origin }) => InternalDevToolkit.componentInspectorBackground.handle({ type, payload: { tabId: id, origin } }, { url: chrome.runtime.getURL('popup.html') }), { type, id: inactiveId, origin });
    await setFromOtherTab('COMPONENT_STOP');
    assert.equal((await state()).status, 'off', '从另一标签页关闭，应停止原页面');
    assert.equal(await installed(), false, '关闭开发地址后应清理原页面的定位监听');
    assert.equal(await installed(inactiveId), false, '关闭开发地址后应清理当前页的定位监听');
    await setFromOtherTab('COMPONENT_START');
    await until(async () => (await state()).status === 'on' && await installed(), '从另一标签页开启，应同时恢复原页面');
    await assertLocatorWorks(page, 'React19.jsx', 'hello React 19');
    await assertLocatorWorks(inactive, 'React18.jsx', 'hello React 18');
    await inactive.close(); await page.bringToFront();
    const delayed = await context.newPage(); await delayed.goto(`${origin}/delayed`);
    const delayedId = await worker.evaluate(async (url) => (await chrome.tabs.query({})).find((tab) => tab.url === url).id, delayed.url());
    await until(async () => (await worker.evaluate((id) => InternalDevToolkit.componentInspectorBackground.readState(id), delayedId)).status === 'waiting', '异步加载框架时应进入等待状态');
    await delayed.waitForSelector('#target');
    await until(() => installed(delayedId), '组件延迟挂载后应自动启用');
    await assertLocatorWorks(delayed, 'React19.jsx', 'hello React 19');
    await delayed.close(); await page.bringToFront();
    for (const framework of ['react18', 'react19', 'vue2', 'vue3']) {
      if (!page.url().endsWith('/' + framework)) { await page.goto(`${origin}/${framework}`); await page.waitForSelector('#target'); }
      await until(async () => (await state()).status === 'on' && await installed(), `${framework} 刷新后未恢复`);
      await page.keyboard.down('Meta'); await page.locator('#target').hover();
      await until(() => page.locator('[data-idt-component-overlay]').count(), `${framework} 未出现高亮`);
      // 右下角菜单会覆盖原点击坐标，仍应读取真正选中的业务元素。
      await page.locator('#target').evaluate((element) => { element.style.cssText = 'position:fixed;right:2px;bottom:2px'; });
      await page.locator('#target').click({ button: 'right' }); await page.keyboard.up('Meta');
      await page.waitForSelector('[data-idt-component-overlay] .item');
      console.log(framework, 'source:', await page.locator('[data-idt-component-overlay] .item .path').first().textContent());
      assert.ok((await page.locator('[data-idt-component-overlay] .item').count()) >= 2, `${framework} 父组件链缺失`);
      await page.keyboard.press('ArrowRight');
      assert.match(await page.locator('[data-idt-component-overlay] .details').textContent(), /hello/);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-idt-component-overlay]').count(), 0);
      assert.equal(await page.locator('#target').evaluate((element) => element.getAttributeNames().some((name) => name.startsWith('data-idt-query-'))), false, '选择结束应清除临时标记');
      await page.locator('#target').evaluate((element) => { element.style.cssText = ''; });
      const before = (await opened()).length;
      await page.keyboard.down('Meta'); await page.locator('#target').click(); await page.keyboard.up('Meta');
      await until(async () => (await opened()).length > before, `${framework} 源码打开失败`);
      const args = (await opened()).at(-1);
      assert.ok(args.some((arg) => arg.includes(framework.startsWith('react') ? `React${framework.slice(5)}.jsx` : `Vue${framework.slice(3)}.vue`)), `${framework} 打开的文件错误：${JSON.stringify(args)}`);
      if (framework.startsWith('react')) assert.ok(args.includes('--goto'), `${framework} 应还原精确行号`);
      assert.equal(await page.evaluate(() => window.businessClicks || 0), 0, `${framework} 定位点击触发了业务操作`);
      const reloadProject = (await state()).project;
      const beforeReloadIdentifications = await worker.evaluate(() => componentNativeTrace.filter((item) => item[0] === 'send' && item[2] === 'identifyProject').length);
      await page.reload(); await page.waitForSelector('#target');
      await until(async () => (await state()).status === 'on' && await installed(), `${framework} 同地址刷新后未恢复`);
      assert.equal((await state()).project.id, reloadProject.id, `${framework} 刷新应沿用原项目`);
      assert.equal(await worker.evaluate(() => componentNativeTrace.filter((item) => item[0] === 'send' && item[2] === 'identifyProject').length), beforeReloadIdentifications, `${framework} 刷新应跳过项目目录识别`);
      await assertLocatorWorks(page, framework.startsWith('react') ? `React${framework.slice(5)}.jsx` : `Vue${framework.slice(3)}.vue`, `hello ${framework.startsWith('react') ? 'React' : 'Vue'} ${framework.match(/\d+/)[0]}`);
      console.log(`${framework}: highlight, parents, props, keyboard, source opening passed`);
    }
    assert.notEqual((await state()).generation, firstGeneration);
    // 先让页面完成一次服务检查，再在下次检查前重启，验证源码跳转自身的重试。
    await worker.evaluate((id) => chrome.scripting.executeScript({ target: { tabId: id }, world: 'ISOLATED', func: () => globalThis.__IDT_COMPONENT_DOCUMENT_READY__.wake() }), tabId);
    await page.keyboard.down('Meta'); await page.locator('#target').click({ button: 'right' }); await page.keyboard.up('Meta');
    await page.waitForSelector('[data-idt-component-overlay] .item');
    await page.keyboard.press('Home');
    await page.evaluate(() => { window.serviceRestartDocument = 'same-document'; });
    const firstPid = server.pid, opensBeforeRestart = (await opened()).length;
    await stopServer(); await startServer(port);
    assert.notEqual(server.pid, firstPid, '测试应实际替换开发服务进程');
    await page.keyboard.press('Enter');
    await until(async () => (await opened()).length > opensBeforeRestart, '服务重启后首次选择源码应自动重试并打开');
    assert.equal((await opened()).length, opensBeforeRestart + 1, '自动重试应只打开一次编辑器');
    assert.equal((await opened()).at(-1).at(-1), path.join(webRoot, 'src', 'Vue3.vue'));
    await until(async () => (await state()).status === 'on' && (await state()).project.pid === server.pid && await installed(), '源码跳转重试后应绑定新服务进程');
    assert.equal(await page.evaluate(() => window.serviceRestartDocument), 'same-document', '服务重启后应继续使用当前页面');
    await assertLocatorWorks(page, 'Vue3.vue', 'hello Vue 3');
    // 服务持续离线后重新上线，验证周期检查能够恢复多个标签页。
    const restartPeer = await context.newPage(); await restartPeer.goto(`${origin}/react19`); await restartPeer.waitForSelector('#target');
    const peerId = await worker.evaluate(async (url) => (await chrome.tabs.query({})).find((tab) => tab.url === url).id, restartPeer.url());
    await assertLocatorWorks(restartPeer, 'React19.jsx', 'hello React 19'); await page.bringToFront();
    await worker.evaluate((id) => chrome.scripting.executeScript({ target: { tabId: id }, world: 'ISOLATED', func: () => globalThis.__IDT_COMPONENT_DOCUMENT_READY__.wake() }), tabId);
    const idleChecks = await worker.evaluate(() => componentNativeTrace.filter((item) => item[0] === 'send' && item[2] === 'checkProject').length);
    await sleep(3500);
    assert.equal(await worker.evaluate(() => componentNativeTrace.filter((item) => item[0] === 'send' && item[2] === 'checkProject').length), idleChecks, '正常运行的 3 秒间隔内应跳过系统进程查询');
    const secondPid = server.pid;
    await stopServer();
    await until(async () => (await state()).status === 'recovering', '服务离线后应进入自动等待状态', 35000);
    assert.equal((await state()).enabled, true, '服务离线时应保留开发地址开关');
    await startServer(port);
    assert.notEqual(server.pid, secondPid);
    await until(async () => (await state()).status === 'on' && (await state()).project.pid === server.pid && await installed(), '同端口服务恢复后应自动重新启用定位');
    await assertLocatorWorks(page, 'Vue3.vue', 'hello Vue 3');
    await restartPeer.bringToFront();
    await until(async () => {
      const peer = await worker.evaluate((id) => InternalDevToolkit.componentInspectorBackground.readState(id), peerId);
      return peer.status === 'on' && peer.project.pid === server.pid && await installed(peerId);
    }, '同地址的另一标签页也应自动绑定新服务', 35000);
    await assertLocatorWorks(restartPeer, 'React19.jsx', 'hello React 19');
    assert.equal(await page.evaluate(() => window.serviceRestartDocument), 'same-document');
    await restartPeer.close(); await page.bringToFront();
    console.log('real server restarts on the same port pass automatic recovery, shared-tab recovery and first-attempt source opening');
    await page.goto(`${origin}/spa/users`); await page.waitForSelector('#target');
    await until(async () => (await state()).status === 'on' && await installed(), '异步路由页面未恢复');
    await assertLocatorWorks(page, 'Users.jsx', 'hello Users');
    const spaGeneration = (await state()).generation;
    await page.evaluate(() => { window.routeDocumentMarker = 'same-document'; });
    const navigations = [
      { navigate: () => window.navigateComponentRoute('/spa/orders?tab=all'), file: 'Orders.jsx', label: 'hello Orders' },
      { navigate: () => window.navigateComponentRoute('/spa/users?sort=name', true), file: 'Users.jsx', label: 'hello Users' },
      { navigate: () => { location.hash = '/orders'; }, file: 'Orders.jsx', label: 'hello Orders' },
      { navigate: () => history.back(), file: 'Users.jsx', label: 'hello Users' },
      { navigate: () => history.forward(), file: 'Orders.jsx', label: 'hello Orders' },
      { navigate: () => history.go(-2), file: 'Users.jsx', label: 'hello Users' },
    ];
    for (const { navigate, file, label } of navigations) {
      await page.keyboard.down('Meta'); await page.locator('#target').click({ button: 'right' }); await page.keyboard.up('Meta');
      await page.waitForSelector('[data-idt-component-overlay] .item');
      await page.evaluate(navigate);
      await until(async () => await page.locator('[data-idt-component-overlay]').count() === 0, '切路由应清除旧组件菜单');
      assert.equal(await page.evaluate(() => window.routeDocumentMarker), 'same-document', '路由切换应保留原文档');
      assert.equal((await state()).status, 'on');
      assert.equal((await state()).generation, spaGeneration, '路由切换应持续使用当前定位实例');
      await assertLocatorWorks(page, file, label);
    }
    assert.equal(page.url(), `${origin}/spa/users`);
    console.log('History, Hash, back and forward routes locate the current lazy-loaded component and exact source lines');
    await page.goto(`${origin}/vue3`); await page.waitForSelector('#target');
    await until(async () => (await state()).status === 'on' && await installed(), '返回 Vue 页面后未恢复');
    await assertLocatorWorks(page, 'Vue3.vue', 'hello Vue 3');
    // 通过管理页录制 Option，验证设置持久化和已开启页面上的即时更新。
    await panel.evaluate(() => {
      document.getElementById('componentOpenShortcut').click();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt', code: 'AltLeft', altKey: true, bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', code: 'AltLeft', bubbles: true }));
    });
    await until(async () => (await panel.locator('#componentOpenShortcut').textContent()).includes('Option'), '快捷键录制未保存');
    const beforeCustom = (await opened()).length;
    await page.keyboard.down('Alt'); await page.locator('#target').click(); await page.keyboard.up('Alt');
    await until(async () => (await opened()).length > beforeCustom, '自定义快捷键未生效');
    await panel.evaluate(() => document.getElementById('componentCheckHost').click());
    await until(async () => (await panel.locator('#componentPageUrl').textContent()).endsWith('/vue3'), '面板地址未同步');
    await fs.mkdir(path.join(repo, 'test-results'), { recursive: true });
    await panel.screenshot({ path: path.join(repo, 'test-results/component-inspector-panel.png'), fullPage: true });
    await panel.setViewportSize({ width: 320, height: 750 });
    assert.equal(await panel.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, '窄侧栏出现横向溢出');
    assert.equal(await panel.locator('.workspace-dock-item').count(), 5);
    await panel.screenshot({ path: path.join(repo, 'test-results/component-inspector-narrow.png'), fullPage: true });
    await panel.evaluate(() => document.getElementById('componentCopyInstall').click());
    await until(async () => (await panel.locator('#componentSetupMessage').textContent()).includes('安装命令已复制') && !(await panel.locator('#componentCheckHost').isDisabled()), '重装命令生成后操作未恢复');
    await panel.evaluate(() => document.getElementById('componentCheckHost').click());
    await until(() => panel.locator('#componentInstallGuide').isHidden(), '重新连接后应收起已完成的安装步骤');
    assert.equal(await panel.locator('#componentSetupMessage').isHidden(), true, '已选择编辑器后应清除旧的第 2 步提示');
    assert.equal((await state()).status, 'on', '主动重新连接辅助程序应保留页面开启状态');
    assert.equal(await installed(), true);
    await assertLocatorWorks(page, 'Vue3.vue', 'hello Vue 3', 'Alt');
    await togglePage();
    await until(async () => (await state()).status === 'off', '停止失败');
    assert.equal(await installed(), false);
    await page.keyboard.down('Meta'); await page.locator('#target').click(); await page.keyboard.up('Meta');
    assert.equal(await page.evaluate(() => window.businessClicks), 1, '停止后应恢复业务点击');
    assert.equal(await page.locator('[data-idt-component-overlay]').count(), 0);
    await fs.rename(path.join(root, 'package.json'), path.join(root, 'package.hidden'));
    await fs.rename(path.join(webRoot, 'package.json'), path.join(webRoot, 'package.hidden'));
    await togglePage();
    await until(async () => (await state()).status === 'paused', '目录识别失败后应暂停');
    assert.equal(await installed(), false, '目录识别失败时应清理定位界面和监听');
    await fs.rename(path.join(root, 'package.hidden'), path.join(root, 'package.json'));
    await fs.rename(path.join(webRoot, 'package.hidden'), path.join(webRoot, 'package.json'));
    await context.route(`http://remote.test:${port}/**`, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><button id="target">普通网站</button>' }));
    await page.goto(`http://remote.test:${port}/react18`); await page.waitForSelector('#target');
    await panel.evaluate(() => document.getElementById('componentCheckHost').click());
    await until(async () => (await panel.locator('#componentPageUrl').textContent()).includes('remote.test'), '远端地址未同步');
    assert.equal(await panel.locator('#componentToggle').isDisabled(), true, '普通网站应禁用启动');
    await page.goto(`${origin}/react18`); await page.waitForSelector('#target');
    await until(async () => (await state()).status === 'on' && await installed(), '回到已开启的开发地址应自动恢复');
    await assertLocatorWorks(page, 'React18.jsx', 'hello React 18', 'Alt');
    const reopened = await context.newPage(); await reopened.goto(`${origin}/react19`); await reopened.waitForSelector('#target');
    await assertLocatorWorks(reopened, 'React19.jsx', 'hello React 19', 'Alt');
    await reopened.close(); await page.bringToFront();
    await context.close();
    context = await chromium.launchPersistentContext(path.join(root, 'browser-profile'), launchOptions);
    worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    page = await context.newPage(); await page.goto(`${origin}/vue3`); await page.waitForSelector('#target');
    tabId = await worker.evaluate(async (url) => (await chrome.tabs.query({})).find((tab) => tab.url === url).id, page.url());
    await until(async () => (await state()).status === 'on' && await installed(), '重启浏览器后应沿用开发地址开关');
    await assertLocatorWorks(page, 'Vue3.vue', 'hello Vue 3', 'Alt');
    console.log('new tabs, same-address reloads, delayed mounting, returning to the origin and browser restart all pass real highlight, menu and source-opening checks');
    panel = await context.newPage();
    await panel.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { async writeText(text) { window.componentClipboard = text; } } }));
    await panel.goto(`chrome-extension://${extensionId}/popup.html`); await page.bringToFront();
    await panel.evaluate(() => document.querySelector('[data-workspace-id="global:component"]').click());
    await until(() => panel.locator('#componentUninstallHost').isEnabled(), '重启后设置尚未就绪');
    await panel.evaluate(() => document.getElementById('componentUninstallHost').click());
    assert.equal(await panel.locator('#componentUninstallConfirm').isVisible(), true);
    await panel.evaluate(() => document.getElementById('componentCancelUninstall').click());
    assert.ok(await fs.stat(manifestPath), '取消卸载应保留本机程序');
    await panel.evaluate(() => document.getElementById('componentUninstallHost').click());
    await panel.evaluate(() => document.getElementById('componentConfirmUninstall').click());
    await until(async () => (await panel.locator('#componentSetupMessage').textContent()).includes('已卸载'), '页面卸载失败');
    assert.equal(await installed(), false, '卸载应清理已启动页面');
    await assert.rejects(fs.stat(hostDir), { code: 'ENOENT' });
    await assert.rejects(fs.stat(manifestPath), { code: 'ENOENT' });
    assert.ok((JSON.parse(await fs.readFile(path.join(dataDir, 'settings.json'), 'utf8'))).editor, '卸载保留编辑器设置');
    assert.equal(await panel.locator('#componentHostSection').getAttribute('open'), '', '卸载后应展开安装入口');
    await panel.evaluate(() => document.getElementById('componentUninstallHost').click());
    await until(async () => (await panel.locator('#componentSetupMessage').textContent()).includes('卸载命令已复制'), '未连接时应提供完整卸载命令');
    assert.ok((await panel.evaluate(() => window.componentClipboard)).includes('await installer.uninstall()'));
    await until(() => panel.locator('#componentCopyInstall').isEnabled(), '复制卸载命令后应等待按钮恢复');
    await panel.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('denied'); }; document.getElementById('componentCopyInstall').click(); });
    await until(async () => (await panel.locator('#componentSetupMessage').textContent()).includes('自动复制失败'), '复制失败缺少手动操作入口');
    assert.equal(await panel.locator('#componentCommandPreview').isVisible(), true);
    assert.ok((await panel.locator('#componentCommandPreview').inputValue()).includes('installer.install'));
    console.log('first-use guide, terminal command copying, clipboard fallback, auto-connection and native uninstall passed');
    console.log('component browser tests passed (real extension + native messaging)');
  } catch (error) {
    if (context) {
      try { console.error('STATE / NATIVE', await context.serviceWorkers()[0]?.evaluate(async () => ({ states: await chrome.storage.session.get(null), native: globalThis.componentNativeTrace?.slice(-30) }))); } catch (_) {}
      for (const page of context.pages()) {
        try { console.error('PAGE', page.url(), (await page.locator('body').innerText()).slice(-1800)); } catch (_) {}
      }
    }
    throw error;
  } finally {
    await context?.close();
    if (server?.exitCode === null) { const exit = new Promise((resolve) => server.once('exit', resolve)); server.kill(); await exit; }
    for (const file of registrations) await fs.rm(file, { force: true });
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
