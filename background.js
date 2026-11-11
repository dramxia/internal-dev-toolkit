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
    if (source.kind === "html") return { file: source.file, htmlUrl: source.htmlUrl, line: null, column: null, precision: "file" };
    if (source.kind !== "stack") {
      if (!source.file) return null;
      const endLine = Number.isSafeInteger(source.endLine) && source.endLine > source.line ? source.endLine : null;
      return { file: sourcePath(source.file, origin), line: source.line || null, column: source.column || null, ...endLine ? { endLine } : {}, precision: source.line ? "line" : "file" };
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

var IDTHtmlSource=(()=>{var _t=Object.defineProperty;var ks=Object.getOwnPropertyDescriptor;var vs=Object.getOwnPropertyNames;var Ms=Object.prototype.hasOwnProperty;var Bs=(e,t)=>{for(var a in t)_t(e,a,{get:t[a],enumerable:!0})},ws=(e,t,a,i)=>{if(t&&typeof t=="object"||typeof t=="function")for(let u of vs(t))!Ms.call(e,u)&&u!==a&&_t(e,u,{get:()=>t[u],enumerable:!(i=ks(t,u))||i.enumerable});return e};var Fs=e=>ws(_t({},"__esModule",{value:!0}),e);var Xr={};Bs(Xr,{indexHtml:()=>Wr,locateHtmlElement:()=>Kr});var Us=new Set([65534,65535,131070,131071,196606,196607,262142,262143,327678,327679,393214,393215,458750,458751,524286,524287,589822,589823,655358,655359,720894,720895,786430,786431,851966,851967,917502,917503,983038,983039,1048574,1048575,1114110,1114111]),R="\uFFFD",n;(function(e){e[e.EOF=-1]="EOF",e[e.NULL=0]="NULL",e[e.TABULATION=9]="TABULATION",e[e.CARRIAGE_RETURN=13]="CARRIAGE_RETURN",e[e.LINE_FEED=10]="LINE_FEED",e[e.FORM_FEED=12]="FORM_FEED",e[e.SPACE=32]="SPACE",e[e.EXCLAMATION_MARK=33]="EXCLAMATION_MARK",e[e.QUOTATION_MARK=34]="QUOTATION_MARK",e[e.AMPERSAND=38]="AMPERSAND",e[e.APOSTROPHE=39]="APOSTROPHE",e[e.HYPHEN_MINUS=45]="HYPHEN_MINUS",e[e.SOLIDUS=47]="SOLIDUS",e[e.DIGIT_0=48]="DIGIT_0",e[e.DIGIT_9=57]="DIGIT_9",e[e.SEMICOLON=59]="SEMICOLON",e[e.LESS_THAN_SIGN=60]="LESS_THAN_SIGN",e[e.EQUALS_SIGN=61]="EQUALS_SIGN",e[e.GREATER_THAN_SIGN=62]="GREATER_THAN_SIGN",e[e.QUESTION_MARK=63]="QUESTION_MARK",e[e.LATIN_CAPITAL_A=65]="LATIN_CAPITAL_A",e[e.LATIN_CAPITAL_Z=90]="LATIN_CAPITAL_Z",e[e.RIGHT_SQUARE_BRACKET=93]="RIGHT_SQUARE_BRACKET",e[e.GRAVE_ACCENT=96]="GRAVE_ACCENT",e[e.LATIN_SMALL_A=97]="LATIN_SMALL_A",e[e.LATIN_SMALL_Z=122]="LATIN_SMALL_Z"})(n||(n={}));var G={DASH_DASH:"--",CDATA_START:"[CDATA[",DOCTYPE:"doctype",SCRIPT:"script",PUBLIC:"public",SYSTEM:"system"};function Ye(e){return e>=55296&&e<=57343}function Kt(e){return e>=56320&&e<=57343}function Xt(e,t){return(e-55296)*1024+9216+t}function qe(e){return e!==32&&e!==10&&e!==13&&e!==9&&e!==12&&e>=1&&e<=31||e>=127&&e<=159}function Ge(e){return e>=64976&&e<=65007||Us.has(e)}var p;(function(e){e.controlCharacterInInputStream="control-character-in-input-stream",e.noncharacterInInputStream="noncharacter-in-input-stream",e.surrogateInInputStream="surrogate-in-input-stream",e.nonVoidHtmlElementStartTagWithTrailingSolidus="non-void-html-element-start-tag-with-trailing-solidus",e.endTagWithAttributes="end-tag-with-attributes",e.endTagWithTrailingSolidus="end-tag-with-trailing-solidus",e.unexpectedSolidusInTag="unexpected-solidus-in-tag",e.unexpectedNullCharacter="unexpected-null-character",e.unexpectedQuestionMarkInsteadOfTagName="unexpected-question-mark-instead-of-tag-name",e.invalidFirstCharacterOfTagName="invalid-first-character-of-tag-name",e.unexpectedEqualsSignBeforeAttributeName="unexpected-equals-sign-before-attribute-name",e.missingEndTagName="missing-end-tag-name",e.unexpectedCharacterInAttributeName="unexpected-character-in-attribute-name",e.unknownNamedCharacterReference="unknown-named-character-reference",e.missingSemicolonAfterCharacterReference="missing-semicolon-after-character-reference",e.unexpectedCharacterAfterDoctypeSystemIdentifier="unexpected-character-after-doctype-system-identifier",e.unexpectedCharacterInUnquotedAttributeValue="unexpected-character-in-unquoted-attribute-value",e.eofBeforeTagName="eof-before-tag-name",e.eofInTag="eof-in-tag",e.missingAttributeValue="missing-attribute-value",e.missingWhitespaceBetweenAttributes="missing-whitespace-between-attributes",e.missingWhitespaceAfterDoctypePublicKeyword="missing-whitespace-after-doctype-public-keyword",e.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers="missing-whitespace-between-doctype-public-and-system-identifiers",e.missingWhitespaceAfterDoctypeSystemKeyword="missing-whitespace-after-doctype-system-keyword",e.missingQuoteBeforeDoctypePublicIdentifier="missing-quote-before-doctype-public-identifier",e.missingQuoteBeforeDoctypeSystemIdentifier="missing-quote-before-doctype-system-identifier",e.missingDoctypePublicIdentifier="missing-doctype-public-identifier",e.missingDoctypeSystemIdentifier="missing-doctype-system-identifier",e.abruptDoctypePublicIdentifier="abrupt-doctype-public-identifier",e.abruptDoctypeSystemIdentifier="abrupt-doctype-system-identifier",e.cdataInHtmlContent="cdata-in-html-content",e.incorrectlyOpenedComment="incorrectly-opened-comment",e.eofInScriptHtmlCommentLikeText="eof-in-script-html-comment-like-text",e.eofInDoctype="eof-in-doctype",e.nestedComment="nested-comment",e.abruptClosingOfEmptyComment="abrupt-closing-of-empty-comment",e.eofInComment="eof-in-comment",e.incorrectlyClosedComment="incorrectly-closed-comment",e.eofInCdata="eof-in-cdata",e.absenceOfDigitsInNumericCharacterReference="absence-of-digits-in-numeric-character-reference",e.nullCharacterReference="null-character-reference",e.surrogateCharacterReference="surrogate-character-reference",e.characterReferenceOutsideUnicodeRange="character-reference-outside-unicode-range",e.controlCharacterReference="control-character-reference",e.noncharacterCharacterReference="noncharacter-character-reference",e.missingWhitespaceBeforeDoctypeName="missing-whitespace-before-doctype-name",e.missingDoctypeName="missing-doctype-name",e.invalidCharacterSequenceAfterDoctypeName="invalid-character-sequence-after-doctype-name",e.duplicateAttribute="duplicate-attribute",e.nonConformingDoctype="non-conforming-doctype",e.missingDoctype="missing-doctype",e.misplacedDoctype="misplaced-doctype",e.endTagWithoutMatchingOpenElement="end-tag-without-matching-open-element",e.closingOfElementWithOpenChildElements="closing-of-element-with-open-child-elements",e.disallowedContentInNoscriptInHead="disallowed-content-in-noscript-in-head",e.openElementsLeftAfterEof="open-elements-left-after-eof",e.abandonedHeadElementChild="abandoned-head-element-child",e.misplacedStartTagForHeadElement="misplaced-start-tag-for-head-element",e.nestedNoscriptInHead="nested-noscript-in-head",e.eofInElementThatCanContainOnlyText="eof-in-element-that-can-contain-only-text"})(p||(p={}));var Vs=65536,We=class{constructor(t){this.handler=t,this.html="",this.pos=-1,this.lastGapPos=-2,this.gapStack=[],this.skipNextNewLine=!1,this.lastChunkWritten=!1,this.endOfChunkHit=!1,this.bufferWaterline=Vs,this.isEol=!1,this.lineStartPos=0,this.droppedBufferSize=0,this.line=1,this.lastErrOffset=-1}get col(){return this.pos-this.lineStartPos+ +(this.lastGapPos!==this.pos)}get offset(){return this.droppedBufferSize+this.pos}getError(t,a){let{line:i,col:u,offset:o}=this,h=u+a,d=o+a;return{code:t,startLine:i,endLine:i,startCol:h,endCol:h,startOffset:d,endOffset:d}}_err(t){this.handler.onParseError&&this.lastErrOffset!==this.offset&&(this.lastErrOffset=this.offset,this.handler.onParseError(this.getError(t,0)))}_addGap(){this.gapStack.push(this.lastGapPos),this.lastGapPos=this.pos}_processSurrogate(t){if(this.pos!==this.html.length-1){let a=this.html.charCodeAt(this.pos+1);if(Kt(a))return this.pos++,this._addGap(),Xt(t,a)}else if(!this.lastChunkWritten)return this.endOfChunkHit=!0,n.EOF;return this._err(p.surrogateInInputStream),t}willDropParsedChunk(){return this.pos>this.bufferWaterline}dropParsedChunk(){this.willDropParsedChunk()&&(this.html=this.html.substring(this.pos),this.lineStartPos-=this.pos,this.droppedBufferSize+=this.pos,this.pos=0,this.lastGapPos=-2,this.gapStack.length=0)}write(t,a){this.html.length>0?this.html+=t:this.html=t,this.endOfChunkHit=!1,this.lastChunkWritten=a}insertHtmlAtCurrentPos(t){this.html=this.html.substring(0,this.pos+1)+t+this.html.substring(this.pos+1),this.endOfChunkHit=!1}startsWith(t,a){if(this.pos+t.length>this.html.length)return this.endOfChunkHit=!this.lastChunkWritten,!1;if(a)return this.html.startsWith(t,this.pos);for(let i=0;i<t.length;i++)if((this.html.charCodeAt(this.pos+i)|32)!==t.charCodeAt(i))return!1;return!0}peek(t){let a=this.pos+t;if(a>=this.html.length)return this.endOfChunkHit=!this.lastChunkWritten,n.EOF;let i=this.html.charCodeAt(a);return i===n.CARRIAGE_RETURN?n.LINE_FEED:i}advance(){if(this.pos++,this.isEol&&(this.isEol=!1,this.line++,this.lineStartPos=this.pos),this.pos>=this.html.length)return this.endOfChunkHit=!this.lastChunkWritten,n.EOF;let t=this.html.charCodeAt(this.pos);return t===n.CARRIAGE_RETURN?(this.isEol=!0,this.skipNextNewLine=!0,n.LINE_FEED):t===n.LINE_FEED&&(this.isEol=!0,this.skipNextNewLine)?(this.line--,this.skipNextNewLine=!1,this._addGap(),this.advance()):(this.skipNextNewLine=!1,Ye(t)&&(t=this._processSurrogate(t)),this.handler.onParseError===null||t>31&&t<127||t===n.LINE_FEED||t===n.CARRIAGE_RETURN||t>159&&t<64976||this._checkForProblematicCharacters(t),t)}_checkForProblematicCharacters(t){qe(t)?this._err(p.controlCharacterInInputStream):Ge(t)&&this._err(p.noncharacterInInputStream)}retreat(t){for(this.pos-=t;this.pos<this.lastGapPos;)this.lastGapPos=this.gapStack.pop(),this.pos--;this.isEol=!1}};var N;(function(e){e[e.CHARACTER=0]="CHARACTER",e[e.NULL_CHARACTER=1]="NULL_CHARACTER",e[e.WHITESPACE_CHARACTER=2]="WHITESPACE_CHARACTER",e[e.START_TAG=3]="START_TAG",e[e.END_TAG=4]="END_TAG",e[e.COMMENT=5]="COMMENT",e[e.DOCTYPE=6]="DOCTYPE",e[e.EOF=7]="EOF",e[e.HIBERNATION=8]="HIBERNATION"})(N||(N={}));function Qe(e,t){for(let a=e.attrs.length-1;a>=0;a--)if(e.attrs[a].name===t)return e.attrs[a].value;return null}var Ke=new Uint16Array('\u1D41<\xD5\u0131\u028A\u049D\u057B\u05D0\u0675\u06DE\u07A2\u07D6\u080F\u0A4A\u0A91\u0DA1\u0E6D\u0F09\u0F26\u10CA\u1228\u12E1\u1415\u149D\u14C3\u14DF\u1525\0\0\0\0\0\0\u156B\u16CD\u198D\u1C12\u1DDD\u1F7E\u2060\u21B0\u228D\u23C0\u23FB\u2442\u2824\u2912\u2D08\u2E48\u2FCE\u3016\u32BA\u3639\u37AC\u38FE\u3A28\u3A71\u3AE0\u3B2E\u0800EMabcfglmnoprstu\\bfms\x7F\x84\x8B\x90\x95\x98\xA6\xB3\xB9\xC8\xCFlig\u803B\xC6\u40C6P\u803B&\u4026cute\u803B\xC1\u40C1reve;\u4102\u0100iyx}rc\u803B\xC2\u40C2;\u4410r;\uC000\u{1D504}rave\u803B\xC0\u40C0pha;\u4391acr;\u4100d;\u6A53\u0100gp\x9D\xA1on;\u4104f;\uC000\u{1D538}plyFunction;\u6061ing\u803B\xC5\u40C5\u0100cs\xBE\xC3r;\uC000\u{1D49C}ign;\u6254ilde\u803B\xC3\u40C3ml\u803B\xC4\u40C4\u0400aceforsu\xE5\xFB\xFE\u0117\u011C\u0122\u0127\u012A\u0100cr\xEA\xF2kslash;\u6216\u0176\xF6\xF8;\u6AE7ed;\u6306y;\u4411\u0180crt\u0105\u010B\u0114ause;\u6235noullis;\u612Ca;\u4392r;\uC000\u{1D505}pf;\uC000\u{1D539}eve;\u42D8c\xF2\u0113mpeq;\u624E\u0700HOacdefhilorsu\u014D\u0151\u0156\u0180\u019E\u01A2\u01B5\u01B7\u01BA\u01DC\u0215\u0273\u0278\u027Ecy;\u4427PY\u803B\xA9\u40A9\u0180cpy\u015D\u0162\u017Aute;\u4106\u0100;i\u0167\u0168\u62D2talDifferentialD;\u6145leys;\u612D\u0200aeio\u0189\u018E\u0194\u0198ron;\u410Cdil\u803B\xC7\u40C7rc;\u4108nint;\u6230ot;\u410A\u0100dn\u01A7\u01ADilla;\u40B8terDot;\u40B7\xF2\u017Fi;\u43A7rcle\u0200DMPT\u01C7\u01CB\u01D1\u01D6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01E2\u01F8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020FoubleQuote;\u601Duote;\u6019\u0200lnpu\u021E\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6A74\u0180git\u022F\u0236\u023Aruent;\u6261nt;\u622FourIntegral;\u622E\u0100fr\u024C\u024E;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6A2Fcr;\uC000\u{1D49E}p\u0100;C\u0284\u0285\u62D3ap;\u624D\u0580DJSZacefios\u02A0\u02AC\u02B0\u02B4\u02B8\u02CB\u02D7\u02E1\u02E6\u0333\u048D\u0100;o\u0179\u02A5trahd;\u6911cy;\u4402cy;\u4405cy;\u440F\u0180grs\u02BF\u02C4\u02C7ger;\u6021r;\u61A1hv;\u6AE4\u0100ay\u02D0\u02D5ron;\u410E;\u4414l\u0100;t\u02DD\u02DE\u6207a;\u4394r;\uC000\u{1D507}\u0100af\u02EB\u0327\u0100cm\u02F0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031Ccute;\u40B4o\u0174\u030B\u030D;\u42D9bleAcute;\u42DDrave;\u4060ilde;\u42DCond;\u62C4ferentialD;\u6146\u0470\u033D\0\0\0\u0342\u0354\0\u0405f;\uC000\u{1D53B}\u0180;DE\u0348\u0349\u034D\u40A8ot;\u60DCqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03CF\u03E2\u03F8ontourIntegra\xEC\u0239o\u0274\u0379\0\0\u037B\xBB\u0349nArrow;\u61D3\u0100eo\u0387\u03A4ft\u0180ART\u0390\u0396\u03A1rrow;\u61D0ightArrow;\u61D4e\xE5\u02CAng\u0100LR\u03AB\u03C4eft\u0100AR\u03B3\u03B9rrow;\u67F8ightArrow;\u67FAightArrow;\u67F9ight\u0100AT\u03D8\u03DErrow;\u61D2ee;\u62A8p\u0241\u03E9\0\0\u03EFrrow;\u61D1ownArrow;\u61D5erticalBar;\u6225n\u0300ABLRTa\u0412\u042A\u0430\u045E\u047F\u037Crrow\u0180;BU\u041D\u041E\u0422\u6193ar;\u6913pArrow;\u61F5reve;\u4311eft\u02D2\u043A\0\u0446\0\u0450ightVector;\u6950eeVector;\u695Eector\u0100;B\u0459\u045A\u61BDar;\u6956ight\u01D4\u0467\0\u0471eeVector;\u695Fector\u0100;B\u047A\u047B\u61C1ar;\u6957ee\u0100;A\u0486\u0487\u62A4rrow;\u61A7\u0100ct\u0492\u0497r;\uC000\u{1D49F}rok;\u4110\u0800NTacdfglmopqstux\u04BD\u04C0\u04C4\u04CB\u04DE\u04E2\u04E7\u04EE\u04F5\u0521\u052F\u0536\u0552\u055D\u0560\u0565G;\u414AH\u803B\xD0\u40D0cute\u803B\xC9\u40C9\u0180aiy\u04D2\u04D7\u04DCron;\u411Arc\u803B\xCA\u40CA;\u442Dot;\u4116r;\uC000\u{1D508}rave\u803B\xC8\u40C8ement;\u6208\u0100ap\u04FA\u04FEcr;\u4112ty\u0253\u0506\0\0\u0512mallSquare;\u65FBerySmallSquare;\u65AB\u0100gp\u0526\u052Aon;\u4118f;\uC000\u{1D53C}silon;\u4395u\u0100ai\u053C\u0549l\u0100;T\u0542\u0543\u6A75ilde;\u6242librium;\u61CC\u0100ci\u0557\u055Ar;\u6130m;\u6A73a;\u4397ml\u803B\xCB\u40CB\u0100ip\u056A\u056Fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058D\u05B2\u05CCy;\u4424r;\uC000\u{1D509}lled\u0253\u0597\0\0\u05A3mallSquare;\u65FCerySmallSquare;\u65AA\u0370\u05BA\0\u05BF\0\0\u05C4f;\uC000\u{1D53D}All;\u6200riertrf;\u6131c\xF2\u05CB\u0600JTabcdfgorst\u05E8\u05EC\u05EF\u05FA\u0600\u0612\u0616\u061B\u061D\u0623\u066C\u0672cy;\u4403\u803B>\u403Emma\u0100;d\u05F7\u05F8\u4393;\u43DCreve;\u411E\u0180eiy\u0607\u060C\u0610dil;\u4122rc;\u411C;\u4413ot;\u4120r;\uC000\u{1D50A};\u62D9pf;\uC000\u{1D53E}eater\u0300EFGLST\u0635\u0644\u064E\u0656\u065B\u0666qual\u0100;L\u063E\u063F\u6265ess;\u62DBullEqual;\u6267reater;\u6AA2ess;\u6277lantEqual;\u6A7Eilde;\u6273cr;\uC000\u{1D4A2};\u626B\u0400Aacfiosu\u0685\u068B\u0696\u069B\u069E\u06AA\u06BE\u06CARDcy;\u442A\u0100ct\u0690\u0694ek;\u42C7;\u405Eirc;\u4124r;\u610ClbertSpace;\u610B\u01F0\u06AF\0\u06B2f;\u610DizontalLine;\u6500\u0100ct\u06C3\u06C5\xF2\u06A9rok;\u4126mp\u0144\u06D0\u06D8ownHum\xF0\u012Fqual;\u624F\u0700EJOacdfgmnostu\u06FA\u06FE\u0703\u0707\u070E\u071A\u071E\u0721\u0728\u0744\u0778\u078B\u078F\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803B\xCD\u40CD\u0100iy\u0713\u0718rc\u803B\xCE\u40CE;\u4418ot;\u4130r;\u6111rave\u803B\xCC\u40CC\u0180;ap\u0720\u072F\u073F\u0100cg\u0734\u0737r;\u412AinaryI;\u6148lie\xF3\u03DD\u01F4\u0749\0\u0762\u0100;e\u074D\u074E\u622C\u0100gr\u0753\u0758ral;\u622Bsection;\u62C2isible\u0100CT\u076C\u0772omma;\u6063imes;\u6062\u0180gpt\u077F\u0783\u0788on;\u412Ef;\uC000\u{1D540}a;\u4399cr;\u6110ilde;\u4128\u01EB\u079A\0\u079Ecy;\u4406l\u803B\xCF\u40CF\u0280cfosu\u07AC\u07B7\u07BC\u07C2\u07D0\u0100iy\u07B1\u07B5rc;\u4134;\u4419r;\uC000\u{1D50D}pf;\uC000\u{1D541}\u01E3\u07C7\0\u07CCr;\uC000\u{1D4A5}rcy;\u4408kcy;\u4404\u0380HJacfos\u07E4\u07E8\u07EC\u07F1\u07FD\u0802\u0808cy;\u4425cy;\u440Cppa;\u439A\u0100ey\u07F6\u07FBdil;\u4136;\u441Ar;\uC000\u{1D50E}pf;\uC000\u{1D542}cr;\uC000\u{1D4A6}\u0580JTaceflmost\u0825\u0829\u082C\u0850\u0863\u09B3\u09B8\u09C7\u09CD\u0A37\u0A47cy;\u4409\u803B<\u403C\u0280cmnpr\u0837\u083C\u0841\u0844\u084Dute;\u4139bda;\u439Bg;\u67EAlacetrf;\u6112r;\u619E\u0180aey\u0857\u085C\u0861ron;\u413Ddil;\u413B;\u441B\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087E\u08A9\u08B1\u08E0\u08E6\u08FC\u092F\u095B\u0390\u096A\u0100nr\u0883\u088FgleBracket;\u67E8row\u0180;BR\u0899\u089A\u089E\u6190ar;\u61E4ightArrow;\u61C6eiling;\u6308o\u01F5\u08B7\0\u08C3bleBracket;\u67E6n\u01D4\u08C8\0\u08D2eeVector;\u6961ector\u0100;B\u08DB\u08DC\u61C3ar;\u6959loor;\u630Aight\u0100AV\u08EF\u08F5rrow;\u6194ector;\u694E\u0100er\u0901\u0917e\u0180;AV\u0909\u090A\u0910\u62A3rrow;\u61A4ector;\u695Aiangle\u0180;BE\u0924\u0925\u0929\u62B2ar;\u69CFqual;\u62B4p\u0180DTV\u0937\u0942\u094CownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61BFar;\u6958ector\u0100;B\u0965\u0966\u61BCar;\u6952ight\xE1\u039Cs\u0300EFGLST\u097E\u098B\u0995\u099D\u09A2\u09ADqualGreater;\u62DAullEqual;\u6266reater;\u6276ess;\u6AA1lantEqual;\u6A7Dilde;\u6272r;\uC000\u{1D50F}\u0100;e\u09BD\u09BE\u62D8ftarrow;\u61DAidot;\u413F\u0180npw\u09D4\u0A16\u0A1Bg\u0200LRlr\u09DE\u09F7\u0A02\u0A10eft\u0100AR\u09E6\u09ECrrow;\u67F5ightArrow;\u67F7ightArrow;\u67F6eft\u0100ar\u03B3\u0A0Aight\xE1\u03BFight\xE1\u03CAf;\uC000\u{1D543}er\u0100LR\u0A22\u0A2CeftArrow;\u6199ightArrow;\u6198\u0180cht\u0A3E\u0A40\u0A42\xF2\u084C;\u61B0rok;\u4141;\u626A\u0400acefiosu\u0A5A\u0A5D\u0A60\u0A77\u0A7C\u0A85\u0A8B\u0A8Ep;\u6905y;\u441C\u0100dl\u0A65\u0A6FiumSpace;\u605Flintrf;\u6133r;\uC000\u{1D510}nusPlus;\u6213pf;\uC000\u{1D544}c\xF2\u0A76;\u439C\u0480Jacefostu\u0AA3\u0AA7\u0AAD\u0AC0\u0B14\u0B19\u0D91\u0D97\u0D9Ecy;\u440Acute;\u4143\u0180aey\u0AB4\u0AB9\u0ABEron;\u4147dil;\u4145;\u441D\u0180gsw\u0AC7\u0AF0\u0B0Eative\u0180MTV\u0AD3\u0ADF\u0AE8ediumSpace;\u600Bhi\u0100cn\u0AE6\u0AD8\xEB\u0AD9eryThi\xEE\u0AD9ted\u0100GL\u0AF8\u0B06reaterGreate\xF2\u0673essLes\xF3\u0A48Line;\u400Ar;\uC000\u{1D511}\u0200Bnpt\u0B22\u0B28\u0B37\u0B3Areak;\u6060BreakingSpace;\u40A0f;\u6115\u0680;CDEGHLNPRSTV\u0B55\u0B56\u0B6A\u0B7C\u0BA1\u0BEB\u0C04\u0C5E\u0C84\u0CA6\u0CD8\u0D61\u0D85\u6AEC\u0100ou\u0B5B\u0B64ngruent;\u6262pCap;\u626DoubleVerticalBar;\u6226\u0180lqx\u0B83\u0B8A\u0B9Bement;\u6209ual\u0100;T\u0B92\u0B93\u6260ilde;\uC000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0BB6\u0BB7\u0BBD\u0BC9\u0BD3\u0BD8\u0BE5\u626Fqual;\u6271ullEqual;\uC000\u2267\u0338reater;\uC000\u226B\u0338ess;\u6279lantEqual;\uC000\u2A7E\u0338ilde;\u6275ump\u0144\u0BF2\u0BFDownHump;\uC000\u224E\u0338qual;\uC000\u224F\u0338e\u0100fs\u0C0A\u0C27tTriangle\u0180;BE\u0C1A\u0C1B\u0C21\u62EAar;\uC000\u29CF\u0338qual;\u62ECs\u0300;EGLST\u0C35\u0C36\u0C3C\u0C44\u0C4B\u0C58\u626Equal;\u6270reater;\u6278ess;\uC000\u226A\u0338lantEqual;\uC000\u2A7D\u0338ilde;\u6274ested\u0100GL\u0C68\u0C79reaterGreater;\uC000\u2AA2\u0338essLess;\uC000\u2AA1\u0338recedes\u0180;ES\u0C92\u0C93\u0C9B\u6280qual;\uC000\u2AAF\u0338lantEqual;\u62E0\u0100ei\u0CAB\u0CB9verseElement;\u620CghtTriangle\u0180;BE\u0CCB\u0CCC\u0CD2\u62EBar;\uC000\u29D0\u0338qual;\u62ED\u0100qu\u0CDD\u0D0CuareSu\u0100bp\u0CE8\u0CF9set\u0100;E\u0CF0\u0CF3\uC000\u228F\u0338qual;\u62E2erset\u0100;E\u0D03\u0D06\uC000\u2290\u0338qual;\u62E3\u0180bcp\u0D13\u0D24\u0D4Eset\u0100;E\u0D1B\u0D1E\uC000\u2282\u20D2qual;\u6288ceeds\u0200;EST\u0D32\u0D33\u0D3B\u0D46\u6281qual;\uC000\u2AB0\u0338lantEqual;\u62E1ilde;\uC000\u227F\u0338erset\u0100;E\u0D58\u0D5B\uC000\u2283\u20D2qual;\u6289ilde\u0200;EFT\u0D6E\u0D6F\u0D75\u0D7F\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uC000\u{1D4A9}ilde\u803B\xD1\u40D1;\u439D\u0700Eacdfgmoprstuv\u0DBD\u0DC2\u0DC9\u0DD5\u0DDB\u0DE0\u0DE7\u0DFC\u0E02\u0E20\u0E22\u0E32\u0E3F\u0E44lig;\u4152cute\u803B\xD3\u40D3\u0100iy\u0DCE\u0DD3rc\u803B\xD4\u40D4;\u441Eblac;\u4150r;\uC000\u{1D512}rave\u803B\xD2\u40D2\u0180aei\u0DEE\u0DF2\u0DF6cr;\u414Cga;\u43A9cron;\u439Fpf;\uC000\u{1D546}enCurly\u0100DQ\u0E0E\u0E1AoubleQuote;\u601Cuote;\u6018;\u6A54\u0100cl\u0E27\u0E2Cr;\uC000\u{1D4AA}ash\u803B\xD8\u40D8i\u016C\u0E37\u0E3Cde\u803B\xD5\u40D5es;\u6A37ml\u803B\xD6\u40D6er\u0100BP\u0E4B\u0E60\u0100ar\u0E50\u0E53r;\u603Eac\u0100ek\u0E5A\u0E5C;\u63DEet;\u63B4arenthesis;\u63DC\u0480acfhilors\u0E7F\u0E87\u0E8A\u0E8F\u0E92\u0E94\u0E9D\u0EB0\u0EFCrtialD;\u6202y;\u441Fr;\uC000\u{1D513}i;\u43A6;\u43A0usMinus;\u40B1\u0100ip\u0EA2\u0EADncareplan\xE5\u069Df;\u6119\u0200;eio\u0EB9\u0EBA\u0EE0\u0EE4\u6ABBcedes\u0200;EST\u0EC8\u0EC9\u0ECF\u0EDA\u627Aqual;\u6AAFlantEqual;\u627Cilde;\u627Eme;\u6033\u0100dp\u0EE9\u0EEEuct;\u620Fortion\u0100;a\u0225\u0EF9l;\u621D\u0100ci\u0F01\u0F06r;\uC000\u{1D4AB};\u43A8\u0200Ufos\u0F11\u0F16\u0F1B\u0F1FOT\u803B"\u4022r;\uC000\u{1D514}pf;\u611Acr;\uC000\u{1D4AC}\u0600BEacefhiorsu\u0F3E\u0F43\u0F47\u0F60\u0F73\u0FA7\u0FAA\u0FAD\u1096\u10A9\u10B4\u10BEarr;\u6910G\u803B\xAE\u40AE\u0180cnr\u0F4E\u0F53\u0F56ute;\u4154g;\u67EBr\u0100;t\u0F5C\u0F5D\u61A0l;\u6916\u0180aey\u0F67\u0F6C\u0F71ron;\u4158dil;\u4156;\u4420\u0100;v\u0F78\u0F79\u611Cerse\u0100EU\u0F82\u0F99\u0100lq\u0F87\u0F8Eement;\u620Builibrium;\u61CBpEquilibrium;\u696Fr\xBB\u0F79o;\u43A1ght\u0400ACDFTUVa\u0FC1\u0FEB\u0FF3\u1022\u1028\u105B\u1087\u03D8\u0100nr\u0FC6\u0FD2gleBracket;\u67E9row\u0180;BL\u0FDC\u0FDD\u0FE1\u6192ar;\u61E5eftArrow;\u61C4eiling;\u6309o\u01F5\u0FF9\0\u1005bleBracket;\u67E7n\u01D4\u100A\0\u1014eeVector;\u695Dector\u0100;B\u101D\u101E\u61C2ar;\u6955loor;\u630B\u0100er\u102D\u1043e\u0180;AV\u1035\u1036\u103C\u62A2rrow;\u61A6ector;\u695Biangle\u0180;BE\u1050\u1051\u1055\u62B3ar;\u69D0qual;\u62B5p\u0180DTV\u1063\u106E\u1078ownVector;\u694FeeVector;\u695Cector\u0100;B\u1082\u1083\u61BEar;\u6954ector\u0100;B\u1091\u1092\u61C0ar;\u6953\u0100pu\u109B\u109Ef;\u611DndImplies;\u6970ightarrow;\u61DB\u0100ch\u10B9\u10BCr;\u611B;\u61B1leDelayed;\u69F4\u0680HOacfhimoqstu\u10E4\u10F1\u10F7\u10FD\u1119\u111E\u1151\u1156\u1161\u1167\u11B5\u11BB\u11BF\u0100Cc\u10E9\u10EEHcy;\u4429y;\u4428FTcy;\u442Ccute;\u415A\u0280;aeiy\u1108\u1109\u110E\u1113\u1117\u6ABCron;\u4160dil;\u415Erc;\u415C;\u4421r;\uC000\u{1D516}ort\u0200DLRU\u112A\u1134\u113E\u1149ownArrow\xBB\u041EeftArrow\xBB\u089AightArrow\xBB\u0FDDpArrow;\u6191gma;\u43A3allCircle;\u6218pf;\uC000\u{1D54A}\u0272\u116D\0\0\u1170t;\u621Aare\u0200;ISU\u117B\u117C\u1189\u11AF\u65A1ntersection;\u6293u\u0100bp\u118F\u119Eset\u0100;E\u1197\u1198\u628Fqual;\u6291erset\u0100;E\u11A8\u11A9\u6290qual;\u6292nion;\u6294cr;\uC000\u{1D4AE}ar;\u62C6\u0200bcmp\u11C8\u11DB\u1209\u120B\u0100;s\u11CD\u11CE\u62D0et\u0100;E\u11CD\u11D5qual;\u6286\u0100ch\u11E0\u1205eeds\u0200;EST\u11ED\u11EE\u11F4\u11FF\u627Bqual;\u6AB0lantEqual;\u627Dilde;\u627FTh\xE1\u0F8C;\u6211\u0180;es\u1212\u1213\u1223\u62D1rset\u0100;E\u121C\u121D\u6283qual;\u6287et\xBB\u1213\u0580HRSacfhiors\u123E\u1244\u1249\u1255\u125E\u1271\u1276\u129F\u12C2\u12C8\u12D1ORN\u803B\xDE\u40DEADE;\u6122\u0100Hc\u124E\u1252cy;\u440By;\u4426\u0100bu\u125A\u125C;\u4009;\u43A4\u0180aey\u1265\u126A\u126Fron;\u4164dil;\u4162;\u4422r;\uC000\u{1D517}\u0100ei\u127B\u1289\u01F2\u1280\0\u1287efore;\u6234a;\u4398\u0100cn\u128E\u1298kSpace;\uC000\u205F\u200ASpace;\u6009lde\u0200;EFT\u12AB\u12AC\u12B2\u12BC\u623Cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uC000\u{1D54B}ipleDot;\u60DB\u0100ct\u12D6\u12DBr;\uC000\u{1D4AF}rok;\u4166\u0AE1\u12F7\u130E\u131A\u1326\0\u132C\u1331\0\0\0\0\0\u1338\u133D\u1377\u1385\0\u13FF\u1404\u140A\u1410\u0100cr\u12FB\u1301ute\u803B\xDA\u40DAr\u0100;o\u1307\u1308\u619Fcir;\u6949r\u01E3\u1313\0\u1316y;\u440Eve;\u416C\u0100iy\u131E\u1323rc\u803B\xDB\u40DB;\u4423blac;\u4170r;\uC000\u{1D518}rave\u803B\xD9\u40D9acr;\u416A\u0100di\u1341\u1369er\u0100BP\u1348\u135D\u0100ar\u134D\u1350r;\u405Fac\u0100ek\u1357\u1359;\u63DFet;\u63B5arenthesis;\u63DDon\u0100;P\u1370\u1371\u62C3lus;\u628E\u0100gp\u137B\u137Fon;\u4172f;\uC000\u{1D54C}\u0400ADETadps\u1395\u13AE\u13B8\u13C4\u03E8\u13D2\u13D7\u13F3rrow\u0180;BD\u1150\u13A0\u13A4ar;\u6912ownArrow;\u61C5ownArrow;\u6195quilibrium;\u696Eee\u0100;A\u13CB\u13CC\u62A5rrow;\u61A5own\xE1\u03F3er\u0100LR\u13DE\u13E8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13F9\u13FA\u43D2on;\u43A5ing;\u416Ecr;\uC000\u{1D4B0}ilde;\u4168ml\u803B\xDC\u40DC\u0480Dbcdefosv\u1427\u142C\u1430\u1433\u143E\u1485\u148A\u1490\u1496ash;\u62ABar;\u6AEBy;\u4412ash\u0100;l\u143B\u143C\u62A9;\u6AE6\u0100er\u1443\u1445;\u62C1\u0180bty\u144C\u1450\u147Aar;\u6016\u0100;i\u144F\u1455cal\u0200BLST\u1461\u1465\u146A\u1474ar;\u6223ine;\u407Ceparator;\u6758ilde;\u6240ThinSpace;\u600Ar;\uC000\u{1D519}pf;\uC000\u{1D54D}cr;\uC000\u{1D4B1}dash;\u62AA\u0280cefos\u14A7\u14AC\u14B1\u14B6\u14BCirc;\u4174dge;\u62C0r;\uC000\u{1D51A}pf;\uC000\u{1D54E}cr;\uC000\u{1D4B2}\u0200fios\u14CB\u14D0\u14D2\u14D8r;\uC000\u{1D51B};\u439Epf;\uC000\u{1D54F}cr;\uC000\u{1D4B3}\u0480AIUacfosu\u14F1\u14F5\u14F9\u14FD\u1504\u150F\u1514\u151A\u1520cy;\u442Fcy;\u4407cy;\u442Ecute\u803B\xDD\u40DD\u0100iy\u1509\u150Drc;\u4176;\u442Br;\uC000\u{1D51C}pf;\uC000\u{1D550}cr;\uC000\u{1D4B4}ml;\u4178\u0400Hacdefos\u1535\u1539\u153F\u154B\u154F\u155D\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417D;\u4417ot;\u417B\u01F2\u1554\0\u155BoWidt\xE8\u0AD9a;\u4396r;\u6128pf;\u6124cr;\uC000\u{1D4B5}\u0BE1\u1583\u158A\u1590\0\u15B0\u15B6\u15BF\0\0\0\0\u15C6\u15DB\u15EB\u165F\u166D\0\u1695\u169B\u16B2\u16B9\0\u16BEcute\u803B\xE1\u40E1reve;\u4103\u0300;Ediuy\u159C\u159D\u15A1\u15A3\u15A8\u15AD\u623E;\uC000\u223E\u0333;\u623Frc\u803B\xE2\u40E2te\u80BB\xB4\u0306;\u4430lig\u803B\xE6\u40E6\u0100;r\xB2\u15BA;\uC000\u{1D51E}rave\u803B\xE0\u40E0\u0100ep\u15CA\u15D6\u0100fp\u15CF\u15D4sym;\u6135\xE8\u15D3ha;\u43B1\u0100ap\u15DFc\u0100cl\u15E4\u15E7r;\u4101g;\u6A3F\u0264\u15F0\0\0\u160A\u0280;adsv\u15FA\u15FB\u15FF\u1601\u1607\u6227nd;\u6A55;\u6A5Clope;\u6A58;\u6A5A\u0380;elmrsz\u1618\u1619\u161B\u161E\u163F\u164F\u1659\u6220;\u69A4e\xBB\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163A\u163C\u163E;\u69A8;\u69A9;\u69AA;\u69AB;\u69AC;\u69AD;\u69AE;\u69AFt\u0100;v\u1645\u1646\u621Fb\u0100;d\u164C\u164D\u62BE;\u699D\u0100pt\u1654\u1657h;\u6222\xBB\xB9arr;\u637C\u0100gp\u1663\u1667on;\u4105f;\uC000\u{1D552}\u0380;Eaeiop\u12C1\u167B\u167D\u1682\u1684\u1687\u168A;\u6A70cir;\u6A6F;\u624Ad;\u624Bs;\u4027rox\u0100;e\u12C1\u1692\xF1\u1683ing\u803B\xE5\u40E5\u0180cty\u16A1\u16A6\u16A8r;\uC000\u{1D4B6};\u402Amp\u0100;e\u12C1\u16AF\xF1\u0288ilde\u803B\xE3\u40E3ml\u803B\xE4\u40E4\u0100ci\u16C2\u16C8onin\xF4\u0272nt;\u6A11\u0800Nabcdefiklnoprsu\u16ED\u16F1\u1730\u173C\u1743\u1748\u1778\u177D\u17E0\u17E6\u1839\u1850\u170D\u193D\u1948\u1970ot;\u6AED\u0100cr\u16F6\u171Ek\u0200ceps\u1700\u1705\u170D\u1713ong;\u624Cpsilon;\u43F6rime;\u6035im\u0100;e\u171A\u171B\u623Dq;\u62CD\u0176\u1722\u1726ee;\u62BDed\u0100;g\u172C\u172D\u6305e\xBB\u172Drk\u0100;t\u135C\u1737brk;\u63B6\u0100oy\u1701\u1741;\u4431quo;\u601E\u0280cmprt\u1753\u175B\u1761\u1764\u1768aus\u0100;e\u010A\u0109ptyv;\u69B0s\xE9\u170Cno\xF5\u0113\u0180ahw\u176F\u1771\u1773;\u43B2;\u6136een;\u626Cr;\uC000\u{1D51F}g\u0380costuvw\u178D\u179D\u17B3\u17C1\u17D5\u17DB\u17DE\u0180aiu\u1794\u1796\u179A\xF0\u0760rc;\u65EFp\xBB\u1371\u0180dpt\u17A4\u17A8\u17ADot;\u6A00lus;\u6A01imes;\u6A02\u0271\u17B9\0\0\u17BEcup;\u6A06ar;\u6605riangle\u0100du\u17CD\u17D2own;\u65BDp;\u65B3plus;\u6A04e\xE5\u1444\xE5\u14ADarow;\u690D\u0180ako\u17ED\u1826\u1835\u0100cn\u17F2\u1823k\u0180lst\u17FA\u05AB\u1802ozenge;\u69EBriangle\u0200;dlr\u1812\u1813\u1818\u181D\u65B4own;\u65BEeft;\u65C2ight;\u65B8k;\u6423\u01B1\u182B\0\u1833\u01B2\u182F\0\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183E\u184D\u0100;q\u1843\u1846\uC000=\u20E5uiv;\uC000\u2261\u20E5t;\u6310\u0200ptwx\u1859\u185E\u1867\u186Cf;\uC000\u{1D553}\u0100;t\u13CB\u1863om\xBB\u13CCtie;\u62C8\u0600DHUVbdhmptuv\u1885\u1896\u18AA\u18BB\u18D7\u18DB\u18EC\u18FF\u1905\u190A\u1910\u1921\u0200LRlr\u188E\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18A1\u18A2\u18A4\u18A6\u18A8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18B3\u18B5\u18B7\u18B9;\u655D;\u655A;\u655C;\u6559\u0380;HLRhlr\u18CA\u18CB\u18CD\u18CF\u18D1\u18D3\u18D5\u6551;\u656C;\u6563;\u6560;\u656B;\u6562;\u655Fox;\u69C9\u0200LRlr\u18E4\u18E6\u18E8\u18EA;\u6555;\u6552;\u6510;\u650C\u0280;DUdu\u06BD\u18F7\u18F9\u18FB\u18FD;\u6565;\u6568;\u652C;\u6534inus;\u629Flus;\u629Eimes;\u62A0\u0200LRlr\u1919\u191B\u191D\u191F;\u655B;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193B\u6502;\u656A;\u6561;\u655E;\u653C;\u6524;\u651C\u0100ev\u0123\u1942bar\u803B\xA6\u40A6\u0200ceio\u1951\u1956\u195A\u1960r;\uC000\u{1D4B7}mi;\u604Fm\u0100;e\u171A\u171Cl\u0180;bh\u1968\u1969\u196B\u405C;\u69C5sub;\u67C8\u016C\u1974\u197El\u0100;e\u1979\u197A\u6022t\xBB\u197Ap\u0180;Ee\u012F\u1985\u1987;\u6AAE\u0100;q\u06DC\u06DB\u0CE1\u19A7\0\u19E8\u1A11\u1A15\u1A32\0\u1A37\u1A50\0\0\u1AB4\0\0\u1AC1\0\0\u1B21\u1B2E\u1B4D\u1B52\0\u1BFD\0\u1C0C\u0180cpr\u19AD\u19B2\u19DDute;\u4107\u0300;abcds\u19BF\u19C0\u19C4\u19CA\u19D5\u19D9\u6229nd;\u6A44rcup;\u6A49\u0100au\u19CF\u19D2p;\u6A4Bp;\u6A47ot;\u6A40;\uC000\u2229\uFE00\u0100eo\u19E2\u19E5t;\u6041\xEE\u0693\u0200aeiu\u19F0\u19FB\u1A01\u1A05\u01F0\u19F5\0\u19F8s;\u6A4Don;\u410Ddil\u803B\xE7\u40E7rc;\u4109ps\u0100;s\u1A0C\u1A0D\u6A4Cm;\u6A50ot;\u410B\u0180dmn\u1A1B\u1A20\u1A26il\u80BB\xB8\u01ADptyv;\u69B2t\u8100\xA2;e\u1A2D\u1A2E\u40A2r\xE4\u01B2r;\uC000\u{1D520}\u0180cei\u1A3D\u1A40\u1A4Dy;\u4447ck\u0100;m\u1A47\u1A48\u6713ark\xBB\u1A48;\u43C7r\u0380;Ecefms\u1A5F\u1A60\u1A62\u1A6B\u1AA4\u1AAA\u1AAE\u65CB;\u69C3\u0180;el\u1A69\u1A6A\u1A6D\u42C6q;\u6257e\u0261\u1A74\0\0\u1A88rrow\u0100lr\u1A7C\u1A81eft;\u61BAight;\u61BB\u0280RSacd\u1A92\u1A94\u1A96\u1A9A\u1A9F\xBB\u0F47;\u64C8st;\u629Birc;\u629Aash;\u629Dnint;\u6A10id;\u6AEFcir;\u69C2ubs\u0100;u\u1ABB\u1ABC\u6663it\xBB\u1ABC\u02EC\u1AC7\u1AD4\u1AFA\0\u1B0Aon\u0100;e\u1ACD\u1ACE\u403A\u0100;q\xC7\xC6\u026D\u1AD9\0\0\u1AE2a\u0100;t\u1ADE\u1ADF\u402C;\u4040\u0180;fl\u1AE8\u1AE9\u1AEB\u6201\xEE\u1160e\u0100mx\u1AF1\u1AF6ent\xBB\u1AE9e\xF3\u024D\u01E7\u1AFE\0\u1B07\u0100;d\u12BB\u1B02ot;\u6A6Dn\xF4\u0246\u0180fry\u1B10\u1B14\u1B17;\uC000\u{1D554}o\xE4\u0254\u8100\xA9;s\u0155\u1B1Dr;\u6117\u0100ao\u1B25\u1B29rr;\u61B5ss;\u6717\u0100cu\u1B32\u1B37r;\uC000\u{1D4B8}\u0100bp\u1B3C\u1B44\u0100;e\u1B41\u1B42\u6ACF;\u6AD1\u0100;e\u1B49\u1B4A\u6AD0;\u6AD2dot;\u62EF\u0380delprvw\u1B60\u1B6C\u1B77\u1B82\u1BAC\u1BD4\u1BF9arr\u0100lr\u1B68\u1B6A;\u6938;\u6935\u0270\u1B72\0\0\u1B75r;\u62DEc;\u62DFarr\u0100;p\u1B7F\u1B80\u61B6;\u693D\u0300;bcdos\u1B8F\u1B90\u1B96\u1BA1\u1BA5\u1BA8\u622Arcap;\u6A48\u0100au\u1B9B\u1B9Ep;\u6A46p;\u6A4Aot;\u628Dr;\u6A45;\uC000\u222A\uFE00\u0200alrv\u1BB5\u1BBF\u1BDE\u1BE3rr\u0100;m\u1BBC\u1BBD\u61B7;\u693Cy\u0180evw\u1BC7\u1BD4\u1BD8q\u0270\u1BCE\0\0\u1BD2re\xE3\u1B73u\xE3\u1B75ee;\u62CEedge;\u62CFen\u803B\xA4\u40A4earrow\u0100lr\u1BEE\u1BF3eft\xBB\u1B80ight\xBB\u1BBDe\xE4\u1BDD\u0100ci\u1C01\u1C07onin\xF4\u01F7nt;\u6231lcty;\u632D\u0980AHabcdefhijlorstuwz\u1C38\u1C3B\u1C3F\u1C5D\u1C69\u1C75\u1C8A\u1C9E\u1CAC\u1CB7\u1CFB\u1CFF\u1D0D\u1D7B\u1D91\u1DAB\u1DBB\u1DC6\u1DCDr\xF2\u0381ar;\u6965\u0200glrs\u1C48\u1C4D\u1C52\u1C54ger;\u6020eth;\u6138\xF2\u1133h\u0100;v\u1C5A\u1C5B\u6010\xBB\u090A\u016B\u1C61\u1C67arow;\u690Fa\xE3\u0315\u0100ay\u1C6E\u1C73ron;\u410F;\u4434\u0180;ao\u0332\u1C7C\u1C84\u0100gr\u02BF\u1C81r;\u61CAtseq;\u6A77\u0180glm\u1C91\u1C94\u1C98\u803B\xB0\u40B0ta;\u43B4ptyv;\u69B1\u0100ir\u1CA3\u1CA8sht;\u697F;\uC000\u{1D521}ar\u0100lr\u1CB3\u1CB5\xBB\u08DC\xBB\u101E\u0280aegsv\u1CC2\u0378\u1CD6\u1CDC\u1CE0m\u0180;os\u0326\u1CCA\u1CD4nd\u0100;s\u0326\u1CD1uit;\u6666amma;\u43DDin;\u62F2\u0180;io\u1CE7\u1CE8\u1CF8\u40F7de\u8100\xF7;o\u1CE7\u1CF0ntimes;\u62C7n\xF8\u1CF7cy;\u4452c\u026F\u1D06\0\0\u1D0Arn;\u631Eop;\u630D\u0280lptuw\u1D18\u1D1D\u1D22\u1D49\u1D55lar;\u4024f;\uC000\u{1D555}\u0280;emps\u030B\u1D2D\u1D37\u1D3D\u1D42q\u0100;d\u0352\u1D33ot;\u6251inus;\u6238lus;\u6214quare;\u62A1blebarwedg\xE5\xFAn\u0180adh\u112E\u1D5D\u1D67ownarrow\xF3\u1C83arpoon\u0100lr\u1D72\u1D76ef\xF4\u1CB4igh\xF4\u1CB6\u0162\u1D7F\u1D85karo\xF7\u0F42\u026F\u1D8A\0\0\u1D8Ern;\u631Fop;\u630C\u0180cot\u1D98\u1DA3\u1DA6\u0100ry\u1D9D\u1DA1;\uC000\u{1D4B9};\u4455l;\u69F6rok;\u4111\u0100dr\u1DB0\u1DB4ot;\u62F1i\u0100;f\u1DBA\u1816\u65BF\u0100ah\u1DC0\u1DC3r\xF2\u0429a\xF2\u0FA6angle;\u69A6\u0100ci\u1DD2\u1DD5y;\u445Fgrarr;\u67FF\u0900Dacdefglmnopqrstux\u1E01\u1E09\u1E19\u1E38\u0578\u1E3C\u1E49\u1E61\u1E7E\u1EA5\u1EAF\u1EBD\u1EE1\u1F2A\u1F37\u1F44\u1F4E\u1F5A\u0100Do\u1E06\u1D34o\xF4\u1C89\u0100cs\u1E0E\u1E14ute\u803B\xE9\u40E9ter;\u6A6E\u0200aioy\u1E22\u1E27\u1E31\u1E36ron;\u411Br\u0100;c\u1E2D\u1E2E\u6256\u803B\xEA\u40EAlon;\u6255;\u444Dot;\u4117\u0100Dr\u1E41\u1E45ot;\u6252;\uC000\u{1D522}\u0180;rs\u1E50\u1E51\u1E57\u6A9Aave\u803B\xE8\u40E8\u0100;d\u1E5C\u1E5D\u6A96ot;\u6A98\u0200;ils\u1E6A\u1E6B\u1E72\u1E74\u6A99nters;\u63E7;\u6113\u0100;d\u1E79\u1E7A\u6A95ot;\u6A97\u0180aps\u1E85\u1E89\u1E97cr;\u4113ty\u0180;sv\u1E92\u1E93\u1E95\u6205et\xBB\u1E93p\u01001;\u1E9D\u1EA4\u0133\u1EA1\u1EA3;\u6004;\u6005\u6003\u0100gs\u1EAA\u1EAC;\u414Bp;\u6002\u0100gp\u1EB4\u1EB8on;\u4119f;\uC000\u{1D556}\u0180als\u1EC4\u1ECE\u1ED2r\u0100;s\u1ECA\u1ECB\u62D5l;\u69E3us;\u6A71i\u0180;lv\u1EDA\u1EDB\u1EDF\u43B5on\xBB\u1EDB;\u43F5\u0200csuv\u1EEA\u1EF3\u1F0B\u1F23\u0100io\u1EEF\u1E31rc\xBB\u1E2E\u0269\u1EF9\0\0\u1EFB\xED\u0548ant\u0100gl\u1F02\u1F06tr\xBB\u1E5Dess\xBB\u1E7A\u0180aei\u1F12\u1F16\u1F1Als;\u403Dst;\u625Fv\u0100;D\u0235\u1F20D;\u6A78parsl;\u69E5\u0100Da\u1F2F\u1F33ot;\u6253rr;\u6971\u0180cdi\u1F3E\u1F41\u1EF8r;\u612Fo\xF4\u0352\u0100ah\u1F49\u1F4B;\u43B7\u803B\xF0\u40F0\u0100mr\u1F53\u1F57l\u803B\xEB\u40EBo;\u60AC\u0180cip\u1F61\u1F64\u1F67l;\u4021s\xF4\u056E\u0100eo\u1F6C\u1F74ctatio\xEE\u0559nential\xE5\u0579\u09E1\u1F92\0\u1F9E\0\u1FA1\u1FA7\0\0\u1FC6\u1FCC\0\u1FD3\0\u1FE6\u1FEA\u2000\0\u2008\u205Allingdotse\xF1\u1E44y;\u4444male;\u6640\u0180ilr\u1FAD\u1FB3\u1FC1lig;\u8000\uFB03\u0269\u1FB9\0\0\u1FBDg;\u8000\uFB00ig;\u8000\uFB04;\uC000\u{1D523}lig;\u8000\uFB01lig;\uC000fj\u0180alt\u1FD9\u1FDC\u1FE1t;\u666Dig;\u8000\uFB02ns;\u65B1of;\u4192\u01F0\u1FEE\0\u1FF3f;\uC000\u{1D557}\u0100ak\u05BF\u1FF7\u0100;v\u1FFC\u1FFD\u62D4;\u6AD9artint;\u6A0D\u0100ao\u200C\u2055\u0100cs\u2011\u2052\u03B1\u201A\u2030\u2038\u2045\u2048\0\u2050\u03B2\u2022\u2025\u2027\u202A\u202C\0\u202E\u803B\xBD\u40BD;\u6153\u803B\xBC\u40BC;\u6155;\u6159;\u615B\u01B3\u2034\0\u2036;\u6154;\u6156\u02B4\u203E\u2041\0\0\u2043\u803B\xBE\u40BE;\u6157;\u615C5;\u6158\u01B6\u204C\0\u204E;\u615A;\u615D8;\u615El;\u6044wn;\u6322cr;\uC000\u{1D4BB}\u0880Eabcdefgijlnorstv\u2082\u2089\u209F\u20A5\u20B0\u20B4\u20F0\u20F5\u20FA\u20FF\u2103\u2112\u2138\u0317\u213E\u2152\u219E\u0100;l\u064D\u2087;\u6A8C\u0180cmp\u2090\u2095\u209Dute;\u41F5ma\u0100;d\u209C\u1CDA\u43B3;\u6A86reve;\u411F\u0100iy\u20AA\u20AErc;\u411D;\u4433ot;\u4121\u0200;lqs\u063E\u0642\u20BD\u20C9\u0180;qs\u063E\u064C\u20C4lan\xF4\u0665\u0200;cdl\u0665\u20D2\u20D5\u20E5c;\u6AA9ot\u0100;o\u20DC\u20DD\u6A80\u0100;l\u20E2\u20E3\u6A82;\u6A84\u0100;e\u20EA\u20ED\uC000\u22DB\uFE00s;\u6A94r;\uC000\u{1D524}\u0100;g\u0673\u061Bmel;\u6137cy;\u4453\u0200;Eaj\u065A\u210C\u210E\u2110;\u6A92;\u6AA5;\u6AA4\u0200Eaes\u211B\u211D\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6A8Arox\xBB\u2124\u0100;q\u212E\u212F\u6A88\u0100;q\u212E\u211Bim;\u62E7pf;\uC000\u{1D558}\u0100ci\u2143\u2146r;\u610Am\u0180;el\u066B\u214E\u2150;\u6A8E;\u6A90\u8300>;cdlqr\u05EE\u2160\u216A\u216E\u2173\u2179\u0100ci\u2165\u2167;\u6AA7r;\u6A7Aot;\u62D7Par;\u6995uest;\u6A7C\u0280adels\u2184\u216A\u2190\u0656\u219B\u01F0\u2189\0\u218Epro\xF8\u209Er;\u6978q\u0100lq\u063F\u2196les\xF3\u2088i\xED\u066B\u0100en\u21A3\u21ADrtneqq;\uC000\u2269\uFE00\xC5\u21AA\u0500Aabcefkosy\u21C4\u21C7\u21F1\u21F5\u21FA\u2218\u221D\u222F\u2268\u227Dr\xF2\u03A0\u0200ilmr\u21D0\u21D4\u21D7\u21DBrs\xF0\u1484f\xBB\u2024il\xF4\u06A9\u0100dr\u21E0\u21E4cy;\u444A\u0180;cw\u08F4\u21EB\u21EFir;\u6948;\u61ADar;\u610Firc;\u4125\u0180alr\u2201\u220E\u2213rts\u0100;u\u2209\u220A\u6665it\xBB\u220Alip;\u6026con;\u62B9r;\uC000\u{1D525}s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223A\u223E\u2243\u225E\u2263rr;\u61FFtht;\u623Bk\u0100lr\u2249\u2253eftarrow;\u61A9ightarrow;\u61AAf;\uC000\u{1D559}bar;\u6015\u0180clt\u226F\u2274\u2278r;\uC000\u{1D4BD}as\xE8\u21F4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xBB\u1C5B\u0AE1\u22A3\0\u22AA\0\u22B8\u22C5\u22CE\0\u22D5\u22F3\0\0\u22F8\u2322\u2367\u2362\u237F\0\u2386\u23AA\u23B4cute\u803B\xED\u40ED\u0180;iy\u0771\u22B0\u22B5rc\u803B\xEE\u40EE;\u4438\u0100cx\u22BC\u22BFy;\u4435cl\u803B\xA1\u40A1\u0100fr\u039F\u22C9;\uC000\u{1D526}rave\u803B\xEC\u40EC\u0200;ino\u073E\u22DD\u22E9\u22EE\u0100in\u22E2\u22E6nt;\u6A0Ct;\u622Dfin;\u69DCta;\u6129lig;\u4133\u0180aop\u22FE\u231A\u231D\u0180cgt\u2305\u2308\u2317r;\u412B\u0180elp\u071F\u230F\u2313in\xE5\u078Ear\xF4\u0720h;\u4131f;\u62B7ed;\u41B5\u0280;cfot\u04F4\u232C\u2331\u233D\u2341are;\u6105in\u0100;t\u2338\u2339\u621Eie;\u69DDdo\xF4\u2319\u0280;celp\u0757\u234C\u2350\u235B\u2361al;\u62BA\u0100gr\u2355\u2359er\xF3\u1563\xE3\u234Darhk;\u6A17rod;\u6A3C\u0200cgpt\u236F\u2372\u2376\u237By;\u4451on;\u412Ff;\uC000\u{1D55A}a;\u43B9uest\u803B\xBF\u40BF\u0100ci\u238A\u238Fr;\uC000\u{1D4BE}n\u0280;Edsv\u04F4\u239B\u239D\u23A1\u04F3;\u62F9ot;\u62F5\u0100;v\u23A6\u23A7\u62F4;\u62F3\u0100;i\u0777\u23AElde;\u4129\u01EB\u23B8\0\u23BCcy;\u4456l\u803B\xEF\u40EF\u0300cfmosu\u23CC\u23D7\u23DC\u23E1\u23E7\u23F5\u0100iy\u23D1\u23D5rc;\u4135;\u4439r;\uC000\u{1D527}ath;\u4237pf;\uC000\u{1D55B}\u01E3\u23EC\0\u23F1r;\uC000\u{1D4BF}rcy;\u4458kcy;\u4454\u0400acfghjos\u240B\u2416\u2422\u2427\u242D\u2431\u2435\u243Bppa\u0100;v\u2413\u2414\u43BA;\u43F0\u0100ey\u241B\u2420dil;\u4137;\u443Ar;\uC000\u{1D528}reen;\u4138cy;\u4445cy;\u445Cpf;\uC000\u{1D55C}cr;\uC000\u{1D4C0}\u0B80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248D\u2491\u250E\u253D\u255A\u2580\u264E\u265E\u2665\u2679\u267D\u269A\u26B2\u26D8\u275D\u2768\u278B\u27C0\u2801\u2812\u0180art\u2477\u247A\u247Cr\xF2\u09C6\xF2\u0395ail;\u691Barr;\u690E\u0100;g\u0994\u248B;\u6A8Bar;\u6962\u0963\u24A5\0\u24AA\0\u24B1\0\0\0\0\0\u24B5\u24BA\0\u24C6\u24C8\u24CD\0\u24F9ute;\u413Amptyv;\u69B4ra\xEE\u084Cbda;\u43BBg\u0180;dl\u088E\u24C1\u24C3;\u6991\xE5\u088E;\u6A85uo\u803B\xAB\u40ABr\u0400;bfhlpst\u0899\u24DE\u24E6\u24E9\u24EB\u24EE\u24F1\u24F5\u0100;f\u089D\u24E3s;\u691Fs;\u691D\xEB\u2252p;\u61ABl;\u6939im;\u6973l;\u61A2\u0180;ae\u24FF\u2500\u2504\u6AABil;\u6919\u0100;s\u2509\u250A\u6AAD;\uC000\u2AAD\uFE00\u0180abr\u2515\u2519\u251Drr;\u690Crk;\u6772\u0100ak\u2522\u252Cc\u0100ek\u2528\u252A;\u407B;\u405B\u0100es\u2531\u2533;\u698Bl\u0100du\u2539\u253B;\u698F;\u698D\u0200aeuy\u2546\u254B\u2556\u2558ron;\u413E\u0100di\u2550\u2554il;\u413C\xEC\u08B0\xE2\u2529;\u443B\u0200cqrs\u2563\u2566\u256D\u257Da;\u6936uo\u0100;r\u0E19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694Bh;\u61B2\u0280;fgqs\u258B\u258C\u0989\u25F3\u25FF\u6264t\u0280ahlrt\u2598\u25A4\u25B7\u25C2\u25E8rrow\u0100;t\u0899\u25A1a\xE9\u24F6arpoon\u0100du\u25AF\u25B4own\xBB\u045Ap\xBB\u0966eftarrows;\u61C7ight\u0180ahs\u25CD\u25D6\u25DErrow\u0100;s\u08F4\u08A7arpoon\xF3\u0F98quigarro\xF7\u21F0hreetimes;\u62CB\u0180;qs\u258B\u0993\u25FAlan\xF4\u09AC\u0280;cdgs\u09AC\u260A\u260D\u261D\u2628c;\u6AA8ot\u0100;o\u2614\u2615\u6A7F\u0100;r\u261A\u261B\u6A81;\u6A83\u0100;e\u2622\u2625\uC000\u22DA\uFE00s;\u6A93\u0280adegs\u2633\u2639\u263D\u2649\u264Bppro\xF8\u24C6ot;\u62D6q\u0100gq\u2643\u2645\xF4\u0989gt\xF2\u248C\xF4\u099Bi\xED\u09B2\u0180ilr\u2655\u08E1\u265Asht;\u697C;\uC000\u{1D529}\u0100;E\u099C\u2663;\u6A91\u0161\u2669\u2676r\u0100du\u25B2\u266E\u0100;l\u0965\u2673;\u696Alk;\u6584cy;\u4459\u0280;acht\u0A48\u2688\u268B\u2691\u2696r\xF2\u25C1orne\xF2\u1D08ard;\u696Bri;\u65FA\u0100io\u269F\u26A4dot;\u4140ust\u0100;a\u26AC\u26AD\u63B0che\xBB\u26AD\u0200Eaes\u26BB\u26BD\u26C9\u26D4;\u6268p\u0100;p\u26C3\u26C4\u6A89rox\xBB\u26C4\u0100;q\u26CE\u26CF\u6A87\u0100;q\u26CE\u26BBim;\u62E6\u0400abnoptwz\u26E9\u26F4\u26F7\u271A\u272F\u2741\u2747\u2750\u0100nr\u26EE\u26F1g;\u67ECr;\u61FDr\xEB\u08C1g\u0180lmr\u26FF\u270D\u2714eft\u0100ar\u09E6\u2707ight\xE1\u09F2apsto;\u67FCight\xE1\u09FDparrow\u0100lr\u2725\u2729ef\xF4\u24EDight;\u61AC\u0180afl\u2736\u2739\u273Dr;\u6985;\uC000\u{1D55D}us;\u6A2Dimes;\u6A34\u0161\u274B\u274Fst;\u6217\xE1\u134E\u0180;ef\u2757\u2758\u1800\u65CAnge\xBB\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277C\u2785\u2787r\xF2\u08A8orne\xF2\u1D8Car\u0100;d\u0F98\u2783;\u696D;\u600Eri;\u62BF\u0300achiqt\u2798\u279D\u0A40\u27A2\u27AE\u27BBquo;\u6039r;\uC000\u{1D4C1}m\u0180;eg\u09B2\u27AA\u27AC;\u6A8D;\u6A8F\u0100bu\u252A\u27B3o\u0100;r\u0E1F\u27B9;\u601Arok;\u4142\u8400<;cdhilqr\u082B\u27D2\u2639\u27DC\u27E0\u27E5\u27EA\u27F0\u0100ci\u27D7\u27D9;\u6AA6r;\u6A79re\xE5\u25F2mes;\u62C9arr;\u6976uest;\u6A7B\u0100Pi\u27F5\u27F9ar;\u6996\u0180;ef\u2800\u092D\u181B\u65C3r\u0100du\u2807\u280Dshar;\u694Ahar;\u6966\u0100en\u2817\u2821rtneqq;\uC000\u2268\uFE00\xC5\u281E\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288E\u2893\u28A0\u28A5\u28A8\u28DA\u28E2\u28E4\u0A83\u28F3\u2902Dot;\u623A\u0200clpr\u284E\u2852\u2863\u287Dr\u803B\xAF\u40AF\u0100et\u2857\u2859;\u6642\u0100;e\u285E\u285F\u6720se\xBB\u285F\u0100;s\u103B\u2868to\u0200;dlu\u103B\u2873\u2877\u287Bow\xEE\u048Cef\xF4\u090F\xF0\u13D1ker;\u65AE\u0100oy\u2887\u288Cmma;\u6A29;\u443Cash;\u6014asuredangle\xBB\u1626r;\uC000\u{1D52A}o;\u6127\u0180cdn\u28AF\u28B4\u28C9ro\u803B\xB5\u40B5\u0200;acd\u1464\u28BD\u28C0\u28C4s\xF4\u16A7ir;\u6AF0ot\u80BB\xB7\u01B5us\u0180;bd\u28D2\u1903\u28D3\u6212\u0100;u\u1D3C\u28D8;\u6A2A\u0163\u28DE\u28E1p;\u6ADB\xF2\u2212\xF0\u0A81\u0100dp\u28E9\u28EEels;\u62A7f;\uC000\u{1D55E}\u0100ct\u28F8\u28FDr;\uC000\u{1D4C2}pos\xBB\u159D\u0180;lm\u2909\u290A\u290D\u43BCtimap;\u62B8\u0C00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297E\u2989\u2998\u29DA\u29E9\u2A15\u2A1A\u2A58\u2A5D\u2A83\u2A95\u2AA4\u2AA8\u2B04\u2B07\u2B44\u2B7F\u2BAE\u2C34\u2C67\u2C7C\u2CE9\u0100gt\u2947\u294B;\uC000\u22D9\u0338\u0100;v\u2950\u0BCF\uC000\u226B\u20D2\u0180elt\u295A\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61CDightarrow;\u61CE;\uC000\u22D8\u0338\u0100;v\u297B\u0C47\uC000\u226A\u20D2ightarrow;\u61CF\u0100Dd\u298E\u2993ash;\u62AFash;\u62AE\u0280bcnpt\u29A3\u29A7\u29AC\u29B1\u29CCla\xBB\u02DEute;\u4144g;\uC000\u2220\u20D2\u0280;Eiop\u0D84\u29BC\u29C0\u29C5\u29C8;\uC000\u2A70\u0338d;\uC000\u224B\u0338s;\u4149ro\xF8\u0D84ur\u0100;a\u29D3\u29D4\u666El\u0100;s\u29D3\u0B38\u01F3\u29DF\0\u29E3p\u80BB\xA0\u0B37mp\u0100;e\u0BF9\u0C00\u0280aeouy\u29F4\u29FE\u2A03\u2A10\u2A13\u01F0\u29F9\0\u29FB;\u6A43on;\u4148dil;\u4146ng\u0100;d\u0D7E\u2A0Aot;\uC000\u2A6D\u0338p;\u6A42;\u443Dash;\u6013\u0380;Aadqsx\u0B92\u2A29\u2A2D\u2A3B\u2A41\u2A45\u2A50rr;\u61D7r\u0100hr\u2A33\u2A36k;\u6924\u0100;o\u13F2\u13F0ot;\uC000\u2250\u0338ui\xF6\u0B63\u0100ei\u2A4A\u2A4Ear;\u6928\xED\u0B98ist\u0100;s\u0BA0\u0B9Fr;\uC000\u{1D52B}\u0200Eest\u0BC5\u2A66\u2A79\u2A7C\u0180;qs\u0BBC\u2A6D\u0BE1\u0180;qs\u0BBC\u0BC5\u2A74lan\xF4\u0BE2i\xED\u0BEA\u0100;r\u0BB6\u2A81\xBB\u0BB7\u0180Aap\u2A8A\u2A8D\u2A91r\xF2\u2971rr;\u61AEar;\u6AF2\u0180;sv\u0F8D\u2A9C\u0F8C\u0100;d\u2AA1\u2AA2\u62FC;\u62FAcy;\u445A\u0380AEadest\u2AB7\u2ABA\u2ABE\u2AC2\u2AC5\u2AF6\u2AF9r\xF2\u2966;\uC000\u2266\u0338rr;\u619Ar;\u6025\u0200;fqs\u0C3B\u2ACE\u2AE3\u2AEFt\u0100ar\u2AD4\u2AD9rro\xF7\u2AC1ightarro\xF7\u2A90\u0180;qs\u0C3B\u2ABA\u2AEAlan\xF4\u0C55\u0100;s\u0C55\u2AF4\xBB\u0C36i\xED\u0C5D\u0100;r\u0C35\u2AFEi\u0100;e\u0C1A\u0C25i\xE4\u0D90\u0100pt\u2B0C\u2B11f;\uC000\u{1D55F}\u8180\xAC;in\u2B19\u2B1A\u2B36\u40ACn\u0200;Edv\u0B89\u2B24\u2B28\u2B2E;\uC000\u22F9\u0338ot;\uC000\u22F5\u0338\u01E1\u0B89\u2B33\u2B35;\u62F7;\u62F6i\u0100;v\u0CB8\u2B3C\u01E1\u0CB8\u2B41\u2B43;\u62FE;\u62FD\u0180aor\u2B4B\u2B63\u2B69r\u0200;ast\u0B7B\u2B55\u2B5A\u2B5Flle\xEC\u0B7Bl;\uC000\u2AFD\u20E5;\uC000\u2202\u0338lint;\u6A14\u0180;ce\u0C92\u2B70\u2B73u\xE5\u0CA5\u0100;c\u0C98\u2B78\u0100;e\u0C92\u2B7D\xF1\u0C98\u0200Aait\u2B88\u2B8B\u2B9D\u2BA7r\xF2\u2988rr\u0180;cw\u2B94\u2B95\u2B99\u619B;\uC000\u2933\u0338;\uC000\u219D\u0338ghtarrow\xBB\u2B95ri\u0100;e\u0CCB\u0CD6\u0380chimpqu\u2BBD\u2BCD\u2BD9\u2B04\u0B78\u2BE4\u2BEF\u0200;cer\u0D32\u2BC6\u0D37\u2BC9u\xE5\u0D45;\uC000\u{1D4C3}ort\u026D\u2B05\0\0\u2BD6ar\xE1\u2B56m\u0100;e\u0D6E\u2BDF\u0100;q\u0D74\u0D73su\u0100bp\u2BEB\u2BED\xE5\u0CF8\xE5\u0D0B\u0180bcp\u2BF6\u2C11\u2C19\u0200;Ees\u2BFF\u2C00\u0D22\u2C04\u6284;\uC000\u2AC5\u0338et\u0100;e\u0D1B\u2C0Bq\u0100;q\u0D23\u2C00c\u0100;e\u0D32\u2C17\xF1\u0D38\u0200;Ees\u2C22\u2C23\u0D5F\u2C27\u6285;\uC000\u2AC6\u0338et\u0100;e\u0D58\u2C2Eq\u0100;q\u0D60\u2C23\u0200gilr\u2C3D\u2C3F\u2C45\u2C47\xEC\u0BD7lde\u803B\xF1\u40F1\xE7\u0C43iangle\u0100lr\u2C52\u2C5Ceft\u0100;e\u0C1A\u2C5A\xF1\u0C26ight\u0100;e\u0CCB\u2C65\xF1\u0CD7\u0100;m\u2C6C\u2C6D\u43BD\u0180;es\u2C74\u2C75\u2C79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2C8F\u2C94\u2C99\u2C9E\u2CA3\u2CB0\u2CB6\u2CD3\u2CE3ash;\u62ADarr;\u6904p;\uC000\u224D\u20D2ash;\u62AC\u0100et\u2CA8\u2CAC;\uC000\u2265\u20D2;\uC000>\u20D2nfin;\u69DE\u0180Aet\u2CBD\u2CC1\u2CC5rr;\u6902;\uC000\u2264\u20D2\u0100;r\u2CCA\u2CCD\uC000<\u20D2ie;\uC000\u22B4\u20D2\u0100At\u2CD8\u2CDCrr;\u6903rie;\uC000\u22B5\u20D2im;\uC000\u223C\u20D2\u0180Aan\u2CF0\u2CF4\u2D02rr;\u61D6r\u0100hr\u2CFA\u2CFDk;\u6923\u0100;o\u13E7\u13E5ear;\u6927\u1253\u1A95\0\0\0\0\0\0\0\0\0\0\0\0\0\u2D2D\0\u2D38\u2D48\u2D60\u2D65\u2D72\u2D84\u1B07\0\0\u2D8D\u2DAB\0\u2DC8\u2DCE\0\u2DDC\u2E19\u2E2B\u2E3E\u2E43\u0100cs\u2D31\u1A97ute\u803B\xF3\u40F3\u0100iy\u2D3C\u2D45r\u0100;c\u1A9E\u2D42\u803B\xF4\u40F4;\u443E\u0280abios\u1AA0\u2D52\u2D57\u01C8\u2D5Alac;\u4151v;\u6A38old;\u69BClig;\u4153\u0100cr\u2D69\u2D6Dir;\u69BF;\uC000\u{1D52C}\u036F\u2D79\0\0\u2D7C\0\u2D82n;\u42DBave\u803B\xF2\u40F2;\u69C1\u0100bm\u2D88\u0DF4ar;\u69B5\u0200acit\u2D95\u2D98\u2DA5\u2DA8r\xF2\u1A80\u0100ir\u2D9D\u2DA0r;\u69BEoss;\u69BBn\xE5\u0E52;\u69C0\u0180aei\u2DB1\u2DB5\u2DB9cr;\u414Dga;\u43C9\u0180cdn\u2DC0\u2DC5\u01CDron;\u43BF;\u69B6pf;\uC000\u{1D560}\u0180ael\u2DD4\u2DD7\u01D2r;\u69B7rp;\u69B9\u0380;adiosv\u2DEA\u2DEB\u2DEE\u2E08\u2E0D\u2E10\u2E16\u6228r\xF2\u1A86\u0200;efm\u2DF7\u2DF8\u2E02\u2E05\u6A5Dr\u0100;o\u2DFE\u2DFF\u6134f\xBB\u2DFF\u803B\xAA\u40AA\u803B\xBA\u40BAgof;\u62B6r;\u6A56lope;\u6A57;\u6A5B\u0180clo\u2E1F\u2E21\u2E27\xF2\u2E01ash\u803B\xF8\u40F8l;\u6298i\u016C\u2E2F\u2E34de\u803B\xF5\u40F5es\u0100;a\u01DB\u2E3As;\u6A36ml\u803B\xF6\u40F6bar;\u633D\u0AE1\u2E5E\0\u2E7D\0\u2E80\u2E9D\0\u2EA2\u2EB9\0\0\u2ECB\u0E9C\0\u2F13\0\0\u2F2B\u2FBC\0\u2FC8r\u0200;ast\u0403\u2E67\u2E72\u0E85\u8100\xB6;l\u2E6D\u2E6E\u40B6le\xEC\u0403\u0269\u2E78\0\0\u2E7Bm;\u6AF3;\u6AFDy;\u443Fr\u0280cimpt\u2E8B\u2E8F\u2E93\u1865\u2E97nt;\u4025od;\u402Eil;\u6030enk;\u6031r;\uC000\u{1D52D}\u0180imo\u2EA8\u2EB0\u2EB4\u0100;v\u2EAD\u2EAE\u43C6;\u43D5ma\xF4\u0A76ne;\u660E\u0180;tv\u2EBF\u2EC0\u2EC8\u43C0chfork\xBB\u1FFD;\u43D6\u0100au\u2ECF\u2EDFn\u0100ck\u2ED5\u2EDDk\u0100;h\u21F4\u2EDB;\u610E\xF6\u21F4s\u0480;abcdemst\u2EF3\u2EF4\u1908\u2EF9\u2EFD\u2F04\u2F06\u2F0A\u2F0E\u402Bcir;\u6A23ir;\u6A22\u0100ou\u1D40\u2F02;\u6A25;\u6A72n\u80BB\xB1\u0E9Dim;\u6A26wo;\u6A27\u0180ipu\u2F19\u2F20\u2F25ntint;\u6A15f;\uC000\u{1D561}nd\u803B\xA3\u40A3\u0500;Eaceinosu\u0EC8\u2F3F\u2F41\u2F44\u2F47\u2F81\u2F89\u2F92\u2F7E\u2FB6;\u6AB3p;\u6AB7u\xE5\u0ED9\u0100;c\u0ECE\u2F4C\u0300;acens\u0EC8\u2F59\u2F5F\u2F66\u2F68\u2F7Eppro\xF8\u2F43urlye\xF1\u0ED9\xF1\u0ECE\u0180aes\u2F6F\u2F76\u2F7Approx;\u6AB9qq;\u6AB5im;\u62E8i\xED\u0EDFme\u0100;s\u2F88\u0EAE\u6032\u0180Eas\u2F78\u2F90\u2F7A\xF0\u2F75\u0180dfp\u0EEC\u2F99\u2FAF\u0180als\u2FA0\u2FA5\u2FAAlar;\u632Eine;\u6312urf;\u6313\u0100;t\u0EFB\u2FB4\xEF\u0EFBrel;\u62B0\u0100ci\u2FC0\u2FC5r;\uC000\u{1D4C5};\u43C8ncsp;\u6008\u0300fiopsu\u2FDA\u22E2\u2FDF\u2FE5\u2FEB\u2FF1r;\uC000\u{1D52E}pf;\uC000\u{1D562}rime;\u6057cr;\uC000\u{1D4C6}\u0180aeo\u2FF8\u3009\u3013t\u0100ei\u2FFE\u3005rnion\xF3\u06B0nt;\u6A16st\u0100;e\u3010\u3011\u403F\xF1\u1F19\xF4\u0F14\u0A80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30E0\u310E\u312B\u3147\u3162\u3172\u318E\u3206\u3215\u3224\u3229\u3258\u326E\u3272\u3290\u32B0\u32B7\u0180art\u3047\u304A\u304Cr\xF2\u10B3\xF2\u03DDail;\u691Car\xF2\u1C65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307F\u308F\u3094\u30CC\u0100eu\u306D\u3071;\uC000\u223D\u0331te;\u4155i\xE3\u116Emptyv;\u69B3g\u0200;del\u0FD1\u3089\u308B\u308D;\u6992;\u69A5\xE5\u0FD1uo\u803B\xBB\u40BBr\u0580;abcfhlpstw\u0FDC\u30AC\u30AF\u30B7\u30B9\u30BC\u30BE\u30C0\u30C3\u30C7\u30CAp;\u6975\u0100;f\u0FE0\u30B4s;\u6920;\u6933s;\u691E\xEB\u225D\xF0\u272El;\u6945im;\u6974l;\u61A3;\u619D\u0100ai\u30D1\u30D5il;\u691Ao\u0100;n\u30DB\u30DC\u6236al\xF3\u0F1E\u0180abr\u30E7\u30EA\u30EEr\xF2\u17E5rk;\u6773\u0100ak\u30F3\u30FDc\u0100ek\u30F9\u30FB;\u407D;\u405D\u0100es\u3102\u3104;\u698Cl\u0100du\u310A\u310C;\u698E;\u6990\u0200aeuy\u3117\u311C\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xEC\u0FF2\xE2\u30FA;\u4440\u0200clqs\u3134\u3137\u313D\u3144a;\u6937dhar;\u6969uo\u0100;r\u020E\u020Dh;\u61B3\u0180acg\u314E\u315F\u0F44l\u0200;ips\u0F78\u3158\u315B\u109Cn\xE5\u10BBar\xF4\u0FA9t;\u65AD\u0180ilr\u3169\u1023\u316Esht;\u697D;\uC000\u{1D52F}\u0100ao\u3177\u3186r\u0100du\u317D\u317F\xBB\u047B\u0100;l\u1091\u3184;\u696C\u0100;v\u318B\u318C\u43C1;\u43F1\u0180gns\u3195\u31F9\u31FCht\u0300ahlrst\u31A4\u31B0\u31C2\u31D8\u31E4\u31EErrow\u0100;t\u0FDC\u31ADa\xE9\u30C8arpoon\u0100du\u31BB\u31BFow\xEE\u317Ep\xBB\u1092eft\u0100ah\u31CA\u31D0rrow\xF3\u0FEAarpoon\xF3\u0551ightarrows;\u61C9quigarro\xF7\u30CBhreetimes;\u62CCg;\u42DAingdotse\xF1\u1F32\u0180ahm\u320D\u3210\u3213r\xF2\u0FEAa\xF2\u0551;\u600Foust\u0100;a\u321E\u321F\u63B1che\xBB\u321Fmid;\u6AEE\u0200abpt\u3232\u323D\u3240\u3252\u0100nr\u3237\u323Ag;\u67EDr;\u61FEr\xEB\u1003\u0180afl\u3247\u324A\u324Er;\u6986;\uC000\u{1D563}us;\u6A2Eimes;\u6A35\u0100ap\u325D\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6A12ar\xF2\u31E3\u0200achq\u327B\u3280\u10BC\u3285quo;\u603Ar;\uC000\u{1D4C7}\u0100bu\u30FB\u328Ao\u0100;r\u0214\u0213\u0180hir\u3297\u329B\u32A0re\xE5\u31F8mes;\u62CAi\u0200;efl\u32AA\u1059\u1821\u32AB\u65B9tri;\u69CEluhar;\u6968;\u611E\u0D61\u32D5\u32DB\u32DF\u332C\u3338\u3371\0\u337A\u33A4\0\0\u33EC\u33F0\0\u3428\u3448\u345A\u34AD\u34B1\u34CA\u34F1\0\u3616\0\0\u3633cute;\u415Bqu\xEF\u27BA\u0500;Eaceinpsy\u11ED\u32F3\u32F5\u32FF\u3302\u330B\u330F\u331F\u3326\u3329;\u6AB4\u01F0\u32FA\0\u32FC;\u6AB8on;\u4161u\xE5\u11FE\u0100;d\u11F3\u3307il;\u415Frc;\u415D\u0180Eas\u3316\u3318\u331B;\u6AB6p;\u6ABAim;\u62E9olint;\u6A13i\xED\u1204;\u4441ot\u0180;be\u3334\u1D47\u3335\u62C5;\u6A66\u0380Aacmstx\u3346\u334A\u3357\u335B\u335E\u3363\u336Drr;\u61D8r\u0100hr\u3350\u3352\xEB\u2228\u0100;o\u0A36\u0A34t\u803B\xA7\u40A7i;\u403Bwar;\u6929m\u0100in\u3369\xF0nu\xF3\xF1t;\u6736r\u0100;o\u3376\u2055\uC000\u{1D530}\u0200acoy\u3382\u3386\u3391\u33A0rp;\u666F\u0100hy\u338B\u338Fcy;\u4449;\u4448rt\u026D\u3399\0\0\u339Ci\xE4\u1464ara\xEC\u2E6F\u803B\xAD\u40AD\u0100gm\u33A8\u33B4ma\u0180;fv\u33B1\u33B2\u33B2\u43C3;\u43C2\u0400;deglnpr\u12AB\u33C5\u33C9\u33CE\u33D6\u33DE\u33E1\u33E6ot;\u6A6A\u0100;q\u12B1\u12B0\u0100;E\u33D3\u33D4\u6A9E;\u6AA0\u0100;E\u33DB\u33DC\u6A9D;\u6A9Fe;\u6246lus;\u6A24arr;\u6972ar\xF2\u113D\u0200aeit\u33F8\u3408\u340F\u3417\u0100ls\u33FD\u3404lsetm\xE9\u336Ahp;\u6A33parsl;\u69E4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341C\u341D\u6AAA\u0100;s\u3422\u3423\u6AAC;\uC000\u2AAC\uFE00\u0180flp\u342E\u3433\u3442tcy;\u444C\u0100;b\u3438\u3439\u402F\u0100;a\u343E\u343F\u69C4r;\u633Ff;\uC000\u{1D564}a\u0100dr\u344D\u0402es\u0100;u\u3454\u3455\u6660it\xBB\u3455\u0180csu\u3460\u3479\u349F\u0100au\u3465\u346Fp\u0100;s\u1188\u346B;\uC000\u2293\uFE00p\u0100;s\u11B4\u3475;\uC000\u2294\uFE00u\u0100bp\u347F\u348F\u0180;es\u1197\u119C\u3486et\u0100;e\u1197\u348D\xF1\u119D\u0180;es\u11A8\u11AD\u3496et\u0100;e\u11A8\u349D\xF1\u11AE\u0180;af\u117B\u34A6\u05B0r\u0165\u34AB\u05B1\xBB\u117Car\xF2\u1148\u0200cemt\u34B9\u34BE\u34C2\u34C5r;\uC000\u{1D4C8}tm\xEE\xF1i\xEC\u3415ar\xE6\u11BE\u0100ar\u34CE\u34D5r\u0100;f\u34D4\u17BF\u6606\u0100an\u34DA\u34EDight\u0100ep\u34E3\u34EApsilo\xEE\u1EE0h\xE9\u2EAFs\xBB\u2852\u0280bcmnp\u34FB\u355E\u1209\u358B\u358E\u0480;Edemnprs\u350E\u350F\u3511\u3515\u351E\u3523\u352C\u3531\u3536\u6282;\u6AC5ot;\u6ABD\u0100;d\u11DA\u351Aot;\u6AC3ult;\u6AC1\u0100Ee\u3528\u352A;\u6ACB;\u628Alus;\u6ABFarr;\u6979\u0180eiu\u353D\u3552\u3555t\u0180;en\u350E\u3545\u354Bq\u0100;q\u11DA\u350Feq\u0100;q\u352B\u3528m;\u6AC7\u0100bp\u355A\u355C;\u6AD5;\u6AD3c\u0300;acens\u11ED\u356C\u3572\u3579\u357B\u3326ppro\xF8\u32FAurlye\xF1\u11FE\xF1\u11F3\u0180aes\u3582\u3588\u331Bppro\xF8\u331Aq\xF1\u3317g;\u666A\u0680123;Edehlmnps\u35A9\u35AC\u35AF\u121C\u35B2\u35B4\u35C0\u35C9\u35D5\u35DA\u35DF\u35E8\u35ED\u803B\xB9\u40B9\u803B\xB2\u40B2\u803B\xB3\u40B3;\u6AC6\u0100os\u35B9\u35BCt;\u6ABEub;\u6AD8\u0100;d\u1222\u35C5ot;\u6AC4s\u0100ou\u35CF\u35D2l;\u67C9b;\u6AD7arr;\u697Bult;\u6AC2\u0100Ee\u35E4\u35E6;\u6ACC;\u628Blus;\u6AC0\u0180eiu\u35F4\u3609\u360Ct\u0180;en\u121C\u35FC\u3602q\u0100;q\u1222\u35B2eq\u0100;q\u35E7\u35E4m;\u6AC8\u0100bp\u3611\u3613;\u6AD4;\u6AD6\u0180Aan\u361C\u3620\u362Drr;\u61D9r\u0100hr\u3626\u3628\xEB\u222E\u0100;o\u0A2B\u0A29war;\u692Alig\u803B\xDF\u40DF\u0BE1\u3651\u365D\u3660\u12CE\u3673\u3679\0\u367E\u36C2\0\0\0\0\0\u36DB\u3703\0\u3709\u376C\0\0\0\u3787\u0272\u3656\0\0\u365Bget;\u6316;\u43C4r\xEB\u0E5F\u0180aey\u3666\u366B\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uC000\u{1D531}\u0200eiko\u3686\u369D\u36B5\u36BC\u01F2\u368B\0\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369B\u43B8ym;\u43D1\u0100cn\u36A2\u36B2k\u0100as\u36A8\u36AEppro\xF8\u12C1im\xBB\u12ACs\xF0\u129E\u0100as\u36BA\u36AE\xF0\u12C1rn\u803B\xFE\u40FE\u01EC\u031F\u36C6\u22E7es\u8180\xD7;bd\u36CF\u36D0\u36D8\u40D7\u0100;a\u190F\u36D5r;\u6A31;\u6A30\u0180eps\u36E1\u36E3\u3700\xE1\u2A4D\u0200;bcf\u0486\u36EC\u36F0\u36F4ot;\u6336ir;\u6AF1\u0100;o\u36F9\u36FC\uC000\u{1D565}rk;\u6ADA\xE1\u3362rime;\u6034\u0180aip\u370F\u3712\u3764d\xE5\u1248\u0380adempst\u3721\u374D\u3740\u3751\u3757\u375C\u375Fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65B5own\xBB\u1DBBeft\u0100;e\u2800\u373E\xF1\u092E;\u625Cight\u0100;e\u32AA\u374B\xF1\u105Aot;\u65ECinus;\u6A3Alus;\u6A39b;\u69CDime;\u6A3Bezium;\u63E2\u0180cht\u3772\u377D\u3781\u0100ry\u3777\u377B;\uC000\u{1D4C9};\u4446cy;\u445Brok;\u4167\u0100io\u378B\u378Ex\xF4\u1777head\u0100lr\u3797\u37A0eftarro\xF7\u084Fightarrow\xBB\u0F5D\u0900AHabcdfghlmoprstuw\u37D0\u37D3\u37D7\u37E4\u37F0\u37FC\u380E\u381C\u3823\u3834\u3851\u385D\u386B\u38A9\u38CC\u38D2\u38EA\u38F6r\xF2\u03EDar;\u6963\u0100cr\u37DC\u37E2ute\u803B\xFA\u40FA\xF2\u1150r\u01E3\u37EA\0\u37EDy;\u445Eve;\u416D\u0100iy\u37F5\u37FArc\u803B\xFB\u40FB;\u4443\u0180abh\u3803\u3806\u380Br\xF2\u13ADlac;\u4171a\xF2\u13C3\u0100ir\u3813\u3818sht;\u697E;\uC000\u{1D532}rave\u803B\xF9\u40F9\u0161\u3827\u3831r\u0100lr\u382C\u382E\xBB\u0957\xBB\u1083lk;\u6580\u0100ct\u3839\u384D\u026F\u383F\0\0\u384Arn\u0100;e\u3845\u3846\u631Cr\xBB\u3846op;\u630Fri;\u65F8\u0100al\u3856\u385Acr;\u416B\u80BB\xA8\u0349\u0100gp\u3862\u3866on;\u4173f;\uC000\u{1D566}\u0300adhlsu\u114B\u3878\u387D\u1372\u3891\u38A0own\xE1\u13B3arpoon\u0100lr\u3888\u388Cef\xF4\u382Digh\xF4\u382Fi\u0180;hl\u3899\u389A\u389C\u43C5\xBB\u13FAon\xBB\u389Aparrows;\u61C8\u0180cit\u38B0\u38C4\u38C8\u026F\u38B6\0\0\u38C1rn\u0100;e\u38BC\u38BD\u631Dr\xBB\u38BDop;\u630Eng;\u416Fri;\u65F9cr;\uC000\u{1D4CA}\u0180dir\u38D9\u38DD\u38E2ot;\u62F0lde;\u4169i\u0100;f\u3730\u38E8\xBB\u1813\u0100am\u38EF\u38F2r\xF2\u38A8l\u803B\xFC\u40FCangle;\u69A7\u0780ABDacdeflnoprsz\u391C\u391F\u3929\u392D\u39B5\u39B8\u39BD\u39DF\u39E4\u39E8\u39F3\u39F9\u39FD\u3A01\u3A20r\xF2\u03F7ar\u0100;v\u3926\u3927\u6AE8;\u6AE9as\xE8\u03E1\u0100nr\u3932\u3937grt;\u699C\u0380eknprst\u34E3\u3946\u394B\u3952\u395D\u3964\u3996app\xE1\u2415othin\xE7\u1E96\u0180hir\u34EB\u2EC8\u3959op\xF4\u2FB5\u0100;h\u13B7\u3962\xEF\u318D\u0100iu\u3969\u396Dgm\xE1\u33B3\u0100bp\u3972\u3984setneq\u0100;q\u397D\u3980\uC000\u228A\uFE00;\uC000\u2ACB\uFE00setneq\u0100;q\u398F\u3992\uC000\u228B\uFE00;\uC000\u2ACC\uFE00\u0100hr\u399B\u399Fet\xE1\u369Ciangle\u0100lr\u39AA\u39AFeft\xBB\u0925ight\xBB\u1051y;\u4432ash\xBB\u1036\u0180elr\u39C4\u39D2\u39D7\u0180;be\u2DEA\u39CB\u39CFar;\u62BBq;\u625Alip;\u62EE\u0100bt\u39DC\u1468a\xF2\u1469r;\uC000\u{1D533}tr\xE9\u39AEsu\u0100bp\u39EF\u39F1\xBB\u0D1C\xBB\u0D59pf;\uC000\u{1D567}ro\xF0\u0EFBtr\xE9\u39B4\u0100cu\u3A06\u3A0Br;\uC000\u{1D4CB}\u0100bp\u3A10\u3A18n\u0100Ee\u3980\u3A16\xBB\u397En\u0100Ee\u3992\u3A1E\xBB\u3990igzag;\u699A\u0380cefoprs\u3A36\u3A3B\u3A56\u3A5B\u3A54\u3A61\u3A6Airc;\u4175\u0100di\u3A40\u3A51\u0100bg\u3A45\u3A49ar;\u6A5Fe\u0100;q\u15FA\u3A4F;\u6259erp;\u6118r;\uC000\u{1D534}pf;\uC000\u{1D568}\u0100;e\u1479\u3A66at\xE8\u1479cr;\uC000\u{1D4CC}\u0AE3\u178E\u3A87\0\u3A8B\0\u3A90\u3A9B\0\0\u3A9D\u3AA8\u3AAB\u3AAF\0\0\u3AC3\u3ACE\0\u3AD8\u17DC\u17DFtr\xE9\u17D1r;\uC000\u{1D535}\u0100Aa\u3A94\u3A97r\xF2\u03C3r\xF2\u09F6;\u43BE\u0100Aa\u3AA1\u3AA4r\xF2\u03B8r\xF2\u09EBa\xF0\u2713is;\u62FB\u0180dpt\u17A4\u3AB5\u3ABE\u0100fl\u3ABA\u17A9;\uC000\u{1D569}im\xE5\u17B2\u0100Aa\u3AC7\u3ACAr\xF2\u03CEr\xF2\u0A01\u0100cq\u3AD2\u17B8r;\uC000\u{1D4CD}\u0100pt\u17D6\u3ADCr\xE9\u17D4\u0400acefiosu\u3AF0\u3AFD\u3B08\u3B0C\u3B11\u3B15\u3B1B\u3B21c\u0100uy\u3AF6\u3AFBte\u803B\xFD\u40FD;\u444F\u0100iy\u3B02\u3B06rc;\u4177;\u444Bn\u803B\xA5\u40A5r;\uC000\u{1D536}cy;\u4457pf;\uC000\u{1D56A}cr;\uC000\u{1D4CE}\u0100cm\u3B26\u3B29y;\u444El\u803B\xFF\u40FF\u0500acdefhiosw\u3B42\u3B48\u3B54\u3B58\u3B64\u3B69\u3B6D\u3B74\u3B7A\u3B80cute;\u417A\u0100ay\u3B4D\u3B52ron;\u417E;\u4437ot;\u417C\u0100et\u3B5D\u3B61tr\xE6\u155Fa;\u43B6r;\uC000\u{1D537}cy;\u4436grarr;\u61DDpf;\uC000\u{1D56B}cr;\uC000\u{1D4CF}\u0100jn\u3B85\u3B87;\u600Dj;\u600C'.split("").map(e=>e.charCodeAt(0)));var At,qs=new Map([[0,65533],[128,8364],[130,8218],[131,402],[132,8222],[133,8230],[134,8224],[135,8225],[136,710],[137,8240],[138,352],[139,8249],[140,338],[142,381],[145,8216],[146,8217],[147,8220],[148,8221],[149,8226],[150,8211],[151,8212],[152,732],[153,8482],[154,353],[155,8250],[156,339],[158,382],[159,376]]),jt=(At=String.fromCodePoint)!==null&&At!==void 0?At:function(e){let t="";return e>65535&&(e-=65536,t+=String.fromCharCode(e>>>10&1023|55296),e=56320|e&1023),t+=String.fromCharCode(e),t};function gt(e){var t;return e>=55296&&e<=57343||e>1114111?65533:(t=qs.get(e))!==null&&t!==void 0?t:e}var F;(function(e){e[e.NUM=35]="NUM",e[e.SEMI=59]="SEMI",e[e.EQUALS=61]="EQUALS",e[e.ZERO=48]="ZERO",e[e.NINE=57]="NINE",e[e.LOWER_A=97]="LOWER_A",e[e.LOWER_F=102]="LOWER_F",e[e.LOWER_X=120]="LOWER_X",e[e.LOWER_Z=122]="LOWER_Z",e[e.UPPER_A=65]="UPPER_A",e[e.UPPER_F=70]="UPPER_F",e[e.UPPER_Z=90]="UPPER_Z"})(F||(F={}));var Ws=32,fe;(function(e){e[e.VALUE_LENGTH=49152]="VALUE_LENGTH",e[e.BRANCH_LENGTH=16256]="BRANCH_LENGTH",e[e.JUMP_TABLE=127]="JUMP_TABLE"})(fe||(fe={}));function Ct(e){return e>=F.ZERO&&e<=F.NINE}function Qs(e){return e>=F.UPPER_A&&e<=F.UPPER_F||e>=F.LOWER_A&&e<=F.LOWER_F}function Ks(e){return e>=F.UPPER_A&&e<=F.UPPER_Z||e>=F.LOWER_A&&e<=F.LOWER_Z||Ct(e)}function Xs(e){return e===F.EQUALS||Ks(e)}var w;(function(e){e[e.EntityStart=0]="EntityStart",e[e.NumericStart=1]="NumericStart",e[e.NumericDecimal=2]="NumericDecimal",e[e.NumericHex=3]="NumericHex",e[e.NamedEntity=4]="NamedEntity"})(w||(w={}));var ie;(function(e){e[e.Legacy=0]="Legacy",e[e.Strict=1]="Strict",e[e.Attribute=2]="Attribute"})(ie||(ie={}));var Xe=class{constructor(t,a,i){this.decodeTree=t,this.emitCodePoint=a,this.errors=i,this.state=w.EntityStart,this.consumed=1,this.result=0,this.treeIndex=0,this.excess=1,this.decodeMode=ie.Strict}startEntity(t){this.decodeMode=t,this.state=w.EntityStart,this.result=0,this.treeIndex=0,this.excess=1,this.consumed=1}write(t,a){switch(this.state){case w.EntityStart:return t.charCodeAt(a)===F.NUM?(this.state=w.NumericStart,this.consumed+=1,this.stateNumericStart(t,a+1)):(this.state=w.NamedEntity,this.stateNamedEntity(t,a));case w.NumericStart:return this.stateNumericStart(t,a);case w.NumericDecimal:return this.stateNumericDecimal(t,a);case w.NumericHex:return this.stateNumericHex(t,a);case w.NamedEntity:return this.stateNamedEntity(t,a)}}stateNumericStart(t,a){return a>=t.length?-1:(t.charCodeAt(a)|Ws)===F.LOWER_X?(this.state=w.NumericHex,this.consumed+=1,this.stateNumericHex(t,a+1)):(this.state=w.NumericDecimal,this.stateNumericDecimal(t,a))}addToNumericResult(t,a,i,u){if(a!==i){let o=i-a;this.result=this.result*Math.pow(u,o)+Number.parseInt(t.substr(a,o),u),this.consumed+=o}}stateNumericHex(t,a){let i=a;for(;a<t.length;){let u=t.charCodeAt(a);if(Ct(u)||Qs(u))a+=1;else return this.addToNumericResult(t,i,a,16),this.emitNumericEntity(u,3)}return this.addToNumericResult(t,i,a,16),-1}stateNumericDecimal(t,a){let i=a;for(;a<t.length;){let u=t.charCodeAt(a);if(Ct(u))a+=1;else return this.addToNumericResult(t,i,a,10),this.emitNumericEntity(u,2)}return this.addToNumericResult(t,i,a,10),-1}emitNumericEntity(t,a){var i;if(this.consumed<=a)return(i=this.errors)===null||i===void 0||i.absenceOfDigitsInNumericCharacterReference(this.consumed),0;if(t===F.SEMI)this.consumed+=1;else if(this.decodeMode===ie.Strict)return 0;return this.emitCodePoint(gt(this.result),this.consumed),this.errors&&(t!==F.SEMI&&this.errors.missingSemicolonAfterCharacterReference(),this.errors.validateNumericCharacterReference(this.result)),this.consumed}stateNamedEntity(t,a){let{decodeTree:i}=this,u=i[this.treeIndex],o=(u&fe.VALUE_LENGTH)>>14;for(;a<t.length;a++,this.excess++){let h=t.charCodeAt(a);if(this.treeIndex=js(i,u,this.treeIndex+Math.max(1,o),h),this.treeIndex<0)return this.result===0||this.decodeMode===ie.Attribute&&(o===0||Xs(h))?0:this.emitNotTerminatedNamedEntity();if(u=i[this.treeIndex],o=(u&fe.VALUE_LENGTH)>>14,o!==0){if(h===F.SEMI)return this.emitNamedEntityData(this.treeIndex,o,this.consumed+this.excess);this.decodeMode!==ie.Strict&&(this.result=this.treeIndex,this.consumed+=this.excess,this.excess=0)}}return-1}emitNotTerminatedNamedEntity(){var t;let{result:a,decodeTree:i}=this,u=(i[a]&fe.VALUE_LENGTH)>>14;return this.emitNamedEntityData(a,u,this.consumed),(t=this.errors)===null||t===void 0||t.missingSemicolonAfterCharacterReference(),this.consumed}emitNamedEntityData(t,a,i){let{decodeTree:u}=this;return this.emitCodePoint(a===1?u[t]&~fe.VALUE_LENGTH:u[t+1],i),a===3&&this.emitCodePoint(u[t+2],i),i}end(){var t;switch(this.state){case w.NamedEntity:return this.result!==0&&(this.decodeMode!==ie.Attribute||this.result===this.treeIndex)?this.emitNotTerminatedNamedEntity():0;case w.NumericDecimal:return this.emitNumericEntity(0,2);case w.NumericHex:return this.emitNumericEntity(0,3);case w.NumericStart:return(t=this.errors)===null||t===void 0||t.absenceOfDigitsInNumericCharacterReference(this.consumed),0;case w.EntityStart:return 0}}};function js(e,t,a,i){let u=(t&fe.BRANCH_LENGTH)>>7,o=t&fe.JUMP_TABLE;if(u===0)return o!==0&&i===o?a:-1;if(o){let E=i-o;return E<0||E>=u?-1:e[a+E]-1}let h=a,d=h+u-1;for(;h<=d;){let E=h+d>>>1,T=e[E];if(T<i)h=E+1;else if(T>i)d=E-1;else return e[E+u]}return-1}var m;(function(e){e.HTML="http://www.w3.org/1999/xhtml",e.MATHML="http://www.w3.org/1998/Math/MathML",e.SVG="http://www.w3.org/2000/svg",e.XLINK="http://www.w3.org/1999/xlink",e.XML="http://www.w3.org/XML/1998/namespace",e.XMLNS="http://www.w3.org/2000/xmlns/"})(m||(m={}));var ne;(function(e){e.TYPE="type",e.ACTION="action",e.ENCODING="encoding",e.PROMPT="prompt",e.NAME="name",e.COLOR="color",e.FACE="face",e.SIZE="size"})(ne||(ne={}));var W;(function(e){e.NO_QUIRKS="no-quirks",e.QUIRKS="quirks",e.LIMITED_QUIRKS="limited-quirks"})(W||(W={}));var f;(function(e){e.A="a",e.ADDRESS="address",e.ANNOTATION_XML="annotation-xml",e.APPLET="applet",e.AREA="area",e.ARTICLE="article",e.ASIDE="aside",e.B="b",e.BASE="base",e.BASEFONT="basefont",e.BGSOUND="bgsound",e.BIG="big",e.BLOCKQUOTE="blockquote",e.BODY="body",e.BR="br",e.BUTTON="button",e.CAPTION="caption",e.CENTER="center",e.CODE="code",e.COL="col",e.COLGROUP="colgroup",e.DD="dd",e.DESC="desc",e.DETAILS="details",e.DIALOG="dialog",e.DIR="dir",e.DIV="div",e.DL="dl",e.DT="dt",e.EM="em",e.EMBED="embed",e.FIELDSET="fieldset",e.FIGCAPTION="figcaption",e.FIGURE="figure",e.FONT="font",e.FOOTER="footer",e.FOREIGN_OBJECT="foreignObject",e.FORM="form",e.FRAME="frame",e.FRAMESET="frameset",e.H1="h1",e.H2="h2",e.H3="h3",e.H4="h4",e.H5="h5",e.H6="h6",e.HEAD="head",e.HEADER="header",e.HGROUP="hgroup",e.HR="hr",e.HTML="html",e.I="i",e.IMG="img",e.IMAGE="image",e.INPUT="input",e.IFRAME="iframe",e.KEYGEN="keygen",e.LABEL="label",e.LI="li",e.LINK="link",e.LISTING="listing",e.MAIN="main",e.MALIGNMARK="malignmark",e.MARQUEE="marquee",e.MATH="math",e.MENU="menu",e.META="meta",e.MGLYPH="mglyph",e.MI="mi",e.MO="mo",e.MN="mn",e.MS="ms",e.MTEXT="mtext",e.NAV="nav",e.NOBR="nobr",e.NOFRAMES="noframes",e.NOEMBED="noembed",e.NOSCRIPT="noscript",e.OBJECT="object",e.OL="ol",e.OPTGROUP="optgroup",e.OPTION="option",e.P="p",e.PARAM="param",e.PLAINTEXT="plaintext",e.PRE="pre",e.RB="rb",e.RP="rp",e.RT="rt",e.RTC="rtc",e.RUBY="ruby",e.S="s",e.SCRIPT="script",e.SEARCH="search",e.SECTION="section",e.SELECT="select",e.SOURCE="source",e.SMALL="small",e.SPAN="span",e.STRIKE="strike",e.STRONG="strong",e.STYLE="style",e.SUB="sub",e.SUMMARY="summary",e.SUP="sup",e.TABLE="table",e.TBODY="tbody",e.TEMPLATE="template",e.TEXTAREA="textarea",e.TFOOT="tfoot",e.TD="td",e.TH="th",e.THEAD="thead",e.TITLE="title",e.TR="tr",e.TRACK="track",e.TT="tt",e.U="u",e.UL="ul",e.SVG="svg",e.VAR="var",e.WBR="wbr",e.XMP="xmp"})(f||(f={}));var s;(function(e){e[e.UNKNOWN=0]="UNKNOWN",e[e.A=1]="A",e[e.ADDRESS=2]="ADDRESS",e[e.ANNOTATION_XML=3]="ANNOTATION_XML",e[e.APPLET=4]="APPLET",e[e.AREA=5]="AREA",e[e.ARTICLE=6]="ARTICLE",e[e.ASIDE=7]="ASIDE",e[e.B=8]="B",e[e.BASE=9]="BASE",e[e.BASEFONT=10]="BASEFONT",e[e.BGSOUND=11]="BGSOUND",e[e.BIG=12]="BIG",e[e.BLOCKQUOTE=13]="BLOCKQUOTE",e[e.BODY=14]="BODY",e[e.BR=15]="BR",e[e.BUTTON=16]="BUTTON",e[e.CAPTION=17]="CAPTION",e[e.CENTER=18]="CENTER",e[e.CODE=19]="CODE",e[e.COL=20]="COL",e[e.COLGROUP=21]="COLGROUP",e[e.DD=22]="DD",e[e.DESC=23]="DESC",e[e.DETAILS=24]="DETAILS",e[e.DIALOG=25]="DIALOG",e[e.DIR=26]="DIR",e[e.DIV=27]="DIV",e[e.DL=28]="DL",e[e.DT=29]="DT",e[e.EM=30]="EM",e[e.EMBED=31]="EMBED",e[e.FIELDSET=32]="FIELDSET",e[e.FIGCAPTION=33]="FIGCAPTION",e[e.FIGURE=34]="FIGURE",e[e.FONT=35]="FONT",e[e.FOOTER=36]="FOOTER",e[e.FOREIGN_OBJECT=37]="FOREIGN_OBJECT",e[e.FORM=38]="FORM",e[e.FRAME=39]="FRAME",e[e.FRAMESET=40]="FRAMESET",e[e.H1=41]="H1",e[e.H2=42]="H2",e[e.H3=43]="H3",e[e.H4=44]="H4",e[e.H5=45]="H5",e[e.H6=46]="H6",e[e.HEAD=47]="HEAD",e[e.HEADER=48]="HEADER",e[e.HGROUP=49]="HGROUP",e[e.HR=50]="HR",e[e.HTML=51]="HTML",e[e.I=52]="I",e[e.IMG=53]="IMG",e[e.IMAGE=54]="IMAGE",e[e.INPUT=55]="INPUT",e[e.IFRAME=56]="IFRAME",e[e.KEYGEN=57]="KEYGEN",e[e.LABEL=58]="LABEL",e[e.LI=59]="LI",e[e.LINK=60]="LINK",e[e.LISTING=61]="LISTING",e[e.MAIN=62]="MAIN",e[e.MALIGNMARK=63]="MALIGNMARK",e[e.MARQUEE=64]="MARQUEE",e[e.MATH=65]="MATH",e[e.MENU=66]="MENU",e[e.META=67]="META",e[e.MGLYPH=68]="MGLYPH",e[e.MI=69]="MI",e[e.MO=70]="MO",e[e.MN=71]="MN",e[e.MS=72]="MS",e[e.MTEXT=73]="MTEXT",e[e.NAV=74]="NAV",e[e.NOBR=75]="NOBR",e[e.NOFRAMES=76]="NOFRAMES",e[e.NOEMBED=77]="NOEMBED",e[e.NOSCRIPT=78]="NOSCRIPT",e[e.OBJECT=79]="OBJECT",e[e.OL=80]="OL",e[e.OPTGROUP=81]="OPTGROUP",e[e.OPTION=82]="OPTION",e[e.P=83]="P",e[e.PARAM=84]="PARAM",e[e.PLAINTEXT=85]="PLAINTEXT",e[e.PRE=86]="PRE",e[e.RB=87]="RB",e[e.RP=88]="RP",e[e.RT=89]="RT",e[e.RTC=90]="RTC",e[e.RUBY=91]="RUBY",e[e.S=92]="S",e[e.SCRIPT=93]="SCRIPT",e[e.SEARCH=94]="SEARCH",e[e.SECTION=95]="SECTION",e[e.SELECT=96]="SELECT",e[e.SOURCE=97]="SOURCE",e[e.SMALL=98]="SMALL",e[e.SPAN=99]="SPAN",e[e.STRIKE=100]="STRIKE",e[e.STRONG=101]="STRONG",e[e.STYLE=102]="STYLE",e[e.SUB=103]="SUB",e[e.SUMMARY=104]="SUMMARY",e[e.SUP=105]="SUP",e[e.TABLE=106]="TABLE",e[e.TBODY=107]="TBODY",e[e.TEMPLATE=108]="TEMPLATE",e[e.TEXTAREA=109]="TEXTAREA",e[e.TFOOT=110]="TFOOT",e[e.TD=111]="TD",e[e.TH=112]="TH",e[e.THEAD=113]="THEAD",e[e.TITLE=114]="TITLE",e[e.TR=115]="TR",e[e.TRACK=116]="TRACK",e[e.TT=117]="TT",e[e.U=118]="U",e[e.UL=119]="UL",e[e.SVG=120]="SVG",e[e.VAR=121]="VAR",e[e.WBR=122]="WBR",e[e.XMP=123]="XMP"})(s||(s={}));var zs=new Map([[f.A,s.A],[f.ADDRESS,s.ADDRESS],[f.ANNOTATION_XML,s.ANNOTATION_XML],[f.APPLET,s.APPLET],[f.AREA,s.AREA],[f.ARTICLE,s.ARTICLE],[f.ASIDE,s.ASIDE],[f.B,s.B],[f.BASE,s.BASE],[f.BASEFONT,s.BASEFONT],[f.BGSOUND,s.BGSOUND],[f.BIG,s.BIG],[f.BLOCKQUOTE,s.BLOCKQUOTE],[f.BODY,s.BODY],[f.BR,s.BR],[f.BUTTON,s.BUTTON],[f.CAPTION,s.CAPTION],[f.CENTER,s.CENTER],[f.CODE,s.CODE],[f.COL,s.COL],[f.COLGROUP,s.COLGROUP],[f.DD,s.DD],[f.DESC,s.DESC],[f.DETAILS,s.DETAILS],[f.DIALOG,s.DIALOG],[f.DIR,s.DIR],[f.DIV,s.DIV],[f.DL,s.DL],[f.DT,s.DT],[f.EM,s.EM],[f.EMBED,s.EMBED],[f.FIELDSET,s.FIELDSET],[f.FIGCAPTION,s.FIGCAPTION],[f.FIGURE,s.FIGURE],[f.FONT,s.FONT],[f.FOOTER,s.FOOTER],[f.FOREIGN_OBJECT,s.FOREIGN_OBJECT],[f.FORM,s.FORM],[f.FRAME,s.FRAME],[f.FRAMESET,s.FRAMESET],[f.H1,s.H1],[f.H2,s.H2],[f.H3,s.H3],[f.H4,s.H4],[f.H5,s.H5],[f.H6,s.H6],[f.HEAD,s.HEAD],[f.HEADER,s.HEADER],[f.HGROUP,s.HGROUP],[f.HR,s.HR],[f.HTML,s.HTML],[f.I,s.I],[f.IMG,s.IMG],[f.IMAGE,s.IMAGE],[f.INPUT,s.INPUT],[f.IFRAME,s.IFRAME],[f.KEYGEN,s.KEYGEN],[f.LABEL,s.LABEL],[f.LI,s.LI],[f.LINK,s.LINK],[f.LISTING,s.LISTING],[f.MAIN,s.MAIN],[f.MALIGNMARK,s.MALIGNMARK],[f.MARQUEE,s.MARQUEE],[f.MATH,s.MATH],[f.MENU,s.MENU],[f.META,s.META],[f.MGLYPH,s.MGLYPH],[f.MI,s.MI],[f.MO,s.MO],[f.MN,s.MN],[f.MS,s.MS],[f.MTEXT,s.MTEXT],[f.NAV,s.NAV],[f.NOBR,s.NOBR],[f.NOFRAMES,s.NOFRAMES],[f.NOEMBED,s.NOEMBED],[f.NOSCRIPT,s.NOSCRIPT],[f.OBJECT,s.OBJECT],[f.OL,s.OL],[f.OPTGROUP,s.OPTGROUP],[f.OPTION,s.OPTION],[f.P,s.P],[f.PARAM,s.PARAM],[f.PLAINTEXT,s.PLAINTEXT],[f.PRE,s.PRE],[f.RB,s.RB],[f.RP,s.RP],[f.RT,s.RT],[f.RTC,s.RTC],[f.RUBY,s.RUBY],[f.S,s.S],[f.SCRIPT,s.SCRIPT],[f.SEARCH,s.SEARCH],[f.SECTION,s.SECTION],[f.SELECT,s.SELECT],[f.SOURCE,s.SOURCE],[f.SMALL,s.SMALL],[f.SPAN,s.SPAN],[f.STRIKE,s.STRIKE],[f.STRONG,s.STRONG],[f.STYLE,s.STYLE],[f.SUB,s.SUB],[f.SUMMARY,s.SUMMARY],[f.SUP,s.SUP],[f.TABLE,s.TABLE],[f.TBODY,s.TBODY],[f.TEMPLATE,s.TEMPLATE],[f.TEXTAREA,s.TEXTAREA],[f.TFOOT,s.TFOOT],[f.TD,s.TD],[f.TH,s.TH],[f.THEAD,s.THEAD],[f.TITLE,s.TITLE],[f.TR,s.TR],[f.TRACK,s.TRACK],[f.TT,s.TT],[f.U,s.U],[f.UL,s.UL],[f.SVG,s.SVG],[f.VAR,s.VAR],[f.WBR,s.WBR],[f.XMP,s.XMP]]);function me(e){var t;return(t=zs.get(e))!==null&&t!==void 0?t:s.UNKNOWN}var b=s,zt={[m.HTML]:new Set([b.ADDRESS,b.APPLET,b.AREA,b.ARTICLE,b.ASIDE,b.BASE,b.BASEFONT,b.BGSOUND,b.BLOCKQUOTE,b.BODY,b.BR,b.BUTTON,b.CAPTION,b.CENTER,b.COL,b.COLGROUP,b.DD,b.DETAILS,b.DIR,b.DIV,b.DL,b.DT,b.EMBED,b.FIELDSET,b.FIGCAPTION,b.FIGURE,b.FOOTER,b.FORM,b.FRAME,b.FRAMESET,b.H1,b.H2,b.H3,b.H4,b.H5,b.H6,b.HEAD,b.HEADER,b.HGROUP,b.HR,b.HTML,b.IFRAME,b.IMG,b.INPUT,b.LI,b.LINK,b.LISTING,b.MAIN,b.MARQUEE,b.MENU,b.META,b.NAV,b.NOEMBED,b.NOFRAMES,b.NOSCRIPT,b.OBJECT,b.OL,b.P,b.PARAM,b.PLAINTEXT,b.PRE,b.SCRIPT,b.SECTION,b.SELECT,b.SOURCE,b.STYLE,b.SUMMARY,b.TABLE,b.TBODY,b.TD,b.TEMPLATE,b.TEXTAREA,b.TFOOT,b.TH,b.THEAD,b.TITLE,b.TR,b.TRACK,b.UL,b.WBR,b.XMP]),[m.MATHML]:new Set([b.MI,b.MO,b.MN,b.MS,b.MTEXT,b.ANNOTATION_XML]),[m.SVG]:new Set([b.TITLE,b.FOREIGN_OBJECT,b.DESC]),[m.XLINK]:new Set,[m.XML]:new Set,[m.XMLNS]:new Set},Se=new Set([b.H1,b.H2,b.H3,b.H4,b.H5,b.H6]),dn=new Set([f.STYLE,f.SCRIPT,f.XMP,f.IFRAME,f.NOEMBED,f.NOFRAMES,f.PLAINTEXT]);var c;(function(e){e[e.DATA=0]="DATA",e[e.RCDATA=1]="RCDATA",e[e.RAWTEXT=2]="RAWTEXT",e[e.SCRIPT_DATA=3]="SCRIPT_DATA",e[e.PLAINTEXT=4]="PLAINTEXT",e[e.TAG_OPEN=5]="TAG_OPEN",e[e.END_TAG_OPEN=6]="END_TAG_OPEN",e[e.TAG_NAME=7]="TAG_NAME",e[e.RCDATA_LESS_THAN_SIGN=8]="RCDATA_LESS_THAN_SIGN",e[e.RCDATA_END_TAG_OPEN=9]="RCDATA_END_TAG_OPEN",e[e.RCDATA_END_TAG_NAME=10]="RCDATA_END_TAG_NAME",e[e.RAWTEXT_LESS_THAN_SIGN=11]="RAWTEXT_LESS_THAN_SIGN",e[e.RAWTEXT_END_TAG_OPEN=12]="RAWTEXT_END_TAG_OPEN",e[e.RAWTEXT_END_TAG_NAME=13]="RAWTEXT_END_TAG_NAME",e[e.SCRIPT_DATA_LESS_THAN_SIGN=14]="SCRIPT_DATA_LESS_THAN_SIGN",e[e.SCRIPT_DATA_END_TAG_OPEN=15]="SCRIPT_DATA_END_TAG_OPEN",e[e.SCRIPT_DATA_END_TAG_NAME=16]="SCRIPT_DATA_END_TAG_NAME",e[e.SCRIPT_DATA_ESCAPE_START=17]="SCRIPT_DATA_ESCAPE_START",e[e.SCRIPT_DATA_ESCAPE_START_DASH=18]="SCRIPT_DATA_ESCAPE_START_DASH",e[e.SCRIPT_DATA_ESCAPED=19]="SCRIPT_DATA_ESCAPED",e[e.SCRIPT_DATA_ESCAPED_DASH=20]="SCRIPT_DATA_ESCAPED_DASH",e[e.SCRIPT_DATA_ESCAPED_DASH_DASH=21]="SCRIPT_DATA_ESCAPED_DASH_DASH",e[e.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN=22]="SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN",e[e.SCRIPT_DATA_ESCAPED_END_TAG_OPEN=23]="SCRIPT_DATA_ESCAPED_END_TAG_OPEN",e[e.SCRIPT_DATA_ESCAPED_END_TAG_NAME=24]="SCRIPT_DATA_ESCAPED_END_TAG_NAME",e[e.SCRIPT_DATA_DOUBLE_ESCAPE_START=25]="SCRIPT_DATA_DOUBLE_ESCAPE_START",e[e.SCRIPT_DATA_DOUBLE_ESCAPED=26]="SCRIPT_DATA_DOUBLE_ESCAPED",e[e.SCRIPT_DATA_DOUBLE_ESCAPED_DASH=27]="SCRIPT_DATA_DOUBLE_ESCAPED_DASH",e[e.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH=28]="SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH",e[e.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN=29]="SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN",e[e.SCRIPT_DATA_DOUBLE_ESCAPE_END=30]="SCRIPT_DATA_DOUBLE_ESCAPE_END",e[e.BEFORE_ATTRIBUTE_NAME=31]="BEFORE_ATTRIBUTE_NAME",e[e.ATTRIBUTE_NAME=32]="ATTRIBUTE_NAME",e[e.AFTER_ATTRIBUTE_NAME=33]="AFTER_ATTRIBUTE_NAME",e[e.BEFORE_ATTRIBUTE_VALUE=34]="BEFORE_ATTRIBUTE_VALUE",e[e.ATTRIBUTE_VALUE_DOUBLE_QUOTED=35]="ATTRIBUTE_VALUE_DOUBLE_QUOTED",e[e.ATTRIBUTE_VALUE_SINGLE_QUOTED=36]="ATTRIBUTE_VALUE_SINGLE_QUOTED",e[e.ATTRIBUTE_VALUE_UNQUOTED=37]="ATTRIBUTE_VALUE_UNQUOTED",e[e.AFTER_ATTRIBUTE_VALUE_QUOTED=38]="AFTER_ATTRIBUTE_VALUE_QUOTED",e[e.SELF_CLOSING_START_TAG=39]="SELF_CLOSING_START_TAG",e[e.BOGUS_COMMENT=40]="BOGUS_COMMENT",e[e.MARKUP_DECLARATION_OPEN=41]="MARKUP_DECLARATION_OPEN",e[e.COMMENT_START=42]="COMMENT_START",e[e.COMMENT_START_DASH=43]="COMMENT_START_DASH",e[e.COMMENT=44]="COMMENT",e[e.COMMENT_LESS_THAN_SIGN=45]="COMMENT_LESS_THAN_SIGN",e[e.COMMENT_LESS_THAN_SIGN_BANG=46]="COMMENT_LESS_THAN_SIGN_BANG",e[e.COMMENT_LESS_THAN_SIGN_BANG_DASH=47]="COMMENT_LESS_THAN_SIGN_BANG_DASH",e[e.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH=48]="COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH",e[e.COMMENT_END_DASH=49]="COMMENT_END_DASH",e[e.COMMENT_END=50]="COMMENT_END",e[e.COMMENT_END_BANG=51]="COMMENT_END_BANG",e[e.DOCTYPE=52]="DOCTYPE",e[e.BEFORE_DOCTYPE_NAME=53]="BEFORE_DOCTYPE_NAME",e[e.DOCTYPE_NAME=54]="DOCTYPE_NAME",e[e.AFTER_DOCTYPE_NAME=55]="AFTER_DOCTYPE_NAME",e[e.AFTER_DOCTYPE_PUBLIC_KEYWORD=56]="AFTER_DOCTYPE_PUBLIC_KEYWORD",e[e.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER=57]="BEFORE_DOCTYPE_PUBLIC_IDENTIFIER",e[e.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED=58]="DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED",e[e.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED=59]="DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED",e[e.AFTER_DOCTYPE_PUBLIC_IDENTIFIER=60]="AFTER_DOCTYPE_PUBLIC_IDENTIFIER",e[e.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS=61]="BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS",e[e.AFTER_DOCTYPE_SYSTEM_KEYWORD=62]="AFTER_DOCTYPE_SYSTEM_KEYWORD",e[e.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER=63]="BEFORE_DOCTYPE_SYSTEM_IDENTIFIER",e[e.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED=64]="DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED",e[e.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED=65]="DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED",e[e.AFTER_DOCTYPE_SYSTEM_IDENTIFIER=66]="AFTER_DOCTYPE_SYSTEM_IDENTIFIER",e[e.BOGUS_DOCTYPE=67]="BOGUS_DOCTYPE",e[e.CDATA_SECTION=68]="CDATA_SECTION",e[e.CDATA_SECTION_BRACKET=69]="CDATA_SECTION_BRACKET",e[e.CDATA_SECTION_END=70]="CDATA_SECTION_END",e[e.CHARACTER_REFERENCE=71]="CHARACTER_REFERENCE",e[e.AMBIGUOUS_AMPERSAND=72]="AMBIGUOUS_AMPERSAND"})(c||(c={}));var V={DATA:c.DATA,RCDATA:c.RCDATA,RAWTEXT:c.RAWTEXT,SCRIPT_DATA:c.SCRIPT_DATA,PLAINTEXT:c.PLAINTEXT,CDATA_SECTION:c.CDATA_SECTION};function Zs(e){return e>=n.DIGIT_0&&e<=n.DIGIT_9}function Le(e){return e>=n.LATIN_CAPITAL_A&&e<=n.LATIN_CAPITAL_Z}function $s(e){return e>=n.LATIN_SMALL_A&&e<=n.LATIN_SMALL_Z}function de(e){return $s(e)||Le(e)}function Jt(e){return de(e)||Zs(e)}function je(e){return e+32}function $t(e){return e===n.SPACE||e===n.LINE_FEED||e===n.TABULATION||e===n.FORM_FEED}function Zt(e){return $t(e)||e===n.SOLIDUS||e===n.GREATER_THAN_SIGN}function ei(e){return e===n.NULL?p.nullCharacterReference:e>1114111?p.characterReferenceOutsideUnicodeRange:Ye(e)?p.surrogateCharacterReference:Ge(e)?p.noncharacterCharacterReference:qe(e)||e===n.CARRIAGE_RETURN?p.controlCharacterReference:null}var Oe=class{constructor(t,a){this.options=t,this.handler=a,this.paused=!1,this.inLoop=!1,this.inForeignNode=!1,this.lastStartTagName="",this.active=!1,this.state=c.DATA,this.returnState=c.DATA,this.entityStartPos=0,this.consumedAfterSnapshot=-1,this.currentCharacterToken=null,this.currentToken=null,this.currentAttr={name:"",value:""},this.preprocessor=new We(a),this.currentLocation=this.getCurrentLocation(-1),this.entityDecoder=new Xe(Ke,(i,u)=>{this.preprocessor.pos=this.entityStartPos+u-1,this._flushCodePointConsumedAsCharacterReference(i)},a.onParseError?{missingSemicolonAfterCharacterReference:()=>{this._err(p.missingSemicolonAfterCharacterReference,1)},absenceOfDigitsInNumericCharacterReference:i=>{this._err(p.absenceOfDigitsInNumericCharacterReference,this.entityStartPos-this.preprocessor.pos+i)},validateNumericCharacterReference:i=>{let u=ei(i);u&&this._err(u,1)}}:void 0)}_err(t,a=0){var i,u;(u=(i=this.handler).onParseError)===null||u===void 0||u.call(i,this.preprocessor.getError(t,a))}getCurrentLocation(t){return this.options.sourceCodeLocationInfo?{startLine:this.preprocessor.line,startCol:this.preprocessor.col-t,startOffset:this.preprocessor.offset-t,endLine:-1,endCol:-1,endOffset:-1}:null}_runParsingLoop(){if(!this.inLoop){for(this.inLoop=!0;this.active&&!this.paused;){this.consumedAfterSnapshot=0;let t=this._consume();this._ensureHibernation()||this._callState(t)}this.inLoop=!1}}pause(){this.paused=!0}resume(t){if(!this.paused)throw new Error("Parser was already resumed");this.paused=!1,!this.inLoop&&(this._runParsingLoop(),this.paused||t?.())}write(t,a,i){this.active=!0,this.preprocessor.write(t,a),this._runParsingLoop(),this.paused||i?.()}insertHtmlAtCurrentPos(t){this.active=!0,this.preprocessor.insertHtmlAtCurrentPos(t),this._runParsingLoop()}_ensureHibernation(){return this.preprocessor.endOfChunkHit?(this.preprocessor.retreat(this.consumedAfterSnapshot),this.consumedAfterSnapshot=0,this.active=!1,!0):!1}_consume(){return this.consumedAfterSnapshot++,this.preprocessor.advance()}_advanceBy(t){this.consumedAfterSnapshot+=t;for(let a=0;a<t;a++)this.preprocessor.advance()}_consumeSequenceIfMatch(t,a){return this.preprocessor.startsWith(t,a)?(this._advanceBy(t.length-1),!0):!1}_createStartTagToken(){this.currentToken={type:N.START_TAG,tagName:"",tagID:s.UNKNOWN,selfClosing:!1,ackSelfClosing:!1,attrs:[],location:this.getCurrentLocation(1)}}_createEndTagToken(){this.currentToken={type:N.END_TAG,tagName:"",tagID:s.UNKNOWN,selfClosing:!1,ackSelfClosing:!1,attrs:[],location:this.getCurrentLocation(2)}}_createCommentToken(t){this.currentToken={type:N.COMMENT,data:"",location:this.getCurrentLocation(t)}}_createDoctypeToken(t){this.currentToken={type:N.DOCTYPE,name:t,forceQuirks:!1,publicId:null,systemId:null,location:this.currentLocation}}_createCharacterToken(t,a){this.currentCharacterToken={type:t,chars:a,location:this.currentLocation}}_createAttr(t){this.currentAttr={name:t,value:""},this.currentLocation=this.getCurrentLocation(0)}_leaveAttrName(){var t,a;let i=this.currentToken;if(Qe(i,this.currentAttr.name)===null){if(i.attrs.push(this.currentAttr),i.location&&this.currentLocation){let u=(t=(a=i.location).attrs)!==null&&t!==void 0?t:a.attrs=Object.create(null);u[this.currentAttr.name]=this.currentLocation,this._leaveAttrValue()}}else this._err(p.duplicateAttribute)}_leaveAttrValue(){this.currentLocation&&(this.currentLocation.endLine=this.preprocessor.line,this.currentLocation.endCol=this.preprocessor.col,this.currentLocation.endOffset=this.preprocessor.offset)}prepareToken(t){this._emitCurrentCharacterToken(t.location),this.currentToken=null,t.location&&(t.location.endLine=this.preprocessor.line,t.location.endCol=this.preprocessor.col+1,t.location.endOffset=this.preprocessor.offset+1),this.currentLocation=this.getCurrentLocation(-1)}emitCurrentTagToken(){let t=this.currentToken;this.prepareToken(t),t.tagID=me(t.tagName),t.type===N.START_TAG?(this.lastStartTagName=t.tagName,this.handler.onStartTag(t)):(t.attrs.length>0&&this._err(p.endTagWithAttributes),t.selfClosing&&this._err(p.endTagWithTrailingSolidus),this.handler.onEndTag(t)),this.preprocessor.dropParsedChunk()}emitCurrentComment(t){this.prepareToken(t),this.handler.onComment(t),this.preprocessor.dropParsedChunk()}emitCurrentDoctype(t){this.prepareToken(t),this.handler.onDoctype(t),this.preprocessor.dropParsedChunk()}_emitCurrentCharacterToken(t){if(this.currentCharacterToken){switch(t&&this.currentCharacterToken.location&&(this.currentCharacterToken.location.endLine=t.startLine,this.currentCharacterToken.location.endCol=t.startCol,this.currentCharacterToken.location.endOffset=t.startOffset),this.currentCharacterToken.type){case N.CHARACTER:{this.handler.onCharacter(this.currentCharacterToken);break}case N.NULL_CHARACTER:{this.handler.onNullCharacter(this.currentCharacterToken);break}case N.WHITESPACE_CHARACTER:{this.handler.onWhitespaceCharacter(this.currentCharacterToken);break}}this.currentCharacterToken=null}}_emitEOFToken(){let t=this.getCurrentLocation(0);t&&(t.endLine=t.startLine,t.endCol=t.startCol,t.endOffset=t.startOffset),this._emitCurrentCharacterToken(t),this.handler.onEof({type:N.EOF,location:t}),this.active=!1}_appendCharToCurrentCharacterToken(t,a){if(this.currentCharacterToken)if(this.currentCharacterToken.type===t){this.currentCharacterToken.chars+=a;return}else this.currentLocation=this.getCurrentLocation(0),this._emitCurrentCharacterToken(this.currentLocation),this.preprocessor.dropParsedChunk();this._createCharacterToken(t,a)}_emitCodePoint(t){let a=$t(t)?N.WHITESPACE_CHARACTER:t===n.NULL?N.NULL_CHARACTER:N.CHARACTER;this._appendCharToCurrentCharacterToken(a,String.fromCodePoint(t))}_emitChars(t){this._appendCharToCurrentCharacterToken(N.CHARACTER,t)}_startCharacterReference(){this.returnState=this.state,this.state=c.CHARACTER_REFERENCE,this.entityStartPos=this.preprocessor.pos,this.entityDecoder.startEntity(this._isCharacterReferenceInAttribute()?ie.Attribute:ie.Legacy)}_isCharacterReferenceInAttribute(){return this.returnState===c.ATTRIBUTE_VALUE_DOUBLE_QUOTED||this.returnState===c.ATTRIBUTE_VALUE_SINGLE_QUOTED||this.returnState===c.ATTRIBUTE_VALUE_UNQUOTED}_flushCodePointConsumedAsCharacterReference(t){this._isCharacterReferenceInAttribute()?this.currentAttr.value+=String.fromCodePoint(t):this._emitCodePoint(t)}_callState(t){switch(this.state){case c.DATA:{this._stateData(t);break}case c.RCDATA:{this._stateRcdata(t);break}case c.RAWTEXT:{this._stateRawtext(t);break}case c.SCRIPT_DATA:{this._stateScriptData(t);break}case c.PLAINTEXT:{this._statePlaintext(t);break}case c.TAG_OPEN:{this._stateTagOpen(t);break}case c.END_TAG_OPEN:{this._stateEndTagOpen(t);break}case c.TAG_NAME:{this._stateTagName(t);break}case c.RCDATA_LESS_THAN_SIGN:{this._stateRcdataLessThanSign(t);break}case c.RCDATA_END_TAG_OPEN:{this._stateRcdataEndTagOpen(t);break}case c.RCDATA_END_TAG_NAME:{this._stateRcdataEndTagName(t);break}case c.RAWTEXT_LESS_THAN_SIGN:{this._stateRawtextLessThanSign(t);break}case c.RAWTEXT_END_TAG_OPEN:{this._stateRawtextEndTagOpen(t);break}case c.RAWTEXT_END_TAG_NAME:{this._stateRawtextEndTagName(t);break}case c.SCRIPT_DATA_LESS_THAN_SIGN:{this._stateScriptDataLessThanSign(t);break}case c.SCRIPT_DATA_END_TAG_OPEN:{this._stateScriptDataEndTagOpen(t);break}case c.SCRIPT_DATA_END_TAG_NAME:{this._stateScriptDataEndTagName(t);break}case c.SCRIPT_DATA_ESCAPE_START:{this._stateScriptDataEscapeStart(t);break}case c.SCRIPT_DATA_ESCAPE_START_DASH:{this._stateScriptDataEscapeStartDash(t);break}case c.SCRIPT_DATA_ESCAPED:{this._stateScriptDataEscaped(t);break}case c.SCRIPT_DATA_ESCAPED_DASH:{this._stateScriptDataEscapedDash(t);break}case c.SCRIPT_DATA_ESCAPED_DASH_DASH:{this._stateScriptDataEscapedDashDash(t);break}case c.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN:{this._stateScriptDataEscapedLessThanSign(t);break}case c.SCRIPT_DATA_ESCAPED_END_TAG_OPEN:{this._stateScriptDataEscapedEndTagOpen(t);break}case c.SCRIPT_DATA_ESCAPED_END_TAG_NAME:{this._stateScriptDataEscapedEndTagName(t);break}case c.SCRIPT_DATA_DOUBLE_ESCAPE_START:{this._stateScriptDataDoubleEscapeStart(t);break}case c.SCRIPT_DATA_DOUBLE_ESCAPED:{this._stateScriptDataDoubleEscaped(t);break}case c.SCRIPT_DATA_DOUBLE_ESCAPED_DASH:{this._stateScriptDataDoubleEscapedDash(t);break}case c.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH:{this._stateScriptDataDoubleEscapedDashDash(t);break}case c.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN:{this._stateScriptDataDoubleEscapedLessThanSign(t);break}case c.SCRIPT_DATA_DOUBLE_ESCAPE_END:{this._stateScriptDataDoubleEscapeEnd(t);break}case c.BEFORE_ATTRIBUTE_NAME:{this._stateBeforeAttributeName(t);break}case c.ATTRIBUTE_NAME:{this._stateAttributeName(t);break}case c.AFTER_ATTRIBUTE_NAME:{this._stateAfterAttributeName(t);break}case c.BEFORE_ATTRIBUTE_VALUE:{this._stateBeforeAttributeValue(t);break}case c.ATTRIBUTE_VALUE_DOUBLE_QUOTED:{this._stateAttributeValueDoubleQuoted(t);break}case c.ATTRIBUTE_VALUE_SINGLE_QUOTED:{this._stateAttributeValueSingleQuoted(t);break}case c.ATTRIBUTE_VALUE_UNQUOTED:{this._stateAttributeValueUnquoted(t);break}case c.AFTER_ATTRIBUTE_VALUE_QUOTED:{this._stateAfterAttributeValueQuoted(t);break}case c.SELF_CLOSING_START_TAG:{this._stateSelfClosingStartTag(t);break}case c.BOGUS_COMMENT:{this._stateBogusComment(t);break}case c.MARKUP_DECLARATION_OPEN:{this._stateMarkupDeclarationOpen(t);break}case c.COMMENT_START:{this._stateCommentStart(t);break}case c.COMMENT_START_DASH:{this._stateCommentStartDash(t);break}case c.COMMENT:{this._stateComment(t);break}case c.COMMENT_LESS_THAN_SIGN:{this._stateCommentLessThanSign(t);break}case c.COMMENT_LESS_THAN_SIGN_BANG:{this._stateCommentLessThanSignBang(t);break}case c.COMMENT_LESS_THAN_SIGN_BANG_DASH:{this._stateCommentLessThanSignBangDash(t);break}case c.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH:{this._stateCommentLessThanSignBangDashDash(t);break}case c.COMMENT_END_DASH:{this._stateCommentEndDash(t);break}case c.COMMENT_END:{this._stateCommentEnd(t);break}case c.COMMENT_END_BANG:{this._stateCommentEndBang(t);break}case c.DOCTYPE:{this._stateDoctype(t);break}case c.BEFORE_DOCTYPE_NAME:{this._stateBeforeDoctypeName(t);break}case c.DOCTYPE_NAME:{this._stateDoctypeName(t);break}case c.AFTER_DOCTYPE_NAME:{this._stateAfterDoctypeName(t);break}case c.AFTER_DOCTYPE_PUBLIC_KEYWORD:{this._stateAfterDoctypePublicKeyword(t);break}case c.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER:{this._stateBeforeDoctypePublicIdentifier(t);break}case c.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED:{this._stateDoctypePublicIdentifierDoubleQuoted(t);break}case c.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED:{this._stateDoctypePublicIdentifierSingleQuoted(t);break}case c.AFTER_DOCTYPE_PUBLIC_IDENTIFIER:{this._stateAfterDoctypePublicIdentifier(t);break}case c.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS:{this._stateBetweenDoctypePublicAndSystemIdentifiers(t);break}case c.AFTER_DOCTYPE_SYSTEM_KEYWORD:{this._stateAfterDoctypeSystemKeyword(t);break}case c.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER:{this._stateBeforeDoctypeSystemIdentifier(t);break}case c.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED:{this._stateDoctypeSystemIdentifierDoubleQuoted(t);break}case c.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED:{this._stateDoctypeSystemIdentifierSingleQuoted(t);break}case c.AFTER_DOCTYPE_SYSTEM_IDENTIFIER:{this._stateAfterDoctypeSystemIdentifier(t);break}case c.BOGUS_DOCTYPE:{this._stateBogusDoctype(t);break}case c.CDATA_SECTION:{this._stateCdataSection(t);break}case c.CDATA_SECTION_BRACKET:{this._stateCdataSectionBracket(t);break}case c.CDATA_SECTION_END:{this._stateCdataSectionEnd(t);break}case c.CHARACTER_REFERENCE:{this._stateCharacterReference();break}case c.AMBIGUOUS_AMPERSAND:{this._stateAmbiguousAmpersand(t);break}default:throw new Error("Unknown state")}}_stateData(t){switch(t){case n.LESS_THAN_SIGN:{this.state=c.TAG_OPEN;break}case n.AMPERSAND:{this._startCharacterReference();break}case n.NULL:{this._err(p.unexpectedNullCharacter),this._emitCodePoint(t);break}case n.EOF:{this._emitEOFToken();break}default:this._emitCodePoint(t)}}_stateRcdata(t){switch(t){case n.AMPERSAND:{this._startCharacterReference();break}case n.LESS_THAN_SIGN:{this.state=c.RCDATA_LESS_THAN_SIGN;break}case n.NULL:{this._err(p.unexpectedNullCharacter),this._emitChars(R);break}case n.EOF:{this._emitEOFToken();break}default:this._emitCodePoint(t)}}_stateRawtext(t){switch(t){case n.LESS_THAN_SIGN:{this.state=c.RAWTEXT_LESS_THAN_SIGN;break}case n.NULL:{this._err(p.unexpectedNullCharacter),this._emitChars(R);break}case n.EOF:{this._emitEOFToken();break}default:this._emitCodePoint(t)}}_stateScriptData(t){switch(t){case n.LESS_THAN_SIGN:{this.state=c.SCRIPT_DATA_LESS_THAN_SIGN;break}case n.NULL:{this._err(p.unexpectedNullCharacter),this._emitChars(R);break}case n.EOF:{this._emitEOFToken();break}default:this._emitCodePoint(t)}}_statePlaintext(t){switch(t){case n.NULL:{this._err(p.unexpectedNullCharacter),this._emitChars(R);break}case n.EOF:{this._emitEOFToken();break}default:this._emitCodePoint(t)}}_stateTagOpen(t){if(de(t))this._createStartTagToken(),this.state=c.TAG_NAME,this._stateTagName(t);else switch(t){case n.EXCLAMATION_MARK:{this.state=c.MARKUP_DECLARATION_OPEN;break}case n.SOLIDUS:{this.state=c.END_TAG_OPEN;break}case n.QUESTION_MARK:{this._err(p.unexpectedQuestionMarkInsteadOfTagName),this._createCommentToken(1),this.state=c.BOGUS_COMMENT,this._stateBogusComment(t);break}case n.EOF:{this._err(p.eofBeforeTagName),this._emitChars("<"),this._emitEOFToken();break}default:this._err(p.invalidFirstCharacterOfTagName),this._emitChars("<"),this.state=c.DATA,this._stateData(t)}}_stateEndTagOpen(t){if(de(t))this._createEndTagToken(),this.state=c.TAG_NAME,this._stateTagName(t);else switch(t){case n.GREATER_THAN_SIGN:{this._err(p.missingEndTagName),this.state=c.DATA;break}case n.EOF:{this._err(p.eofBeforeTagName),this._emitChars("</"),this._emitEOFToken();break}default:this._err(p.invalidFirstCharacterOfTagName),this._createCommentToken(2),this.state=c.BOGUS_COMMENT,this._stateBogusComment(t)}}_stateTagName(t){let a=this.currentToken;switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:{this.state=c.BEFORE_ATTRIBUTE_NAME;break}case n.SOLIDUS:{this.state=c.SELF_CLOSING_START_TAG;break}case n.GREATER_THAN_SIGN:{this.state=c.DATA,this.emitCurrentTagToken();break}case n.NULL:{this._err(p.unexpectedNullCharacter),a.tagName+=R;break}case n.EOF:{this._err(p.eofInTag),this._emitEOFToken();break}default:a.tagName+=String.fromCodePoint(Le(t)?je(t):t)}}_stateRcdataLessThanSign(t){t===n.SOLIDUS?this.state=c.RCDATA_END_TAG_OPEN:(this._emitChars("<"),this.state=c.RCDATA,this._stateRcdata(t))}_stateRcdataEndTagOpen(t){de(t)?(this.state=c.RCDATA_END_TAG_NAME,this._stateRcdataEndTagName(t)):(this._emitChars("</"),this.state=c.RCDATA,this._stateRcdata(t))}handleSpecialEndTag(t){if(!this.preprocessor.startsWith(this.lastStartTagName,!1))return!this._ensureHibernation();this._createEndTagToken();let a=this.currentToken;switch(a.tagName=this.lastStartTagName,this.preprocessor.peek(this.lastStartTagName.length)){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:return this._advanceBy(this.lastStartTagName.length),this.state=c.BEFORE_ATTRIBUTE_NAME,!1;case n.SOLIDUS:return this._advanceBy(this.lastStartTagName.length),this.state=c.SELF_CLOSING_START_TAG,!1;case n.GREATER_THAN_SIGN:return this._advanceBy(this.lastStartTagName.length),this.emitCurrentTagToken(),this.state=c.DATA,!1;default:return!this._ensureHibernation()}}_stateRcdataEndTagName(t){this.handleSpecialEndTag(t)&&(this._emitChars("</"),this.state=c.RCDATA,this._stateRcdata(t))}_stateRawtextLessThanSign(t){t===n.SOLIDUS?this.state=c.RAWTEXT_END_TAG_OPEN:(this._emitChars("<"),this.state=c.RAWTEXT,this._stateRawtext(t))}_stateRawtextEndTagOpen(t){de(t)?(this.state=c.RAWTEXT_END_TAG_NAME,this._stateRawtextEndTagName(t)):(this._emitChars("</"),this.state=c.RAWTEXT,this._stateRawtext(t))}_stateRawtextEndTagName(t){this.handleSpecialEndTag(t)&&(this._emitChars("</"),this.state=c.RAWTEXT,this._stateRawtext(t))}_stateScriptDataLessThanSign(t){switch(t){case n.SOLIDUS:{this.state=c.SCRIPT_DATA_END_TAG_OPEN;break}case n.EXCLAMATION_MARK:{this.state=c.SCRIPT_DATA_ESCAPE_START,this._emitChars("<!");break}default:this._emitChars("<"),this.state=c.SCRIPT_DATA,this._stateScriptData(t)}}_stateScriptDataEndTagOpen(t){de(t)?(this.state=c.SCRIPT_DATA_END_TAG_NAME,this._stateScriptDataEndTagName(t)):(this._emitChars("</"),this.state=c.SCRIPT_DATA,this._stateScriptData(t))}_stateScriptDataEndTagName(t){this.handleSpecialEndTag(t)&&(this._emitChars("</"),this.state=c.SCRIPT_DATA,this._stateScriptData(t))}_stateScriptDataEscapeStart(t){t===n.HYPHEN_MINUS?(this.state=c.SCRIPT_DATA_ESCAPE_START_DASH,this._emitChars("-")):(this.state=c.SCRIPT_DATA,this._stateScriptData(t))}_stateScriptDataEscapeStartDash(t){t===n.HYPHEN_MINUS?(this.state=c.SCRIPT_DATA_ESCAPED_DASH_DASH,this._emitChars("-")):(this.state=c.SCRIPT_DATA,this._stateScriptData(t))}_stateScriptDataEscaped(t){switch(t){case n.HYPHEN_MINUS:{this.state=c.SCRIPT_DATA_ESCAPED_DASH,this._emitChars("-");break}case n.LESS_THAN_SIGN:{this.state=c.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;break}case n.NULL:{this._err(p.unexpectedNullCharacter),this._emitChars(R);break}case n.EOF:{this._err(p.eofInScriptHtmlCommentLikeText),this._emitEOFToken();break}default:this._emitCodePoint(t)}}_stateScriptDataEscapedDash(t){switch(t){case n.HYPHEN_MINUS:{this.state=c.SCRIPT_DATA_ESCAPED_DASH_DASH,this._emitChars("-");break}case n.LESS_THAN_SIGN:{this.state=c.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;break}case n.NULL:{this._err(p.unexpectedNullCharacter),this.state=c.SCRIPT_DATA_ESCAPED,this._emitChars(R);break}case n.EOF:{this._err(p.eofInScriptHtmlCommentLikeText),this._emitEOFToken();break}default:this.state=c.SCRIPT_DATA_ESCAPED,this._emitCodePoint(t)}}_stateScriptDataEscapedDashDash(t){switch(t){case n.HYPHEN_MINUS:{this._emitChars("-");break}case n.LESS_THAN_SIGN:{this.state=c.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN;break}case n.GREATER_THAN_SIGN:{this.state=c.SCRIPT_DATA,this._emitChars(">");break}case n.NULL:{this._err(p.unexpectedNullCharacter),this.state=c.SCRIPT_DATA_ESCAPED,this._emitChars(R);break}case n.EOF:{this._err(p.eofInScriptHtmlCommentLikeText),this._emitEOFToken();break}default:this.state=c.SCRIPT_DATA_ESCAPED,this._emitCodePoint(t)}}_stateScriptDataEscapedLessThanSign(t){t===n.SOLIDUS?this.state=c.SCRIPT_DATA_ESCAPED_END_TAG_OPEN:de(t)?(this._emitChars("<"),this.state=c.SCRIPT_DATA_DOUBLE_ESCAPE_START,this._stateScriptDataDoubleEscapeStart(t)):(this._emitChars("<"),this.state=c.SCRIPT_DATA_ESCAPED,this._stateScriptDataEscaped(t))}_stateScriptDataEscapedEndTagOpen(t){de(t)?(this.state=c.SCRIPT_DATA_ESCAPED_END_TAG_NAME,this._stateScriptDataEscapedEndTagName(t)):(this._emitChars("</"),this.state=c.SCRIPT_DATA_ESCAPED,this._stateScriptDataEscaped(t))}_stateScriptDataEscapedEndTagName(t){this.handleSpecialEndTag(t)&&(this._emitChars("</"),this.state=c.SCRIPT_DATA_ESCAPED,this._stateScriptDataEscaped(t))}_stateScriptDataDoubleEscapeStart(t){if(this.preprocessor.startsWith(G.SCRIPT,!1)&&Zt(this.preprocessor.peek(G.SCRIPT.length))){this._emitCodePoint(t);for(let a=0;a<G.SCRIPT.length;a++)this._emitCodePoint(this._consume());this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED}else this._ensureHibernation()||(this.state=c.SCRIPT_DATA_ESCAPED,this._stateScriptDataEscaped(t))}_stateScriptDataDoubleEscaped(t){switch(t){case n.HYPHEN_MINUS:{this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED_DASH,this._emitChars("-");break}case n.LESS_THAN_SIGN:{this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN,this._emitChars("<");break}case n.NULL:{this._err(p.unexpectedNullCharacter),this._emitChars(R);break}case n.EOF:{this._err(p.eofInScriptHtmlCommentLikeText),this._emitEOFToken();break}default:this._emitCodePoint(t)}}_stateScriptDataDoubleEscapedDash(t){switch(t){case n.HYPHEN_MINUS:{this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH,this._emitChars("-");break}case n.LESS_THAN_SIGN:{this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN,this._emitChars("<");break}case n.NULL:{this._err(p.unexpectedNullCharacter),this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED,this._emitChars(R);break}case n.EOF:{this._err(p.eofInScriptHtmlCommentLikeText),this._emitEOFToken();break}default:this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED,this._emitCodePoint(t)}}_stateScriptDataDoubleEscapedDashDash(t){switch(t){case n.HYPHEN_MINUS:{this._emitChars("-");break}case n.LESS_THAN_SIGN:{this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN,this._emitChars("<");break}case n.GREATER_THAN_SIGN:{this.state=c.SCRIPT_DATA,this._emitChars(">");break}case n.NULL:{this._err(p.unexpectedNullCharacter),this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED,this._emitChars(R);break}case n.EOF:{this._err(p.eofInScriptHtmlCommentLikeText),this._emitEOFToken();break}default:this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED,this._emitCodePoint(t)}}_stateScriptDataDoubleEscapedLessThanSign(t){t===n.SOLIDUS?(this.state=c.SCRIPT_DATA_DOUBLE_ESCAPE_END,this._emitChars("/")):(this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED,this._stateScriptDataDoubleEscaped(t))}_stateScriptDataDoubleEscapeEnd(t){if(this.preprocessor.startsWith(G.SCRIPT,!1)&&Zt(this.preprocessor.peek(G.SCRIPT.length))){this._emitCodePoint(t);for(let a=0;a<G.SCRIPT.length;a++)this._emitCodePoint(this._consume());this.state=c.SCRIPT_DATA_ESCAPED}else this._ensureHibernation()||(this.state=c.SCRIPT_DATA_DOUBLE_ESCAPED,this._stateScriptDataDoubleEscaped(t))}_stateBeforeAttributeName(t){switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:break;case n.SOLIDUS:case n.GREATER_THAN_SIGN:case n.EOF:{this.state=c.AFTER_ATTRIBUTE_NAME,this._stateAfterAttributeName(t);break}case n.EQUALS_SIGN:{this._err(p.unexpectedEqualsSignBeforeAttributeName),this._createAttr("="),this.state=c.ATTRIBUTE_NAME;break}default:this._createAttr(""),this.state=c.ATTRIBUTE_NAME,this._stateAttributeName(t)}}_stateAttributeName(t){switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:case n.SOLIDUS:case n.GREATER_THAN_SIGN:case n.EOF:{this._leaveAttrName(),this.state=c.AFTER_ATTRIBUTE_NAME,this._stateAfterAttributeName(t);break}case n.EQUALS_SIGN:{this._leaveAttrName(),this.state=c.BEFORE_ATTRIBUTE_VALUE;break}case n.QUOTATION_MARK:case n.APOSTROPHE:case n.LESS_THAN_SIGN:{this._err(p.unexpectedCharacterInAttributeName),this.currentAttr.name+=String.fromCodePoint(t);break}case n.NULL:{this._err(p.unexpectedNullCharacter),this.currentAttr.name+=R;break}default:this.currentAttr.name+=String.fromCodePoint(Le(t)?je(t):t)}}_stateAfterAttributeName(t){switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:break;case n.SOLIDUS:{this.state=c.SELF_CLOSING_START_TAG;break}case n.EQUALS_SIGN:{this.state=c.BEFORE_ATTRIBUTE_VALUE;break}case n.GREATER_THAN_SIGN:{this.state=c.DATA,this.emitCurrentTagToken();break}case n.EOF:{this._err(p.eofInTag),this._emitEOFToken();break}default:this._createAttr(""),this.state=c.ATTRIBUTE_NAME,this._stateAttributeName(t)}}_stateBeforeAttributeValue(t){switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:break;case n.QUOTATION_MARK:{this.state=c.ATTRIBUTE_VALUE_DOUBLE_QUOTED;break}case n.APOSTROPHE:{this.state=c.ATTRIBUTE_VALUE_SINGLE_QUOTED;break}case n.GREATER_THAN_SIGN:{this._err(p.missingAttributeValue),this.state=c.DATA,this.emitCurrentTagToken();break}default:this.state=c.ATTRIBUTE_VALUE_UNQUOTED,this._stateAttributeValueUnquoted(t)}}_stateAttributeValueDoubleQuoted(t){switch(t){case n.QUOTATION_MARK:{this.state=c.AFTER_ATTRIBUTE_VALUE_QUOTED;break}case n.AMPERSAND:{this._startCharacterReference();break}case n.NULL:{this._err(p.unexpectedNullCharacter),this.currentAttr.value+=R;break}case n.EOF:{this._err(p.eofInTag),this._emitEOFToken();break}default:this.currentAttr.value+=String.fromCodePoint(t)}}_stateAttributeValueSingleQuoted(t){switch(t){case n.APOSTROPHE:{this.state=c.AFTER_ATTRIBUTE_VALUE_QUOTED;break}case n.AMPERSAND:{this._startCharacterReference();break}case n.NULL:{this._err(p.unexpectedNullCharacter),this.currentAttr.value+=R;break}case n.EOF:{this._err(p.eofInTag),this._emitEOFToken();break}default:this.currentAttr.value+=String.fromCodePoint(t)}}_stateAttributeValueUnquoted(t){switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:{this._leaveAttrValue(),this.state=c.BEFORE_ATTRIBUTE_NAME;break}case n.AMPERSAND:{this._startCharacterReference();break}case n.GREATER_THAN_SIGN:{this._leaveAttrValue(),this.state=c.DATA,this.emitCurrentTagToken();break}case n.NULL:{this._err(p.unexpectedNullCharacter),this.currentAttr.value+=R;break}case n.QUOTATION_MARK:case n.APOSTROPHE:case n.LESS_THAN_SIGN:case n.EQUALS_SIGN:case n.GRAVE_ACCENT:{this._err(p.unexpectedCharacterInUnquotedAttributeValue),this.currentAttr.value+=String.fromCodePoint(t);break}case n.EOF:{this._err(p.eofInTag),this._emitEOFToken();break}default:this.currentAttr.value+=String.fromCodePoint(t)}}_stateAfterAttributeValueQuoted(t){switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:{this._leaveAttrValue(),this.state=c.BEFORE_ATTRIBUTE_NAME;break}case n.SOLIDUS:{this._leaveAttrValue(),this.state=c.SELF_CLOSING_START_TAG;break}case n.GREATER_THAN_SIGN:{this._leaveAttrValue(),this.state=c.DATA,this.emitCurrentTagToken();break}case n.EOF:{this._err(p.eofInTag),this._emitEOFToken();break}default:this._err(p.missingWhitespaceBetweenAttributes),this.state=c.BEFORE_ATTRIBUTE_NAME,this._stateBeforeAttributeName(t)}}_stateSelfClosingStartTag(t){switch(t){case n.GREATER_THAN_SIGN:{let a=this.currentToken;a.selfClosing=!0,this.state=c.DATA,this.emitCurrentTagToken();break}case n.EOF:{this._err(p.eofInTag),this._emitEOFToken();break}default:this._err(p.unexpectedSolidusInTag),this.state=c.BEFORE_ATTRIBUTE_NAME,this._stateBeforeAttributeName(t)}}_stateBogusComment(t){let a=this.currentToken;switch(t){case n.GREATER_THAN_SIGN:{this.state=c.DATA,this.emitCurrentComment(a);break}case n.EOF:{this.emitCurrentComment(a),this._emitEOFToken();break}case n.NULL:{this._err(p.unexpectedNullCharacter),a.data+=R;break}default:a.data+=String.fromCodePoint(t)}}_stateMarkupDeclarationOpen(t){this._consumeSequenceIfMatch(G.DASH_DASH,!0)?(this._createCommentToken(G.DASH_DASH.length+1),this.state=c.COMMENT_START):this._consumeSequenceIfMatch(G.DOCTYPE,!1)?(this.currentLocation=this.getCurrentLocation(G.DOCTYPE.length+1),this.state=c.DOCTYPE):this._consumeSequenceIfMatch(G.CDATA_START,!0)?this.inForeignNode?this.state=c.CDATA_SECTION:(this._err(p.cdataInHtmlContent),this._createCommentToken(G.CDATA_START.length+1),this.currentToken.data="[CDATA[",this.state=c.BOGUS_COMMENT):this._ensureHibernation()||(this._err(p.incorrectlyOpenedComment),this._createCommentToken(2),this.state=c.BOGUS_COMMENT,this._stateBogusComment(t))}_stateCommentStart(t){switch(t){case n.HYPHEN_MINUS:{this.state=c.COMMENT_START_DASH;break}case n.GREATER_THAN_SIGN:{this._err(p.abruptClosingOfEmptyComment),this.state=c.DATA;let a=this.currentToken;this.emitCurrentComment(a);break}default:this.state=c.COMMENT,this._stateComment(t)}}_stateCommentStartDash(t){let a=this.currentToken;switch(t){case n.HYPHEN_MINUS:{this.state=c.COMMENT_END;break}case n.GREATER_THAN_SIGN:{this._err(p.abruptClosingOfEmptyComment),this.state=c.DATA,this.emitCurrentComment(a);break}case n.EOF:{this._err(p.eofInComment),this.emitCurrentComment(a),this._emitEOFToken();break}default:a.data+="-",this.state=c.COMMENT,this._stateComment(t)}}_stateComment(t){let a=this.currentToken;switch(t){case n.HYPHEN_MINUS:{this.state=c.COMMENT_END_DASH;break}case n.LESS_THAN_SIGN:{a.data+="<",this.state=c.COMMENT_LESS_THAN_SIGN;break}case n.NULL:{this._err(p.unexpectedNullCharacter),a.data+=R;break}case n.EOF:{this._err(p.eofInComment),this.emitCurrentComment(a),this._emitEOFToken();break}default:a.data+=String.fromCodePoint(t)}}_stateCommentLessThanSign(t){let a=this.currentToken;switch(t){case n.EXCLAMATION_MARK:{a.data+="!",this.state=c.COMMENT_LESS_THAN_SIGN_BANG;break}case n.LESS_THAN_SIGN:{a.data+="<";break}default:this.state=c.COMMENT,this._stateComment(t)}}_stateCommentLessThanSignBang(t){t===n.HYPHEN_MINUS?this.state=c.COMMENT_LESS_THAN_SIGN_BANG_DASH:(this.state=c.COMMENT,this._stateComment(t))}_stateCommentLessThanSignBangDash(t){t===n.HYPHEN_MINUS?this.state=c.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH:(this.state=c.COMMENT_END_DASH,this._stateCommentEndDash(t))}_stateCommentLessThanSignBangDashDash(t){t!==n.GREATER_THAN_SIGN&&t!==n.EOF&&this._err(p.nestedComment),this.state=c.COMMENT_END,this._stateCommentEnd(t)}_stateCommentEndDash(t){let a=this.currentToken;switch(t){case n.HYPHEN_MINUS:{this.state=c.COMMENT_END;break}case n.EOF:{this._err(p.eofInComment),this.emitCurrentComment(a),this._emitEOFToken();break}default:a.data+="-",this.state=c.COMMENT,this._stateComment(t)}}_stateCommentEnd(t){let a=this.currentToken;switch(t){case n.GREATER_THAN_SIGN:{this.state=c.DATA,this.emitCurrentComment(a);break}case n.EXCLAMATION_MARK:{this.state=c.COMMENT_END_BANG;break}case n.HYPHEN_MINUS:{a.data+="-";break}case n.EOF:{this._err(p.eofInComment),this.emitCurrentComment(a),this._emitEOFToken();break}default:a.data+="--",this.state=c.COMMENT,this._stateComment(t)}}_stateCommentEndBang(t){let a=this.currentToken;switch(t){case n.HYPHEN_MINUS:{a.data+="--!",this.state=c.COMMENT_END_DASH;break}case n.GREATER_THAN_SIGN:{this._err(p.incorrectlyClosedComment),this.state=c.DATA,this.emitCurrentComment(a);break}case n.EOF:{this._err(p.eofInComment),this.emitCurrentComment(a),this._emitEOFToken();break}default:a.data+="--!",this.state=c.COMMENT,this._stateComment(t)}}_stateDoctype(t){switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:{this.state=c.BEFORE_DOCTYPE_NAME;break}case n.GREATER_THAN_SIGN:{this.state=c.BEFORE_DOCTYPE_NAME,this._stateBeforeDoctypeName(t);break}case n.EOF:{this._err(p.eofInDoctype),this._createDoctypeToken(null);let a=this.currentToken;a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:this._err(p.missingWhitespaceBeforeDoctypeName),this.state=c.BEFORE_DOCTYPE_NAME,this._stateBeforeDoctypeName(t)}}_stateBeforeDoctypeName(t){if(Le(t))this._createDoctypeToken(String.fromCharCode(je(t))),this.state=c.DOCTYPE_NAME;else switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:break;case n.NULL:{this._err(p.unexpectedNullCharacter),this._createDoctypeToken(R),this.state=c.DOCTYPE_NAME;break}case n.GREATER_THAN_SIGN:{this._err(p.missingDoctypeName),this._createDoctypeToken(null);let a=this.currentToken;a.forceQuirks=!0,this.emitCurrentDoctype(a),this.state=c.DATA;break}case n.EOF:{this._err(p.eofInDoctype),this._createDoctypeToken(null);let a=this.currentToken;a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:this._createDoctypeToken(String.fromCodePoint(t)),this.state=c.DOCTYPE_NAME}}_stateDoctypeName(t){let a=this.currentToken;switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:{this.state=c.AFTER_DOCTYPE_NAME;break}case n.GREATER_THAN_SIGN:{this.state=c.DATA,this.emitCurrentDoctype(a);break}case n.NULL:{this._err(p.unexpectedNullCharacter),a.name+=R;break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:a.name+=String.fromCodePoint(Le(t)?je(t):t)}}_stateAfterDoctypeName(t){let a=this.currentToken;switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:break;case n.GREATER_THAN_SIGN:{this.state=c.DATA,this.emitCurrentDoctype(a);break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:this._consumeSequenceIfMatch(G.PUBLIC,!1)?this.state=c.AFTER_DOCTYPE_PUBLIC_KEYWORD:this._consumeSequenceIfMatch(G.SYSTEM,!1)?this.state=c.AFTER_DOCTYPE_SYSTEM_KEYWORD:this._ensureHibernation()||(this._err(p.invalidCharacterSequenceAfterDoctypeName),a.forceQuirks=!0,this.state=c.BOGUS_DOCTYPE,this._stateBogusDoctype(t))}}_stateAfterDoctypePublicKeyword(t){let a=this.currentToken;switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:{this.state=c.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER;break}case n.QUOTATION_MARK:{this._err(p.missingWhitespaceAfterDoctypePublicKeyword),a.publicId="",this.state=c.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;break}case n.APOSTROPHE:{this._err(p.missingWhitespaceAfterDoctypePublicKeyword),a.publicId="",this.state=c.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;break}case n.GREATER_THAN_SIGN:{this._err(p.missingDoctypePublicIdentifier),a.forceQuirks=!0,this.state=c.DATA,this.emitCurrentDoctype(a);break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:this._err(p.missingQuoteBeforeDoctypePublicIdentifier),a.forceQuirks=!0,this.state=c.BOGUS_DOCTYPE,this._stateBogusDoctype(t)}}_stateBeforeDoctypePublicIdentifier(t){let a=this.currentToken;switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:break;case n.QUOTATION_MARK:{a.publicId="",this.state=c.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED;break}case n.APOSTROPHE:{a.publicId="",this.state=c.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED;break}case n.GREATER_THAN_SIGN:{this._err(p.missingDoctypePublicIdentifier),a.forceQuirks=!0,this.state=c.DATA,this.emitCurrentDoctype(a);break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:this._err(p.missingQuoteBeforeDoctypePublicIdentifier),a.forceQuirks=!0,this.state=c.BOGUS_DOCTYPE,this._stateBogusDoctype(t)}}_stateDoctypePublicIdentifierDoubleQuoted(t){let a=this.currentToken;switch(t){case n.QUOTATION_MARK:{this.state=c.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;break}case n.NULL:{this._err(p.unexpectedNullCharacter),a.publicId+=R;break}case n.GREATER_THAN_SIGN:{this._err(p.abruptDoctypePublicIdentifier),a.forceQuirks=!0,this.emitCurrentDoctype(a),this.state=c.DATA;break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:a.publicId+=String.fromCodePoint(t)}}_stateDoctypePublicIdentifierSingleQuoted(t){let a=this.currentToken;switch(t){case n.APOSTROPHE:{this.state=c.AFTER_DOCTYPE_PUBLIC_IDENTIFIER;break}case n.NULL:{this._err(p.unexpectedNullCharacter),a.publicId+=R;break}case n.GREATER_THAN_SIGN:{this._err(p.abruptDoctypePublicIdentifier),a.forceQuirks=!0,this.emitCurrentDoctype(a),this.state=c.DATA;break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:a.publicId+=String.fromCodePoint(t)}}_stateAfterDoctypePublicIdentifier(t){let a=this.currentToken;switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:{this.state=c.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS;break}case n.GREATER_THAN_SIGN:{this.state=c.DATA,this.emitCurrentDoctype(a);break}case n.QUOTATION_MARK:{this._err(p.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers),a.systemId="",this.state=c.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;break}case n.APOSTROPHE:{this._err(p.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers),a.systemId="",this.state=c.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:this._err(p.missingQuoteBeforeDoctypeSystemIdentifier),a.forceQuirks=!0,this.state=c.BOGUS_DOCTYPE,this._stateBogusDoctype(t)}}_stateBetweenDoctypePublicAndSystemIdentifiers(t){let a=this.currentToken;switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:break;case n.GREATER_THAN_SIGN:{this.emitCurrentDoctype(a),this.state=c.DATA;break}case n.QUOTATION_MARK:{a.systemId="",this.state=c.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;break}case n.APOSTROPHE:{a.systemId="",this.state=c.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:this._err(p.missingQuoteBeforeDoctypeSystemIdentifier),a.forceQuirks=!0,this.state=c.BOGUS_DOCTYPE,this._stateBogusDoctype(t)}}_stateAfterDoctypeSystemKeyword(t){let a=this.currentToken;switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:{this.state=c.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER;break}case n.QUOTATION_MARK:{this._err(p.missingWhitespaceAfterDoctypeSystemKeyword),a.systemId="",this.state=c.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;break}case n.APOSTROPHE:{this._err(p.missingWhitespaceAfterDoctypeSystemKeyword),a.systemId="",this.state=c.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;break}case n.GREATER_THAN_SIGN:{this._err(p.missingDoctypeSystemIdentifier),a.forceQuirks=!0,this.state=c.DATA,this.emitCurrentDoctype(a);break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:this._err(p.missingQuoteBeforeDoctypeSystemIdentifier),a.forceQuirks=!0,this.state=c.BOGUS_DOCTYPE,this._stateBogusDoctype(t)}}_stateBeforeDoctypeSystemIdentifier(t){let a=this.currentToken;switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:break;case n.QUOTATION_MARK:{a.systemId="",this.state=c.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED;break}case n.APOSTROPHE:{a.systemId="",this.state=c.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED;break}case n.GREATER_THAN_SIGN:{this._err(p.missingDoctypeSystemIdentifier),a.forceQuirks=!0,this.state=c.DATA,this.emitCurrentDoctype(a);break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:this._err(p.missingQuoteBeforeDoctypeSystemIdentifier),a.forceQuirks=!0,this.state=c.BOGUS_DOCTYPE,this._stateBogusDoctype(t)}}_stateDoctypeSystemIdentifierDoubleQuoted(t){let a=this.currentToken;switch(t){case n.QUOTATION_MARK:{this.state=c.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;break}case n.NULL:{this._err(p.unexpectedNullCharacter),a.systemId+=R;break}case n.GREATER_THAN_SIGN:{this._err(p.abruptDoctypeSystemIdentifier),a.forceQuirks=!0,this.emitCurrentDoctype(a),this.state=c.DATA;break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:a.systemId+=String.fromCodePoint(t)}}_stateDoctypeSystemIdentifierSingleQuoted(t){let a=this.currentToken;switch(t){case n.APOSTROPHE:{this.state=c.AFTER_DOCTYPE_SYSTEM_IDENTIFIER;break}case n.NULL:{this._err(p.unexpectedNullCharacter),a.systemId+=R;break}case n.GREATER_THAN_SIGN:{this._err(p.abruptDoctypeSystemIdentifier),a.forceQuirks=!0,this.emitCurrentDoctype(a),this.state=c.DATA;break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:a.systemId+=String.fromCodePoint(t)}}_stateAfterDoctypeSystemIdentifier(t){let a=this.currentToken;switch(t){case n.SPACE:case n.LINE_FEED:case n.TABULATION:case n.FORM_FEED:break;case n.GREATER_THAN_SIGN:{this.emitCurrentDoctype(a),this.state=c.DATA;break}case n.EOF:{this._err(p.eofInDoctype),a.forceQuirks=!0,this.emitCurrentDoctype(a),this._emitEOFToken();break}default:this._err(p.unexpectedCharacterAfterDoctypeSystemIdentifier),this.state=c.BOGUS_DOCTYPE,this._stateBogusDoctype(t)}}_stateBogusDoctype(t){let a=this.currentToken;switch(t){case n.GREATER_THAN_SIGN:{this.emitCurrentDoctype(a),this.state=c.DATA;break}case n.NULL:{this._err(p.unexpectedNullCharacter);break}case n.EOF:{this.emitCurrentDoctype(a),this._emitEOFToken();break}default:}}_stateCdataSection(t){switch(t){case n.RIGHT_SQUARE_BRACKET:{this.state=c.CDATA_SECTION_BRACKET;break}case n.EOF:{this._err(p.eofInCdata),this._emitEOFToken();break}default:this._emitCodePoint(t)}}_stateCdataSectionBracket(t){t===n.RIGHT_SQUARE_BRACKET?this.state=c.CDATA_SECTION_END:(this._emitChars("]"),this.state=c.CDATA_SECTION,this._stateCdataSection(t))}_stateCdataSectionEnd(t){switch(t){case n.GREATER_THAN_SIGN:{this.state=c.DATA;break}case n.RIGHT_SQUARE_BRACKET:{this._emitChars("]");break}default:this._emitChars("]]"),this.state=c.CDATA_SECTION,this._stateCdataSection(t)}}_stateCharacterReference(){let t=this.entityDecoder.write(this.preprocessor.html,this.preprocessor.pos);if(t<0)if(this.preprocessor.lastChunkWritten)t=this.entityDecoder.end();else{this.active=!1,this.preprocessor.pos=this.preprocessor.html.length-1,this.consumedAfterSnapshot=0,this.preprocessor.endOfChunkHit=!0;return}t===0?(this.preprocessor.pos=this.entityStartPos,this._flushCodePointConsumedAsCharacterReference(n.AMPERSAND),this.state=!this._isCharacterReferenceInAttribute()&&Jt(this.preprocessor.peek(1))?c.AMBIGUOUS_AMPERSAND:this.returnState):this.state=this.returnState}_stateAmbiguousAmpersand(t){Jt(t)?this._flushCodePointConsumedAsCharacterReference(t):(t===n.SEMICOLON&&this._err(p.unknownNamedCharacterReference),this.state=this.returnState,this._callState(t))}};var sa=new Set([s.DD,s.DT,s.LI,s.OPTGROUP,s.OPTION,s.P,s.RB,s.RP,s.RT,s.RTC]),ea=new Set([...sa,s.CAPTION,s.COLGROUP,s.TBODY,s.TD,s.TFOOT,s.TH,s.THEAD,s.TR]),ze=new Set([s.APPLET,s.CAPTION,s.HTML,s.MARQUEE,s.OBJECT,s.TABLE,s.TD,s.TEMPLATE,s.TH]),ti=new Set([...ze,s.OL,s.UL]),ai=new Set([...ze,s.BUTTON]),ta=new Set([s.ANNOTATION_XML,s.MI,s.MN,s.MO,s.MS,s.MTEXT]),aa=new Set([s.DESC,s.FOREIGN_OBJECT,s.TITLE]),si=new Set([s.TR,s.TEMPLATE,s.HTML]),ii=new Set([s.TBODY,s.TFOOT,s.THEAD,s.TEMPLATE,s.HTML]),ui=new Set([s.TABLE,s.TEMPLATE,s.HTML]),ri=new Set([s.TD,s.TH]),Je=class{get currentTmplContentOrNode(){return this._isInTemplate()?this.treeAdapter.getTemplateContent(this.current):this.current}constructor(t,a,i){this.treeAdapter=a,this.handler=i,this.items=[],this.tagIDs=[],this.stackTop=-1,this.tmplCount=0,this.currentTagId=s.UNKNOWN,this.current=t}_indexOf(t){return this.items.lastIndexOf(t,this.stackTop)}_isInTemplate(){return this.currentTagId===s.TEMPLATE&&this.treeAdapter.getNamespaceURI(this.current)===m.HTML}_updateCurrentElement(){this.current=this.items[this.stackTop],this.currentTagId=this.tagIDs[this.stackTop]}push(t,a){this.stackTop++,this.items[this.stackTop]=t,this.current=t,this.tagIDs[this.stackTop]=a,this.currentTagId=a,this._isInTemplate()&&this.tmplCount++,this.handler.onItemPush(t,a,!0)}pop(){let t=this.current;this.tmplCount>0&&this._isInTemplate()&&this.tmplCount--,this.stackTop--,this._updateCurrentElement(),this.handler.onItemPop(t,!0)}replace(t,a){let i=this._indexOf(t);this.items[i]=a,i===this.stackTop&&(this.current=a)}insertAfter(t,a,i){let u=this._indexOf(t)+1;this.items.splice(u,0,a),this.tagIDs.splice(u,0,i),this.stackTop++,u===this.stackTop&&this._updateCurrentElement(),this.current&&this.currentTagId!==void 0&&this.handler.onItemPush(this.current,this.currentTagId,u===this.stackTop)}popUntilTagNamePopped(t){let a=this.stackTop+1;do a=this.tagIDs.lastIndexOf(t,a-1);while(a>0&&this.treeAdapter.getNamespaceURI(this.items[a])!==m.HTML);this.shortenToLength(Math.max(a,0))}shortenToLength(t){for(;this.stackTop>=t;){let a=this.current;this.tmplCount>0&&this._isInTemplate()&&(this.tmplCount-=1),this.stackTop--,this._updateCurrentElement(),this.handler.onItemPop(a,this.stackTop<t)}}popUntilElementPopped(t){let a=this._indexOf(t);this.shortenToLength(Math.max(a,0))}popUntilPopped(t,a){let i=this._indexOfTagNames(t,a);this.shortenToLength(Math.max(i,0))}popUntilNumberedHeaderPopped(){this.popUntilPopped(Se,m.HTML)}popUntilTableCellPopped(){this.popUntilPopped(ri,m.HTML)}popAllUpToHtmlElement(){this.tmplCount=0,this.shortenToLength(1)}_indexOfTagNames(t,a){for(let i=this.stackTop;i>=0;i--)if(t.has(this.tagIDs[i])&&this.treeAdapter.getNamespaceURI(this.items[i])===a)return i;return-1}clearBackTo(t,a){let i=this._indexOfTagNames(t,a);this.shortenToLength(i+1)}clearBackToTableContext(){this.clearBackTo(ui,m.HTML)}clearBackToTableBodyContext(){this.clearBackTo(ii,m.HTML)}clearBackToTableRowContext(){this.clearBackTo(si,m.HTML)}remove(t){let a=this._indexOf(t);a>=0&&(a===this.stackTop?this.pop():(this.items.splice(a,1),this.tagIDs.splice(a,1),this.stackTop--,this._updateCurrentElement(),this.handler.onItemPop(t,!1)))}tryPeekProperlyNestedBodyElement(){return this.stackTop>=1&&this.tagIDs[1]===s.BODY?this.items[1]:null}contains(t){return this._indexOf(t)>-1}getCommonAncestor(t){let a=this._indexOf(t)-1;return a>=0?this.items[a]:null}isRootHtmlElementCurrent(){return this.stackTop===0&&this.tagIDs[0]===s.HTML}hasInDynamicScope(t,a){for(let i=this.stackTop;i>=0;i--){let u=this.tagIDs[i];switch(this.treeAdapter.getNamespaceURI(this.items[i])){case m.HTML:{if(u===t)return!0;if(a.has(u))return!1;break}case m.SVG:{if(aa.has(u))return!1;break}case m.MATHML:{if(ta.has(u))return!1;break}}}return!0}hasInScope(t){return this.hasInDynamicScope(t,ze)}hasInListItemScope(t){return this.hasInDynamicScope(t,ti)}hasInButtonScope(t){return this.hasInDynamicScope(t,ai)}hasNumberedHeaderInScope(){for(let t=this.stackTop;t>=0;t--){let a=this.tagIDs[t];switch(this.treeAdapter.getNamespaceURI(this.items[t])){case m.HTML:{if(Se.has(a))return!0;if(ze.has(a))return!1;break}case m.SVG:{if(aa.has(a))return!1;break}case m.MATHML:{if(ta.has(a))return!1;break}}}return!0}hasInTableScope(t){for(let a=this.stackTop;a>=0;a--)if(this.treeAdapter.getNamespaceURI(this.items[a])===m.HTML)switch(this.tagIDs[a]){case t:return!0;case s.TABLE:case s.HTML:return!1}return!0}hasTableBodyContextInTableScope(){for(let t=this.stackTop;t>=0;t--)if(this.treeAdapter.getNamespaceURI(this.items[t])===m.HTML)switch(this.tagIDs[t]){case s.TBODY:case s.THEAD:case s.TFOOT:return!0;case s.TABLE:case s.HTML:return!1}return!0}hasInSelectScope(t){for(let a=this.stackTop;a>=0;a--)if(this.treeAdapter.getNamespaceURI(this.items[a])===m.HTML)switch(this.tagIDs[a]){case t:return!0;case s.OPTION:case s.OPTGROUP:break;default:return!1}return!0}generateImpliedEndTags(){for(;this.currentTagId!==void 0&&sa.has(this.currentTagId);)this.pop()}generateImpliedEndTagsThoroughly(){for(;this.currentTagId!==void 0&&ea.has(this.currentTagId);)this.pop()}generateImpliedEndTagsWithExclusion(t){for(;this.currentTagId!==void 0&&this.currentTagId!==t&&ea.has(this.currentTagId);)this.pop()}};var ee;(function(e){e[e.Marker=0]="Marker",e[e.Element=1]="Element"})(ee||(ee={}));var ia={type:ee.Marker},Ze=class{constructor(t){this.treeAdapter=t,this.entries=[],this.bookmark=null}_getNoahArkConditionCandidates(t,a){let i=[],u=a.length,o=this.treeAdapter.getTagName(t),h=this.treeAdapter.getNamespaceURI(t);for(let d=0;d<this.entries.length;d++){let E=this.entries[d];if(E.type===ee.Marker)break;let{element:T}=E;if(this.treeAdapter.getTagName(T)===o&&this.treeAdapter.getNamespaceURI(T)===h){let A=this.treeAdapter.getAttrList(T);A.length===u&&i.push({idx:d,attrs:A})}}return i}_ensureNoahArkCondition(t){if(this.entries.length<3)return;let a=this.treeAdapter.getAttrList(t),i=this._getNoahArkConditionCandidates(t,a);if(i.length<3)return;let u=new Map(a.map(h=>[h.name,h.value])),o=0;for(let h=0;h<i.length;h++){let d=i[h];d.attrs.every(E=>u.get(E.name)===E.value)&&(o+=1,o>=3&&this.entries.splice(d.idx,1))}}insertMarker(){this.entries.unshift(ia)}pushElement(t,a){this._ensureNoahArkCondition(t),this.entries.unshift({type:ee.Element,element:t,token:a})}insertElementAfterBookmark(t,a){let i=this.entries.indexOf(this.bookmark);this.entries.splice(i,0,{type:ee.Element,element:t,token:a})}removeEntry(t){let a=this.entries.indexOf(t);a!==-1&&this.entries.splice(a,1)}clearToLastMarker(){let t=this.entries.indexOf(ia);t===-1?this.entries.length=0:this.entries.splice(0,t+1)}getElementEntryInScopeWithTagName(t){let a=this.entries.find(i=>i.type===ee.Marker||this.treeAdapter.getTagName(i.element)===t);return a&&a.type===ee.Element?a:null}getElementEntry(t){return this.entries.find(a=>a.type===ee.Element&&a.element===t)}};var te={createDocument(){return{nodeName:"#document",mode:W.NO_QUIRKS,childNodes:[]}},createDocumentFragment(){return{nodeName:"#document-fragment",childNodes:[]}},createElement(e,t,a){return{nodeName:e,tagName:e,attrs:a,namespaceURI:t,childNodes:[],parentNode:null}},createCommentNode(e){return{nodeName:"#comment",data:e,parentNode:null}},createTextNode(e){return{nodeName:"#text",value:e,parentNode:null}},appendChild(e,t){e.childNodes.push(t),t.parentNode=e},insertBefore(e,t,a){let i=e.childNodes.indexOf(a);e.childNodes.splice(i,0,t),t.parentNode=e},setTemplateContent(e,t){e.content=t},getTemplateContent(e){return e.content},setDocumentType(e,t,a,i){let u=e.childNodes.find(o=>o.nodeName==="#documentType");if(u)u.name=t,u.publicId=a,u.systemId=i;else{let o={nodeName:"#documentType",name:t,publicId:a,systemId:i,parentNode:null};te.appendChild(e,o)}},setDocumentMode(e,t){e.mode=t},getDocumentMode(e){return e.mode},detachNode(e){if(e.parentNode){let t=e.parentNode.childNodes.indexOf(e);e.parentNode.childNodes.splice(t,1),e.parentNode=null}},insertText(e,t){if(e.childNodes.length>0){let a=e.childNodes[e.childNodes.length-1];if(te.isTextNode(a)){a.value+=t;return}}te.appendChild(e,te.createTextNode(t))},insertTextBefore(e,t,a){let i=e.childNodes[e.childNodes.indexOf(a)-1];i&&te.isTextNode(i)?i.value+=t:te.insertBefore(e,te.createTextNode(t),a)},adoptAttributes(e,t){let a=new Set(e.attrs.map(i=>i.name));for(let i=0;i<t.length;i++)a.has(t[i].name)||e.attrs.push(t[i])},getFirstChild(e){return e.childNodes[0]},getChildNodes(e){return e.childNodes},getParentNode(e){return e.parentNode},getAttrList(e){return e.attrs},getTagName(e){return e.tagName},getNamespaceURI(e){return e.namespaceURI},getTextNodeContent(e){return e.value},getCommentNodeContent(e){return e.data},getDocumentTypeNodeName(e){return e.name},getDocumentTypeNodePublicId(e){return e.publicId},getDocumentTypeNodeSystemId(e){return e.systemId},isTextNode(e){return e.nodeName==="#text"},isCommentNode(e){return e.nodeName==="#comment"},isDocumentTypeNode(e){return e.nodeName==="#documentType"},isElementNode(e){return Object.prototype.hasOwnProperty.call(e,"tagName")},setNodeSourceCodeLocation(e,t){e.sourceCodeLocation=t},getNodeSourceCodeLocation(e){return e.sourceCodeLocation},updateNodeSourceCodeLocation(e,t){e.sourceCodeLocation={...e.sourceCodeLocation,...t}}};var ra="html",ni="about:legacy-compat",oi="http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd",na=["+//silmaril//dtd html pro v0r11 19970101//","-//as//dtd html 3.0 aswedit + extensions//","-//advasoft ltd//dtd html 3.0 aswedit + extensions//","-//ietf//dtd html 2.0 level 1//","-//ietf//dtd html 2.0 level 2//","-//ietf//dtd html 2.0 strict level 1//","-//ietf//dtd html 2.0 strict level 2//","-//ietf//dtd html 2.0 strict//","-//ietf//dtd html 2.0//","-//ietf//dtd html 2.1e//","-//ietf//dtd html 3.0//","-//ietf//dtd html 3.2 final//","-//ietf//dtd html 3.2//","-//ietf//dtd html 3//","-//ietf//dtd html level 0//","-//ietf//dtd html level 1//","-//ietf//dtd html level 2//","-//ietf//dtd html level 3//","-//ietf//dtd html strict level 0//","-//ietf//dtd html strict level 1//","-//ietf//dtd html strict level 2//","-//ietf//dtd html strict level 3//","-//ietf//dtd html strict//","-//ietf//dtd html//","-//metrius//dtd metrius presentational//","-//microsoft//dtd internet explorer 2.0 html strict//","-//microsoft//dtd internet explorer 2.0 html//","-//microsoft//dtd internet explorer 2.0 tables//","-//microsoft//dtd internet explorer 3.0 html strict//","-//microsoft//dtd internet explorer 3.0 html//","-//microsoft//dtd internet explorer 3.0 tables//","-//netscape comm. corp.//dtd html//","-//netscape comm. corp.//dtd strict html//","-//o'reilly and associates//dtd html 2.0//","-//o'reilly and associates//dtd html extended 1.0//","-//o'reilly and associates//dtd html extended relaxed 1.0//","-//sq//dtd html 2.0 hotmetal + extensions//","-//softquad software//dtd hotmetal pro 6.0::19990601::extensions to html 4.0//","-//softquad//dtd hotmetal pro 4.0::19971010::extensions to html 4.0//","-//spyglass//dtd html 2.0 extended//","-//sun microsystems corp.//dtd hotjava html//","-//sun microsystems corp.//dtd hotjava strict html//","-//w3c//dtd html 3 1995-03-24//","-//w3c//dtd html 3.2 draft//","-//w3c//dtd html 3.2 final//","-//w3c//dtd html 3.2//","-//w3c//dtd html 3.2s draft//","-//w3c//dtd html 4.0 frameset//","-//w3c//dtd html 4.0 transitional//","-//w3c//dtd html experimental 19960712//","-//w3c//dtd html experimental 970421//","-//w3c//dtd w3 html//","-//w3o//dtd w3 html 3.0//","-//webtechs//dtd mozilla html 2.0//","-//webtechs//dtd mozilla html//"],ci=[...na,"-//w3c//dtd html 4.01 frameset//","-//w3c//dtd html 4.01 transitional//"],hi=new Set(["-//w3o//dtd w3 html strict 3.0//en//","-/w3c/dtd html 4.0 transitional/en","html"]),oa=["-//w3c//dtd xhtml 1.0 frameset//","-//w3c//dtd xhtml 1.0 transitional//"],li=[...oa,"-//w3c//dtd html 4.01 frameset//","-//w3c//dtd html 4.01 transitional//"];function ua(e,t){return t.some(a=>e.startsWith(a))}function ca(e){return e.name===ra&&e.publicId===null&&(e.systemId===null||e.systemId===ni)}function ha(e){if(e.name!==ra)return W.QUIRKS;let{systemId:t}=e;if(t&&t.toLowerCase()===oi)return W.QUIRKS;let{publicId:a}=e;if(a!==null){if(a=a.toLowerCase(),hi.has(a))return W.QUIRKS;let i=t===null?ci:na;if(ua(a,i))return W.QUIRKS;if(i=t===null?oa:li,ua(a,i))return W.LIMITED_QUIRKS}return W.NO_QUIRKS}var la={TEXT_HTML:"text/html",APPLICATION_XML:"application/xhtml+xml"},di="definitionurl",pi="definitionURL",Ei=new Map(["attributeName","attributeType","baseFrequency","baseProfile","calcMode","clipPathUnits","diffuseConstant","edgeMode","filterUnits","glyphRef","gradientTransform","gradientUnits","kernelMatrix","kernelUnitLength","keyPoints","keySplines","keyTimes","lengthAdjust","limitingConeAngle","markerHeight","markerUnits","markerWidth","maskContentUnits","maskUnits","numOctaves","pathLength","patternContentUnits","patternTransform","patternUnits","pointsAtX","pointsAtY","pointsAtZ","preserveAlpha","preserveAspectRatio","primitiveUnits","refX","refY","repeatCount","repeatDur","requiredExtensions","requiredFeatures","specularConstant","specularExponent","spreadMethod","startOffset","stdDeviation","stitchTiles","surfaceScale","systemLanguage","tableValues","targetX","targetY","textLength","viewBox","viewTarget","xChannelSelector","yChannelSelector","zoomAndPan"].map(e=>[e.toLowerCase(),e])),mi=new Map([["xlink:actuate",{prefix:"xlink",name:"actuate",namespace:m.XLINK}],["xlink:arcrole",{prefix:"xlink",name:"arcrole",namespace:m.XLINK}],["xlink:href",{prefix:"xlink",name:"href",namespace:m.XLINK}],["xlink:role",{prefix:"xlink",name:"role",namespace:m.XLINK}],["xlink:show",{prefix:"xlink",name:"show",namespace:m.XLINK}],["xlink:title",{prefix:"xlink",name:"title",namespace:m.XLINK}],["xlink:type",{prefix:"xlink",name:"type",namespace:m.XLINK}],["xml:lang",{prefix:"xml",name:"lang",namespace:m.XML}],["xml:space",{prefix:"xml",name:"space",namespace:m.XML}],["xmlns",{prefix:"",name:"xmlns",namespace:m.XMLNS}],["xmlns:xlink",{prefix:"xmlns",name:"xlink",namespace:m.XMLNS}]]),Ti=new Map(["altGlyph","altGlyphDef","altGlyphItem","animateColor","animateMotion","animateTransform","clipPath","feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feDistantLight","feFlood","feFuncA","feFuncB","feFuncG","feFuncR","feGaussianBlur","feImage","feMerge","feMergeNode","feMorphology","feOffset","fePointLight","feSpecularLighting","feSpotLight","feTile","feTurbulence","foreignObject","glyphRef","linearGradient","radialGradient","textPath"].map(e=>[e.toLowerCase(),e])),bi=new Set([s.B,s.BIG,s.BLOCKQUOTE,s.BODY,s.BR,s.CENTER,s.CODE,s.DD,s.DIV,s.DL,s.DT,s.EM,s.EMBED,s.H1,s.H2,s.H3,s.H4,s.H5,s.H6,s.HEAD,s.HR,s.I,s.IMG,s.LI,s.LISTING,s.MENU,s.META,s.NOBR,s.OL,s.P,s.PRE,s.RUBY,s.S,s.SMALL,s.SPAN,s.STRONG,s.STRIKE,s.SUB,s.SUP,s.TABLE,s.TT,s.U,s.UL,s.VAR]);function fa(e){let t=e.tagID;return t===s.FONT&&e.attrs.some(({name:i})=>i===ne.COLOR||i===ne.SIZE||i===ne.FACE)||bi.has(t)}function It(e){for(let t=0;t<e.attrs.length;t++)if(e.attrs[t].name===di){e.attrs[t].name=pi;break}}function xt(e){for(let t=0;t<e.attrs.length;t++){let a=Ei.get(e.attrs[t].name);a!=null&&(e.attrs[t].name=a)}}function $e(e){for(let t=0;t<e.attrs.length;t++){let a=mi.get(e.attrs[t].name);a&&(e.attrs[t].prefix=a.prefix,e.attrs[t].name=a.name,e.attrs[t].namespace=a.namespace)}}function da(e){let t=Ti.get(e.tagName);t!=null&&(e.tagName=t,e.tagID=me(e.tagName))}function _i(e,t){return t===m.MATHML&&(e===s.MI||e===s.MO||e===s.MN||e===s.MS||e===s.MTEXT)}function Ai(e,t,a){if(t===m.MATHML&&e===s.ANNOTATION_XML){for(let i=0;i<a.length;i++)if(a[i].name===ne.ENCODING){let u=a[i].value.toLowerCase();return u===la.TEXT_HTML||u===la.APPLICATION_XML}}return t===m.SVG&&(e===s.FOREIGN_OBJECT||e===s.DESC||e===s.TITLE)}function pa(e,t,a,i){return(!i||i===m.HTML)&&Ai(e,t,a)||(!i||i===m.MATHML)&&_i(e,t)}var gi="hidden",Ci=8,Ii=3,l;(function(e){e[e.INITIAL=0]="INITIAL",e[e.BEFORE_HTML=1]="BEFORE_HTML",e[e.BEFORE_HEAD=2]="BEFORE_HEAD",e[e.IN_HEAD=3]="IN_HEAD",e[e.IN_HEAD_NO_SCRIPT=4]="IN_HEAD_NO_SCRIPT",e[e.AFTER_HEAD=5]="AFTER_HEAD",e[e.IN_BODY=6]="IN_BODY",e[e.TEXT=7]="TEXT",e[e.IN_TABLE=8]="IN_TABLE",e[e.IN_TABLE_TEXT=9]="IN_TABLE_TEXT",e[e.IN_CAPTION=10]="IN_CAPTION",e[e.IN_COLUMN_GROUP=11]="IN_COLUMN_GROUP",e[e.IN_TABLE_BODY=12]="IN_TABLE_BODY",e[e.IN_ROW=13]="IN_ROW",e[e.IN_CELL=14]="IN_CELL",e[e.IN_SELECT=15]="IN_SELECT",e[e.IN_SELECT_IN_TABLE=16]="IN_SELECT_IN_TABLE",e[e.IN_TEMPLATE=17]="IN_TEMPLATE",e[e.AFTER_BODY=18]="AFTER_BODY",e[e.IN_FRAMESET=19]="IN_FRAMESET",e[e.AFTER_FRAMESET=20]="AFTER_FRAMESET",e[e.AFTER_AFTER_BODY=21]="AFTER_AFTER_BODY",e[e.AFTER_AFTER_FRAMESET=22]="AFTER_AFTER_FRAMESET"})(l||(l={}));var xi={startLine:-1,startCol:-1,startOffset:-1,endLine:-1,endCol:-1,endOffset:-1},_a=new Set([s.TABLE,s.TBODY,s.TFOOT,s.THEAD,s.TR]),ma={scriptingEnabled:!0,sourceCodeLocationInfo:!1,treeAdapter:te,onParseError:null},ge=class{constructor(t,a,i=null,u=null){this.fragmentContext=i,this.scriptHandler=u,this.currentToken=null,this.stopped=!1,this.insertionMode=l.INITIAL,this.originalInsertionMode=l.INITIAL,this.headElement=null,this.formElement=null,this.currentNotInHTML=!1,this.tmplInsertionModeStack=[],this.pendingCharacterTokens=[],this.hasNonWhitespacePendingCharacterToken=!1,this.framesetOk=!0,this.skipNextNewLine=!1,this.fosterParentingEnabled=!1,this.options={...ma,...t},this.treeAdapter=this.options.treeAdapter,this.onParseError=this.options.onParseError,this.onParseError&&(this.options.sourceCodeLocationInfo=!0),this.document=a??this.treeAdapter.createDocument(),this.tokenizer=new Oe(this.options,this),this.activeFormattingElements=new Ze(this.treeAdapter),this.fragmentContextID=i?me(this.treeAdapter.getTagName(i)):s.UNKNOWN,this._setContextModes(i??this.document,this.fragmentContextID),this.openElements=new Je(this.document,this.treeAdapter,this)}static parse(t,a){let i=new this(a);return i.tokenizer.write(t,!0),i.document}static getFragmentParser(t,a){let i={...ma,...a};t??(t=i.treeAdapter.createElement(f.TEMPLATE,m.HTML,[]));let u=i.treeAdapter.createElement("documentmock",m.HTML,[]),o=new this(i,u,t);return o.fragmentContextID===s.TEMPLATE&&o.tmplInsertionModeStack.unshift(l.IN_TEMPLATE),o._initTokenizerForFragmentParsing(),o._insertFakeRootElement(),o._resetInsertionMode(),o._findFormInFragmentContext(),o}getFragment(){let t=this.treeAdapter.getFirstChild(this.document),a=this.treeAdapter.createDocumentFragment();return this._adoptNodes(t,a),a}_err(t,a,i){var u;if(!this.onParseError)return;let o=(u=t.location)!==null&&u!==void 0?u:xi,h={code:a,startLine:o.startLine,startCol:o.startCol,startOffset:o.startOffset,endLine:i?o.startLine:o.endLine,endCol:i?o.startCol:o.endCol,endOffset:i?o.startOffset:o.endOffset};this.onParseError(h)}onItemPush(t,a,i){var u,o;(o=(u=this.treeAdapter).onItemPush)===null||o===void 0||o.call(u,t),i&&this.openElements.stackTop>0&&this._setContextModes(t,a)}onItemPop(t,a){var i,u;if(this.options.sourceCodeLocationInfo&&this._setEndLocation(t,this.currentToken),(u=(i=this.treeAdapter).onItemPop)===null||u===void 0||u.call(i,t,this.openElements.current),a){let o,h;this.openElements.stackTop===0&&this.fragmentContext?(o=this.fragmentContext,h=this.fragmentContextID):{current:o,currentTagId:h}=this.openElements,this._setContextModes(o,h)}}_setContextModes(t,a){let i=t===this.document||t&&this.treeAdapter.getNamespaceURI(t)===m.HTML;this.currentNotInHTML=!i,this.tokenizer.inForeignNode=!i&&t!==void 0&&a!==void 0&&!this._isIntegrationPoint(a,t)}_switchToTextParsing(t,a){this._insertElement(t,m.HTML),this.tokenizer.state=a,this.originalInsertionMode=this.insertionMode,this.insertionMode=l.TEXT}switchToPlaintextParsing(){this.insertionMode=l.TEXT,this.originalInsertionMode=l.IN_BODY,this.tokenizer.state=V.PLAINTEXT}_getAdjustedCurrentElement(){return this.openElements.stackTop===0&&this.fragmentContext?this.fragmentContext:this.openElements.current}_findFormInFragmentContext(){let t=this.fragmentContext;for(;t;){if(this.treeAdapter.getTagName(t)===f.FORM){this.formElement=t;break}t=this.treeAdapter.getParentNode(t)}}_initTokenizerForFragmentParsing(){if(!(!this.fragmentContext||this.treeAdapter.getNamespaceURI(this.fragmentContext)!==m.HTML))switch(this.fragmentContextID){case s.TITLE:case s.TEXTAREA:{this.tokenizer.state=V.RCDATA;break}case s.STYLE:case s.XMP:case s.IFRAME:case s.NOEMBED:case s.NOFRAMES:case s.NOSCRIPT:{this.tokenizer.state=V.RAWTEXT;break}case s.SCRIPT:{this.tokenizer.state=V.SCRIPT_DATA;break}case s.PLAINTEXT:{this.tokenizer.state=V.PLAINTEXT;break}default:}}_setDocumentType(t){let a=t.name||"",i=t.publicId||"",u=t.systemId||"";if(this.treeAdapter.setDocumentType(this.document,a,i,u),t.location){let h=this.treeAdapter.getChildNodes(this.document).find(d=>this.treeAdapter.isDocumentTypeNode(d));h&&this.treeAdapter.setNodeSourceCodeLocation(h,t.location)}}_attachElementToTree(t,a){if(this.options.sourceCodeLocationInfo){let i=a&&{...a,startTag:a};this.treeAdapter.setNodeSourceCodeLocation(t,i)}if(this._shouldFosterParentOnInsertion())this._fosterParentElement(t);else{let i=this.openElements.currentTmplContentOrNode;this.treeAdapter.appendChild(i??this.document,t)}}_appendElement(t,a){let i=this.treeAdapter.createElement(t.tagName,a,t.attrs);this._attachElementToTree(i,t.location)}_insertElement(t,a){let i=this.treeAdapter.createElement(t.tagName,a,t.attrs);this._attachElementToTree(i,t.location),this.openElements.push(i,t.tagID)}_insertFakeElement(t,a){let i=this.treeAdapter.createElement(t,m.HTML,[]);this._attachElementToTree(i,null),this.openElements.push(i,a)}_insertTemplate(t){let a=this.treeAdapter.createElement(t.tagName,m.HTML,t.attrs),i=this.treeAdapter.createDocumentFragment();this.treeAdapter.setTemplateContent(a,i),this._attachElementToTree(a,t.location),this.openElements.push(a,t.tagID),this.options.sourceCodeLocationInfo&&this.treeAdapter.setNodeSourceCodeLocation(i,null)}_insertFakeRootElement(){let t=this.treeAdapter.createElement(f.HTML,m.HTML,[]);this.options.sourceCodeLocationInfo&&this.treeAdapter.setNodeSourceCodeLocation(t,null),this.treeAdapter.appendChild(this.openElements.current,t),this.openElements.push(t,s.HTML)}_appendCommentNode(t,a){let i=this.treeAdapter.createCommentNode(t.data);this.treeAdapter.appendChild(a,i),this.options.sourceCodeLocationInfo&&this.treeAdapter.setNodeSourceCodeLocation(i,t.location)}_insertCharacters(t){let a,i;if(this._shouldFosterParentOnInsertion()?({parent:a,beforeElement:i}=this._findFosterParentingLocation(),i?this.treeAdapter.insertTextBefore(a,t.chars,i):this.treeAdapter.insertText(a,t.chars)):(a=this.openElements.currentTmplContentOrNode,this.treeAdapter.insertText(a,t.chars)),!t.location)return;let u=this.treeAdapter.getChildNodes(a),o=i?u.lastIndexOf(i):u.length,h=u[o-1];if(this.treeAdapter.getNodeSourceCodeLocation(h)){let{endLine:E,endCol:T,endOffset:A}=t.location;this.treeAdapter.updateNodeSourceCodeLocation(h,{endLine:E,endCol:T,endOffset:A})}else this.options.sourceCodeLocationInfo&&this.treeAdapter.setNodeSourceCodeLocation(h,t.location)}_adoptNodes(t,a){for(let i=this.treeAdapter.getFirstChild(t);i;i=this.treeAdapter.getFirstChild(t))this.treeAdapter.detachNode(i),this.treeAdapter.appendChild(a,i)}_setEndLocation(t,a){if(this.treeAdapter.getNodeSourceCodeLocation(t)&&a.location){let i=a.location,u=this.treeAdapter.getTagName(t),o=a.type===N.END_TAG&&u===a.tagName?{endTag:{...i},endLine:i.endLine,endCol:i.endCol,endOffset:i.endOffset}:{endLine:i.startLine,endCol:i.startCol,endOffset:i.startOffset};this.treeAdapter.updateNodeSourceCodeLocation(t,o)}}shouldProcessStartTagTokenInForeignContent(t){if(!this.currentNotInHTML)return!1;let a,i;return this.openElements.stackTop===0&&this.fragmentContext?(a=this.fragmentContext,i=this.fragmentContextID):{current:a,currentTagId:i}=this.openElements,t.tagID===s.SVG&&this.treeAdapter.getTagName(a)===f.ANNOTATION_XML&&this.treeAdapter.getNamespaceURI(a)===m.MATHML?!1:this.tokenizer.inForeignNode||(t.tagID===s.MGLYPH||t.tagID===s.MALIGNMARK)&&i!==void 0&&!this._isIntegrationPoint(i,a,m.HTML)}_processToken(t){switch(t.type){case N.CHARACTER:{this.onCharacter(t);break}case N.NULL_CHARACTER:{this.onNullCharacter(t);break}case N.COMMENT:{this.onComment(t);break}case N.DOCTYPE:{this.onDoctype(t);break}case N.START_TAG:{this._processStartTag(t);break}case N.END_TAG:{this.onEndTag(t);break}case N.EOF:{this.onEof(t);break}case N.WHITESPACE_CHARACTER:{this.onWhitespaceCharacter(t);break}}}_isIntegrationPoint(t,a,i){let u=this.treeAdapter.getNamespaceURI(a),o=this.treeAdapter.getAttrList(a);return pa(t,u,o,i)}_reconstructActiveFormattingElements(){let t=this.activeFormattingElements.entries.length;if(t){let a=this.activeFormattingElements.entries.findIndex(u=>u.type===ee.Marker||this.openElements.contains(u.element)),i=a===-1?t-1:a-1;for(let u=i;u>=0;u--){let o=this.activeFormattingElements.entries[u];this._insertElement(o.token,this.treeAdapter.getNamespaceURI(o.element)),o.element=this.openElements.current}}}_closeTableCell(){this.openElements.generateImpliedEndTags(),this.openElements.popUntilTableCellPopped(),this.activeFormattingElements.clearToLastMarker(),this.insertionMode=l.IN_ROW}_closePElement(){this.openElements.generateImpliedEndTagsWithExclusion(s.P),this.openElements.popUntilTagNamePopped(s.P)}_resetInsertionMode(){for(let t=this.openElements.stackTop;t>=0;t--)switch(t===0&&this.fragmentContext?this.fragmentContextID:this.openElements.tagIDs[t]){case s.TR:{this.insertionMode=l.IN_ROW;return}case s.TBODY:case s.THEAD:case s.TFOOT:{this.insertionMode=l.IN_TABLE_BODY;return}case s.CAPTION:{this.insertionMode=l.IN_CAPTION;return}case s.COLGROUP:{this.insertionMode=l.IN_COLUMN_GROUP;return}case s.TABLE:{this.insertionMode=l.IN_TABLE;return}case s.BODY:{this.insertionMode=l.IN_BODY;return}case s.FRAMESET:{this.insertionMode=l.IN_FRAMESET;return}case s.SELECT:{this._resetInsertionModeForSelect(t);return}case s.TEMPLATE:{this.insertionMode=this.tmplInsertionModeStack[0];return}case s.HTML:{this.insertionMode=this.headElement?l.AFTER_HEAD:l.BEFORE_HEAD;return}case s.TD:case s.TH:{if(t>0){this.insertionMode=l.IN_CELL;return}break}case s.HEAD:{if(t>0){this.insertionMode=l.IN_HEAD;return}break}}this.insertionMode=l.IN_BODY}_resetInsertionModeForSelect(t){if(t>0)for(let a=t-1;a>0;a--){let i=this.openElements.tagIDs[a];if(i===s.TEMPLATE)break;if(i===s.TABLE){this.insertionMode=l.IN_SELECT_IN_TABLE;return}}this.insertionMode=l.IN_SELECT}_isElementCausesFosterParenting(t){return _a.has(t)}_shouldFosterParentOnInsertion(){return this.fosterParentingEnabled&&this.openElements.currentTagId!==void 0&&this._isElementCausesFosterParenting(this.openElements.currentTagId)}_findFosterParentingLocation(){for(let t=this.openElements.stackTop;t>=0;t--){let a=this.openElements.items[t];switch(this.openElements.tagIDs[t]){case s.TEMPLATE:{if(this.treeAdapter.getNamespaceURI(a)===m.HTML)return{parent:this.treeAdapter.getTemplateContent(a),beforeElement:null};break}case s.TABLE:{let i=this.treeAdapter.getParentNode(a);return i?{parent:i,beforeElement:a}:{parent:this.openElements.items[t-1],beforeElement:null}}default:}}return{parent:this.openElements.items[0],beforeElement:null}}_fosterParentElement(t){let a=this._findFosterParentingLocation();a.beforeElement?this.treeAdapter.insertBefore(a.parent,t,a.beforeElement):this.treeAdapter.appendChild(a.parent,t)}_isSpecialElement(t,a){let i=this.treeAdapter.getNamespaceURI(t);return zt[i].has(a)}onCharacter(t){if(this.skipNextNewLine=!1,this.tokenizer.inForeignNode){er(this,t);return}switch(this.insertionMode){case l.INITIAL:{Re(this,t);break}case l.BEFORE_HTML:{Pe(this,t);break}case l.BEFORE_HEAD:{ye(this,t);break}case l.IN_HEAD:{ke(this,t);break}case l.IN_HEAD_NO_SCRIPT:{ve(this,t);break}case l.AFTER_HEAD:{Me(this,t);break}case l.IN_BODY:case l.IN_CAPTION:case l.IN_CELL:case l.IN_TEMPLATE:{ga(this,t);break}case l.TEXT:case l.IN_SELECT:case l.IN_SELECT_IN_TABLE:{this._insertCharacters(t);break}case l.IN_TABLE:case l.IN_TABLE_BODY:case l.IN_ROW:{Nt(this,t);break}case l.IN_TABLE_TEXT:{La(this,t);break}case l.IN_COLUMN_GROUP:{tt(this,t);break}case l.AFTER_BODY:{at(this,t);break}case l.AFTER_AFTER_BODY:{et(this,t);break}default:}}onNullCharacter(t){if(this.skipNextNewLine=!1,this.tokenizer.inForeignNode){$u(this,t);return}switch(this.insertionMode){case l.INITIAL:{Re(this,t);break}case l.BEFORE_HTML:{Pe(this,t);break}case l.BEFORE_HEAD:{ye(this,t);break}case l.IN_HEAD:{ke(this,t);break}case l.IN_HEAD_NO_SCRIPT:{ve(this,t);break}case l.AFTER_HEAD:{Me(this,t);break}case l.TEXT:{this._insertCharacters(t);break}case l.IN_TABLE:case l.IN_TABLE_BODY:case l.IN_ROW:{Nt(this,t);break}case l.IN_COLUMN_GROUP:{tt(this,t);break}case l.AFTER_BODY:{at(this,t);break}case l.AFTER_AFTER_BODY:{et(this,t);break}default:}}onComment(t){if(this.skipNextNewLine=!1,this.currentNotInHTML){St(this,t);return}switch(this.insertionMode){case l.INITIAL:case l.BEFORE_HTML:case l.BEFORE_HEAD:case l.IN_HEAD:case l.IN_HEAD_NO_SCRIPT:case l.AFTER_HEAD:case l.IN_BODY:case l.IN_TABLE:case l.IN_CAPTION:case l.IN_COLUMN_GROUP:case l.IN_TABLE_BODY:case l.IN_ROW:case l.IN_CELL:case l.IN_SELECT:case l.IN_SELECT_IN_TABLE:case l.IN_TEMPLATE:case l.IN_FRAMESET:case l.AFTER_FRAMESET:{St(this,t);break}case l.IN_TABLE_TEXT:{De(this,t);break}case l.AFTER_BODY:{Pi(this,t);break}case l.AFTER_AFTER_BODY:case l.AFTER_AFTER_FRAMESET:{yi(this,t);break}default:}}onDoctype(t){switch(this.skipNextNewLine=!1,this.insertionMode){case l.INITIAL:{ki(this,t);break}case l.BEFORE_HEAD:case l.IN_HEAD:case l.IN_HEAD_NO_SCRIPT:case l.AFTER_HEAD:{this._err(t,p.misplacedDoctype);break}case l.IN_TABLE_TEXT:{De(this,t);break}default:}}onStartTag(t){this.skipNextNewLine=!1,this.currentToken=t,this._processStartTag(t),t.selfClosing&&!t.ackSelfClosing&&this._err(t,p.nonVoidHtmlElementStartTagWithTrailingSolidus)}_processStartTag(t){this.shouldProcessStartTagTokenInForeignContent(t)?tr(this,t):this._startTagOutsideForeignContent(t)}_startTagOutsideForeignContent(t){switch(this.insertionMode){case l.INITIAL:{Re(this,t);break}case l.BEFORE_HTML:{vi(this,t);break}case l.BEFORE_HEAD:{Bi(this,t);break}case l.IN_HEAD:{ae(this,t);break}case l.IN_HEAD_NO_SCRIPT:{Ui(this,t);break}case l.AFTER_HEAD:{Vi(this,t);break}case l.IN_BODY:{Y(this,t);break}case l.IN_TABLE:{Ce(this,t);break}case l.IN_TABLE_TEXT:{De(this,t);break}case l.IN_CAPTION:{wu(this,t);break}case l.IN_COLUMN_GROUP:{Dt(this,t);break}case l.IN_TABLE_BODY:{ut(this,t);break}case l.IN_ROW:{rt(this,t);break}case l.IN_CELL:{Hu(this,t);break}case l.IN_SELECT:{Da(this,t);break}case l.IN_SELECT_IN_TABLE:{Yu(this,t);break}case l.IN_TEMPLATE:{Gu(this,t);break}case l.AFTER_BODY:{Qu(this,t);break}case l.IN_FRAMESET:{Ku(this,t);break}case l.AFTER_FRAMESET:{ju(this,t);break}case l.AFTER_AFTER_BODY:{Ju(this,t);break}case l.AFTER_AFTER_FRAMESET:{Zu(this,t);break}default:}}onEndTag(t){this.skipNextNewLine=!1,this.currentToken=t,this.currentNotInHTML?ar(this,t):this._endTagOutsideForeignContent(t)}_endTagOutsideForeignContent(t){switch(this.insertionMode){case l.INITIAL:{Re(this,t);break}case l.BEFORE_HTML:{Mi(this,t);break}case l.BEFORE_HEAD:{wi(this,t);break}case l.IN_HEAD:{Fi(this,t);break}case l.IN_HEAD_NO_SCRIPT:{Hi(this,t);break}case l.AFTER_HEAD:{Yi(this,t);break}case l.IN_BODY:{it(this,t);break}case l.TEXT:{Lu(this,t);break}case l.IN_TABLE:{Be(this,t);break}case l.IN_TABLE_TEXT:{De(this,t);break}case l.IN_CAPTION:{Fu(this,t);break}case l.IN_COLUMN_GROUP:{Uu(this,t);break}case l.IN_TABLE_BODY:{Lt(this,t);break}case l.IN_ROW:{Ra(this,t);break}case l.IN_CELL:{Vu(this,t);break}case l.IN_SELECT:{Pa(this,t);break}case l.IN_SELECT_IN_TABLE:{qu(this,t);break}case l.IN_TEMPLATE:{Wu(this,t);break}case l.AFTER_BODY:{ka(this,t);break}case l.IN_FRAMESET:{Xu(this,t);break}case l.AFTER_FRAMESET:{zu(this,t);break}case l.AFTER_AFTER_BODY:{et(this,t);break}default:}}onEof(t){switch(this.insertionMode){case l.INITIAL:{Re(this,t);break}case l.BEFORE_HTML:{Pe(this,t);break}case l.BEFORE_HEAD:{ye(this,t);break}case l.IN_HEAD:{ke(this,t);break}case l.IN_HEAD_NO_SCRIPT:{ve(this,t);break}case l.AFTER_HEAD:{Me(this,t);break}case l.IN_BODY:case l.IN_TABLE:case l.IN_CAPTION:case l.IN_COLUMN_GROUP:case l.IN_TABLE_BODY:case l.IN_ROW:case l.IN_CELL:case l.IN_SELECT:case l.IN_SELECT_IN_TABLE:{Na(this,t);break}case l.TEXT:{Ou(this,t);break}case l.IN_TABLE_TEXT:{De(this,t);break}case l.IN_TEMPLATE:{ya(this,t);break}case l.AFTER_BODY:case l.IN_FRAMESET:case l.AFTER_FRAMESET:case l.AFTER_AFTER_BODY:case l.AFTER_AFTER_FRAMESET:{Rt(this,t);break}default:}}onWhitespaceCharacter(t){if(this.skipNextNewLine&&(this.skipNextNewLine=!1,t.chars.charCodeAt(0)===n.LINE_FEED)){if(t.chars.length===1)return;t.chars=t.chars.substr(1)}if(this.tokenizer.inForeignNode){this._insertCharacters(t);return}switch(this.insertionMode){case l.IN_HEAD:case l.IN_HEAD_NO_SCRIPT:case l.AFTER_HEAD:case l.TEXT:case l.IN_COLUMN_GROUP:case l.IN_SELECT:case l.IN_SELECT_IN_TABLE:case l.IN_FRAMESET:case l.AFTER_FRAMESET:{this._insertCharacters(t);break}case l.IN_BODY:case l.IN_CAPTION:case l.IN_CELL:case l.IN_TEMPLATE:case l.AFTER_BODY:case l.AFTER_AFTER_BODY:case l.AFTER_AFTER_FRAMESET:{Aa(this,t);break}case l.IN_TABLE:case l.IN_TABLE_BODY:case l.IN_ROW:{Nt(this,t);break}case l.IN_TABLE_TEXT:{Sa(this,t);break}default:}}};function Ni(e,t){let a=e.activeFormattingElements.getElementEntryInScopeWithTagName(t.tagName);return a?e.openElements.contains(a.element)?e.openElements.hasInScope(t.tagID)||(a=null):(e.activeFormattingElements.removeEntry(a),a=null):xa(e,t),a}function Si(e,t){let a=null,i=e.openElements.stackTop;for(;i>=0;i--){let u=e.openElements.items[i];if(u===t.element)break;e._isSpecialElement(u,e.openElements.tagIDs[i])&&(a=u)}return a||(e.openElements.shortenToLength(Math.max(i,0)),e.activeFormattingElements.removeEntry(t)),a}function Li(e,t,a){let i=t,u=e.openElements.getCommonAncestor(t);for(let o=0,h=u;h!==a;o++,h=u){u=e.openElements.getCommonAncestor(h);let d=e.activeFormattingElements.getElementEntry(h),E=d&&o>=Ii;!d||E?(E&&e.activeFormattingElements.removeEntry(d),e.openElements.remove(h)):(h=Oi(e,d),i===t&&(e.activeFormattingElements.bookmark=d),e.treeAdapter.detachNode(i),e.treeAdapter.appendChild(h,i),i=h)}return i}function Oi(e,t){let a=e.treeAdapter.getNamespaceURI(t.element),i=e.treeAdapter.createElement(t.token.tagName,a,t.token.attrs);return e.openElements.replace(t.element,i),t.element=i,i}function Ri(e,t,a){let i=e.treeAdapter.getTagName(t),u=me(i);if(e._isElementCausesFosterParenting(u))e._fosterParentElement(a);else{let o=e.treeAdapter.getNamespaceURI(t);u===s.TEMPLATE&&o===m.HTML&&(t=e.treeAdapter.getTemplateContent(t)),e.treeAdapter.appendChild(t,a)}}function Di(e,t,a){let i=e.treeAdapter.getNamespaceURI(a.element),{token:u}=a,o=e.treeAdapter.createElement(u.tagName,i,u.attrs);e._adoptNodes(t,o),e.treeAdapter.appendChild(t,o),e.activeFormattingElements.insertElementAfterBookmark(o,u),e.activeFormattingElements.removeEntry(a),e.openElements.remove(a.element),e.openElements.insertAfter(t,o,u.tagID)}function Ot(e,t){for(let a=0;a<Ci;a++){let i=Ni(e,t);if(!i)break;let u=Si(e,i);if(!u)break;e.activeFormattingElements.bookmark=i;let o=Li(e,u,i.element),h=e.openElements.getCommonAncestor(i.element);e.treeAdapter.detachNode(o),h&&Ri(e,h,o),Di(e,u,i)}}function St(e,t){e._appendCommentNode(t,e.openElements.currentTmplContentOrNode)}function Pi(e,t){e._appendCommentNode(t,e.openElements.items[0])}function yi(e,t){e._appendCommentNode(t,e.document)}function Rt(e,t){if(e.stopped=!0,t.location){let a=e.fragmentContext?0:2;for(let i=e.openElements.stackTop;i>=a;i--)e._setEndLocation(e.openElements.items[i],t);if(!e.fragmentContext&&e.openElements.stackTop>=0){let i=e.openElements.items[0],u=e.treeAdapter.getNodeSourceCodeLocation(i);if(u&&!u.endTag&&(e._setEndLocation(i,t),e.openElements.stackTop>=1)){let o=e.openElements.items[1],h=e.treeAdapter.getNodeSourceCodeLocation(o);h&&!h.endTag&&e._setEndLocation(o,t)}}}}function ki(e,t){e._setDocumentType(t);let a=t.forceQuirks?W.QUIRKS:ha(t);ca(t)||e._err(t,p.nonConformingDoctype),e.treeAdapter.setDocumentMode(e.document,a),e.insertionMode=l.BEFORE_HTML}function Re(e,t){e._err(t,p.missingDoctype,!0),e.treeAdapter.setDocumentMode(e.document,W.QUIRKS),e.insertionMode=l.BEFORE_HTML,e._processToken(t)}function vi(e,t){t.tagID===s.HTML?(e._insertElement(t,m.HTML),e.insertionMode=l.BEFORE_HEAD):Pe(e,t)}function Mi(e,t){let a=t.tagID;(a===s.HTML||a===s.HEAD||a===s.BODY||a===s.BR)&&Pe(e,t)}function Pe(e,t){e._insertFakeRootElement(),e.insertionMode=l.BEFORE_HEAD,e._processToken(t)}function Bi(e,t){switch(t.tagID){case s.HTML:{Y(e,t);break}case s.HEAD:{e._insertElement(t,m.HTML),e.headElement=e.openElements.current,e.insertionMode=l.IN_HEAD;break}default:ye(e,t)}}function wi(e,t){let a=t.tagID;a===s.HEAD||a===s.BODY||a===s.HTML||a===s.BR?ye(e,t):e._err(t,p.endTagWithoutMatchingOpenElement)}function ye(e,t){e._insertFakeElement(f.HEAD,s.HEAD),e.headElement=e.openElements.current,e.insertionMode=l.IN_HEAD,e._processToken(t)}function ae(e,t){switch(t.tagID){case s.HTML:{Y(e,t);break}case s.BASE:case s.BASEFONT:case s.BGSOUND:case s.LINK:case s.META:{e._appendElement(t,m.HTML),t.ackSelfClosing=!0;break}case s.TITLE:{e._switchToTextParsing(t,V.RCDATA);break}case s.NOSCRIPT:{e.options.scriptingEnabled?e._switchToTextParsing(t,V.RAWTEXT):(e._insertElement(t,m.HTML),e.insertionMode=l.IN_HEAD_NO_SCRIPT);break}case s.NOFRAMES:case s.STYLE:{e._switchToTextParsing(t,V.RAWTEXT);break}case s.SCRIPT:{e._switchToTextParsing(t,V.SCRIPT_DATA);break}case s.TEMPLATE:{e._insertTemplate(t),e.activeFormattingElements.insertMarker(),e.framesetOk=!1,e.insertionMode=l.IN_TEMPLATE,e.tmplInsertionModeStack.unshift(l.IN_TEMPLATE);break}case s.HEAD:{e._err(t,p.misplacedStartTagForHeadElement);break}default:ke(e,t)}}function Fi(e,t){switch(t.tagID){case s.HEAD:{e.openElements.pop(),e.insertionMode=l.AFTER_HEAD;break}case s.BODY:case s.BR:case s.HTML:{ke(e,t);break}case s.TEMPLATE:{Te(e,t);break}default:e._err(t,p.endTagWithoutMatchingOpenElement)}}function Te(e,t){e.openElements.tmplCount>0?(e.openElements.generateImpliedEndTagsThoroughly(),e.openElements.currentTagId!==s.TEMPLATE&&e._err(t,p.closingOfElementWithOpenChildElements),e.openElements.popUntilTagNamePopped(s.TEMPLATE),e.activeFormattingElements.clearToLastMarker(),e.tmplInsertionModeStack.shift(),e._resetInsertionMode()):e._err(t,p.endTagWithoutMatchingOpenElement)}function ke(e,t){e.openElements.pop(),e.insertionMode=l.AFTER_HEAD,e._processToken(t)}function Ui(e,t){switch(t.tagID){case s.HTML:{Y(e,t);break}case s.BASEFONT:case s.BGSOUND:case s.HEAD:case s.LINK:case s.META:case s.NOFRAMES:case s.STYLE:{ae(e,t);break}case s.NOSCRIPT:{e._err(t,p.nestedNoscriptInHead);break}default:ve(e,t)}}function Hi(e,t){switch(t.tagID){case s.NOSCRIPT:{e.openElements.pop(),e.insertionMode=l.IN_HEAD;break}case s.BR:{ve(e,t);break}default:e._err(t,p.endTagWithoutMatchingOpenElement)}}function ve(e,t){let a=t.type===N.EOF?p.openElementsLeftAfterEof:p.disallowedContentInNoscriptInHead;e._err(t,a),e.openElements.pop(),e.insertionMode=l.IN_HEAD,e._processToken(t)}function Vi(e,t){switch(t.tagID){case s.HTML:{Y(e,t);break}case s.BODY:{e._insertElement(t,m.HTML),e.framesetOk=!1,e.insertionMode=l.IN_BODY;break}case s.FRAMESET:{e._insertElement(t,m.HTML),e.insertionMode=l.IN_FRAMESET;break}case s.BASE:case s.BASEFONT:case s.BGSOUND:case s.LINK:case s.META:case s.NOFRAMES:case s.SCRIPT:case s.STYLE:case s.TEMPLATE:case s.TITLE:{e._err(t,p.abandonedHeadElementChild),e.openElements.push(e.headElement,s.HEAD),ae(e,t),e.openElements.remove(e.headElement);break}case s.HEAD:{e._err(t,p.misplacedStartTagForHeadElement);break}default:Me(e,t)}}function Yi(e,t){switch(t.tagID){case s.BODY:case s.HTML:case s.BR:{Me(e,t);break}case s.TEMPLATE:{Te(e,t);break}default:e._err(t,p.endTagWithoutMatchingOpenElement)}}function Me(e,t){e._insertFakeElement(f.BODY,s.BODY),e.insertionMode=l.IN_BODY,st(e,t)}function st(e,t){switch(t.type){case N.CHARACTER:{ga(e,t);break}case N.WHITESPACE_CHARACTER:{Aa(e,t);break}case N.COMMENT:{St(e,t);break}case N.START_TAG:{Y(e,t);break}case N.END_TAG:{it(e,t);break}case N.EOF:{Na(e,t);break}default:}}function Aa(e,t){e._reconstructActiveFormattingElements(),e._insertCharacters(t)}function ga(e,t){e._reconstructActiveFormattingElements(),e._insertCharacters(t),e.framesetOk=!1}function qi(e,t){e.openElements.tmplCount===0&&e.treeAdapter.adoptAttributes(e.openElements.items[0],t.attrs)}function Gi(e,t){let a=e.openElements.tryPeekProperlyNestedBodyElement();a&&e.openElements.tmplCount===0&&(e.framesetOk=!1,e.treeAdapter.adoptAttributes(a,t.attrs))}function Wi(e,t){let a=e.openElements.tryPeekProperlyNestedBodyElement();e.framesetOk&&a&&(e.treeAdapter.detachNode(a),e.openElements.popAllUpToHtmlElement(),e._insertElement(t,m.HTML),e.insertionMode=l.IN_FRAMESET)}function Qi(e,t){e.openElements.hasInButtonScope(s.P)&&e._closePElement(),e._insertElement(t,m.HTML)}function Ki(e,t){e.openElements.hasInButtonScope(s.P)&&e._closePElement(),e.openElements.currentTagId!==void 0&&Se.has(e.openElements.currentTagId)&&e.openElements.pop(),e._insertElement(t,m.HTML)}function Xi(e,t){e.openElements.hasInButtonScope(s.P)&&e._closePElement(),e._insertElement(t,m.HTML),e.skipNextNewLine=!0,e.framesetOk=!1}function ji(e,t){let a=e.openElements.tmplCount>0;(!e.formElement||a)&&(e.openElements.hasInButtonScope(s.P)&&e._closePElement(),e._insertElement(t,m.HTML),a||(e.formElement=e.openElements.current))}function zi(e,t){e.framesetOk=!1;let a=t.tagID;for(let i=e.openElements.stackTop;i>=0;i--){let u=e.openElements.tagIDs[i];if(a===s.LI&&u===s.LI||(a===s.DD||a===s.DT)&&(u===s.DD||u===s.DT)){e.openElements.generateImpliedEndTagsWithExclusion(u),e.openElements.popUntilTagNamePopped(u);break}if(u!==s.ADDRESS&&u!==s.DIV&&u!==s.P&&e._isSpecialElement(e.openElements.items[i],u))break}e.openElements.hasInButtonScope(s.P)&&e._closePElement(),e._insertElement(t,m.HTML)}function Ji(e,t){e.openElements.hasInButtonScope(s.P)&&e._closePElement(),e._insertElement(t,m.HTML),e.tokenizer.state=V.PLAINTEXT}function Zi(e,t){e.openElements.hasInScope(s.BUTTON)&&(e.openElements.generateImpliedEndTags(),e.openElements.popUntilTagNamePopped(s.BUTTON)),e._reconstructActiveFormattingElements(),e._insertElement(t,m.HTML),e.framesetOk=!1}function $i(e,t){let a=e.activeFormattingElements.getElementEntryInScopeWithTagName(f.A);a&&(Ot(e,t),e.openElements.remove(a.element),e.activeFormattingElements.removeEntry(a)),e._reconstructActiveFormattingElements(),e._insertElement(t,m.HTML),e.activeFormattingElements.pushElement(e.openElements.current,t)}function eu(e,t){e._reconstructActiveFormattingElements(),e._insertElement(t,m.HTML),e.activeFormattingElements.pushElement(e.openElements.current,t)}function tu(e,t){e._reconstructActiveFormattingElements(),e.openElements.hasInScope(s.NOBR)&&(Ot(e,t),e._reconstructActiveFormattingElements()),e._insertElement(t,m.HTML),e.activeFormattingElements.pushElement(e.openElements.current,t)}function au(e,t){e._reconstructActiveFormattingElements(),e._insertElement(t,m.HTML),e.activeFormattingElements.insertMarker(),e.framesetOk=!1}function su(e,t){e.treeAdapter.getDocumentMode(e.document)!==W.QUIRKS&&e.openElements.hasInButtonScope(s.P)&&e._closePElement(),e._insertElement(t,m.HTML),e.framesetOk=!1,e.insertionMode=l.IN_TABLE}function Ca(e,t){e._reconstructActiveFormattingElements(),e._appendElement(t,m.HTML),e.framesetOk=!1,t.ackSelfClosing=!0}function Ia(e){let t=Qe(e,ne.TYPE);return t!=null&&t.toLowerCase()===gi}function iu(e,t){e._reconstructActiveFormattingElements(),e._appendElement(t,m.HTML),Ia(t)||(e.framesetOk=!1),t.ackSelfClosing=!0}function uu(e,t){e._appendElement(t,m.HTML),t.ackSelfClosing=!0}function ru(e,t){e.openElements.hasInButtonScope(s.P)&&e._closePElement(),e._appendElement(t,m.HTML),e.framesetOk=!1,t.ackSelfClosing=!0}function nu(e,t){t.tagName=f.IMG,t.tagID=s.IMG,Ca(e,t)}function ou(e,t){e._insertElement(t,m.HTML),e.skipNextNewLine=!0,e.tokenizer.state=V.RCDATA,e.originalInsertionMode=e.insertionMode,e.framesetOk=!1,e.insertionMode=l.TEXT}function cu(e,t){e.openElements.hasInButtonScope(s.P)&&e._closePElement(),e._reconstructActiveFormattingElements(),e.framesetOk=!1,e._switchToTextParsing(t,V.RAWTEXT)}function hu(e,t){e.framesetOk=!1,e._switchToTextParsing(t,V.RAWTEXT)}function Ta(e,t){e._switchToTextParsing(t,V.RAWTEXT)}function lu(e,t){e._reconstructActiveFormattingElements(),e._insertElement(t,m.HTML),e.framesetOk=!1,e.insertionMode=e.insertionMode===l.IN_TABLE||e.insertionMode===l.IN_CAPTION||e.insertionMode===l.IN_TABLE_BODY||e.insertionMode===l.IN_ROW||e.insertionMode===l.IN_CELL?l.IN_SELECT_IN_TABLE:l.IN_SELECT}function fu(e,t){e.openElements.currentTagId===s.OPTION&&e.openElements.pop(),e._reconstructActiveFormattingElements(),e._insertElement(t,m.HTML)}function du(e,t){e.openElements.hasInScope(s.RUBY)&&e.openElements.generateImpliedEndTags(),e._insertElement(t,m.HTML)}function pu(e,t){e.openElements.hasInScope(s.RUBY)&&e.openElements.generateImpliedEndTagsWithExclusion(s.RTC),e._insertElement(t,m.HTML)}function Eu(e,t){e._reconstructActiveFormattingElements(),It(t),$e(t),t.selfClosing?e._appendElement(t,m.MATHML):e._insertElement(t,m.MATHML),t.ackSelfClosing=!0}function mu(e,t){e._reconstructActiveFormattingElements(),xt(t),$e(t),t.selfClosing?e._appendElement(t,m.SVG):e._insertElement(t,m.SVG),t.ackSelfClosing=!0}function ba(e,t){e._reconstructActiveFormattingElements(),e._insertElement(t,m.HTML)}function Y(e,t){switch(t.tagID){case s.I:case s.S:case s.B:case s.U:case s.EM:case s.TT:case s.BIG:case s.CODE:case s.FONT:case s.SMALL:case s.STRIKE:case s.STRONG:{eu(e,t);break}case s.A:{$i(e,t);break}case s.H1:case s.H2:case s.H3:case s.H4:case s.H5:case s.H6:{Ki(e,t);break}case s.P:case s.DL:case s.OL:case s.UL:case s.DIV:case s.DIR:case s.NAV:case s.MAIN:case s.MENU:case s.ASIDE:case s.CENTER:case s.FIGURE:case s.FOOTER:case s.HEADER:case s.HGROUP:case s.DIALOG:case s.DETAILS:case s.ADDRESS:case s.ARTICLE:case s.SEARCH:case s.SECTION:case s.SUMMARY:case s.FIELDSET:case s.BLOCKQUOTE:case s.FIGCAPTION:{Qi(e,t);break}case s.LI:case s.DD:case s.DT:{zi(e,t);break}case s.BR:case s.IMG:case s.WBR:case s.AREA:case s.EMBED:case s.KEYGEN:{Ca(e,t);break}case s.HR:{ru(e,t);break}case s.RB:case s.RTC:{du(e,t);break}case s.RT:case s.RP:{pu(e,t);break}case s.PRE:case s.LISTING:{Xi(e,t);break}case s.XMP:{cu(e,t);break}case s.SVG:{mu(e,t);break}case s.HTML:{qi(e,t);break}case s.BASE:case s.LINK:case s.META:case s.STYLE:case s.TITLE:case s.SCRIPT:case s.BGSOUND:case s.BASEFONT:case s.TEMPLATE:{ae(e,t);break}case s.BODY:{Gi(e,t);break}case s.FORM:{ji(e,t);break}case s.NOBR:{tu(e,t);break}case s.MATH:{Eu(e,t);break}case s.TABLE:{su(e,t);break}case s.INPUT:{iu(e,t);break}case s.PARAM:case s.TRACK:case s.SOURCE:{uu(e,t);break}case s.IMAGE:{nu(e,t);break}case s.BUTTON:{Zi(e,t);break}case s.APPLET:case s.OBJECT:case s.MARQUEE:{au(e,t);break}case s.IFRAME:{hu(e,t);break}case s.SELECT:{lu(e,t);break}case s.OPTION:case s.OPTGROUP:{fu(e,t);break}case s.NOEMBED:case s.NOFRAMES:{Ta(e,t);break}case s.FRAMESET:{Wi(e,t);break}case s.TEXTAREA:{ou(e,t);break}case s.NOSCRIPT:{e.options.scriptingEnabled?Ta(e,t):ba(e,t);break}case s.PLAINTEXT:{Ji(e,t);break}case s.COL:case s.TH:case s.TD:case s.TR:case s.HEAD:case s.FRAME:case s.TBODY:case s.TFOOT:case s.THEAD:case s.CAPTION:case s.COLGROUP:break;default:ba(e,t)}}function Tu(e,t){if(e.openElements.hasInScope(s.BODY)&&(e.insertionMode=l.AFTER_BODY,e.options.sourceCodeLocationInfo)){let a=e.openElements.tryPeekProperlyNestedBodyElement();a&&e._setEndLocation(a,t)}}function bu(e,t){e.openElements.hasInScope(s.BODY)&&(e.insertionMode=l.AFTER_BODY,ka(e,t))}function _u(e,t){let a=t.tagID;e.openElements.hasInScope(a)&&(e.openElements.generateImpliedEndTags(),e.openElements.popUntilTagNamePopped(a))}function Au(e){let t=e.openElements.tmplCount>0,{formElement:a}=e;t||(e.formElement=null),(a||t)&&e.openElements.hasInScope(s.FORM)&&(e.openElements.generateImpliedEndTags(),t?e.openElements.popUntilTagNamePopped(s.FORM):a&&e.openElements.remove(a))}function gu(e){e.openElements.hasInButtonScope(s.P)||e._insertFakeElement(f.P,s.P),e._closePElement()}function Cu(e){e.openElements.hasInListItemScope(s.LI)&&(e.openElements.generateImpliedEndTagsWithExclusion(s.LI),e.openElements.popUntilTagNamePopped(s.LI))}function Iu(e,t){let a=t.tagID;e.openElements.hasInScope(a)&&(e.openElements.generateImpliedEndTagsWithExclusion(a),e.openElements.popUntilTagNamePopped(a))}function xu(e){e.openElements.hasNumberedHeaderInScope()&&(e.openElements.generateImpliedEndTags(),e.openElements.popUntilNumberedHeaderPopped())}function Nu(e,t){let a=t.tagID;e.openElements.hasInScope(a)&&(e.openElements.generateImpliedEndTags(),e.openElements.popUntilTagNamePopped(a),e.activeFormattingElements.clearToLastMarker())}function Su(e){e._reconstructActiveFormattingElements(),e._insertFakeElement(f.BR,s.BR),e.openElements.pop(),e.framesetOk=!1}function xa(e,t){let a=t.tagName,i=t.tagID;for(let u=e.openElements.stackTop;u>0;u--){let o=e.openElements.items[u],h=e.openElements.tagIDs[u];if(i===h&&(i!==s.UNKNOWN||e.treeAdapter.getTagName(o)===a)){e.openElements.generateImpliedEndTagsWithExclusion(i),e.openElements.stackTop>=u&&e.openElements.shortenToLength(u);break}if(e._isSpecialElement(o,h))break}}function it(e,t){switch(t.tagID){case s.A:case s.B:case s.I:case s.S:case s.U:case s.EM:case s.TT:case s.BIG:case s.CODE:case s.FONT:case s.NOBR:case s.SMALL:case s.STRIKE:case s.STRONG:{Ot(e,t);break}case s.P:{gu(e);break}case s.DL:case s.UL:case s.OL:case s.DIR:case s.DIV:case s.NAV:case s.PRE:case s.MAIN:case s.MENU:case s.ASIDE:case s.BUTTON:case s.CENTER:case s.FIGURE:case s.FOOTER:case s.HEADER:case s.HGROUP:case s.DIALOG:case s.ADDRESS:case s.ARTICLE:case s.DETAILS:case s.SEARCH:case s.SECTION:case s.SUMMARY:case s.LISTING:case s.FIELDSET:case s.BLOCKQUOTE:case s.FIGCAPTION:{_u(e,t);break}case s.LI:{Cu(e);break}case s.DD:case s.DT:{Iu(e,t);break}case s.H1:case s.H2:case s.H3:case s.H4:case s.H5:case s.H6:{xu(e);break}case s.BR:{Su(e);break}case s.BODY:{Tu(e,t);break}case s.HTML:{bu(e,t);break}case s.FORM:{Au(e);break}case s.APPLET:case s.OBJECT:case s.MARQUEE:{Nu(e,t);break}case s.TEMPLATE:{Te(e,t);break}default:xa(e,t)}}function Na(e,t){e.tmplInsertionModeStack.length>0?ya(e,t):Rt(e,t)}function Lu(e,t){var a;t.tagID===s.SCRIPT&&((a=e.scriptHandler)===null||a===void 0||a.call(e,e.openElements.current)),e.openElements.pop(),e.insertionMode=e.originalInsertionMode}function Ou(e,t){e._err(t,p.eofInElementThatCanContainOnlyText),e.openElements.pop(),e.insertionMode=e.originalInsertionMode,e.onEof(t)}function Nt(e,t){if(e.openElements.currentTagId!==void 0&&_a.has(e.openElements.currentTagId))switch(e.pendingCharacterTokens.length=0,e.hasNonWhitespacePendingCharacterToken=!1,e.originalInsertionMode=e.insertionMode,e.insertionMode=l.IN_TABLE_TEXT,t.type){case N.CHARACTER:{La(e,t);break}case N.WHITESPACE_CHARACTER:{Sa(e,t);break}}else we(e,t)}function Ru(e,t){e.openElements.clearBackToTableContext(),e.activeFormattingElements.insertMarker(),e._insertElement(t,m.HTML),e.insertionMode=l.IN_CAPTION}function Du(e,t){e.openElements.clearBackToTableContext(),e._insertElement(t,m.HTML),e.insertionMode=l.IN_COLUMN_GROUP}function Pu(e,t){e.openElements.clearBackToTableContext(),e._insertFakeElement(f.COLGROUP,s.COLGROUP),e.insertionMode=l.IN_COLUMN_GROUP,Dt(e,t)}function yu(e,t){e.openElements.clearBackToTableContext(),e._insertElement(t,m.HTML),e.insertionMode=l.IN_TABLE_BODY}function ku(e,t){e.openElements.clearBackToTableContext(),e._insertFakeElement(f.TBODY,s.TBODY),e.insertionMode=l.IN_TABLE_BODY,ut(e,t)}function vu(e,t){e.openElements.hasInTableScope(s.TABLE)&&(e.openElements.popUntilTagNamePopped(s.TABLE),e._resetInsertionMode(),e._processStartTag(t))}function Mu(e,t){Ia(t)?e._appendElement(t,m.HTML):we(e,t),t.ackSelfClosing=!0}function Bu(e,t){!e.formElement&&e.openElements.tmplCount===0&&(e._insertElement(t,m.HTML),e.formElement=e.openElements.current,e.openElements.pop())}function Ce(e,t){switch(t.tagID){case s.TD:case s.TH:case s.TR:{ku(e,t);break}case s.STYLE:case s.SCRIPT:case s.TEMPLATE:{ae(e,t);break}case s.COL:{Pu(e,t);break}case s.FORM:{Bu(e,t);break}case s.TABLE:{vu(e,t);break}case s.TBODY:case s.TFOOT:case s.THEAD:{yu(e,t);break}case s.INPUT:{Mu(e,t);break}case s.CAPTION:{Ru(e,t);break}case s.COLGROUP:{Du(e,t);break}default:we(e,t)}}function Be(e,t){switch(t.tagID){case s.TABLE:{e.openElements.hasInTableScope(s.TABLE)&&(e.openElements.popUntilTagNamePopped(s.TABLE),e._resetInsertionMode());break}case s.TEMPLATE:{Te(e,t);break}case s.BODY:case s.CAPTION:case s.COL:case s.COLGROUP:case s.HTML:case s.TBODY:case s.TD:case s.TFOOT:case s.TH:case s.THEAD:case s.TR:break;default:we(e,t)}}function we(e,t){let a=e.fosterParentingEnabled;e.fosterParentingEnabled=!0,st(e,t),e.fosterParentingEnabled=a}function Sa(e,t){e.pendingCharacterTokens.push(t)}function La(e,t){e.pendingCharacterTokens.push(t),e.hasNonWhitespacePendingCharacterToken=!0}function De(e,t){let a=0;if(e.hasNonWhitespacePendingCharacterToken)for(;a<e.pendingCharacterTokens.length;a++)we(e,e.pendingCharacterTokens[a]);else for(;a<e.pendingCharacterTokens.length;a++)e._insertCharacters(e.pendingCharacterTokens[a]);e.insertionMode=e.originalInsertionMode,e._processToken(t)}var Oa=new Set([s.CAPTION,s.COL,s.COLGROUP,s.TBODY,s.TD,s.TFOOT,s.TH,s.THEAD,s.TR]);function wu(e,t){let a=t.tagID;Oa.has(a)?e.openElements.hasInTableScope(s.CAPTION)&&(e.openElements.generateImpliedEndTags(),e.openElements.popUntilTagNamePopped(s.CAPTION),e.activeFormattingElements.clearToLastMarker(),e.insertionMode=l.IN_TABLE,Ce(e,t)):Y(e,t)}function Fu(e,t){let a=t.tagID;switch(a){case s.CAPTION:case s.TABLE:{e.openElements.hasInTableScope(s.CAPTION)&&(e.openElements.generateImpliedEndTags(),e.openElements.popUntilTagNamePopped(s.CAPTION),e.activeFormattingElements.clearToLastMarker(),e.insertionMode=l.IN_TABLE,a===s.TABLE&&Be(e,t));break}case s.BODY:case s.COL:case s.COLGROUP:case s.HTML:case s.TBODY:case s.TD:case s.TFOOT:case s.TH:case s.THEAD:case s.TR:break;default:it(e,t)}}function Dt(e,t){switch(t.tagID){case s.HTML:{Y(e,t);break}case s.COL:{e._appendElement(t,m.HTML),t.ackSelfClosing=!0;break}case s.TEMPLATE:{ae(e,t);break}default:tt(e,t)}}function Uu(e,t){switch(t.tagID){case s.COLGROUP:{e.openElements.currentTagId===s.COLGROUP&&(e.openElements.pop(),e.insertionMode=l.IN_TABLE);break}case s.TEMPLATE:{Te(e,t);break}case s.COL:break;default:tt(e,t)}}function tt(e,t){e.openElements.currentTagId===s.COLGROUP&&(e.openElements.pop(),e.insertionMode=l.IN_TABLE,e._processToken(t))}function ut(e,t){switch(t.tagID){case s.TR:{e.openElements.clearBackToTableBodyContext(),e._insertElement(t,m.HTML),e.insertionMode=l.IN_ROW;break}case s.TH:case s.TD:{e.openElements.clearBackToTableBodyContext(),e._insertFakeElement(f.TR,s.TR),e.insertionMode=l.IN_ROW,rt(e,t);break}case s.CAPTION:case s.COL:case s.COLGROUP:case s.TBODY:case s.TFOOT:case s.THEAD:{e.openElements.hasTableBodyContextInTableScope()&&(e.openElements.clearBackToTableBodyContext(),e.openElements.pop(),e.insertionMode=l.IN_TABLE,Ce(e,t));break}default:Ce(e,t)}}function Lt(e,t){let a=t.tagID;switch(t.tagID){case s.TBODY:case s.TFOOT:case s.THEAD:{e.openElements.hasInTableScope(a)&&(e.openElements.clearBackToTableBodyContext(),e.openElements.pop(),e.insertionMode=l.IN_TABLE);break}case s.TABLE:{e.openElements.hasTableBodyContextInTableScope()&&(e.openElements.clearBackToTableBodyContext(),e.openElements.pop(),e.insertionMode=l.IN_TABLE,Be(e,t));break}case s.BODY:case s.CAPTION:case s.COL:case s.COLGROUP:case s.HTML:case s.TD:case s.TH:case s.TR:break;default:Be(e,t)}}function rt(e,t){switch(t.tagID){case s.TH:case s.TD:{e.openElements.clearBackToTableRowContext(),e._insertElement(t,m.HTML),e.insertionMode=l.IN_CELL,e.activeFormattingElements.insertMarker();break}case s.CAPTION:case s.COL:case s.COLGROUP:case s.TBODY:case s.TFOOT:case s.THEAD:case s.TR:{e.openElements.hasInTableScope(s.TR)&&(e.openElements.clearBackToTableRowContext(),e.openElements.pop(),e.insertionMode=l.IN_TABLE_BODY,ut(e,t));break}default:Ce(e,t)}}function Ra(e,t){switch(t.tagID){case s.TR:{e.openElements.hasInTableScope(s.TR)&&(e.openElements.clearBackToTableRowContext(),e.openElements.pop(),e.insertionMode=l.IN_TABLE_BODY);break}case s.TABLE:{e.openElements.hasInTableScope(s.TR)&&(e.openElements.clearBackToTableRowContext(),e.openElements.pop(),e.insertionMode=l.IN_TABLE_BODY,Lt(e,t));break}case s.TBODY:case s.TFOOT:case s.THEAD:{(e.openElements.hasInTableScope(t.tagID)||e.openElements.hasInTableScope(s.TR))&&(e.openElements.clearBackToTableRowContext(),e.openElements.pop(),e.insertionMode=l.IN_TABLE_BODY,Lt(e,t));break}case s.BODY:case s.CAPTION:case s.COL:case s.COLGROUP:case s.HTML:case s.TD:case s.TH:break;default:Be(e,t)}}function Hu(e,t){let a=t.tagID;Oa.has(a)?(e.openElements.hasInTableScope(s.TD)||e.openElements.hasInTableScope(s.TH))&&(e._closeTableCell(),rt(e,t)):Y(e,t)}function Vu(e,t){let a=t.tagID;switch(a){case s.TD:case s.TH:{e.openElements.hasInTableScope(a)&&(e.openElements.generateImpliedEndTags(),e.openElements.popUntilTagNamePopped(a),e.activeFormattingElements.clearToLastMarker(),e.insertionMode=l.IN_ROW);break}case s.TABLE:case s.TBODY:case s.TFOOT:case s.THEAD:case s.TR:{e.openElements.hasInTableScope(a)&&(e._closeTableCell(),Ra(e,t));break}case s.BODY:case s.CAPTION:case s.COL:case s.COLGROUP:case s.HTML:break;default:it(e,t)}}function Da(e,t){switch(t.tagID){case s.HTML:{Y(e,t);break}case s.OPTION:{e.openElements.currentTagId===s.OPTION&&e.openElements.pop(),e._insertElement(t,m.HTML);break}case s.OPTGROUP:{e.openElements.currentTagId===s.OPTION&&e.openElements.pop(),e.openElements.currentTagId===s.OPTGROUP&&e.openElements.pop(),e._insertElement(t,m.HTML);break}case s.HR:{e.openElements.currentTagId===s.OPTION&&e.openElements.pop(),e.openElements.currentTagId===s.OPTGROUP&&e.openElements.pop(),e._appendElement(t,m.HTML),t.ackSelfClosing=!0;break}case s.INPUT:case s.KEYGEN:case s.TEXTAREA:case s.SELECT:{e.openElements.hasInSelectScope(s.SELECT)&&(e.openElements.popUntilTagNamePopped(s.SELECT),e._resetInsertionMode(),t.tagID!==s.SELECT&&e._processStartTag(t));break}case s.SCRIPT:case s.TEMPLATE:{ae(e,t);break}default:}}function Pa(e,t){switch(t.tagID){case s.OPTGROUP:{e.openElements.stackTop>0&&e.openElements.currentTagId===s.OPTION&&e.openElements.tagIDs[e.openElements.stackTop-1]===s.OPTGROUP&&e.openElements.pop(),e.openElements.currentTagId===s.OPTGROUP&&e.openElements.pop();break}case s.OPTION:{e.openElements.currentTagId===s.OPTION&&e.openElements.pop();break}case s.SELECT:{e.openElements.hasInSelectScope(s.SELECT)&&(e.openElements.popUntilTagNamePopped(s.SELECT),e._resetInsertionMode());break}case s.TEMPLATE:{Te(e,t);break}default:}}function Yu(e,t){let a=t.tagID;a===s.CAPTION||a===s.TABLE||a===s.TBODY||a===s.TFOOT||a===s.THEAD||a===s.TR||a===s.TD||a===s.TH?(e.openElements.popUntilTagNamePopped(s.SELECT),e._resetInsertionMode(),e._processStartTag(t)):Da(e,t)}function qu(e,t){let a=t.tagID;a===s.CAPTION||a===s.TABLE||a===s.TBODY||a===s.TFOOT||a===s.THEAD||a===s.TR||a===s.TD||a===s.TH?e.openElements.hasInTableScope(a)&&(e.openElements.popUntilTagNamePopped(s.SELECT),e._resetInsertionMode(),e.onEndTag(t)):Pa(e,t)}function Gu(e,t){switch(t.tagID){case s.BASE:case s.BASEFONT:case s.BGSOUND:case s.LINK:case s.META:case s.NOFRAMES:case s.SCRIPT:case s.STYLE:case s.TEMPLATE:case s.TITLE:{ae(e,t);break}case s.CAPTION:case s.COLGROUP:case s.TBODY:case s.TFOOT:case s.THEAD:{e.tmplInsertionModeStack[0]=l.IN_TABLE,e.insertionMode=l.IN_TABLE,Ce(e,t);break}case s.COL:{e.tmplInsertionModeStack[0]=l.IN_COLUMN_GROUP,e.insertionMode=l.IN_COLUMN_GROUP,Dt(e,t);break}case s.TR:{e.tmplInsertionModeStack[0]=l.IN_TABLE_BODY,e.insertionMode=l.IN_TABLE_BODY,ut(e,t);break}case s.TD:case s.TH:{e.tmplInsertionModeStack[0]=l.IN_ROW,e.insertionMode=l.IN_ROW,rt(e,t);break}default:e.tmplInsertionModeStack[0]=l.IN_BODY,e.insertionMode=l.IN_BODY,Y(e,t)}}function Wu(e,t){t.tagID===s.TEMPLATE&&Te(e,t)}function ya(e,t){e.openElements.tmplCount>0?(e.openElements.popUntilTagNamePopped(s.TEMPLATE),e.activeFormattingElements.clearToLastMarker(),e.tmplInsertionModeStack.shift(),e._resetInsertionMode(),e.onEof(t)):Rt(e,t)}function Qu(e,t){t.tagID===s.HTML?Y(e,t):at(e,t)}function ka(e,t){var a;if(t.tagID===s.HTML){if(e.fragmentContext||(e.insertionMode=l.AFTER_AFTER_BODY),e.options.sourceCodeLocationInfo&&e.openElements.tagIDs[0]===s.HTML){e._setEndLocation(e.openElements.items[0],t);let i=e.openElements.items[1];i&&!(!((a=e.treeAdapter.getNodeSourceCodeLocation(i))===null||a===void 0)&&a.endTag)&&e._setEndLocation(i,t)}}else at(e,t)}function at(e,t){e.insertionMode=l.IN_BODY,st(e,t)}function Ku(e,t){switch(t.tagID){case s.HTML:{Y(e,t);break}case s.FRAMESET:{e._insertElement(t,m.HTML);break}case s.FRAME:{e._appendElement(t,m.HTML),t.ackSelfClosing=!0;break}case s.NOFRAMES:{ae(e,t);break}default:}}function Xu(e,t){t.tagID===s.FRAMESET&&!e.openElements.isRootHtmlElementCurrent()&&(e.openElements.pop(),!e.fragmentContext&&e.openElements.currentTagId!==s.FRAMESET&&(e.insertionMode=l.AFTER_FRAMESET))}function ju(e,t){switch(t.tagID){case s.HTML:{Y(e,t);break}case s.NOFRAMES:{ae(e,t);break}default:}}function zu(e,t){t.tagID===s.HTML&&(e.insertionMode=l.AFTER_AFTER_FRAMESET)}function Ju(e,t){t.tagID===s.HTML?Y(e,t):et(e,t)}function et(e,t){e.insertionMode=l.IN_BODY,st(e,t)}function Zu(e,t){switch(t.tagID){case s.HTML:{Y(e,t);break}case s.NOFRAMES:{ae(e,t);break}default:}}function $u(e,t){t.chars=R,e._insertCharacters(t)}function er(e,t){e._insertCharacters(t),e.framesetOk=!1}function va(e){for(;e.treeAdapter.getNamespaceURI(e.openElements.current)!==m.HTML&&e.openElements.currentTagId!==void 0&&!e._isIntegrationPoint(e.openElements.currentTagId,e.openElements.current);)e.openElements.pop()}function tr(e,t){if(fa(t))va(e),e._startTagOutsideForeignContent(t);else{let a=e._getAdjustedCurrentElement(),i=e.treeAdapter.getNamespaceURI(a);i===m.MATHML?It(t):i===m.SVG&&(da(t),xt(t)),$e(t),t.selfClosing?e._appendElement(t,i):e._insertElement(t,i),t.ackSelfClosing=!0}}function ar(e,t){if(t.tagID===s.P||t.tagID===s.BR){va(e),e._endTagOutsideForeignContent(t);return}for(let a=e.openElements.stackTop;a>0;a--){let i=e.openElements.items[a];if(e.treeAdapter.getNamespaceURI(i)===m.HTML){e._endTagOutsideForeignContent(t);break}let u=e.treeAdapter.getTagName(i);if(u.toLowerCase()===t.tagName){t.tagName=u,e.openElements.shortenToLength(a);break}}}var Bn=String.prototype.codePointAt==null?(e,t)=>(e.charCodeAt(t)&64512)===55296?(e.charCodeAt(t)-55296)*1024+e.charCodeAt(t+1)-56320+65536:e.charCodeAt(t):(e,t)=>e.codePointAt(t);var Gn=new Set([f.AREA,f.BASE,f.BASEFONT,f.BGSOUND,f.BR,f.COL,f.EMBED,f.FRAME,f.HR,f.IMG,f.INPUT,f.KEYGEN,f.LINK,f.META,f.PARAM,f.SOURCE,f.TRACK,f.WBR]);function Ma(e,t){return ge.parse(e,t)}function Ba(e,t,a){typeof e=="string"&&(a=t,t=e,e=null);let i=ge.getFragmentParser(e,a);return i.tokenizer.write(t,!0),i.getFragment()}var sr=[509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,574,3,9,9,7,9,32,4,318,1,31,4,33,15,71,10,50,3,123,2,54,14,32,10,3,1,11,3,46,10,8,0,46,9,7,2,37,13,2,9,6,1,45,0,13,2,49,13,9,3,2,11,83,11,7,0,3,0,158,11,6,9,7,3,56,1,2,6,3,1,3,2,10,0,11,1,3,6,4,4,68,8,2,0,3,0,2,3,2,4,2,0,15,1,83,17,10,9,5,0,82,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,7,19,58,14,5,9,243,14,166,9,71,5,2,1,3,3,2,0,2,1,13,9,120,6,3,6,4,0,29,9,41,6,2,3,9,0,10,10,47,15,199,7,137,9,54,7,2,7,17,9,57,21,2,13,123,5,4,0,2,1,2,6,2,0,9,9,49,4,2,1,2,4,9,9,55,9,7,0,259,3,10,1,2,0,49,6,4,4,14,10,5350,0,7,14,11465,27,2343,9,87,9,39,4,60,6,26,9,535,9,470,0,2,54,8,3,82,0,12,1,19628,1,4178,9,519,45,3,22,481,1,61,4,4,5,9,7,3,6,31,3,149,2,12,2,9,1,3,0,33,1,1357,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,101,0,161,6,10,9,357,0,62,13,499,13,245,1,2,9,233,0,3,0,8,1,6,0,475,6,110,6,6,9,4759,9,787719,239],Ya=[0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,14,29,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,13,10,2,14,2,6,2,1,2,10,2,14,2,6,2,1,4,51,13,310,10,21,11,7,25,5,2,41,2,13,65,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,7,25,39,55,7,1,65,0,16,3,2,2,2,28,43,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,14,35,39,27,10,22,251,41,7,1,17,5,18,21,18,28,11,0,9,21,43,17,47,20,28,22,13,52,58,1,3,0,14,44,33,24,27,35,30,0,3,0,9,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,20,1,64,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,31,9,2,0,3,0,2,37,2,0,26,0,2,0,45,52,19,3,21,2,31,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,14,0,72,26,38,6,186,43,117,63,32,7,3,0,3,7,2,1,2,23,16,0,2,0,95,7,3,38,17,0,2,0,29,0,11,39,8,0,22,0,12,45,20,0,19,72,18,0,182,32,32,8,2,36,18,0,50,29,113,6,2,1,2,37,22,0,26,5,2,1,2,31,15,0,24,43,22,0,239,18,16,0,2,12,2,33,125,0,80,921,103,111,6,206,13,310,2314,96,16,1071,18,5,26,3994,6,582,6842,29,1763,568,8,30,18,78,18,29,19,47,17,3,32,20,6,18,433,44,212,63,33,24,3,24,45,74,6,0,67,12,65,1,2,0,15,4,10,7386,37,33,96,114,14,913,15,50,7710,3,2,6,2,1,2,296,10,0,30,2,3,0,15,4,8,395,2309,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,340,2,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,1845,129,15,6,55,50,49,61,147,44,11,6,17,0,322,29,19,43,485,27,229,29,3,0,208,30,2,2,2,1,2,6,3,4,10,1,225,6,2,3,2,1,2,14,2,196,60,67,8,0,1205,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42719,33,4382,2,5773,3,7472,16,621,2467,541,1507,4938,6,8489,39815,11327],ir="\u200C\u200D\xB7\u0300-\u036F\u0387\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7-\u05C9\u0610-\u061A\u064B-\u0669\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06F0-\u06F9\u0711\u0730-\u074A\u07A6-\u07B0\u07C0-\u07C9\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u0897-\u089F\u08CA-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0966-\u096F\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09E6-\u09EF\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A66-\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AE6-\u0AEF\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B53-\u0B57\u0B62\u0B63\u0B66-\u0B6F\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0BE6-\u0BEF\u0C00-\u0C04\u0C3C\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0CE6-\u0CEF\u0CF3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D66-\u0D6F\u0D81-\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0E50-\u0E59\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECE\u0ED0-\u0ED9\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1040-\u1049\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F-\u109D\u135D-\u135F\u1369-\u1371\u1712-\u1715\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u17E0-\u17E9\u180B-\u180D\u180F-\u1819\u18A9\u1920-\u192B\u1930-\u193B\u1946-\u194F\u19D0-\u19DA\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AB0-\u1ABD\u1ABF-\u1AF0\u1B00-\u1B04\u1B34-\u1B44\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BB0-\u1BB9\u1BE6-\u1BF3\u1C24-\u1C37\u1C40-\u1C49\u1C50-\u1C59\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DFF\u200C\u200D\u203F\u2040\u2054\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\u30FB\uA620-\uA629\uA66F\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA82C\uA880\uA881\uA8B4-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F1\uA8FF-\uA909\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9D0-\uA9D9\uA9E5\uA9F0-\uA9F9\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA50-\uAA59\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uABF0-\uABF9\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFF10-\uFF19\uFF3F\uFF65",qa="\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0558\u0559\u0560-\u0588\u058B\u058C\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u0870-\u0887\u0889-\u088F\u08A0-\u08C9\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C5C\u0C5D\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDC-\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u1711\u171F-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4C\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C8A\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u208F-\u209F\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7DD\uA7E2\uA7F1-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB6C\uAB6D\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC",Pt={3:"abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",5:"class enum extends super const export import",6:"enum",strict:"implements interface let package private protected public static yield",strictBind:"eval arguments"},yt="break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this",ur={5:yt,"5module":yt+" export import",6:yt+" const class extends export import super"},Ga=/^in(stanceof)?$/,rr=new RegExp("["+qa+"]"),nr=new RegExp("["+qa+ir+"]");function vt(e,t){for(var a=65536,i=0;i<t.length;i+=2){if(a+=t[i],a>e)return!1;if(a+=t[i+1],a>=e)return!0}return!1}function ue(e,t){return e<65?e===36:e<91?!0:e<97?e===95:e<123?!0:e<=65535?e>=170&&rr.test(String.fromCharCode(e)):t===!1?!1:vt(e,Ya)}function oe(e,t){return e<48?e===36:e<58?!0:e<65?!1:e<91?!0:e<97?e===95:e<123?!0:e<=65535?e>=170&&nr.test(String.fromCharCode(e)):t===!1?!1:vt(e,Ya)||vt(e,sr)}var O=function(t,a){a===void 0&&(a={}),this.label=t,this.keyword=a.keyword,this.beforeExpr=!!a.beforeExpr,this.startsExpr=!!a.startsExpr,this.isLoop=!!a.isLoop,this.isAssign=!!a.isAssign,this.prefix=!!a.prefix,this.postfix=!!a.postfix,this.binop=a.binop||null,this.updateContext=null};function j(e,t){return new O(e,{beforeExpr:!0,binop:t})}var z={beforeExpr:!0},K={startsExpr:!0},Ft={};function S(e,t){return t===void 0&&(t={}),t.keyword=e,Ft[e]=new O(e,t)}var r={num:new O("num",K),regexp:new O("regexp",K),string:new O("string",K),name:new O("name",K),privateId:new O("privateId",K),eof:new O("eof"),bracketL:new O("[",{beforeExpr:!0,startsExpr:!0}),bracketR:new O("]"),braceL:new O("{",{beforeExpr:!0,startsExpr:!0}),braceR:new O("}"),parenL:new O("(",{beforeExpr:!0,startsExpr:!0}),parenR:new O(")"),comma:new O(",",z),semi:new O(";",z),colon:new O(":",z),dot:new O("."),question:new O("?",z),questionDot:new O("?."),arrow:new O("=>",z),template:new O("template"),invalidTemplate:new O("invalidTemplate"),ellipsis:new O("...",z),backQuote:new O("`",K),dollarBraceL:new O("${",{beforeExpr:!0,startsExpr:!0}),eq:new O("=",{beforeExpr:!0,isAssign:!0}),assign:new O("_=",{beforeExpr:!0,isAssign:!0}),incDec:new O("++/--",{prefix:!0,postfix:!0,startsExpr:!0}),prefix:new O("!/~",{beforeExpr:!0,prefix:!0,startsExpr:!0}),logicalOR:j("||",1),logicalAND:j("&&",2),bitwiseOR:j("|",3),bitwiseXOR:j("^",4),bitwiseAND:j("&",5),equality:j("==/!=/===/!==",6),relational:j("</>/<=/>=",7),bitShift:j("<</>>/>>>",8),plusMin:new O("+/-",{beforeExpr:!0,binop:9,prefix:!0,startsExpr:!0}),modulo:j("%",10),star:j("*",10),slash:j("/",10),starstar:new O("**",{beforeExpr:!0}),coalesce:j("??",1),_break:S("break"),_case:S("case",z),_catch:S("catch"),_continue:S("continue"),_debugger:S("debugger"),_default:S("default",z),_do:S("do",{isLoop:!0,beforeExpr:!0}),_else:S("else",z),_finally:S("finally"),_for:S("for",{isLoop:!0}),_function:S("function",K),_if:S("if"),_return:S("return",z),_switch:S("switch"),_throw:S("throw",z),_try:S("try"),_var:S("var"),_const:S("const"),_while:S("while",{isLoop:!0}),_with:S("with"),_new:S("new",{beforeExpr:!0,startsExpr:!0}),_this:S("this",K),_super:S("super",K),_class:S("class",K),_extends:S("extends",z),_export:S("export"),_import:S("import",K),_null:S("null",K),_true:S("true",K),_false:S("false",K),_in:S("in",{beforeExpr:!0,binop:7}),_instanceof:S("instanceof",{beforeExpr:!0,binop:7}),_typeof:S("typeof",{beforeExpr:!0,prefix:!0,startsExpr:!0}),_void:S("void",{beforeExpr:!0,prefix:!0,startsExpr:!0}),_delete:S("delete",{beforeExpr:!0,prefix:!0,startsExpr:!0})},X=/\r\n?|\n|\u2028|\u2029/,or=new RegExp(X.source,"g");function Ie(e){return e===10||e===13||e===8232||e===8233}function Wa(e,t,a){a===void 0&&(a=e.length);for(var i=t;i<a;i++){var u=e.charCodeAt(i);if(Ie(u))return i<a-1&&u===13&&e.charCodeAt(i+1)===10?i+2:i+1}return-1}var Qa=/[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/,U=/(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g,Ka=Object.prototype,cr=Ka.hasOwnProperty,hr=Ka.toString,xe=Object.hasOwn||(function(e,t){return cr.call(e,t)}),wa=Array.isArray||(function(e){return hr.call(e)==="[object Array]"}),Fa=Object.create(null);function pe(e){return Fa[e]||(Fa[e]=new RegExp("^(?:"+e.replace(/ /g,"|")+")$"))}function ce(e){return e<=65535?String.fromCharCode(e):(e-=65536,String.fromCharCode((e>>10)+55296,(e&1023)+56320))}var lr=/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/,Ue=function(t,a){this.line=t,this.column=a};Ue.prototype.offset=function(t){return new Ue(this.line,this.column+t)};var ft=function(t,a,i){this.start=a,this.end=i,t.sourceFile!==null&&(this.source=t.sourceFile)};function Xa(e,t){for(var a=1,i=0;;){var u=Wa(e,i,t);if(u<0)return new Ue(a,t-i);++a,i=u}}var Mt={ecmaVersion:null,sourceType:"script",strict:!1,onInsertedSemicolon:null,onTrailingComma:null,allowReserved:null,allowReturnOutsideFunction:!1,allowImportExportEverywhere:!1,allowAwaitOutsideFunction:null,allowSuperOutsideMethod:null,allowHashBang:!1,checkPrivateFields:!0,locations:!1,startLocation:null,onToken:null,onComment:null,ranges:!1,program:null,sourceFile:null,directSourceFile:null,preserveParens:!1},Ua=!1;function fr(e){var t={};for(var a in Mt)t[a]=e&&xe(e,a)?e[a]:Mt[a];if(t.ecmaVersion==="latest"?t.ecmaVersion=1e8:t.ecmaVersion==null?(!Ua&&typeof console=="object"&&console.warn&&(Ua=!0,console.warn(`Since Acorn 8.0.0, options.ecmaVersion is required.
Defaulting to 2020, but this will stop working in the future.`)),t.ecmaVersion=11):t.ecmaVersion>=2015&&(t.ecmaVersion-=2009),t.allowReserved==null&&(t.allowReserved=t.ecmaVersion<5),(!e||e.allowHashBang==null)&&(t.allowHashBang=t.ecmaVersion>=14),wa(t.onToken)){var i=t.onToken;t.onToken=function(u){return i.push(u)}}if(wa(t.onComment)&&(t.onComment=dr(t,t.onComment)),t.sourceType==="commonjs"&&t.allowAwaitOutsideFunction)throw new Error("Cannot use allowAwaitOutsideFunction with sourceType: commonjs");return t}function dr(e,t){return function(a,i,u,o,h,d){var E={type:a?"Block":"Line",value:i,start:u,end:o};e.locations&&(E.loc=new ft(this,h,d)),e.ranges&&(E.range=[u,o]),t.push(E)}}var be=1,_e=2,Ut=4,ja=8,Ht=16,za=32,dt=64,Ja=128,Ae=256,He=512,Za=1024,pt=be|_e|Ae;function Vt(e,t){return _e|(e?Ut:0)|(t?ja:0)}var ot=0,Yt=1,le=2,$a=3,es=4,ts=5,M=function(t,a,i){this.options=t=fr(t),this.sourceFile=t.sourceFile,this.keywords=pe(ur[t.ecmaVersion>=6?6:t.sourceType==="module"?"5module":5]);var u="";t.allowReserved!==!0&&(u=Pt[t.ecmaVersion>=6?6:t.ecmaVersion===5?5:3],t.sourceType==="module"&&(u+=" await")),this.reservedWords=pe(u);var o=(u?u+" ":"")+Pt.strict;this.reservedWordsStrict=pe(o),this.reservedWordsStrictBind=pe(o+" "+Pt.strictBind),this.input=String(a),this.containsEsc=!1,this.pos=i||0,this.curLine=1,t.startLocation?(this.lineStart=this.pos-t.startLocation.column,this.curLine=t.startLocation.line):i?(this.lineStart=this.input.lastIndexOf(`
`,i-1)+1,this.options.locations&&(this.curLine=this.input.slice(0,this.lineStart).split(X).length)):this.lineStart=0,this.type=r.eof,this.value=null,this.start=this.end=this.pos,this.startLoc=this.endLoc=this.curPosition(),this.lastTokEndLoc=this.lastTokStartLoc=null,this.lastTokStart=this.lastTokEnd=this.pos,this.context=this.initialContext(),this.exprAllowed=!0,this.inModule=t.sourceType==="module",this.strict=this.inModule||t.strict===!0||this.strictDirective(this.pos),this.potentialArrowAt=-1,this.potentialArrowInForAwait=!1,this.yieldPos=this.awaitPos=this.awaitIdentPos=0,this.labels=[],this.undefinedExports=Object.create(null),this.pos===0&&t.allowHashBang&&this.input.slice(0,2)==="#!"&&this.skipLineComment(2),this.scopeStack=[],this.enterScope(this.options.sourceType==="commonjs"?_e:be),this.regexpState=null,this.privateNameStack=[]},Z={inFunction:{configurable:!0},inGenerator:{configurable:!0},inAsync:{configurable:!0},canAwait:{configurable:!0},allowReturn:{configurable:!0},allowSuper:{configurable:!0},allowDirectSuper:{configurable:!0},treatFunctionsAsVar:{configurable:!0},allowNewDotTarget:{configurable:!0},allowUsing:{configurable:!0},inClassStaticBlock:{configurable:!0}};M.prototype.parse=function(){var t=this,a=this.options.program||this.startNode();return this.nextToken(),this.catchStackOverflow(function(){return t.parseTopLevel(a)})};Z.inFunction.get=function(){return(this.currentVarScope().flags&_e)>0};Z.inGenerator.get=function(){return(this.currentVarScope().flags&ja)>0};Z.inAsync.get=function(){return(this.currentVarScope().flags&Ut)>0};Z.canAwait.get=function(){for(var e=this.scopeStack.length-1;e>=0;e--){var t=this.scopeStack[e],a=t.flags;if(a&(Ae|He))return!1;if(a&_e)return(a&Ut)>0}return this.inModule&&this.options.ecmaVersion>=13||this.options.allowAwaitOutsideFunction};Z.allowReturn.get=function(){return!!(this.inFunction||this.options.allowReturnOutsideFunction&&this.currentVarScope().flags&be)};Z.allowSuper.get=function(){var e=this.currentThisScope(),t=e.flags;return(t&dt)>0||this.options.allowSuperOutsideMethod};Z.allowDirectSuper.get=function(){return(this.currentThisScope().flags&Ja)>0};Z.treatFunctionsAsVar.get=function(){return this.treatFunctionsAsVarInScope(this.currentScope())};Z.allowNewDotTarget.get=function(){for(var e=this.scopeStack.length-1;e>=0;e--){var t=this.scopeStack[e],a=t.flags;if(a&(Ae|He)||a&_e&&!(a&Ht))return!0}return!1};Z.allowUsing.get=function(){var e=this.currentScope(),t=e.flags;return!(t&Za||!this.inModule&&t&be)};Z.inClassStaticBlock.get=function(){return(this.currentVarScope().flags&Ae)>0};M.extend=function(){for(var t=[],a=arguments.length;a--;)t[a]=arguments[a];for(var i=this,u=0;u<t.length;u++)i=t[u](i);return i};M.parse=function(t,a){return new this(a,t).parse()};M.parseExpressionAt=function(t,a,i){var u=new this(i,t,a);return u.nextToken(),u.parseExpression()};M.tokenizer=function(t,a){return new this(a,t)};Object.defineProperties(M.prototype,Z);var q=M.prototype,pr=/^(?:'((?:\\[^]|[^'\\])*?)'|"((?:\\[^]|[^"\\])*?)")/;q.strictDirective=function(e){if(this.options.ecmaVersion<5)return!1;for(;;){U.lastIndex=e,e+=U.exec(this.input)[0].length;var t=pr.exec(this.input.slice(e));if(!t)return!1;if((t[1]||t[2])==="use strict"){U.lastIndex=e+t[0].length;var a=U.exec(this.input),i=a.index+a[0].length,u=this.input.charAt(i);return u===";"||u==="}"||X.test(a[0])&&!(/[(`.[+\-/*%<>=,?^&]/.test(u)||u==="!"&&this.input.charAt(i+1)==="="||u==="i"&&Er(this,i))}e+=t[0].length,U.lastIndex=e,e+=U.exec(this.input)[0].length,this.input[e]===";"&&e++}};function Er(e,t){for(var a=t+1,i=Math.min(e.input.length,t+11);a<i;){var u=e.fullCharCodeAt(a);if(!oe(u,!0))break;a+=u<=65535?1:2}return a===t+2&&e.input.slice(t,a)==="in"||a===t+10&&e.input.slice(t,a)==="instanceof"}q.eat=function(e){return this.type===e?(this.next(),!0):!1};q.isContextual=function(e){return this.type===r.name&&this.value===e&&!this.containsEsc};q.eatContextual=function(e){return this.isContextual(e)?(this.next(),!0):!1};q.catchStackOverflow=function(e){try{return e()}catch(t){if(t instanceof Error&&(/\bstack\b.*\b(exceeded|overflow)\b/i.test(t.message)||/\btoo much recursion\b/i.test(t.message)))this.raise(this.start,"Not enough stack space to parse input");else throw t}};q.expectContextual=function(e){this.eatContextual(e)||this.unexpected()};q.canInsertSemicolon=function(){return this.type===r.eof||this.type===r.braceR||X.test(this.input.slice(this.lastTokEnd,this.start))};q.insertSemicolon=function(){if(this.canInsertSemicolon())return this.options.onInsertedSemicolon&&this.options.onInsertedSemicolon(this.lastTokEnd,this.lastTokEndLoc),!0};q.semicolon=function(){!this.eat(r.semi)&&!this.insertSemicolon()&&this.unexpected()};q.afterTrailingComma=function(e,t){if(this.type===e)return this.options.onTrailingComma&&this.options.onTrailingComma(this.lastTokStart,this.lastTokStartLoc),t||this.next(),!0};q.expect=function(e){this.eat(e)||this.unexpected()};q.unexpected=function(e){this.raise(e??this.start,"Unexpected token")};var Et=function(){this.shorthandAssign=this.trailingComma=this.parenthesizedAssign=this.parenthesizedBind=this.doubleProto=-1};q.checkPatternErrors=function(e,t){if(e){e.trailingComma>-1&&this.raiseRecoverable(e.trailingComma,"Comma is not permitted after the rest element");var a=t?e.parenthesizedAssign:e.parenthesizedBind;a>-1&&this.raiseRecoverable(a,t?"Assigning to rvalue":"Parenthesized pattern")}};q.checkExpressionErrors=function(e,t){if(!e)return!1;var a=e.shorthandAssign,i=e.doubleProto;if(!t)return a>=0||i>=0;a>=0&&this.raise(a,"Shorthand property assignments are valid only in destructuring patterns"),i>=0&&this.raiseRecoverable(i,"Redefinition of __proto__ property")};q.checkYieldAwaitInDefaultParams=function(){this.yieldPos&&(!this.awaitPos||this.yieldPos<this.awaitPos)&&this.raise(this.yieldPos,"Yield expression cannot be a default value"),this.awaitPos&&this.raise(this.awaitPos,"Await expression cannot be a default value")};q.isSimpleAssignTarget=function(e){return e.type==="ParenthesizedExpression"?this.isSimpleAssignTarget(e.expression):e.type==="Identifier"||e.type==="MemberExpression"};var g=M.prototype;g.parseTopLevel=function(e){var t=Object.create(null);for(e.body||(e.body=[]);this.type!==r.eof;){var a=this.parseStatement(null,!0,t);e.body.push(a)}if(this.inModule)for(var i=0,u=Object.keys(this.undefinedExports);i<u.length;i+=1){var o=u[i];this.raiseRecoverable(this.undefinedExports[o].start,"Export '"+o+"' is not defined")}return this.adaptDirectivePrologue(e.body),this.next(),e.sourceType=this.options.sourceType==="commonjs"?"script":this.options.sourceType,this.finishNode(e,"Program")};var qt={kind:"loop"},mr={kind:"switch"};g.isLet=function(e){if(this.options.ecmaVersion<6||!this.isContextual("let"))return!1;U.lastIndex=this.pos;var t=U.exec(this.input),a=this.pos+t[0].length,i=this.fullCharCodeAt(a);if(i===91||i===92)return!0;if(e)return!1;if(i===123)return!0;if(ue(i)){var u=a;do a+=i<=65535?1:2;while(oe(i=this.fullCharCodeAt(a)));if(i===92)return!0;var o=this.input.slice(u,a);if(!Ga.test(o))return!0}return!1};g.isAsyncFunction=function(){if(this.options.ecmaVersion<8||!this.isContextual("async"))return!1;U.lastIndex=this.pos;var e=U.exec(this.input),t=this.pos+e[0].length,a;return!X.test(this.input.slice(this.pos,t))&&this.input.slice(t,t+8)==="function"&&(t+8===this.input.length||!(oe(a=this.fullCharCodeAt(t+8))||a===92))};g.isUsingKeyword=function(e,t){if(this.options.ecmaVersion<17||!this.isContextual(e?"await":"using"))return!1;U.lastIndex=this.pos;var a=U.exec(this.input),i=this.pos+a[0].length;if(X.test(this.input.slice(this.pos,i)))return!1;if(e){var u=i+5,o;if(this.input.slice(i,u)!=="using"||u===this.input.length||oe(o=this.fullCharCodeAt(u))||o===92)return!1;U.lastIndex=u;var h=U.exec(this.input);if(i=u+h[0].length,h&&X.test(this.input.slice(u,i)))return!1}var d=this.fullCharCodeAt(i);if(!ue(d)&&d!==92)return!1;var E=i;do i+=d<=65535?1:2;while(oe(d=this.fullCharCodeAt(i)));if(d===92)return!0;var T=this.input.slice(E,i);if(Ga.test(T))return!1;if(t&&!e&&T==="of"){U.lastIndex=i;var A=U.exec(this.input);if(i=i+A[0].length,this.input.charCodeAt(i)!==61||(d=this.input.charCodeAt(i+1))===61||d===62)return!1}return!0};g.isAwaitUsing=function(e){return this.isUsingKeyword(!0,e)};g.isUsing=function(e){return this.isUsingKeyword(!1,e)};g.parseStatement=function(e,t,a){var i=this.type,u=this.startNode(),o;switch(this.isLet(e)&&(i=r._var,o="let"),i){case r._break:case r._continue:return this.parseBreakContinueStatement(u,i.keyword);case r._debugger:return this.parseDebuggerStatement(u);case r._do:return this.parseDoStatement(u);case r._for:return this.parseForStatement(u);case r._function:return e&&(this.strict||e!=="if"&&e!=="label")&&this.options.ecmaVersion>=6&&this.unexpected(),this.parseFunctionStatement(u,!1,!e);case r._class:return e&&this.unexpected(),this.parseClass(u,!0);case r._if:return this.parseIfStatement(u);case r._return:return this.parseReturnStatement(u);case r._switch:return this.parseSwitchStatement(u);case r._throw:return this.parseThrowStatement(u);case r._try:return this.parseTryStatement(u);case r._const:case r._var:return o=o||this.value,e&&o!=="var"&&this.unexpected(),this.parseVarStatement(u,o);case r._while:return this.parseWhileStatement(u);case r._with:return this.parseWithStatement(u);case r.braceL:return this.parseBlock(!0,u);case r.semi:return this.parseEmptyStatement(u);case r._export:case r._import:if(this.options.ecmaVersion>10&&i===r._import){U.lastIndex=this.pos;var h=U.exec(this.input),d=this.pos+h[0].length,E=this.input.charCodeAt(d);if(E===40||E===46)return this.parseExpressionStatement(u,this.parseExpression())}return this.options.allowImportExportEverywhere||(t||this.raise(this.start,"'import' and 'export' may only appear at the top level"),this.inModule||this.raise(this.start,"'import' and 'export' may appear only with 'sourceType: module'")),i===r._import?this.parseImport(u):this.parseExport(u,a);default:if(this.isAsyncFunction())return e&&this.unexpected(),this.next(),this.parseFunctionStatement(u,!0,!e);var T=this.isAwaitUsing(!1)?"await using":this.isUsing(!1)?"using":null;if(T)return this.allowUsing||this.raise(this.start,"Using declaration cannot appear in the top level when source type is `script` or in the bare case statement"),e&&this.raise(this.start,"Using declaration is not allowed in single-statement positions"),T==="await using"&&(this.canAwait||this.raise(this.start,"Await using cannot appear outside of async function"),this.next()),this.next(),this.parseVar(u,!1,T),this.semicolon(),this.finishNode(u,"VariableDeclaration");var A=this.value,C=this.parseExpression();return i===r.name&&C.type==="Identifier"&&this.eat(r.colon)?this.parseLabeledStatement(u,A,C,e):this.parseExpressionStatement(u,C)}};g.parseBreakContinueStatement=function(e,t){var a=t==="break";this.next(),this.eat(r.semi)||this.insertSemicolon()?e.label=null:this.type!==r.name?this.unexpected():(e.label=this.parseIdent(),this.semicolon());for(var i=0;i<this.labels.length;++i){var u=this.labels[i];if((e.label==null||u.name===e.label.name)&&(u.kind!=null&&(a||u.kind==="loop")||e.label&&a))break}return i===this.labels.length&&this.raise(e.start,"Unsyntactic "+t),this.finishNode(e,a?"BreakStatement":"ContinueStatement")};g.parseDebuggerStatement=function(e){return this.next(),this.semicolon(),this.finishNode(e,"DebuggerStatement")};g.parseDoStatement=function(e){return this.next(),this.labels.push(qt),e.body=this.parseStatement("do"),this.labels.pop(),this.expect(r._while),e.test=this.parseParenExpression(),this.options.ecmaVersion>=6?this.eat(r.semi):this.semicolon(),this.finishNode(e,"DoWhileStatement")};g.parseForStatement=function(e){this.next();var t=this.options.ecmaVersion>=9&&this.canAwait&&this.eatContextual("await")?this.lastTokStart:-1;if(this.labels.push(qt),this.enterScope(0),this.expect(r.parenL),this.type===r.semi)return t>-1&&this.unexpected(t),this.parseFor(e,null);var a=this.isLet();if(this.type===r._var||this.type===r._const||a){var i=this.startNode(),u=a?"let":this.value;return this.next(),this.parseVar(i,!0,u),this.finishNode(i,"VariableDeclaration"),this.parseForAfterInit(e,i,t)}var o=this.isContextual("let"),h=!1,d=this.isUsing(!0)?"using":this.isAwaitUsing(!0)?"await using":null;if(d){var E=this.startNode();return this.next(),d==="await using"&&(this.canAwait||this.raise(this.start,"Await using cannot appear outside of async function"),this.next()),this.parseVar(E,!0,d),this.finishNode(E,"VariableDeclaration"),this.parseForAfterInit(e,E,t)}var T=this.containsEsc,A=new Et,C=this.start,L=t>-1?this.parseExprSubscripts(A,"await"):this.parseExpression(!0,A);return this.type===r._in||(h=this.options.ecmaVersion>=6&&this.isContextual("of"))?(t>-1?(this.type===r._in&&this.unexpected(t),e.await=!0):h&&this.options.ecmaVersion>=8&&(L.start===C&&!T&&L.type==="Identifier"&&L.name==="async"?this.unexpected():this.options.ecmaVersion>=9&&(e.await=!1)),o&&h&&this.raise(L.start,"The left-hand side of a for-of loop may not start with 'let'."),this.toAssignable(L,!1,A),this.checkLValPattern(L),this.parseForIn(e,L)):(this.checkExpressionErrors(A,!0),t>-1&&this.unexpected(t),this.parseFor(e,L))};g.parseForAfterInit=function(e,t,a){return(this.type===r._in||this.options.ecmaVersion>=6&&this.isContextual("of"))&&t.declarations.length===1?(this.type===r._in?((t.kind==="using"||t.kind==="await using")&&!t.declarations[0].init&&this.raise(this.start,"Using declaration is not allowed in for-in loops"),this.options.ecmaVersion>=9&&a>-1&&this.unexpected(a)):this.options.ecmaVersion>=9&&(e.await=a>-1),this.parseForIn(e,t)):(a>-1&&this.unexpected(a),this.parseFor(e,t))};g.parseFunctionStatement=function(e,t,a){return this.next(),this.parseFunction(e,Fe|(a?0:Bt),!1,t)};g.parseIfStatement=function(e){return this.next(),e.test=this.parseParenExpression(),e.consequent=this.parseStatement("if"),e.alternate=this.eat(r._else)?this.parseStatement("if"):null,this.finishNode(e,"IfStatement")};g.parseReturnStatement=function(e){return this.allowReturn||this.raise(this.start,"'return' outside of function"),this.next(),this.eat(r.semi)||this.insertSemicolon()?e.argument=null:(e.argument=this.parseExpression(),this.semicolon()),this.finishNode(e,"ReturnStatement")};g.parseSwitchStatement=function(e){this.next(),e.discriminant=this.parseParenExpression(),e.cases=[],this.expect(r.braceL),this.labels.push(mr),this.enterScope(Za);for(var t,a=!1;this.type!==r.braceR;)if(this.type===r._case||this.type===r._default){var i=this.type===r._case;t&&this.finishNode(t,"SwitchCase"),e.cases.push(t=this.startNode()),t.consequent=[],this.next(),i?t.test=this.parseExpression():(a&&this.raiseRecoverable(this.lastTokStart,"Multiple default clauses"),a=!0,t.test=null),this.expect(r.colon)}else t||this.unexpected(),t.consequent.push(this.parseStatement(null));return this.exitScope(),t&&this.finishNode(t,"SwitchCase"),this.next(),this.labels.pop(),this.finishNode(e,"SwitchStatement")};g.parseThrowStatement=function(e){return this.next(),X.test(this.input.slice(this.lastTokEnd,this.start))&&this.raise(this.lastTokEnd,"Illegal newline after throw"),e.argument=this.parseExpression(),this.semicolon(),this.finishNode(e,"ThrowStatement")};var Tr=[];g.parseCatchClauseParam=function(){var e=this.parseBindingAtom(),t=e.type==="Identifier";return this.enterScope(t?za:0),this.checkLValPattern(e,t?es:le),this.expect(r.parenR),e};g.parseTryStatement=function(e){if(this.next(),e.block=this.parseBlock(),e.handler=null,this.type===r._catch){var t=this.startNode();this.next(),this.eat(r.parenL)?t.param=this.parseCatchClauseParam():(this.options.ecmaVersion<10&&this.unexpected(),t.param=null,this.enterScope(0)),t.body=this.parseBlock(!1),this.exitScope(),e.handler=this.finishNode(t,"CatchClause")}return e.finalizer=this.eat(r._finally)?this.parseBlock():null,!e.handler&&!e.finalizer&&this.raise(e.start,"Missing catch or finally clause"),this.finishNode(e,"TryStatement")};g.parseVarStatement=function(e,t,a){return this.next(),this.parseVar(e,!1,t,a),this.semicolon(),this.finishNode(e,"VariableDeclaration")};g.parseWhileStatement=function(e){return this.next(),e.test=this.parseParenExpression(),this.labels.push(qt),e.body=this.parseStatement("while"),this.labels.pop(),this.finishNode(e,"WhileStatement")};g.parseWithStatement=function(e){return this.strict&&this.raise(this.start,"'with' in strict mode"),this.next(),e.object=this.parseParenExpression(),e.body=this.parseStatement("with"),this.finishNode(e,"WithStatement")};g.parseEmptyStatement=function(e){return this.next(),this.finishNode(e,"EmptyStatement")};g.parseLabeledStatement=function(e,t,a,i){for(var u=0,o=this.labels;u<o.length;u+=1){var h=o[u];h.name===t&&this.raise(a.start,"Label '"+t+"' is already declared")}for(var d=this.type.isLoop?"loop":this.type===r._switch?"switch":null,E=this.labels.length-1;E>=0;E--){var T=this.labels[E];if(T.statementStart===e.start)T.statementStart=this.start,T.kind=d;else break}return this.labels.push({name:t,kind:d,statementStart:this.start}),e.body=this.parseStatement(i?i.indexOf("label")===-1?i+"label":i:"label"),this.labels.pop(),e.label=a,this.finishNode(e,"LabeledStatement")};g.parseExpressionStatement=function(e,t){return e.expression=t,this.semicolon(),this.finishNode(e,"ExpressionStatement")};g.parseBlock=function(e,t,a){for(e===void 0&&(e=!0),t===void 0&&(t=this.startNode()),t.body=[],this.expect(r.braceL),e&&this.enterScope(0);this.type!==r.braceR;){var i=this.parseStatement(null);t.body.push(i)}return a&&(this.strict=!1),this.next(),e&&this.exitScope(),this.finishNode(t,"BlockStatement")};g.parseFor=function(e,t){return e.init=t,this.expect(r.semi),e.test=this.type===r.semi?null:this.parseExpression(),this.expect(r.semi),e.update=this.type===r.parenR?null:this.parseExpression(),this.expect(r.parenR),e.body=this.parseStatement("for"),this.exitScope(),this.labels.pop(),this.finishNode(e,"ForStatement")};g.parseForIn=function(e,t){var a=this.type===r._in;return this.next(),t.type==="VariableDeclaration"&&t.declarations[0].init!=null&&(!a||this.options.ecmaVersion<8||this.strict||t.kind!=="var"||t.declarations[0].id.type!=="Identifier")&&this.raise(t.start,(a?"for-in":"for-of")+" loop variable declaration may not have an initializer"),e.left=t,e.right=a?this.parseExpression():this.parseMaybeAssign(),this.expect(r.parenR),e.body=this.parseStatement("for"),this.exitScope(),this.labels.pop(),this.finishNode(e,a?"ForInStatement":"ForOfStatement")};g.parseVar=function(e,t,a,i){for(e.declarations=[],e.kind=a;;){var u=this.startNode();if(this.parseVarId(u,a),this.eat(r.eq)?u.init=this.parseMaybeAssign(t):!i&&a==="const"&&!(this.type===r._in||this.options.ecmaVersion>=6&&this.isContextual("of"))?this.unexpected():!i&&(a==="using"||a==="await using")&&this.options.ecmaVersion>=17&&this.type!==r._in&&!this.isContextual("of")?this.raise(this.lastTokEnd,"Missing initializer in "+a+" declaration"):!i&&u.id.type!=="Identifier"&&!(t&&(this.type===r._in||this.isContextual("of")))?this.raise(this.lastTokEnd,"Complex binding patterns require an initialization value"):u.init=null,e.declarations.push(this.finishNode(u,"VariableDeclarator")),!this.eat(r.comma))break}return e};g.parseVarId=function(e,t){e.id=t==="using"||t==="await using"?this.parseIdent():this.parseBindingAtom(),this.checkLValPattern(e.id,t==="var"?Yt:le,!1)};var Fe=1,Bt=2,as=4;g.parseFunction=function(e,t,a,i,u){this.initFunction(e),(this.options.ecmaVersion>=9||this.options.ecmaVersion>=6&&!i)&&(this.type===r.star&&t&Bt&&this.unexpected(),e.generator=this.eat(r.star)),this.options.ecmaVersion>=8&&(e.async=!!i),t&Fe&&(e.id=t&as&&this.type!==r.name?null:this.parseIdent(),e.id&&!(t&Bt)&&this.checkLValSimple(e.id,this.strict||e.generator||e.async?this.treatFunctionsAsVar?Yt:le:$a));var o=this.yieldPos,h=this.awaitPos,d=this.awaitIdentPos;return this.yieldPos=0,this.awaitPos=0,this.awaitIdentPos=0,this.enterScope(Vt(e.async,e.generator)),t&Fe||(e.id=this.type===r.name?this.parseIdent():null),this.parseFunctionParams(e),this.parseFunctionBody(e,a,!1,u),this.yieldPos=o,this.awaitPos=h,this.awaitIdentPos=d,this.finishNode(e,t&Fe?"FunctionDeclaration":"FunctionExpression")};g.parseFunctionParams=function(e){this.expect(r.parenL),e.params=this.parseBindingList(r.parenR,!1,this.options.ecmaVersion>=8),this.checkYieldAwaitInDefaultParams()};g.parseClass=function(e,t){this.next();var a=this.strict;this.strict=!0,this.parseClassId(e,t),this.parseClassSuper(e);var i=this.enterClassBody(),u=this.startNode(),o=!1;for(u.body=[],this.expect(r.braceL);this.type!==r.braceR;){var h=this.parseClassElement(e.superClass!==null);h&&(u.body.push(h),h.type==="MethodDefinition"&&h.kind==="constructor"?(o&&this.raiseRecoverable(h.start,"Duplicate constructor in the same class"),o=!0):h.key&&h.key.type==="PrivateIdentifier"&&br(i,h)&&this.raiseRecoverable(h.key.start,"Identifier '#"+h.key.name+"' has already been declared"))}return this.strict=a,this.next(),e.body=this.finishNode(u,"ClassBody"),this.exitClassBody(),this.finishNode(e,t?"ClassDeclaration":"ClassExpression")};g.parseClassElement=function(e){if(this.eat(r.semi))return null;var t=this.options.ecmaVersion,a=this.startNode(),i="",u=!1,o=!1,h="method",d=!1;if(this.eatContextual("static")){if(t>=13&&this.eat(r.braceL))return this.parseClassStaticBlock(a),a;this.isClassElementNameStart()||this.type===r.star?d=!0:i="static"}if(a.static=d,!i&&t>=8&&this.eatContextual("async")&&((this.isClassElementNameStart()||this.type===r.star)&&!this.canInsertSemicolon()?o=!0:i="async"),!i&&(t>=9||!o)&&this.eat(r.star)&&(u=!0),!i&&!o&&!u){var E=this.value;(this.eatContextual("get")||this.eatContextual("set"))&&(this.isClassElementNameStart()?h=E:i=E)}if(i?(a.computed=!1,a.key=this.startNodeAt(this.lastTokStart,this.lastTokStartLoc),a.key.name=i,this.finishNode(a.key,"Identifier")):this.parseClassElementName(a),t<13||this.type===r.parenL||h!=="method"||u||o){var T=!a.static&&ct(a,"constructor"),A=T&&e;T&&h!=="method"&&this.raise(a.key.start,"Constructor can't have get/set modifier"),a.kind=T?"constructor":h,this.parseClassMethod(a,u,o,A)}else this.parseClassField(a);return a};g.isClassElementNameStart=function(){return this.type===r.name||this.type===r.privateId||this.type===r.num||this.type===r.string||this.type===r.bracketL||this.type.keyword};g.parseClassElementName=function(e){this.type===r.privateId?(this.value==="constructor"&&this.raise(this.start,"Classes can't have an element named '#constructor'"),e.computed=!1,e.key=this.parsePrivateIdent()):this.parsePropertyName(e)};g.parseClassMethod=function(e,t,a,i){var u=e.key;e.kind==="constructor"?(t&&this.raise(u.start,"Constructor can't be a generator"),a&&this.raise(u.start,"Constructor can't be an async method")):e.static&&ct(e,"prototype")&&this.raise(u.start,"Classes may not have a static property named prototype");var o=e.value=this.parseMethod(t,a,i);return e.kind==="get"&&o.params.length!==0&&this.raiseRecoverable(o.start,"getter should have no params"),e.kind==="set"&&o.params.length!==1&&this.raiseRecoverable(o.start,"setter should have exactly one param"),e.kind==="set"&&o.params[0].type==="RestElement"&&this.raiseRecoverable(o.params[0].start,"Setter cannot use rest params"),this.finishNode(e,"MethodDefinition")};g.parseClassField=function(e){return ct(e,"constructor")?this.raise(e.key.start,"Classes can't have a field named 'constructor'"):e.static&&ct(e,"prototype")&&this.raise(e.key.start,"Classes can't have a static field named 'prototype'"),this.eat(r.eq)?(this.enterScope(He|dt),e.value=this.parseMaybeAssign(),this.exitScope()):e.value=null,this.semicolon(),this.finishNode(e,"PropertyDefinition")};g.parseClassStaticBlock=function(e){e.body=[];var t=this.labels;for(this.labels=[],this.enterScope(Ae|dt);this.type!==r.braceR;){var a=this.parseStatement(null);e.body.push(a)}return this.next(),this.exitScope(),this.labels=t,this.finishNode(e,"StaticBlock")};g.parseClassId=function(e,t){this.type===r.name?(e.id=this.parseIdent(),t&&this.checkLValSimple(e.id,le,!1)):(t===!0&&this.unexpected(),e.id=null)};g.parseClassSuper=function(e){e.superClass=this.eat(r._extends)?this.parseExprSubscripts(null,!1):null};g.enterClassBody=function(){var e={declared:Object.create(null),used:[]};return this.privateNameStack.push(e),e.declared};g.exitClassBody=function(){var e=this.privateNameStack.pop(),t=e.declared,a=e.used;if(this.options.checkPrivateFields)for(var i=this.privateNameStack.length,u=i===0?null:this.privateNameStack[i-1],o=0;o<a.length;++o){var h=a[o];xe(t,h.name)||(u?u.used.push(h):this.raiseRecoverable(h.start,"Private field '#"+h.name+"' must be declared in an enclosing class"))}};function br(e,t){var a=t.key.name,i=e[a],u="true";return t.type==="MethodDefinition"&&(t.kind==="get"||t.kind==="set")&&(u=(t.static?"s":"i")+t.kind),i==="iget"&&u==="iset"||i==="iset"&&u==="iget"||i==="sget"&&u==="sset"||i==="sset"&&u==="sget"?(e[a]="true",!1):i?!0:(e[a]=u,!1)}function ct(e,t){var a=e.computed,i=e.key;return!a&&(i.type==="Identifier"&&i.name===t||i.type==="Literal"&&i.value===t)}g.parseExportAllDeclaration=function(e,t){return this.options.ecmaVersion>=11&&(this.eatContextual("as")?(e.exported=this.parseModuleExportName(),this.checkExport(t,e.exported,this.lastTokStart)):e.exported=null),this.expectContextual("from"),this.type!==r.string&&this.unexpected(),e.source=this.parseExprAtom(),this.options.ecmaVersion>=16&&(e.attributes=this.parseWithClause()),this.semicolon(),this.finishNode(e,"ExportAllDeclaration")};g.parseExport=function(e,t){if(this.next(),this.eat(r.star))return this.parseExportAllDeclaration(e,t);if(this.eat(r._default))return this.checkExport(t,"default",this.lastTokStart),e.declaration=this.parseExportDefaultDeclaration(),this.finishNode(e,"ExportDefaultDeclaration");if(this.shouldParseExportStatement())e.declaration=this.parseExportDeclaration(e),e.declaration.type==="VariableDeclaration"?this.checkVariableExport(t,e.declaration.declarations):this.checkExport(t,e.declaration.id,e.declaration.id.start),e.specifiers=[],e.source=null,this.options.ecmaVersion>=16&&(e.attributes=[]);else{if(e.declaration=null,e.specifiers=this.parseExportSpecifiers(t),this.eatContextual("from"))this.type!==r.string&&this.unexpected(),e.source=this.parseExprAtom(),this.options.ecmaVersion>=16&&(e.attributes=this.parseWithClause());else{for(var a=0,i=e.specifiers;a<i.length;a+=1){var u=i[a];this.checkUnreserved(u.local),this.checkLocalExport(u.local),u.local.type==="Literal"&&this.raise(u.local.start,"A string literal cannot be used as an exported binding without `from`.")}e.source=null,this.options.ecmaVersion>=16&&(e.attributes=[])}this.semicolon()}return this.finishNode(e,"ExportNamedDeclaration")};g.parseExportDeclaration=function(e){return this.parseStatement(null)};g.parseExportDefaultDeclaration=function(){var e;if(this.type===r._function||(e=this.isAsyncFunction())){var t=this.startNode();return this.next(),e&&this.next(),this.parseFunction(t,Fe|as,!1,e)}else if(this.type===r._class){var a=this.startNode();return this.parseClass(a,"nullableID")}else{var i=this.parseMaybeAssign();return this.semicolon(),i}};g.checkExport=function(e,t,a){e&&(typeof t!="string"&&(t=t.type==="Identifier"?t.name:t.value),xe(e,t)&&this.raiseRecoverable(a,"Duplicate export '"+t+"'"),e[t]=!0)};g.checkPatternExport=function(e,t){var a=t.type;if(a==="Identifier")this.checkExport(e,t,t.start);else if(a==="ObjectPattern")for(var i=0,u=t.properties;i<u.length;i+=1){var o=u[i];this.checkPatternExport(e,o)}else if(a==="ArrayPattern")for(var h=0,d=t.elements;h<d.length;h+=1){var E=d[h];E&&this.checkPatternExport(e,E)}else a==="Property"?this.checkPatternExport(e,t.value):a==="AssignmentPattern"?this.checkPatternExport(e,t.left):a==="RestElement"&&this.checkPatternExport(e,t.argument)};g.checkVariableExport=function(e,t){if(e)for(var a=0,i=t;a<i.length;a+=1){var u=i[a];this.checkPatternExport(e,u.id)}};g.shouldParseExportStatement=function(){return this.type.keyword==="var"||this.type.keyword==="const"||this.type.keyword==="class"||this.type.keyword==="function"||this.isLet()||this.isAsyncFunction()};g.parseExportSpecifier=function(e){var t=this.startNode();return t.local=this.parseModuleExportName(),t.exported=this.eatContextual("as")?this.parseModuleExportName():t.local,this.checkExport(e,t.exported,t.exported.start),this.finishNode(t,"ExportSpecifier")};g.parseExportSpecifiers=function(e){var t=[],a=!0;for(this.expect(r.braceL);!this.eat(r.braceR);){if(a)a=!1;else if(this.expect(r.comma),this.afterTrailingComma(r.braceR))break;t.push(this.parseExportSpecifier(e))}return t};g.parseImport=function(e){return this.next(),this.type===r.string?(e.specifiers=Tr,e.source=this.parseExprAtom()):(e.specifiers=this.parseImportSpecifiers(),this.expectContextual("from"),e.source=this.type===r.string?this.parseExprAtom():this.unexpected()),this.options.ecmaVersion>=16&&(e.attributes=this.parseWithClause()),this.semicolon(),this.finishNode(e,"ImportDeclaration")};g.parseImportSpecifier=function(){var e=this.startNode();return e.imported=this.parseModuleExportName(),this.eatContextual("as")?e.local=this.parseIdent():(this.checkUnreserved(e.imported),e.local=e.imported),this.checkLValSimple(e.local,le),this.finishNode(e,"ImportSpecifier")};g.parseImportDefaultSpecifier=function(){var e=this.startNode();return e.local=this.parseIdent(),this.checkLValSimple(e.local,le),this.finishNode(e,"ImportDefaultSpecifier")};g.parseImportNamespaceSpecifier=function(){var e=this.startNode();return this.next(),this.expectContextual("as"),e.local=this.parseIdent(),this.checkLValSimple(e.local,le),this.finishNode(e,"ImportNamespaceSpecifier")};g.parseImportSpecifiers=function(){var e=[],t=!0;if(this.type===r.name&&(e.push(this.parseImportDefaultSpecifier()),!this.eat(r.comma)))return e;if(this.type===r.star)return e.push(this.parseImportNamespaceSpecifier()),e;for(this.expect(r.braceL);!this.eat(r.braceR);){if(t)t=!1;else if(this.expect(r.comma),this.afterTrailingComma(r.braceR))break;e.push(this.parseImportSpecifier())}return e};g.parseWithClause=function(){var e=[];if(!this.eat(r._with))return e;this.expect(r.braceL);for(var t={},a=!0;!this.eat(r.braceR);){if(a)a=!1;else if(this.expect(r.comma),this.afterTrailingComma(r.braceR))break;var i=this.parseImportAttribute(),u=i.key.type==="Identifier"?i.key.name:i.key.value;xe(t,u)&&this.raiseRecoverable(i.key.start,"Duplicate attribute key '"+u+"'"),t[u]=!0,e.push(i)}return e};g.parseImportAttribute=function(){var e=this.startNode();return e.key=this.type===r.string?this.parseExprAtom():this.parseIdent(this.options.allowReserved!=="never"),this.expect(r.colon),this.type!==r.string&&this.unexpected(),e.value=this.parseExprAtom(),this.finishNode(e,"ImportAttribute")};g.parseModuleExportName=function(){if(this.options.ecmaVersion>=13&&this.type===r.string){var e=this.parseLiteral(this.value);return lr.test(e.value)&&this.raise(e.start,"An export name cannot include a lone surrogate."),e}return this.parseIdent(!0)};g.adaptDirectivePrologue=function(e){for(var t=0;t<e.length&&this.isDirectiveCandidate(e[t]);++t)e[t].directive=e[t].expression.raw.slice(1,-1)};g.isDirectiveCandidate=function(e){return this.options.ecmaVersion>=5&&e.type==="ExpressionStatement"&&e.expression.type==="Literal"&&typeof e.expression.value=="string"&&(this.input[e.start]==='"'||this.input[e.start]==="'")};var $=M.prototype;$.toAssignable=function(e,t,a){if(this.options.ecmaVersion>=6&&e)switch(e.type){case"Identifier":this.inAsync&&e.name==="await"&&this.raise(e.start,"Cannot use 'await' as identifier inside an async function");break;case"ObjectPattern":case"ArrayPattern":case"AssignmentPattern":case"RestElement":break;case"ObjectExpression":e.type="ObjectPattern",a&&this.checkPatternErrors(a,!0);for(var i=0,u=e.properties;i<u.length;i+=1){var o=u[i];this.toAssignable(o,t),o.type==="RestElement"&&(o.argument.type==="ArrayPattern"||o.argument.type==="ObjectPattern")&&this.raise(o.argument.start,"Unexpected token")}break;case"Property":e.kind!=="init"&&this.raise(e.key.start,"Object pattern can't contain getter or setter"),this.toAssignable(e.value,t);break;case"ArrayExpression":e.type="ArrayPattern",a&&this.checkPatternErrors(a,!0),this.toAssignableList(e.elements,t);break;case"SpreadElement":e.type="RestElement",this.toAssignable(e.argument,t),e.argument.type==="AssignmentPattern"&&this.raise(e.argument.start,"Rest elements cannot have a default value");break;case"AssignmentExpression":e.operator!=="="&&this.raise(e.left.end,"Only '=' operator can be used for specifying default value."),e.type="AssignmentPattern",delete e.operator,this.toAssignable(e.left,t);break;case"ParenthesizedExpression":this.toAssignable(e.expression,t,a);break;case"ChainExpression":this.raiseRecoverable(e.start,"Optional chaining cannot appear in left-hand side");break;case"MemberExpression":if(!t)break;default:this.raise(e.start,"Assigning to rvalue")}else a&&this.checkPatternErrors(a,!0);return e};$.toAssignableList=function(e,t){for(var a=e.length,i=0;i<a;i++){var u=e[i];u&&this.toAssignable(u,t)}if(a){var o=e[a-1];this.options.ecmaVersion===6&&t&&o&&o.type==="RestElement"&&o.argument.type!=="Identifier"&&this.unexpected(o.argument.start)}return e};$.parseSpread=function(e){var t=this.startNode();return this.next(),t.argument=this.parseMaybeAssign(!1,e),this.finishNode(t,"SpreadElement")};$.parseRestBinding=function(){var e=this.startNode();return this.next(),this.options.ecmaVersion===6&&this.type!==r.name&&this.unexpected(),e.argument=this.parseBindingAtom(),this.finishNode(e,"RestElement")};$.parseBindingAtom=function(){if(this.options.ecmaVersion>=6)switch(this.type){case r.bracketL:var e=this.startNode();return this.next(),e.elements=this.parseBindingList(r.bracketR,!0,!0),this.finishNode(e,"ArrayPattern");case r.braceL:return this.parseObj(!0)}return this.parseIdent()};$.parseBindingList=function(e,t,a,i){for(var u=[],o=!0;!this.eat(e);)if(o?o=!1:this.expect(r.comma),t&&this.type===r.comma)u.push(null);else{if(a&&this.afterTrailingComma(e))break;if(this.type===r.ellipsis){var h=this.parseRestBinding();this.parseBindingListItem(h),u.push(h),this.type===r.comma&&this.raiseRecoverable(this.start,"Comma is not permitted after the rest element"),this.expect(e);break}else u.push(this.parseAssignableListItem(i))}return u};$.parseAssignableListItem=function(e){var t=this.parseMaybeDefault(this.start,this.startLoc);return this.parseBindingListItem(t),t};$.parseBindingListItem=function(e){return e};$.parseMaybeDefault=function(e,t,a){if(a=a||this.parseBindingAtom(),this.options.ecmaVersion<6||!this.eat(r.eq))return a;var i=this.startNodeAt(e,t);return i.left=a,i.right=this.parseMaybeAssign(),this.finishNode(i,"AssignmentPattern")};$.checkLValSimple=function(e,t,a){t===void 0&&(t=ot);var i=t!==ot;switch(e.type){case"Identifier":this.strict&&this.reservedWordsStrictBind.test(e.name)&&this.raiseRecoverable(e.start,(i?"Binding ":"Assigning to ")+e.name+" in strict mode"),i&&(t===le&&e.name==="let"&&this.raiseRecoverable(e.start,"let is disallowed as a lexically bound name"),a&&(xe(a,e.name)&&this.raiseRecoverable(e.start,"Argument name clash"),a[e.name]=!0),t!==ts&&this.declareName(e.name,t,e.start));break;case"ChainExpression":this.raiseRecoverable(e.start,"Optional chaining cannot appear in left-hand side");break;case"MemberExpression":i&&this.raiseRecoverable(e.start,"Binding member expression");break;case"ParenthesizedExpression":return i&&this.raiseRecoverable(e.start,"Binding parenthesized expression"),this.checkLValSimple(e.expression,t,a);default:this.raise(e.start,(i?"Binding":"Assigning to")+" rvalue")}};$.checkLValPattern=function(e,t,a){switch(t===void 0&&(t=ot),e.type){case"ObjectPattern":for(var i=0,u=e.properties;i<u.length;i+=1){var o=u[i];this.checkLValInnerPattern(o,t,a)}break;case"ArrayPattern":for(var h=0,d=e.elements;h<d.length;h+=1){var E=d[h];E&&this.checkLValInnerPattern(E,t,a)}break;default:this.checkLValSimple(e,t,a)}};$.checkLValInnerPattern=function(e,t,a){switch(t===void 0&&(t=ot),e.type){case"Property":this.checkLValInnerPattern(e.value,t,a);break;case"AssignmentPattern":this.checkLValPattern(e.left,t,a);break;case"RestElement":this.checkLValPattern(e.argument,t,a);break;default:this.checkLValPattern(e,t,a)}};var se=function(t,a,i,u,o){this.token=t,this.isExpr=!!a,this.preserveSpace=!!i,this.override=u,this.generator=!!o},D={b_stat:new se("{",!1),b_expr:new se("{",!0),b_tmpl:new se("${",!1),p_stat:new se("(",!1),p_expr:new se("(",!0),q_tmpl:new se("`",!0,!0,function(e){return e.tryReadTemplateToken()}),f_stat:new se("function",!1),f_expr:new se("function",!0),f_expr_gen:new se("function",!0,!1,null,!0),f_gen:new se("function",!1,!1,null,!0)},Ne=M.prototype;Ne.initialContext=function(){return[D.b_stat]};Ne.curContext=function(){return this.context[this.context.length-1]};Ne.braceIsBlock=function(e){var t=this.curContext();return t===D.f_expr||t===D.f_stat?!0:e===r.colon&&(t===D.b_stat||t===D.b_expr)?!t.isExpr:e===r._return||e===r.name&&this.exprAllowed?X.test(this.input.slice(this.lastTokEnd,this.start)):e===r._else||e===r.semi||e===r.eof||e===r.parenR||e===r.arrow?!0:e===r.braceL?t===D.b_stat:e===r._var||e===r._const||e===r.name?!1:!this.exprAllowed};Ne.inGeneratorContext=function(){for(var e=this.context.length-1;e>=1;e--){var t=this.context[e];if(t.token==="function")return t.generator}return!1};Ne.updateContext=function(e){var t,a=this.type;a.keyword&&e===r.dot?this.exprAllowed=!1:(t=a.updateContext)?t.call(this,e):this.exprAllowed=a.beforeExpr};Ne.overrideContext=function(e){this.curContext()!==e&&(this.context[this.context.length-1]=e)};r.parenR.updateContext=r.braceR.updateContext=function(){if(this.context.length===1){this.exprAllowed=!0;return}var e=this.context.pop();e===D.b_stat&&this.curContext().token==="function"&&(e=this.context.pop()),this.exprAllowed=!e.isExpr};r.braceL.updateContext=function(e){this.context.push(this.braceIsBlock(e)?D.b_stat:D.b_expr),this.exprAllowed=!0};r.dollarBraceL.updateContext=function(){this.context.push(D.b_tmpl),this.exprAllowed=!0};r.parenL.updateContext=function(e){var t=e===r._if||e===r._for||e===r._with||e===r._while;this.context.push(t?D.p_stat:D.p_expr),this.exprAllowed=!0};r.incDec.updateContext=function(){};r._function.updateContext=r._class.updateContext=function(e){e.beforeExpr&&e!==r._else&&!(e===r.semi&&this.curContext()!==D.p_stat)&&!(e===r._return&&X.test(this.input.slice(this.lastTokEnd,this.start)))&&!((e===r.colon||e===r.braceL)&&this.curContext()===D.b_stat)?this.context.push(D.f_expr):this.context.push(D.f_stat),this.exprAllowed=!1};r.colon.updateContext=function(){this.curContext().token==="function"&&this.context.pop(),this.exprAllowed=!0};r.backQuote.updateContext=function(){this.curContext()===D.q_tmpl?this.context.pop():this.context.push(D.q_tmpl),this.exprAllowed=!1};r.star.updateContext=function(e){if(e===r._function){var t=this.context.length-1;this.context[t]===D.f_expr?this.context[t]=D.f_expr_gen:this.context[t]=D.f_gen}this.exprAllowed=!0};r.name.updateContext=function(e){var t=!1;this.options.ecmaVersion>=6&&e!==r.dot&&(this.value==="of"&&!this.exprAllowed||this.value==="yield"&&this.inGeneratorContext())&&(t=!0),this.exprAllowed=t};var I=M.prototype;I.checkPropClash=function(e,t,a){if(!(this.options.ecmaVersion>=9&&e.type==="SpreadElement")&&!(this.options.ecmaVersion>=6&&(e.computed||e.method||e.shorthand))){var i=e.key,u;switch(i.type){case"Identifier":u=i.name;break;case"Literal":u=String(i.value);break;default:return}var o=e.kind;if(this.options.ecmaVersion>=6){u==="__proto__"&&o==="init"&&(t.proto&&(a?a.doubleProto<0&&(a.doubleProto=i.start):this.raiseRecoverable(i.start,"Redefinition of __proto__ property")),t.proto=!0);return}u="$"+u;var h=t[u];if(h){var d;o==="init"?d=this.strict&&h.init||h.get||h.set:d=h.init||h[o],d&&this.raiseRecoverable(i.start,"Redefinition of property")}else h=t[u]={init:!1,get:!1,set:!1};h[o]=!0}};I.parseExpression=function(e,t){var a=this;return this.catchStackOverflow(function(){var i=a.start,u=a.startLoc,o=a.parseMaybeAssign(e,t);if(a.type===r.comma){var h=a.startNodeAt(i,u);for(h.expressions=[o];a.eat(r.comma);)h.expressions.push(a.parseMaybeAssign(e,t));return a.finishNode(h,"SequenceExpression")}return o})};I.parseMaybeAssign=function(e,t,a){if(this.isContextual("yield")){if(this.inGenerator)return this.parseYield(e);this.exprAllowed=!1}var i=!1,u=-1,o=-1,h=-1;t?(u=t.parenthesizedAssign,o=t.trailingComma,h=t.doubleProto,t.parenthesizedAssign=t.trailingComma=-1):(t=new Et,i=!0);var d=this.start,E=this.startLoc;(this.type===r.parenL||this.type===r.name)&&(this.potentialArrowAt=this.start,this.potentialArrowInForAwait=e==="await");var T=this.parseMaybeConditional(e,t);if(a&&(T=a.call(this,T,d,E)),this.type.isAssign){var A=this.startNodeAt(d,E);return A.operator=this.value,this.type===r.eq&&(T=this.toAssignable(T,!1,t)),i||(t.parenthesizedAssign=t.trailingComma=-1,t.shorthandAssign>=T.start&&(t.shorthandAssign=-1),t.doubleProto>=T.start&&(t.doubleProto=-1)),this.type===r.eq?this.checkLValPattern(T):this.checkLValSimple(T),A.left=T,this.next(),A.right=this.parseMaybeAssign(e),h>-1&&(t.doubleProto=h),this.finishNode(A,"AssignmentExpression")}else i&&this.checkExpressionErrors(t,!0);return u>-1&&(t.parenthesizedAssign=u),o>-1&&(t.trailingComma=o),T};I.parseMaybeConditional=function(e,t){var a=this.start,i=this.startLoc,u=this.parseExprOps(e,t);if(this.checkExpressionErrors(t))return u;if(!(u.type==="ArrowFunctionExpression"&&u.start===a)&&this.eat(r.question)){var o=this.startNodeAt(a,i);return o.test=u,o.consequent=this.parseMaybeAssign(),this.expect(r.colon),o.alternate=this.parseMaybeAssign(e),this.finishNode(o,"ConditionalExpression")}return u};I.parseExprOps=function(e,t){var a=this.start,i=this.startLoc,u=this.parseMaybeUnary(t,!1,!1,e);return this.checkExpressionErrors(t)||u.start===a&&u.type==="ArrowFunctionExpression"?u:this.parseExprOp(u,a,i,-1,e)};I.parseExprOp=function(e,t,a,i,u){var o=this.type.binop;if(o!=null&&(!u||this.type!==r._in)&&o>i){var h=this.type===r.logicalOR||this.type===r.logicalAND,d=this.type===r.coalesce;d&&(o=r.logicalAND.binop);var E=this.value;this.next();var T=this.start,A=this.startLoc,C=this.parseExprOp(this.parseMaybeUnary(null,!1,!1,u),T,A,o,u),L=this.buildBinary(t,a,e,C,E,h||d);return(h&&this.type===r.coalesce||d&&(this.type===r.logicalOR||this.type===r.logicalAND))&&this.raiseRecoverable(this.start,"Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses"),this.parseExprOp(L,t,a,i,u)}return e};I.buildBinary=function(e,t,a,i,u,o){i.type==="PrivateIdentifier"&&this.raise(i.start,"Private identifier can only be left side of binary expression");var h=this.startNodeAt(e,t);return h.left=a,h.operator=u,h.right=i,this.finishNode(h,o?"LogicalExpression":"BinaryExpression")};I.parseMaybeUnary=function(e,t,a,i){var u=this.start,o=this.startLoc,h;if(this.isContextual("await")&&this.canAwait)h=this.parseAwait(i),t=!0;else if(this.type.prefix){var d=this.startNode(),E=this.type===r.incDec;d.operator=this.value,d.prefix=!0,this.next(),d.argument=this.parseMaybeUnary(null,!0,E,i),this.checkExpressionErrors(e,!0),E?this.checkLValSimple(d.argument):this.strict&&d.operator==="delete"&&ss(d.argument)?this.raiseRecoverable(d.start,"Deleting local variable in strict mode"):d.operator==="delete"&&wt(d.argument)?this.raiseRecoverable(d.start,"Private fields can not be deleted"):t=!0,h=this.finishNode(d,E?"UpdateExpression":"UnaryExpression")}else if(!t&&this.type===r.privateId)(i||this.privateNameStack.length===0)&&this.options.checkPrivateFields&&this.unexpected(),h=this.parsePrivateIdent(),this.type!==r._in&&this.unexpected();else{if(h=this.parseExprSubscripts(e,i),this.checkExpressionErrors(e))return h;for(;this.type.postfix&&!this.canInsertSemicolon();){var T=this.startNodeAt(u,o);T.operator=this.value,T.prefix=!1,T.argument=h,this.checkLValSimple(h),this.next(),h=this.finishNode(T,"UpdateExpression")}}if(!a&&!(h.type==="ArrowFunctionExpression"&&h.start===u)&&this.eat(r.starstar))if(t)this.unexpected(this.lastTokStart);else return this.buildBinary(u,o,h,this.parseMaybeUnary(null,!1,!1,i),"**",!1);else return h};function ss(e){return e.type==="Identifier"||e.type==="ParenthesizedExpression"&&ss(e.expression)}function wt(e){return e.type==="MemberExpression"&&e.property.type==="PrivateIdentifier"||e.type==="ChainExpression"&&wt(e.expression)||e.type==="ParenthesizedExpression"&&wt(e.expression)}I.parseExprSubscripts=function(e,t){var a=this.start,i=this.startLoc,u=-1,o=-1;e&&(u=e.doubleProto,o=e.shorthandAssign,e.doubleProto=e.shorthandAssign=-1);var h=this.parseExprAtom(e,t);if(h.type==="ArrowFunctionExpression"&&this.input.slice(this.lastTokStart,this.lastTokEnd)!==")")return h;var d=this.parseSubscripts(h,a,i,!1,t);return e&&(d.end>h.end&&(this.checkExpressionErrors(e,!0),e.parenthesizedAssign>=d.start&&(e.parenthesizedAssign=-1),e.parenthesizedBind>=d.start&&(e.parenthesizedBind=-1),e.trailingComma>=d.start&&(e.trailingComma=-1)),u>-1&&(e.doubleProto=u),o>-1&&(e.shorthandAssign=o)),d};I.parseSubscripts=function(e,t,a,i,u){for(var o=this.options.ecmaVersion>=8&&e.type==="Identifier"&&e.name==="async"&&this.lastTokEnd===e.end&&!this.canInsertSemicolon()&&e.end-e.start===5&&this.potentialArrowAt===e.start,h=!1;;){var d=this.parseSubscript(e,t,a,i,o,h,u);if(d.optional&&(h=!0),d.end===e.end||d.type==="ArrowFunctionExpression"){if(h){var E=this.startNodeAt(t,a);E.expression=d,d=this.finishNode(E,"ChainExpression")}return d}e=d,o=!1}};I.shouldParseAsyncArrow=function(){return!this.canInsertSemicolon()&&this.eat(r.arrow)};I.parseSubscriptAsyncArrow=function(e,t,a,i){return this.parseArrowExpression(this.startNodeAt(e,t),a,!0,i)};I.parseSubscript=function(e,t,a,i,u,o,h){var d=this.options.ecmaVersion>=11,E=d&&this.eat(r.questionDot);i&&E&&this.raise(this.lastTokStart,"Optional chaining cannot appear in the callee of new expressions");var T=this.eat(r.bracketL);if(T||E&&this.type!==r.parenL&&this.type!==r.backQuote||this.eat(r.dot)){var A=this.startNodeAt(t,a);A.object=e,T?(A.property=this.parseExpression(),this.expect(r.bracketR)):this.type===r.privateId&&e.type!=="Super"?A.property=this.parsePrivateIdent():A.property=this.parseIdent(this.options.allowReserved!=="never"),A.computed=!!T,d&&(A.optional=E),e=this.finishNode(A,"MemberExpression")}else if(!i&&this.eat(r.parenL)){var C=new Et,L=this.yieldPos,B=this.awaitPos,v=this.awaitIdentPos;this.yieldPos=0,this.awaitPos=0,this.awaitIdentPos=0;var H=this.parseExprList(r.parenR,this.options.ecmaVersion>=8,!1,C);if(u&&!E&&this.shouldParseAsyncArrow())return this.checkPatternErrors(C,!1),this.checkYieldAwaitInDefaultParams(),this.awaitIdentPos>0&&this.raise(this.awaitIdentPos,"Cannot use 'await' as identifier inside an async function"),this.yieldPos=L,this.awaitPos=B,this.awaitIdentPos=v,this.parseSubscriptAsyncArrow(t,a,H,h);this.checkExpressionErrors(C,!0),this.yieldPos=L||this.yieldPos,this.awaitPos=B||this.awaitPos,this.awaitIdentPos=v||this.awaitIdentPos;var y=this.startNodeAt(t,a);y.callee=e,y.arguments=H,d&&(y.optional=E),e=this.finishNode(y,"CallExpression")}else if(this.type===r.backQuote){(E||o)&&this.raise(this.start,"Optional chaining cannot appear in the tag of tagged template expressions");var k=this.startNodeAt(t,a);k.tag=e,k.quasi=this.parseTemplate({isTagged:!0}),e=this.finishNode(k,"TaggedTemplateExpression")}return e};I.parseExprAtom=function(e,t,a){this.type===r.slash&&this.readRegexp();var i,u=this.potentialArrowAt===this.start;switch(this.type){case r._super:return this.allowSuper||this.raise(this.start,"'super' keyword outside a method"),i=this.startNode(),this.next(),this.type===r.parenL&&!this.allowDirectSuper&&this.raise(i.start,"super() call outside constructor of a subclass"),this.type!==r.dot&&this.type!==r.bracketL&&this.type!==r.parenL&&this.unexpected(),this.finishNode(i,"Super");case r._this:return i=this.startNode(),this.next(),this.finishNode(i,"ThisExpression");case r.name:var o=this.start,h=this.startLoc,d=this.containsEsc,E=this.parseIdent(!1);if(this.options.ecmaVersion>=8&&!d&&E.name==="async"&&!this.canInsertSemicolon()&&this.eat(r._function))return this.overrideContext(D.f_expr),this.parseFunction(this.startNodeAt(o,h),0,!1,!0,t);if(u&&!this.canInsertSemicolon()){if(this.eat(r.arrow))return this.parseArrowExpression(this.startNodeAt(o,h),[E],!1,t);if(this.options.ecmaVersion>=8&&E.name==="async"&&this.type===r.name&&!d&&(!this.potentialArrowInForAwait||this.value!=="of"||this.containsEsc))return E=this.parseIdent(!1),(this.canInsertSemicolon()||!this.eat(r.arrow))&&this.unexpected(),this.parseArrowExpression(this.startNodeAt(o,h),[E],!0,t)}return E;case r.regexp:var T=this.value;return i=this.parseLiteral(T.value),i.regex={pattern:T.pattern,flags:T.flags},i;case r.num:case r.string:return this.parseLiteral(this.value);case r._null:case r._true:case r._false:return i=this.startNode(),i.value=this.type===r._null?null:this.type===r._true,i.raw=this.type.keyword,this.next(),this.finishNode(i,"Literal");case r.parenL:var A=this.start,C=this.parseParenAndDistinguishExpression(u,t);return e&&(e.parenthesizedAssign<0&&!this.isSimpleAssignTarget(C)&&(e.parenthesizedAssign=A),e.parenthesizedBind<0&&(e.parenthesizedBind=A)),C;case r.bracketL:return i=this.startNode(),this.next(),i.elements=this.parseExprList(r.bracketR,!0,!0,e),this.finishNode(i,"ArrayExpression");case r.braceL:return this.overrideContext(D.b_expr),this.parseObj(!1,e);case r._function:return i=this.startNode(),this.next(),this.parseFunction(i,0);case r._class:return this.parseClass(this.startNode(),!1);case r._new:return this.parseNew();case r.backQuote:return this.parseTemplate();case r._import:return this.options.ecmaVersion>=11?this.parseExprImport(a):this.unexpected();default:return this.parseExprAtomDefault()}};I.parseExprAtomDefault=function(){this.unexpected()};I.parseExprImport=function(e){var t=this.startNode();if(this.containsEsc&&this.raiseRecoverable(this.start,"Escape sequence in keyword import"),this.next(),this.type===r.parenL&&!e)return this.parseDynamicImport(t);if(this.type===r.dot){var a=this.startNodeAt(t.start,t.loc&&t.loc.start);return a.name="import",t.meta=this.finishNode(a,"Identifier"),this.parseImportMeta(t)}else this.unexpected()};I.parseDynamicImport=function(e){if(this.next(),e.source=this.parseMaybeAssign(),this.options.ecmaVersion>=16)this.eat(r.parenR)?e.options=null:(this.expect(r.comma),this.afterTrailingComma(r.parenR)?e.options=null:(e.options=this.parseMaybeAssign(),this.eat(r.parenR)||(this.expect(r.comma),this.afterTrailingComma(r.parenR)||this.unexpected())));else if(!this.eat(r.parenR)){var t=this.start;this.eat(r.comma)&&this.eat(r.parenR)?this.raiseRecoverable(t,"Trailing comma is not allowed in import()"):this.unexpected(t)}return this.finishNode(e,"ImportExpression")};I.parseImportMeta=function(e){this.next();var t=this.containsEsc;return e.property=this.parseIdent(!0),e.property.name!=="meta"&&this.raiseRecoverable(e.property.start,"The only valid meta property for import is 'import.meta'"),t&&this.raiseRecoverable(e.start,"'import.meta' must not contain escaped characters"),this.options.sourceType!=="module"&&!this.options.allowImportExportEverywhere&&this.raiseRecoverable(e.start,"Cannot use 'import.meta' outside a module"),this.finishNode(e,"MetaProperty")};I.parseLiteral=function(e){var t=this.startNode();return t.value=e,t.raw=this.input.slice(this.start,this.end),t.raw.charCodeAt(t.raw.length-1)===110&&(t.bigint=t.value!=null?t.value.toString():t.raw.slice(0,-1).replace(/_/g,"")),this.next(),this.finishNode(t,"Literal")};I.parseParenExpression=function(){this.expect(r.parenL);var e=this.parseExpression();return this.expect(r.parenR),e};I.shouldParseArrow=function(e){return!this.canInsertSemicolon()};I.parseParenAndDistinguishExpression=function(e,t){var a=this.start,i=this.startLoc,u,o=this.options.ecmaVersion>=8;if(this.options.ecmaVersion>=6){this.next();var h=this.start,d=this.startLoc,E=[],T=!0,A=!1,C=new Et,L=this.yieldPos,B=this.awaitPos,v;for(this.yieldPos=0,this.awaitPos=0;this.type!==r.parenR;)if(T?T=!1:this.expect(r.comma),o&&this.afterTrailingComma(r.parenR,!0)){A=!0;break}else if(this.type===r.ellipsis){v=this.start,E.push(this.parseParenItem(this.parseRestBinding())),this.type===r.comma&&this.raiseRecoverable(this.start,"Comma is not permitted after the rest element");break}else E.push(this.parseMaybeAssign(!1,C,this.parseParenItem));var H=this.lastTokEnd,y=this.lastTokEndLoc;if(this.expect(r.parenR),e&&this.shouldParseArrow(E)&&this.eat(r.arrow))return this.checkPatternErrors(C,!1),this.checkYieldAwaitInDefaultParams(),this.yieldPos=L,this.awaitPos=B,this.parseParenArrowList(a,i,E,t);(!E.length||A)&&this.unexpected(this.lastTokStart),v&&this.unexpected(v),this.checkExpressionErrors(C,!0),this.yieldPos=L||this.yieldPos,this.awaitPos=B||this.awaitPos,E.length>1?(u=this.startNodeAt(h,d),u.expressions=E,this.finishNodeAt(u,"SequenceExpression",H,y)):u=E[0]}else u=this.parseParenExpression();if(this.options.preserveParens){var k=this.startNodeAt(a,i);return k.expression=u,this.finishNode(k,"ParenthesizedExpression")}else return u};I.parseParenItem=function(e){return e};I.parseParenArrowList=function(e,t,a,i){return this.parseArrowExpression(this.startNodeAt(e,t),a,!1,i)};var _r=[];I.parseNew=function(){this.containsEsc&&this.raiseRecoverable(this.start,"Escape sequence in keyword new");var e=this.startNode();if(this.next(),this.options.ecmaVersion>=6&&this.type===r.dot){var t=this.startNodeAt(e.start,e.loc&&e.loc.start);t.name="new",e.meta=this.finishNode(t,"Identifier"),this.next();var a=this.containsEsc;return e.property=this.parseIdent(!0),e.property.name!=="target"&&this.raiseRecoverable(e.property.start,"The only valid meta property for new is 'new.target'"),a&&this.raiseRecoverable(e.start,"'new.target' must not contain escaped characters"),this.allowNewDotTarget||this.raiseRecoverable(e.start,"'new.target' can only be used in functions and class static block"),this.finishNode(e,"MetaProperty")}var i=this.start,u=this.startLoc;return e.callee=this.parseSubscripts(this.parseExprAtom(null,!1,!0),i,u,!0,!1),e.callee.type==="Super"&&this.raiseRecoverable(i,"Invalid use of 'super'"),this.eat(r.parenL)?e.arguments=this.parseExprList(r.parenR,this.options.ecmaVersion>=8,!1):e.arguments=_r,this.finishNode(e,"NewExpression")};I.parseTemplateElement=function(e){var t=e.isTagged,a=this.startNode();return this.type===r.invalidTemplate?(t||this.raiseRecoverable(this.start,"Bad escape sequence in untagged template literal"),a.value={raw:this.value.replace(/\r\n?/g,`
`),cooked:null}):a.value={raw:this.input.slice(this.start,this.end).replace(/\r\n?/g,`
`),cooked:this.value},this.next(),a.tail=this.type===r.backQuote,this.finishNode(a,"TemplateElement")};I.parseTemplate=function(e){e===void 0&&(e={});var t=e.isTagged;t===void 0&&(t=!1);var a=this.startNode();this.next(),a.expressions=[];var i=this.parseTemplateElement({isTagged:t});for(a.quasis=[i];!i.tail;)this.type===r.eof&&this.raise(this.pos,"Unterminated template literal"),this.expect(r.dollarBraceL),a.expressions.push(this.parseExpression()),this.expect(r.braceR),a.quasis.push(i=this.parseTemplateElement({isTagged:t}));return this.next(),this.finishNode(a,"TemplateLiteral")};I.isAsyncProp=function(e){return!e.computed&&e.key.type==="Identifier"&&e.key.name==="async"&&(this.type===r.name||this.type===r.num||this.type===r.string||this.type===r.bracketL||this.type.keyword||this.options.ecmaVersion>=9&&this.type===r.star)&&!X.test(this.input.slice(this.lastTokEnd,this.start))};I.parseObj=function(e,t){var a=this.startNode(),i=!0,u={};for(a.properties=[],this.next();!this.eat(r.braceR);){if(i)i=!1;else if(this.expect(r.comma),this.options.ecmaVersion>=5&&this.afterTrailingComma(r.braceR))break;var o=this.parseProperty(e,t);e||this.checkPropClash(o,u,t),a.properties.push(o)}return this.finishNode(a,e?"ObjectPattern":"ObjectExpression")};I.parseProperty=function(e,t){var a=this.startNode(),i,u,o,h;if(this.options.ecmaVersion>=9&&this.eat(r.ellipsis))return e?(a.argument=this.parseIdent(!1),this.type===r.comma&&this.raiseRecoverable(this.start,"Comma is not permitted after the rest element"),this.finishNode(a,"RestElement")):(a.argument=this.parseMaybeAssign(!1,t),this.type===r.comma&&t&&t.trailingComma<0&&(t.trailingComma=this.start),this.finishNode(a,"SpreadElement"));this.options.ecmaVersion>=6&&(a.method=!1,a.shorthand=!1,(e||t)&&(o=this.start,h=this.startLoc),e||(i=this.eat(r.star)));var d=this.containsEsc;return this.parsePropertyName(a),!e&&!d&&this.options.ecmaVersion>=8&&!i&&this.isAsyncProp(a)?(u=!0,i=this.options.ecmaVersion>=9&&this.eat(r.star),this.parsePropertyName(a)):u=!1,this.parsePropertyValue(a,e,i,u,o,h,t,d),this.finishNode(a,"Property")};I.parseGetterSetter=function(e){var t=e.key.name;this.parsePropertyName(e),e.value=this.parseMethod(!1),e.kind=t;var a=e.kind==="get"?0:1;if(e.value.params.length!==a){var i=e.value.start;e.kind==="get"?this.raiseRecoverable(i,"getter should have no params"):this.raiseRecoverable(i,"setter should have exactly one param")}else e.kind==="set"&&e.value.params[0].type==="RestElement"&&this.raiseRecoverable(e.value.params[0].start,"Setter cannot use rest params")};I.parsePropertyValue=function(e,t,a,i,u,o,h,d){(a||i)&&this.type===r.colon&&this.unexpected(),this.eat(r.colon)?(e.value=t?this.parseMaybeDefault(this.start,this.startLoc):this.parseMaybeAssign(!1,h),e.kind="init"):this.options.ecmaVersion>=6&&this.type===r.parenL?(t&&this.unexpected(),e.method=!0,e.value=this.parseMethod(a,i),e.kind="init"):!t&&!d&&this.options.ecmaVersion>=5&&!e.computed&&e.key.type==="Identifier"&&(e.key.name==="get"||e.key.name==="set")&&this.type!==r.comma&&this.type!==r.braceR&&this.type!==r.eq?((a||i)&&this.unexpected(),this.parseGetterSetter(e)):this.options.ecmaVersion>=6&&!e.computed&&e.key.type==="Identifier"?((a||i)&&this.unexpected(),this.checkUnreserved(e.key),e.key.name==="await"&&!this.awaitIdentPos&&(this.awaitIdentPos=u),t?e.value=this.parseMaybeDefault(u,o,this.copyNode(e.key)):this.type===r.eq&&h?(h.shorthandAssign<0&&(h.shorthandAssign=this.start),e.value=this.parseMaybeDefault(u,o,this.copyNode(e.key))):e.value=this.copyNode(e.key),e.kind="init",e.shorthand=!0):this.unexpected()};I.parsePropertyName=function(e){if(this.options.ecmaVersion>=6){if(this.eat(r.bracketL))return e.computed=!0,e.key=this.parseMaybeAssign(),this.expect(r.bracketR),e.key;e.computed=!1}return e.key=this.type===r.num||this.type===r.string?this.parseExprAtom():this.parseIdent(this.options.allowReserved!=="never")};I.initFunction=function(e){e.id=null,this.options.ecmaVersion>=6&&(e.generator=e.expression=!1),this.options.ecmaVersion>=8&&(e.async=!1)};I.parseMethod=function(e,t,a){var i=this.startNode(),u=this.yieldPos,o=this.awaitPos,h=this.awaitIdentPos;return this.initFunction(i),this.options.ecmaVersion>=6&&(i.generator=e),this.options.ecmaVersion>=8&&(i.async=!!t),this.yieldPos=0,this.awaitPos=0,this.awaitIdentPos=0,this.enterScope(Vt(t,i.generator)|dt|(a?Ja:0)),this.expect(r.parenL),i.params=this.parseBindingList(r.parenR,!1,this.options.ecmaVersion>=8),this.checkYieldAwaitInDefaultParams(),this.parseFunctionBody(i,!1,!0,!1),this.yieldPos=u,this.awaitPos=o,this.awaitIdentPos=h,this.finishNode(i,"FunctionExpression")};I.parseArrowExpression=function(e,t,a,i){var u=this.yieldPos,o=this.awaitPos,h=this.awaitIdentPos;return this.enterScope(Vt(a,!1)|Ht),this.initFunction(e),this.options.ecmaVersion>=8&&(e.async=!!a),this.yieldPos=0,this.awaitPos=0,this.awaitIdentPos=0,e.params=this.toAssignableList(t,!0),this.parseFunctionBody(e,!0,!1,i),this.yieldPos=u,this.awaitPos=o,this.awaitIdentPos=h,this.finishNode(e,"ArrowFunctionExpression")};I.parseFunctionBody=function(e,t,a,i){var u=t&&this.type!==r.braceL,o=this.strict,h=!1;if(u)e.body=this.parseMaybeAssign(i),e.expression=!0,this.checkParams(e,!1);else{var d=this.options.ecmaVersion>=7&&!this.isSimpleParamList(e.params);(!o||d)&&(h=this.strictDirective(this.end),h&&d&&this.raiseRecoverable(e.start,"Illegal 'use strict' directive in function with non-simple parameter list"));var E=this.labels;this.labels=[],h&&(this.strict=!0),this.checkParams(e,!o&&!h&&!t&&!a&&this.isSimpleParamList(e.params)),this.strict&&e.id&&this.checkLValSimple(e.id,ts),e.body=this.parseBlock(!1,void 0,h&&!o),e.expression=!1,this.adaptDirectivePrologue(e.body.body),this.labels=E}this.exitScope()};I.isSimpleParamList=function(e){for(var t=0,a=e;t<a.length;t+=1){var i=a[t];if(i.type!=="Identifier")return!1}return!0};I.checkParams=function(e,t){for(var a=Object.create(null),i=0,u=e.params;i<u.length;i+=1){var o=u[i];this.checkLValInnerPattern(o,Yt,t?null:a)}};I.parseExprList=function(e,t,a,i){for(var u=[],o=!0;!this.eat(e);){if(o)o=!1;else if(this.expect(r.comma),t&&this.afterTrailingComma(e))break;var h=void 0;a&&this.type===r.comma?h=null:this.type===r.ellipsis?(h=this.parseSpread(i),i&&this.type===r.comma&&i.trailingComma<0&&(i.trailingComma=this.start)):h=this.parseMaybeAssign(!1,i),u.push(h)}return u};I.checkUnreserved=function(e){var t=e.start,a=e.end,i=e.name;if(this.inGenerator&&i==="yield"&&this.raiseRecoverable(t,"Cannot use 'yield' as identifier inside a generator"),this.inAsync&&i==="await"&&this.raiseRecoverable(t,"Cannot use 'await' as identifier inside an async function"),!(this.currentThisScope().flags&pt)&&i==="arguments"&&this.raiseRecoverable(t,"Cannot use 'arguments' in class field initializer"),this.inClassStaticBlock&&(i==="arguments"||i==="await")&&this.raise(t,"Cannot use "+i+" in class static initialization block"),this.keywords.test(i)&&this.raise(t,"Unexpected keyword '"+i+"'"),!(this.options.ecmaVersion<6&&this.input.slice(t,a).indexOf("\\")!==-1)){var u=this.strict?this.reservedWordsStrict:this.reservedWords;u.test(i)&&(!this.inAsync&&i==="await"&&this.raiseRecoverable(t,"Cannot use keyword 'await' outside an async function"),this.raiseRecoverable(t,"The keyword '"+i+"' is reserved"))}};I.parseIdent=function(e){var t=this.parseIdentNode();return this.next(!!e),this.finishNode(t,"Identifier"),e||(this.checkUnreserved(t),t.name==="await"&&!this.awaitIdentPos&&(this.awaitIdentPos=t.start)),t};I.parseIdentNode=function(){var e=this.startNode();return this.type===r.name?e.name=this.value:this.type.keyword?(e.name=this.type.keyword,(e.name==="class"||e.name==="function")&&(this.lastTokEnd!==this.lastTokStart+1||this.input.charCodeAt(this.lastTokStart)!==46)&&this.context.pop(),this.type=r.name):this.unexpected(),e};I.parsePrivateIdent=function(){var e=this.startNode();return this.type===r.privateId?e.name=this.value:this.unexpected(),this.next(),this.finishNode(e,"PrivateIdentifier"),this.options.checkPrivateFields&&(this.privateNameStack.length===0?this.raise(e.start,"Private field '#"+e.name+"' must be declared in an enclosing class"):this.privateNameStack[this.privateNameStack.length-1].used.push(e)),e};I.parseYield=function(e){this.yieldPos||(this.yieldPos=this.start);var t=this.startNode();return this.next(),this.type===r.semi||this.canInsertSemicolon()||this.type!==r.star&&!this.type.startsExpr?(t.delegate=!1,t.argument=null):(t.delegate=this.eat(r.star),t.argument=this.parseMaybeAssign(e)),this.finishNode(t,"YieldExpression")};I.parseAwait=function(e){this.awaitPos||(this.awaitPos=this.start);var t=this.startNode();return this.next(),t.argument=this.parseMaybeUnary(null,!0,!1,e),this.finishNode(t,"AwaitExpression")};var ht=M.prototype;ht.raise=function(e,t){var a=Xa(this.input,e);t+=" ("+a.line+":"+a.column+")",this.sourceFile&&(t+=" in "+this.sourceFile);var i=new SyntaxError(t);throw i.pos=e,i.loc=a,i.raisedAt=this.pos,i};ht.raiseRecoverable=ht.raise;ht.curPosition=function(){if(this.options.locations)return new Ue(this.curLine,this.pos-this.lineStart)};var Ee=M.prototype,Ar=function(t){this.flags=t,this.var=[],this.lexical=[],this.functions=[]};Ee.enterScope=function(e){this.scopeStack.push(new Ar(e))};Ee.exitScope=function(){this.scopeStack.pop()};Ee.treatFunctionsAsVarInScope=function(e){return e.flags&_e||!this.inModule&&e.flags&be};Ee.declareName=function(e,t,a){var i=!1;if(t===le){var u=this.currentScope();i=u.lexical.indexOf(e)>-1||u.functions.indexOf(e)>-1||u.var.indexOf(e)>-1,u.lexical.push(e),this.inModule&&u.flags&be&&delete this.undefinedExports[e]}else if(t===es){var o=this.currentScope();o.lexical.push(e)}else if(t===$a){var h=this.currentScope();this.treatFunctionsAsVar?i=h.lexical.indexOf(e)>-1:i=h.lexical.indexOf(e)>-1||h.var.indexOf(e)>-1,h.functions.push(e)}else for(var d=this.scopeStack.length-1;d>=0;--d){var E=this.scopeStack[d];if(E.lexical.indexOf(e)>-1&&!(E.flags&za&&E.lexical[0]===e)||!this.treatFunctionsAsVarInScope(E)&&E.functions.indexOf(e)>-1){i=!0;break}if(E.var.push(e),this.inModule&&E.flags&be&&delete this.undefinedExports[e],E.flags&pt)break}i&&this.raiseRecoverable(a,"Identifier '"+e+"' has already been declared")};Ee.checkLocalExport=function(e){this.scopeStack[0].lexical.indexOf(e.name)===-1&&this.scopeStack[0].var.indexOf(e.name)===-1&&(this.undefinedExports[e.name]=e)};Ee.currentScope=function(){return this.scopeStack[this.scopeStack.length-1]};Ee.currentVarScope=function(){for(var e=this.scopeStack.length-1;;e--){var t=this.scopeStack[e];if(t.flags&(pt|He|Ae))return t}};Ee.currentThisScope=function(){for(var e=this.scopeStack.length-1;;e--){var t=this.scopeStack[e];if(t.flags&(pt|He|Ae)&&!(t.flags&Ht))return t}};var mt=function(t,a,i){this.type="",this.start=a,this.end=0,t.options.locations&&(this.loc=new ft(t,i)),t.options.directSourceFile&&(this.sourceFile=t.options.directSourceFile),t.options.ranges&&(this.range=[a,0])},Ve=M.prototype;Ve.startNode=function(){return new mt(this,this.start,this.startLoc)};Ve.startNodeAt=function(e,t){return new mt(this,e,t)};function is(e,t,a,i){return e.type=t,e.end=a,this.options.locations&&(e.loc.end=i),this.options.ranges&&(e.range[1]=a),e}Ve.finishNode=function(e,t){return is.call(this,e,t,this.lastTokEnd,this.lastTokEndLoc)};Ve.finishNodeAt=function(e,t,a,i){return is.call(this,e,t,a,i)};Ve.copyNode=function(e){var t=new mt(this,e.start,this.startLoc);for(var a in e)t[a]=e[a];return t};var gr="Berf Beria_Erfe Gara Garay Gukh Gurung_Khema Hrkt Katakana_Or_Hiragana Kawi Kirat_Rai Krai Nag_Mundari Nagm Ol_Onal Onao Sidetic Sidt Sunu Sunuwar Tai_Yo Tayo Todhri Todr Tolong_Siki Tols Tulu_Tigalari Tutg Unknown Zzzz",us="ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS",rs=us+" Extended_Pictographic",ns=rs,os=ns+" EBase EComp EMod EPres ExtPict",cs=os,Cr=cs,Ir={9:us,10:rs,11:ns,12:os,13:cs,14:Cr},xr="Basic_Emoji Emoji_Keycap_Sequence RGI_Emoji_Modifier_Sequence RGI_Emoji_Flag_Sequence RGI_Emoji_Tag_Sequence RGI_Emoji_ZWJ_Sequence RGI_Emoji",Nr={9:"",10:"",11:"",12:"",13:"",14:xr},Ha="Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu",hs="Adlam Adlm Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb",ls=hs+" Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd",fs=ls+" Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho",ds=fs+" Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi",ps=ds+" Cypro_Minoan Cpmn Old_Uyghur Ougr Tangsa Tnsa Toto Vithkuqi Vith",Sr=ps+" "+gr,Lr={9:hs,10:ls,11:fs,12:ds,13:ps,14:Sr},Es={};function Or(e){var t=Es[e]={binary:pe(Ir[e]+" "+Ha),binaryOfStrings:pe(Nr[e]),nonBinary:{General_Category:pe(Ha),Script:pe(Lr[e])}};t.nonBinary.Script_Extensions=t.nonBinary.Script,t.nonBinary.gc=t.nonBinary.General_Category,t.nonBinary.sc=t.nonBinary.Script,t.nonBinary.scx=t.nonBinary.Script_Extensions}for(nt=0,kt=[9,10,11,12,13,14];nt<kt.length;nt+=1)Va=kt[nt],Or(Va);var Va,nt,kt,_=M.prototype,lt=function(t,a){this.parent=t,this.base=a||this};lt.prototype.separatedFrom=function(t){for(var a=this;a;a=a.parent)for(var i=t;i;i=i.parent)if(a.base===i.base&&a!==i)return!0;return!1};lt.prototype.sibling=function(){return new lt(this.parent,this.base)};var re=function(t){this.parser=t,this.validFlags="gim"+(t.options.ecmaVersion>=6?"uy":"")+(t.options.ecmaVersion>=9?"s":"")+(t.options.ecmaVersion>=13?"d":"")+(t.options.ecmaVersion>=15?"v":""),this.unicodeProperties=Es[t.options.ecmaVersion>=14?14:t.options.ecmaVersion],this.source="",this.flags="",this.start=0,this.switchU=!1,this.switchV=!1,this.switchN=!1,this.pos=0,this.lastIntValue=0,this.lastStringValue="",this.lastAssertionIsQuantifiable=!1,this.numCapturingParens=0,this.maxBackReference=0,this.groupNames=Object.create(null),this.backReferenceNames=[],this.branchID=null};re.prototype.reset=function(t,a,i){var u=i.indexOf("v")!==-1,o=i.indexOf("u")!==-1;this.start=t|0,this.source=a+"",this.flags=i,u&&this.parser.options.ecmaVersion>=15?(this.switchU=!0,this.switchV=!0,this.switchN=!0):(this.switchU=o&&this.parser.options.ecmaVersion>=6,this.switchV=!1,this.switchN=o&&this.parser.options.ecmaVersion>=9)};re.prototype.raise=function(t){this.parser.raiseRecoverable(this.start,"Invalid regular expression: /"+this.source+"/: "+t)};re.prototype.at=function(t,a){a===void 0&&(a=!1);var i=this.source,u=i.length;if(t>=u)return-1;var o=i.charCodeAt(t);if(!(a||this.switchU)||o<=55295||o>=57344||t+1>=u)return o;var h=i.charCodeAt(t+1);return h>=56320&&h<=57343?(o<<10)+h-56613888:o};re.prototype.nextIndex=function(t,a){a===void 0&&(a=!1);var i=this.source,u=i.length;if(t>=u)return u;var o=i.charCodeAt(t),h;return!(a||this.switchU)||o<=55295||o>=57344||t+1>=u||(h=i.charCodeAt(t+1))<56320||h>57343?t+1:t+2};re.prototype.current=function(t){return t===void 0&&(t=!1),this.at(this.pos,t)};re.prototype.lookahead=function(t){return t===void 0&&(t=!1),this.at(this.nextIndex(this.pos,t),t)};re.prototype.advance=function(t){t===void 0&&(t=!1),this.pos=this.nextIndex(this.pos,t)};re.prototype.eat=function(t,a){return a===void 0&&(a=!1),this.current(a)===t?(this.advance(a),!0):!1};re.prototype.eatChars=function(t,a){a===void 0&&(a=!1);for(var i=this.pos,u=0,o=t;u<o.length;u+=1){var h=o[u],d=this.at(i,a);if(d===-1||d!==h)return!1;i=this.nextIndex(i,a)}return this.pos=i,!0};_.validateRegExpFlags=function(e){for(var t=e.validFlags,a=e.flags,i=!1,u=!1,o=0;o<a.length;o++){var h=a.charAt(o);t.indexOf(h)===-1&&this.raise(e.start,"Invalid regular expression flag"),a.indexOf(h,o+1)>-1&&this.raise(e.start,"Duplicate regular expression flag"),h==="u"&&(i=!0),h==="v"&&(u=!0)}this.options.ecmaVersion>=15&&i&&u&&this.raise(e.start,"Invalid regular expression flag")};function Rr(e){for(var t in e)return!0;return!1}_.validateRegExpPattern=function(e){this.regexp_pattern(e),!e.switchN&&this.options.ecmaVersion>=9&&Rr(e.groupNames)&&(e.switchN=!0,this.regexp_pattern(e))};_.regexp_pattern=function(e){e.pos=0,e.lastIntValue=0,e.lastStringValue="",e.lastAssertionIsQuantifiable=!1,e.numCapturingParens=0,e.maxBackReference=0,e.groupNames=Object.create(null),e.backReferenceNames.length=0,e.branchID=null,this.regexp_disjunction(e),e.pos!==e.source.length&&(e.eat(41)&&e.raise("Unmatched ')'"),(e.eat(93)||e.eat(125))&&e.raise("Lone quantifier brackets")),e.maxBackReference>e.numCapturingParens&&e.raise("Invalid escape");for(var t=0,a=e.backReferenceNames;t<a.length;t+=1){var i=a[t];e.groupNames[i]||e.raise("Invalid named capture referenced")}};_.regexp_disjunction=function(e){var t=this.options.ecmaVersion>=16;for(t&&(e.branchID=new lt(e.branchID,null)),this.regexp_alternative(e);e.eat(124);)t&&(e.branchID=e.branchID.sibling()),this.regexp_alternative(e);t&&(e.branchID=e.branchID.parent),this.regexp_eatQuantifier(e,!0)&&e.raise("Nothing to repeat"),e.eat(123)&&e.raise("Lone quantifier brackets")};_.regexp_alternative=function(e){for(;e.pos<e.source.length&&this.regexp_eatTerm(e););};_.regexp_eatTerm=function(e){return this.regexp_eatAssertion(e)?(e.lastAssertionIsQuantifiable&&this.regexp_eatQuantifier(e)&&e.switchU&&e.raise("Invalid quantifier"),!0):(e.switchU?this.regexp_eatAtom(e):this.regexp_eatExtendedAtom(e))?(this.regexp_eatQuantifier(e),!0):!1};_.regexp_eatAssertion=function(e){var t=e.pos;if(e.lastAssertionIsQuantifiable=!1,e.eat(94)||e.eat(36))return!0;if(e.eat(92)){if(e.eat(66)||e.eat(98))return!0;e.pos=t}if(e.eat(40)&&e.eat(63)){var a=!1;if(this.options.ecmaVersion>=9&&(a=e.eat(60)),e.eat(61)||e.eat(33))return this.regexp_disjunction(e),e.eat(41)||e.raise("Unterminated group"),e.lastAssertionIsQuantifiable=!a,!0}return e.pos=t,!1};_.regexp_eatQuantifier=function(e,t){return t===void 0&&(t=!1),this.regexp_eatQuantifierPrefix(e,t)?(e.eat(63),!0):!1};_.regexp_eatQuantifierPrefix=function(e,t){return e.eat(42)||e.eat(43)||e.eat(63)||this.regexp_eatBracedQuantifier(e,t)};_.regexp_eatBracedQuantifier=function(e,t){var a=e.pos;if(e.eat(123)){var i=0,u=-1;if(this.regexp_eatDecimalDigits(e)&&(i=e.lastIntValue,e.eat(44)&&this.regexp_eatDecimalDigits(e)&&(u=e.lastIntValue),e.eat(125)))return u!==-1&&u<i&&!t&&e.raise("numbers out of order in {} quantifier"),!0;e.switchU&&!t&&e.raise("Incomplete quantifier"),e.pos=a}return!1};_.regexp_eatAtom=function(e){return this.regexp_eatPatternCharacters(e)||e.eat(46)||this.regexp_eatReverseSolidusAtomEscape(e)||this.regexp_eatCharacterClass(e)||this.regexp_eatUncapturingGroup(e)||this.regexp_eatCapturingGroup(e)};_.regexp_eatReverseSolidusAtomEscape=function(e){var t=e.pos;if(e.eat(92)){if(this.regexp_eatAtomEscape(e))return!0;e.pos=t}return!1};_.regexp_eatUncapturingGroup=function(e){var t=e.pos;if(e.eat(40)){if(e.eat(63)){if(this.options.ecmaVersion>=16){var a=this.regexp_eatModifiers(e),i=e.eat(45);if(a||i){for(var u=0;u<a.length;u++){var o=a.charAt(u);a.indexOf(o,u+1)>-1&&e.raise("Duplicate regular expression modifiers")}if(i){var h=this.regexp_eatModifiers(e);!a&&!h&&e.current()===58&&e.raise("Invalid regular expression modifiers");for(var d=0;d<h.length;d++){var E=h.charAt(d);(h.indexOf(E,d+1)>-1||a.indexOf(E)>-1)&&e.raise("Duplicate regular expression modifiers")}}}}if(e.eat(58)){if(this.regexp_disjunction(e),e.eat(41))return!0;e.raise("Unterminated group")}}e.pos=t}return!1};_.regexp_eatCapturingGroup=function(e){if(e.eat(40)){if(this.options.ecmaVersion>=9?this.regexp_groupSpecifier(e):e.current()===63&&e.raise("Invalid group"),this.regexp_disjunction(e),e.eat(41))return e.numCapturingParens+=1,!0;e.raise("Unterminated group")}return!1};_.regexp_eatModifiers=function(e){for(var t="",a=0;(a=e.current())!==-1&&Dr(a);)t+=ce(a),e.advance();return t};function Dr(e){return e===105||e===109||e===115}_.regexp_eatExtendedAtom=function(e){return e.eat(46)||this.regexp_eatReverseSolidusAtomEscape(e)||this.regexp_eatCharacterClass(e)||this.regexp_eatUncapturingGroup(e)||this.regexp_eatCapturingGroup(e)||this.regexp_eatInvalidBracedQuantifier(e)||this.regexp_eatExtendedPatternCharacter(e)};_.regexp_eatInvalidBracedQuantifier=function(e){return this.regexp_eatBracedQuantifier(e,!0)&&e.raise("Nothing to repeat"),!1};_.regexp_eatSyntaxCharacter=function(e){var t=e.current();return ms(t)?(e.lastIntValue=t,e.advance(),!0):!1};function ms(e){return e===36||e>=40&&e<=43||e===46||e===63||e>=91&&e<=94||e>=123&&e<=125}_.regexp_eatPatternCharacters=function(e){for(var t=e.pos,a=0;(a=e.current())!==-1&&!ms(a);)e.advance();return e.pos!==t};_.regexp_eatExtendedPatternCharacter=function(e){var t=e.current();return t!==-1&&t!==36&&!(t>=40&&t<=43)&&t!==46&&t!==63&&t!==91&&t!==94&&t!==124?(e.advance(),!0):!1};_.regexp_groupSpecifier=function(e){if(e.eat(63)){this.regexp_eatGroupName(e)||e.raise("Invalid group");var t=this.options.ecmaVersion>=16,a=e.groupNames[e.lastStringValue];if(a)if(t)for(var i=0,u=a;i<u.length;i+=1){var o=u[i];o.separatedFrom(e.branchID)||e.raise("Duplicate capture group name")}else e.raise("Duplicate capture group name");t?(a||(e.groupNames[e.lastStringValue]=[])).push(e.branchID):e.groupNames[e.lastStringValue]=!0}};_.regexp_eatGroupName=function(e){if(e.lastStringValue="",e.eat(60)){if(this.regexp_eatRegExpIdentifierName(e)&&e.eat(62))return!0;e.raise("Invalid capture group name")}return!1};_.regexp_eatRegExpIdentifierName=function(e){if(e.lastStringValue="",this.regexp_eatRegExpIdentifierStart(e)){for(e.lastStringValue+=ce(e.lastIntValue);this.regexp_eatRegExpIdentifierPart(e);)e.lastStringValue+=ce(e.lastIntValue);return!0}return!1};_.regexp_eatRegExpIdentifierStart=function(e){var t=e.pos,a=this.options.ecmaVersion>=11,i=e.current(a);return e.advance(a),i===92&&this.regexp_eatRegExpUnicodeEscapeSequence(e,a)&&(i=e.lastIntValue),Pr(i)?(e.lastIntValue=i,!0):(e.pos=t,!1)};function Pr(e){return ue(e,!0)||e===36||e===95}_.regexp_eatRegExpIdentifierPart=function(e){var t=e.pos,a=this.options.ecmaVersion>=11,i=e.current(a);return e.advance(a),i===92&&this.regexp_eatRegExpUnicodeEscapeSequence(e,a)&&(i=e.lastIntValue),yr(i)?(e.lastIntValue=i,!0):(e.pos=t,!1)};function yr(e){return oe(e,!0)||e===36||e===95||e===8204||e===8205}_.regexp_eatAtomEscape=function(e){return this.regexp_eatBackReference(e)||this.regexp_eatCharacterClassEscape(e)||this.regexp_eatCharacterEscape(e)||e.switchN&&this.regexp_eatKGroupName(e)?!0:(e.switchU&&(e.current()===99&&e.raise("Invalid unicode escape"),e.raise("Invalid escape")),!1)};_.regexp_eatBackReference=function(e){var t=e.pos;if(this.regexp_eatDecimalEscape(e)){var a=e.lastIntValue;if(e.switchU)return a>e.maxBackReference&&(e.maxBackReference=a),!0;if(a<=e.numCapturingParens)return!0;e.pos=t}return!1};_.regexp_eatKGroupName=function(e){if(e.eat(107)){if(this.regexp_eatGroupName(e))return e.backReferenceNames.push(e.lastStringValue),!0;e.raise("Invalid named reference")}return!1};_.regexp_eatCharacterEscape=function(e){return this.regexp_eatControlEscape(e)||this.regexp_eatCControlLetter(e)||this.regexp_eatZero(e)||this.regexp_eatHexEscapeSequence(e)||this.regexp_eatRegExpUnicodeEscapeSequence(e,!1)||!e.switchU&&this.regexp_eatLegacyOctalEscapeSequence(e)||this.regexp_eatIdentityEscape(e)};_.regexp_eatCControlLetter=function(e){var t=e.pos;if(e.eat(99)){if(this.regexp_eatControlLetter(e))return!0;e.pos=t}return!1};_.regexp_eatZero=function(e){return e.current()===48&&!Tt(e.lookahead())?(e.lastIntValue=0,e.advance(),!0):!1};_.regexp_eatControlEscape=function(e){var t=e.current();return t===116?(e.lastIntValue=9,e.advance(),!0):t===110?(e.lastIntValue=10,e.advance(),!0):t===118?(e.lastIntValue=11,e.advance(),!0):t===102?(e.lastIntValue=12,e.advance(),!0):t===114?(e.lastIntValue=13,e.advance(),!0):!1};_.regexp_eatControlLetter=function(e){var t=e.current();return Ts(t)?(e.lastIntValue=t%32,e.advance(),!0):!1};function Ts(e){return e>=65&&e<=90||e>=97&&e<=122}_.regexp_eatRegExpUnicodeEscapeSequence=function(e,t){t===void 0&&(t=!1);var a=e.pos,i=t||e.switchU;if(e.eat(117)){if(this.regexp_eatFixedHexDigits(e,4)){var u=e.lastIntValue;if(i&&u>=55296&&u<=56319){var o=e.pos;if(e.eat(92)&&e.eat(117)&&this.regexp_eatFixedHexDigits(e,4)){var h=e.lastIntValue;if(h>=56320&&h<=57343)return e.lastIntValue=(u-55296)*1024+(h-56320)+65536,!0}e.pos=o,e.lastIntValue=u}return!0}if(i&&e.eat(123)&&this.regexp_eatHexDigits(e)&&e.eat(125)&&kr(e.lastIntValue))return!0;i&&e.raise("Invalid unicode escape"),e.pos=a}return!1};function kr(e){return e>=0&&e<=1114111}_.regexp_eatIdentityEscape=function(e){if(e.switchU)return this.regexp_eatSyntaxCharacter(e)?!0:e.eat(47)?(e.lastIntValue=47,!0):!1;var t=e.current();return t!==99&&(!e.switchN||t!==107)?(e.lastIntValue=t,e.advance(),!0):!1};_.regexp_eatDecimalEscape=function(e){e.lastIntValue=0;var t=e.current();if(t>=49&&t<=57){do e.lastIntValue=10*e.lastIntValue+(t-48),e.advance();while((t=e.current())>=48&&t<=57);return!0}return!1};var bs=0,he=1,J=2;_.regexp_eatCharacterClassEscape=function(e){var t=e.current();if(vr(t))return e.lastIntValue=-1,e.advance(),he;var a=!1;if(e.switchU&&this.options.ecmaVersion>=9&&((a=t===80)||t===112)){e.lastIntValue=-1,e.advance();var i;if(e.eat(123)&&(i=this.regexp_eatUnicodePropertyValueExpression(e))&&e.eat(125))return a&&i===J&&e.raise("Invalid property name"),i;e.raise("Invalid property name")}return bs};function vr(e){return e===100||e===68||e===115||e===83||e===119||e===87}_.regexp_eatUnicodePropertyValueExpression=function(e){var t=e.pos;if(this.regexp_eatUnicodePropertyName(e)&&e.eat(61)){var a=e.lastStringValue;if(this.regexp_eatUnicodePropertyValue(e)){var i=e.lastStringValue;return this.regexp_validateUnicodePropertyNameAndValue(e,a,i),he}}if(e.pos=t,this.regexp_eatLoneUnicodePropertyNameOrValue(e)){var u=e.lastStringValue;return this.regexp_validateUnicodePropertyNameOrValue(e,u)}return bs};_.regexp_validateUnicodePropertyNameAndValue=function(e,t,a){xe(e.unicodeProperties.nonBinary,t)||e.raise("Invalid property name"),e.unicodeProperties.nonBinary[t].test(a)||e.raise("Invalid property value")};_.regexp_validateUnicodePropertyNameOrValue=function(e,t){if(e.unicodeProperties.binary.test(t))return he;if(e.switchV&&e.unicodeProperties.binaryOfStrings.test(t))return J;e.raise("Invalid property name")};_.regexp_eatUnicodePropertyName=function(e){var t=0;for(e.lastStringValue="";_s(t=e.current());)e.lastStringValue+=ce(t),e.advance();return e.lastStringValue!==""};function _s(e){return Ts(e)||e===95}_.regexp_eatUnicodePropertyValue=function(e){var t=0;for(e.lastStringValue="";Mr(t=e.current());)e.lastStringValue+=ce(t),e.advance();return e.lastStringValue!==""};function Mr(e){return _s(e)||Tt(e)}_.regexp_eatLoneUnicodePropertyNameOrValue=function(e){return this.regexp_eatUnicodePropertyValue(e)};_.regexp_eatCharacterClass=function(e){if(e.eat(91)){var t=e.eat(94),a=this.regexp_classContents(e);return e.eat(93)||e.raise("Unterminated character class"),t&&a===J&&e.raise("Negated character class may contain strings"),!0}return!1};_.regexp_classContents=function(e){return e.current()===93?he:e.switchV?this.regexp_classSetExpression(e):(this.regexp_nonEmptyClassRanges(e),he)};_.regexp_nonEmptyClassRanges=function(e){for(;this.regexp_eatClassAtom(e);){var t=e.lastIntValue;if(e.eat(45)&&this.regexp_eatClassAtom(e)){var a=e.lastIntValue;e.switchU&&(t===-1||a===-1)&&e.raise("Invalid character class"),t!==-1&&a!==-1&&t>a&&e.raise("Range out of order in character class")}}};_.regexp_eatClassAtom=function(e){var t=e.pos;if(e.eat(92)){if(this.regexp_eatClassEscape(e))return!0;if(e.switchU){var a=e.current();(a===99||Cs(a))&&e.raise("Invalid class escape"),e.raise("Invalid escape")}e.pos=t}var i=e.current();return i!==93?(e.lastIntValue=i,e.advance(),!0):!1};_.regexp_eatClassEscape=function(e){var t=e.pos;if(e.eat(98))return e.lastIntValue=8,!0;if(e.switchU&&e.eat(45))return e.lastIntValue=45,!0;if(!e.switchU&&e.eat(99)){if(this.regexp_eatClassControlLetter(e))return!0;e.pos=t}return this.regexp_eatCharacterClassEscape(e)||this.regexp_eatCharacterEscape(e)};_.regexp_classSetExpression=function(e){var t=he,a;if(!this.regexp_eatClassSetRange(e))if(a=this.regexp_eatClassSetOperand(e)){a===J&&(t=J);for(var i=e.pos;e.eatChars([38,38]);){if(e.current()!==38&&(a=this.regexp_eatClassSetOperand(e))){a!==J&&(t=he);continue}e.raise("Invalid character in character class")}if(i!==e.pos)return t;for(;e.eatChars([45,45]);)this.regexp_eatClassSetOperand(e)||e.raise("Invalid character in character class");if(i!==e.pos)return t}else e.raise("Invalid character in character class");for(;;)if(!this.regexp_eatClassSetRange(e)){if(a=this.regexp_eatClassSetOperand(e),!a)return t;a===J&&(t=J)}};_.regexp_eatClassSetRange=function(e){var t=e.pos;if(this.regexp_eatClassSetCharacter(e)){var a=e.lastIntValue;if(e.eat(45)&&this.regexp_eatClassSetCharacter(e)){var i=e.lastIntValue;return a!==-1&&i!==-1&&a>i&&e.raise("Range out of order in character class"),!0}e.pos=t}return!1};_.regexp_eatClassSetOperand=function(e){return this.regexp_eatClassSetCharacter(e)?he:this.regexp_eatClassStringDisjunction(e)||this.regexp_eatNestedClass(e)};_.regexp_eatNestedClass=function(e){var t=e.pos;if(e.eat(91)){var a=e.eat(94),i=this.regexp_classContents(e);if(e.eat(93))return a&&i===J&&e.raise("Negated character class may contain strings"),i;e.pos=t}if(e.eat(92)){var u=this.regexp_eatCharacterClassEscape(e);if(u)return u;e.pos=t}return null};_.regexp_eatClassStringDisjunction=function(e){var t=e.pos;if(e.eatChars([92,113])){if(e.eat(123)){var a=this.regexp_classStringDisjunctionContents(e);if(e.eat(125))return a}else e.raise("Invalid escape");e.pos=t}return null};_.regexp_classStringDisjunctionContents=function(e){for(var t=this.regexp_classString(e);e.eat(124);)this.regexp_classString(e)===J&&(t=J);return t};_.regexp_classString=function(e){for(var t=0;this.regexp_eatClassSetCharacter(e);)t++;return t===1?he:J};_.regexp_eatClassSetCharacter=function(e){var t=e.pos;if(e.eat(92))return this.regexp_eatCharacterEscape(e)||this.regexp_eatClassSetReservedPunctuator(e)?!0:e.eat(98)?(e.lastIntValue=8,!0):(e.pos=t,!1);var a=e.current();return a<0||a===e.lookahead()&&Br(a)||wr(a)?!1:(e.advance(),e.lastIntValue=a,!0)};function Br(e){return e===33||e>=35&&e<=38||e>=42&&e<=44||e===46||e>=58&&e<=64||e===94||e===96||e===126}function wr(e){return e===40||e===41||e===45||e===47||e>=91&&e<=93||e>=123&&e<=125}_.regexp_eatClassSetReservedPunctuator=function(e){var t=e.current();return Fr(t)?(e.lastIntValue=t,e.advance(),!0):!1};function Fr(e){return e===33||e===35||e===37||e===38||e===44||e===45||e>=58&&e<=62||e===64||e===96||e===126}_.regexp_eatClassControlLetter=function(e){var t=e.current();return Tt(t)||t===95?(e.lastIntValue=t%32,e.advance(),!0):!1};_.regexp_eatHexEscapeSequence=function(e){var t=e.pos;if(e.eat(120)){if(this.regexp_eatFixedHexDigits(e,2))return!0;e.switchU&&e.raise("Invalid escape"),e.pos=t}return!1};_.regexp_eatDecimalDigits=function(e){var t=e.pos,a=0;for(e.lastIntValue=0;Tt(a=e.current());)e.lastIntValue=10*e.lastIntValue+(a-48),e.advance();return e.pos!==t};function Tt(e){return e>=48&&e<=57}_.regexp_eatHexDigits=function(e){var t=e.pos,a=0;for(e.lastIntValue=0;As(a=e.current());)e.lastIntValue=16*e.lastIntValue+gs(a),e.advance();return e.pos!==t};function As(e){return e>=48&&e<=57||e>=65&&e<=70||e>=97&&e<=102}function gs(e){return e>=65&&e<=70?10+(e-65):e>=97&&e<=102?10+(e-97):e-48}_.regexp_eatLegacyOctalEscapeSequence=function(e){if(this.regexp_eatOctalDigit(e)){var t=e.lastIntValue;if(this.regexp_eatOctalDigit(e)){var a=e.lastIntValue;t<=3&&this.regexp_eatOctalDigit(e)?e.lastIntValue=t*64+a*8+e.lastIntValue:e.lastIntValue=t*8+a}else e.lastIntValue=t;return!0}return!1};_.regexp_eatOctalDigit=function(e){var t=e.current();return Cs(t)?(e.lastIntValue=t-48,e.advance(),!0):(e.lastIntValue=0,!1)};function Cs(e){return e>=48&&e<=55}_.regexp_eatFixedHexDigits=function(e,t){var a=e.pos;e.lastIntValue=0;for(var i=0;i<t;++i){var u=e.current();if(!As(u))return e.pos=a,!1;e.lastIntValue=16*e.lastIntValue+gs(u),e.advance()}return!0};var Gt=function(t){this.type=t.type,this.value=t.value,this.start=t.start,this.end=t.end,t.options.locations&&(this.loc=new ft(t,t.startLoc,t.endLoc)),t.options.ranges&&(this.range=[t.start,t.end])},x=M.prototype;x.next=function(e){!e&&this.type.keyword&&this.containsEsc&&this.raiseRecoverable(this.start,"Escape sequence in keyword "+this.type.keyword),this.options.onToken&&this.options.onToken(new Gt(this)),this.lastTokEnd=this.end,this.lastTokStart=this.start,this.lastTokEndLoc=this.endLoc,this.lastTokStartLoc=this.startLoc,this.nextToken()};x.getToken=function(){return this.next(),new Gt(this)};typeof Symbol<"u"&&(x[Symbol.iterator]=function(){var e=this;return{next:function(){var t=e.getToken();return{done:t.type===r.eof,value:t}}}});x.nextToken=function(){var e=this.curContext();if((!e||!e.preserveSpace)&&this.skipSpace(),this.start=this.pos,this.options.locations&&(this.startLoc=this.curPosition()),this.pos>=this.input.length)return this.finishToken(r.eof);if(e.override)return e.override(this);this.readToken(this.fullCharCodeAtPos())};x.readToken=function(e){return ue(e,this.options.ecmaVersion>=6)||e===92?this.readWord():this.getTokenFromCode(e)};x.fullCharCodeAt=function(e){var t=this.input.charCodeAt(e);if(t<=55295||t>=56320)return t;var a=this.input.charCodeAt(e+1);return a<=56319||a>=57344?t:(t<<10)+a-56613888};x.fullCharCodeAtPos=function(){return this.fullCharCodeAt(this.pos)};x.skipBlockComment=function(){var e=this.options.onComment&&this.curPosition(),t=this.pos,a=this.input.indexOf("*/",this.pos+=2);if(a===-1&&this.raise(this.pos-2,"Unterminated comment"),this.pos=a+2,this.options.locations)for(var i=void 0,u=t;(i=Wa(this.input,u,this.pos))>-1;)++this.curLine,u=this.lineStart=i;this.options.onComment&&this.options.onComment(!0,this.input.slice(t+2,a),t,this.pos,e,this.curPosition())};x.skipLineComment=function(e){for(var t=this.pos,a=this.options.onComment&&this.curPosition(),i=this.input.charCodeAt(this.pos+=e);this.pos<this.input.length&&!Ie(i);)i=this.input.charCodeAt(++this.pos);this.options.onComment&&this.options.onComment(!1,this.input.slice(t+e,this.pos),t,this.pos,a,this.curPosition())};x.skipSpace=function(){e:for(;this.pos<this.input.length;){var e=this.input.charCodeAt(this.pos);switch(e){case 32:case 160:++this.pos;break;case 13:this.input.charCodeAt(this.pos+1)===10&&++this.pos;case 10:case 8232:case 8233:++this.pos,this.options.locations&&(++this.curLine,this.lineStart=this.pos);break;case 47:switch(this.input.charCodeAt(this.pos+1)){case 42:this.skipBlockComment();break;case 47:this.skipLineComment(2);break;default:break e}break;default:if(e>8&&e<14||e>=5760&&Qa.test(String.fromCharCode(e)))++this.pos;else break e}}};x.finishToken=function(e,t){this.end=this.pos,this.options.locations&&(this.endLoc=this.curPosition());var a=this.type;this.type=e,this.value=t,this.updateContext(a)};x.readToken_dot=function(){var e=this.input.charCodeAt(this.pos+1);if(e>=48&&e<=57)return this.readNumber(!0);var t=this.input.charCodeAt(this.pos+2);return this.options.ecmaVersion>=6&&e===46&&t===46?(this.pos+=3,this.finishToken(r.ellipsis)):(++this.pos,this.finishToken(r.dot))};x.readToken_slash=function(){var e=this.input.charCodeAt(this.pos+1);return this.exprAllowed?(++this.pos,this.readRegexp()):e===61?this.finishOp(r.assign,2):this.finishOp(r.slash,1)};x.readToken_mult_modulo_exp=function(e){var t=this.input.charCodeAt(this.pos+1),a=1,i=e===42?r.star:r.modulo;return this.options.ecmaVersion>=7&&e===42&&t===42&&(++a,i=r.starstar,t=this.input.charCodeAt(this.pos+2)),t===61?this.finishOp(r.assign,a+1):this.finishOp(i,a)};x.readToken_pipe_amp=function(e){var t=this.input.charCodeAt(this.pos+1);if(t===e){if(this.options.ecmaVersion>=12){var a=this.input.charCodeAt(this.pos+2);if(a===61)return this.finishOp(r.assign,3)}return this.finishOp(e===124?r.logicalOR:r.logicalAND,2)}return t===61?this.finishOp(r.assign,2):this.finishOp(e===124?r.bitwiseOR:r.bitwiseAND,1)};x.readToken_caret=function(){var e=this.input.charCodeAt(this.pos+1);return e===61?this.finishOp(r.assign,2):this.finishOp(r.bitwiseXOR,1)};x.readToken_plus_min=function(e){var t=this.input.charCodeAt(this.pos+1);return t===e?t===45&&!this.inModule&&this.input.charCodeAt(this.pos+2)===62&&(this.lastTokEnd===0||X.test(this.input.slice(this.lastTokEnd,this.pos)))?(this.skipLineComment(3),this.skipSpace(),this.nextToken()):this.finishOp(r.incDec,2):t===61?this.finishOp(r.assign,2):this.finishOp(r.plusMin,1)};x.readToken_lt_gt=function(e){var t=this.input.charCodeAt(this.pos+1),a=1;return t===e?(a=e===62&&this.input.charCodeAt(this.pos+2)===62?3:2,this.input.charCodeAt(this.pos+a)===61?this.finishOp(r.assign,a+1):this.finishOp(r.bitShift,a)):t===33&&e===60&&!this.inModule&&this.input.charCodeAt(this.pos+2)===45&&this.input.charCodeAt(this.pos+3)===45?(this.skipLineComment(4),this.skipSpace(),this.nextToken()):(t===61&&(a=2),this.finishOp(r.relational,a))};x.readToken_eq_excl=function(e){var t=this.input.charCodeAt(this.pos+1);return t===61?this.finishOp(r.equality,this.input.charCodeAt(this.pos+2)===61?3:2):e===61&&t===62&&this.options.ecmaVersion>=6?(this.pos+=2,this.finishToken(r.arrow)):this.finishOp(e===61?r.eq:r.prefix,1)};x.readToken_question=function(){var e=this.options.ecmaVersion;if(e>=11){var t=this.input.charCodeAt(this.pos+1);if(t===46){var a=this.input.charCodeAt(this.pos+2);if(a<48||a>57)return this.finishOp(r.questionDot,2)}if(t===63){if(e>=12){var i=this.input.charCodeAt(this.pos+2);if(i===61)return this.finishOp(r.assign,3)}return this.finishOp(r.coalesce,2)}}return this.finishOp(r.question,1)};x.readToken_numberSign=function(){var e=this.options.ecmaVersion,t=35;if(e>=13&&(++this.pos,t=this.fullCharCodeAtPos(),ue(t,!0)||t===92))return this.finishToken(r.privateId,this.readWord1());this.raise(this.pos,"Unexpected character '"+ce(t)+"'")};x.getTokenFromCode=function(e){switch(e){case 46:return this.readToken_dot();case 40:return++this.pos,this.finishToken(r.parenL);case 41:return++this.pos,this.finishToken(r.parenR);case 59:return++this.pos,this.finishToken(r.semi);case 44:return++this.pos,this.finishToken(r.comma);case 91:return++this.pos,this.finishToken(r.bracketL);case 93:return++this.pos,this.finishToken(r.bracketR);case 123:return++this.pos,this.finishToken(r.braceL);case 125:return++this.pos,this.finishToken(r.braceR);case 58:return++this.pos,this.finishToken(r.colon);case 96:if(this.options.ecmaVersion<6)break;return++this.pos,this.finishToken(r.backQuote);case 48:var t=this.input.charCodeAt(this.pos+1);if(t===120||t===88)return this.readRadixNumber(16);if(this.options.ecmaVersion>=6){if(t===111||t===79)return this.readRadixNumber(8);if(t===98||t===66)return this.readRadixNumber(2)}case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return this.readNumber(!1);case 34:case 39:return this.readString(e);case 47:return this.readToken_slash();case 37:case 42:return this.readToken_mult_modulo_exp(e);case 124:case 38:return this.readToken_pipe_amp(e);case 94:return this.readToken_caret();case 43:case 45:return this.readToken_plus_min(e);case 60:case 62:return this.readToken_lt_gt(e);case 61:case 33:return this.readToken_eq_excl(e);case 63:return this.readToken_question();case 126:return this.finishOp(r.prefix,1);case 35:return this.readToken_numberSign()}this.raise(this.pos,"Unexpected character '"+ce(e)+"'")};x.finishOp=function(e,t){var a=this.input.slice(this.pos,this.pos+t);return this.pos+=t,this.finishToken(e,a)};x.readRegexp=function(){for(var e,t,a=this.pos;;){this.pos>=this.input.length&&this.raise(a,"Unterminated regular expression");var i=this.input.charAt(this.pos);if(X.test(i)&&this.raise(a,"Unterminated regular expression"),e)e=!1;else{if(i==="[")t=!0;else if(i==="]"&&t)t=!1;else if(i==="/"&&!t)break;e=i==="\\"}++this.pos}var u=this.input.slice(a,this.pos);++this.pos;var o=this.pos,h=this.readWord1();this.containsEsc&&this.unexpected(o);var d=this.regexpState||(this.regexpState=new re(this));d.reset(a,u,h),this.validateRegExpFlags(d),this.validateRegExpPattern(d);var E=null;try{E=new RegExp(u,h)}catch{}return this.finishToken(r.regexp,{pattern:u,flags:h,value:E})};x.readInt=function(e,t,a){for(var i=this.options.ecmaVersion>=12&&t===void 0,u=a&&this.input.charCodeAt(this.pos)===48,o=this.pos,h=0,d=0,E=0,T=t??1/0;E<T;++E,++this.pos){var A=this.input.charCodeAt(this.pos),C=void 0;if(i&&A===95){u&&this.raiseRecoverable(this.pos,"Numeric separator is not allowed in legacy octal numeric literals"),d===95&&this.raiseRecoverable(this.pos,"Numeric separator must be exactly one underscore"),E===0&&this.raiseRecoverable(this.pos,"Numeric separator is not allowed at the first of digits"),d=A;continue}if(A>=97?C=A-97+10:A>=65?C=A-65+10:A>=48&&A<=57?C=A-48:C=1/0,C>=e)break;d=A,h=h*e+C}return i&&d===95&&this.raiseRecoverable(this.pos-1,"Numeric separator is not allowed at the last of digits"),this.pos===o||t!=null&&this.pos-o!==t?null:h};function Ur(e,t){return t?parseInt(e,8):parseFloat(e.replace(/_/g,""))}function Is(e){return typeof BigInt!="function"?null:BigInt(e.replace(/_/g,""))}x.readRadixNumber=function(e){var t=this.pos;this.pos+=2;var a=this.readInt(e);return a==null&&this.raise(this.start+2,"Expected number in radix "+e),this.options.ecmaVersion>=11&&this.input.charCodeAt(this.pos)===110?(a=Is(this.input.slice(t,this.pos)),++this.pos):ue(this.fullCharCodeAtPos())&&this.raise(this.pos,"Identifier directly after number"),this.finishToken(r.num,a)};x.readNumber=function(e){var t=this.pos;!e&&this.readInt(10,void 0,!0)===null&&this.raise(t,"Invalid number");var a=this.pos-t>=2&&this.input.charCodeAt(t)===48;a&&this.strict&&this.raise(t,"Invalid number");var i=this.input.charCodeAt(this.pos);if(!a&&!e&&this.options.ecmaVersion>=11&&i===110){var u=Is(this.input.slice(t,this.pos));return++this.pos,ue(this.fullCharCodeAtPos())&&this.raise(this.pos,"Identifier directly after number"),this.finishToken(r.num,u)}a&&/[89]/.test(this.input.slice(t,this.pos))&&(a=!1),i===46&&!a&&(++this.pos,this.readInt(10),i=this.input.charCodeAt(this.pos)),(i===69||i===101)&&!a&&(i=this.input.charCodeAt(++this.pos),(i===43||i===45)&&++this.pos,this.readInt(10)===null&&this.raise(t,"Invalid number")),ue(this.fullCharCodeAtPos())&&this.raise(this.pos,"Identifier directly after number");var o=Ur(this.input.slice(t,this.pos),a);return this.finishToken(r.num,o)};x.readCodePoint=function(){var e=this.input.charCodeAt(this.pos),t;if(e===123){this.options.ecmaVersion<6&&this.unexpected();var a=++this.pos;t=this.readHexChar(this.input.indexOf("}",this.pos)-this.pos),++this.pos,t>1114111&&this.invalidStringToken(a,"Code point out of bounds")}else t=this.readHexChar(4);return t};x.readString=function(e){for(var t="",a=++this.pos;;){this.pos>=this.input.length&&this.raise(this.start,"Unterminated string constant");var i=this.input.charCodeAt(this.pos);if(i===e)break;i===92?(t+=this.input.slice(a,this.pos),t+=this.readEscapedChar(!1),a=this.pos):i===8232||i===8233?(this.options.ecmaVersion<10&&this.raise(this.start,"Unterminated string constant"),++this.pos,this.options.locations&&(this.curLine++,this.lineStart=this.pos)):(Ie(i)&&this.raise(this.start,"Unterminated string constant"),++this.pos)}return t+=this.input.slice(a,this.pos++),this.finishToken(r.string,t)};var xs={};x.tryReadTemplateToken=function(){this.inTemplateElement=!0;try{this.readTmplToken()}catch(e){if(e===xs)this.readInvalidTemplateToken();else throw e}this.inTemplateElement=!1};x.invalidStringToken=function(e,t){if(this.inTemplateElement&&this.options.ecmaVersion>=9)throw xs;this.raise(e,t)};x.readTmplToken=function(){for(var e="",t=this.pos;;){this.pos>=this.input.length&&this.raise(this.start,"Unterminated template");var a=this.input.charCodeAt(this.pos);if(a===96||a===36&&this.input.charCodeAt(this.pos+1)===123)return this.pos===this.start&&(this.type===r.template||this.type===r.invalidTemplate)?a===36?(this.pos+=2,this.finishToken(r.dollarBraceL)):(++this.pos,this.finishToken(r.backQuote)):(e+=this.input.slice(t,this.pos),this.finishToken(r.template,e));if(a===92)e+=this.input.slice(t,this.pos),e+=this.readEscapedChar(!0),t=this.pos;else if(Ie(a)){switch(e+=this.input.slice(t,this.pos),++this.pos,a){case 13:this.input.charCodeAt(this.pos)===10&&++this.pos;case 10:e+=`
`;break;default:e+=String.fromCharCode(a);break}this.options.locations&&(++this.curLine,this.lineStart=this.pos),t=this.pos}else++this.pos}};x.readInvalidTemplateToken=function(){for(;this.pos<this.input.length;this.pos++)switch(this.input[this.pos]){case"\\":++this.pos;break;case"$":if(this.input[this.pos+1]!=="{")break;case"`":return this.finishToken(r.invalidTemplate,this.input.slice(this.start,this.pos));case"\r":this.input[this.pos+1]===`
`&&++this.pos;case`
`:case"\u2028":case"\u2029":++this.curLine,this.lineStart=this.pos+1;break}this.raise(this.start,"Unterminated template")};x.readEscapedChar=function(e){var t=this.input.charCodeAt(++this.pos);switch(++this.pos,t){case 110:return`
`;case 114:return"\r";case 120:return String.fromCharCode(this.readHexChar(2));case 117:return ce(this.readCodePoint());case 116:return"	";case 98:return"\b";case 118:return"\v";case 102:return"\f";case 13:this.input.charCodeAt(this.pos)===10&&++this.pos;case 10:return this.options.locations&&(this.lineStart=this.pos,++this.curLine),"";case 56:case 57:if(this.strict&&this.invalidStringToken(this.pos-1,"Invalid escape sequence"),e){var a=this.pos-1;this.invalidStringToken(a,"Invalid escape sequence in template string")}default:if(t>=48&&t<=55){var i=this.input.substr(this.pos-1,3).match(/^[0-7]+/)[0],u=parseInt(i,8);return u>255&&(i=i.slice(0,-1),u=parseInt(i,8)),this.pos+=i.length-1,t=this.input.charCodeAt(this.pos),(i!=="0"||t===56||t===57)&&(this.strict||e)&&this.invalidStringToken(this.pos-1-i.length,e?"Octal literal in template string":"Octal literal in strict mode"),String.fromCharCode(u)}return Ie(t)?(this.options.locations&&(this.lineStart=this.pos,++this.curLine),""):String.fromCharCode(t)}};x.readHexChar=function(e){var t=this.pos,a=this.readInt(16,e);return a===null&&this.invalidStringToken(t,"Bad character escape sequence"),a};x.readWord1=function(){this.containsEsc=!1;for(var e="",t=!0,a=this.pos,i=this.options.ecmaVersion>=6;this.pos<this.input.length;){var u=this.fullCharCodeAtPos();if(oe(u,i))this.pos+=u<=65535?1:2;else if(u===92){this.containsEsc=!0,e+=this.input.slice(a,this.pos);var o=this.pos;this.input.charCodeAt(++this.pos)!==117&&this.invalidStringToken(this.pos,"Expecting Unicode escape sequence \\uXXXX"),++this.pos;var h=this.readCodePoint();(t?ue:oe)(h,i)||this.invalidStringToken(o,"Invalid Unicode escape"),e+=ce(h),a=this.pos}else break;t=!1}return e+this.input.slice(a,this.pos)};x.readWord=function(){var e=this.readWord1(),t=r.name;return this.keywords.test(e)&&(t=Ft[e]),this.finishToken(t,e)};var Hr="8.19.0";M.acorn={Parser:M,version:Hr,defaultOptions:Mt,Position:Ue,SourceLocation:ft,getLineInfo:Xa,Node:mt,TokenType:O,tokTypes:r,keywordTypes:Ft,TokContext:se,tokContexts:D,isIdentifierChar:oe,isIdentifierStart:ue,Token:Gt,isNewLine:Ie,lineBreak:X,lineBreakG:or,nonASCIIwhitespace:Qa};function Ns(e,t){return M.parse(e,t)}var Os={sourceCodeLocationInfo:!0},Qt=e=>(e||"").replace(/\s+/g," ").trim().slice(0,200),Ss=e=>(e||"").trim().split(/\s+/).filter(Boolean),Rs=e=>Qt(e.childNodes?.filter(t=>t.nodeName==="#text").map(t=>t.value).join(" ")),Vr=/^(?:name|type|href|src|for|role|title|placeholder|alt|aria-label|data-[\w-]+)$/i;function Wt(e,t,a,i,u){return{tag:e,attrs:t,text:a,parent:i,position:u,children:[]}}function Yr(e){let t=e?.startTag||e;return t?{line:t.startLine,column:t.startCol}:null}function qr(e){let t=[0];for(let a of e.matchAll(/\r\n|\r|\n/g))t.push(a.index+a[0].length);return a=>{let i=0,u=t.length;for(;u-i>1;){let o=i+u>>>1;t[o]<=a?i=o:u=o}return{line:i+1,column:a-t[i]+1}}}function Gr(e,t,a,i){let u;try{u=Ns(e,{ecmaVersion:"latest",sourceType:a})}catch{return}let o=[];function h(T){return T?.type==="Literal"&&typeof T.value=="string"?T.value:T?.type==="TemplateLiteral"?T.quasis[0].value.cooked:T?.type==="BinaryExpression"&&T.operator==="+"?h(T.left):""}function d(T){let A=T.start+1,C=e.slice(A,T.end-1);if(!/^\s*<[a-z]/i.test(C))return;if(T.type==="TemplateLiteral")for(let H=T.quasis.length-1;H>0;H--){let y=T.quasis[H-1].end-A,k=T.quasis[H].start-A;C=C.slice(0,y)+C.slice(y,k).replace(/[^\r\n]/g," ")+C.slice(k)}let L=[],B=C.replace(/\\(["'`\\nrt])/g,(H,y,k)=>(L.push(k),{n:`
`,r:"\r",t:"	"}[y]||y)),v=[...Ba(B,Os).childNodes];for(let H=0;H<v.length;H++){let y=v[H];for(let P of y.childNodes||[])v.push(P);let k=y.sourceCodeLocation?.startTag?.startOffset;if(!(!y.tagName||k==null)){for(let P of L){if(P>k)break;k++}i(Wt(y.tagName,new Map(y.attrs.map(({name:P,value:Q})=>[P,Q])),Rs(y),null,t(A+k)))}}}function E(T,A){if((T.type==="Program"||T.type==="BlockStatement")&&(A=new Map),T.type==="VariableDeclarator"&&T.id.type==="Identifier"){let C=T.init,L=C?.type==="CallExpression"&&C.callee.object?.name==="document"&&C.callee.property?.name==="createElement"&&C.arguments[0]?.type==="Literal"&&C.arguments[0].value;if(typeof L=="string"&&/^[a-z][\w-]*$/i.test(L)){let B=Wt(L.toLowerCase(),new Map,"",null,t(C.start));A.set(T.id.name,B),o.push(B)}else A.delete(T.id.name)}if(T.type==="AssignmentExpression"&&T.operator==="="&&T.left.type==="MemberExpression"){let C=A.get(T.left.object.name);if(C){let L=T.left.property.name,B=h(T.right);L==="className"&&C.attrs.set("class",B),L==="id"&&C.attrs.set("id",B),L==="textContent"&&(C.text=Qt(B))}}(T.type==="TemplateLiteral"||T.type==="Literal"&&typeof T.value=="string")&&d(T);for(let C of Object.values(T))if(Array.isArray(C))for(let L of C)L?.type&&E(L,A);else C?.type&&E(C,A)}E(u,null);for(let T of o)i(T)}function Wr(e){let t=new Map,a=new Map,i=(d,E)=>{d.has(E.tag)||d.set(E.tag,[]),d.get(E.tag).push(E)},u=qr(e),h=[{node:Ma(e,Os),parent:null,flexible:!1}];for(;h.length;){let{node:d,parent:E,flexible:T,vueKey:A}=h.pop(),C=new Map(d.attrs?.map(({name:P,value:Q})=>[P,Q])),L=T||["v-for","v-if","v-else-if","v-else"].some(P=>C.has(P)),B=d.tagName==="template"&&L||d.tagName==="transition"||d.tagName==="transition-group"&&!C.has("tag"),v=d.tagName&&!B?Wt(d.tagName,C,Rs(d),E,Yr(d.sourceCodeLocation)):E;if(v!==E&&(v.flexible=L,v.vueKey=A,E?.children.push(v),v.position&&i(t,v),v.tag==="script"&&!C.has("src")&&/^(?:|module|(?:text|application)\/(?:java|ecma)script)$/i.test(C.get("type")||""))){let P=d.childNodes[0]?.sourceCodeLocation;if(P)try{Gr(e.slice(P.startOffset,P.endOffset),Q=>u(P.startOffset+Q),C.get("type")==="module"?"module":"script",Q=>i(a,Q))}catch{}}let H=B&&d.content?d.content.childNodes:d.childNodes,y=0,k=[];for(let P of H||[]){if(!P.tagName)continue;let Q=new Set(P.attrs.map(({name:bt})=>bt)),Ps=["v-if","v-else-if","v-else"].some(bt=>Q.has(bt))?y++:void 0,ys=Q.has("key")||Q.has(":key")||Q.has("v-bind:key")||Q.has("v-for")?void 0:Ps;k.push({node:P,parent:v,flexible:B,vueKey:ys})}for(let P=k.length-1;P>=0;P--)h.push(k[P])}return{markup:t,scripts:a}}function Ds(e,t){if(e.tag!==t.tag)return null;let a=0,i=!1;if(e.vueKey!=null&&t.vueKey!=null){if(e.vueKey!==t.vueKey)return null;a+=16}let u=e.attrs.get("id");if(u){if(u!==t.attrs.get("id"))return null;a+=100,i=!0}let o=Ss(e.attrs.get("class"));if(o.length){let h=new Set(Ss(t.attrs.get("class"))),d=o.filter(E=>h.has(E)).length;if(!d&&!u)return null;a+=d*3-(o.length-d)*3,i||=d===o.length}for(let[h,d]of e.attrs)Vr.test(h)&&(d===t.attrs.get(h)?(a+=8,i=!0):a-=5);return e.text&&e.text===t.text?(a+=25,i=!0):e.text&&!e.text.includes("{{")&&(a-=12),{score:a,evidence:i}}function Qr(e,t,a){let i=0,u=e.attrs.get("id");for(let o of t){if(!e)return null;let h=Ds(e,o);if(!h)return null;i+=h.score;let d=e.parent?.children;if(o.siblings&&d&&d.every(E=>!E.flexible)){if(d.length===o.siblings.length&&d.every((T,A)=>T.tag===o.siblings[A]))i+=d[o.index]===e?8:-8;else if(a&&!u&&o.index>=d.length)return null}e=e.parent}return e?null:i}function Ls(e,t){let a=null,i=-1/0,u=!1;for(let o of e||[]){let h=t(o);h==null||h<i||(h===i?u||=a.line!==o.position.line||a.column!==o.position.column:(a=o.position,i=h,u=!1))}return u?null:a}function Kr(e,t){if(!t?.length)return null;let a=t.map(o=>({...o,attrs:new Map(o.attrs),text:Qt(o.text)})),i=a[0],u=Ls(e.scripts.get(i.tag),o=>{let h=Ds(o,i);return h?.evidence&&h.score>0?h.score:null});return Ls(e.markup.get(i.tag),o=>Qr(o,a,!!u))||u}return Fs(Xr);})();

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
  const TASK_EDITORS = Object.freeze([{ id: 'chatgpt', name: 'ChatGPT' }]);
  const DEFAULT_SHORTCUT = Object.freeze({ meta: true, ctrl: false, alt: false, shift: false, code: '' });

  function originOf(value) {
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.origin : '';
    } catch (_) { return ''; }
  }

  function pageKey(value) {
    try {
      const url = new URL(value);
      if (url.protocol === 'file:' && !url.host && /\.html?$/i.test(url.pathname)) return `file://${url.pathname}`;
    } catch (_) { return ''; }
    return originOf(value);
  }

  function matchesPage(key, value) {
    const current = pageKey(value);
    if (!key || !current) return false;
    return key.startsWith('file:') ? current.startsWith(key.slice(0, key.lastIndexOf('/') + 1)) : current === key;
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
    const clickAction = value.clickAction === 'chatgpt' ? 'agent' : value.clickAction;
    return {
      origins,
      clickAction: ['copy', 'agent'].includes(clickAction) ? clickAction : 'open',
      taskEditor: TASK_EDITORS.some((editor) => editor.id === value.taskEditor) ? value.taskEditor : 'chatgpt',
      autoSend: value.autoSend !== false,
      openShortcut: normalizeShortcut(value.openShortcut),
      menuShortcut: normalizeShortcut(value.menuShortcut),
    };
  }

  async function getSettings() {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    try { return normalizeSettings(data[SETTINGS_KEY]); } catch (_) { return normalizeSettings(); }
  }

  ns.componentSettings = { SETTINGS_KEY, TAB_PREFIX, ORIGIN_PREFIX, MAX_ORIGINS, TASK_EDITORS, DEFAULT_SHORTCUT, originOf, pageKey, matchesPage, isAllowed, normalizeShortcut, shortcutLabel, matchesShortcut, normalizeSettings, getSettings };
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
  const pageKey = location.protocol === 'file:' ? `file://${location.pathname}` : location.origin;
  if (options.origin && pageKey !== options.origin) return { error: '页面地址已变化' };
  const html = document.contentType === 'text/html';
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

  // 与参考菜单一致，只展示字符串、数字等简单参数；参数名悬停时显示当前值。
  function menuProps(props, defaults) {
    const result = Object.create(null);
    for (const key of Object.keys(props || {}).slice(0, 50)) {
      if (key === 'key') continue;
      try {
        const descriptor = Object.getOwnPropertyDescriptor(props, key);
        if (!descriptor || !('value' in descriptor)) continue;
        const value = descriptor.value;
        if (defaults && value === Object.getOwnPropertyDescriptor(defaults, key)?.value) continue;
        if (['string', 'number', 'boolean', 'symbol'].includes(typeof value)) result[key] = value;
      } catch (_) { /* 跳过当前无法读取的参数。 */ }
    }
    return snapshot(result);
  }

  function sourceFromFiber(fiber) {
    const source = fiber._debugSource;
    if (source?.fileName) return { file: source.fileName, line: source.lineNumber || null, column: source.columnNumber || null, ...(source.endLineNumber ? { endLine: source.endLineNumber } : {}), kind: 'source' };
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
        result.push({ framework: 'React', name: typeName(type), source: sourceFromFiber(fiber), props: includeProps ? menuProps(fiber.memoizedProps || fiber.pendingProps, type?.defaultProps) : undefined });
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
          props = menuProps(values);
        } else props = menuProps(instance.props);
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

  function htmlElementPath(element) {
    const path = [];
    for (let node = element; node && path.length < 60; node = node.parentElement) {
      const siblings = node.parentElement?.children;
      const peers = siblings && siblings.length <= 128
        ? Array.from(siblings).filter((item) => !item.hasAttribute('data-idt-component-overlay'))
        : null;
      const vueKey = node.__vnode?.key;
      path.push({
        tag: node.localName,
        attrs: Array.from(node.attributes, ({ name, value }) => [name, value.slice(0, 1500)])
          .filter(([name]) => !name.startsWith('data-idt-')).slice(0, 60),
        text: Array.from(node.childNodes).filter((child) => child.nodeType === Node.TEXT_NODE)
          .map((child) => child.data.slice(0, 200)).join(' ').slice(0, 200),
        index: peers?.indexOf(node),
        siblings: peers?.map((item) => item.localName),
        ...(Number.isSafeInteger(vueKey) ? { vueKey } : {}),
      });
    }
    return path;
  }

  const scripts = () => [...new Set([...Array.from(document.scripts, (script) => script.src), ...performance.getEntriesByType('resource').filter((entry) => entry.initiatorType === 'script').map((entry) => entry.name)])].filter(Boolean).slice(-40);
  if (options.mode === 'detect') {
    if (location.protocol === 'file:') return { html };
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
    return { frameworks: [...frameworks], hints: [...hints].slice(0, 32), sources: [...sources.values()], scripts: scripts(), html: html && document.readyState !== 'loading' };
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
  const rect = element.getBoundingClientRect();
  const bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  if (options.html) {
    if (!html) return { components: [] };
    const name = element.id ? `${element.localName}#${element.id.slice(0, 80)}` : element.localName;
    return {
      components: [{ name, framework: 'HTML' }], rect: bounds,
      ...(options.props ? { htmlElement: htmlElementPath(element), htmlEncoding: document.characterSet } : {}),
    };
  }
  const components = find(element, options.props !== false);
  // 已存在的 Vue Inspector 标记可直接提供模板行列，无需改造业务项目。
  const marker = element.closest?.('[data-v-inspector]')?.getAttribute('data-v-inspector');
  const match = marker?.match(/^(.*):(\d+):(\d+)$/);
  if (match && components[0]?.framework.startsWith('Vue')) {
    components[0].source = { file: match[1], line: Number(match[2]), column: Number(match[3]), kind: 'source' };
  }
  return { components, rect: bounds, scripts: scripts() };
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

  function resolveUserPhone(...records) {
    const sources = records.flatMap((record) => record && typeof record === 'object'
      ? [record, record.user, record.raw, record.raw?.user].filter(Boolean) : []);
    const text = (value) => {
      if (typeof value !== 'string' && typeof value !== 'number') return '';
      const result = String(value).trim();
      return /^(?:null|undefined|0|-+)$/i.test(result) ? '' : result;
    };
    for (const source of sources) {
      const phone = text(source.phone) || text(source.mobile);
      if (phone) return phone;
    }
    // 常规账号允许手机号登录；学号、邮箱等账号仍作为账号展示。
    for (const source of sources) {
      for (const field of ['account', 'loginAccount', 'userAccount']) {
        const account = text(source[field]);
        if (/^(?:(?:\+|00)?86)?1[3-9]\d{9}$/.test(account.replace(/[\s-]/g, ''))) return account;
      }
    }
    return '';
  }

  function normalizeUser(value = {}) {
    return {
      id: String(value.id ?? ''),
      userId: String(value.userId ?? ''),
      userName: String(value.username ?? value.userName ?? value.name ?? ''),
      phone: resolveUserPhone(value),
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
      phone: resolveUserPhone(value),
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
      phone: resolveUserPhone(value),
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
              phone: resolveUserPhone(user),
              duties: [],
              raw: user,
            };
            teachers.set(key, teacher);
          }
          teacher.phone = resolveUserPhone(teacher, user);
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
  function extractTeachDutyOptions(detail, idNameMap = {}) {
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
        ? deptIds.map((id, i) => ({ id, name: idNameMap[id] || deptNames[i] || '' })).filter((item) => item.name)
        : deptNames.map((name) => ({ id: '', name }));
      for (const subject of (subjects.length ? subjects : [''])) {
        for (const cls of (classes.length ? classes : [{ id: '', name: '' }])) {
          const label = subject && cls.name ? `${subject} · ${cls.name}` : subject || cls.name;
          if (label) duties.push({ label, subject, deptId: cls.id });
        }
      }
    }
    const seen = new Set();
    return duties.filter((item) => {
      const key = JSON.stringify([item.label, item.subject, item.deptId]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function extractTeachDuties(detail, idNameMap = {}) {
    return [...new Set(extractTeachDutyOptions(detail, idNameMap).map((item) => item.label))];
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
    resolveUserPhone,
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
    extractTeachDutyOptions,
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
    const phone = commonNs.tenant?.resolveUserPhone(metadata);
    if (phone) metadata.phone = phone;
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
    const contacts = new Map();
    source.forEach((record) => {
      const normalized = normalizeRecentRecord(record);
      const explicitPort = validLocalPort(record?.localPort);
      const key = recentIdentityKey(normalized);
      if (explicitPort && !localPorts.has(key)) localPorts.set(key, explicitPort);
      const contact = contacts.get(key) || {};
      for (const field of ['phone', 'account', 'roleName']) {
        if (!contact[field] && normalized[field]) contact[field] = normalized[field];
      }
      contacts.set(key, contact);
    });

    const seen = new Set();
    const compacted = [];
    source.forEach((record) => {
      const initial = normalizeRecentRecord(record);
      const key = recentIdentityKey(initial);
      if (seen.has(key)) return;
      seen.add(key);
      compacted.push(normalizeRecentRecord({ ...record, ...contacts.get(key) }, localPorts.get(key)));
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

  async function quickLogin({ tenantId, id, tenantName = '', userName = '', account = '', phone = '', roleName = '', domain = '', industry = '', env = 'online', localPort = '', role = 'teacher' }) {
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
    await recordRecent({ tenantId: String(tenantId), tenantName, id: String(id), userName, ...(account ? { account } : {}), ...(phone ? { phone } : {}), ...(roleName ? { roleName } : {}), domain, industry, role, env: normalizedEnv, localPort: normalizedPort, projectId, ...(adminContextId ? { adminContextId } : {}) });
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
    const contact = {};
    for (const field of ['account', 'phone', 'roleName']) {
      if (item[field] || previous?.[field]) contact[field] = item[field] || previous[field];
    }
    const normalizedItem = normalizeRecentRecord({ ...item, ...contact }, previous?.localPort);
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
  const originToggles = new Map();
  const snapshots = new Map();
  const projectChecks = new Map();
  const htmlIndexes = new Map();
  const MAX_HTML_BYTES = 8 * 1024 * 1024;
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
  const projectCheckKey = (origin, html) => html ? 'html:' + origin : origin;
  const token = () => crypto.randomUUID();
  const fileAccessAllowed = () => new Promise((resolve) => chrome.extension.isAllowedFileSchemeAccess(resolve));
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
  function pageAllowed(origin, settings) {
    return origin.startsWith('file:') ? fileAccessAllowed() : policy.isAllowed(origin, settings.origins);
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
            message.ok ? job.resolve(message) : job.reject(Object.assign(new Error(message.error || '本机操作失败'), { code: message.code, nativeResponse: true }));
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
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('本机操作超时，请重试')); }, action === 'chooseEditor' ? 130000 : action === 'agentSource' ? 60000 : 25000);
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
    const key = projectCheckKey(state.origin, state.project?.html);
    const previous = projectChecks.get(key);
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
    projectChecks.set(key, check);
    return check.promise;
  }

  function watchState(state) {
    const nextAt = state.retryAt || projectChecks.get(projectCheckKey(state.origin, state.project?.html))?.nextAt;
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
    if (policy.pageKey(tab.pendingUrl || tab.url) !== origin) throw new Error('当前页面地址已变化，请重试');
    const settings = await policy.getSettings();
    if (!await pageAllowed(origin, settings)) throw new Error(origin.startsWith('file:') ? '请在 Chrome 扩展详情中开启「允许访问文件网址」' : '请切换到允许的本地开发页面');
    return { tab, settings };
  }

  async function installRuntime(tabId, state, settings, frameId) {
    const target = frameId == null ? { tabId, allFrames: true } : { tabId, frameIds: [frameId] };
    await executeScript({ target, world: 'ISOLATED', files: ['component-inspector.js'] });
    const results = await executeScript({ target, world: 'ISOLATED', func: (config) => {
      globalThis.__IDT_COMPONENT_INSPECTOR__?.start(config);
      return globalThis.__IDT_COMPONENT_INSPECTOR__?.isRunning(config) === true;
    }, args: [{ origin: state.origin, generation: state.generation, clickAction: settings.clickAction, openShortcut: settings.openShortcut, menuShortcut: settings.menuShortcut }] });
    if (!results.some((result) => result.frameId === (frameId ?? 0) && result.result === true)) throw new Error('定位脚本尚未启动，请等待页面加载完成后重试');
  }

  async function startTab(tabId, origin, explicit, previous = {}) {
    if (uninstalling) throw new Error('辅助程序正在卸载，请稍候');
    const { tab, settings } = await assertTarget(tabId, origin, explicit);
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
      if (settings.clickAction === 'open' && (!host.editor || !host.editorAvailable)) throw new Error('请先选择有效的编辑器');
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
        const htmlUrl = results.find((result) => result.frameId === 0)?.result?.html ? tab.pendingUrl || tab.url : '';
        frameworks = [...new Set(detections.flatMap((result) => result.frameworks || []))];
        const waitForPage = () => writeState(tabId, { status: 'waiting', origin, generation, documentId: frame?.documentId, error: '' });
        if (!frameworks.length && !htmlUrl) return waitForPage();
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
        try {
          ({ project } = await nativeRequest('identifyProject', {
            origin, hints: [...hints].slice(0, 32), ...(htmlUrl ? { htmlUrl, htmlOnly: !frameworks.length } : {}),
          }));
          if (project.html) frameworks = ['HTML'];
        } catch (error) {
          if (!frameworks.length && error.code === 'COMPONENT_HTML_NOT_FOUND' && !origin.startsWith('file:')) return waitForPage();
          throw error;
        }
        projectChecks.set(projectCheckKey(origin, project.html), { projectId: project.id, project, promise: Promise.resolve({ project }), checkedAt: Date.now(), nextAt: Date.now() + CHECK_INTERVAL, failures: 0 });
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
    const origin = policy.pageKey(tab.pendingUrl || tab.url);
    let state = await readState(tabId);
    if (!origin || !await originEnabled(origin) || !await pageAllowed(origin, await policy.getSettings())) return {};
    const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 });
    if (sender && (!policy.matchesPage(origin, sender.url) || (sender.frameId === 0 && sender.documentId && sender.documentId !== frame?.documentId))) return {};
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
    return (await chrome.tabs.query({})).filter((tab) => policy.pageKey(tab.pendingUrl || tab.url) === origin);
  }

  async function setOriginEnabled(tabId, origin, enabled) {
    await assertTarget(tabId, origin, true);
    await chrome.storage.local.set({ [policy.ORIGIN_PREFIX + origin]: enabled });
    if (!enabled) {
      projectChecks.delete(origin);
      projectChecks.delete(projectCheckKey(origin, true));
      IDTComponentSources.clearSourceCache(origin);
    }
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

  function toggleOrigin(tabId, origin, enabled) {
    return lock(`origin:${origin}`, async () => {
      const toggle = { enabled };
      originToggles.set(origin, toggle);
      const notify = () => chrome.runtime.sendMessage({ type: 'COMPONENT_STATE_CHANGED', origin }).catch(() => {});
      notify();
      try {
        toggle.previousEnabled = await originEnabled(origin);
        return await setOriginEnabled(tabId, origin, enabled);
      } finally {
        originToggles.delete(origin);
        notify();
      }
    });
  }

  async function restoreEnabledTabs() {
    const tabs = await chrome.tabs.query({});
    const settings = await policy.getSettings();
    await Promise.allSettled(tabs.map((tab) => lock(tab.id, async () => {
      const origin = policy.pageKey(tab.pendingUrl || tab.url);
      if (!origin || !await originEnabled(origin)) return;
      if (!await pageAllowed(origin, settings)) return;
      await executeScript({ target: { tabId: tab.id, allFrames: true }, world: 'ISOLATED', files: ['component-document-ready.js'] });
      await restoreTab(tab.id);
    })));
  }

  async function resolvePageSource(source, state, scripts) {
    if (source?.kind !== 'html' || !source.htmlElement?.length) return IDTComponentSources.resolveComponentSource(source, state.origin, scripts);
    const request = { origin: state.origin, projectId: state.project.id, htmlUrl: source.htmlUrl };
    const previous = htmlIndexes.get(source.htmlUrl);
    let part;
    try { part = await nativeRequest('readHtmlSource', { ...request, revision: previous?.revision }); }
    catch (error) {
      // 打开源码时沿用现有的服务重连流程，再用新项目重新读取 HTML。
      if (serviceChanged(error)) return IDTComponentSources.resolveComponentSource(source, state.origin);
      throw error;
    }
    const { file, revision, size } = part;
    htmlIndexes.delete(source.htmlUrl);
    let index = previous?.file === file && previous.revision === revision && previous.encoding === source.encoding ? previous.index : null;
    if (!index && size <= MAX_HTML_BYTES) {
      if (part.chunk == null) part = await nativeRequest('readHtmlSource', request);
      if (part.revision !== revision) throw new Error('HTML 文件已修改，请刷新页面后重新选择元素');
      const decoder = new TextDecoder(source.encoding || 'utf-8');
      let html = '', offset = 0;
      while (offset < size) {
        const bytes = Uint8Array.from(atob(part.chunk), (character) => character.charCodeAt(0));
        if (!bytes.length || offset + bytes.length > size) throw new Error('HTML 源码读取不完整');
        offset += bytes.length;
        html += decoder.decode(bytes, { stream: offset < size });
        if (offset < size) part = await nativeRequest('readHtmlSource', { ...request, offset, revision });
      }
      index = IDTHtmlSource.indexHtml(html);
    }
    if (index) {
      let cachedBytes = [...htmlIndexes.values()].reduce((sum, entry) => sum + entry.size, 0);
      while (htmlIndexes.size >= 4 || cachedBytes + size > MAX_HTML_BYTES) {
        const oldest = htmlIndexes.keys().next().value;
        cachedBytes -= htmlIndexes.get(oldest).size;
        htmlIndexes.delete(oldest);
      }
      htmlIndexes.set(source.htmlUrl, { file, revision, size, index, encoding: source.encoding });
    }
    const position = index && IDTHtmlSource.locateHtmlElement(index, source.htmlElement);
    return { file, htmlUrl: source.htmlUrl, revision, line: position?.line || null, column: position?.column || null, precision: position ? 'line' : 'file' };
  }

  async function inspect(sender, payload) {
    const tabId = sender.tab?.id;
    const state = await readState(tabId);
    if (state.status !== 'on' || state.generation !== payload.generation || !policy.matchesPage(state.origin, sender.url)) throw new Error('当前页面的组件定位已停止');
    await assertTarget(tabId, state.origin, true);
    const target = sender.documentId ? { tabId, documentIds: [sender.documentId] } : { tabId, frameIds: [sender.frameId || 0] };
    const html = state.frameworks?.includes('HTML');
    const results = await executeScript({ target, world: 'MAIN', func: inspectComponentPage, args: [{ mode: 'element', x: Number(payload.x), y: Number(payload.y), marker: payload.details ? payload.marker : '', props: payload.details === true, origin: policy.pageKey(sender.url), html }] });
    const result = results[0]?.result;
    if (!result || result.error) throw new Error(result?.error || '页面元素已变化');
    const latest = await readState(tabId);
    if (latest.status !== 'on' || latest.generation !== state.generation) throw new Error('页面状态已变化');
    if (!payload.details) return { components: result.components.map(({ name, framework }) => ({ name, framework })), rect: result.rect };
    if (html) {
      const url = new URL(sender.url);
      url.search = ''; url.hash = '';
      const file = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
      for (const component of result.components) {
        component.source = { kind: 'html', file, htmlUrl: url.href, htmlElement: result.htmlElement, encoding: result.htmlEncoding };
      }
    }
    const id = token();
    let entries = snapshots.get(tabId);
    if (!entries) { entries = new Map(); snapshots.set(tabId, entries); }
    const entry = { generation: state.generation, documentId: sender.documentId, frameId: sender.frameId || 0, created: Date.now(), rawComponents: result.components, scripts: result.scripts };
    entries.set(id, entry);
    if (entries.size > 8) entries.delete(entries.keys().next().value);
    const components = await Promise.all(result.components.map(async (component) => {
      const source = await resolvePageSource(component.source, state, result.scripts);
      return { ...component, source };
    }));
    const resolvedState = await readState(tabId);
    if (snapshots.get(tabId)?.get(id) !== entry || resolvedState.status !== 'on' || resolvedState.generation !== state.generation) throw new Error('组件信息已过期，请重新选择');
    entry.components = components;
    return { snapshotId: id, components, rect: result.rect };
  }

  async function useSnapshot(sender, payload, action) {
    const tabId = sender.tab?.id;
    const state = await readState(tabId);
    const entry = snapshots.get(tabId)?.get(payload.snapshotId);
    if (state.status !== 'on' || !entry || entry.generation !== state.generation || entry.documentId !== sender.documentId || entry.frameId !== (sender.frameId || 0) || Date.now() - entry.created > 300000) throw new Error('组件信息已过期，请重新选择');
    const settings = action === 'agentSource' ? await policy.getSettings() : null;
    const taskOptions = settings ? { text: payload.text, taskEditor: settings.taskEditor, autoSend: settings.autoSend } : {};
    const keepSnapshot = action === 'sourceLocation' || (action === 'copySource' && payload.keepSnapshot === true);
    if (action === 'copySource' && keepSnapshot) taskOptions.trailingSpace = false;
    if (action === 'agentSource' && entry.agentAttempted) throw new Error('已尝试打开这条草稿，请先在编辑器中检查结果');
    await assertTarget(tabId, state.origin, true);
    const source = entry.components?.[payload.index]?.source;
    if (!source?.file) throw new Error('此组件尚未提供源码位置');
    let openingState = state;
    try {
      assertHostReady(await readyHost());
      let result;
      if (action === 'agentSource') entry.agentAttempted = true;
      try { result = await nativeRequest(action, { origin: state.origin, projectId: state.project.id, source, ...taskOptions }); }
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
        const refreshedSource = rawSource ? await resolvePageSource(rawSource, openingState, entry.scripts) : source;
        if (!refreshedSource?.file) throw new Error('此组件尚未提供源码位置');
        await assertTarget(tabId, state.origin, true);
        const latest = await readState(tabId);
        if (!latest.enabled || latest.status !== 'on' || latest.generation !== openingState.generation) throw new Error('当前页面的组件定位已停止');
        result = await nativeRequest(action, { origin: state.origin, projectId: openingState.project.id, source: refreshedSource, ...taskOptions });
      }
      if (!keepSnapshot) snapshots.get(tabId)?.delete(payload.snapshotId);
      const latest = await readState(tabId);
      if (action === 'openSource' && latest.status === 'on' && latest.generation === openingState.generation) await writeState(tabId, { ...latest, lastOpened: result });
      return result;
    } catch (error) {
      if (action === 'agentSource' && error.nativeResponse && error.code !== 'CHATGPT_OPEN_UNCERTAIN') entry.agentAttempted = false;
      const latest = await readState(tabId);
      if (serviceChanged(error)) {
        await lock(tabId, async () => {
          const current = await readState(tabId);
          if (current.enabled && current.status === 'on' && current.generation === openingState.generation) {
            await stopRuntime(tabId);
            await writeState(tabId, { ...current, status: 'recovering', generation: token(), error: '正在等待开发服务恢复，恢复后会自动启用定位。' });
          }
        });
      } else if (latest.generation === openingState.generation && /编辑器|连接/.test(error.message)) {
        const settings = await policy.getSettings();
        if (settings.clickAction === 'open' || /连接/.test(error.message)) await pause(tabId, error.message);
      }
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
    if (msg.type === 'COMPONENT_OPEN') return useSnapshot(sender, payload, 'openSource');
    if (['COMPONENT_AGENT', 'COMPONENT_CHATGPT'].includes(msg.type)) {
      if ((await policy.getSettings()).clickAction !== 'agent') throw new Error('请先选择「发送任务」');
      return lock(`agent:${sender.tab?.id}`, () => useSnapshot(sender, payload, 'agentSource'));
    }
    if (msg.type === 'COMPONENT_COPY') return useSnapshot(sender, payload, 'copySource');
    if (msg.type === 'COMPONENT_SOURCE_LOCATION') return useSnapshot(sender, payload, 'sourceLocation');
    // 设置和系统窗口只接受扩展页面发起的操作。
    if (!sender.url?.startsWith(chrome.runtime.getURL(''))) throw new Error('操作来源无效');
    switch (msg.type) {
      case 'COMPONENT_STATUS': {
        const settings = await policy.getSettings();
        let host;
        try { host = { connected: true, ...(await readyHost()) }; }
        catch (error) { host = { connected: false, editor: null, error: error.message }; }
        let state = { status: 'off', enabled: false };
        let toggle, fileAccess;
        if (Number.isInteger(payload.tabId)) {
          const tab = await chrome.tabs.get(payload.tabId);
          const origin = policy.pageKey(tab.pendingUrl || tab.url);
          if (origin.startsWith('file:')) fileAccess = await fileAccessAllowed();
          // 辅助程序检查可能较慢，最后再读状态；启停若恰好完成，则重新读取最终状态。
          do {
            toggle = originToggles.get(origin);
            state = await readState(payload.tabId);
            if (state.origin !== origin) state = { status: 'off', origin, enabled: await originEnabled(origin) };
          } while (toggle !== originToggles.get(origin));
        }
        return { settings, state, host, toggle: toggle ? { ...toggle } : null, fileAccess };
      }
      case 'COMPONENT_CHATGPT_ACCESS':
      case 'COMPONENT_AGENT_ACCESS':
        assertHostReady(await readyHost());
        return nativeRequest('agentAccess', { taskEditor: (await policy.getSettings()).taskEditor });
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
        if ((await policy.getSettings()).clickAction === 'open') await pauseAll('请先选择编辑器，再启动当前页面');
        return result;
      }
      case 'COMPONENT_SAVE_SETTINGS': {
        const previousSettings = await policy.getSettings();
        const settings = policy.normalizeSettings(payload);
        await chrome.storage.local.set({ [policy.SETTINGS_KEY]: settings });
        // 编辑器和发送偏好由后台在提交时读取，保存时保留页面中的草稿。
        if (['clickAction', 'origins', 'openShortcut', 'menuShortcut'].every((key) => JSON.stringify(previousSettings[key]) === JSON.stringify(settings[key]))) return { settings };
        const all = await chrome.storage.session.get(null);
        for (const [key, state] of Object.entries(all)) {
          if (!key.startsWith(policy.TAB_PREFIX) || !['on', 'paused'].includes(state.status)) continue;
          const tabId = Number(key.slice(policy.TAB_PREFIX.length));
          await lock(tabId, async () => {
            const latest = await readState(tabId);
            if (latest.status === 'paused' && latest.enabled && settings.clickAction !== 'open' && /编辑器/.test(latest.error || '')) {
              await startTab(tabId, latest.origin, false); return;
            }
            if (latest.status !== 'on') return;
            if (!await pageAllowed(latest.origin, settings)) await pause(tabId, latest.origin.startsWith('file:') ? '当前页面的访问权限已关闭' : '该开发地址已从允许列表移除');
            else if (settings.clickAction === 'open' && !(await readyHost()).editorAvailable) await pause(tabId, '请先选择有效的编辑器');
            else await installRuntime(tabId, latest, settings).catch(() => {});
          });
        }
        return { settings };
      }
      case 'COMPONENT_START': return toggleOrigin(payload.tabId, payload.origin, true);
      case 'COMPONENT_STOP': return toggleOrigin(payload.tabId, payload.origin, false);
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
      const origin = policy.pageKey(details.url);
      const enabled = origin && await originEnabled(origin) && await pageAllowed(origin, await policy.getSettings());
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
