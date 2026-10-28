import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';

const MAX_RESOURCE = 8 * 1024 * 1024;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 32;
const CACHE_IDLE_TIME = 5 * 60 * 1000;
const cache = new Map();
const pending = new Map();
let cacheBytes = 0, expiryTimer = null;

function removeCached(url) {
  const entry = cache.get(url);
  if (!entry) return;
  cacheBytes -= entry.bytes;
  cache.delete(url);
}

function expireCache() {
  const now = Date.now();
  for (const [url, entry] of cache) {
    if (entry.usedAt + CACHE_IDLE_TIME > now) break;
    removeCached(url);
  }
}

function scheduleExpiry() {
  clearTimeout(expiryTimer); expiryTimer = null;
  const first = cache.values().next().value;
  if (first) {
    expiryTimer = setTimeout(() => { expireCache(); scheduleExpiry(); }, Math.max(1, first.usedAt + CACHE_IDLE_TIME - Date.now()));
    expiryTimer.unref?.();
  }
}

function rememberResource(url, text) {
  // 按每个 UTF-16 字符两个字节估算保留的文本大小，同时限制条目数。
  const bytes = text.length * 2;
  if (bytes > MAX_CACHE_BYTES) return;
  expireCache();
  removeCached(url);
  while (cache.size && (cacheBytes + bytes > MAX_CACHE_BYTES || cache.size >= MAX_CACHE_ENTRIES)) removeCached(cache.keys().next().value);
  cache.set(url, { text, bytes, usedAt: Date.now() });
  cacheBytes += bytes;
  scheduleExpiry();
}

export function parseStack(stack) {
  const frames = [];
  for (const line of String(stack || '').split('\n').slice(0, 60)) {
    const match = line.match(/((?:https?:\/\/|file:\/\/|webpack(?:-internal)?:\/\/|\/)[^\s)]+):(\d+):(\d+)\)?\s*$/);
    if (!match || /node_modules|react(?:-dom)?[._/-]|<anonymous>|__vite|next\/dist/.test(match[1])) continue;
    frames.push({ file: match[1], line: Number(match[2]), column: Number(match[3]), kind: 'generated' });
  }
  return frames;
}

function allowedResource(value, origin) {
  try { const url = new URL(value, origin); return ['http:', 'https:'].includes(url.protocol) && url.origin === origin ? url.href : ''; }
  catch (_) { return ''; }
}

async function readResource(value, origin) {
  const url = allowedResource(value, origin);
  if (!url) throw new Error('源码映射地址与当前开发页面不一致');
  expireCache();
  const cached = cache.get(url);
  if (cached) {
    cache.delete(url); cached.usedAt = Date.now(); cache.set(url, cached);
    scheduleExpiry();
    return cached.text;
  }
  if (pending.has(url)) return pending.get(url).promise;
  const request = { controller: new AbortController() };
  pending.set(url, request);
  request.promise = (async () => {
    const timer = setTimeout(() => request.controller.abort(), 5000);
    try {
      const response = await fetch(url, { credentials: 'omit', redirect: 'error', signal: request.controller.signal });
      if (!response.ok) throw new Error(`源码读取失败（${response.status}）`);
      if (Number(response.headers.get('content-length')) > MAX_RESOURCE) throw new Error('源码映射超过读取上限');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '', size = 0;
      try {
        while (true) {
          const { value: chunk, done } = await reader.read();
          if (done) break;
          size += chunk.byteLength;
          if (size > MAX_RESOURCE) throw new Error('源码映射超过读取上限');
          result += decoder.decode(chunk, { stream: true });
        }
        result += decoder.decode();
        // 清理或刷新期间结束的旧请求直接返回，缓存交给之后的新请求维护。
        if (pending.get(url) === request) rememberResource(url, result);
        return result;
      } finally { await reader.cancel().catch(() => {}); }
    } catch (error) {
      request.controller.abort();
      throw error;
    } finally {
      clearTimeout(timer);
      if (pending.get(url) === request) pending.delete(url);
    }
  })();
  return request.promise;
}

export function clearSourceCache(origin) {
  for (const key of cache.keys()) if (!origin || key.startsWith(origin + '/')) removeCached(key);
  for (const [key, request] of pending) if (!origin || key.startsWith(origin + '/')) {
    pending.delete(key); request.controller.abort();
  }
  scheduleExpiry();
}

async function mapFromCode(code, generatedUrl, origin) {
  const refs = [...code.matchAll(/[#@]\s*sourceMappingURL=([^\s*]+)/g)];
  const reference = refs.at(-1)?.[1];
  if (!reference) return null;
  let json, mapUrl = generatedUrl;
  if (reference.startsWith('data:')) {
    const comma = reference.indexOf(',');
    if (comma < 0) return null;
    const data = reference.slice(comma + 1);
    json = reference.slice(0, comma).includes(';base64') ? new TextDecoder().decode(Uint8Array.from(atob(data), (char) => char.charCodeAt(0))) : decodeURIComponent(data);
  } else {
    mapUrl = new URL(reference, generatedUrl).href;
    json = await readResource(mapUrl, origin);
  }
  if (json.length > MAX_RESOURCE) throw new Error('源码映射超过读取上限');
  return new TraceMap(JSON.parse(json), mapUrl);
}

function sourcePath(value, origin) {
  if (value.startsWith(origin + '/')) return new URL(value).pathname;
  return value;
}

async function resolveFrame(frame, origin, scripts) {
  if (frame.file.startsWith('file://') || frame.file.startsWith('/')) return { ...frame, precision: frame.line ? 'line' : 'file' };
  let code, generatedUrl = frame.file;
  if (/^https?:/.test(frame.file)) {
    code = await readResource(frame.file, origin);
  } else if (/^webpack(?:-internal)?:/.test(frame.file)) {
    // webpack 的 eval-source-map 将模块和映射放进字符串；只解码 JSON 字符串。
    const wanted = frame.file.replace(/^webpack(?:-internal)?:\/\/[^/]*\//, '').replace(/^\.\//, '');
    for (const script of scripts.slice(-20).reverse()) {
      if (!allowedResource(script, origin)) continue;
      const bundle = await readResource(script, origin);
      for (const match of bundle.matchAll(/\beval\(("(?:[^"\\]|\\.)*")\)/g)) {
        let moduleCode;
        try { moduleCode = JSON.parse(match[1]); } catch (_) { continue; }
        const moduleUrl = [...moduleCode.matchAll(/[#@]\s*sourceURL=([^\s]+)/g)].at(-1)?.[1];
        if (moduleUrl && moduleUrl.replace(/^webpack(?:-internal)?:\/\/[^/]*\//, '').replace(/^\.\//, '') === wanted) {
          code = moduleCode; generatedUrl = script; break;
        }
      }
      if (code) break;
    }
  }
  if (code) {
    const map = await mapFromCode(code, generatedUrl, origin);
    if (map) {
      const original = originalPositionFor(map, { line: frame.line, column: Math.max(0, (frame.column || 1) - 1) });
      if (original.source && original.line) return { file: sourcePath(original.source, origin), line: original.line, column: original.column == null ? null : original.column + 1, precision: 'line' };
    }
  }
  // 调试栈里的生成行号只有映射成功才作为源码行号使用。
  return { file: sourcePath(frame.file, origin), line: null, column: null, precision: 'file' };
}

export async function resolveComponentSource(source, origin, scripts = []) {
  if (!source) return null;
  if (source.kind !== 'stack') {
    if (!source.file) return null;
    return { file: sourcePath(source.file, origin), line: source.line || null, column: source.column || null, precision: source.line ? 'line' : 'file' };
  }
  const frames = parseStack(source.stack);
  for (const frame of frames.slice(0, 12)) {
    try {
      const resolved = await resolveFrame(frame, origin, scripts);
      // 打包后的栈帧都指向同一个 bundle，映射后才能排除 React 自身的创建栈。
      if (/(?:^|\/)node_modules\/(?:react(?:-dom)?|scheduler)\//.test(resolved.file)) continue;
      return resolved;
    }
    catch (_) { /* 下一条用户组件调用记录也可能包含有效位置。 */ }
  }
  return frames[0] ? { file: sourcePath(frames[0].file, origin), line: null, column: null, precision: 'file' } : null;
}
