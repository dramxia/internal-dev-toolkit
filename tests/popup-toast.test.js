const assert = require('assert');

const classes = new Set();
const toastEl = {
  textContent: '',
  classList: {
    add(...names) {
      names.forEach((name) => classes.add(name));
    },
    remove(...names) {
      names.forEach((name) => classes.delete(name));
    },
  },
};

let nextTimerId = 1;
let timeoutCallCount = 0;
let scheduledTimer = null;
const clearedTimers = [];

globalThis.document = {
  getElementById(id) {
    return id === 'globalToast' ? toastEl : null;
  },
};
globalThis.setTimeout = (callback, duration) => {
  timeoutCallCount += 1;
  scheduledTimer = { id: nextTimerId, callback, duration };
  nextTimerId += 1;
  return scheduledTimer.id;
};
globalThis.clearTimeout = (timerId) => {
  clearedTimers.push(timerId);
};
globalThis.InternalDevToolkit = {};

const modulePath = require.resolve('../src/popup/ui.js');
delete require.cache[modulePath];
require(modulePath);

const { toast } = globalThis.InternalDevToolkit.ui;

toast('登录失败：账号或密码错误', 'err', { duration: 3200 });
assert.equal(toastEl.textContent, '登录失败：账号或密码错误');
assert.equal(classes.has('show'), true);
assert.equal(classes.has('err'), true);
assert.equal(scheduledTimer.duration, 3200, 'App 错误提示应使用调用方指定的关闭时间');

scheduledTimer.callback();
assert.equal(toastEl.textContent, '');
assert.equal(classes.has('show'), false, '定时结束后应隐藏错误提示');
assert.equal(classes.has('err'), false);

const timeoutCallsBeforePersistentError = timeoutCallCount;
toast('需要持续展示的全局错误', 'err');
assert.equal(toastEl.textContent, '需要持续展示的全局错误');
assert.equal(classes.has('show'), true);
assert.equal(timeoutCallCount, timeoutCallsBeforePersistentError, '未指定 duration 时不应创建错误关闭定时器');

toast('', '');
assert.equal(toastEl.textContent, '');
assert.equal(classes.has('show'), false, '空提示应立即清理当前 toast');
assert.ok(clearedTimers.length >= 3, '每次更新提示前都应清理旧定时器');

console.log('popup toast duration tests passed');
