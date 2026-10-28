'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const eventTarget = () => ({ listeners: new Map(), addEventListener(name, fn) { this.listeners.set(name, fn); }, emit(name, value = {}) { this.listeners.get(name)?.(value); } });

(async () => {
  const timers = new Map(), requests = [], observers = [];
  const document = Object.assign(eventTarget(), { hidden: false, documentElement: {} });
  const window = eventTarget();
  let serial = 0, response = { ok: true, watch: true, retryAfter: 15000 }, release;
  let held = false, inFlight = 0, maxInFlight = 0;
  const context = vm.createContext({
    document, window,
    setTimeout(fn, delay) { const id = ++serial; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    MutationObserver: class {
      constructor(fn) { this.fn = fn; observers.push(this); }
      observe() { this.connected = true; }
      disconnect() { this.connected = false; }
    },
    chrome: { runtime: { async sendMessage(message) {
      requests.push(message); inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
      if (held) await new Promise((resolve) => { release = resolve; });
      inFlight--; return response;
    } } },
  });
  const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
  const next = async () => { const [id, timer] = timers.entries().next().value; timers.delete(id); timer.fn(); await flush(); };
  const delay = () => [...timers.values()].map((timer) => timer.delay);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/inspector/document-ready.js'), 'utf8'), context);
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
  console.log('component visibility, polling intervals, mutation batching and recovery notification tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
