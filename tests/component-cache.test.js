'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');

const script = esbuild.buildSync({ entryPoints: [path.join(__dirname, '../src/inspector/source-resolver.mjs')], bundle: true, format: 'iife', globalName: 'Sources', write: false }).outputFiles[0].text;
function codeFor(name = 'Panel.jsx', length = 0) {
  const map = { version: 3, sourceRoot: 'file:///project/', sources: [`src/${name}`], names: [], mappings: 'AAAA' };
  const code = `console.log(1);\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString('base64')}`;
  return ' '.repeat(Math.max(0, length - code.length)) + code;
}
function fixture(fetcher = async () => new Response(codeFor())) {
  let now = Date.now(), serial = 0;
  const timers = new Map(), requests = [];
  const context = vm.createContext({
    URL, Response, TextDecoder, Uint8Array, AbortController, atob,
    Date: class extends Date { static now() { return now; } },
    setTimeout(fn, delay) { const id = ++serial; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    async fetch(url, options) { requests.push({ url, signal: options.signal }); return fetcher(url, options); },
  });
  vm.runInContext(script, context);
  const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
  return {
    requests, timers,
    clear: context.Sources.clearSourceCache,
    resolve(name, origin = 'http://localhost:5173') { return context.Sources.resolveComponentSource({ kind: 'stack', stack: `at Panel (${origin}/${name}.js:1:8)` }, origin); },
    async advance(ms) {
      const end = now + ms;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
      }
      now = end; await flush();
    },
  };
}

test('keeps retained source text within 16 MiB and evicts least recently used resources', async () => {
  const f = fixture(async () => new Response(codeFor('Panel.jsx', 1024 * 1024)));
  for (let i = 0; i < 8; i++) await f.resolve(`chunk${i}`);
  await f.resolve('chunk0');
  assert.equal(f.requests.length, 8);
  await f.resolve('chunk8');
  await f.resolve('chunk0');
  assert.equal(f.requests.filter(({ url }) => url.endsWith('/chunk0.js')).length, 1, '近期使用的源码应继续保留');
  await f.resolve('chunk1');
  assert.equal(f.requests.filter(({ url }) => url.endsWith('/chunk1.js')).length, 2, '总大小达到上限后应清理较久未用的源码');
});

test('limits the number of small resources and releases idle entries with a single timer', async () => {
  const f = fixture();
  for (let i = 0; i < 33; i++) await f.resolve(`small${i}`);
  await f.resolve('small0');
  assert.equal(f.requests.filter(({ url }) => url.endsWith('/small0.js')).length, 2, '小文件也应受缓存条目数限制');
  assert.equal(f.timers.size, 1, '缓存共用一个清理定时器');
  await f.advance(4 * 60 * 1000);
  await f.resolve('small0');
  await f.advance(60 * 1000 + 1);
  await f.resolve('small0');
  assert.equal(f.requests.filter(({ url }) => url.endsWith('/small0.js')).length, 2, '继续使用的资源应延长保留时间');
  await f.resolve('small32');
  assert.equal(f.requests.filter(({ url }) => url.endsWith('/small32.js')).length, 2, '闲置五分钟的资源应重新读取');
  await f.advance(5 * 60 * 1000 + 1);
  assert.equal(f.timers.size, 0, '最后一份缓存过期后应停止清理定时器');
});

test('coalesces concurrent reads and prevents invalidated requests from replacing fresh sources', async () => {
  for (const failOld of [false, true]) {
    let finishOld, rejectOld, finishNew, calls = 0;
    const f = fixture((url) => {
      if (url.startsWith('http://localhost:5174/')) return new Response(codeFor('Other.jsx'));
      calls++;
      return new Promise((resolve, reject) => {
        if (calls === 1) { finishOld = resolve; rejectOld = reject; }
        else finishNew = resolve;
      });
    });
    await f.resolve('other', 'http://localhost:5174');
    const old = f.resolve('entry'), sharedOld = f.resolve('entry');
    assert.equal(calls, 1, '并发解析同一资源应共用下载');
    f.clear('http://localhost:5173');
    assert.equal(f.requests[1].signal.aborted, true, '清理开发地址时应取消旧下载');
    const fresh = f.resolve('entry');
    if (failOld) rejectOld(new Error('Old download failed'));
    else finishOld(new Response(codeFor('Old.jsx')));
    await Promise.all([old, sharedOld]);
    const sharedFresh = f.resolve('entry');
    assert.equal(calls, 2, '旧请求结束后应保留新下载的合并状态');
    finishNew(new Response(codeFor('Current.jsx')));
    for (const result of await Promise.all([fresh, sharedFresh, f.resolve('entry')])) assert.equal(result.file, 'file:///project/src/Current.jsx');
    await f.resolve('entry');
    await f.resolve('other', 'http://localhost:5174');
    assert.equal(f.requests.length, 3, '刷新仅作废对应地址的缓存，保留其他地址');
    f.clear();
    assert.equal(f.timers.size, 0);
  }
});

test('retries failed reads instead of retaining a rejected download', async () => {
  let calls = 0;
  const f = fixture(async () => { if (++calls === 1) throw new Error('temporary failure'); return new Response(codeFor()); });
  assert.equal((await f.resolve('retry')).precision, 'file');
  assert.equal((await f.resolve('retry')).precision, 'line');
  assert.equal(calls, 2);
});

test('aborts an oversized download before reading or retaining its body', async () => {
  const f = fixture(async () => new Response('oversized', { headers: { 'content-length': String(8 * 1024 * 1024 + 1) } }));
  assert.equal((await f.resolve('large')).precision, 'file');
  assert.equal(f.requests[0].signal.aborted, true);
  await f.resolve('large');
  assert.equal(f.requests.length, 2, '过大的资源应释放下载并跳过缓存');
  assert.equal(f.timers.size, 0);
});
