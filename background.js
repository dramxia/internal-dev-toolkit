var IDTComponentSources = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/.pnpm/@jridgewell+resolve-uri@3.1.2/node_modules/@jridgewell/resolve-uri/dist/resolve-uri.umd.js
  var require_resolve_uri_umd = __commonJS({
    "node_modules/.pnpm/@jridgewell+resolve-uri@3.1.2/node_modules/@jridgewell/resolve-uri/dist/resolve-uri.umd.js"(exports, module) {
      (function(global, factory) {
        typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, global.resolveURI = factory());
      })(exports, (function() {
        "use strict";
        const schemeRegex = /^[\w+.-]+:\/\//;
        const urlRegex = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/;
        const fileRegex = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?(\/?[^#?]*)(\?[^#]*)?(#.*)?/i;
        function isAbsoluteUrl(input) {
          return schemeRegex.test(input);
        }
        function isSchemeRelativeUrl(input) {
          return input.startsWith("//");
        }
        function isAbsolutePath(input) {
          return input.startsWith("/");
        }
        function isFileUrl(input) {
          return input.startsWith("file:");
        }
        function isRelative(input) {
          return /^[.?#]/.test(input);
        }
        function parseAbsoluteUrl(input) {
          const match = urlRegex.exec(input);
          return makeUrl(match[1], match[2] || "", match[3], match[4] || "", match[5] || "/", match[6] || "", match[7] || "");
        }
        function parseFileUrl(input) {
          const match = fileRegex.exec(input);
          const path = match[2];
          return makeUrl("file:", "", match[1] || "", "", isAbsolutePath(path) ? path : "/" + path, match[3] || "", match[4] || "");
        }
        function makeUrl(scheme, user, host, port, path, query, hash) {
          return {
            scheme,
            user,
            host,
            port,
            path,
            query,
            hash,
            type: 7
          };
        }
        function parseUrl(input) {
          if (isSchemeRelativeUrl(input)) {
            const url2 = parseAbsoluteUrl("http:" + input);
            url2.scheme = "";
            url2.type = 6;
            return url2;
          }
          if (isAbsolutePath(input)) {
            const url2 = parseAbsoluteUrl("http://foo.com" + input);
            url2.scheme = "";
            url2.host = "";
            url2.type = 5;
            return url2;
          }
          if (isFileUrl(input))
            return parseFileUrl(input);
          if (isAbsoluteUrl(input))
            return parseAbsoluteUrl(input);
          const url = parseAbsoluteUrl("http://foo.com/" + input);
          url.scheme = "";
          url.host = "";
          url.type = input ? input.startsWith("?") ? 3 : input.startsWith("#") ? 2 : 4 : 1;
          return url;
        }
        function stripPathFilename(path) {
          if (path.endsWith("/.."))
            return path;
          const index = path.lastIndexOf("/");
          return path.slice(0, index + 1);
        }
        function mergePaths(url, base) {
          normalizePath(base, base.type);
          if (url.path === "/") {
            url.path = base.path;
          } else {
            url.path = stripPathFilename(base.path) + url.path;
          }
        }
        function normalizePath(url, type) {
          const rel = type <= 4;
          const pieces = url.path.split("/");
          let pointer = 1;
          let positive = 0;
          let addTrailingSlash = false;
          for (let i = 1; i < pieces.length; i++) {
            const piece = pieces[i];
            if (!piece) {
              addTrailingSlash = true;
              continue;
            }
            addTrailingSlash = false;
            if (piece === ".")
              continue;
            if (piece === "..") {
              if (positive) {
                addTrailingSlash = true;
                positive--;
                pointer--;
              } else if (rel) {
                pieces[pointer++] = piece;
              }
              continue;
            }
            pieces[pointer++] = piece;
            positive++;
          }
          let path = "";
          for (let i = 1; i < pointer; i++) {
            path += "/" + pieces[i];
          }
          if (!path || addTrailingSlash && !path.endsWith("/..")) {
            path += "/";
          }
          url.path = path;
        }
        function resolve(input, base) {
          if (!input && !base)
            return "";
          const url = parseUrl(input);
          let inputType = url.type;
          if (base && inputType !== 7) {
            const baseUrl = parseUrl(base);
            const baseType = baseUrl.type;
            switch (inputType) {
              case 1:
                url.hash = baseUrl.hash;
              // fall through
              case 2:
                url.query = baseUrl.query;
              // fall through
              case 3:
              case 4:
                mergePaths(url, baseUrl);
              // fall through
              case 5:
                url.user = baseUrl.user;
                url.host = baseUrl.host;
                url.port = baseUrl.port;
              // fall through
              case 6:
                url.scheme = baseUrl.scheme;
            }
            if (baseType > inputType)
              inputType = baseType;
          }
          normalizePath(url, inputType);
          const queryHash = url.query + url.hash;
          switch (inputType) {
            // This is impossible, because of the empty checks at the start of the function.
            // case UrlType.Empty:
            case 2:
            case 3:
              return queryHash;
            case 4: {
              const path = url.path.slice(1);
              if (!path)
                return queryHash || ".";
              if (isRelative(base || input) && !isRelative(path)) {
                return "./" + path + queryHash;
              }
              return path + queryHash;
            }
            case 5:
              return url.path + queryHash;
            default:
              return url.scheme + "//" + url.user + url.host + url.port + url.path + queryHash;
          }
        }
        return resolve;
      }));
    }
  });

  // src/inspector/source-resolver.mjs
  var source_resolver_exports = {};
  __export(source_resolver_exports, {
    clearSourceCache: () => clearSourceCache,
    parseStack: () => parseStack,
    resolveComponentSource: () => resolveComponentSource
  });

  // node_modules/.pnpm/@jridgewell+sourcemap-codec@1.6.0/node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.mjs
  var comma = ",".charCodeAt(0);
  var semicolon = ";".charCodeAt(0);
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var intToChar = new Uint8Array(64);
  var charToInt = new Uint8Array(128);
  for (let i = 0; i < chars.length; i++) {
    const c = chars.charCodeAt(i);
    intToChar[i] = c;
    charToInt[c] = i;
  }
  function decodeInteger(reader) {
    let value = 0;
    let shift = 0;
    let integer = 0;
    do {
      const c = reader.next();
      integer = charToInt[c];
      value |= (integer & 31) << shift;
      shift += 5;
    } while (integer & 32);
    return value;
  }
  function decodeSign(num) {
    return num & 1 ? -2147483648 | -(num >>> 1) : num >>> 1;
  }
  function hasMoreVlq(reader, max) {
    if (reader.pos >= max) return false;
    return reader.peek() !== comma;
  }
  var bufLength = 1024 * 16;
  var StringReader = class {
    constructor(buffer) {
      this.pos = 0;
      this.buffer = buffer;
    }
    next() {
      return this.buffer.charCodeAt(this.pos++);
    }
    peek() {
      return this.buffer.charCodeAt(this.pos);
    }
    indexOf(char) {
      const { buffer, pos } = this;
      const idx = buffer.indexOf(char, pos);
      return idx === -1 ? buffer.length : idx;
    }
  };
  function decode(mappings) {
    const { length } = mappings;
    const reader = new StringReader(mappings);
    const decoded = [];
    let genColumn = 0;
    let sourcesIndex = 0;
    let sourceLine = 0;
    let sourceColumn = 0;
    let namesIndex = 0;
    do {
      const semi = reader.indexOf(";");
      const line = [];
      let sorted = true;
      let lastCol = 0;
      genColumn = 0;
      while (reader.pos < semi) {
        let seg;
        genColumn += decodeSign(decodeInteger(reader));
        if (genColumn < lastCol) sorted = false;
        lastCol = genColumn;
        if (hasMoreVlq(reader, semi)) {
          sourcesIndex += decodeSign(decodeInteger(reader));
          sourceLine += decodeSign(decodeInteger(reader));
          sourceColumn += decodeSign(decodeInteger(reader));
          if (hasMoreVlq(reader, semi)) {
            namesIndex += decodeSign(decodeInteger(reader));
            seg = [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex];
          } else {
            seg = [genColumn, sourcesIndex, sourceLine, sourceColumn];
          }
        } else {
          seg = [genColumn];
        }
        line.push(seg);
        reader.pos++;
      }
      if (!sorted) sort(line);
      decoded.push(line);
      reader.pos = semi + 1;
    } while (reader.pos <= length);
    return decoded;
  }
  function sort(line) {
    line.sort(sortComparator);
  }
  function sortComparator(a, b) {
    return a[0] - b[0];
  }

  // node_modules/.pnpm/@jridgewell+trace-mapping@0.3.31/node_modules/@jridgewell/trace-mapping/dist/trace-mapping.mjs
  var import_resolve_uri = __toESM(require_resolve_uri_umd(), 1);
  function stripFilename(path) {
    if (!path) return "";
    const index = path.lastIndexOf("/");
    return path.slice(0, index + 1);
  }
  function resolver(mapUrl, sourceRoot) {
    const from = stripFilename(mapUrl);
    const prefix = sourceRoot ? sourceRoot + "/" : "";
    return (source) => (0, import_resolve_uri.default)(prefix + (source || ""), from);
  }
  var COLUMN = 0;
  var SOURCES_INDEX = 1;
  var SOURCE_LINE = 2;
  var SOURCE_COLUMN = 3;
  var NAMES_INDEX = 4;
  function maybeSort(mappings, owned) {
    const unsortedIndex = nextUnsortedSegmentLine(mappings, 0);
    if (unsortedIndex === mappings.length) return mappings;
    if (!owned) mappings = mappings.slice();
    for (let i = unsortedIndex; i < mappings.length; i = nextUnsortedSegmentLine(mappings, i + 1)) {
      mappings[i] = sortSegments(mappings[i], owned);
    }
    return mappings;
  }
  function nextUnsortedSegmentLine(mappings, start) {
    for (let i = start; i < mappings.length; i++) {
      if (!isSorted(mappings[i])) return i;
    }
    return mappings.length;
  }
  function isSorted(line) {
    for (let j = 1; j < line.length; j++) {
      if (line[j][COLUMN] < line[j - 1][COLUMN]) {
        return false;
      }
    }
    return true;
  }
  function sortSegments(line, owned) {
    if (!owned) line = line.slice();
    return line.sort(sortComparator2);
  }
  function sortComparator2(a, b) {
    return a[COLUMN] - b[COLUMN];
  }
  var found = false;
  function binarySearch(haystack, needle, low, high) {
    while (low <= high) {
      const mid = low + (high - low >> 1);
      const cmp = haystack[mid][COLUMN] - needle;
      if (cmp === 0) {
        found = true;
        return mid;
      }
      if (cmp < 0) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    found = false;
    return low - 1;
  }
  function upperBound(haystack, needle, index) {
    for (let i = index + 1; i < haystack.length; index = i++) {
      if (haystack[i][COLUMN] !== needle) break;
    }
    return index;
  }
  function lowerBound(haystack, needle, index) {
    for (let i = index - 1; i >= 0; index = i--) {
      if (haystack[i][COLUMN] !== needle) break;
    }
    return index;
  }
  function memoizedState() {
    return {
      lastKey: -1,
      lastNeedle: -1,
      lastIndex: -1
    };
  }
  function memoizedBinarySearch(haystack, needle, state, key) {
    const { lastKey, lastNeedle, lastIndex } = state;
    let low = 0;
    let high = haystack.length - 1;
    if (key === lastKey) {
      if (needle === lastNeedle) {
        found = lastIndex !== -1 && haystack[lastIndex][COLUMN] === needle;
        return lastIndex;
      }
      if (needle >= lastNeedle) {
        low = lastIndex === -1 ? 0 : lastIndex;
      } else {
        high = lastIndex;
      }
    }
    state.lastKey = key;
    state.lastNeedle = needle;
    return state.lastIndex = binarySearch(haystack, needle, low, high);
  }
  function parse(map) {
    return typeof map === "string" ? JSON.parse(map) : map;
  }
  var LINE_GTR_ZERO = "`line` must be greater than 0 (lines start at line 1)";
  var COL_GTR_EQ_ZERO = "`column` must be greater than or equal to 0 (columns start at column 0)";
  var LEAST_UPPER_BOUND = -1;
  var GREATEST_LOWER_BOUND = 1;
  var TraceMap = class {
    constructor(map, mapUrl) {
      const isString = typeof map === "string";
      if (!isString && map._decodedMemo) return map;
      const parsed = parse(map);
      const { version, file, names, sourceRoot, sources, sourcesContent } = parsed;
      this.version = version;
      this.file = file;
      this.names = names || [];
      this.sourceRoot = sourceRoot;
      this.sources = sources;
      this.sourcesContent = sourcesContent;
      this.ignoreList = parsed.ignoreList || parsed.x_google_ignoreList || void 0;
      const resolve = resolver(mapUrl, sourceRoot);
      this.resolvedSources = sources.map(resolve);
      const { mappings } = parsed;
      if (typeof mappings === "string") {
        this._encoded = mappings;
        this._decoded = void 0;
      } else if (Array.isArray(mappings)) {
        this._encoded = void 0;
        this._decoded = maybeSort(mappings, isString);
      } else if (parsed.sections) {
        throw new Error(`TraceMap passed sectioned source map, please use FlattenMap export instead`);
      } else {
        throw new Error(`invalid source map: ${JSON.stringify(parsed)}`);
      }
      this._decodedMemo = memoizedState();
      this._bySources = void 0;
      this._bySourceMemos = void 0;
    }
  };
  function cast(map) {
    return map;
  }
  function decodedMappings(map) {
    var _a;
    return (_a = cast(map))._decoded || (_a._decoded = decode(cast(map)._encoded));
  }
  function originalPositionFor(map, needle) {
    let { line, column, bias } = needle;
    line--;
    if (line < 0) throw new Error(LINE_GTR_ZERO);
    if (column < 0) throw new Error(COL_GTR_EQ_ZERO);
    const decoded = decodedMappings(map);
    if (line >= decoded.length) return OMapping(null, null, null, null);
    const segments = decoded[line];
    const index = traceSegmentInternal(
      segments,
      cast(map)._decodedMemo,
      line,
      column,
      bias || GREATEST_LOWER_BOUND
    );
    if (index === -1) return OMapping(null, null, null, null);
    const segment = segments[index];
    if (segment.length === 1) return OMapping(null, null, null, null);
    const { names, resolvedSources } = map;
    return OMapping(
      resolvedSources[segment[SOURCES_INDEX]],
      segment[SOURCE_LINE] + 1,
      segment[SOURCE_COLUMN],
      segment.length === 5 ? names[segment[NAMES_INDEX]] : null
    );
  }
  function OMapping(source, line, column, name) {
    return { source, line, column, name };
  }
  function traceSegmentInternal(segments, memo, line, column, bias) {
    let index = memoizedBinarySearch(segments, column, memo, line);
    if (found) {
      index = (bias === LEAST_UPPER_BOUND ? upperBound : lowerBound)(segments, column, index);
    } else if (bias === LEAST_UPPER_BOUND) index++;
    if (index === -1 || index === segments.length) return -1;
    return index;
  }

  // src/inspector/source-resolver.mjs
  var MAX_RESOURCE = 8 * 1024 * 1024;
  var MAX_CACHE_BYTES = 16 * 1024 * 1024;
  var MAX_CACHE_ENTRIES = 32;
  var CACHE_IDLE_TIME = 5 * 60 * 1e3;
  var cache = /* @__PURE__ */ new Map();
  var pending = /* @__PURE__ */ new Map();
  var cacheBytes = 0;
  var expiryTimer = null;
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
    clearTimeout(expiryTimer);
    expiryTimer = null;
    const first = cache.values().next().value;
    if (first) {
      expiryTimer = setTimeout(() => {
        expireCache();
        scheduleExpiry();
      }, Math.max(1, first.usedAt + CACHE_IDLE_TIME - Date.now()));
      expiryTimer.unref?.();
    }
  }
  function rememberResource(url, text) {
    const bytes = text.length * 2;
    if (bytes > MAX_CACHE_BYTES) return;
    expireCache();
    removeCached(url);
    while (cache.size && (cacheBytes + bytes > MAX_CACHE_BYTES || cache.size >= MAX_CACHE_ENTRIES)) removeCached(cache.keys().next().value);
    cache.set(url, { text, bytes, usedAt: Date.now() });
    cacheBytes += bytes;
    scheduleExpiry();
  }
  function parseStack(stack) {
    const frames = [];
    for (const line of String(stack || "").split("\n").slice(0, 60)) {
      const match = line.match(/((?:https?:\/\/|file:\/\/|webpack(?:-internal)?:\/\/|\/)[^\s)]+):(\d+):(\d+)\)?\s*$/);
      if (!match || /node_modules|react(?:-dom)?[._/-]|<anonymous>|__vite|next\/dist/.test(match[1])) continue;
      frames.push({ file: match[1], line: Number(match[2]), column: Number(match[3]), kind: "generated" });
    }
    return frames;
  }
  function allowedResource(value, origin) {
    try {
      const url = new URL(value, origin);
      return ["http:", "https:"].includes(url.protocol) && url.origin === origin ? url.href : "";
    } catch (_) {
      return "";
    }
  }
  async function readResource(value, origin) {
    const url = allowedResource(value, origin);
    if (!url) throw new Error("\u6E90\u7801\u6620\u5C04\u5730\u5740\u4E0E\u5F53\u524D\u5F00\u53D1\u9875\u9762\u4E0D\u4E00\u81F4");
    expireCache();
    const cached = cache.get(url);
    if (cached) {
      cache.delete(url);
      cached.usedAt = Date.now();
      cache.set(url, cached);
      scheduleExpiry();
      return cached.text;
    }
    if (pending.has(url)) return pending.get(url).promise;
    const request = { controller: new AbortController() };
    pending.set(url, request);
    request.promise = (async () => {
      const timer = setTimeout(() => request.controller.abort(), 5e3);
      try {
        const response = await fetch(url, { credentials: "omit", redirect: "error", signal: request.controller.signal });
        if (!response.ok) throw new Error(`\u6E90\u7801\u8BFB\u53D6\u5931\u8D25\uFF08${response.status}\uFF09`);
        if (Number(response.headers.get("content-length")) > MAX_RESOURCE) throw new Error("\u6E90\u7801\u6620\u5C04\u8D85\u8FC7\u8BFB\u53D6\u4E0A\u9650");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = "", size = 0;
        try {
          while (true) {
            const { value: chunk, done } = await reader.read();
            if (done) break;
            size += chunk.byteLength;
            if (size > MAX_RESOURCE) throw new Error("\u6E90\u7801\u6620\u5C04\u8D85\u8FC7\u8BFB\u53D6\u4E0A\u9650");
            result += decoder.decode(chunk, { stream: true });
          }
          result += decoder.decode();
          if (pending.get(url) === request) rememberResource(url, result);
          return result;
        } finally {
          await reader.cancel().catch(() => {
          });
        }
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
  function clearSourceCache(origin) {
    for (const key of cache.keys()) if (!origin || key.startsWith(origin + "/")) removeCached(key);
    for (const [key, request] of pending) if (!origin || key.startsWith(origin + "/")) {
      pending.delete(key);
      request.controller.abort();
    }
    scheduleExpiry();
  }
  async function mapFromCode(code, generatedUrl, origin) {
    const refs = [...code.matchAll(/[#@]\s*sourceMappingURL=([^\s*]+)/g)];
    const reference = refs.at(-1)?.[1];
    if (!reference) return null;
    let json, mapUrl = generatedUrl;
    if (reference.startsWith("data:")) {
      const comma2 = reference.indexOf(",");
      if (comma2 < 0) return null;
      const data = reference.slice(comma2 + 1);
      json = reference.slice(0, comma2).includes(";base64") ? new TextDecoder().decode(Uint8Array.from(atob(data), (char) => char.charCodeAt(0))) : decodeURIComponent(data);
    } else {
      mapUrl = new URL(reference, generatedUrl).href;
      json = await readResource(mapUrl, origin);
    }
    if (json.length > MAX_RESOURCE) throw new Error("\u6E90\u7801\u6620\u5C04\u8D85\u8FC7\u8BFB\u53D6\u4E0A\u9650");
    return new TraceMap(JSON.parse(json), mapUrl);
  }
  function sourcePath(value, origin) {
    if (value.startsWith(origin + "/")) return new URL(value).pathname;
    return value;
  }
  async function resolveFrame(frame, origin, scripts) {
    if (frame.file.startsWith("file://") || frame.file.startsWith("/")) return { ...frame, precision: frame.line ? "line" : "file" };
    let code, generatedUrl = frame.file;
    if (/^https?:/.test(frame.file)) {
      code = await readResource(frame.file, origin);
    } else if (/^webpack(?:-internal)?:/.test(frame.file)) {
      const wanted = frame.file.replace(/^webpack(?:-internal)?:\/\/[^/]*\//, "").replace(/^\.\//, "");
      for (const script of scripts.slice(-20).reverse()) {
        if (!allowedResource(script, origin)) continue;
        const bundle = await readResource(script, origin);
        for (const match of bundle.matchAll(/\beval\(("(?:[^"\\]|\\.)*")\)/g)) {
          let moduleCode;
          try {
            moduleCode = JSON.parse(match[1]);
          } catch (_) {
            continue;
          }
          const moduleUrl = [...moduleCode.matchAll(/[#@]\s*sourceURL=([^\s]+)/g)].at(-1)?.[1];
          if (moduleUrl && moduleUrl.replace(/^webpack(?:-internal)?:\/\/[^/]*\//, "").replace(/^\.\//, "") === wanted) {
            code = moduleCode;
            generatedUrl = script;
            break;
          }
        }
        if (code) break;
      }
    }
    if (code) {
      const map = await mapFromCode(code, generatedUrl, origin);
      if (map) {
        const original = originalPositionFor(map, { line: frame.line, column: Math.max(0, (frame.column || 1) - 1) });
        if (original.source && original.line) return { file: sourcePath(original.source, origin), line: original.line, column: original.column == null ? null : original.column + 1, precision: "line" };
      }
    }
    return { file: sourcePath(frame.file, origin), line: null, column: null, precision: "file" };
  }
  async function resolveComponentSource(source, origin, scripts = []) {
    if (!source) return null;
    if (source.kind !== "stack") {
      if (!source.file) return null;
      return { file: sourcePath(source.file, origin), line: source.line || null, column: source.column || null, precision: source.line ? "line" : "file" };
    }
    const frames = parseStack(source.stack);
    for (const frame of frames.slice(0, 12)) {
      try {
        const resolved = await resolveFrame(frame, origin, scripts);
        if (/(?:^|\/)node_modules\/(?:react(?:-dom)?|scheduler)\//.test(resolved.file)) continue;
        return resolved;
      } catch (_) {
      }
    }
    return frames[0] ? { file: sourcePath(frames[0].file, origin), line: null, column: null, precision: "file" } : null;
  }
  return __toCommonJS(source_resolver_exports);
})();

/* Generated by scripts/build.js. Source: src/background/*.js */

/* ===== src/common/component-settings.js ===== */
/* 组件定位的地址规则、快捷键与设置；扩展各上下文共用。 */
(() => {
  'use strict';
  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});
  const SETTINGS_KEY = 'componentInspectorSettings';
  const TAB_PREFIX = 'componentInspectorTab:';
  const ORIGIN_PREFIX = 'componentInspectorEnabled:';
  const MAX_ORIGINS = 50;
  const DEFAULT_SHORTCUT = Object.freeze({ meta: true, ctrl: false, alt: false, shift: false, code: '' });

  function originOf(value) {
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.origin : '';
    } catch (_) { return ''; }
  }

  function isAllowed(value, extraOrigins = []) {
    const origin = originOf(value);
    if (!origin) return false;
    const hostname = new URL(origin).hostname;
    return ['localhost', '127.0.0.1', '[::1]'].includes(hostname) || extraOrigins.includes(origin);
  }

  function normalizeShortcut(value) {
    const input = value || DEFAULT_SHORTCUT;
    const code = input.code || '';
    if (typeof code !== 'string' || (code && !/^(Key[A-Z]|Digit[0-9]|F([1-9]|1[0-2]))$/.test(code))) {
      throw new Error('快捷键可搭配字母、数字或 F1 至 F12，也可单独使用修饰键');
    }
    const result = { meta: !!input.meta, ctrl: !!input.ctrl, alt: !!input.alt, shift: !!input.shift, code };
    if (!result.meta && !result.ctrl && !result.alt) throw new Error('快捷键请至少包含 Command、Control 或 Option 中的一个');
    return result;
  }

  function shortcutLabel(value) {
    const shortcut = normalizeShortcut(value);
    return [shortcut.meta && '⌘ Command', shortcut.ctrl && '⌃ Control', shortcut.alt && '⌥ Option', shortcut.shift && '⇧ Shift', shortcut.code.replace(/^(Key|Digit)/, '')].filter(Boolean).join(' + ');
  }

  function matchesShortcut(event, shortcut, pressed = new Set()) {
    return !!event.metaKey === shortcut.meta && !!event.ctrlKey === shortcut.ctrl &&
      !!event.altKey === shortcut.alt && !!event.shiftKey === shortcut.shift &&
      (!shortcut.code || pressed.has(shortcut.code) || event.code === shortcut.code);
  }

  function normalizeSettings(value = {}) {
    const origins = [...new Set((Array.isArray(value.origins) ? value.origins : []).map(originOf).filter(Boolean))];
    if (origins.length > MAX_ORIGINS) throw new Error(`最多保存 ${MAX_ORIGINS} 个开发地址，请先移除旧地址`);
    return { origins, openShortcut: normalizeShortcut(value.openShortcut), menuShortcut: normalizeShortcut(value.menuShortcut) };
  }

  async function getSettings() {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    try { return normalizeSettings(data[SETTINGS_KEY]); } catch (_) { return normalizeSettings(); }
  }

  ns.componentSettings = { SETTINGS_KEY, TAB_PREFIX, ORIGIN_PREFIX, MAX_ORIGINS, DEFAULT_SHORTCUT, originOf, isAllowed, normalizeShortcut, shortcutLabel, matchesShortcut, normalizeSettings, getSettings };
  if (typeof module !== 'undefined' && module.exports) module.exports = ns.componentSettings;
})();


/* ===== src/common/component-runtime.js ===== */
/* 辅助程序更新只读取当前扩展自带的固定文件。内容摘要随文件变化，无需手工调整版本号。 */
(() => {
  'use strict';
  const files = ['host.cjs', 'lib.cjs', 'installation.cjs'];
  let cached;
  async function loadBundle() {
    if (!cached) {
      cached = (async () => {
        const entries = await Promise.all(files.map(async (file) => {
          const response = await fetch(chrome.runtime.getURL(`native-host/${file}`), { cache: 'no-store' });
          if (!response.ok) throw new Error('辅助程序更新文件读取失败，请重新加载扩展');
          return [file, await response.text()];
        }));
        const bytes = new TextEncoder().encode(JSON.stringify(entries));
        if (bytes.length > 512 * 1024) throw new Error('辅助程序更新文件过大');
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return { revision: [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join(''), files: Object.fromEntries(entries) };
      })();
      cached.catch(() => { cached = null; });
    }
    return cached;
  }
  (globalThis.InternalDevToolkit ||= {}).componentRuntime = { loadBundle };
})();


/* ===== src/inspector/page-probe.js ===== */
/* React 的 Fiber 查找、owner 追溯与 _debugSource 读取参考 click-to-react-component。
 * Copyright (c) 2022 Eric Clemmons, MIT；见 THIRD_PARTY_NOTICES.md。
 * 该函数由 executeScript 序列化到 MAIN world。所有辅助函数必须位于函数内部。
 * 只返回数据快照，不安装 hook，不保存框架对象或修改业务状态。
 */
function inspectComponentPage(options) {
  'use strict';
  options = options || {};
  if (options.origin && location.origin !== options.origin) return { error: '页面地址已变化' };
  const limit = 32;

  function parentElement(element) {
    return element.parentElement || element.getRootNode?.().host || null;
  }

  function reactFiber(element) {
    const renderers = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers;
    if (renderers?.values) {
      for (const renderer of renderers.values()) {
        try {
          const fiber = renderer.findFiberByHostInstance?.(element);
          if (fiber) return fiber;
        } catch (_) { /* React 正在提交时节点可能已卸载。 */ }
      }
    }
    for (const key of Object.keys(element)) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) return element[key];
    }
    return element._reactRootContainer?._internalRoot?.current?.child || null;
  }

  function snapshot(value) {
    const seen = new WeakSet();
    let remaining = 16000;
    let entries = 0;
    function visit(item, depth) {
      if (remaining <= 0 || entries++ > 250) return '[内容已截断]';
      if (item === null || typeof item === 'boolean' || typeof item === 'number') return item;
      if (typeof item === 'string') { const text = item.slice(0, Math.min(remaining, 2000)); remaining -= text.length; return text + (text.length < item.length ? '…' : ''); }
      if (typeof item === 'undefined') return '[undefined]';
      if (typeof item === 'bigint') return `${item}n`;
      if (typeof item === 'symbol') return String(item);
      if (typeof item === 'function') return `[函数 ${item.name || '匿名'}]`;
      if (item instanceof Element) return `<${item.tagName.toLowerCase()}>`;
      if (depth > 4) return Array.isArray(item) ? `[数组 ${item.length} 项]` : '[对象]';
      if (seen.has(item)) return '[循环引用]';
      seen.add(item);
      const result = Array.isArray(item) ? [] : Object.create(null);
      try {
        for (const key of Object.keys(item).slice(0, 50)) {
          if (remaining <= 0) break;
          const descriptor = Object.getOwnPropertyDescriptor(item, key);
          result[key] = descriptor && 'value' in descriptor ? visit(descriptor.value, depth + 1) : '[访问器]';
        }
      } catch (_) { return '[暂时无法读取]'; }
      return result;
    }
    return visit(value, 0);
  }

  function typeName(type) {
    if (typeof type === 'string') return type;
    return type?.displayName || type?.name || type?.render?.displayName || type?.render?.name || type?.type?.displayName || type?.type?.name || '匿名组件';
  }

  function sourceFromFiber(fiber) {
    const source = fiber._debugSource;
    if (source?.fileName) return { file: source.fileName, line: source.lineNumber || null, column: source.columnNumber || null, kind: 'source' };
    const stack = fiber._debugStack?.stack;
    return stack ? { stack: String(stack).slice(0, 24000), kind: 'stack' } : null;
  }

  function reactChain(fiber, includeProps) {
    const visited = new Set();
    const result = [];
    while (fiber && result.length < limit && !visited.has(fiber)) {
      visited.add(fiber);
      const type = fiber.type || fiber.elementType;
      if (type && typeof type !== 'symbol') {
        result.push({ framework: 'React', name: typeName(type), source: sourceFromFiber(fiber), props: includeProps ? snapshot(fiber.memoizedProps || fiber.pendingProps || {}) : undefined });
      }
      fiber = fiber._debugOwner || fiber.return;
    }
    return result;
  }

  function vueChain(instance, version, includeProps) {
    const result = [];
    const visited = new Set();
    while (instance && result.length < limit && !visited.has(instance)) {
      visited.add(instance);
      const type = version === 2 ? instance.$options : instance.type;
      const file = type?.__file;
      let props;
      if (includeProps) {
        if (version === 2) {
          // Vue 2 的已声明 props 使用框架响应式 getter，需要先取出当前值。
          const values = Object.create(null);
          for (const key of Object.keys(type?.props || instance.$props || {}).slice(0, 50)) {
            try { values[key] = instance.$props?.[key]; } catch (_) { values[key] = '[暂时无法读取]'; }
          }
          props = snapshot(values);
        } else props = snapshot(instance.props || {});
      }
      result.push({ framework: `Vue ${version}`, name: type?.name || type?.__name || type?._componentTag || file?.split('/').pop()?.replace(/\.vue$/, '') || '匿名组件', source: file ? { file, line: null, column: null, kind: 'source' } : null, props });
      instance = version === 2 ? instance.$parent : instance.parent;
    }
    return result;
  }

  function find(element, includeProps) {
    const target = element;
    for (let depth = 0; element && depth < 80; depth++, element = parentElement(element)) {
      const fiber = reactFiber(element);
      if (fiber) return reactChain(fiber, includeProps);
      const vue3 = element.__vueParentComponent || element.__vue_app__?._instance;
      if (vue3) return vueChain(vue3, 3, includeProps);
      let vue2 = element.__vue__;
      if (vue2) {
        const visited = new Set();
        while (!visited.has(vue2)) {
          visited.add(vue2);
          const child = vue2.$children?.find((item) => item.$el?.contains?.(target));
          if (!child) break;
          vue2 = child;
        }
        return vueChain(vue2, 2, includeProps);
      }
    }
    return [];
  }

  const scripts = () => [...new Set([...Array.from(document.scripts, (script) => script.src), ...performance.getEntriesByType('resource').filter((entry) => entry.initiatorType === 'script').map((entry) => entry.name)])].filter(Boolean).slice(-40);
  if (options.mode === 'detect') {
    const frameworks = new Set();
    const hints = new Set();
    const sources = new Map();
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);
    let element = walker.currentNode;
    for (let count = 0; element && count < 3000; count++, element = walker.nextNode()) {
      const chain = find(element, false);
      for (const item of chain) {
        frameworks.add(item.framework);
        if (item.source?.file) hints.add(item.source.file);
        if (item.source && sources.size < 12) sources.set(JSON.stringify(item.source), item.source);
      }
      if (hints.size >= 16 || sources.size >= 12) break;
    }
    return { frameworks: [...frameworks], hints: [...hints].slice(0, 32), sources: [...sources.values()], scripts: scripts() };
  }

  let element;
  if (/^data-idt-query-[a-f0-9]{32}$/.test(options.marker || '')) {
    const roots = [document];
    while (roots.length && !element) {
      const root = roots.shift();
      element = root.querySelector(`[${options.marker}]`);
      if (!element) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let item;
        for (let count = 0; (item = walker.nextNode()) && count < 5000; count++) if (item.shadowRoot) roots.push(item.shadowRoot);
      }
    }
    element?.removeAttribute(options.marker);
    if (!element) return { components: [] };
  } else element = document.elementFromPoint(options.x, options.y);
  const visited = new Set();
  while (!options.marker && element?.shadowRoot && !visited.has(element)) {
    visited.add(element);
    const inner = element.shadowRoot.elementFromPoint?.(options.x, options.y);
    if (!inner || inner === element) break;
    element = inner;
  }
  if (!element) return { components: [] };
  const components = find(element, options.props !== false);
  // 已存在的 Vue Inspector 标记可直接提供模板行列，无需改造业务项目。
  const marker = element.closest?.('[data-v-inspector]')?.getAttribute('data-v-inspector');
  const match = marker?.match(/^(.*):(\d+):(\d+)$/);
  if (match && components[0]?.framework.startsWith('Vue')) {
    components[0].source = { file: match[1], line: Number(match[2]), column: Number(match[3]), kind: 'source' };
  }
  const rect = element.getBoundingClientRect();
  return { components, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, scripts: scripts() };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { inspectComponentPage };


/* ===== src/common/projects.js ===== */
/* ===== src/common/projects.js ===== */
// 项目注册表 - 所有后台项目的配置集中在此
// 新增项目时在 PROJECTS 数组中追加配置对象，然后 npm run build

const PROJECTS = [
  {
    id: 'gpt-admin-pre',
    name: 'AI平台',
    baseUrl: 'https://gpt-admin-pre.hwzxs.com',
    authPath: '/huayun-ai/admin/auth',
    tenantApiPaths: {
      tenantPage: '/huayun-ai/admin/tenant/page',
      deptList: '/huayun-ai/admin/dept/list',
      userPage: '/huayun-ai/admin/tenant/user/page',
      accountPage: '/huayun-ai/admin/tenant/user/account/page',
      virtualLogin: '/huayun-ai/admin/tenant/user/virtualLogin',
    },
    cookieKeys: ['HWWAFSESID', 'HWWAFSESTIME'],
    enabledFeatures: ['adminPanel', 'quickLogin'],
    hosts: ['gpt-admin-pre.hwzxs.com', '*.hwzxs.com'],
  },
  {
    id: 'higher-education',
    name: '高校',
    baseUrl: '',
    authPath: '',
    tenantApiPaths: {},
    cookieKeys: [],
    enabledFeatures: ['otherLogin'],
    hosts: [],
  },
  {
    id: 'app',
    name: 'APP',
    baseUrl: '',
    authPath: '',
    tenantApiPaths: {},
    // APP 端登录接口：站点地址由用户填写，路径在此集中配置
    appLoginApiPaths: {
      educationList: '/huayun-ai/client/tenant/educationList',
      getCaptcha: '/huayun-ai/app/auth/getCaptcha',
      studentLogin: '/huayun-ai/app/auth/studentLogin',
    },
    cookieKeys: [],
    enabledFeatures: ['appLogin'],
    hosts: [],
  },
];

const DEFAULT_PROJECT_ID = 'gpt-admin-pre';

function getById(id) {
  return PROJECTS.find(p => p.id === id);
}

// 浏览器环境暴露到全局命名空间
if (typeof globalThis !== 'undefined') {
  globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {};
  globalThis.InternalDevToolkit.projects = {
    PROJECTS,
    DEFAULT_PROJECT_ID,
    getById,
  };
}

// Node.js 环境（scripts/build.js）导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PROJECTS, DEFAULT_PROJECT_ID, getById };
}


/* ===== src/common/current-project.js ===== */
/* ===== src/common/current-project.js ===== */
// 当前激活项目管理：chrome.storage 读写 + 缓存 + 数据迁移

(function() {
  const ns = globalThis.InternalDevToolkit;
  const STORAGE_KEY = 'currentProjectId';
  let cachedProjectId = null;
  let cachedProject = null;

  async function getCurrentProjectId() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || ns.projects.DEFAULT_PROJECT_ID;
  }

  async function setCurrentProjectId(id) {
    const project = ns.projects.getById(id);
    if (!project) throw new Error(`未知项目: ${id}`);
    await chrome.storage.local.set({ [STORAGE_KEY]: id });
    cachedProjectId = id;
    cachedProject = project;
    return cachedProject;
  }

  async function switchProjectContext(id) {
    const project = await setCurrentProjectId(id);
    if (ns.customDomain) await ns.customDomain.loadCachedOverride();
    return project;
  }

  async function loadCurrentProject() {
    cachedProjectId = await getCurrentProjectId();
    cachedProject = ns.projects.getById(cachedProjectId);
    // 同步加载自定义域名覆盖到内存缓存，供 getBaseUrl() 同步读取
    if (ns.customDomain) {
      await ns.customDomain.loadCachedOverride();
    }
    return cachedProject;
  }

  function getCachedProjectId() {
    return cachedProjectId || ns.projects.DEFAULT_PROJECT_ID;
  }

  function getProject() {
    return cachedProject || ns.projects.getById(ns.projects.DEFAULT_PROJECT_ID);
  }

  // 优先返回自定义域名覆盖，否则回落到项目配置的 baseUrl
  function getBaseUrl() {
    if (ns.customDomain) {
      const override = ns.customDomain.getCachedOverride();
      if (override) return override;
    }
    return getProject().baseUrl;
  }

  // 跨上下文刷新内存缓存（popup 保存后通知 background 调用）
  async function refreshBaseUrlCache() {
    if (ns.customDomain) {
      return ns.customDomain.loadCachedOverride();
    }
    return '';
  }

  function getAuthPath() {
    return getProject().authPath;
  }

  function getTenantApiPaths() {
    return getProject().tenantApiPaths;
  }

  function getCookieKeys() {
    return getProject().cookieKeys;
  }

  function getEnabledFeatures() {
    return getProject().enabledFeatures;
  }

  function getName() {
    return getProject().name;
  }

  function getHosts() {
    return getProject().hosts;
  }

  // 数据迁移：将旧版本无项目前缀的 key 迁移到默认项目命名空间
  async function migrateOldStorageKeys() {
    const OLD_KEYS = ['adminToken', 'adminCredentials', 'quickLoginRecent'];
    const result = await chrome.storage.local.get(OLD_KEYS);

    if (!result.adminToken && !result.adminCredentials && !result.quickLoginRecent) {
      return; // 无旧数据，跳过
    }

    const defaultId = ns.projects.DEFAULT_PROJECT_ID;
    const newKeys = {};

    if (result.adminToken) {
      newKeys[`adminToken:${defaultId}`] = result.adminToken;
    }

    if (result.adminCredentials) {
      newKeys[`adminCredentials:${defaultId}`] = result.adminCredentials;
    }

    if (result.quickLoginRecent) {
      newKeys[`quickLoginRecent:${defaultId}`] = result.quickLoginRecent.map(r => ({
        ...r,
        projectId: defaultId
      }));
    }

    await chrome.storage.local.set(newKeys);
    await chrome.storage.local.remove(OLD_KEYS);
    console.log('[Migrate] Moved old storage to project:', defaultId);
  }

  ns.currentProject = {
    getCurrentProjectId,
    setCurrentProjectId,
    switchProjectContext,
    loadCurrentProject,
    getCachedProjectId,
    getProject,
    getBaseUrl,
    getAuthPath,
    getTenantApiPaths,
    getCookieKeys,
    getEnabledFeatures,
    getName,
    getHosts,
    migrateOldStorageKeys,
    refreshBaseUrlCache,
  };
})();


/* ===== src/common/credentials.js ===== */
/* 内部开发工具箱 — 后台登录凭据模块 */
/* 注意：账号密码以明文存储于 chrome.storage.local，仅供公司内部开发自用，
   请勿在公开环境或他人电脑上保存敏感凭据。 */
(() => {
  'use strict';

  const namespace = (globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {});

  const KEY_PREFIX = 'adminCredentials'; // { account: string, password: string }

  const EMPTY = Object.freeze({ account: '', password: '' });

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  function normalize(value = {}) {
    return {
      account: typeof value.account === 'string' ? value.account : '',
      password: typeof value.password === 'string' ? value.password : '',
    };
  }

  async function getStorageKey() {
    const projectId = await namespace.currentProject.getCurrentProjectId();
    return `${KEY_PREFIX}:${projectId}`;
  }

  async function getCredentials() {
    if (!hasChromeStorage()) return normalize();
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(normalize());
          return;
        }
        resolve(normalize(items[key]));
      });
    });
  }

  async function saveCredentials(partial) {
    const next = normalize(partial);
    if (!hasChromeStorage()) return next;
    const key = await getStorageKey();
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function clearCredentials() {
    if (!hasChromeStorage()) return;
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }

  namespace.credentials = { EMPTY, getCredentials, saveCredentials, clearCredentials };
})();


/* ===== src/common/token.js ===== */
/* 内部开发工具箱 — Token 存储 */
/* 登录成功后返回的 token 持久化到 chrome.storage.local */
(() => {
  'use strict';

  const namespace = (globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {});

  const KEY_PREFIX = 'adminToken'; // Token、来源网站及登录接口返回的用户信息

  const EMPTY = Object.freeze({ token: '', updatedAt: 0, origin: '', siteToken: '', userInfo: null });

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  function normalize(value = {}) {
    return {
      token: typeof value.token === 'string' ? value.token : '',
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
      origin: typeof value.origin === 'string' ? value.origin : '',
      siteToken: typeof value.siteToken === 'string' ? value.siteToken : '',
      userInfo: value.userInfo && typeof value.userInfo === 'object' && !Array.isArray(value.userInfo)
        ? value.userInfo : null,
    };
  }

  async function getStorageKey(projectId) {
    const targetProjectId = projectId || await namespace.currentProject.getCurrentProjectId();
    return `${KEY_PREFIX}:${targetProjectId}`;
  }

  async function getToken(projectId) {
    if (!hasChromeStorage()) return normalize();
    const key = await getStorageKey(projectId);
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(normalize());
          return;
        }
        resolve(normalize(items[key]));
      });
    });
  }

  async function hasToken() {
    return getToken().then((t) => Boolean(t.token));
  }

  async function saveToken(token, projectId, details = {}) {
    const next = normalize({ ...details, token: String(token || ''), updatedAt: Date.now() });
    if (!hasChromeStorage()) return next;
    const key = await getStorageKey(projectId);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function clearToken() {
    if (!hasChromeStorage()) return;
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }

  namespace.token = { EMPTY, getToken, hasToken, saveToken, clearToken };
})();


/* ===== src/common/custom-domain.js ===== */
/* 内部开发工具箱 — 自定义域名（baseUrl）覆盖存储 */
/* 允许在 popup 手动修改当前项目的后端域名，覆盖 PROJECTS 中的默认 baseUrl。
   命名空间键 customBaseUrl:${projectId}，结构与 token 模块一致。 */
(() => {
  'use strict';

  const namespace = (globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {});

  const KEY_PREFIX = 'customBaseUrl'; // { baseUrl: string, updatedAt: number }

  const EMPTY = Object.freeze({ baseUrl: '', updatedAt: 0 });

  // 内存缓存：避免每次 getBaseUrl() 都异步读 storage（getBaseUrl 是同步 API）
  let cachedOverride = '';

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  function normalize(value = {}) {
    return {
      baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl : '',
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
    };
  }

  async function getStorageKey() {
    const projectId = await namespace.currentProject.getCurrentProjectId();
    return `${KEY_PREFIX}:${projectId}`;
  }

  async function getDomain() {
    if (!hasChromeStorage()) return normalize();
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(normalize());
          return;
        }
        resolve(normalize(items[key]));
      });
    });
  }

  async function hasDomain() {
    return getDomain().then((d) => Boolean(d.baseUrl));
  }

  async function saveDomain(baseUrl) {
    const next = { baseUrl: String(baseUrl || '').trim(), updatedAt: Date.now() };
    cachedOverride = next.baseUrl;
    if (!hasChromeStorage()) return next;
    const key = await getStorageKey();
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function clearDomain() {
    cachedOverride = '';
    if (!hasChromeStorage()) return;
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }

  // 从 storage 载入到内存缓存（loadCurrentProject 时调用）
  async function loadCachedOverride() {
    const state = await getDomain();
    cachedOverride = state.baseUrl || '';
    return cachedOverride;
  }

  // 同步读取缓存的覆盖值（供 getBaseUrl 同步路径使用）
  function getCachedOverride() {
    return cachedOverride;
  }

  // 直接设置内存缓存（跨上下文刷新时使用，无需落盘）
  function setCachedOverride(baseUrl) {
    cachedOverride = typeof baseUrl === 'string' ? baseUrl : '';
  }

  namespace.customDomain = {
    EMPTY,
    getDomain,
    hasDomain,
    saveDomain,
    clearDomain,
    loadCachedOverride,
    getCachedOverride,
    setCachedOverride,
  };
})();


/* ===== src/common/admin-login-history.js ===== */
/* 后台登录历史：账号与 API 地址共同标识一条记录。 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});
  const KEY_PREFIX = 'adminLoginHistory';
  const SESSION_KEY_PREFIX = 'adminSession';
  let writeQueue = Promise.resolve();

  function normalizeBaseUrl(value) {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('API 地址须为 HTTP 或 HTTPS 地址，不能包含账号、查询参数或片段');
    }
    return url.href.replace(/\/+$/, '');
  }

  function identity(account, baseUrl) {
    return JSON.stringify([String(account || '').trim(), normalizeBaseUrl(baseUrl)]);
  }

  // 只读取 JWT 的过期时间；没有明确有效期的 Token 由后台接口验证。
  function tokenExpiresAt(token) {
    try {
      const parts = String(token || '').replace(/^Bearer\s+/i, '').trim().split('.');
      if (parts.length !== 3) return null;
      const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
      return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
    } catch (_) {
      return null;
    }
  }

  function read(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(items?.[key]);
      });
    });
  }

  function write(values) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(values, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }

  async function getRecords(projectId = ns.currentProject.getCachedProjectId()) {
    const records = await read(`${KEY_PREFIX}:${projectId}`);
    return Array.isArray(records) ? records : [];
  }

  async function getRecord(id, projectId) {
    const record = (await getRecords(projectId)).find((item) => item.id === id);
    if (!record) throw new Error('登录历史记录不存在，请重新打开历史记录');
    return record;
  }

  async function getSession(projectId = ns.currentProject.getCachedProjectId()) {
    return await read(`${SESSION_KEY_PREFIX}:${projectId}`) || null;
  }

  function activate(record, projectId = ns.currentProject.getCachedProjectId()) {
    const run = async () => {
      const account = String(record.account || '').trim();
      const password = String(record.password || '');
      const token = String(record.token || '').replace(/^Bearer\s+/i, '').trim();
      const baseUrl = normalizeBaseUrl(record.baseUrl);
      if (!account || !password || !token) throw new Error('登录记录缺少账号、密码或 Token，请重新登录');
      const now = Date.now();
      const tokenState = {
        token,
        updatedAt: record.updatedAt || now,
        origin: new URL(baseUrl).origin,
        siteToken: record.siteToken || `Bearer ${token}`,
        userInfo: record.userInfo || null,
      };
      const saved = {
        ...tokenState, id: identity(account, baseUrl), account, password, baseUrl, lastUsedAt: now,
      };
      const records = await getRecords(projectId);
      const session = { id: crypto.randomUUID(), account, baseUrl };
      // 一次写入完整账号信息，避免新域名与旧 Token 混用。
      await write({
        [`${KEY_PREFIX}:${projectId}`]: [saved, ...records.filter((item) => item.id !== saved.id)],
        [`${SESSION_KEY_PREFIX}:${projectId}`]: session,
        [`adminCredentials:${projectId}`]: { account, password },
        [`adminToken:${projectId}`]: tokenState,
        [`customBaseUrl:${projectId}`]: { baseUrl, updatedAt: now },
        [`quickLoginQueryState:${projectId}`]: null,
        [`quickLoginRecent:${projectId}`]: [],
      });
      if (projectId === ns.currentProject.getCachedProjectId()) ns.customDomain?.setCachedOverride(baseUrl);
      return { tokenState, session };
    };
    const result = writeQueue.then(run);
    writeQueue = result.catch(() => {});
    return result;
  }

  ns.adminLoginHistory = { KEY_PREFIX, SESSION_KEY_PREFIX, normalizeBaseUrl, identity, tokenExpiresAt, getRecords, getRecord, getSession, activate };
  if (typeof module !== 'undefined' && module.exports) module.exports = ns.adminLoginHistory;
})();


/* ===== src/common/tenant.js ===== */
/* 内部开发工具箱 — 租户/用户/部门接口数据模型与参数封装 */
/* 仅包含纯函数，不发起实际网络请求。 */
(() => {
  'use strict';

  const namespace = (globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {});

  const DEFAULT_DEPT_SOURCE = Object.freeze({ name: '钉钉', value: 'dingtalk', icon: 'dingtalk' });

  function normalizeUser(value = {}) {
    return {
      id: String(value.id ?? ''),
      userId: String(value.userId ?? ''),
      userName: String(value.username ?? value.userName ?? value.name ?? ''),
      phone: String(value.phone ?? value.mobile ?? value.account ?? ''),
      account: String(value.account ?? ''),
      deptId: String(value.deptId ?? ''),
      deptName: String(value.deptName ?? ''),
      tenantId: String(value.tenantId ?? ''),
      accessKey: String(value.accessKey ?? ''),
      roleName: String(value.roleName ?? '') || (Array.isArray(value.roleNameList) ? value.roleNameList.join('、') : ''),
    };
  }

  // /admin/tenant/user/account/page 的记录。这里的 id 是 virtualLogin
  // 接受的租户用户主键；tmbId/userId 仅作为关系字段保留，绝不互相替代。
  function normalizeAccount(value = {}) {
    const rawType = value.type ?? value.accountType ?? '';
    const type = rawType === '' || rawType == null ? '' : String(rawType);
    return {
      id: pickFirstString(value.id),
      loginId: pickFirstString(value.id),
      tmbId: pickFirstString(value.tmbId),
      userId: pickFirstString(value.userId),
      username: pickFirstString(value.username, value.userName, value.name),
      account: pickFirstString(value.account, value.phone, value.mobile),
      tenantId: pickFirstString(value.tenantId),
      tenantName: pickFirstString(value.tenantName),
      domain: pickFirstString(value.domain, value.tenantDomain),
      phone: pickFirstString(value.phone, value.mobile),
      industry: value.industry ?? '',
      accountType: value.accountType == null ? '' : String(value.accountType),
      type,
      status: value.status == null ? '' : String(value.status),
      statusText: statusInfo(value.status).statusText,
      raw: value,
    };
  }

  function normalizeTenant(value = {}) {
    return {
      tenantId: String(value.tenantId ?? value.id ?? ''),
      tenantName: String(value.tenantName ?? value.name ?? ''),
      domain: String(value.domain ?? ''),
      contactName: String(value.contactName ?? ''),
      contactPhone: String(value.contactPhone ?? ''),
      industry: value.industry ?? '',
    };
  }

  function normalizeDept(value = {}, inheritedSource = DEFAULT_DEPT_SOURCE) {
    return {
      deptId: String(value.deptId ?? value.id ?? ''),
      deptName: String(value.deptName ?? value.name ?? ''),
      deptSource: value.deptSource ?? inheritedSource,
      children: Array.isArray(value.children) ? value.children : [],
    };
  }

  function flattenDeptOptions(response) {
    const result = [];
    const seen = new Set();
    function visit(nodes, parents = [], source = DEFAULT_DEPT_SOURCE) {
      for (const raw of nodes) {
        if (!raw || typeof raw !== 'object' || Number(raw.isDeleted) === 1) continue;
        const dept = normalizeDept(raw, source);
        if (!dept.deptId || seen.has(dept.deptId)) continue;
        seen.add(dept.deptId);
        const names = [...parents, dept.deptName || '未命名组织'];
        const count = raw.deptUserNum == null ? null : Number(raw.deptUserNum);
        result.push({
          deptId: dept.deptId,
          deptName: names.at(-1),
          deptSource: dept.deptSource,
          depth: parents.length,
          path: names.join(' / '),
          userCount: Number.isFinite(count) && count >= 0 ? count : null,
        });
        visit(dept.children, names, dept.deptSource);
      }
    }
    visit(extractListData(response));
    return result;
  }

  function buildTenantPageBody({ current = 1, size = 10, keyword = '' }) {
    return {
      current: Number(current) || 1,
      size: Number(size) || 10,
      searchType: ['tenantName', 'contactName', 'contactPhone', 'domain'],
      keyword: String(keyword || ''),
    };
  }

  function buildUserPageBody({ tenantId, deptId = '', deptSource = DEFAULT_DEPT_SOURCE, current = 1, size = 10, keyword = '' }) {
    if (!tenantId) throw new Error('tenantId 不能为空');
    return {
      current: Number(current) || 1,
      size: Number(size) || 10,
      deptId: String(deptId || ''),
      tenantId: String(tenantId),
      deptSource,
      searchKey: String(keyword || ''),
      searchType: 'username,phone',
    };
  }

  // 后台账号分页：accountType 是请求筛选字段（0=常规账号，1=学生账号，4=校外账号）。
  // 只发送当前选中的一个文本条件，避免后台将多个条件按 AND 组合造成误筛。
  function buildAccountPageBody({
    current = 1,
    size = 10,
    username = '',
    account = '',
    tenantName = '',
    accountType,
    status,
  } = {}) {
    const body = {
      current: Number(current) || 1,
      size: Number(size) || 10,
    };
    appendIfFilled(body, 'username', username);
    appendIfFilled(body, 'account', account);
    appendIfFilled(body, 'tenantName', tenantName);
    // accountType=0 是有效筛选值，不能使用 truthy 判断。
    if (accountType !== undefined && accountType !== null && String(accountType) !== '') {
      body.accountType = Number(accountType);
    }
    if (status !== undefined && status !== null && String(status) !== '') {
      body.status = Number(status);
    }
    return body;
  }

  function buildDeptListBody({ tenantId }) {
    if (!tenantId) throw new Error('tenantId 不能为空');
    return { tenantId: String(tenantId) };
  }

  function buildQuickLoginBody({ id }) {
    if (!id) throw new Error('id 不能为空');
    return { id: String(id) };
  }

  // 兼容常见响应结构：{ data: { records: [], total: 0 } } 或 { data: { list: [], total: 0 } } 或 { result: { records: [] } }
  function extractPageData(response) {
    if (!response || typeof response !== 'object') return { records: [], total: 0 };
    const payload = response.data ?? response.result ?? response;
    if (!payload || typeof payload !== 'object') return { records: [], total: 0 };
    const totalValue = Number(payload.total);
    return {
      records: Array.isArray(payload.records) ? payload.records : Array.isArray(payload.list) ? payload.list : [],
      total: Number.isFinite(totalValue) && totalValue >= 0
        ? totalValue
        : (Array.isArray(payload.records) ? payload.records.length : 0),
      current: Number(payload.current) || 1,
      size: Number(payload.size) || 10,
    };
  }

  function extractListData(response) {
    if (!response || typeof response !== 'object') return [];
    const payload = response.data ?? response.result ?? response;
    return Array.isArray(payload) ? payload : [];
  }

  function extractErrorMessage(response) {
    if (!response || typeof response !== 'object') return '';
    return response.msg || response.message || response.error || response.errorMessage || '';
  }

  function extractToken(response) {
    if (!response || typeof response !== 'object') return '';
    const data = response.data ?? response.result ?? response;
    if (typeof data === 'string') return data;
    return data?.token || data?.accessToken || data?.access_token || data?.authorization || data?.jwt || '';
  }

  // ── 教师 / 学生 / 班级 数据结构 ──

  function pickFirstString(...candidates) {
    for (const v of candidates) {
      if (v == null) continue;
      const s = String(v).trim();
      if (s) return s;
    }
    return '';
  }

  function firstListValue(value) {
    return Array.isArray(value) ? value[0] : value;
  }

  // 后端同一字段可能返回数组、单值或分隔符字符串，统一成字符串数组。
  function toStringList(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value).split(/[,，、\s]+/).filter(Boolean);
  }

  // 状态映射：0 = 在线（正常），1 = 离线（停用）
  // 教师状态映射：0 = 在线，1 = 离线
  function statusInfo(value) {
    const s = String(value ?? '');
    if (s === '0') return { status: s, statusText: '在线', on: true };
    if (s === '1') return { status: s, statusText: '离线', on: false };
    return { status: s, statusText: s, on: null };
  }

  // 学生状态映射：1 = 在线，2 = 离线（与教师取值不同）
  function studentStatusInfo(value) {
    const s = String(value ?? '');
    if (s === '1') return { status: s, statusText: '在线', on: true };
    if (s === '2') return { status: s, statusText: '离线', on: false };
    return { status: s, statusText: s, on: null };
  }

  function normalizeTeacher(value = {}) {
    const nestedUser = value.user && typeof value.user === 'object' ? value.user : null;
    const st = statusInfo(value.status);
    return {
      id: pickFirstString(value.id, value.teacherId, value.userId, nestedUser?.userId, nestedUser?.id),
      tmbId: pickFirstString(value.tmbId),
      userId: pickFirstString(value.userId, nestedUser?.userId),
      tenantId: pickFirstString(value.tenantId),
      name: pickFirstString(value.name, value.teacherName, value.realName, nestedUser?.name, nestedUser?.username, value.username, value.userName, value.nickName),
      account: pickFirstString(value.account, value.phone, value.mobile, value.userAccount, value.loginAccount, nestedUser?.phone, nestedUser?.mobile, nestedUser?.account),
      phone: pickFirstString(value.phone, value.mobile, nestedUser?.phone, nestedUser?.mobile),
      status: st.status,
      statusText: st.statusText,
      statusOn: st.on,
      raw: value,
    };
  }

  function normalizeStudent(value = {}) {
    const st = studentStatusInfo(value.status);
    const nestedClass = value.clazz && typeof value.clazz === 'object'
      ? value.clazz
      : (value.class && typeof value.class === 'object'
          ? value.class
          : (value.schoolDept && typeof value.schoolDept === 'object' ? value.schoolDept : null));
    return {
      id: pickFirstString(value.id, value.studentId, value.userId),
      tenantId: pickFirstString(value.tenantId),
      tenantName: pickFirstString(value.tenantName, value.schoolName),
      name: pickFirstString(value.name, value.studentName, value.realName, value.username, value.userName),
      code: pickFirstString(value.code, value.studentCode, value.studentNo, value.account, value.userAccount),
      account: pickFirstString(value.account, value.userAccount),
      password: pickFirstString(value.password, value.studentPassword, value.initialPassword, value.defaultPassword),
      classId: pickFirstString(
        value.classId, value.clazzId, value.deptId, value.schoolDeptId,
        firstListValue(value.classIds), firstListValue(value.clazzIds), firstListValue(value.deptIds),
        nestedClass?.id, nestedClass?.classId, nestedClass?.clazzId, nestedClass?.deptId,
      ),
      className: pickFirstString(
        value.className, firstListValue(value.classNames), value.clazzName, value.deptName,
        firstListValue(value.clazzNames), firstListValue(value.deptNames),
        nestedClass?.name, nestedClass?.className, nestedClass?.clazzName, nestedClass?.deptName,
      ),
      status: st.status,
      statusText: st.statusText,
      statusOn: st.on,
      raw: value,
    };
  }

  // 解析 virtualLogin 返回的 URL：提取 origin 与 用户态 token
  // 形如 https://uuu.huayungpt.com?token=Bearer%20xxx
  function parseVirtualLoginUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return { url: '', origin: '', token: '' };
    try {
      const parsed = new URL(raw);
      let token = parsed.searchParams.get('token') || '';
      token = token.replace(/^Bearer\s+/i, '').trim();
      return { url: raw, origin: parsed.origin, token };
    } catch (_) {
      return { url: raw, origin: '', token: '' };
    }
  }

  // 仅附加非空字符串字段：值为空串/null/undefined 时不放入 body
  function appendIfFilled(body, key, value) {
    if (value == null) return;
    const s = String(value).trim();
    if (s) body[key] = s;
  }

  function buildTeacherPageBody({ current = 1, size = 10, name = '', account = '', phone = '' }) {
    const body = {
      current: Number(current) || 1,
      size: Number(size) || 10,
      _t: Date.now(),
      _r: Math.random(),
    };
    appendIfFilled(body, 'name', name);
    appendIfFilled(body, 'account', account);
    appendIfFilled(body, 'phone', phone);
    return body;
  }

  function buildStudentPageBody({ current = 1, size = 10, name = '', code = '', account = '', className = '', clazzId = '', clazzIds = [] }) {
    const body = {
      current: Number(current) || 1,
      size: Number(size) || 10,
    };
    appendIfFilled(body, 'name', name);
    appendIfFilled(body, 'code', code);
    appendIfFilled(body, 'account', account);
    appendIfFilled(body, 'className', className);
    appendIfFilled(body, 'clazzId', clazzId);
    if (Array.isArray(clazzIds) && clazzIds.length) {
      body.clazzIds = clazzIds.map((id) => String(id)).filter(Boolean);
    }
    return body;
  }

  function buildSemesterPageBody({ current = 1, size = 999 } = {}) {
    return {
      current: Number(current) || 1,
      size: Number(size) || 999,
    };
  }

  function normalizeSemester(value = {}) {
    const id = pickFirstString(value.id, value.semesterId);
    const year = pickFirstString(value.year, value.schoolYear);
    const type = pickFirstString(value.type, value.semesterType);
    const isCurrent = String(value.isCurrent ?? '') === '1';
    const parts = [year, type ? `学期${type}` : ''].filter(Boolean);
    return {
      id,
      year,
      type,
      startDate: pickFirstString(value.startDate),
      endDate: pickFirstString(value.endDate),
      isCurrent,
      label: `${parts.join(' · ') || id}${isCurrent ? ' · 当前' : ''}`,
      raw: value,
    };
  }

  function resolveSemesterId(semesters = [], preferredId = '') {
    const preferred = String(preferredId || '');
    if (preferred && semesters.some((semester) => String(semester?.id || '') === preferred)) {
      return preferred;
    }
    return pickFirstString(semesters[0]?.id);
  }

  // 教师详情：/client/teacher/detail
  function buildTeacherDetailBody({ id }) {
    if (!id) throw new Error('id 不能为空');
    return { id: String(id) };
  }

  // 年级/学段/班级树：/client/schoolDept/tree（semesterId 为空时不传）
  function buildSchoolDeptTreeBody({ semesterId = '' } = {}) {
    const body = {};
    appendIfFilled(body, 'semesterId', semesterId);
    return body;
  }

  // 班级教师关系：/client/schoolManageTeacher/listByClazz
  function buildClazzTeacherListBody({ semesterId = '' } = {}) {
    const body = {};
    appendIfFilled(body, 'semesterId', semesterId);
    return body;
  }

  // 提取详情响应的 data 负载
  function extractDetailData(response) {
    if (!response || typeof response !== 'object') return {};
    const payload = response.data ?? response.result ?? response;
    return payload && typeof payload === 'object' ? payload : {};
  }

  // 从 schoolDept/tree 构建 id → 班级全名映射（拼父级名，如 三年级1班）
  function buildDeptIdNameMap(treeData) {
    const map = {};
    if (!treeData) return map;
    const payload = treeData.data ?? treeData.result ?? treeData;
    const roots = Array.isArray(payload) ? payload
      : (Array.isArray(payload?.children) ? payload.children
        : (Array.isArray(payload?.treeList) ? payload.treeList
          : (Array.isArray(payload?.records) ? payload.records : [])));
    const walk = (nodes, prefix) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const id = pickFirstString(node.id, node.deptId);
        const name = pickFirstString(node.name, node.deptName);
        const fullName = prefix ? prefix + name : name;
        if (id) map[id] = fullName;
        if (Array.isArray(node.children) && node.children.length) walk(node.children, fullName);
      }
    };
    walk(roots, '');
    return map;
  }

  // 组织树节点层级：subDeptType/deptType 1=学段，2=年级，3=班级。
  function deptNodeType(node) {
    const raw = String(node?.subDeptType ?? node?.deptType ?? node?.type ?? '').toLowerCase();
    if (raw === '3' || raw === 'class' || node?.isClass === true) return 'class';
    if (raw === '2' || raw === 'grade') return 'grade';
    if (raw === '1' || raw === 'stage' || raw === 'section') return 'stage';
    return '';
  }

  // 定位班级所属的学段与年级。缺少层级类型的租户树按位置兜底：
  // 班级的直接上级视作年级，再上一级视作学段。
  function resolveClassLineage(ancestors = []) {
    const usable = ancestors.filter((item) => item && item.id);
    let stage = usable.filter((item) => item.type === 'stage').at(-1) || null;
    let grade = usable.filter((item) => item.type === 'grade').at(-1) || null;
    if (!grade) {
      const parent = usable.at(-1) || null;
      if (parent && parent !== stage) grade = parent;
    }
    if (!stage) {
      const index = grade ? usable.indexOf(grade) : usable.length;
      stage = index > 0 ? usable[index - 1] : null;
    }
    return { stage, grade };
  }

  // 将 schoolDept/tree 的班级叶子扁平化，保留完整路径以区分不同年级的同名班级。
  function extractClassOptions(treeData) {
    const payload = treeData?.data ?? treeData?.result ?? treeData;
    const roots = Array.isArray(payload) ? payload
      : (Array.isArray(payload?.children) ? payload.children
        : (Array.isArray(payload?.treeList) ? payload.treeList
          : (Array.isArray(payload?.records) ? payload.records : [])));
    const classes = [];

    const walk = (nodes, parentPath = [], parentIds = [], ancestors = []) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const id = pickFirstString(node.id, node.deptId);
        const name = pickFirstString(node.deptName, node.name);
        const path = name ? [...parentPath, name] : parentPath;
        const ids = id ? [...parentIds, id] : parentIds;
        const children = Array.isArray(node.children) ? node.children : [];
        const nodeType = deptNodeType(node);
        if (nodeType === 'class' && id) {
          const { stage, grade } = resolveClassLineage(ancestors);
          classes.push({
            id,
            name,
            label: path.join(' / '),
            path,
            parentId: pickFirstString(node.parentId),
            ancestorIds: ids.slice(0, -1),
            stageId: stage?.id || '',
            stageName: stage?.name || '',
            gradeId: grade?.id || '',
            gradeName: grade?.name || '',
          });
        }
        if (children.length) walk(children, path, ids, [...ancestors, { id, name, type: nodeType }]);
      }
    };

    walk(roots);
    return classes;
  }

  // 教学职务上的部门可能是学段/年级/班级，统一展开成班级 id。
  function expandDeptIdsToClassIds(deptIds, classOptions = []) {
    const source = Array.isArray(deptIds) ? deptIds : [deptIds];
    const targets = new Set(source.map((id) => String(id ?? '').trim()).filter(Boolean));
    if (!targets.size) return [];
    const result = [];
    for (const item of (Array.isArray(classOptions) ? classOptions : [])) {
      const id = pickFirstString(item?.id);
      if (!id) continue;
      const ancestorIds = Array.isArray(item?.ancestorIds) ? item.ancestorIds : [];
      if (targets.has(id) || ancestorIds.some((ancestorId) => targets.has(String(ancestorId)))) result.push(id);
    }
    return result;
  }

  // 教师详情 → 可筛选的教学范围（学科 × 班级）。
  // 没有学科的任教关系（班主任、管理班级等）归入空学科，只在「全部学科」下出现。
  function buildTeacherScopeEntries(detail, classOptions = []) {
    const classById = new Map((Array.isArray(classOptions) ? classOptions : [])
      .filter((item) => item && item.id)
      .map((item) => [String(item.id), item]));
    const entries = [];
    const seen = new Set();
    const addEntry = (subject, classId) => {
      const cls = classById.get(String(classId));
      if (!cls) return;
      const key = subject + '¦' + cls.id;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({
        subject,
        classId: String(cls.id),
        className: cls.name || '',
        classLabel: cls.label || cls.name || '',
        gradeId: cls.gradeId || '',
        gradeName: cls.gradeName || '',
        stageId: cls.stageId || '',
        stageName: cls.stageName || '',
      });
    };

    const subjectDetails = Array.isArray(detail?.schoolSubjectTeachersDetail)
      ? detail.schoolSubjectTeachersDetail
      : [];
    for (const item of subjectDetails) {
      if (!item || typeof item !== 'object') continue;
      const subjects = toStringList(item.subjectNames ?? item.subjectName ?? item.subject);
      const deptIds = toStringList(item.deptIds ?? item.deptId ?? item.classIds ?? item.classId ?? item.clazzIds ?? item.clazzId);
      for (const classId of expandDeptIdsToClassIds(deptIds, classOptions)) {
        if (subjects.length) subjects.forEach((subject) => addEntry(subject, classId));
        else addEntry('', classId);
      }
    }

    // 其它来源（班主任、管理班级等）补齐尚未出现的班级，避免筛选项少于实际教学范围。
    const covered = new Set(entries.map((entry) => entry.classId));
    for (const classId of expandDeptIdsToClassIds(extractTeacherClassIds(detail), classOptions)) {
      if (!covered.has(String(classId))) addEntry('', classId);
    }
    return entries;
  }

  // 学科 → 学段 → 年级 → 班级 逐级联动：每级选项只来自上级已选范围，
  // 上级变化后失效的下级选择自动清空；classIds 为当前筛选命中的班级。
  function resolveTeacherScope(entries = [], filter = {}) {
    const rows = (Array.isArray(entries) ? entries : []).filter((row) => row && row.classId);
    const uniqueOptions = (list, valueKey, buildLabel) => {
      const seen = new Set();
      const options = [];
      for (const row of list) {
        const value = String(row?.[valueKey] ?? '');
        if (!value || seen.has(value)) continue;
        seen.add(value);
        options.push({ value, label: buildLabel(row) || value });
      }
      return options;
    };
    const pick = (options, value) => (options.some((item) => item.value === String(value || '')) ? String(value) : '');

    const subjects = uniqueOptions(rows, 'subject', (row) => row.subject);
    const subject = pick(subjects, filter?.subject);
    const bySubject = subject ? rows.filter((row) => row.subject === subject) : rows;

    const stages = uniqueOptions(bySubject, 'stageId', (row) => row.stageName);
    const stageId = pick(stages, filter?.stageId);
    const byStage = stageId ? bySubject.filter((row) => row.stageId === stageId) : bySubject;

    // 未选中的上级层级并入下级标签，避免同名年级/班级无法区分。
    const grades = uniqueOptions(byStage, 'gradeId', (row) => [stageId ? '' : row.stageName, row.gradeName].filter(Boolean).join(' / '));
    const gradeId = pick(grades, filter?.gradeId);
    const byGrade = gradeId ? byStage.filter((row) => row.gradeId === gradeId) : byStage;

    const classes = uniqueOptions(byGrade, 'classId', (row) => [
      stageId ? '' : row.stageName,
      gradeId ? '' : row.gradeName,
      row.className,
    ].filter(Boolean).join(' / '));
    const classId = pick(classes, filter?.classId);
    const matched = classId ? byGrade.filter((row) => row.classId === classId) : byGrade;

    return {
      filter: { subject, stageId, gradeId, classId },
      subjects,
      stages,
      grades,
      classes,
      classIds: [...new Set(matched.map((row) => row.classId))],
      active: Boolean(subject || stageId || gradeId || classId),
    };
  }

  function normalizeClassText(value) {
    return String(value || '').trim().toLowerCase().replace(/[\s/\\·._-]+/g, '');
  }

  // 将后台 account/page 学生记录与 AI client/student/page 记录做严格匹配。
  // 返回全部候选，不替调用方擅自选择同名/同账号记录。
  function matchStudentCandidates(account, students = []) {
    const a = account && typeof account === 'object' ? account : {};
    const accountTenant = normalizeClassText(a.tenantId);
    const username = normalizeClassText(a.username);
    const loginAccount = normalizeClassText(a.account);
    const source = Array.isArray(students) ? students : [];
    const tenantScoped = accountTenant
      ? source.filter((student) => {
          const tenantId = normalizeClassText(student?.tenantId);
          return tenantId === accountTenant;
        })
      : source;
    const byName = username
      ? tenantScoped.filter((student) => normalizeClassText(student?.name) === username)
      : [];
    const byAccount = loginAccount
      ? tenantScoped.filter((student) => [student?.code, student?.account].some((value) => normalizeClassText(value) === loginAccount))
      : [];
    if (byAccount.length) return { matches: byAccount, matchedBy: 'account' };
    if (byName.length) return { matches: byName, matchedBy: 'username' };
    return { matches: [], matchedBy: '' };
  }

  // 学生接口优先用 classId/clazzId 定位；只有班级名称能唯一命中时才回落名称匹配。
  function findStudentClass(student, classOptions = []) {
    if (!student || !Array.isArray(classOptions) || !classOptions.length) return null;
    const raw = student.raw && typeof student.raw === 'object' ? student.raw : student;
    const nestedClass = raw.clazz && typeof raw.clazz === 'object'
      ? raw.clazz
      : (raw.class && typeof raw.class === 'object'
          ? raw.class
          : (raw.schoolDept && typeof raw.schoolDept === 'object' ? raw.schoolDept : null));
    const classId = pickFirstString(
      student.classId, raw.classId, raw.clazzId, raw.deptId, raw.schoolDeptId,
      firstListValue(raw.classIds), firstListValue(raw.clazzIds), firstListValue(raw.deptIds),
      nestedClass?.id, nestedClass?.classId, nestedClass?.clazzId, nestedClass?.deptId,
    );
    if (classId) {
      const byId = classOptions.find((item) => String(item.id) === classId);
      if (byId) return byId;
    }

    const className = normalizeClassText(pickFirstString(
      student.className, raw.className, firstListValue(raw.classNames), raw.clazzName, raw.deptName,
      firstListValue(raw.clazzNames), firstListValue(raw.deptNames),
      nestedClass?.name, nestedClass?.className, nestedClass?.clazzName, nestedClass?.deptName,
    ));
    if (!className) return null;

    const matches = classOptions.filter((item) => {
      const path = Array.isArray(item.path) ? item.path : [];
      const aliases = [
        item.label,
        item.name,
        path.join(''),
        path.slice(1).join(''),
        path.slice(-2).join(''),
      ].map(normalizeClassText).filter(Boolean);
      return aliases.includes(className);
    });
    return matches.length === 1 ? matches[0] : null;
  }

  // listByClazz → deptId -> 教师列表。同一教师兼任多个角色/科目时合并为一条。
  function buildClassTeacherMap(response) {
    const payload = response?.data ?? response?.result ?? response;
    const rows = Array.isArray(payload) ? payload
      : (Array.isArray(payload?.records) ? payload.records
        : (Array.isArray(payload?.list) ? payload.list : []));
    const result = {};

    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const deptId = pickFirstString(row.deptId, row.classId, row.clazzId);
      if (!deptId) continue;
      const teachers = new Map();
      const assignments = Array.isArray(row.clazzTeacherRespList) ? row.clazzTeacherRespList : [];

      for (const assignment of assignments) {
        if (!assignment || typeof assignment !== 'object') continue;
        const teachTypeName = pickFirstString(assignment.teachTypeName);
        const subjectName = pickFirstString(assignment.subjectName);
        const duty = teachTypeName && subjectName
          ? `${teachTypeName} · ${subjectName}`
          : (teachTypeName || subjectName);
        const users = Array.isArray(assignment.tmbUserList) ? assignment.tmbUserList : [];

        for (const user of users) {
          if (!user || typeof user !== 'object') continue;
          const tmbId = pickFirstString(user.tmbId, user.id);
          const userId = pickFirstString(user.userId);
          const key = tmbId || userId;
          if (!key) continue;
          let teacher = teachers.get(key);
          if (!teacher) {
            teacher = {
              id: key,
              tmbId,
              userId,
              name: pickFirstString(user.userName, user.name, user.teacherName, user.realName),
              account: pickFirstString(user.phone, user.mobile, user.account, user.email),
              phone: pickFirstString(user.phone, user.mobile),
              duties: [],
              raw: user,
            };
            teachers.set(key, teacher);
          }
          if (duty && !teacher.duties.includes(duty)) teacher.duties.push(duty);
        }
      }

      result[deptId] = [...teachers.values()];
    }
    return result;
  }

  function extractClazzTeacherSemesterId(response) {
    const payload = response?.data ?? response?.result ?? response;
    const rows = Array.isArray(payload) ? payload
      : (Array.isArray(payload?.records) ? payload.records : []);
    if (!rows.length) return '';
    for (const row of rows) {
      const assignments = Array.isArray(row?.clazzTeacherRespList) ? row.clazzTeacherRespList : [];
      for (const assignment of assignments) {
        const semesterId = pickFirstString(assignment?.semesterId);
        if (semesterId) return semesterId;
      }
    }
    return '';
  }

  // 从教师详情中提取教学职务（科目 · 班级），用班级树把 deptId 映射成班级全名
  // 真实结构：detail.schoolSubjectTeachersDetail = [
  //   { teachType: 7, teachTypeName: '学科教师', subjectNames: ['数学'], deptIds: [3010], deptNames: ['1班'] }
  // ]
  // deptNames 只有叶子名（如 1班），需借 idNameMap 补全为 初中初三1班
  function extractTeachDuties(detail, idNameMap = {}) {
    if (!detail || typeof detail !== 'object') return [];
    const duties = [];

    const subjectList = Array.isArray(detail.schoolSubjectTeachersDetail)
      ? detail.schoolSubjectTeachersDetail
      : [];
    for (const item of subjectList) {
      if (!item || typeof item !== 'object') continue;
      const subjects = toStringList(item.subjectNames ?? item.subjectName ?? item.subject);
      const deptIds = toStringList(item.deptIds ?? item.deptId ?? item.classIds ?? item.classId);
      const deptNames = toStringList(item.deptNames ?? item.deptName ?? item.classNames ?? item.className);
      // deptId 优先走班级树翻译成全名；翻译不到时回落同位置的 deptName
      const classes = deptIds.length
        ? deptIds.map((id, i) => idNameMap[id] || deptNames[i] || '').filter(Boolean)
        : deptNames;
      for (const subject of (subjects.length ? subjects : [''])) {
        for (const cls of (classes.length ? classes : [''])) {
          if (subject && cls) duties.push(`${subject} · ${cls}`);
          else if (subject || cls) duties.push(subject || cls);
        }
      }
    }
    return [...new Set(duties)];
  }

  // 从教师详情中提取 semesterId（供 schoolDept/tree 使用）
  function extractSemesterId(detail) {
    if (!detail || typeof detail !== 'object') return '';
    const direct = pickFirstString(
      detail.semesterId, detail.semester?.id, detail.currentSemesterId,
      detail.schoolSemesterId, detail.termId,
    );
    if (direct) return direct;
    const subjectDetails = Array.isArray(detail.schoolSubjectTeachersDetail)
      ? detail.schoolSubjectTeachersDetail
      : [];
    for (const item of subjectDetails) {
      const semesterId = pickFirstString(item?.semesterId, item?.semester?.id, item?.termId);
      if (semesterId) return semesterId;
    }
    return '';
  }

  // 从教师详情中提取其教学班级 id，用于按班级查询相关学生。
  function extractTeacherClassIds(detail) {
    if (!detail || typeof detail !== 'object') return [];
    const ids = new Set();
    const collect = (value) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        value.forEach(collect);
        return;
      }
      if (typeof value === 'object') {
        ['deptIds', 'deptId', 'classIds', 'classId', 'clazzIds', 'clazzId', 'schoolDeptIds', 'schoolDeptId', 'classList', 'clazzList'].forEach((key) => collect(value[key]));
        for (const listKey of ['classList', 'clazzList']) {
          if (!Array.isArray(value[listKey])) continue;
          value[listKey].forEach((item) => {
            if (item && typeof item === 'object') collect(item.id ?? item.classId ?? item.clazzId ?? item.deptId);
          });
        }
        return;
      }
      String(value).split(/[,，、\s]+/).map((item) => item.trim()).filter(Boolean).forEach((item) => ids.add(item));
    };
    ['schoolSubjectTeachersDetail', 'schoolManageTeachersDetail', 'subjectTeachers', 'manageTeachers', 'teacherClassList', 'clazzList'].forEach((key) => collect(detail[key]));
    return [...ids];
  }

  namespace.tenant = {
    DEFAULT_DEPT_SOURCE,
    normalizeTenant,
    normalizeUser,
    normalizeAccount,
    normalizeDept,
    flattenDeptOptions,
    buildTenantPageBody,
    buildUserPageBody,
    buildAccountPageBody,
    buildDeptListBody,
    buildQuickLoginBody,
    extractPageData,
    extractListData,
    extractErrorMessage,
    extractToken,
    // 教师 / 学生
    normalizeTeacher,
    normalizeStudent,
    buildTeacherPageBody,
    buildStudentPageBody,
    buildSemesterPageBody,
    normalizeSemester,
    resolveSemesterId,
    buildTeacherDetailBody,
    buildSchoolDeptTreeBody,
    buildClazzTeacherListBody,
    extractDetailData,
    buildDeptIdNameMap,
    extractClassOptions,
    expandDeptIdsToClassIds,
    buildTeacherScopeEntries,
    resolveTeacherScope,
    findStudentClass,
    matchStudentCandidates,
    buildClassTeacherMap,
    extractClazzTeacherSemesterId,
    extractTeachDuties,
    extractSemesterId,
    extractTeacherClassIds,
    pickFirstString,
    appendIfFilled,
    parseVirtualLoginUrl,
    statusInfo,
    studentStatusInfo,
  };
})();


/* ===== src/common/mock-storage.js ===== */
/* 内部开发工具箱 — Mock 规则存储 */
/* 按项目命名空间隔离存储 Mock 规则 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});
  const KEY_PREFIX = 'mockRules';
  const DISABLED_PREFIX = 'monitorDisabled';
  const MOCK_ENABLED_KEY = 'mockEnabled'; // 接口 Mock 总开关（全局，不按项目隔离）
  let ruleMutationQueue = Promise.resolve();

  function normalizeRequestKey(key) {
    const raw = String(key || '');
    const separator = raw.indexOf(' ');
    if (separator <= 0) return raw;
    const method = raw.slice(0, separator).toUpperCase();
    const url = raw.slice(separator + 1).split('#', 1)[0].split('?', 1)[0];
    return `${method} ${url}`;
  }

  function endpointUrl(url) {
    return String(url || '').split('#', 1)[0].split('?', 1)[0];
  }

  function endpointPageOrigin(endpoint, fallbackEndpoint) {
    return endpoint?.pageOrigin || endpoint?.captured?.pageOrigin ||
      fallbackEndpoint?.pageOrigin || fallbackEndpoint?.captured?.pageOrigin;
  }

  function normalizedInterfaceUrl(endpoint, fallbackEndpoint) {
    const normalized = endpointUrl(endpoint?.url);
    if (!normalized) return '';
    try {
      return new URL(normalized).href;
    } catch (_) {
      const pageOrigin = endpointPageOrigin(endpoint, fallbackEndpoint);
      if (!pageOrigin) return `relative:${normalized}`;
      try {
        return new URL(normalized, pageOrigin).href;
      } catch (_) {
        return `relative:${normalized}`;
      }
    }
  }

  // 规则同步只认相同请求方式与去掉 Query Parameters 后的相同 URL。
  // 绝对 URL 保留 origin/端口；相对导入路径仅在有 pageOrigin 时还原比较。
  function rulesShareEndpoint(left, right) {
    if (!left || !right) return false;
    if (String(left.method || '').toUpperCase() !== String(right.method || '').toUpperCase()) return false;
    return normalizedInterfaceUrl(left, right) === normalizedInterfaceUrl(right, left);
  }

  function syncMockState(target, source, updatedAt) {
    const synchronized = { ...target, updatedAt };
    const fields = [
      'responseMock', 'requestMock', 'mockMethod', 'mockUrl',
      'enabled', 'mockMode', 'mockData', 'hasMockData', 'status',
    ];
    fields.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(source, field)) return;
      const value = source[field];
      synchronized[field] = Array.isArray(value)
        ? [...value]
        : value && typeof value === 'object'
          ? { ...value }
          : value;
    });
    return synchronized;
  }

  function isEmoRule(rule) {
    return rule?.listSource === 'emo' || rule?.captured?.source === 'capture';
  }

  function enqueueRuleMutation(mutation) {
    const task = ruleMutationQueue.then(mutation, mutation);
    ruleMutationQueue = task.catch(() => {});
    return task;
  }

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  async function getStorageKey() {
    if (ns.currentProject && ns.currentProject.getCurrentProjectId) {
      const projectId = await ns.currentProject.getCurrentProjectId();
      return `${KEY_PREFIX}:${projectId}`;
    }
    // Fallback: 如果 currentProject 未加载，使用默认
    return `${KEY_PREFIX}:gpt-admin-pre`;
  }

  // 规则结构迁移：单份 mockData + mockMode 升级为双份独立 responseMock / requestMock。
  // 出参、入参各自持有 enabled + mockData（出参额外含 status），可同时独立开启拦截，
  // 且 mockData 与开关解耦——关闭拦截不丢数据，仅清空时丢弃。
  // 旧规则（仅有 mockMode/mockData/enabled/status）按原 mockMode 归入对应一份，
  // 另一份默认 enabled:false、mockData 为 null（未编辑过则留空，避免数据串台）。
  function migrateRule(rule) {
    if (!rule || typeof rule !== 'object') return rule;
    if (rule.responseMock && rule.requestMock) return rule;

    const oldEnabled = rule.enabled !== false;
    const oldMode = rule.mockMode || 'response';
    const oldData = rule.mockData;
    const oldHasMockData = rule.hasMockData !== undefined ? !!rule.hasMockData : oldData != null;
    const oldStatus = rule.status != null ? Number(rule.status) : 200;

    // 旧结构仅有单一 mockMode + mockData：归属到对应方向，另一方向留空（null）。
    // 切勿把 oldData 复制到另一方向——否则开启拦截后该方向会错误展示为
    // 另一方向的编辑数据（如入参显示为出参内容）。另一方向在用户尚未编辑时
    // 应为空，开启拦截时编辑器再用真实数据兜底，避免数据串台。
    const responseMock = rule.responseMock || {
      enabled: oldEnabled && oldMode === 'response',
      hasMockData: oldMode === 'response' && oldHasMockData,
      mockData: oldMode === 'response' ? oldData : null,
      status: oldStatus,
    };
    const requestMock = rule.requestMock || {
      enabled: oldEnabled && oldMode === 'request',
      hasMockData: oldMode === 'request' && oldHasMockData,
      mockData: oldMode === 'request' ? oldData : null,
    };

    return { ...rule, responseMock, requestMock };
  }

  // 获取当前项目的所有 Mock 规则
  async function getMockRules() {
    if (!hasChromeStorage()) return [];
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) {
          resolve([]);
          return;
        }
        const raw = Array.isArray(items[key]) ? items[key] : [];
        // 读取时统一迁移，保证消费端（panel / mock-hook）始终拿到新结构
        resolve(raw.map(migrateRule));
      });
    });
  }

  // 保存单条规则（如果已存在则更新）
  async function saveMockRule(rule) {
    if (!hasChromeStorage()) return;
    return enqueueRuleMutation(async () => {
      const key = await getStorageKey();
      const rules = await getMockRules();

      const now = Date.now();
      const existingIndex = rules.findIndex(r => r.id === rule.id);
      if (existingIndex >= 0) {
        rules[existingIndex] = { ...rule, updatedAt: now };
      } else {
        rules.push({ ...rule, createdAt: now, updatedAt: now });
      }

      // 同一个接口可能同时拥有捕获来源和已编来源的规则。保存任意一条时同步其
      // Mock 配置，但保留其他规则各自的 id、真实 URL、来源与 captured 快照。
      const savedIndex = existingIndex >= 0 ? existingIndex : rules.length - 1;
      const savedRule = rules[savedIndex];
      rules.forEach((candidate, index) => {
        if (index === savedIndex || !rulesShareEndpoint(candidate, savedRule)) return;
        rules[index] = syncMockState(candidate, savedRule, now);
      });

      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: rules }, () => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(rule);
        });
      });
    });
  }

  // 删除规则
  async function deleteMockRule(ruleId) {
    if (!hasChromeStorage()) return;
    return enqueueRuleMutation(async () => {
      const key = await getStorageKey();
      const rules = await getMockRules();
      const filtered = rules.filter(r => r.id !== ruleId);

      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: filtered }, () => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve({ ok: true });
        });
      });
    });
  }

  // 启用/禁用规则
  async function toggleMockRule(ruleId, enabled) {
    if (!hasChromeStorage()) return;
    return enqueueRuleMutation(async () => {
      const key = await getStorageKey();
      const rules = await getMockRules();

      const rule = rules.find(r => r.id === ruleId);
      if (!rule) throw new Error('Rule not found');

      if (rule.responseMock || rule.requestMock) {
        if (rule.responseMock) rule.responseMock.enabled = !!enabled;
        if (rule.requestMock) rule.requestMock.enabled = !!enabled;
      } else {
        rule.enabled = enabled;
      }
      rule.updatedAt = Date.now();

      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: rules }, () => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(rule);
        });
      });
    });
  }

  // 原子应用导入冲突的最终选择：可写入“已编”候选，同时移除未被选择的
  // Emo 规则。捕获记录存放在 content script，不在这里改动。
  async function resolveImportConflict(selectedRuleOrRules, removeRuleIds = []) {
    if (!hasChromeStorage()) return { rules: [] };
    return enqueueRuleMutation(async () => {
      const key = await getStorageKey();
      const rules = await getMockRules();
      const removedIds = new Set((Array.isArray(removeRuleIds) ? removeRuleIds : []).map(String));
      const nextRules = rules.filter(rule => !removedIds.has(String(rule.id)));

      const selectedRules = Array.isArray(selectedRuleOrRules)
        ? selectedRuleOrRules
        : (selectedRuleOrRules ? [selectedRuleOrRules] : []);
      selectedRules.forEach((selectedRule) => {
        const now = Date.now();
        const savedRule = {
          ...selectedRule,
          listSource: selectedRule.listSource || 'edited',
          createdAt: selectedRule.createdAt || now,
          updatedAt: now,
        };
        const existingIndex = nextRules.findIndex(rule => rule.id === savedRule.id);
        if (existingIndex >= 0) nextRules[existingIndex] = savedRule;
        else nextRules.push(savedRule);
      });

      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: nextRules }, () => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve({ rules: nextRules });
        });
      });
    });
  }

  // 按来源清空当前项目的 Mock 规则。Emo 对应捕获后保存的规则，已编对应导入/手工规则。
  async function clearMockRules(scope = 'all') {
    if (!hasChromeStorage()) return;
    return enqueueRuleMutation(async () => {
      const key = await getStorageKey();
      const rules = await getMockRules();
      const remaining = scope === 'emo'
        ? rules.filter(rule => !isEmoRule(rule))
        : scope === 'edited'
          ? rules.filter(isEmoRule)
          : [];

      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: remaining }, () => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve({ ok: true, rules: remaining });
        });
      });
    });
  }

  // 获取指定规则
  async function getMockRule(ruleId) {
    const rules = await getMockRules();
    return rules.find(r => r.id === ruleId);
  }

  // ===== 禁监接口池 =====
  // 按项目隔离存储被禁止监听的接口 key（method + ' ' + 无 query/hash 的 url）数组。
  // 开启禁监后，hook 不再记录该接口，也不上报，避免轮询接口刷屏且无法选中。
  async function getDisabledStorageKey() {
    if (ns.currentProject && ns.currentProject.getCurrentProjectId) {
      const projectId = await ns.currentProject.getCurrentProjectId();
      return `${DISABLED_PREFIX}:${projectId}`;
    }
    return `${DISABLED_PREFIX}:gpt-admin-pre`;
  }

  async function getMonitorDisabled() {
    if (!hasChromeStorage()) return [];
    const key = await getDisabledStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        if (chrome.runtime?.lastError) {
          resolve([]);
          return;
        }
        const raw = Array.isArray(items[key]) ? items[key] : [];
        resolve([...new Set(raw.map(normalizeRequestKey))]);
      });
    });
  }

  async function addMonitorDisabled(entry) {
    if (!hasChromeStorage()) return;
    const key = await getDisabledStorageKey();
    const list = await getMonitorDisabled();
    const keyStr = normalizeRequestKey(typeof entry === 'string' ? entry : (entry && entry.key));
    if (!keyStr || list.includes(keyStr)) return list;
    list.push(keyStr);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: list }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(list);
      });
    });
  }

  async function removeMonitorDisabled(keyStr) {
    if (!hasChromeStorage()) return [];
    const key = await getDisabledStorageKey();
    const list = await getMonitorDisabled();
    const normalizedKey = normalizeRequestKey(keyStr);
    const filtered = list.filter(k => normalizeRequestKey(k) !== normalizedKey);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: filtered }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(filtered);
      });
    });
  }

  // 读取接口 Mock 总开关。默认 true（未写入过视为启用），保证存量用户行为不变。
  async function getMockEnabled() {
    if (!hasChromeStorage()) return true;
    return new Promise((resolve) => {
      chrome.storage.local.get(MOCK_ENABLED_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(true);
          return;
        }
        resolve(items[MOCK_ENABLED_KEY] !== false);
      });
    });
  }

  // 写入接口 Mock 总开关，返回最终生效值。
  async function setMockEnabled(enabled) {
    const value = enabled !== false;
    if (!hasChromeStorage()) return value;
    return new Promise((resolve) => {
      chrome.storage.local.set({ [MOCK_ENABLED_KEY]: value }, () => {
        resolve(value);
      });
    });
  }

  ns.mockStorage = {
    getMockRules,
    saveMockRule,
    deleteMockRule,
    toggleMockRule,
    resolveImportConflict,
    clearMockRules,
    getMockRule,
    getMonitorDisabled,
    addMonitorDisabled,
    removeMonitorDisabled,
    getMockEnabled,
    setMockEnabled,
  };
})();


/* ===== src/common/mock-generator.js ===== */
/* 内部开发工具箱 — Mock 数据生成器 */
/* 从真实数据推断 Schema，智能生成假数据（参考 Faker.js 思路）*/
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  // ========== 数据库 ==========

  // 中文姓氏（百家姓前100个）
  const SURNAMES = [
    '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴',
    '徐', '孙', '朱', '马', '胡', '郭', '林', '何', '高', '梁',
    '郑', '罗', '宋', '谢', '唐', '韩', '曹', '许', '邓', '萧',
    '冯', '曾', '程', '蔡', '彭', '潘', '袁', '于', '董', '余',
    '苏', '叶', '吕', '魏', '蒋', '田', '杜', '丁', '沈', '姜'
  ];

  // 中文名字
  const GIVEN_NAMES = [
    '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军',
    '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞',
    '平', '刚', '桂英', '华', '建华', '建国', '秀云', '梅', '英', '雪'
  ];

  // 城市
  const CITIES = [
    '北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市',
    '武汉市', '西安市', '南京市', '重庆市', '天津市', '苏州市',
    '长沙市', '郑州市', '沈阳市', '青岛市', '宁波市', '东莞市'
  ];

  // 街道
  const STREETS = [
    '人民路', '解放路', '建设路', '中山路', '和平路', '新华路',
    '光明路', '胜利路', '朝阳路', '幸福路', '文化路', '友谊路'
  ];

  // 公司类型
  const COMPANY_TYPES = [
    '科技有限公司', '网络科技有限公司', '信息技术有限公司',
    '软件开发有限公司', '电子商务有限公司', '文化传媒有限公司',
    '咨询有限公司', '实业有限公司', '贸易有限公司'
  ];

  // 公司前缀
  const COMPANY_PREFIXES = [
    '阿里', '腾讯', '百度', '华为', '小米', '京东', '美团', '字节',
    '滴滴', '快手', '拼多多', '网易', '新浪', '搜狐', '携程', '去哪儿'
  ];

  // Lorem Ipsum 中文
  const LOREM_WORDS = [
    '的', '是', '在', '了', '和', '有', '我', '他', '不', '人',
    '都', '一', '个', '上', '也', '很', '到', '说', '要', '去',
    '就', '得', '可', '以', '会', '能', '好', '看', '时', '地'
  ];

  // ========== 工具函数 ==========

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFloat(min, max, decimals = 2) {
    const num = Math.random() * (max - min) + min;
    return parseFloat(num.toFixed(decimals));
  }

  function randomString(len = 8, chars = 'abcdefghijklmnopqrstuvwxyz0123456789') {
    return Array.from({ length: len }, () => pick(chars.split(''))).join('');
  }

  function randomBoolean() {
    return Math.random() > 0.5;
  }

  // ========== Faker 风格的生成器 ==========

  const faker = {
    // 人名
    person: {
      fullName() {
        return pick(SURNAMES) + pick(GIVEN_NAMES);
      },
      firstName() {
        return pick(GIVEN_NAMES);
      },
      lastName() {
        return pick(SURNAMES);
      },
    },

    // 互联网
    internet: {
      email() {
        const name = randomString(6, 'abcdefghijklmnopqrstuvwxyz');
        const domains = ['example.com', 'test.com', 'demo.com', 'mail.com'];
        return `${name}@${pick(domains)}`;
      },
      userName() {
        return randomString(8, 'abcdefghijklmnopqrstuvwxyz0123456789_');
      },
      password() {
        return randomString(12, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%');
      },
      url() {
        const protocols = ['http', 'https'];
        const domains = ['example.com', 'test.com', 'demo.com'];
        return `${pick(protocols)}://${pick(domains)}/${randomString(8)}`;
      },
      avatar() {
        return `https://i.pravatar.cc/150?u=${randomString(8)}`;
      },
      ipv4() {
        return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`;
      },
      color() {
        return `#${randomString(6, '0123456789abcdef')}`;
      },
    },

    // 电话
    phone: {
      number() {
        const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
                         '150', '151', '152', '153', '155', '156', '157', '158', '159',
                         '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
        return pick(prefixes) + Array.from({ length: 8 }, () => randomInt(0, 9)).join('');
      },
    },

    // 地址
    location: {
      city() {
        return pick(CITIES);
      },
      street() {
        return pick(STREETS) + randomInt(1, 999) + '号';
      },
      address() {
        return pick(CITIES) + pick(STREETS) + randomInt(1, 999) + '号';
      },
      zipCode() {
        return Array.from({ length: 6 }, () => randomInt(0, 9)).join('');
      },
      latitude() {
        return randomFloat(-90, 90, 6);
      },
      longitude() {
        return randomFloat(-180, 180, 6);
      },
    },

    // 公司
    company: {
      name() {
        return pick(COMPANY_PREFIXES) + pick(COMPANY_TYPES);
      },
      suffix() {
        return pick(COMPANY_TYPES);
      },
    },

    // 日期时间
    date: {
      past() {
        const now = Date.now();
        const year = 365 * 24 * 60 * 60 * 1000;
        return now - randomInt(0, year);
      },
      future() {
        const now = Date.now();
        const year = 365 * 24 * 60 * 60 * 1000;
        return now + randomInt(0, year);
      },
      recent() {
        const now = Date.now();
        const week = 7 * 24 * 60 * 60 * 1000;
        return now - randomInt(0, week);
      },
      timestamp() {
        return Date.now();
      },
    },

    // 数字
    number: {
      int(min = 0, max = 1000) {
        return randomInt(min, max);
      },
      float(min = 0, max = 1000, decimals = 2) {
        return randomFloat(min, max, decimals);
      },
    },

    // 文本
    lorem: {
      word() {
        return pick(LOREM_WORDS);
      },
      words(count = 3) {
        return Array.from({ length: count }, () => pick(LOREM_WORDS)).join('');
      },
      sentence() {
        const len = randomInt(5, 15);
        return Array.from({ length: len }, () => pick(LOREM_WORDS)).join('') + '。';
      },
      paragraph() {
        const sentences = randomInt(3, 6);
        return Array.from({ length: sentences }, () => faker.lorem.sentence()).join('');
      },
    },

    // 金融
    finance: {
      amount(min = 0, max = 10000, decimals = 2) {
        return randomFloat(min, max, decimals);
      },
      account() {
        return Array.from({ length: 16 }, () => randomInt(0, 9)).join('');
      },
    },

    // 图片
    image: {
      avatar() {
        return faker.internet.avatar();
      },
      url(width = 640, height = 480) {
        return `https://picsum.photos/${width}/${height}?random=${randomInt(1, 1000)}`;
      },
    },

    // UUID
    datatype: {
      uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      },
      boolean() {
        return randomBoolean();
      },
    },
  };

  // ========== Schema 推断 ==========

  function inferSchema(data, fieldName = '') {
    if (data === null || data === undefined) {
      return { type: 'null' };
    }

    const type = Array.isArray(data) ? 'array' : typeof data;

    if (type === 'array') {
      const items = data.length > 0 ? inferSchema(data[0], fieldName) : { type: 'any' };
      return { type: 'array', items, length: data.length };
    }

    if (type === 'object') {
      const properties = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          properties[key] = inferSchema(data[key], key);
        }
      }
      return { type: 'object', properties };
    }

    return { type, fieldName };
  }

  // ========== 启发式生成 ==========

  function generateByFieldName(fieldName, type) {
    const lower = (fieldName || '').toLowerCase();

    // 姓名
    if (/^name$|^username$|^user_?name$|^realname$|^real_?name$/.test(lower)) {
      return faker.person.fullName();
    }
    if (/nickname|nick_?name/.test(lower)) {
      return faker.person.fullName();
    }
    if (/first_?name|given_?name/.test(lower)) {
      return faker.person.firstName();
    }
    if (/last_?name|surname|family_?name/.test(lower)) {
      return faker.person.lastName();
    }

    // 邮箱
    if (/email|mail/.test(lower)) {
      return faker.internet.email();
    }

    // 手机号
    if (/phone|mobile|tel|cellphone/.test(lower)) {
      return faker.phone.number();
    }

    // ID
    if (/^id$|^uid$|user_?id|account_?id|customer_?id/.test(lower)) {
      return faker.number.int(1000, 999999);
    }

    // UUID
    if (/uuid|guid/.test(lower)) {
      return faker.datatype.uuid();
    }

    // URL
    if (/^url$|link|href|website/.test(lower)) {
      return faker.internet.url();
    }

    // 头像/图片
    if (/avatar|photo|image|img|pic|picture/.test(lower)) {
      return faker.internet.avatar();
    }

    // IP
    if (/^ip$|ip_?address|ipv4/.test(lower)) {
      return faker.internet.ipv4();
    }

    // 颜色
    if (/color|colour/.test(lower)) {
      return faker.internet.color();
    }

    // 时间戳
    if (/time|date|timestamp|created_?at|updated_?at|deleted_?at/.test(lower)) {
      return faker.date.timestamp();
    }

    // 地址
    if (/address|addr/.test(lower)) {
      return faker.location.address();
    }
    if (/city/.test(lower)) {
      return faker.location.city();
    }
    if (/street/.test(lower)) {
      return faker.location.street();
    }
    if (/zip|zipcode|postal/.test(lower)) {
      return faker.location.zipCode();
    }

    // 公司
    if (/company|corp|corporation|organization/.test(lower)) {
      return faker.company.name();
    }

    // 金额
    if (/amount|price|cost|fee|balance|total/.test(lower)) {
      return faker.finance.amount();
    }

    // 账号
    if (/account|card_?number|bank_?account/.test(lower)) {
      return faker.finance.account();
    }

    // 密码
    if (/password|pwd|passwd/.test(lower)) {
      return faker.internet.password();
    }

    // 描述/内容
    if (/desc|description|content|comment|remark/.test(lower)) {
      return faker.lorem.sentence();
    }

    // 标题
    if (/title|subject|heading/.test(lower)) {
      return faker.lorem.words(3);
    }

    // 经纬度
    if (/latitude|lat/.test(lower)) {
      return faker.location.latitude();
    }
    if (/longitude|lng|lon/.test(lower)) {
      return faker.location.longitude();
    }

    // 状态
    if (/status|state/.test(lower) && type === 'number') {
      return faker.number.int(0, 2);
    }

    // 布尔值
    if (/is_|has_|can_|should_|enabled|disabled|active|deleted/.test(lower) && type === 'boolean') {
      return faker.datatype.boolean();
    }

    return null;
  }

  // ========== Mock 数据生成 ==========

  function generateMockData(schema) {
    if (!schema || !schema.type) return null;

    // 尝试根据字段名生成
    const byName = generateByFieldName(schema.fieldName, schema.type);
    if (byName !== null) return byName;

    // 按类型生成
    switch (schema.type) {
      case 'string':
        return faker.lorem.words(randomInt(2, 5));

      case 'number':
        return faker.number.int(1, 1000);

      case 'boolean':
        return faker.datatype.boolean();

      case 'array':
        const arrayLen = schema.length || randomInt(1, 5);
        return Array.from({ length: arrayLen }, () => generateMockData(schema.items));

      case 'object':
        const obj = {};
        for (const key in schema.properties) {
          if (schema.properties.hasOwnProperty(key)) {
            const propSchema = schema.properties[key];
            obj[key] = generateMockData({ ...propSchema, fieldName: key });
          }
        }
        return obj;

      case 'null':
        return null;

      default:
        return null;
    }
  }

  // 导出
  ns.mockGenerator = {
    inferSchema,
    generateMockData,
    generateByFieldName,
    faker, // 暴露 faker 对象供高级用户使用
  };
})();


/* ===== src/background/cookies.js ===== */
/* 内部开发工具箱 — Background Cookie 读取 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  function hasCookiesApi() {
    return typeof chrome !== 'undefined' && Boolean(chrome.cookies);
  }

  async function getWafCookies() {
    return getWafCookiesForUrl(commonNs.currentProject.getBaseUrl());
  }

  // 按目标 URL 读取 WAF Cookie（用于向租户域名发起 client API 请求）
  async function getWafCookiesForUrl(targetUrl, cookieKeys = commonNs.currentProject.getCookieKeys()) {
    if (!hasCookiesApi()) return '';
    if (!targetUrl) return '';
    const pairs = [];
    for (const name of cookieKeys) {
      try {
        const cookie = await chrome.cookies.get({ url: targetUrl, name });
        if (cookie && cookie.value) {
          pairs.push(`${cookie.name}=${cookie.value}`);
        }
      } catch (_) {
        // ignore
      }
    }
    return pairs.join('; ');
  }

  ns.cookies = { getWafCookies, getWafCookiesForUrl };
})();


/* ===== src/background/admin-token-injection.js ===== */
/* 内部开发工具箱 — 后台账号 Token 注入当前标签页 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  function httpOrigin(value) {
    try {
      const url = new URL(String(value || ''));
      return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
    } catch (_) {
      return '';
    }
  }

  async function injectActiveTab({ token, siteToken, userInfo, origin }) {
    const cleanToken = String(token || '').replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) throw new Error('尚未获取后台 Token，请先登录或填写 Token');
    const loginOrigin = httpOrigin(origin);
    if (!loginOrigin) throw new Error('登录域名无效，请检查后台 API 地址');
    if (!chrome.tabs?.query || !chrome.scripting?.executeScript) {
      throw new Error('当前环境不支持向网站注入 Token');
    }

    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs.find((item) => item.id && item.active);
    if (!tab) return { injected: false, reason: 'no-active-tab' };
    const targetOrigin = httpOrigin(tab.pendingUrl || tab.url);
    if (!targetOrigin) return { injected: false, reason: 'unsupported-page' };
    if (targetOrigin !== loginOrigin) {
      return { injected: false, reason: 'origin-mismatch', loginOrigin };
    }

    // 网站的请求拦截器直接读取 localStorage.token 作为 Authorization。
    // 登录响应提供 accessToken 时保留原格式；旧记录和手填 Token 补上 Bearer 前缀。
    const storedSiteToken = String(siteToken || '').trim();
    const sessionToken = storedSiteToken.replace(/^Bearer\s+/i, '').trim() === cleanToken
      ? storedSiteToken
      : `Bearer ${cleanToken}`;
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      world: 'MAIN',
      func: (expectedOrigin, sessionToken, cleanToken, userInfo) => {
        // 查询标签页后可能发生导航，写入前必须在页面中再次确认域名。
        if (window.location.origin !== expectedOrigin) {
          return { injected: false, reason: 'page-changed' };
        }
        const previousToken = (localStorage.getItem('token') || '').replace(/^Bearer\s+/i, '').trim();
        const hasUserInfo = (value) => value && typeof value === 'object' &&
          !Array.isArray(value) && Object.keys(value).length > 0;
        let sessionUserInfo = userInfo;
        if (!hasUserInfo(sessionUserInfo) && previousToken === cleanToken) {
          // 旧记录缺少用户信息时，只能复用网站上属于同一个 Token 的现有信息。
          try {
            sessionUserInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
          } catch (_) {}
        }
        // 网站的登录检查还会读取 userInfo。缺失时不能只写 Token 后误报成功，
        // 也不能覆盖网站原有账号的登录状态。
        if (!hasUserInfo(sessionUserInfo)) return { injected: false, reason: 'missing-user-info' };
        localStorage.setItem('token', sessionToken);
        localStorage.setItem('userInfo', JSON.stringify(sessionUserInfo));
        window.location.assign(`${window.location.origin}/`);
        return { injected: true };
      },
      args: [targetOrigin, sessionToken, cleanToken, userInfo || null],
    });
    const result = results?.find((item) => item.frameId === 0)?.result;
    if (!result) throw new Error('网站未完成 Token 注入，请重试');
    if (result.reason === 'missing-user-info') {
      throw new Error('当前 Token 缺少用户信息，请先点击「登录」重新登录，再注入网站');
    }
    return { ...result, tabId: tab.id };
  }

  async function autoInject(state) {
    try {
      return await injectActiveTab(state);
    } catch (error) {
      // 登录和保存已完成，页面注入失败不应要求用户重新验证登录。
      return { injected: false, error: error.message || '自动注入失败' };
    }
  }

  async function injectStoredToken({ projectId, baseUrl } = {}) {
    const state = await commonNs.token.getToken(projectId);
    const result = await injectActiveTab({
      ...state,
      origin: state.origin || baseUrl || commonNs.currentProject.getBaseUrl(),
    });
    if (!result.injected) {
      const errors = {
        'no-active-tab': '未找到当前激活的网站',
        'unsupported-page': '当前页面不支持注入，请打开 HTTP(S) 网站',
        'origin-mismatch': `当前网站与登录域名不一致，请切换到 ${result.loginOrigin} 后重试`,
        'page-changed': '当前网站已发生跳转，请确认页面后重试',
      };
      throw new Error(errors[result.reason] || 'Token 注入失败');
    }
    return result;
  }

  ns.adminTokenInjection = { autoInject, injectStoredToken };
})();


/* ===== src/background/api.js ===== */
/* 内部开发工具箱 — Background API 登录 */
/* 跨域调用后台登录接口，负责：验证码获取、密码加密、登录、token 解析与保存。 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  // 默认密码加密：SHA-256（64 位小写 hex）。
  // 若后台使用其他算法（如加盐、MD5、RSA、SM3 等），请替换此函数。
  async function encryptPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function getLoginContext(options = {}) {
    const projectId = options.projectId || commonNs.currentProject.getCachedProjectId();
    const project = commonNs.projects?.getById(projectId);
    if (options.projectId && !project?.enabledFeatures.includes('adminPanel')) throw new Error('该项目不支持后台登录');
    return {
      projectId,
      baseUrl: commonNs.adminLoginHistory.normalizeBaseUrl(options.baseUrl || commonNs.currentProject.getBaseUrl()),
      authPath: project?.authPath || commonNs.currentProject.getAuthPath(),
      cookieKeys: [...(project?.cookieKeys || commonNs.currentProject.getCookieKeys())],
    };
  }

  async function postJson(path, body, context = getLoginContext()) {
    const { baseUrl, authPath, cookieKeys } = context;
    const url = `${baseUrl}${authPath}${path}`;
    const cookieHeader = await ns.cookies.getWafCookiesForUrl(baseUrl, cookieKeys);
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Origin: baseUrl,
      Referer: `${baseUrl}/login`,
    };
    if (cookieHeader) headers.Cookie = cookieHeader;

    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let extra = '';
      try {
        extra = await res.text();
      } catch (_) {}
      throw new Error(`HTTP ${res.status}: ${res.statusText}${extra ? ' | ' + extra.slice(0, 200) : ''}`);
    }

    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (_) {
      return { _raw: text };
    }
  }

  // 优先取 getCaptcha 返回的 data.blockX，缺失时沿用兼容值 212。
  async function getCaptcha(context) {
    return postJson('/getCaptcha', {}, context);
  }

  function extractTicket(captcha) {
    if (!captcha || typeof captcha !== 'object') return '';
    const data = captcha.data ?? captcha.result ?? captcha;
    return data?.ticket || data?.uuid || data?.captchaKey || data?.key || '';
  }

  function extractMoveLength(captcha, fallback = 212) {
    if (!captcha || typeof captcha !== 'object') return fallback;
    const data = captcha.data ?? captcha.result ?? captcha;
    return data?.blockX ?? data?.moveLength ?? data?.width ?? data?.x ?? data?.offset ?? fallback;
  }

  async function login(account, passwordHash, captcha, context) {
    const ticket = extractTicket(captcha);
    const moveLength = extractMoveLength(captcha);

    const body = {
      mobile: String(account),
      ticket: String(ticket),
      moveLength: String(moveLength),
      password: passwordHash,
    };

    return postJson('/login', body, context);
  }

  async function valid(account, passwordHash, code, context) {
    const body = {
      mobile: String(account),
      code: String(code),
      password: passwordHash,
    };
    return postJson('/valid', body, context);
  }

  function assertResponseSuccess(response, fallback) {
    if (!response || typeof response !== 'object' || response._raw != null) {
      throw new Error(fallback);
    }
    const failed = [false, 0, '0', 'false'].includes(response.success);
    const code = response.code == null ? null : Number(response.code);
    const codeFailed = code != null && code !== 0 && !(code >= 200 && code < 400);
    if (failed || codeFailed) {
      throw new Error(extractErrorMessage(response) || fallback);
    }
  }

  function isCodeSent(response) {
    if (!response || typeof response !== 'object') return false;
    // /login 成功但没有 Token 时，让面板等待用户输入验证码。
    if (Number(response.code) === 200 || response.code === 0 ||
        [true, 1, '1', 'true'].includes(response.success)) return true;
    const msg = extractErrorMessage(response) || (typeof response.data === 'string' ? response.data : '');
    return /已发送|已發送|已下发|请输入.*验证码|請輸入.*驗證碼|code.*sent|sent.*code/i.test(msg);
  }
  // 兼容常见 token 返回结构，并去除可能自带的 Bearer 前缀
  function extractToken(response) {
    if (!response || typeof response !== 'object') return '';
    const data = response.data ?? response.result ?? response;
    let token = '';
    if (typeof data === 'string') {
      // 普通字符串可能是“验证码已发送”，不能因此跳过验证码步骤。
      // 纯字符串仅兼容明确的 Bearer 凭证或三段式 JWT。
      if (/^(?:Bearer\s+\S+|[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i.test(data.trim())) {
        token = data;
      }
    } else {
      token = (
        data?.token ||
        data?.accessToken ||
        data?.access_token ||
        data?.authorization ||
        data?.jwt ||
        ''
      );
    }
    return typeof token === 'string' ? token.replace(/^Bearer\s+/i, '').trim() : '';
  }

  function extractErrorMessage(response) {
    if (!response || typeof response !== 'object') return '';
    return String(response.msg || response.message || response.error || response.errorMessage || '');
  }

  // 通过公共 token 模块写入命名空间键 adminToken:${projectId}，
  // 与 popup/content/tenant-api 的读写键保持一致。
  // 注意：旧实现直接写非命名空间键 adminToken，会导致非默认项目的 token 丢失、
  // 且 popup 在 SW 重启迁移前看不到新 token。
  async function saveToken(token, projectId, details) {
    return commonNs.token.saveToken(token, projectId, details);
  }

  async function completeLogin(token, response, context) {
    const data = response.data ?? response.result ?? response;
    const userInfo = data && typeof data === 'object' && !Array.isArray(data) ? data : null;
    const siteToken = typeof userInfo?.accessToken === 'string'
      ? userInfo.accessToken.trim()
      : `Bearer ${token}`;
    const { tokenState, session } = await commonNs.adminLoginHistory.activate({
      account: context.account, password: context.password, baseUrl: context.baseUrl,
      token, siteToken, userInfo, updatedAt: Date.now(),
    }, context.projectId);
    const injection = await ns.adminTokenInjection.autoInject(tokenState);
    return { token, injection, session };
  }

  async function doLogin({ account, password, projectId, baseUrl } = {}) {
    if (!account || !password) {
      throw new Error('请输入账号和密码');
    }

    const context = { ...getLoginContext({ projectId, baseUrl }), account: String(account).trim(), password: String(password) };
    const captcha = await getCaptcha(context);
    assertResponseSuccess(captcha, '获取验证码失败');
    if (!extractTicket(captcha)) throw new Error('getCaptcha 未返回 ticket');
    const passwordHash = await encryptPassword(password);

    // 1. 调 /login 触发验证码下发
    const loginRes = await login(account, passwordHash, captcha, context);
    assertResponseSuccess(loginRes, '登录失败');
    const token = extractToken(loginRes);

    // 2. 返回本次登录的信息，由面板弹窗收集验证码；不持久化待验证信息。
    if (!token && isCodeSent(loginRes)) {
      return {
        requiresVerification: true,
        verification: { ...context, account: String(account), passwordHash },
      };
    }

    if (!token) {
      const msg = extractErrorMessage(loginRes);
      throw new Error(msg ? `登录失败: ${msg}` : '登录接口未返回 token');
    }

    return completeLogin(token, loginRes, context);
  }

  async function verifyLogin({ verification, code } = {}) {
    const inputCode = String(code || '').trim();
    if (!inputCode) throw new Error('请输入验证码');
    if (!verification?.account || !verification.password || !verification.passwordHash || !verification.projectId ||
        !verification.baseUrl || !verification.authPath || !Array.isArray(verification.cookieKeys)) {
      throw new Error('登录信息已失效，请重新登录');
    }
    const validRes = await valid(verification.account, verification.passwordHash, inputCode, verification);
    assertResponseSuccess(validRes, '验证码验证失败');
    const token = extractToken(validRes);
    if (!token) throw new Error(extractErrorMessage(validRes) || '验证接口未返回 Token');
    return completeLogin(token, validRes, verification);
  }

  async function isHistoryTokenValid(record, context) {
    const expiresAt = commonNs.adminLoginHistory.tokenExpiresAt(record.token);
    if (expiresAt != null) return expiresAt > Date.now();
    const paths = commonNs.projects?.getById(context.projectId)?.tenantApiPaths || commonNs.currentProject.getTenantApiPaths();
    if (!paths.tenantPage) throw new Error('当前项目未配置 Token 验证接口');
    const cookieHeader = await ns.cookies.getWafCookiesForUrl(context.baseUrl, context.cookieKeys);
    const response = await fetch(`${context.baseUrl}${paths.tenantPage}`, {
      method: 'POST', credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${record.token.replace(/^Bearer\s+/i, '').trim()}`,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ current: 1, size: 1 }),
    });
    if (response.status === 401) return false;
    if (!response.ok) throw new Error(`无法验证 Token：HTTP ${response.status}，请稍后重试`);
    let data;
    try { data = JSON.parse(await response.text()); }
    catch (_) { throw new Error('无法验证 Token：后台未返回有效数据，请检查 API 地址'); }
    if (Number(data.code) === 401 || /token.*(?:过期|失效|无效)|(?:过期|失效|无效).*token|未登录|登录.*(?:过期|失效)|unauthorized|token.*expired/i.test(extractErrorMessage(data))) return false;
    assertResponseSuccess(data, '无法验证 Token，请稍后重试');
    if (data.code == null && data.success == null) throw new Error('无法验证 Token：后台未返回验证结果');
    return true;
  }

  async function applyHistory({ id, projectId = commonNs.currentProject.getCachedProjectId() } = {}) {
    const record = await commonNs.adminLoginHistory.getRecord(id, projectId);
    const context = getLoginContext({ projectId, baseUrl: record.baseUrl });
    if (!(await isHistoryTokenValid(record, context))) {
      return doLogin({ account: record.account, password: record.password, projectId, baseUrl: record.baseUrl });
    }
    const { tokenState, session } = await commonNs.adminLoginHistory.activate(record, projectId);
    return { token: tokenState.token, session, reused: true };
  }

  ns.api = { doLogin, verifyLogin, applyHistory, isHistoryTokenValid, encryptPassword, getCaptcha, login, valid, extractToken, saveToken };
})();


/* ===== src/background/tenant-api.js ===== */
/* 内部开发工具箱 — Background 租户/用户/部门跨域 API */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  async function getToken() {
    const tokenData = await commonNs.token.getToken();
    let token = tokenData.token || '';
    token = token.replace(/^Bearer\s+/i, '').trim();
    return token;
  }

  function redact(value) {
    return String(value || '')
      .replace(/("(?:token|accessToken|authorization|jwt)"\s*:\s*")[^"]*(")/gi, '$1<redacted>$2')
      .replace(/(Bearer\s+)[^\s&"']+/gi, '$1<redacted>')
      .replace(/((?:token|accessToken|authorization|jwt)[=:\s]+)[^\s&"']+/gi, '$1<redacted>');
  }

  function isBusinessSuccess(json) {
    if (!json || typeof json !== 'object') return false;
    // 部分接口会同时返回 HTTP 200 / code=200 与 success=false；显式失败优先，
    // 避免把 token 失效或参数错误当成可用数据继续流转。
    if (json.success === false || json.success === 0 || json.success === '0' || json.success === 'false') return false;
    const code = Number(json.code);
    return json.success === true || json.success === 1 || json.success === '1' || json.success === 'true' ||
      code === 0 || (Number.isFinite(code) && code >= 200 && code < 400);
  }

  async function fetchAdminJson(path, body, { referer } = {}) {
    const sessionId = (await commonNs.adminLoginHistory?.getSession())?.id || '';
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const token = await getToken();
    if (!token) throw new Error('未获取 admin token，请先登录');

    const finalReferer = referer || `${baseUrl}/tenant`;
    const cookieHeader = ns.cookies.getWafCookiesForUrl
      ? await ns.cookies.getWafCookiesForUrl(baseUrl)
      : await ns.cookies.getWafCookies();
    if (sessionId !== ((await commonNs.adminLoginHistory?.getSession())?.id || '')) {
      throw new Error('后台账号已切换，请重新查询');
    }
    if (!cookieHeader) {
      console.warn(`[内部开发工具箱] 未读取到 WAF Cookie，请先在浏览器中打开 ${baseUrl} 完成一次登录`);
    }

    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: baseUrl,
      Referer: finalReferer,
    };
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    console.log('[内部开发工具箱] 后台请求:', path, 'cookie:', cookieHeader ? '有' : '无');

    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let extra = '';
      try { extra = await res.text(); } catch (_) {}
      throw new Error(`HTTP ${res.status}: ${res.statusText}${extra ? ' | ' + redact(extra).slice(0, 200) : ''}`);
    }

    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; }
    catch (_) {
      // 非 JSON 响应：通常是被 WAF 拦截（挑战页 / 登录页 HTML）
      throw new Error(`非 JSON 响应（疑似被 WAF 拦截，请先在浏览器打开 ${baseUrl} 完成登录）`);
    }

    // 业务层错误：HTTP 200 但 code != 200 / success === false（如 token 失效）
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const bizOk = isBusinessSuccess(json);
    if (!bizOk) {
      const msg = redact(helpers?.extractErrorMessage?.(json) || `code=${json?.code ?? '?'} success=${json?.success ?? '?'}`);
      throw new Error(`接口返回失败: ${msg}`);
    }
    return json;
  }

  async function fetchTenantPage(opts) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const body = (ns.tenant || globalThis.InternalDevToolkit?.tenant)?.buildTenantPageBody(opts) || opts;
    return fetchAdminJson(paths.tenantPage, body, { referer: `${baseUrl}/tenant?rBK=52` });
  }

  async function fetchDeptList(opts) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const body = (ns.tenant || globalThis.InternalDevToolkit?.tenant)?.buildDeptListBody(opts) || opts;
    return fetchAdminJson(paths.deptList, body, { referer: `${baseUrl}/tenant/user?tenantId=${opts.tenantId}&industry=${opts.industry || 1}` });
  }

  async function fetchUserPage(opts) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const body = (ns.tenant || globalThis.InternalDevToolkit?.tenant)?.buildUserPageBody(opts) || opts;
    return fetchAdminJson(paths.userPage, body, { referer: `${baseUrl}/tenant/user?tenantId=${opts.tenantId}&industry=${opts.industry || 1}` });
  }

  async function fetchAccountPage(opts = {}) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildAccountPageBody(opts) || opts;
    return fetchAdminJson(paths.accountPage || paths.accountUserPage || '/huayun-ai/admin/tenant/user/account/page', body, {
      referer: `${baseUrl}/account?rBK=12`,
    });
  }

  async function quickLogin(opts) {
    const paths = commonNs.currentProject.getTenantApiPaths();
    const baseUrl = commonNs.currentProject.getBaseUrl();
    const body = (ns.tenant || globalThis.InternalDevToolkit?.tenant)?.buildQuickLoginBody({ id: opts.id }) || { id: opts.id };
    const res = await fetchAdminJson(paths.virtualLogin, body, { referer: `${baseUrl}/tenant/user?tenantId=${opts.tenantId || ''}&industry=${opts.industry || 1}` });
    console.log('[内部开发工具箱] virtualLogin 完成:', Boolean(res?.data));
    return res;
  }

  // ── Client 端 API（教师/学生/班级） ──
  // 这些接口走用户态域名（如 https://uuu.huayungpt.com），而非 admin 域名。
  // Client API 只接受 virtualLogin 返回的 AI 平台 token，绝不回落后台 token。

  async function fetchClientJson(origin, path, body, { referer, aiToken } = {}) {
    const token = aiToken ? String(aiToken).replace(/^Bearer\s+/i, '').trim() : '';
    if (!token) throw new Error('未获取 AI 平台 token，请先选中账号');
    const cleanOrigin = String(origin || '').replace(/\/+$/, '');
    if (!cleanOrigin) throw new Error('缺少目标域名');

    const cookieHeader = ns.cookies.getWafCookiesForUrl
      ? await ns.cookies.getWafCookiesForUrl(cleanOrigin)
      : await ns.cookies.getWafCookies();
    const finalReferer = referer || `${cleanOrigin}/`;

    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: cleanOrigin,
      Referer: finalReferer,
    };
    if (cookieHeader) {
      headers.Cookie = cookieHeader;
    }

    console.log('[内部开发工具箱] Client API 请求:', `${cleanOrigin}${path}`);

    const url = `${cleanOrigin}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let extra = '';
      try { extra = await res.text(); } catch (_) {}
      throw new Error(`HTTP ${res.status}: ${res.statusText}${extra ? ' | ' + redact(extra).slice(0, 200) : ''}`);
    }

    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; }
    catch (_) {
      throw new Error('非 JSON 响应（请检查 AI 平台会话或 WAF Cookie）');
    }

    const bizOk = isBusinessSuccess(json);
    if (!bizOk) {
      const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
      const msg = redact(helpers?.extractErrorMessage?.(json) || `code=${json?.code ?? '?'} success=${json?.success ?? '?'}`);
      throw new Error(`接口返回失败: ${msg}`);
    }
    return json;
  }

  // 外部应用列表：与 AI 平台侧边栏的 getOtherAppList 保持一致。
  async function fetchOtherAppList({ origin, aiToken }) {
    return fetchClientJson(origin, '/huayun-ai/client/other/app/list', {}, { aiToken });
  }

  // 教师列表：/client/teacher/page
  async function fetchTeacherPage({ origin, aiToken, current = 1, size = 10, name = '', account = '', phone = '' }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildTeacherPageBody({ current, size, name, account, phone }) || { current, size };
    return fetchClientJson(origin, '/huayun-ai/client/teacher/page', body, {
      referer: `${origin}/v2/tenant/teamManagement/teacher`,
      aiToken,
    });
  }

  // 学生列表：/client/student/page
  async function fetchStudentPage({ origin, aiToken, current = 1, size = 10, name = '', code = '', account = '', className = '', clazzId = '', clazzIds = [] }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildStudentPageBody({ current, size, name, code, account, className, clazzId, clazzIds }) || { current, size };
    return fetchClientJson(origin, '/huayun-ai/client/student/page', body, {
      referer: `${origin}/v2/tenant/teamManagement/student`,
      aiToken,
    });
  }

  // 学期列表：/client/semester/page
  async function fetchSemesterPage({ origin, aiToken, current = 1, size = 999 }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildSemesterPageBody({ current, size }) || { current, size };
    return fetchClientJson(origin, '/huayun-ai/client/semester/page', body, {
      referer: `${origin}/v2/tenant/teamManagement/administration`,
      aiToken,
    });
  }

  // 教师详情：/client/teacher/detail
  async function fetchTeacherDetail({ origin, aiToken, id }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildTeacherDetailBody({ id }) || { id: String(id) };
    return fetchClientJson(origin, '/huayun-ai/client/teacher/detail', body, {
      referer: `${origin}/v2/tenant/teamManagement/teacher`,
      aiToken,
    });
  }

  // 年级/学段/班级树：/client/schoolDept/tree（semesterId 为空时不传）
  async function fetchSchoolDeptTree({ origin, aiToken, semesterId = '' }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildSchoolDeptTreeBody({ semesterId }) || {};
    return fetchClientJson(origin, '/huayun-ai/client/schoolDept/tree', body, {
      referer: `${origin}/v2/tenant/teamManagement/teacher`,
      aiToken,
    });
  }

  // 班级对应教师：/client/schoolManageTeacher/listByClazz
  async function fetchClassTeachers({ origin, aiToken, semesterId = '' }) {
    const helpers = (ns.tenant || globalThis.InternalDevToolkit?.tenant);
    const body = helpers?.buildClazzTeacherListBody({ semesterId }) || {};
    return fetchClientJson(origin, '/huayun-ai/client/schoolManageTeacher/listByClazz', body, {
      referer: `${origin}/v2/tenant/teamManagement/administration`,
      aiToken,
    });
  }

  ns.tenantApi = {
    fetchTenantPage, fetchDeptList, fetchUserPage, fetchAccountPage,
    fetchAccountUserPage: fetchAccountPage,
    quickLogin,
    fetchOtherAppList, fetchTeacherPage, fetchStudentPage, fetchSemesterPage,
    fetchTeacherDetail, fetchSchoolDeptTree, fetchClassTeachers,
  };
})();


/* ===== src/background/quick-login.js ===== */
/* 内部开发工具箱 — Background 快捷登录执行 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  const RECENT_KEY_PREFIX = 'quickLoginRecent';
  const MAX_RECENT = 10;

  function normalizeEnv(env) {
    return env === 'local' || env === 'dev' ? 'local' : 'online';
  }

  function validLocalPort(value) {
    const raw = String(value || '').trim();
    if (!/^\d+$/.test(raw)) return '';
    const n = Number.parseInt(raw, 10);
    return Number.isInteger(n) && n >= 1 && n <= 65535 ? String(n) : '';
  }

  function normalizeLocalPort(value, fallback = '8088') {
    return validLocalPort(value) || validLocalPort(fallback) || '8088';
  }

  function normalizePort(env, localPort) {
    return normalizeEnv(env) === 'local' ? normalizeLocalPort(localPort) : validLocalPort(localPort);
  }

  function recentIdentityKey(record = {}) {
    return [
      String(record.tenantId || ''),
      String(record.id || ''),
      record.role === 'student' ? 'student' : 'teacher',
    ].join('|');
  }

  function sameRecentIdentity(left = {}, right = {}) {
    return recentIdentityKey(left) === recentIdentityKey(right);
  }

  // 最近记录只保存可重新定位用户所需的元数据；兼容清理旧版本可能落盘的 token/url。
  function normalizeRecentRecord(record = {}, fallbackLocalPort = '8088') {
    const metadata = {};
    Object.entries(record || {}).forEach(([key, value]) => {
      // 兼容清理旧版本可能保存的各种凭据、URL、响应或会话字段，避免只依赖固定字段名。
      if (/(token|authorization|jwt|password|secret|url|origin|session)/i.test(key)) return;
      metadata[key] = value;
    });
    return {
      ...metadata,
      env: normalizeEnv(metadata.env),
      // 环境切换是每条记录的 UI 状态。即使当前为线上，也保留最近一次有效本地端口。
      localPort: normalizeLocalPort(metadata.localPort, fallbackLocalPort),
      role: metadata.role === 'student' ? 'student' : 'teacher',
    };
  }

  function compactRecentRecords(records = []) {
    const source = Array.isArray(records) ? records : [];
    const localPorts = new Map();
    source.forEach((record) => {
      const normalized = normalizeRecentRecord(record);
      const explicitPort = validLocalPort(record?.localPort);
      const key = recentIdentityKey(normalized);
      if (explicitPort && !localPorts.has(key)) localPorts.set(key, explicitPort);
    });

    const seen = new Set();
    const compacted = [];
    source.forEach((record) => {
      const initial = normalizeRecentRecord(record);
      const key = recentIdentityKey(initial);
      if (seen.has(key)) return;
      seen.add(key);
      compacted.push(normalizeRecentRecord(record, localPorts.get(key)));
    });
    return compacted.slice(0, MAX_RECENT);
  }

  async function getStorageKey() {
    const projectId = await commonNs.currentProject.getCurrentProjectId();
    return `${RECENT_KEY_PREFIX}:${projectId}`;
  }

  function extractVirtualLoginUrl(response) {
    if (typeof response === 'string') return response;
    const value = response?.data;
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      for (const key of ['url', 'loginUrl', 'redirectUrl']) {
        if (typeof value[key] === 'string') return value[key];
      }
    }
    const result = response?.result;
    if (typeof result === 'string') return result;
    if (result && typeof result === 'object') {
      for (const key of ['url', 'loginUrl', 'redirectUrl']) {
        if (typeof result[key] === 'string') return result[key];
      }
    }
    for (const key of ['url', 'loginUrl', 'redirectUrl']) {
      if (typeof response?.[key] === 'string') return response[key];
    }
    return '';
  }

  async function quickLogin({ tenantId, id, tenantName = '', userName = '', domain = '', industry = '', env = 'online', localPort = '', role = 'teacher' }) {
    if (!id) throw new Error('缺少 id');
    if (!tenantId) throw new Error('缺少 tenantId');
    if (!ns.tenantApi) throw new Error('tenantApi 模块未加载');

    const adminContextId = (await commonNs.adminLoginHistory?.getSession())?.id || '';
    const res = await ns.tenantApi.quickLogin({ tenantId, id, industry });
    const url = extractVirtualLoginUrl(res);
    if (!url || typeof url !== 'string') {
      throw new Error('virtualLogin 未返回有效 URL');
    }

    const normalizedEnv = normalizeEnv(env);
    const normalizedPort = normalizePort(normalizedEnv, localPort);
    const projectId = await commonNs.currentProject.getCurrentProjectId();
    await recordRecent({ tenantId: String(tenantId), tenantName, id: String(id), userName, domain, industry, role, env: normalizedEnv, localPort: normalizedPort, projectId, ...(adminContextId ? { adminContextId } : {}) });
    return { ok: true, url, tenantId, id };
  }

  // 仅获取选中用户的会话（virtualLogin → 解析 origin + AI token），不记录最近登录
  async function resolveUserSession({ tenantId, id, industry }) {
    if (!id) throw new Error('缺少 id');
    if (!tenantId) throw new Error('缺少 tenantId');
    if (!ns.tenantApi) throw new Error('tenantApi 模块未加载');

    const res = await ns.tenantApi.quickLogin({ tenantId, id, industry });
    const url = extractVirtualLoginUrl(res);
    if (!url || typeof url !== 'string') {
      throw new Error('virtualLogin 未返回有效 URL');
    }
    const helpers = globalThis.InternalDevToolkit?.tenant;
    const parsed = helpers?.parseVirtualLoginUrl
      ? helpers.parseVirtualLoginUrl(url)
      : { url, origin: '', token: '' };
    if (!parsed.origin || !parsed.token) {
      throw new Error('未能从登录链接中解析 AI 平台 origin/token');
    }
    return { url, origin: parsed.origin, aiToken: parsed.token };
  }

  function httpOrigin(value) {
    try {
      const url = new URL(String(value || ''));
      return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
    } catch (_) {
      return '';
    }
  }

  function queryTabs(queryInfo) {
    return new Promise((resolve) => {
      try {
        chrome.tabs.query(queryInfo, (tabs) => {
          // 查询失败（无窗口、权限受限）只影响「能否复用当前标签页」，不应让打开操作失败。
          if (chrome.runtime?.lastError) resolve([]);
          else resolve(Array.isArray(tabs) ? tabs : []);
        });
      } catch (_) {
        resolve([]);
      }
    });
  }

  // 当前标签页与目标同源（协议 + 域名 + 端口全部一致）时，说明用户正停在同一环境：
  // 线上停在该租户线上域名，或本地停在同一端口的开发页。此时原地跳转比新开标签页更符合预期。
  async function findSameOriginActiveTab(origin) {
    if (!origin || !chrome.tabs?.query) return null;
    const tabs = await queryTabs({ active: true, lastFocusedWindow: true });
    return tabs.find((tab) => tab?.id && httpOrigin(tab.pendingUrl || tab.url) === origin) || null;
  }

  function updateTabUrl(tabId, url) {
    return new Promise((resolve, reject) => {
      chrome.tabs.update(tabId, { url, active: true }, (tab) => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tab);
      });
    });
  }

  function createTab(url) {
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url, active: true }, (tab) => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(tab);
      });
    });
  }

  async function openLoginUrl(url, { reuseCurrentTab = false } = {}) {
    if (!url) throw new Error('缺少 URL');
    let parsed;
    try {
      parsed = new URL(String(url));
    } catch (_) {
      throw new Error('登录地址无效');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('仅允许打开 HTTP(S) 登录地址');
    }
    if (reuseCurrentTab) {
      const tab = await findSameOriginActiveTab(parsed.origin);
      if (tab) {
        const updated = await updateTabUrl(tab.id, url);
        return { tabId: updated?.id ?? tab.id, reused: true };
      }
    }
    const created = await createTab(url);
    return { tabId: created?.id, reused: false };
  }

  async function recordRecent(item) {
    if (!item) return;
    const key = await getStorageKey();
    const records = await getRecent();
    const initial = normalizeRecentRecord(item);
    const previous = records.find((record) => sameRecentIdentity(record, initial));
    const normalizedItem = normalizeRecentRecord(item, previous?.localPort);
    const adminContextId = (await commonNs.adminLoginHistory?.getSession())?.id || '';
    if ((item.adminContextId || '') !== adminContextId) throw new Error('后台账号已切换，请重新查询');
    const next = [
      { ...normalizedItem, at: Date.now() },
      ...records.filter((record) => !sameRecentIdentity(record, normalizedItem)),
    ].slice(0, MAX_RECENT);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: next }, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(next);
      });
    });
  }

  // 最近记录与后台会话的关系：
  // - 切换「后台账号/域名」或项目：清空 storage，记录彻底删除（隐私与数据归属要求）。
  // - 同一账号 token 过期后自动重新登录 / 服务端重启导致扩展重载（生成新会话标识）：记录保留，
  //   会话校验仅用于拦截在途请求与恢复过期快照，历史记录不应跟着消失。
  async function getRecent() {
    const key = await getStorageKey();
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (items) => {
        const records = Array.isArray(items[key]) ? items[key] : [];
        const cleaned = compactRecentRecords(records);
        // 读取时清理旧凭据，并把旧版按环境/端口拆分的同一身份合并成一条。
        if (JSON.stringify(cleaned) !== JSON.stringify(records)) {
          chrome.storage.local.set({ [key]: cleaned }, () => resolve(cleaned));
          return;
        }
        resolve(cleaned);
      });
    });
  }

  async function deleteRecent({ tenantId, id, role = '' } = {}) {
    const key = await getStorageKey();
    const records = await getRecent();
    const filtered = records.filter((record) => {
      const sameIdentity = String(record.tenantId) === String(tenantId) && String(record.id) === String(id);
      const sameRole = !role || !record.role || record.role === role;
      return !(sameIdentity && sameRole);
    });
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: filtered }, () => {
        if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve({ ok: true });
      });
    });
  }

  ns.quickLogin = { quickLogin, resolveUserSession, openLoginUrl, getRecent, deleteRecent };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      compactRecentRecords,
      deleteRecent,
      getRecent,
      normalizeRecentRecord,
      openLoginUrl,
      recentIdentityKey,
      recordRecent,
      sameRecentIdentity,
    };
  }
})();


/* ===== src/background/other-login.js ===== */
/* 内部开发工具箱 — Background「其它」站点登录（知雀 / 高职校） */
/* 默认目标：https://high-school.huayuntiantu.com ，可通过 popup 修改网址。 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});

  const DEFAULT_SITE_URL = 'https://high-school.huayuntiantu.com';
  const API_PATH_PREFIX = '/huayun-ai';
  const CRED_KEY = 'otherLoginCredentials';
  const TOKEN_KEY = 'otherLoginToken';
  const HISTORY_KEY = 'otherLoginHistory';
  const MAX_HISTORY = 20;
  const DEFAULT_ACCOUNT = '19068529991';
  const DEFAULT_PASSWORD = 'Xx@123456';

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  // 规范化站点地址：补全协议、去掉末尾斜杠；非法输入回退默认值
  function normalizeSiteUrl(raw) {
    const input = String(raw || '').trim();
    if (!input) return DEFAULT_SITE_URL;
    let url = input;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      const parsed = new URL(url);
      // 仅保留 origin，避免 path 干扰 API 拼接
      return parsed.origin.replace(/\/+$/, '');
    } catch (_) {
      return DEFAULT_SITE_URL;
    }
  }

  function normalizeCreds(value = {}) {
    return {
      siteUrl: normalizeSiteUrl(value.siteUrl || DEFAULT_SITE_URL),
      account: typeof value.account === 'string' ? value.account : '',
      password: typeof value.password === 'string' ? value.password : '',
    };
  }

  function normalizeToken(value = {}) {
    return {
      token: typeof value.token === 'string' ? value.token : '',
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
      user: value.user && typeof value.user === 'object' ? value.user : null,
    };
  }

  function defaultCredentials() {
    return {
      siteUrl: DEFAULT_SITE_URL,
      account: DEFAULT_ACCOUNT,
      password: DEFAULT_PASSWORD,
    };
  }

  async function getCredentials() {
    if (!hasChromeStorage()) return defaultCredentials();
    return new Promise((resolve) => {
      chrome.storage.local.get(CRED_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(defaultCredentials());
          return;
        }
        const stored = normalizeCreds(items[CRED_KEY] || {});
        // 首次无存储时回填默认值，便于一键登录
        resolve({
          siteUrl: stored.siteUrl || DEFAULT_SITE_URL,
          account: stored.account || DEFAULT_ACCOUNT,
          password: stored.password || DEFAULT_PASSWORD,
        });
      });
    });
  }

  async function saveCredentials(partial) {
    const next = normalizeCreds(partial);
    if (!hasChromeStorage()) return next;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [CRED_KEY]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function getToken() {
    if (!hasChromeStorage()) return normalizeToken();
    return new Promise((resolve) => {
      chrome.storage.local.get(TOKEN_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(normalizeToken());
          return;
        }
        resolve(normalizeToken(items[TOKEN_KEY]));
      });
    });
  }

  async function saveToken(token, user = null) {
    const next = {
      token: String(token || ''),
      updatedAt: Date.now(),
      user: user && typeof user === 'object' ? user : null,
    };
    if (!hasChromeStorage()) return next;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [TOKEN_KEY]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function clearToken() {
    if (!hasChromeStorage()) return;
    return new Promise((resolve) => {
      chrome.storage.local.remove(TOKEN_KEY, () => resolve());
    });
  }

  function historyIdentity(item = {}) {
    const siteUrl = normalizeSiteUrl(item.siteUrl || DEFAULT_SITE_URL);
    const account = String(item.account || '').trim();
    return `${siteUrl}::${account}`;
  }

  function normalizeHistoryItem(item = {}) {
    const siteUrl = normalizeSiteUrl(item.siteUrl || DEFAULT_SITE_URL);
    const account = String(item.account || '').trim();
    const password = typeof item.password === 'string' ? item.password : '';
    const lastAction = item.lastAction === 'zhique' ? 'zhique' : 'enter';
    const at = typeof item.at === 'number' ? item.at : Date.now();
    const user = item.user && typeof item.user === 'object' ? item.user : null;
    return {
      siteUrl,
      account,
      password,
      lastAction,
      at,
      user,
      // 展示用冗余字段，便于列表直接渲染
      username: user?.username || item.username || '',
      tenantName: user?.tenantName || item.tenantName || '',
    };
  }

  async function getHistory() {
    if (!hasChromeStorage()) return [];
    return new Promise((resolve) => {
      chrome.storage.local.get(HISTORY_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve([]);
          return;
        }
        const raw = Array.isArray(items[HISTORY_KEY]) ? items[HISTORY_KEY] : [];
        resolve(raw.map(normalizeHistoryItem).filter((r) => r.account));
      });
    });
  }

  // 按 siteUrl + account 去重，最新操作置顶
  async function recordHistory(item) {
    const nextItem = normalizeHistoryItem(item);
    if (!nextItem.account) return getHistory();

    const records = await getHistory();
    const identity = historyIdentity(nextItem);
    const next = [
      nextItem,
      ...records.filter((r) => historyIdentity(r) !== identity),
    ].slice(0, MAX_HISTORY);

    if (!hasChromeStorage()) return next;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [HISTORY_KEY]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function deleteHistory({ siteUrl, account } = {}) {
    const identity = historyIdentity({ siteUrl, account });
    const records = await getHistory();
    const filtered = records.filter((r) => historyIdentity(r) !== identity);
    if (!hasChromeStorage()) return { ok: true, records: filtered };
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [HISTORY_KEY]: filtered }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve({ ok: true, records: filtered });
      });
    });
  }

  async function encryptPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function postJson(siteOrigin, path, body, options = {}) {
    const origin = normalizeSiteUrl(siteOrigin);
    // 默认 /huayun-ai；教师列表等接口在 /ai-university 下
    const apiPrefix = options.apiPrefix != null ? String(options.apiPrefix) : API_PATH_PREFIX;
    const cleanPath = String(path || '').startsWith('/') ? path : `/${path || ''}`;
    const url = `${origin}${apiPrefix}${cleanPath}`;
    const headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Origin: origin,
      Referer: options.referer || `${origin}/login`,
      Language: 'zh-CN',
    };

    // 需鉴权的接口（如知雀 redirectUrl / 教师列表）附带 Bearer token
    if (options.token) {
      const clean = String(options.token).replace(/^Bearer\s+/i, '').trim();
      if (clean) headers.Authorization = `Bearer ${clean}`;
    }

    // 尽量附带站点 WAF cookie（存在时）
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      try {
        const names = ['HWWAFSESID', 'HWWAFSESTIME'];
        const pairs = [];
        for (const name of names) {
          const cookie = await chrome.cookies.get({ url: origin, name });
          if (cookie?.value) pairs.push(`${cookie.name}=${cookie.value}`);
        }
        if (pairs.length) headers.Cookie = pairs.join('; ');
      } catch (_) {
        // ignore
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body ?? {}),
    });

    if (!res.ok) {
      let extra = '';
      try {
        extra = await res.text();
      } catch (_) {}
      throw new Error(`HTTP ${res.status}: ${res.statusText}${extra ? ' | ' + extra.slice(0, 200) : ''}`);
    }

    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (_) {
      return { _raw: text };
    }
  }

  function extractErrorMessage(response) {
    if (!response || typeof response !== 'object') return '';
    return response.msg || response.message || response.error || response.errorMessage || '';
  }

  function extractTicket(captcha) {
    if (!captcha || typeof captcha !== 'object') return '';
    const data = captcha.data ?? captcha.result ?? captcha;
    return data?.ticket || data?.uuid || data?.captchaKey || data?.key || '';
  }

  function extractMoveLength(captcha, fallback = 212) {
    if (!captcha || typeof captcha !== 'object') return fallback;
    const data = captcha.data ?? captcha.result ?? captcha;
    const raw = data?.blockX ?? data?.moveLength ?? data?.width ?? data?.x ?? data?.offset ?? fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
  }

  function extractAccessToken(response) {
    if (!response || typeof response !== 'object') return '';
    const data = response.data ?? response.result ?? response;
    let token = '';
    if (typeof data === 'string') {
      token = data;
    } else {
      token = (
        data?.accessToken ||
        data?.token ||
        data?.access_token ||
        data?.authorization ||
        data?.jwt ||
        ''
      );
    }
    return String(token).replace(/^Bearer\s+/i, '').trim();
  }

  function extractUserSummary(response) {
    const data = response?.data;
    if (!data || typeof data !== 'object') return null;
    return {
      userId: data.userId || '',
      username: data.username || '',
      account: data.account || data.phone || '',
      phone: data.phone || '',
      tenantId: data.tenantId || '',
      tenantName: data.tenantName || '',
      domain: data.domain || '',
      roleNames: Array.isArray(data.roleNames) ? data.roleNames : [],
      type: data.type,
      teacherId: data.teacherId,
      studentId: data.studentId,
      roleIds: data.roleIds,
      menuCodes: data.menuCodes,
      avatar: data.avatar || '',
      roleType: data.roleType,
      roleName: data.roleName || '',
      status: data.status,
    };
  }

  // 与高职校前端一致：login 返回 data.status === "0" 表示必须先修改密码
  function isNeedResetPassword(response) {
    if (!response || typeof response !== 'object') return false;
    const data = response.data ?? response.result ?? response;
    if (!data || typeof data !== 'object') return false;
    return String(data.status) === '0';
  }

  const NEED_RESET_PASSWORD_MSG = '当前账号需要修改密码，请先重置密码后再操作';

  async function doLogin({ siteUrl, account, password } = {}) {
    const creds = await getCredentials();
    const finalSiteUrl = normalizeSiteUrl(siteUrl || creds.siteUrl || DEFAULT_SITE_URL);
    // 始终优先使用本次传入的账号密码，避免切换账号后仍落到缓存旧值
    const finalAccount = String(account != null && account !== '' ? account : (creds.account || DEFAULT_ACCOUNT)).trim();
    const finalPassword = String(password != null && password !== '' ? password : (creds.password || DEFAULT_PASSWORD));
    if (!finalAccount || !finalPassword) {
      throw new Error('请输入账号和密码');
    }

    // 登录前持久化当前输入，方便下次打开
    await saveCredentials({
      siteUrl: finalSiteUrl,
      account: finalAccount,
      password: finalPassword,
    });

    const captcha = await postJson(finalSiteUrl, '/client/auth/getCaptcha', {});
    if (captcha && captcha.success === false) {
      throw new Error(extractErrorMessage(captcha) || '获取验证码失败');
    }

    const ticket = extractTicket(captcha);
    if (!ticket) {
      throw new Error('getCaptcha 未返回 ticket');
    }
    const moveLength = extractMoveLength(captcha);
    const passwordHash = await encryptPassword(finalPassword);

    const loginRes = await postJson(finalSiteUrl, '/client/auth/university/login', {
      account: finalAccount,
      password: passwordHash,
      ticket: String(ticket),
      moveLength,
    });

    if (loginRes && loginRes.success === false) {
      throw new Error(extractErrorMessage(loginRes) || '登录失败');
    }

    const token = extractAccessToken(loginRes);
    if (!token) {
      throw new Error(extractErrorMessage(loginRes) || '登录接口未返回 token');
    }

    // 校验返回账号，防止误用旧会话/串号
    const user = extractUserSummary(loginRes);
    if (user?.account && user.account !== finalAccount && user.phone && user.phone !== finalAccount) {
      // 仅当两边都对不上时告警；有的环境 account 字段可能为空，phone 才是登录名
      if (user.account && user.account !== finalAccount) {
        console.warn('[other-login] 登录返回账号与请求不一致', {
          request: finalAccount,
          responseAccount: user.account,
          responsePhone: user.phone,
        });
      }
    }

    // status=0：需要修改密码。仍保存 token（前端改密弹窗会用到），但标记 needResetPassword
    const needResetPassword = isNeedResetPassword(loginRes);
    await saveToken(token, user);
    return {
      token,
      user,
      siteUrl: finalSiteUrl,
      account: finalAccount,
      password: finalPassword,
      needResetPassword,
      loginRes,
      captcha,
    };
  }

  async function openUrl(url) {
    if (!url) throw new Error('缺少 URL');
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url, active: true }, (tab) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab);
        }
      });
    });
  }

  function waitTabComplete(tabId, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        if (err) reject(err);
        else resolve();
      };
      const timer = setTimeout(() => finish(new Error('页面加载超时')), timeoutMs);
      const onUpdated = (id, info) => {
        if (id === tabId && info.status === 'complete') finish();
      };
      chrome.tabs.onUpdated.addListener(onUpdated);
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime?.lastError) {
          finish(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (tab && tab.status === 'complete') finish();
      });
    });
  }

  // 站点 AuthProvider 会优先读 localStorage 旧会话；
  // 若不清理，打开 /login?accessToken=新token 时会被旧账号直接带进首页。
  const SITE_AUTH_KEYS = [
    'system_access_token',
    'course-auth-user',
    'course-selected-role',
    'teacher_access_token',
    'student_access_token',
    'course_fastgpt_token',
    'student-auth-storage',
  ];

  async function clearSiteAuthStorage(tabId) {
    if (!chrome.scripting?.executeScript) {
      throw new Error('当前环境不支持 scripting.executeScript');
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (keys) => {
        for (const key of keys) {
          try {
            localStorage.removeItem(key);
          } catch (_) {}
        }
      },
      args: [SITE_AUTH_KEYS],
    });
  }

  // 写入与站点 login() 一致的 localStorage，确保切换账号后立即生效
  async function injectSiteAuth(tabId, token, user = null) {
    if (!chrome.scripting?.executeScript) return;
    const cleanToken = String(token || '').replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) return;
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (keys, cleanToken, user) => {
        for (const key of keys) {
          try {
            localStorage.removeItem(key);
          } catch (_) {}
        }
        try {
          localStorage.setItem('system_access_token', cleanToken);
          if (user && (user.userId || user.account || user.username)) {
            const authUser = {
              id: String(user.userId || ''),
              name: user.username || '',
              account: user.account || user.phone || '',
              token: cleanToken,
              role: user.roleName || '',
              avatar: user.avatar || '',
              teacherId: user.teacherId,
              studentId: user.studentId,
              menuCodes: user.menuCodes || [],
              type: user.type,
              roleType: user.roleType,
              roleIds: user.roleIds || [],
            };
            localStorage.setItem('course-auth-user', JSON.stringify(authUser));
            const isStudent = Number(user.type) === 1 || Number(user.studentId) > 0 && !(Number(user.teacherId) > 0);
            if (isStudent) {
              localStorage.setItem('student_access_token', cleanToken);
              localStorage.setItem('course-selected-role', 'student');
            } else {
              localStorage.removeItem('student_access_token');
              localStorage.setItem('course-selected-role', 'teacher');
            }
          }
        } catch (_) {}
      },
      args: [SITE_AUTH_KEYS, cleanToken, user],
    });
  }

  async function updateTabUrl(tabId, url) {
    return new Promise((resolve, reject) => {
      chrome.tabs.update(tabId, { url }, (updated) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(updated);
        }
      });
    });
  }

  // 打开站点并携带 accessToken：
  // 1) 先打开同源页 2) 清掉旧会话 3) 再跳登录页带新 token
  // 否则 AuthProvider 发现 course-auth-user 仍在，会忽略 URL 里的新 accessToken。
  async function openWithToken(siteUrl, token, user = null) {
    const origin = normalizeSiteUrl(siteUrl || DEFAULT_SITE_URL);
    const cleanToken = String(token || '').replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) throw new Error('缺少 token');

    const bootstrapUrl = `${origin}/login`;
    // 加 _t 防缓存；先清旧态再带新 token，避免串号
    const enterUrl = `${origin}/login?accessToken=${encodeURIComponent(cleanToken)}&_t=${Date.now()}`;

    const tab = await openUrl(bootstrapUrl);
    try {
      await waitTabComplete(tab.id);
      // 关键关键：先清旧会话，绝不残留旧 system_access_token / course-auth-user
      await clearSiteAuthStorage(tab.id);
      await injectSiteAuth(tab.id, cleanToken, user);
    } catch (err) {
      // 清理失败不阻断，仍尝试带 token 打开；但切换账号场景下成功率会下降
      console.warn('[other-login] 清理/注入站点登录态失败:', err);
    }

    await updateTabUrl(tab.id, enterUrl);
    return { tab, url: enterUrl };
  }

  // 一键登入：先调登录接口拿 token，再打开系统完成自动登录
  async function doEnter({ siteUrl, account, password } = {}) {
    const result = await doLogin({ siteUrl, account, password });
    // 需改密：只提示，不跳转系统
    if (result.needResetPassword) {
      throw new Error(NEED_RESET_PASSWORD_MSG);
    }
    const opened = await openWithToken(result.siteUrl, result.token, result.user);
    // 仅成功进入后记历史：按 siteUrl+account 去重，保留最新密码
    await recordHistory({
      siteUrl: result.siteUrl,
      account: result.account,
      password: result.password,
      lastAction: 'enter',
      user: result.user,
    });
    return { ...result, tabId: opened.tab?.id, enterUrl: opened.url };
  }

  function extractRedirectUrl(response) {
    if (!response || typeof response !== 'object') return '';
    const data = response.data ?? response.result ?? response;
    if (typeof data === 'string') return data.trim();
    if (!data || typeof data !== 'object') return '';
    return String(data.url || data.redirectUrl || data.redirect || '').trim();
  }

  // 与教师端「AI数字课/知雀」一致：在 oauth authorize URL 后追加 state
  // state.redirect=/home → 最终进入 https://a.zhique.cn/home
  function buildZhiqueEnterUrl(redirectUrl, language = 'zh-CN') {
    if (!redirectUrl) throw new Error('未获取到知雀跳转地址');
    const state = encodeURIComponent(JSON.stringify({
      redirect: '/home',
      language,
    }));
    const sep = redirectUrl.includes('?') ? '&' : '?';
    return `${redirectUrl}${sep}state=${state}`;
  }

  // 知雀：登录拿 token → 清旧会话并注入新会话 → redirectUrl → OAuth SSO
  // 对齐教师端 window.open(redirectUrl + state)；切换账号时必须先清站点 localStorage
  async function doZhiqueEnter({ siteUrl, account, password } = {}) {
    const result = await doLogin({ siteUrl, account, password });
    // 需改密：只提示，不进入知雀 SSO
    if (result.needResetPassword) {
      throw new Error(NEED_RESET_PASSWORD_MSG);
    }

    // 先在高职校站点落新登录态，避免 oauth/authorize 仍按旧会话授权
    const opened = await openWithToken(result.siteUrl, result.token, result.user);
    try {
      // 等登录页处理完 accessToken（会跳离 /login 或写完 localStorage）
      await waitTabComplete(opened.tab.id, 25000);
    } catch (err) {
      console.warn('[other-login] 等待高职校登录完成超时，继续尝试知雀跳转:', err);
    }

    const redirectRes = await postJson(
      result.siteUrl,
      '/client/tenant/zhique/redirectUrl',
      {},
      { token: result.token },
    );
    if (redirectRes && redirectRes.success === false) {
      throw new Error(extractErrorMessage(redirectRes) || '获取知雀跳转地址失败');
    }
    const redirectUrl = extractRedirectUrl(redirectRes);
    if (!redirectUrl) {
      throw new Error(extractErrorMessage(redirectRes) || '知雀 redirectUrl 为空');
    }
    const enterUrl = buildZhiqueEnterUrl(redirectUrl);
    // 同一标签继续跳 OAuth，保证用的是刚注入的新会话
    await updateTabUrl(opened.tab.id, enterUrl);
    // 仅成功跳转知雀后记历史：按 siteUrl+account 去重，保留最新密码
    await recordHistory({
      siteUrl: result.siteUrl,
      account: result.account,
      password: result.password,
      lastAction: 'zhique',
      user: result.user,
    });
    return {
      ...result,
      redirectUrl,
      enterUrl,
      tabId: opened.tab?.id,
    };
  }

  function pickFirstString(...candidates) {
    for (const value of candidates) {
      if (value == null) continue;
      const text = String(value).trim();
      if (text) return text;
    }
    return '';
  }

  function extractRoleText(item = {}) {
    if (Array.isArray(item.roleNames) && item.roleNames.length) {
      return item.roleNames.filter(Boolean).join('/');
    }
    if (Array.isArray(item.roles) && item.roles.length) {
      return item.roles
        .map((role) => (typeof role === 'string' ? role : (role?.name || role?.roleName || '')))
        .filter(Boolean)
        .join('/');
    }
    return pickFirstString(
      item.roleName,
      item.role,
      item.positionName,
      item.title,
      item.jobName,
      item.postName,
    );
  }

  function normalizeTeacherItem(item = {}) {
    const nestedUser = item.user && typeof item.user === 'object' ? item.user : null;
    const phone = pickFirstString(
      item.phone,
      item.mobile,
      item.account,
      item.userAccount,
      item.loginAccount,
      nestedUser?.phone,
      nestedUser?.mobile,
      nestedUser?.account,
      item.username,
      item.userName,
    );
    const name = pickFirstString(
      item.name,
      item.teacherName,
      item.realName,
      nestedUser?.name,
      nestedUser?.username,
      item.username,
      item.userName,
      item.nickName,
      phone,
    );
    const roleName = extractRoleText(item) || extractRoleText(nestedUser || {});
    return {
      id: pickFirstString(item.id, item.teacherId, item.userId, nestedUser?.userId, nestedUser?.id),
      name: name || '(未命名)',
      roleName,
      phone,
      account: phone,
      raw: item,
    };
  }

  function extractTeacherPage(response) {
    if (!response || typeof response !== 'object') {
      return { records: [], total: 0, current: 1, size: 10 };
    }
    const data = response.data ?? response.result ?? response;
    const page = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    const recordsRaw = Array.isArray(data)
      ? data
      : (page.records || page.list || page.rows || page.items || []);
    const records = (Array.isArray(recordsRaw) ? recordsRaw : [])
      .map(normalizeTeacherItem);
    const total = Number(page.total ?? page.totalCount ?? records.length) || records.length;
    const current = Number(page.current ?? page.page ?? page.pageNum ?? 1) || 1;
    const size = Number(page.size ?? page.pageSize ?? records.length) || records.length || 10;
    return { records, total, current, size };
  }

  // 登录后拉取教师列表：/ai-university/client/teacher/pageList
  // 列表项统一按手机号登录，默认密码 DEFAULT_PASSWORD
  async function listTeachers({ siteUrl, token, current = 1, size = 10 } = {}) {
    const creds = await getCredentials();
    const finalSiteUrl = normalizeSiteUrl(siteUrl || creds.siteUrl || DEFAULT_SITE_URL);

    let finalToken = String(token || '').replace(/^Bearer\s+/i, '').trim();
    if (!finalToken) {
      const tokenState = await getToken();
      finalToken = String(tokenState?.token || '').replace(/^Bearer\s+/i, '').trim();
    }
    if (!finalToken) {
      throw new Error('请先登录获取 token');
    }

    const pageCurrent = Math.max(1, Number(current) || 1);
    const pageSize = Math.max(1, Number(size) || 10);
    const res = await postJson(
      finalSiteUrl,
      '/client/teacher/pageList',
      { current: pageCurrent, size: pageSize },
      {
        token: finalToken,
        apiPrefix: '/ai-university',
        referer: `${finalSiteUrl}/admin/teaching/teachers`,
      },
    );

    if (res && res.success === false) {
      throw new Error(extractErrorMessage(res) || '获取教师列表失败');
    }

    const page = extractTeacherPage(res);
    return {
      siteUrl: finalSiteUrl,
      defaultPassword: DEFAULT_PASSWORD,
      ...page,
    };
  }

  ns.otherLogin = {
    DEFAULT_SITE_URL,
    DEFAULT_ACCOUNT,
    DEFAULT_PASSWORD,
    normalizeSiteUrl,
    defaultCredentials,
    getCredentials,
    saveCredentials,
    getToken,
    saveToken,
    clearToken,
    getHistory,
    recordHistory,
    deleteHistory,
    listTeachers,
    doLogin,
    openWithToken,
    doEnter,
    doZhiqueEnter,
  };
})();


/* ===== src/background/app-login.js ===== */
/* 内部开发工具箱 — Background APP 端登录（学生 APP token 获取） */
/* 默认站点为 http://localhost:5173，登录走该地址下的 /huayun-ai。 */
/* 鉴权依赖浏览器会话 cookie（authjs.session-token 等），APP 模块自身不持有 admin token。 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});

  const CRED_KEY = 'appLoginCredentials';
  const TOKEN_KEY = 'appLoginToken';
  const HISTORY_KEY = 'appLoginHistory';
  const MAX_HISTORY = 50;
  const DEFAULT_SITE_URL = 'http://localhost:5173';
  const DEFAULT_ACCOUNT = '202506002';
  const DEFAULT_PASSWORD = 'Xx@123456';
  // educationList 中默认选中的学校名
  const DEFAULT_SCHOOL_NAME = '未来智慧学校AI平台';
  // 会话依赖的 cookie 名称：登录接口需这些 cookie 才能通过鉴权
  const SESSION_COOKIE_NAMES = [
    'JSESSIONID',
    'HWWAFSESID',
    'HWWAFSESTIME',
    'authjs.session-token',
    'authjs.csrf-token',
  ];

  function hasChromeStorage() {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  // 规范化站点地址：补全协议、去掉末尾斜杠；空串或非 HTTP(S) 地址返回空。
  function normalizeSiteUrl(raw) {
    const input = String(raw || '').trim();
    if (!input) return '';
    const explicitScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(input);
    if (explicitScheme && !/^https?:\/\//i.test(input)) return '';
    try {
      const parsed = new URL(explicitScheme ? input : `http://${input}`);
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
        return '';
      }
      // 仅保留 origin，避免 path 干扰 API 拼接和标签页同源校验。
      return parsed.origin.replace(/\/+$/, '');
    } catch (_) {
      return '';
    }
  }

  function normalizeCreds(value = {}) {
    return {
      siteUrl: normalizeSiteUrl(value.siteUrl),
      account: typeof value.account === 'string' ? value.account : '',
      password: typeof value.password === 'string' ? value.password : '',
    };
  }

  function firstDisplayName(...values) {
    for (const value of values) {
      if (typeof value === 'string' || typeof value === 'number') {
        const text = String(value).trim();
        if (text) return text;
        continue;
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const text = String(
        value.name ??
        value.label ??
        value.deptName ??
        value.gradeName ??
        value.className ??
        value.clazzName ??
        '',
      ).trim();
      if (text) return text;
    }
    return '';
  }

  function extractStudentPlacement(userDetail) {
    const data = userDetail?.data ?? userDetail?.result ?? userDetail;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { gradeName: '', className: '' };
    }
    const student = data.student && typeof data.student === 'object' && !Array.isArray(data.student)
      ? data.student
      : {};
    return {
      gradeName: firstDisplayName(
        data.gradeName,
        student.gradeName,
        data.gradeInfo,
        student.gradeInfo,
        data.grade,
        student.grade,
      ),
      className: firstDisplayName(
        data.className,
        data.clazzName,
        data.schoolClassName,
        student.className,
        student.clazzName,
        student.schoolClassName,
        data.classInfo,
        data.clazz,
        data.class,
        student.classInfo,
        student.clazz,
        student.class,
      ),
    };
  }

  function normalizeToken(value = {}) {
    const userDetail = value.userDetail && typeof value.userDetail === 'object'
      ? value.userDetail
      : null;
    const placement = extractStudentPlacement(userDetail);
    return {
      token: typeof value.token === 'string' ? value.token : '',
      updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
      user: value.user && typeof value.user === 'object' ? value.user : null,
      userDetail,
      gradeName: placement.gradeName || String(value.gradeName || '').trim(),
      className: placement.className || String(value.className || '').trim(),
    };
  }

  function defaultCredentials() {
    return {
      siteUrl: DEFAULT_SITE_URL,
      account: DEFAULT_ACCOUNT,
      password: DEFAULT_PASSWORD,
    };
  }

  async function getCredentials() {
    if (!hasChromeStorage()) return defaultCredentials();
    return new Promise((resolve) => {
      chrome.storage.local.get(CRED_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(defaultCredentials());
          return;
        }
        const stored = normalizeCreds(items[CRED_KEY] || {});
        // 首次无存储或历史地址为空时回填默认值，便于一键登录
        resolve({
          siteUrl: stored.siteUrl || DEFAULT_SITE_URL,
          account: stored.account || DEFAULT_ACCOUNT,
          password: stored.password || DEFAULT_PASSWORD,
        });
      });
    });
  }

  async function saveCredentials(partial) {
    const next = normalizeCreds(partial);
    if (!hasChromeStorage()) return next;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [CRED_KEY]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function getToken() {
    if (!hasChromeStorage()) return normalizeToken();
    return new Promise((resolve) => {
      chrome.storage.local.get(TOKEN_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(normalizeToken());
          return;
        }
        resolve(normalizeToken(items[TOKEN_KEY]));
      });
    });
  }

  async function saveToken(token, user = null, userDetail = null) {
    const next = normalizeToken({
      token: String(token || ''),
      updatedAt: Date.now(),
      user,
      userDetail,
    });
    if (!hasChromeStorage()) return next;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [TOKEN_KEY]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function clearToken() {
    if (!hasChromeStorage()) return;
    return new Promise((resolve) => {
      chrome.storage.local.remove(TOKEN_KEY, () => resolve());
    });
  }

  function historyIdentity(item = {}) {
    const siteUrl = normalizeSiteUrl(item.siteUrl);
    const account = String(item.account || '').trim();
    const tenantId = String(item.tenantId || '').trim();
    return `${siteUrl}::${account}::${tenantId}`;
  }

  function normalizeHistoryItem(item = {}) {
    const siteUrl = normalizeSiteUrl(item.siteUrl);
    const account = String(item.account || '').trim();
    const password = typeof item.password === 'string' ? item.password : '';
    const at = typeof item.at === 'number' ? item.at : Date.now();
    const user = item.user && typeof item.user === 'object' ? item.user : null;
    const userDetail = item.userDetail && typeof item.userDetail === 'object'
      ? item.userDetail
      : null;
    const placement = extractStudentPlacement(userDetail);
    return {
      siteUrl,
      account,
      password,
      tenantId: String(item.tenantId || '').trim(),
      tenantName: String(item.tenantName || ''),
      at,
      user,
      userDetail,
      gradeName: placement.gradeName || String(item.gradeName || '').trim(),
      className: placement.className || String(item.className || '').trim(),
      // 展示用冗余字段，便于列表直接渲染
      username: user?.username || item.username || '',
    };
  }

  async function getHistory() {
    if (!hasChromeStorage()) return [];
    return new Promise((resolve) => {
      chrome.storage.local.get(HISTORY_KEY, (items) => {
        if (chrome.runtime?.lastError) {
          resolve([]);
          return;
        }
        const raw = Array.isArray(items[HISTORY_KEY]) ? items[HISTORY_KEY] : [];
        const records = raw
          .map(normalizeHistoryItem)
          .filter((record) => record.account)
          .slice(0, MAX_HISTORY);
        if (raw.length !== records.length) {
          chrome.storage.local.set({ [HISTORY_KEY]: records }, () => resolve(records));
          return;
        }
        resolve(records);
      });
    });
  }

  // 按 siteUrl + account + tenantId 去重，最新操作置顶
  async function recordHistory(item) {
    const nextItem = normalizeHistoryItem(item);
    if (!nextItem.account) return getHistory();

    const records = await getHistory();
    const identity = historyIdentity(nextItem);
    const next = [
      nextItem,
      ...records.filter((r) => historyIdentity(r) !== identity),
    ].slice(0, MAX_HISTORY);

    if (!hasChromeStorage()) return next;
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [HISTORY_KEY]: next }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(next);
      });
    });
  }

  async function deleteHistory({ siteUrl, account, tenantId } = {}) {
    const identity = historyIdentity({ siteUrl, account, tenantId });
    const records = await getHistory();
    const filtered = records.filter((r) => historyIdentity(r) !== identity);
    if (!hasChromeStorage()) return { ok: true, records: filtered };
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [HISTORY_KEY]: filtered }, () => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve({ ok: true, records: filtered });
      });
    });
  }

  async function encryptPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // 发起 JSON POST：路径已含 /huayun-ai 前缀，直接拼到站点 origin 后
  // 鉴权依赖会话 cookie：fetch credentials:include + 手动补 chrome.cookies 取到的 WAF/会话 cookie
  async function postJson(siteOrigin, path, body, options = {}) {
    const origin = normalizeSiteUrl(siteOrigin);
    if (!origin) throw new Error('请先填写站点地址');
    const cleanPath = String(path || '').startsWith('/') ? path : `/${path || ''}`;
    const url = `${origin}${cleanPath}`;
    const headers = {
      Accept: options.accept || 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Origin: origin,
      Referer: options.referer || `${origin}/`,
    };

    if (options.token) {
      const clean = String(options.token).replace(/^Bearer\s+/i, '').trim();
      if (clean) {
        headers.Authorization = `Bearer ${clean}`;
        if (options.anxunAuth) {
          headers['anxun-auth'] = `bearer Bearer ${clean}`;
        }
      }
    }

    // 尽量附带站点会话 cookie（authjs.session-token 等），存在时注入 Cookie 头
    if (typeof chrome !== 'undefined' && chrome.cookies) {
      try {
        const pairs = [];
        for (const name of SESSION_COOKIE_NAMES) {
          const cookie = await chrome.cookies.get({ url: origin, name });
          if (cookie?.value) pairs.push(`${cookie.name}=${cookie.value}`);
        }
        if (pairs.length) headers.Cookie = pairs.join('; ');
      } catch (_) {
        // ignore
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(body ?? {}),
    });

    if (!res.ok) {
      let extra = '';
      try {
        extra = await res.text();
      } catch (_) {}
      throw new Error(`HTTP ${res.status}: ${res.statusText}${extra ? ' | ' + extra.slice(0, 200) : ''}`);
    }

    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (_) {
      return { _raw: text };
    }
  }

  function extractErrorMessage(response) {
    if (!response || typeof response !== 'object') return '';
    return response.msg || response.message || response.error || response.errorMessage || '';
  }

  // educationList 返回 { code:200, data:[{id,name,...}] }，id 即 tenantId
  function normalizeSchoolItem(item = {}) {
    return {
      tenantId: String(item.id ?? item.tenantId ?? ''),
      tenantName: String(item.name ?? item.tenantName ?? ''),
      domain: String(item.domain ?? ''),
      fullName: String(item.fullName ?? ''),
    };
  }

  function extractSchoolList(response) {
    if (!response || typeof response !== 'object') return [];
    const data = response.data ?? response.result ?? response;
    const list = Array.isArray(data) ? data : [];
    return list.map(normalizeSchoolItem).filter((s) => s.tenantId);
  }

  function extractTicket(captcha) {
    if (!captcha || typeof captcha !== 'object') return '';
    const data = captcha.data ?? captcha.result ?? captcha;
    return data?.ticket || data?.uuid || data?.captchaKey || data?.key || '';
  }

  // 滑块答案：getCaptcha 返回的 data.blockX 即 moveLength
  function extractMoveLength(captcha) {
    if (!captcha || typeof captcha !== 'object') return 0;
    const data = captcha.data ?? captcha.result ?? captcha;
    const raw = data?.blockX ?? data?.moveLength ?? data?.width ?? data?.x ?? data?.offset ?? 0;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }

  function extractAccessToken(response) {
    if (!response || typeof response !== 'object') return '';
    const data = response.data ?? response.result ?? response;
    let token = '';
    if (typeof data === 'string') {
      token = data;
    } else {
      token = (
        data?.accessToken ||
        data?.token ||
        data?.access_token ||
        data?.authorization ||
        data?.jwt ||
        ''
      );
    }
    return String(token).replace(/^Bearer\s+/i, '').trim();
  }

  function extractUserInfo(response) {
    if (!response || typeof response !== 'object') return null;
    const data = response.data ?? response.result ?? response;
    return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
  }

  function extractUserSummary(response) {
    const data = response?.data;
    if (!data || typeof data !== 'object') return null;
    return {
      userId: data.userId || '',
      username: data.username || '',
      account: data.account || data.studentCode || '',
      phone: data.phone || '',
      tenantId: data.tenantId || '',
      tenantName: data.tenantName || '',
      domain: data.domain || '',
      roleNames: Array.isArray(data.roleNames) ? data.roleNames : [],
      type: data.type,
      teacherId: data.teacherId,
      studentId: data.studentId,
      roleIds: data.roleIds,
      menuCodes: data.menuCodes,
      avatar: data.avatar || '',
      roleName: data.roleName || '',
      status: data.status,
    };
  }

  // 拉取学校列表：educationList 返回全量，前端做模糊搜索
  async function listSchools({ siteUrl } = {}) {
    const creds = await getCredentials();
    const finalSiteUrl = normalizeSiteUrl(siteUrl || creds.siteUrl);
    if (!finalSiteUrl) throw new Error('请先填写站点地址');

    const res = await postJson(finalSiteUrl, '/huayun-ai/client/tenant/educationList', {});
    if (res && res.success === false) {
      throw new Error(extractErrorMessage(res) || '获取学校列表失败');
    }
    const schools = extractSchoolList(res);
    if (!schools.length) {
      throw new Error(extractErrorMessage(res) || '学校列表为空');
    }
    return { siteUrl: finalSiteUrl, schools, defaultSchoolName: DEFAULT_SCHOOL_NAME };
  }

  async function fetchUserDetail(siteUrl, token, userInfo) {
    const detailId = String(userInfo?.studentId ?? userInfo?.id ?? '').trim();
    if (!detailId) {
      throw new Error('登录接口未返回 studentId，无法获取用户详情');
    }

    const response = await postJson(
      siteUrl,
      '/huayun-ai/app/user/detail',
      { id: detailId },
      {
        token,
        anxunAuth: true,
        accept: '*/*',
      },
    );
    const responseCode = response?.code;
    if (
      response?.success === false ||
      (responseCode != null && Number(responseCode) !== 200)
    ) {
      throw new Error(extractErrorMessage(response) || '获取用户详情失败');
    }
    return response;
  }

  // APP 一键登录：验证码 → studentLogin → user/detail
  async function doLogin({ siteUrl, account, password, tenantId, tenantName } = {}) {
    const creds = await getCredentials();
    const finalSiteUrl = normalizeSiteUrl(siteUrl || creds.siteUrl);
    if (!finalSiteUrl) {
      throw new Error('请先填写站点地址');
    }
    // 始终优先使用本次传入的账号密码，避免切换账号后仍落到缓存旧值
    const finalAccount = String(account != null && account !== '' ? account : (creds.account || DEFAULT_ACCOUNT)).trim();
    const finalPassword = String(password != null && password !== '' ? password : (creds.password || DEFAULT_PASSWORD));
    if (!finalAccount || !finalPassword) {
      throw new Error('请输入账号和密码');
    }
    const finalTenantId = String(tenantId || '').trim();
    if (!finalTenantId) {
      throw new Error('请选择学校');
    }
    const finalTenantName = String(tenantName || '').trim();

    // 登录前持久化当前输入，方便下次打开
    await saveCredentials({
      siteUrl: finalSiteUrl,
      account: finalAccount,
      password: finalPassword,
    });

    const captcha = await postJson(finalSiteUrl, '/huayun-ai/app/auth/getCaptcha', {});
    if (captcha && captcha.success === false) {
      throw new Error(extractErrorMessage(captcha) || '获取验证码失败');
    }

    const ticket = extractTicket(captcha);
    if (!ticket) {
      throw new Error('getCaptcha 未返回 ticket');
    }
    const moveLength = extractMoveLength(captcha);
    const captchaValidation = await postJson(
      finalSiteUrl,
      `/huayun-ai/app/auth/getCaptcha?moveLength=${encodeURIComponent(moveLength)}&ticket=${encodeURIComponent(ticket)}`,
      {
        params: {
          moveLength,
          ticket: String(ticket),
        },
      },
    );
    if (captchaValidation && captchaValidation.success === false) {
      throw new Error(extractErrorMessage(captchaValidation) || '验证码校验失败');
    }

    const passwordHash = await encryptPassword(finalPassword);

    const loginRes = await postJson(finalSiteUrl, '/huayun-ai/app/auth/studentLogin', {
      account: finalAccount,
      password: passwordHash,
      tenantId: finalTenantId,
      moveLength,
      ticket: String(ticket),
    });

    if (loginRes && loginRes.success === false) {
      throw new Error(extractErrorMessage(loginRes) || '登录失败');
    }

    const token = extractAccessToken(loginRes);
    if (!token) {
      throw new Error(extractErrorMessage(loginRes) || '登录接口未返回 token');
    }

    const userInfo = extractUserInfo(loginRes);
    if (!userInfo) {
      throw new Error(extractErrorMessage(loginRes) || '登录接口未返回 userInfo');
    }
    const user = extractUserSummary(loginRes);
    const userDetail = await fetchUserDetail(finalSiteUrl, token, userInfo);
    const placement = extractStudentPlacement(userDetail);
    await saveToken(token, userInfo, userDetail);
    return {
      token,
      user,
      userInfo,
      userDetail,
      gradeName: placement.gradeName,
      className: placement.className,
      siteUrl: finalSiteUrl,
      account: finalAccount,
      password: finalPassword,
      tenantId: finalTenantId,
      tenantName: user?.tenantName || finalTenantName,
      loginRes,
      captcha,
      captchaValidation,
    };
  }

  function queryTabs(queryInfo) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query(queryInfo, (tabs) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(Array.isArray(tabs) ? tabs : []);
      });
    });
  }

  function tabMatchesOrigin(tab, origin) {
    const rawUrl = tab?.url || tab?.pendingUrl || '';
    try {
      return new URL(rawUrl).origin === origin;
    } catch (_) {
      return false;
    }
  }

  async function findSiteTab(siteUrl) {
    const origin = normalizeSiteUrl(siteUrl);
    if (!origin) throw new Error('站点地址无效');
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      throw new Error('当前环境不支持访问网站标签页');
    }

    const activeTabs = await queryTabs({ active: true, currentWindow: true });
    const activeTab = activeTabs.find((tab) => tab?.id && tabMatchesOrigin(tab, origin));
    if (activeTab) return activeTab;

    const allTabs = await queryTabs({});
    const matchingTab = allTabs.find((tab) => tab?.id && tabMatchesOrigin(tab, origin));
    if (matchingTab) return matchingTab;

    throw new Error(`未找到已打开的 ${origin} 页面`);
  }

  async function injectSiteSessionAndNavigateToRoot(siteUrl, token, userInfo) {
    if (!chrome.scripting?.executeScript) {
      throw new Error('当前环境不支持写入网站登录态');
    }
    const sessionToken = String(userInfo?.accessToken || token || '').trim();
    if (!sessionToken) throw new Error('缺少 token');
    if (!userInfo || typeof userInfo !== 'object' || Array.isArray(userInfo)) {
      throw new Error('缺少 userInfo');
    }

    const tab = await findSiteTab(siteUrl);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: (sessionToken, sessionUserInfo) => {
        localStorage.setItem('token', sessionToken);
        localStorage.setItem('userInfo', JSON.stringify(sessionUserInfo));
        window.location.assign(`${window.location.origin}/`);
      },
      args: [sessionToken, userInfo],
    });
    return { tabId: tab.id };
  }

  async function loginAndInject(payload = {}) {
    const creds = await getCredentials();
    const finalSiteUrl = normalizeSiteUrl(payload.siteUrl || creds.siteUrl);
    if (!finalSiteUrl) {
      throw new Error('站点地址无效，请输入 HTTP(S) 地址');
    }
    // 登录前先确认存在可注入的同源页面，避免完成登录后才发现目标地址错误。
    await findSiteTab(finalSiteUrl);

    const shouldRecordHistory = payload.recordHistory !== false;
    const result = await doLogin({ ...payload, siteUrl: finalSiteUrl });
    if (shouldRecordHistory) {
      // 登录和用户详情获取成功后先落历史，再注入页面并跳转。
      await recordHistory({
        siteUrl: result.siteUrl,
        account: result.account,
        password: result.password,
        tenantId: result.tenantId,
        tenantName: result.tenantName,
        user: result.user,
        userDetail: result.userDetail,
      });
    }
    const injected = await injectSiteSessionAndNavigateToRoot(result.siteUrl, result.token, result.userInfo);
    return { ...result, ...injected };
  }

  ns.appLogin = {
    DEFAULT_SITE_URL,
    DEFAULT_ACCOUNT,
    DEFAULT_PASSWORD,
    DEFAULT_SCHOOL_NAME,
    normalizeSiteUrl,
    extractStudentPlacement,
    defaultCredentials,
    getCredentials,
    saveCredentials,
    getToken,
    saveToken,
    clearToken,
    getHistory,
    recordHistory,
    deleteHistory,
    listSchools,
    doLogin,
    findSiteTab,
    injectSiteSessionAndNavigateToRoot,
    loginAndInject,
  };
})();


/* ===== src/background/mock-handler.js ===== */
/* 内部开发工具箱 — Mock 消息处理 */
/* 处理 DevTools Panel 和 Content Script 之间的 Mock 消息 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  // 处理：获取 Mock 规则
  async function handleGetMockRules(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const rules = await ns.mockStorage.getMockRules();
      return { ok: true, rules };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：添加/更新 Mock 规则
  async function handleAddMockRule(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { rule, tabId } = msg;
      await ns.mockStorage.saveMockRule(rule);

      // 通知 content script 更新规则
      if (tabId) {
        const allRules = await ns.mockStorage.getMockRules();
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_RULES',
          rules: allRules,
        }).catch(() => {
          // Tab 可能已关闭，忽略错误
        });
      }

      return { ok: true, rule };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理导入冲突弹窗的最终选择，并一次性同步最新规则到页面。
  async function handleResolveImportConflict(msg) {
    try {
      if (!ns.mockStorage?.resolveImportConflict) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { selectedRule, selectedRules, removeRuleIds, tabId } = msg;
      const rulesToSave = Array.isArray(selectedRules) ? selectedRules : (selectedRule || null);
      const result = await ns.mockStorage.resolveImportConflict(rulesToSave, removeRuleIds);
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_RULES',
          rules: result.rules,
        }).catch(() => {});
      }
      return { ok: true, rules: result.rules };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：删除 Mock 规则
  async function handleDeleteMockRule(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { ruleId, tabId } = msg;
      await ns.mockStorage.deleteMockRule(ruleId);

      // 通知 content script 更新规则
      if (tabId) {
        const allRules = await ns.mockStorage.getMockRules();
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_RULES',
          rules: allRules,
        }).catch(() => {});
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  function sendTabMessage(tabId, message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || response.ok === false) {
          reject(new Error(response?.error || 'content script did not confirm cache deletion'));
          return;
        }
        resolve(response);
      });
    });
  }

  // 删除一个接口的持久化规则（如有），并彻底清理当前标签页中的日志/规则缓存。
  async function handleDeleteMockEndpoint(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { ruleId, tabId, method, url } = msg;
      if (!tabId) return { ok: false, error: 'tabId required' };
      if (!method || !url) return { ok: false, error: 'method and url required' };

      if (ruleId) await ns.mockStorage.deleteMockRule(ruleId);
      const rules = await ns.mockStorage.getMockRules();
      const cacheResult = await sendTabMessage(tabId, {
        type: 'DELETE_MOCK_ENDPOINT_CACHE',
        method,
        url,
        rules,
      });

      return { ok: true, deletedRequests: cacheResult.deletedRequests || 0 };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 仅删除当前标签页中的捕获记录，不读取、删除或重新下发持久化 Mock 规则。
  async function handleDeleteCapturedRequest(msg) {
    try {
      const { tabId, method, url } = msg;
      if (!tabId) return { ok: false, error: 'tabId required' };
      if (!method || !url) return { ok: false, error: 'method and url required' };

      const result = await sendTabMessage(tabId, {
        type: 'DELETE_CAPTURED_REQUEST',
        method,
        url,
      });
      return { ok: true, deletedRequests: result.deletedRequests || 0 };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：启用/禁用 Mock 规则
  async function handleToggleMockRule(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { ruleId, enabled, tabId } = msg;
      await ns.mockStorage.toggleMockRule(ruleId, enabled);

      // 通知 content script 更新规则
      if (tabId) {
        const allRules = await ns.mockStorage.getMockRules();
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_RULES',
          rules: allRules,
        }).catch(() => {});
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：按面板来源清空当前项目的 Mock 规则（Emo / 已编）
  async function handleClearMockRules(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }

      const { tabId, scope } = msg;
      await ns.mockStorage.clearMockRules(scope);
      const remainingRules = await ns.mockStorage.getMockRules();

      // 通知 content script：仅停止已清空来源的拦截，其他来源继续生效。
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_RULES',
          rules: remainingRules,
        }).catch(() => {});
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：获取当前项目
  async function handleGetCurrentProject() {
    try {
      if (!ns.currentProject) {
        return { ok: true, projectId: 'gpt-admin-pre' }; // Fallback
      }

      const projectId = await ns.currentProject.getCurrentProjectId();
      return { ok: true, projectId };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：获取接口记录（从 content script）
  async function handleGetRequestLog(msg) {
    try {
      const { tabId } = msg;
      if (!tabId) {
        return { ok: false, error: 'tabId required' };
      }

      // 向 content script 请求日志
      const logResult = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'GET_REQUEST_LOG' }, (response) => {
          if (chrome.runtime?.lastError) {
            // Tab 未加载 content script（页面在扩展安装/重载前就已打开，或 URL 不匹配）
            // 显式标记 csReady:false，让 Panel 提示刷新，而非显示为"暂无记录"
            resolve({ ok: true, requests: [], csReady: false, reason: 'no_content_script' });
            return;
          }
          // response 为空也视为 content script 未就绪
          if (!response) {
            resolve({ ok: true, requests: [], csReady: false, reason: 'no_response' });
            return;
          }
          resolve({ ok: true, requests: response.requests || [], csReady: true });
        });
      });

      return logResult;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：获取禁监接口池（按项目持久化）
  async function handleGetMonitorDisabled() {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }
      const disabled = await ns.mockStorage.getMonitorDisabled();
      return { ok: true, disabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：加入禁监接口池（entry 可为 key 字符串或 {key} 对象），并同步 content script
  async function handleAddMonitorDisabled(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }
      const { entry, tabId } = msg;
      const disabled = await ns.mockStorage.addMonitorDisabled(entry);
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MONITOR_DISABLED',
          disabled,
        }).catch(() => {});
      }
      return { ok: true, disabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：从禁监接口池移除（放开监听），并同步 content script
  async function handleRemoveMonitorDisabled(msg) {
    try {
      if (!ns.mockStorage) {
        return { ok: false, error: 'mockStorage not available' };
      }
      const { key, tabId } = msg;
      const disabled = await ns.mockStorage.removeMonitorDisabled(key);
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MONITOR_DISABLED',
          disabled,
        }).catch(() => {});
      }
      return { ok: true, disabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：获取接口 Mock 总开关（默认启用）
  async function handleGetMockEnabled() {
    try {
      if (!ns.mockStorage?.getMockEnabled) {
        return { ok: false, error: 'mockStorage not available' };
      }
      const enabled = await ns.mockStorage.getMockEnabled();
      return { ok: true, enabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 处理：设置接口 Mock 总开关。
  // 开启时：先按需向该标签页注入页面 hook（未注入过时），再同步状态到 content → 页面；
  // 关闭时：仅同步状态（已注入的 hook 收到后变为透传，页面刷新后彻底不再注入）。
  async function handleSetMockEnabled(msg) {
    try {
      if (!ns.mockStorage?.setMockEnabled) {
        return { ok: false, error: 'mockStorage not available' };
      }
      const { tabId } = msg;
      const enabled = await ns.mockStorage.setMockEnabled(msg.enabled !== false);
      const bgNs = globalThis.InternalDevToolkitBg;
      if (tabId && enabled && bgNs?.mockHook?.ensureInjected) {
        // 确保 hook 已注入后再下发开关状态，否则页面无 hook 接收
        await bgNs.mockHook.ensureInjected(tabId).catch(() => ({ ok: false }));
      }
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: 'APPLY_MOCK_ENABLED',
          enabled,
        }).catch(() => {});
      }
      return { ok: true, enabled };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // 导出处理器
  ns.mockHandler = {
    handleGetMockRules,
    handleAddMockRule,
    handleResolveImportConflict,
    handleDeleteMockRule,
    handleDeleteMockEndpoint,
    handleDeleteCapturedRequest,
    handleToggleMockRule,
    handleClearMockRules,
    handleGetCurrentProject,
    handleGetRequestLog,
    handleGetMonitorDisabled,
    handleAddMonitorDisabled,
    handleRemoveMonitorDisabled,
    handleGetMockEnabled,
    handleSetMockEnabled,
  };
})();


/* ===== src/background/component-inspector.js ===== */
/* 组件定位：按开发地址记住开关，同地址刷新时沿用项目并恢复页面脚本。 */
(() => {
  'use strict';
  const ns = globalThis.InternalDevToolkit;
  const policy = ns.componentSettings;
  const HOST = 'com.internal_dev_toolkit.component_inspector';
  const transitions = new Map();
  const snapshots = new Map();
  const projectChecks = new Map();
  const CHECK_INTERVAL = 15000;
  const retryDelay = (failures) => Math.min(1000 * 2 ** Math.min(Math.max(0, failures - 1), 4), CHECK_INTERVAL);
  let port = null;
  let serial = 0;
  let uninstalling = false;
  let checkingHost = null;
  let updateFailure = '';
  let updatedRevision = '';
  const pending = new Map();
  const tabKey = (id) => policy.TAB_PREFIX + id;
  const token = () => crypto.randomUUID();
  async function withTimeout(task, duration, message) {
    let timer;
    try {
      return await Promise.race([task, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), duration); })]);
    } finally { clearTimeout(timer); }
  }
  function executeScript(options) {
    return withTimeout(chrome.scripting.executeScript({ ...options, injectImmediately: true }), 10000, '页面响应超时，请刷新页面或点击「检查连接」重试');
  }
  function canReuseProject(state, origin) {
    return state.origin === origin && ['on', 'restoring'].includes(state.status) && !!state.project?.id && !!state.frameworks?.length;
  }
  async function originEnabled(origin) {
    return !!(await chrome.storage.local.get(policy.ORIGIN_PREFIX + origin))[policy.ORIGIN_PREFIX + origin];
  }

  function nativeRequest(action, payload = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!port) {
          const connection = chrome.runtime.connectNative(HOST);
          port = connection;
          connection.onMessage.addListener((message) => {
            const job = pending.get(message.id);
            if (!job) return;
            pending.delete(message.id); clearTimeout(job.timer);
            message.ok ? job.resolve(message) : job.reject(Object.assign(new Error(message.error || '本机操作失败'), { code: message.code }));
          });
          connection.onDisconnect.addListener(() => {
            const detail = chrome.runtime.lastError?.message || '';
            const unexpected = port === connection;
            if (unexpected) port = null;
            const message = /not found|not registered|Specified native/i.test(detail) ? '请先安装本机辅助程序，再检查连接' : '本机辅助程序连接已断开，请检查连接后重试';
            for (const [id, job] of pending) {
              if (job.connection !== connection) continue;
              clearTimeout(job.timer); job.reject(new Error(message)); pending.delete(id);
            }
            if (unexpected) pauseAll(message).catch(() => {});
          });
        }
        const id = ++serial;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('本机操作超时，请重试')); }, action === 'chooseEditor' ? 130000 : 25000);
        pending.set(id, { resolve, reject, timer, connection: port });
        port.postMessage({ ...payload, id, action });
      } catch (error) { reject(error); }
    });
  }

  function disconnectHost() {
    if (port) { const previous = port; port = null; previous.disconnect(); }
  }

  async function readyHost() {
    if (uninstalling) throw new Error('辅助程序正在卸载，请稍候');
    if (!checkingHost) checkingHost = (async () => {
      let host = await nativeRequest('status');
      if (!host.capabilities?.includes('auto-update')) return { ...host, needsInstall: true };
      try {
        const bundle = await ns.componentRuntime.loadBundle();
        if (host.revision === bundle.revision) { updateFailure = ''; return { ...host, updated: updatedRevision === bundle.revision }; }
        if (updateFailure) return { ...host, updateError: updateFailure };
        await nativeRequest('update', { bundle });
        // 更新请求已经返回，此时再断开旧进程，Chrome 会从完整的新版本启动。
        disconnectHost();
        host = await nativeRequest('status');
        if (host.revision !== bundle.revision) throw new Error('辅助程序版本核对失败');
        updatedRevision = bundle.revision;
        return { ...host, updated: true };
      } catch (error) {
        updateFailure = `自动更新未完成：${error.message}。点击「检查连接」重试。`;
        return { ...host, updateError: updateFailure };
      }
    })().finally(() => { checkingHost = null; });
    return checkingHost;
  }

  function assertHostReady(host) {
    if (host.needsInstall) throw new Error('请最后复制并执行一次重装命令，启用辅助程序自动更新');
    if (host.updateError) throw new Error(host.updateError);
  }

  function serviceChanged(error) {
    return ['COMPONENT_SERVER_OFFLINE', 'COMPONENT_PROJECT_STALE'].includes(error.code) || /服务已重启|目录(?:记录)?已变化|未找到监听|开发服务的工作目录暂时无法读取/.test(error.message);
  }

  function serviceOffline(error) {
    return error.code === 'COMPONENT_SERVER_OFFLINE' || /未找到监听|开发服务的工作目录暂时无法读取/.test(error.message);
  }

  async function checkProject(state, { force = false, minInterval = 0 } = {}) {
    const previous = projectChecks.get(state.origin);
    if (previous?.project && previous.projectId !== state.project.id) {
      if (previous.pending) return previous.promise;
      if (!previous.failures) return checkProject({ ...state, project: previous.project }, { force, minInterval });
      if (serviceOffline(previous.error) && Date.now() < previous.nextAt && (!force || Date.now() - previous.checkedAt < minInterval)) return previous.promise;
    }
    if (previous?.projectId === state.project.id) {
      if (previous.pending || (Date.now() < previous.nextAt && (!force || Date.now() - previous.checkedAt < minInterval))) return previous.promise;
    }
    const check = { projectId: state.project.id, project: state.project, pending: true, failures: previous?.failures || 0 };
    check.promise = nativeRequest('checkProject', { origin: state.origin, projectId: state.project.id }).then((result) => {
      check.failures = 0;
      check.project = result.project;
      check.nextAt = Date.now() + CHECK_INTERVAL;
      return result;
    }, (error) => {
      check.error = error;
      check.failures++;
      check.nextAt = Date.now() + retryDelay(check.failures);
      throw error;
    }).finally(() => { check.pending = false; check.checkedAt = Date.now(); });
    projectChecks.set(state.origin, check);
    return check.promise;
  }

  function watchState(state) {
    const nextAt = state.retryAt || projectChecks.get(state.origin)?.nextAt;
    const retryAfter = state.status === 'on' ? CHECK_INTERVAL : state.status === 'recovering' && nextAt ? Math.max(1000, nextAt - Date.now()) : 1000;
    return { watch: ['on', 'waiting', 'restoring', 'recovering'].includes(state.status), observe: state.status === 'waiting', retryAfter };
  }

  async function readState(tabId) {
    const result = await chrome.storage.session.get(tabKey(tabId));
    const state = result[tabKey(tabId)] || { status: 'off', origin: '', generation: '' };
    return { ...state, enabled: !!state.origin && await originEnabled(state.origin) };
  }
  async function writeState(tabId, state) {
    await chrome.storage.session.set({ [tabKey(tabId)]: state });
    chrome.runtime.sendMessage({ type: 'COMPONENT_STATE_CHANGED', tabId }).catch(() => {});
    return state;
  }
  function lock(tabId, task) {
    const previous = transitions.get(tabId) || Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    transitions.set(tabId, next);
    next.finally(() => { if (transitions.get(tabId) === next) transitions.delete(tabId); }).catch(() => {});
    return next;
  }

  async function stopRuntime(tabId) {
    snapshots.delete(tabId);
    try {
      await executeScript({ target: { tabId, allFrames: true }, world: 'ISOLATED', func: () => globalThis.__IDT_COMPONENT_INSPECTOR__?.destroy() });
    } catch (_) { /* 标签页关闭或离开可注入页面。 */ }
  }

  async function pause(tabId, error) {
    const state = await readState(tabId);
    await writeState(tabId, { ...state, status: 'paused', error, generation: token() });
    await stopRuntime(tabId);
  }
  async function pauseAll(error) {
    const states = await chrome.storage.session.get(null);
    await Promise.all(Object.entries(states).filter(([key, state]) => key.startsWith(policy.TAB_PREFIX) && ['on', 'starting', 'restoring', 'waiting', 'recovering'].includes(state.status)).map(([key]) => {
      const tabId = Number(key.slice(policy.TAB_PREFIX.length));
      return lock(tabId, async () => {
        if (['on', 'starting', 'restoring', 'waiting', 'recovering'].includes((await readState(tabId)).status)) await pause(tabId, error);
      });
    }));
  }

  async function assertTarget(tabId, origin, active = false) {
    const tab = await chrome.tabs.get(tabId);
    if (active && !tab.active) throw new Error('当前标签页已切换，请在目标页面重新操作');
    if (policy.originOf(tab.pendingUrl || tab.url) !== origin) throw new Error('当前页面地址已变化，请重试');
    const settings = await policy.getSettings();
    if (!policy.isAllowed(origin, settings.origins)) throw new Error('请切换到允许的本地开发页面');
    return { tab, settings };
  }

  async function installRuntime(tabId, state, settings, frameId) {
    const target = frameId == null ? { tabId, allFrames: true } : { tabId, frameIds: [frameId] };
    await executeScript({ target, world: 'ISOLATED', files: ['component-inspector.js'] });
    const results = await executeScript({ target, world: 'ISOLATED', func: (config) => {
      if (location.origin === config.origin) globalThis.__IDT_COMPONENT_INSPECTOR__?.start(config);
      else globalThis.__IDT_COMPONENT_INSPECTOR__?.destroy();
      return globalThis.__IDT_COMPONENT_INSPECTOR__?.isRunning(config) === true;
    }, args: [{ origin: state.origin, generation: state.generation, openShortcut: settings.openShortcut, menuShortcut: settings.menuShortcut }] });
    if (!results.some((result) => result.frameId === (frameId ?? 0) && result.result === true)) throw new Error('定位脚本尚未启动，请等待页面加载完成后重试');
  }

  async function startTab(tabId, origin, explicit, previous = {}) {
    if (uninstalling) throw new Error('辅助程序正在卸载，请稍候');
    const { settings } = await assertTarget(tabId, origin, explicit);
    if (!await originEnabled(origin)) return readState(tabId);
    const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
    const generation = token();
    const reuse = canReuseProject(previous, origin);
    const initial = { ...(reuse ? previous : {}), status: reuse ? 'restoring' : 'starting', origin, generation, documentId: frame?.documentId, error: '' };
    IDTComponentSources.clearSourceCache(origin);
    await writeState(tabId, initial);
    try {
      await stopRuntime(tabId);
      const host = await readyHost();
      if (!host.editor || !host.editorAvailable) throw new Error('请先选择有效的编辑器');
      assertHostReady(host);
      let project = previous.project, frameworks = previous.frameworks;
      if (reuse) {
        // 刷新只检查原服务是否仍有效；服务变化时才重新查找项目。
        try { ({ project } = await checkProject(previous, { force: true })); }
        catch (error) {
          if (!serviceChanged(error)) throw error;
          return startTab(tabId, origin, explicit);
        }
      } else {
        const results = await executeScript({ target: { tabId, allFrames: true }, world: 'MAIN', func: inspectComponentPage, args: [{ mode: 'detect', origin }] });
        const detections = results.map((result) => result.result).filter((result) => result && !result.error);
        frameworks = [...new Set(detections.flatMap((result) => result.frameworks || []))];
        if (!frameworks.length) {
          return writeState(tabId, { status: 'waiting', origin, generation, documentId: frame?.documentId, error: '' });
        }
        const hints = new Set(detections.flatMap((result) => result.hints || []));
        // React 19 通过调试栈提供路径；启动时也要还原源码，才能识别工作区中的子项目。
        const sources = new Map();
        for (const result of detections) {
          for (const source of result.sources || []) {
            if (sources.size < 12) sources.set(JSON.stringify(source), { source, scripts: result.scripts });
          }
        }
        const resolved = await withTimeout(Promise.allSettled([...sources.values()].map(({ source, scripts }) => IDTComponentSources.resolveComponentSource(source, origin, scripts))), 8000, '组件源码读取超时，请点击「检查连接」重试');
        for (const result of resolved) if (result.status === 'fulfilled' && result.value?.file) hints.add(result.value.file);
        ({ project } = await nativeRequest('identifyProject', { origin, hints: [...hints].slice(0, 32) }));
        projectChecks.set(origin, { projectId: project.id, project, promise: Promise.resolve({ project }), checkedAt: Date.now(), nextAt: Date.now() + CHECK_INTERVAL, failures: 0 });
      }
      if (uninstalling) throw new Error('辅助程序正在卸载，请稍候');
      const state = { ...initial, status: 'on', project, frameworks, retryAt: 0, retryCount: 0 };
      await installRuntime(tabId, state, settings);
      await assertTarget(tabId, origin, explicit);
      const currentFrame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
      if (frame?.documentId !== currentFrame?.documentId) throw new Error('页面正在切换，加载完成后会自动恢复定位');
      if (!await originEnabled(origin)) return readState(tabId);
      const latest = await readState(tabId);
      if (latest.generation !== generation) throw new Error('页面加载状态已变化，请重试');
      await writeState(tabId, state);
      return state;
    } catch (error) {
      const latest = await readState(tabId);
      if (latest.generation === generation && serviceChanged(error) && await originEnabled(origin)) {
        const retryCount = (previous.retryCount || 0) + 1;
        return writeState(tabId, { ...latest, status: 'recovering', retryCount, retryAt: Date.now() + retryDelay(retryCount), error: '开发服务暂时离线，服务恢复后会自动启用定位。' });
      }
      if (latest.generation === generation) await pause(tabId, error.message);
      throw error;
    }
  }

  async function restoreTab(tabId, sender, payload = {}) {
    const tab = await chrome.tabs.get(tabId);
    const origin = policy.originOf(tab.pendingUrl || tab.url);
    let state = await readState(tabId);
    if (!origin || !await originEnabled(origin) || !policy.isAllowed(origin, (await policy.getSettings()).origins)) return {};
    const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
    if (sender && (policy.originOf(sender.url) !== origin || (sender.frameId === 0 && sender.documentId && sender.documentId !== frame?.documentId))) return {};
    const activeCheck = payload.visible === true && ['visible', 'focus', 'pageshow', 'wake'].includes(payload.reason);
    if (sender?.frameId > 0 && state.status === 'recovering') return {};
    if (['on', 'recovering'].includes(state.status) && state.project?.id && state.origin === origin && state.documentId === frame?.documentId) {
      try {
        try {
          const { project } = await checkProject(state, { force: activeCheck, minInterval: 1000 });
          if (project.id !== state.project.id) {
            await stopRuntime(tabId);
            state = await writeState(tabId, { ...state, project, status: 'restoring', generation: token(), error: '', retryAt: 0, retryCount: 0 });
          }
        }
        catch (error) {
          if (!serviceChanged(error)) throw error;
          if (serviceOffline(error)) {
            let recovering = state;
            if (state.status === 'on') {
              await stopRuntime(tabId);
              recovering = await writeState(tabId, { ...state, status: 'recovering', generation: token(), error: '开发服务暂时离线，服务恢复后会自动启用定位。' });
            }
            return sender?.frameId > 0 ? {} : watchState(recovering);
          }
          return watchState(await startTab(tabId, origin, false));
        }
        if (state.status === 'restoring') await installRuntime(tabId, state, await policy.getSettings());
        else if (sender?.frameId > 0) {
          const child = await chrome.webNavigation.getFrame({ tabId, frameId: sender.frameId });
          if (sender.documentId && child?.documentId !== sender.documentId) return {};
          await installRuntime(tabId, state, await policy.getSettings(), sender.frameId);
        } else {
          const results = await executeScript({ target: { tabId, documentIds: [frame.documentId] }, world: 'ISOLATED', func: (config) => globalThis.__IDT_COMPONENT_INSPECTOR__?.isRunning(config) === true, args: [{ origin, generation: state.generation }] });
          if (!results[0]?.result) await installRuntime(tabId, state, await policy.getSettings());
        }
        if (['recovering', 'restoring'].includes(state.status)) {
          const restored = await writeState(tabId, { ...state, status: 'on', retryAt: 0, retryCount: 0, error: '' });
          return sender?.frameId > 0 ? {} : watchState(restored);
        }
      } catch (error) { await pause(tabId, error.message); throw error; }
      return sender?.frameId > 0 ? {} : watchState(state);
    }
    if (sender?.frameId > 0) return {};
    if (state.status === 'recovering' && state.retryAt > Date.now() && !activeCheck) return watchState(state);
    const restored = await startTab(tabId, origin, false, ['restoring', 'recovering'].includes(state.status) ? state : {});
    return watchState(restored);
  }

  async function matchingTabs(origin) {
    return (await chrome.tabs.query({})).filter((tab) => policy.originOf(tab.pendingUrl || tab.url) === origin);
  }

  async function setOriginEnabled(tabId, origin, enabled) {
    await assertTarget(tabId, origin, true);
    await chrome.storage.local.set({ [policy.ORIGIN_PREFIX + origin]: enabled });
    if (!enabled) { projectChecks.delete(origin); IDTComponentSources.clearSourceCache(origin); }
    const tabs = await matchingTabs(origin);
    const results = await Promise.allSettled(tabs.map((tab) => lock(tab.id, async () => {
      if (!enabled) {
        await writeState(tab.id, { status: 'off', origin, generation: token() });
        await stopRuntime(tab.id);
        return {};
      }
      // 已经打开的页面也要重新唤醒加载通知，等待尚未挂载的组件。
      await executeScript({ target: { tabId: tab.id, allFrames: true }, world: 'ISOLATED', files: ['component-document-ready.js'] });
      return startTab(tab.id, origin, tab.id === tabId);
    })));
    const current = results[tabs.findIndex((tab) => tab.id === tabId)];
    if (current?.status === 'rejected') throw current.reason;
    return current?.value || {};
  }

  async function restoreEnabledTabs() {
    const tabs = await chrome.tabs.query({});
    await Promise.allSettled(tabs.filter((tab) => tab.status !== 'loading').map((tab) => lock(tab.id, async () => {
      const origin = policy.originOf(tab.url);
      if (!origin || !await originEnabled(origin)) return;
      await executeScript({ target: { tabId: tab.id, allFrames: true }, world: 'ISOLATED', files: ['component-document-ready.js'] });
      await restoreTab(tab.id);
    })));
  }

  async function inspect(sender, payload) {
    const tabId = sender.tab?.id;
    const state = await readState(tabId);
    if (state.status !== 'on' || state.generation !== payload.generation || policy.originOf(sender.url) !== state.origin) throw new Error('当前页面的组件定位已停止');
    await assertTarget(tabId, state.origin, true);
    const target = sender.documentId ? { tabId, documentIds: [sender.documentId] } : { tabId, frameIds: [sender.frameId || 0] };
    const results = await executeScript({ target, world: 'MAIN', func: inspectComponentPage, args: [{ mode: 'element', x: Number(payload.x), y: Number(payload.y), marker: payload.details ? payload.marker : '', props: payload.details === true, origin: state.origin }] });
    const result = results[0]?.result;
    if (!result || result.error) throw new Error(result?.error || '页面元素已变化');
    const latest = await readState(tabId);
    if (latest.status !== 'on' || latest.generation !== state.generation) throw new Error('页面状态已变化');
    if (!payload.details) return { components: result.components.map(({ name, framework }) => ({ name, framework })), rect: result.rect };
    const id = token();
    let entries = snapshots.get(tabId);
    if (!entries) { entries = new Map(); snapshots.set(tabId, entries); }
    const entry = { generation: state.generation, documentId: sender.documentId, frameId: sender.frameId || 0, created: Date.now(), rawComponents: result.components, scripts: result.scripts };
    entries.set(id, entry);
    if (entries.size > 8) entries.delete(entries.keys().next().value);
    const components = await Promise.all(result.components.map(async (component) => {
      const source = await IDTComponentSources.resolveComponentSource(component.source, state.origin, result.scripts);
      return { ...component, source };
    }));
    const resolvedState = await readState(tabId);
    if (snapshots.get(tabId)?.get(id) !== entry || resolvedState.status !== 'on' || resolvedState.generation !== state.generation) throw new Error('组件信息已过期，请重新选择');
    entry.components = components;
    return { snapshotId: id, components, rect: result.rect };
  }

  async function openSnapshot(sender, payload) {
    const tabId = sender.tab?.id;
    const state = await readState(tabId);
    const entry = snapshots.get(tabId)?.get(payload.snapshotId);
    if (state.status !== 'on' || !entry || entry.generation !== state.generation || entry.documentId !== sender.documentId || entry.frameId !== (sender.frameId || 0) || Date.now() - entry.created > 300000) throw new Error('组件信息已过期，请重新选择');
    await assertTarget(tabId, state.origin, true);
    const source = entry.components?.[payload.index]?.source;
    if (!source?.file) throw new Error('此组件尚未提供源码位置');
    let openingState = state;
    try {
      assertHostReady(await readyHost());
      let result;
      try { result = await nativeRequest('openSource', { origin: state.origin, projectId: state.project.id, source }); }
      catch (error) {
        if (!serviceChanged(error)) throw error;
        openingState = await lock(tabId, async () => {
          const latest = await readState(tabId);
          if (!latest.enabled || latest.origin !== state.origin || latest.documentId !== state.documentId) throw new Error('当前页面的组件定位已停止');
          if (latest.status === 'on' && latest.project.id !== state.project.id) return latest;
          return startTab(tabId, state.origin, false);
        });
        if (openingState.status !== 'on') throw Object.assign(new Error('正在等待开发服务恢复，恢复后会自动启用定位。'), { code: 'COMPONENT_SERVER_OFFLINE' });
        const frame = await chrome.webNavigation.getFrame({ tabId, frameId: sender.frameId || 0 });
        if (entry.documentId && entry.documentId !== frame?.documentId) throw new Error('页面已经切换，请重新选择组件');
        const rawSource = entry.rawComponents?.[payload.index]?.source;
        const refreshedSource = rawSource ? await IDTComponentSources.resolveComponentSource(rawSource, state.origin, entry.scripts) : source;
        if (!refreshedSource?.file) throw new Error('此组件尚未提供源码位置');
        await assertTarget(tabId, state.origin, true);
        const latest = await readState(tabId);
        if (!latest.enabled || latest.status !== 'on' || latest.generation !== openingState.generation) throw new Error('当前页面的组件定位已停止');
        result = await nativeRequest('openSource', { origin: state.origin, projectId: openingState.project.id, source: refreshedSource });
      }
      snapshots.get(tabId)?.delete(payload.snapshotId);
      const latest = await readState(tabId);
      if (latest.status === 'on' && latest.generation === openingState.generation) await writeState(tabId, { ...latest, lastOpened: result });
      return result;
    } catch (error) {
      const latest = await readState(tabId);
      if (serviceChanged(error)) {
        await lock(tabId, async () => {
          const current = await readState(tabId);
          if (current.enabled && current.status === 'on' && current.generation === openingState.generation) {
            await stopRuntime(tabId);
            await writeState(tabId, { ...current, status: 'recovering', generation: token(), error: '正在等待开发服务恢复，恢复后会自动启用定位。' });
          }
        });
      } else if (latest.generation === openingState.generation && /编辑器|连接/.test(error.message)) await pause(tabId, error.message);
      throw error;
    }
  }

  async function handle(msg, sender) {
    const payload = msg.payload || {};
    if (msg.type === 'COMPONENT_DOCUMENT_READY') {
      if (!sender.tab?.id) return {};
      const tabId = sender.tab.id;
      return lock(tabId, () => restoreTab(tabId, sender, payload));
    }
    if (msg.type === 'COMPONENT_INSPECT') return inspect(sender, payload);
    if (msg.type === 'COMPONENT_OPEN') return openSnapshot(sender, payload);
    // 设置和系统窗口只接受扩展页面发起的操作。
    if (!sender.url?.startsWith(chrome.runtime.getURL(''))) throw new Error('操作来源无效');
    switch (msg.type) {
      case 'COMPONENT_STATUS': {
        const settings = await policy.getSettings();
        let state = { status: 'off', enabled: false };
        if (Number.isInteger(payload.tabId)) {
          const tab = await chrome.tabs.get(payload.tabId);
          const origin = policy.originOf(tab.pendingUrl || tab.url);
          state = await readState(payload.tabId);
          if (state.origin !== origin) state = { status: 'off', origin, enabled: await originEnabled(origin) };
        }
        let host;
        try { host = { connected: true, ...(await readyHost()) }; }
        catch (error) { host = { connected: false, editor: null, error: error.message }; }
        return { settings, state, host };
      }
      case 'COMPONENT_CHOOSE_EDITOR': {
        const host = await readyHost();
        assertHostReady(host);
        return nativeRequest('chooseEditor');
      }
      case 'COMPONENT_RECONNECT_HOST': {
        if (checkingHost) await checkingHost.catch(() => {});
        updateFailure = '';
        // 正在识别项目或打开源码时沿用当前连接，避免检查连接中断这些操作。
        if (!pending.size) disconnectHost();
        await readyHost();
        await restoreEnabledTabs();
        return {};
      }
      case 'COMPONENT_UNINSTALL_HOST': {
        if (uninstalling) throw new Error('辅助程序正在卸载，请稍候');
        uninstalling = true;
        try {
          if (checkingHost) await checkingHost.catch(() => {});
          const host = await nativeRequest('status');
          if (!host.capabilities?.includes('uninstall')) throw new Error('当前版本请复制卸载命令到终端执行');
          await pauseAll('组件定位已暂停，重新安装辅助程序后可再次启动');
          const result = await nativeRequest('uninstall');
          disconnectHost();
          return result;
        } finally { uninstalling = false; }
      }
      case 'COMPONENT_CLEAR_EDITOR': {
        assertHostReady(await readyHost());
        const result = await nativeRequest('clearEditor');
        await pauseAll('请先选择编辑器，再启动当前页面');
        return result;
      }
      case 'COMPONENT_SAVE_SETTINGS': {
        const settings = policy.normalizeSettings(payload);
        await chrome.storage.local.set({ [policy.SETTINGS_KEY]: settings });
        const all = await chrome.storage.session.get(null);
        for (const [key, state] of Object.entries(all)) {
          if (!key.startsWith(policy.TAB_PREFIX) || state.status !== 'on') continue;
          const tabId = Number(key.slice(policy.TAB_PREFIX.length));
          await lock(tabId, async () => {
            const latest = await readState(tabId);
            if (latest.status !== 'on') return;
            if (!policy.isAllowed(latest.origin, settings.origins)) await pause(tabId, '该开发地址已从允许列表移除');
            else await installRuntime(tabId, latest, settings).catch(() => {});
          });
        }
        return { settings };
      }
      case 'COMPONENT_START': return lock(`origin:${payload.origin}`, () => setOriginEnabled(payload.tabId, payload.origin, true));
      case 'COMPONENT_STOP': return lock(`origin:${payload.origin}`, () => setOriginEnabled(payload.tabId, payload.origin, false));
      default: throw new Error('未知组件定位操作');
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (!msg?.type?.startsWith('COMPONENT_') || msg.type === 'COMPONENT_STATE_CHANGED') return false;
    handle(msg, sender).then((result) => respond({ ...result, ok: true })).catch((error) => respond({ ok: false, error: error.message }));
    return true;
  });
  chrome.tabs.onRemoved.addListener((tabId) => { snapshots.delete(tabId); chrome.storage.session.remove(tabKey(tabId)).catch(() => {}); });
  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    const { tabId } = details;
    lock(tabId, async () => {
      const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
      if (frame?.documentId !== details.documentId) return;
      const state = await readState(tabId);
      if (state.status === 'on' && state.documentId === details.documentId) return;
      const origin = policy.originOf(details.url);
      const enabled = origin && await originEnabled(origin) && policy.isAllowed(origin, (await policy.getSettings()).origins);
      const reuse = enabled && details.transitionType === 'reload' && canReuseProject(state, origin);
      await writeState(tabId, { ...(reuse ? state : {}), status: enabled ? reuse ? 'restoring' : 'waiting' : 'off', origin, generation: token(), documentId: details.documentId, error: '' });
      snapshots.delete(tabId);
    }).catch(() => {});
  });

  function routeChanged(details) {
    if (details.frameId !== 0) return;
    lock(details.tabId, async () => {
      const state = await readState(details.tabId);
      const frame = await chrome.webNavigation.getFrame({ tabId: details.tabId, frameId: 0 });
      if (frame?.documentId !== details.documentId) return;
      snapshots.delete(details.tabId);
      if (state.status !== 'on') { await restoreTab(details.tabId); return; }
      await restoreTab(details.tabId);
      await executeScript({ target: { tabId: details.tabId, documentIds: [details.documentId] }, world: 'ISOLATED', func: () => globalThis.__IDT_COMPONENT_INSPECTOR__?.resetInteraction() });
    }).catch(() => {});
  }
  chrome.webNavigation.onHistoryStateUpdated.addListener(routeChanged);
  chrome.webNavigation.onReferenceFragmentUpdated.addListener(routeChanged);
  chrome.tabs.onUpdated.addListener((tabId, change) => {
    if (change.status === 'complete') lock(tabId, () => restoreTab(tabId)).catch(() => {});
  });
  chrome.runtime.onStartup.addListener(() => { restoreEnabledTabs().catch(() => {}); });
  chrome.runtime.onInstalled.addListener(() => { restoreEnabledTabs().catch(() => {}); });
  ns.componentInspectorBackground = { readState, handle, nativeRequest };
})();


/* ===== src/background/index.js ===== */
/* 内部开发工具箱 — Background Service Worker 入口 */
/* 处理 popup 发来的跨域登录请求，并保留原有的 PING 消息中转。 */
(() => {
  'use strict';

  const ns = (globalThis.InternalDevToolkitBg = globalThis.InternalDevToolkitBg || {});
  const commonNs = globalThis.InternalDevToolkit;

  // Chrome 116+：点击扩展图标时直接打开浏览器原生侧边栏。
  // side_panel.default_path 由 manifest 提供，这里只负责绑定 action 行为。
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.error('[内部开发工具箱] 侧边栏初始化失败:', err));
  }

  // 按需向指定标签页主上下文注入 mock-hook.js（绕过页面 CSP）。
  // 前置条件：「接口 Mock 总开关」开启；hook 内部有防重复安装守卫，重复调用安全。
  // 注入成功后把当前项目规则同步给 content script → 页面主上下文。
  async function ensureMockHookInjected(tabId) {
    if (!chrome.scripting?.executeScript) {
      return { ok: false, error: '当前环境不支持 scripting.executeScript' };
    }
    if (!commonNs.mockStorage?.getMockEnabled) {
      return { ok: false, error: 'mockStorage not available' };
    }
    const enabled = await commonNs.mockStorage.getMockEnabled();
    if (!enabled) {
      return { ok: false, skipped: 'mock-disabled', error: '接口 Mock 总开关已关闭，跳过注入' };
    }
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: 'MAIN',
      files: ['mock-hook.js'],
    });
    // hook 装好后，把当前项目的规则同步给 content script → 页面主上下文
    try {
      const rules = commonNs.mockStorage ? await commonNs.mockStorage.getMockRules() : [];
      chrome.tabs.sendMessage(tabId, { type: 'APPLY_MOCK_RULES', rules }, () => {
        void chrome.runtime?.lastError;
      });
    } catch (_) {}
    return { ok: true };
  }

  ns.mockHook = { ensureInjected: ensureMockHookInjected };

  // Service Worker 启动时初始化：加载当前项目并执行数据迁移
  (async () => {
    try {
      await commonNs.currentProject.loadCurrentProject();
      await commonNs.currentProject.migrateOldStorageKeys();
      console.log('[内部开发工具箱] Background 初始化完成，当前项目:', commonNs.currentProject.getName());
    } catch (err) {
      console.error('[内部开发工具箱] Background 初始化失败:', err);
    }
  })();

  function handleMessage(msg, _sender, sendResponse) {
    if (!msg || !msg.type) return false;

    if (msg.type === 'PING') {
      sendResponse({ type: 'PONG', at: Date.now() });
      return true;
    }

    if (msg.type === 'SET_PROJECT_CONTEXT') {
      const projectId = String(msg.payload?.projectId || '');
      commonNs.currentProject
        .switchProjectContext(projectId)
        .then((project) => sendResponse({ ok: true, projectId: project.id }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'LOGIN_API' && ns.api) {
      ns.api
        .doLogin(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'VERIFY_LOGIN_API' && ns.api) {
      ns.api
        .verifyLogin(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'APPLY_ADMIN_LOGIN_HISTORY' && ns.api) {
      ns.api.applyHistory(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'INJECT_ADMIN_TOKEN' && ns.adminTokenInjection) {
      ns.adminTokenInjection
        .injectStoredToken(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // popup 保存自定义域名后通知 background 刷新内存缓存
    // （getBaseUrl 同步读取该缓存，所有后台请求会立即使用新域名）
    if (msg.type === 'REFRESH_BASE_URL') {
      commonNs.currentProject
        .refreshBaseUrlCache()
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_TENANTS' && ns.tenantApi) {
      ns.tenantApi
        .fetchTenantPage(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_DEPTS' && ns.tenantApi) {
      ns.tenantApi
        .fetchDeptList(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_USERS' && ns.tenantApi) {
      ns.tenantApi
        .fetchUserPage(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if ((msg.type === 'FETCH_ACCOUNT_USERS' || msg.type === 'FETCH_ACCOUNT_PAGE') && ns.tenantApi) {
      ns.tenantApi
        .fetchAccountPage(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'QUICK_LOGIN' && ns.quickLogin) {
      ns.quickLogin
        .quickLogin(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // ── Client 端 API：教师/学生/班级 ──
    if (msg.type === 'RESOLVE_USER_SESSION' && ns.quickLogin) {
      ns.quickLogin
        .resolveUserSession(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_OTHER_APPS') {
      if (typeof ns.tenantApi?.fetchOtherAppList !== 'function') {
        sendResponse({ ok: false, error: '外部应用列表接口模块未加载，请重新加载扩展' });
        return false;
      }
      Promise.resolve()
        .then(() => ns.tenantApi.fetchOtherAppList(msg.payload))
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_TEACHERS' && ns.tenantApi) {
      ns.tenantApi
        .fetchTeacherPage(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_STUDENTS' && ns.tenantApi) {
      ns.tenantApi
        .fetchStudentPage(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_SEMESTERS') {
      if (typeof ns.tenantApi?.fetchSemesterPage !== 'function') {
        sendResponse({ ok: false, error: '学期列表接口模块未加载，请重新加载扩展' });
        return false;
      }
      Promise.resolve()
        .then(() => ns.tenantApi.fetchSemesterPage(msg.payload))
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_TEACHER_DETAIL' && ns.tenantApi) {
      ns.tenantApi
        .fetchTeacherDetail(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_SCHOOL_DEPT_TREE' && ns.tenantApi) {
      ns.tenantApi
        .fetchSchoolDeptTree(msg.payload)
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'FETCH_CLASS_TEACHERS') {
      if (typeof ns.tenantApi?.fetchClassTeachers !== 'function') {
        sendResponse({ ok: false, error: '班级教师接口模块未加载，请重新加载扩展' });
        return false;
      }
      Promise.resolve()
        .then(() => ns.tenantApi.fetchClassTeachers(msg.payload))
        .then((res) => sendResponse({ ok: true, res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'GET_QUICK_LOGIN_RECENT' && ns.quickLogin) {
      ns.quickLogin
        .getRecent()
        .then((records) => sendResponse({ ok: true, records }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'DELETE_QUICK_LOGIN_RECENT' && ns.quickLogin) {
      ns.quickLogin
        .deleteRecent(msg.payload)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OPEN_LOGIN_URL' && ns.quickLogin) {
      ns.quickLogin
        .openLoginUrl(msg.payload.url, { reuseCurrentTab: msg.payload.reuseCurrentTab })
        .then((result) => sendResponse({ ok: true, tabId: result.tabId, reused: result.reused }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // ── 「其它」站点登录（知雀 / 高职校） ──
    if (msg.type === 'OTHER_LOGIN' && ns.otherLogin) {
      ns.otherLogin
        .doLogin(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // 一键登入：拿 token 后带 accessToken 打开站点完成自动登录
    if (msg.type === 'OTHER_ENTER' && ns.otherLogin) {
      ns.otherLogin
        .doEnter(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // 知雀：登录后走 /client/tenant/zhique/redirectUrl OAuth SSO 进入 a.zhique.cn
    if (msg.type === 'OTHER_ZHIQUE_ENTER' && ns.otherLogin) {
      ns.otherLogin
        .doZhiqueEnter(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_GET_CREDENTIALS' && ns.otherLogin) {
      ns.otherLogin
        .getCredentials()
        .then((creds) => sendResponse({ ok: true, ...creds }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_GET_TOKEN' && ns.otherLogin) {
      ns.otherLogin
        .getToken()
        .then((state) => sendResponse({ ok: true, ...state }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_SAVE_TOKEN' && ns.otherLogin) {
      ns.otherLogin
        .saveToken(msg.payload?.token || '', msg.payload?.user || null)
        .then((state) => sendResponse({ ok: true, ...state }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_CLEAR_TOKEN' && ns.otherLogin) {
      ns.otherLogin
        .clearToken()
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_GET_HISTORY' && ns.otherLogin) {
      ns.otherLogin
        .getHistory()
        .then((records) => sendResponse({ ok: true, records }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_DELETE_HISTORY' && ns.otherLogin) {
      ns.otherLogin
        .deleteHistory(msg.payload)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'OTHER_LIST_TEACHERS' && ns.otherLogin) {
      ns.otherLogin
        .listTeachers(msg.payload)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // ── APP 端登录（学生 APP token 获取） ──
    // 统一守卫：APP_* 消息到达时若 appLogin 模块未加载，返回明确错误而非静默忽略，
    // 避免 popup 端收到 "message port closed before a response was received"。
    if (typeof msg.type === 'string' && msg.type.startsWith('APP_')) {
      if (!ns.appLogin) {
        sendResponse({ ok: false, error: 'APP 登录模块未加载，请重新加载扩展' });
        return true;
      }
      const handlers = {
        APP_LIST_SCHOOLS: (p) => ns.appLogin.listSchools(p),
        APP_LOGIN: (p) => ns.appLogin.loginAndInject(p),
        APP_GET_CREDENTIALS: () => ns.appLogin.getCredentials(),
        APP_SAVE_CREDENTIALS: (p) => ns.appLogin.saveCredentials(p || {}),
        APP_GET_TOKEN: () => ns.appLogin.getToken(),
        APP_SAVE_TOKEN: (p) => ns.appLogin.saveToken(p?.token || '', p?.user || null),
        APP_CLEAR_TOKEN: () => ns.appLogin.clearToken(),
        APP_GET_HISTORY: async () => ({ records: await ns.appLogin.getHistory() }),
        APP_DELETE_HISTORY: (p) => ns.appLogin.deleteHistory(p),
      };
      const handler = handlers[msg.type];
      if (handler) {
        handler(msg.payload)
          .then((result) => sendResponse(result && typeof result === 'object' && 'ok' in result ? result : { ok: true, ...result }))
          .catch((err) => sendResponse({ ok: false, error: err.message }));
        return true;
      }
    }

    // Mock 相关消息处理
    if (msg.type === 'GET_MOCK_RULES' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleGetMockRules(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'ADD_MOCK_RULE' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleAddMockRule(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'RESOLVE_IMPORT_CONFLICT' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleResolveImportConflict(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'DELETE_MOCK_RULE' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleDeleteMockRule(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'DELETE_MOCK_ENDPOINT' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleDeleteMockEndpoint(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'DELETE_CAPTURED_REQUEST' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleDeleteCapturedRequest(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'TOGGLE_MOCK_RULE' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleToggleMockRule(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'CLEAR_MOCK_RULES' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleClearMockRules(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'GET_CURRENT_PROJECT' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleGetCurrentProject(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    if (msg.type === 'GET_REQUEST_LOG' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleGetRequestLog(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // 禁监接口池：获取 / 加入 / 移除（按项目持久化，并同步 content script → hook）
    if (msg.type === 'GET_MONITOR_DISABLED' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleGetMonitorDisabled(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }
    if (msg.type === 'ADD_MONITOR_DISABLED' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleAddMonitorDisabled(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }
    if (msg.type === 'REMOVE_MONITOR_DISABLED' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleRemoveMonitorDisabled(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // 接口 Mock 总开关：读取 / 设置（设置后同步 content script → 页面 hook）
    if (msg.type === 'GET_MOCK_ENABLED' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleGetMockEnabled(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }
    if (msg.type === 'SET_MOCK_ENABLED' && commonNs.mockHandler) {
      commonNs.mockHandler
        .handleSetMockEnabled(msg)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // 清空指定标签页 content script 中的请求记录
    if (msg.type === 'CLEAR_REQUEST_LOG') {
      const { tabId } = msg;
      if (!tabId) {
        sendResponse({ ok: false, error: 'tabId required' });
        return true;
      }
      chrome.tabs.sendMessage(tabId, { type: 'CLEAR_REQUEST_LOG' }, () => {
        if (chrome.runtime?.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ ok: true });
      });
      return true;
    }

    // DevTools 面板开关：激活/关闭指定标签页 hook 的请求记录。
    // hook 不再静态安装，改为按需注入：仅当「接口 Mock 总开关」开启时，
    // 面板激活（active=true）才确保 hook 注入当前标签页，再转发激活消息；
    // 开关关闭时不注入、不转发，页面保持零侵入。
    if (msg.type === 'SET_HOOK_ACTIVE') {
      const { tabId, active } = msg;
      if (!tabId) {
        sendResponse({ ok: false, error: 'tabId required' });
        return true;
      }
      (async () => {
        if (active && ns.mockHook?.ensureInjected) {
          // 开关关闭时 ensureInjected 内部会拒绝注入；此处失败不阻断后续判断
          await ns.mockHook.ensureInjected(tabId).catch(() => ({ ok: false }));
        }
        const mockEnabled = commonNs.mockStorage?.getMockEnabled
          ? await commonNs.mockStorage.getMockEnabled()
          : true;
        if (!mockEnabled) {
          // 总开关关闭：不向页面注入/转发任何 hook 相关消息
          sendResponse({ ok: true, skipped: 'mock-disabled' });
          return;
        }
        chrome.tabs.sendMessage(tabId, { type: 'SET_HOOK_ACTIVE', active }, () => {
          if (chrome.runtime?.lastError) {
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          // 激活时一并下发持久化的禁监接口池，使 hook 立即按最新列表跳过记录。
          // 面板关闭（active=false）时无需下发。
          if (active && commonNs.mockStorage) {
            commonNs.mockStorage.getMonitorDisabled().then((disabled) => {
              chrome.tabs.sendMessage(tabId, { type: 'APPLY_MONITOR_DISABLED', disabled }, () => {
                void chrome.runtime?.lastError;
              });
            }).catch(() => {});
          }
          sendResponse({ ok: true });
        });
      })().catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    // 在指定标签页的主上下文注入 mock-hook.js（绕过页面 CSP）。
    // 前置条件：「接口 Mock 总开关」开启；hook 内部有防重复安装守卫，重复调用安全。
    // 触发点：DevTools 面板激活（SET_HOOK_ACTIVE）、面板打开总开关（SET_MOCK_ENABLED）。
    if (msg.type === 'INJECT_MOCK_HOOK') {
      const tabId = msg.tabId || (_sender.tab && _sender.tab.id);
      if (!tabId) {
        sendResponse({ ok: false, error: 'no target tab' });
        return true;
      }
      ns.mockHook
        .ensureInjected(tabId)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    return false;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (typeof msg?.adminSessionId !== 'string') return handleMessage(msg, sender, sendResponse);
    commonNs.adminLoginHistory.getSession().then((session) => {
      if ((session?.id || '') !== msg.adminSessionId) {
        sendResponse({ ok: false, error: '后台账号已切换，请重新查询' });
        return;
      }
      if (!handleMessage(msg, sender, sendResponse)) sendResponse({ ok: false, error: '不支持的查询请求' });
    }).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });
})();
