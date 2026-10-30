const assert = require('node:assert/strict');
(async () => {
  const { parseStack, resolveComponentSource, clearSourceCache } = await import('../src/inspector/source-resolver.mjs');
  assert.deepEqual(parseStack('Error\n at render (http://localhost:5173/node_modules/react.js:2:4)\n at Panel (http://localhost:5173/entry.js:1:8)').map((frame) => frame.file), ['http://localhost:5173/entry.js']);
  const requests = [];
  const map = { version: 3, sourceRoot: 'file:///project/', sources: ['src/Panel.jsx'], sourcesContent: ['export function Panel() {}'], names: [], mappings: 'AAAA' };
  const code = `console.log(1);\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString('base64')}`;
  const originalFetch = global.fetch;
  global.fetch = async (url) => { requests.push(url); return new Response(code); };
  try {
    const source = { kind: 'stack', stack: 'Error\n at Panel (http://localhost:5173/entry.js:1:8)' };
    const resolved = await resolveComponentSource(source, 'http://localhost:5173');
    assert.deepEqual(resolved, { file: 'file:///project/src/Panel.jsx', line: 1, column: 1, precision: 'line' });
    await resolveComponentSource(source, 'http://localhost:5173');
    assert.equal(requests.length, 1, '同一源码映射应复用缓存');
    clearSourceCache('http://localhost:5173');
    await resolveComponentSource(source, 'http://localhost:5173');
    assert.equal(requests.length, 2);
    const missingMap = await resolveComponentSource({ kind: 'stack', stack: 'at Other (http://other.test/chunk.js:50:70)' }, 'http://localhost:5173');
    assert.equal(missingMap.line, null, '未经映射的生成行号不能冒充源码行号');
    assert.equal(requests.length, 2, '源码读取应限制在当前开发地址');
    assert.deepEqual(await resolveComponentSource({ kind: 'source', file: '/src/App.vue' }, 'http://localhost:5173'), { file: '/src/App.vue', line: null, column: null, precision: 'file' });
    assert.equal((await resolveComponentSource({ file: '/src/App.tsx', line: 10, endLine: 29 }, 'http://localhost:5173')).endLine, 29);
    assert.equal((await resolveComponentSource({ file: '/src/App.tsx', line: 10, endLine: 9 }, 'http://localhost:5173')).endLine, undefined);
    console.log('component source map tests passed');
  } finally { global.fetch = originalFetch; }
})().catch((error) => { console.error(error); process.exitCode = 1; });
