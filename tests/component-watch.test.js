'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const eventTarget = () => ({
  listeners: new Map(),
  addEventListener(name, fn, options = {}) {
    const listeners = this.listeners.get(name) || new Set();
    this.listeners.set(name, listeners); listeners.add(fn);
    options.signal?.addEventListener('abort', () => {
      listeners.delete(fn); if (!listeners.size) this.listeners.delete(name);
    });
  },
  emit(name, value = {}) { this.listeners.get(name)?.forEach(fn => fn(value)); },
  dispatchEvent(event) { this.emit(event.type, event); return true; },
});

(async () => {
  const timers = new Map(), requests = [], observers = [];
  const document = Object.assign(eventTarget(), { hidden: false, documentElement: {} });
  const window = eventTarget();
  let serial = 0, response = { ok: true, watch: true, retryAfter: 15000 }, release;
  let held = false, inFlight = 0, maxInFlight = 0;
  const context = vm.createContext({
    document, window, Event, AbortController,
    setTimeout(fn, delay) { const id = ++serial; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    MutationObserver: class {
      constructor(fn) { this.fn = fn; observers.push(this); }
      observe() { this.connected = true; }
      disconnect() { this.connected = false; }
    },
    chrome: { runtime: { id: 'fixture-extension', async sendMessage(message) {
      requests.push(message); inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
      if (held) await new Promise((resolve) => { release = resolve; });
      inFlight--; return response;
    } } },
  });
  const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
  const next = async () => { const [id, timer] = timers.entries().next().value; timers.delete(id); timer.fn(); await flush(); };
  const delay = () => [...timers.values()].map((timer) => timer.delay);
  const source = fs.readFileSync(path.join(__dirname, '../src/inspector/document-ready.js'), 'utf8');
  vm.runInContext(source, context);
  await flush();
  assert.deepEqual(delay(), [15000], '可见页面正常运行时应每 15 秒检查');
  document.hidden = true; document.emit('visibilitychange'); await flush();
  assert.deepEqual(delay(), [60000], '隐藏页面应降低为每分钟检查');
  document.hidden = false; document.emit('visibilitychange'); await flush();
  assert.equal(requests.at(-1).payload.reason, 'visible');
  assert.equal(requests.at(-1).payload.visible, true);
  assert.deepEqual(delay(), [15000]);
  response = { ok: true, watch: true, observe: true, retryAfter: 1000 };
  await next();
  assert.equal(observers.at(-1).connected, true);
  const beforeMutation = requests.length;
  for (let i = 0; i < 10; i++) observers.at(-1).fn();
  assert.deepEqual(delay(), [150]);
  await next();
  assert.equal(requests.length, beforeMutation + 1, '组件挂载造成的多次页面变动应合并通知');
  document.hidden = true; document.emit('visibilitychange'); await flush();
  assert.equal(observers.some((observer) => observer.connected), false, '隐藏页面应停止观察页面变动');
  assert.deepEqual(delay(), [60000]);
  held = true;
  await next();
  document.hidden = false; document.emit('visibilitychange');
  held = false; release(); await flush();
  assert.equal(maxInFlight, 1, '检查期间切回页面应排队处理，保持单个请求');
  assert.equal(requests.at(-1).payload.reason, 'visible');
  response = { ok: true, watch: false };
  await next();
  assert.equal(timers.size, 0, '关闭定位后应停止定时检查');
  response = { ok: true, watch: true, retryAfter: 15000 };
  context.__IDT_COMPONENT_DOCUMENT_READY__.wake(); await flush();
  window.emit('pagehide');
  assert.equal(timers.size, 0, '离开页面时应清理定时器');

  const existing = context.__IDT_COMPONENT_DOCUMENT_READY__;
  vm.runInContext(source, context); await flush();
  assert.equal(context.__IDT_COMPONENT_DOCUMENT_READY__, existing, '当前版本重复注入时沿用原通知器');
  assert.equal(window.listeners.get('focus').size, 1);
  assert.equal(timers.size, 1);

  // 模拟扩展更新：新旧脚本环境共享页面，旧请求迟到时也应保持原环境已停止。
  held = true; existing.wake(); await flush();
  const releaseOld = release;
  held = false;
  const replacement = vm.createContext({ ...context, chrome: { runtime: { ...context.chrome.runtime } } });
  delete replacement.__IDT_COMPONENT_DOCUMENT_READY__;
  vm.runInContext(source, replacement); await flush();
  releaseOld(); await flush();
  assert.equal(existing.isRunning(), false, '新版本应销毁旧环境中的通知器');
  assert.equal(context.__IDT_COMPONENT_DOCUMENT_READY__, undefined);
  assert.equal(replacement.__IDT_COMPONENT_DOCUMENT_READY__.isRunning(), true);
  assert.equal(window.listeners.get('focus').size, 1, '多次更新后仍只保留一个焦点监听器');
  assert.equal(timers.size, 1, '旧请求迟到时应保持单个恢复计时器');
  replacement.chrome.runtime.id = undefined;
  window.emit('focus'); await flush();
  assert.equal(timers.size, 0, '扩展连接已失效时应停止旧通知器');
  assert.equal(window.listeners.has('focus'), false);
  console.log('component visibility, polling intervals, mutation batching and recovery notification tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
