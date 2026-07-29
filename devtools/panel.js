/* 内部开发工具箱 — DevTools Panel 逻辑 */

const tabId = chrome.devtools.inspectedWindow.tabId;
let currentProjectId = null;
let mockRules = [];
let requestLog = [];
let selectedRequest = null; // 捕获列表中选中的请求记录
let selectedRequestKey = null; // 选中请求的稳定 key（method + ' ' + 无 query/hash 的 url）
let selectedRuleId = null;  // Emo / 已编列表中选中的规则 id
let listMode = 'capture';   // 'capture' | 'emo' | 'edited'，默认捕获
let selectedDataTab = 'response'; // 编辑器当前出参/入参 Tab，重渲染后保持
let csReady = true; // content script 是否在当前标签页就绪
let monitorDisabled = []; // 被禁监的接口 key（method + ' ' + 无 query/hash 的 url）数组
let dataLoadRevision = 0; // 丢弃晚到的旧 loadData 结果，避免覆盖刚保存的规则
let editorSessionRevision = 0; // 使旧编辑器的 debounce 回调在重渲染后失效
let mockRuleSaveQueue = Promise.resolve(); // 串行保存整条规则，防止异步写入互相覆盖
let editorDraftState = null; // 未保存的 Mock 草稿，用于 Tab/开关重渲染时保留编辑内容
let importConflictResolver = null; // 导入冲突弹窗当前等待中的选择
let capturedImportConflictInProgress = false; // 防止轮询捕获并发弹出多个版本选择弹窗
let capturedConflictChoiceTemplate = null; // “应用到后续”在连续捕获冲突中的版本选择模板
const selectedConflictRequestKeys = new Set(); // 选择捕获版本后，用稳定接口 key 保留当前面板标识
const SELECTED_CONFLICT_VERSION_TITLE = '已选择差异版本';

// 扩展上下文失效提示：扩展重载后，已打开的 DevTools 面板仍持有旧的 chrome.runtime，
// 任何消息都会失败（同步抛 "Extension context invalidated"）。
// 弹出固定提示条引导用户重开 DevTools 并刷新页面，避免误以为是 mock 数据/规则问题。
let contextInvalidatedShown = false;
function showContextInvalidated(detail) {
  console.error('[Mock Panel] Extension context invalidated:', detail);
  if (contextInvalidatedShown) return;
  contextInvalidatedShown = true;
  if (document.getElementById('contextInvalidatedBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'contextInvalidatedBanner';
  banner.textContent = '扩展已重载，当前 DevTools 面板上下文失效。请关闭并重新打开 DevTools，并刷新被调试页面后再操作。';
  Object.assign(banner.style, {
    position: 'fixed', top: '0', left: '0', right: '0',
    zIndex: '9999',
    padding: '8px 16px',
    background: '#dc2626',
    color: '#fff',
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: '12px',
    fontWeight: '600',
    lineHeight: '1.4',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    cursor: 'pointer',
  });
  banner.title = '点击关闭';
  banner.addEventListener('click', () => banner.remove());
  document.body.appendChild(banner);
}

function showPanelNotice(message) {
  const existing = document.getElementById('panelNotice');
  if (existing) existing.remove();
  const notice = document.createElement('div');
  notice.id = 'panelNotice';
  notice.textContent = message;
  Object.assign(notice.style, {
    position: 'fixed', top: '16px', right: '16px', zIndex: '9998',
    maxWidth: '440px', padding: '10px 14px',
    border: '1px solid #86efac', borderRadius: '6px',
    background: '#f0fdf4', color: '#166534',
    fontSize: '12px', fontWeight: '600', lineHeight: '1.5',
    boxShadow: '0 4px 14px rgba(0,0,0,0.14)', cursor: 'pointer',
  });
  notice.title = '点击关闭';
  notice.addEventListener('click', () => notice.remove());
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 6000);
}

// 工具函数
// 向 background 发送消息。扩展重载后面板未刷新时 chrome.runtime 会失效，
// chrome.runtime.sendMessage 会同步抛异常；此处统一捕获并返回结构化错误，
// 避免业务调用处（保存/切换/导入等）因未捕获异常而崩溃。
function sendMessage(msg) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        const lastErr = chrome.runtime?.lastError;
        if (lastErr) {
          showContextInvalidated(lastErr.message);
          resolve({ ok: false, error: lastErr.message, contextInvalidated: true });
          return;
        }
        resolve(response || { ok: false, error: '无响应（扩展可能已重载，请刷新页面与 DevTools）' });
      });
    } catch (err) {
      // chrome.runtime 已失效（扩展重载后面板未刷新）会同步抛出
      showContextInvalidated(err.message);
      resolve({ ok: false, error: err.message, contextInvalidated: true });
    }
  });
}

// 请求 background 激活/关闭当前 inspected tab 的 hook 记录开关。
// hook 始终由 manifest 在 document_start 静态安装（保证拦得到所有请求），
// 面板打开时激活记录、面板关闭后不再记录，实现“仅在控制台打开时捕获”。
// 页面导航（刷新/跳转）会重置 MAIN world，hook 重装为默认未激活，
// 故 onNavigated 后需重新激活。
function setHookActive(active) {
  sendMessage({ type: 'SET_HOOK_ACTIVE', tabId, active }).then((res) => {
    if (res && res.ok) {
      console.log('[Mock Panel] hook active=' + active + ' for tab', tabId);
    } else {
      console.warn('[Mock Panel] set hook active failed:', res && res.error);
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// 简化版 Schema 推断（复用 mock-generator 逻辑）
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

// 简化版假数据生成器
function generateMockData(schema) {
  if (!schema || !schema.type) return null;

  const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄'];
  const givenNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '军'];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomString(len = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: len }, () => pick(chars.split(''))).join('');
  }

  function generateByFieldName(fieldName, type) {
    const lower = (fieldName || '').toLowerCase();

    if (/name|username|user_name/.test(lower)) {
      return pick(surnames) + pick(givenNames);
    }
    if (/email|mail/.test(lower)) {
      return `${randomString(6)}@example.com`;
    }
    if (/phone|mobile|tel/.test(lower)) {
      return `1${randomInt(3, 9)}${randomInt(0, 9)}${Array.from({ length: 8 }, () => randomInt(0, 9)).join('')}`;
    }
    if (/^id$|user_?id|uid/.test(lower)) {
      return randomInt(1000, 999999);
    }
    if (/url|link|href/.test(lower)) {
      return `https://example.com/${randomString(8)}`;
    }
    if (/avatar|photo|image/.test(lower)) {
      return `https://i.pravatar.cc/150?u=${randomString(8)}`;
    }
    if (/time|date|created_at|updated_at|timestamp/.test(lower)) {
      return Date.now();
    }
    if (/address|addr/.test(lower)) {
      return '北京市朝阳区建国路' + randomInt(1, 999) + '号';
    }
    return null;
  }

  const byName = generateByFieldName(schema.fieldName, schema.type);
  if (byName !== null) return byName;

  switch (schema.type) {
    case 'string':
      return randomString(randomInt(5, 12));
    case 'number':
      return randomInt(1, 1000);
    case 'boolean':
      return Math.random() > 0.5;
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

// ===== OpenAPI / Swagger 导入：解析接口 + 严格按数据结构生成 Mock =====

// ── 假数据辅助 ──
const IMP_SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴'];
const IMP_GIVENS = ['伟', '芳', '娜', '敏', '静', '丽', '强', '军', '杰', '涛'];
const IMP_GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
function _impPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function _impInt(min, max) {
  if (min > max) { const t = min; min = max; max = t; }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function _impFloat(min, max, dec = 2) {
  if (min > max) { const t = min; min = max; max = t; }
  return parseFloat((Math.random() * (max - min) + min).toFixed(dec));
}
function _impStr(len = 8, chars = 'abcdefghijklmnopqrstuvwxyz0123456789') {
  return Array.from({ length: len }, () => _impPick(chars.split(''))).join('');
}
function _impUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// 提取首个 ```fence``` 代码块内容（Apifox 复制的文档常带 markdown 包裹）
function extractCodeBlock(text) {
  const fence = text.match(/```[a-zA-Z0-9_-]*\r?\n([\s\S]*?)```/);
  return fence ? fence[1].trim() : text.trim();
}

// OpenAPI 文档中常见 `description: 请求头 Authorization: Bearer ...` 这类文本。
// 反引号对 YAML 没有引号语义，第二个 `: ` 会让标准解析器报 mapping indentation。
// 仅在解析器明确指向该行、且值确实是未加引号的纯文本时自动补引号。
function quoteInvalidYamlPlainMappingLine(source, lineIndex) {
  if (!Number.isInteger(lineIndex) || lineIndex < 0) return null;
  const lines = source.split(/\r?\n/);
  const line = lines[lineIndex];
  if (line == null) return null;

  const match = line.match(/^(\s*(?:-\s+)?(?:[A-Za-z_][\w.-]*|'[^']+'|"[^"]+"):\s+)(.*)$/);
  if (!match) return null;
  const value = match[2].trim();
  if (!value || !/:\s/.test(value) || /^["'[{|>!&*]/.test(value)) return null;

  lines[lineIndex] = match[1] + JSON.stringify(value);
  return lines.join('\n');
}

function loadOpenApiYaml(text) {
  let candidate = text;
  let lastError = null;
  const repairedLines = new Set();

  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      return jsyaml.load(candidate);
    } catch (err) {
      lastError = err;
      const lineIndex = err?.mark?.line;
      if (!Number.isInteger(lineIndex) || repairedLines.has(lineIndex)) throw err;
      const repaired = quoteInvalidYamlPlainMappingLine(candidate, lineIndex);
      if (!repaired || repaired === candidate) throw err;
      repairedLines.add(lineIndex);
      candidate = repaired;
    }
  }
  throw lastError;
}

// 解析 OpenAPI / Swagger 文本（自动识别 JSON 与 YAML，兼容 markdown 包裹）
function parseOpenApiSpec(text) {
  const trimmed = extractCodeBlock(text || '');
  if (!trimmed) throw new Error('内容为空，请粘贴接口定义');
  // JSON：以 { 或 [ 开头直接解析
  if (trimmed[0] === '{' || trimmed[0] === '[') {
    return JSON.parse(trimmed);
  }
  // 兜底再试一次 JSON
  try { return JSON.parse(trimmed); } catch (_) { /* 继续走 YAML */ }
  if (typeof jsyaml === 'undefined' || !jsyaml.load) {
    throw new Error('YAML 解析器未加载，无法解析该内容');
  }
  return loadOpenApiYaml(trimmed);
}

// 解析 $ref（仅支持文档内引用 #/...）
function resolveRef(spec, ref) {
  if (!ref || typeof ref !== 'string' || ref[0] !== '#') return null;
  let cur = spec;
  for (const seg of ref.slice(1).split('/').filter(Boolean)) {
    const key = decodeURIComponent(seg).replace(/~1/g, '/').replace(/~0/g, '~');
    cur = cur?.[key];
    if (cur == null) return null;
  }
  return cur;
}

function resolveOpenApiObject(spec, value) {
  return value?.$ref ? (resolveRef(spec, value.$ref) || value) : value;
}

// 拍平 schema：解析 $ref / 合并 allOf / 取 oneOf·anyOf 首项，返回带确定 type 的 schema
function flattenSchema(spec, schema, seen = new Set()) {
  if (!schema) return {};
  if (schema.$ref) {
    if (seen.has(schema.$ref)) return {}; // 防止循环引用
    seen.add(schema.$ref);
    return flattenSchema(spec, resolveRef(spec, schema.$ref) || {}, seen);
  }
  const merged = { ...schema };
  if (Array.isArray(schema.allOf)) {
    for (const part of schema.allOf) {
      const flat = flattenSchema(spec, part, seen);
      merged.properties = { ...(flat.properties || {}), ...(merged.properties || {}) };
      if (flat.type && !merged.type) merged.type = flat.type;
    }
  }
  if (!merged.type && (schema.oneOf || schema.anyOf)) {
    const first = (schema.oneOf || schema.anyOf)[0];
    const flat = flattenSchema(spec, first, seen);
    merged.properties = { ...(flat.properties || {}), ...(merged.properties || {}) };
    if (flat.type) merged.type = flat.type;
  }
  return merged;
}

// 字段名启发式（针对原始类型，返回 undefined 表示未命中，交给类型兜底）
function mockFieldByName(fieldName, type, schema) {
  const f = (fieldName || '').toLowerCase();

  // 响应包装字段
  if (f === 'code' && (type === 'integer' || type === 'number')) return 200;
  if (f === 'success') return true;
  if (f === 'msg' || f === 'message') return '操作成功';

  // 学年 / 年级 / 班级
  if (f === 'academicyear' || f === 'schoolyear') return '2025-2026';
  if (f === 'gradename') return _impPick(IMP_GRADES);
  if (f === 'classname') return _impPick(IMP_GRADES).replace('年级', '') + _impInt(1, 9) + '班';

  // 排名
  if (/rankno|rank_no|rankingno|ranking_no|myrankno|mypredictedrankno/.test(f)) return _impInt(1, 50);

  // 徽章
  if (f === 'badgename') return _impPick(['阅读达人', '勤学之星', '书海先锋', '知识探索者']);
  if (f === 'badgeimageurl' || f === 'badgeurl') return `https://example.com/badge/${_impStr(6)}.png`;
  if (f === 'badgeimagekey') return `badge/${_impStr(8)}.png`;
  if (f === 'badgeconditiontype') return _impInt(1, 5);

  // 计数
  if (/count$|total$/.test(f) && (type === 'integer' || type === 'number')) return _impInt(0, 50);

  // 姓名类（先于通用 name，避免 className 误中）
  if (f === 'studentname' || f === 'username' || f === 'realname' || f === 'name' || f === 'nickname') {
    return _impPick(IMP_SURNAMES) + _impPick(IMP_GIVENS);
  }

  // 头像 / 图片
  if (/avatar|photo|image|img|pic|picture/.test(f)) return `https://i.pravatar.cc/150?u=${_impStr(8)}`;

  // ID
  if (f === 'id' || /_?id$/.test(f)) {
    return (type === 'integer' || type === 'number') ? _impInt(1000, 999999) : String(_impInt(1000, 999999));
  }
  if (f === 'uuid' || f === 'guid') return _impUuid();

  // URL
  if (/^url$|link|href|website|imageurl/.test(f)) return `https://example.com/${_impStr(8)}`;

  // 时间
  if (/time|date|timestamp|created_at|updated_at/.test(f)) {
    return f.endsWith('year') ? '2025-2026' : Date.now();
  }

  // 邮箱 / 手机
  if (/email|mail/.test(f)) return `${_impStr(6)}@example.com`;
  if (/phone|mobile|tel/.test(f)) return `1${_impInt(3, 9)}${_impStr(8, '0123456789')}`;

  // 布尔类
  if (type === 'boolean') {
    if (/completed|effective|current|enabled|active|deleted|success|is_|has_/.test(f)) {
      return Math.random() > 0.5;
    }
  }

  return undefined;
}

function mockString(schema) {
  const fmt = schema.format;
  if (fmt === 'date-time') return new Date().toISOString();
  if (fmt === 'date') return new Date().toISOString().slice(0, 10);
  if (fmt === 'email') return `${_impStr(6)}@example.com`;
  if (fmt === 'uuid') return _impUuid();
  if (fmt === 'uri' || fmt === 'url') return `https://example.com/${_impStr(8)}`;
  return _impStr(_impInt(5, 12));
}

// Schema → Mock：严格按接口数据结构递归生成
function schemaToMock(spec, schema, fieldName = '') {
  if (!schema) return null;
  const s = flattenSchema(spec, schema);

  // 1) 显式示例优先
  if (s.example !== undefined) return s.example;
  // 2) 枚举
  if (Array.isArray(s.enum) && s.enum.length) return s.enum[0];
  // 3) 默认值
  if (s.default !== undefined) return s.default;

  const type = s.type || (s.properties ? 'object' : (s.items ? 'array' : 'string'));

  // 原始类型先走字段名启发式
  if (['string', 'integer', 'number', 'boolean'].includes(type)) {
    const byName = mockFieldByName(fieldName, type, s);
    if (byName !== undefined) return byName;
  }

  switch (type) {
    case 'string':
      return mockString(s);
    case 'integer': {
      const min = s.minimum ?? 0;
      const max = s.maximum ?? Math.max(min + 100, 1000);
      return _impInt(min, max);
    }
    case 'number': {
      const min = s.minimum ?? 0;
      const max = s.maximum ?? 100;
      return _impFloat(min, max, 2);
    }
    case 'boolean':
      return Math.random() > 0.5;
    case 'array': {
      const n = Math.min(Math.max(s.minItems || 3, 1), 5);
      return Array.from({ length: n }, () => schemaToMock(spec, s.items, fieldName));
    }
    case 'object': {
      const order = (Array.isArray(s['x-apifox-orders']) && s['x-apifox-orders'].length)
        ? s['x-apifox-orders']
        : Object.keys(s.properties || {});
      const obj = {};
      for (const key of order) {
        if (s.properties && s.properties[key] != null) {
          obj[key] = schemaToMock(spec, s.properties[key], key);
        }
      }
      return obj;
    }
    default:
      return null;
  }
}

const IMPORT_HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

// 从 OpenAPI / Swagger spec 提取全部接口。单接口文档同样返回长度为 1 的数组。
function extractEndpoints(spec) {
  if (!spec || !spec.paths) throw new Error('未找到 paths，不是合法的 OpenAPI/Swagger 文档');
  const endpoints = [];
  for (const path of Object.keys(spec.paths)) {
    const pathItem = spec.paths[path];
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of Object.keys(pathItem)) {
      if (!IMPORT_HTTP_METHODS.includes(method.toLowerCase())) continue;
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object') continue;
      endpoints.push({ path, method: method.toUpperCase(), operation, pathItem });
    }
  }
  if (endpoints.length > 0) return endpoints;
  throw new Error('未找到可导入的接口（paths 内无 HTTP 方法）');
}

// 保留原单接口提取入口，供旧调用方继续使用。
function extractEndpoint(spec) {
  return extractEndpoints(spec)[0];
}

function getJsonMediaTypeContent(content) {
  if (!content || typeof content !== 'object') return null;
  const mediaType = Object.keys(content).find(type => {
    const normalized = type.toLowerCase().split(';', 1)[0].trim();
    return normalized === 'application/json' || normalized.endsWith('+json');
  });
  return mediaType ? content[mediaType] : null;
}

function explicitExample(spec, value) {
  if (!value || typeof value !== 'object') return { found: false, value: undefined };
  if (Object.prototype.hasOwnProperty.call(value, 'example')) {
    return { found: true, value: value.example };
  }
  if (!value.examples || typeof value.examples !== 'object') {
    return { found: false, value: undefined };
  }

  const firstExample = value.examples[Object.keys(value.examples)[0]];
  const resolved = resolveOpenApiObject(spec, firstExample);
  if (resolved && typeof resolved === 'object' && Object.prototype.hasOwnProperty.call(resolved, 'value')) {
    return { found: true, value: resolved.value };
  }
  return { found: false, value: undefined };
}

// 取响应体 schema 与实际选中的 2xx 状态码，兼容 OpenAPI 3.x 与 Swagger 2.0。
function getResponseDefinition(spec, operation) {
  const responses = operation.responses || {};
  const responseKeys = Object.keys(responses);
  const okKey = responseKeys.find(key => /^2\d\d$/.test(String(key)))
    || responseKeys.find(key => /^2xx$/i.test(String(key)))
    || responseKeys[0];
  const response = resolveOpenApiObject(spec, responses[okKey]);
  const media = getJsonMediaTypeContent(response?.content);
  let example = explicitExample(spec, media);
  if (!example.found && response && Object.prototype.hasOwnProperty.call(response, 'example')) {
    example = { found: true, value: response.example };
  }
  if (!example.found && response?.examples && typeof response.examples === 'object') {
    const swaggerExampleKey = Object.keys(response.examples).find(type => {
      const normalized = type.toLowerCase().split(';', 1)[0].trim();
      return normalized === 'application/json' || normalized.endsWith('+json');
    });
    if (swaggerExampleKey) example = { found: true, value: response.examples[swaggerExampleKey] };
  }
  const numericStatus = Number(okKey);
  return {
    schema: media?.schema || response?.schema || null,
    example: example.value,
    hasExample: example.found,
    status: Number.isInteger(numericStatus) && numericStatus >= 100 && numericStatus <= 599
      ? numericStatus
      : 200,
  };
}

function getResponseSchema(spec, operation) {
  return getResponseDefinition(spec, operation).schema;
}

// 取入参定义：优先请求体；没有请求体时将 query 参数组装成对象。
function getRequestDefinition(spec, operation, pathItem = {}) {
  const requestBody = resolveOpenApiObject(spec, operation.requestBody);
  const media = getJsonMediaTypeContent(requestBody?.content);
  if (media?.schema) {
    let example = explicitExample(spec, media);
    if (!example.found) example = explicitExample(spec, requestBody);
    return { schema: media.schema, example: example.value, hasExample: example.found };
  }

  const parameters = [...(pathItem.parameters || []), ...(operation.parameters || [])];
  for (const parameterRef of parameters) {
    const parameter = resolveOpenApiObject(spec, parameterRef);
    if (parameter?.in === 'body' && parameter.schema) {
      const example = explicitExample(spec, parameter);
      return { schema: parameter.schema, example: example.value, hasExample: example.found };
    }
  }

  const queryParameters = new Map();
  parameters.forEach((parameterRef) => {
    const parameter = resolveOpenApiObject(spec, parameterRef);
    if (parameter?.in === 'query' && parameter.name) queryParameters.set(parameter.name, parameter);
  });
  if (queryParameters.size > 0) {
    const properties = {};
    const example = {};
    queryParameters.forEach((parameter, name) => {
      const schema = parameter.schema || {
        type: parameter.type,
        format: parameter.format,
        enum: parameter.enum,
        default: parameter.default,
      };
      properties[name] = schema;
      const parameterExample = explicitExample(spec, parameter);
      example[name] = parameterExample.found
        ? parameterExample.value
        : schemaToMock(spec, schema, name);
    });
    return { schema: { type: 'object', properties }, example, hasExample: true };
  }
  return { schema: null, example: undefined, hasExample: false };
}

function getRequestSchema(spec, operation, pathItem = {}) {
  return getRequestDefinition(spec, operation, pathItem).schema;
}

// 拼接完整 URL（servers[0].url + path）
function buildEndpointUrl(spec, path) {
  const server = (spec.servers && spec.servers[0] && spec.servers[0].url) || '';
  const swaggerBasePath = !server && spec.swagger
    ? String(spec.basePath || '').replace(/\/+$/, '')
    : '';
  return (server || swaggerBasePath).replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '');
}

// 导入接口的 URL：仅取 spec 的路径部分（含上下文路径，如 /ai-reading/），不携带域名。
// 域名在拦截时默认使用当前页面域名（见 mock-hook findMatchingRule 的路径匹配）。
function buildImportUrl(spec, path) {
  const fullSpecUrl = buildEndpointUrl(spec, path);
  try {
    return new URL(fullSpecUrl).pathname;
  } catch (_) {
    return fullSpecUrl.startsWith('/') ? fullSpecUrl : path;
  }
}

// 为单个 operation 生成 Mock 规则。
function buildRuleFromEndpoint(spec, endpoint, id) {
  const { path, method, operation, pathItem } = endpoint;
  const url = buildImportUrl(spec, path); // 仅路径，不携带域名

  const response = getResponseDefinition(spec, operation);
  const responseSchema = response.schema;
  const request = getRequestDefinition(spec, operation, pathItem);
  if (!responseSchema) {
    throw new Error(`接口 ${method} ${path} 未定义 JSON 响应体，无法生成 Mock`);
  }

  const responseMock = response.hasExample ? response.example : schemaToMock(spec, responseSchema);
  const requestMock = request.hasExample
    ? request.example
    : (request.schema ? schemaToMock(spec, request.schema) : null);

  const now = Date.now();
  return {
    id: id || now.toString(),
    url,
    method,
    mockMode: 'response',
    mockData: responseMock,
    enabled: true,
    imported: true,
    status: response.status,
    createdAt: now,
    updatedAt: now,
    captured: {
      status: response.status,
      requestPayload: requestMock,
      responsePayload: responseMock,
      timestamp: now,
      source: 'imported',
      summary: operation.summary || '',
    },
  };
}

// 解析整份文档并生成全部规则。先完成所有规则校验，再交给导入流程统一写入。
function buildRulesFromSpec(text) {
  const spec = parseOpenApiSpec(text);
  const endpoints = extractEndpoints(spec);
  const batchId = Date.now();
  const rules = [];
  const errors = [];

  endpoints.forEach((endpoint, index) => {
    try {
      rules.push(buildRuleFromEndpoint(spec, endpoint, `${batchId}-${index}`));
    } catch (err) {
      errors.push(err.message || String(err));
    }
  });

  if (errors.length === 1) throw new Error(errors[0]);
  if (errors.length > 1) {
    throw new Error(`有 ${errors.length} 个接口无法导入：${errors.join('；')}`);
  }
  return rules;
}

// 保留单接口 API 的返回结构；多接口导入使用 buildRulesFromSpec。
function buildRuleFromSpec(text) {
  return buildRulesFromSpec(text)[0];
}

// ── 导入弹窗交互 ──
function showImportModal() {
  const modal = document.getElementById('importModal');
  const ta = document.getElementById('importTextarea');
  const status = document.getElementById('importStatus');
  if (!modal) return;
  ta.value = '';
  status.textContent = '';
  status.className = 'modal-status';
  modal.removeAttribute('hidden');
  setTimeout(() => ta.focus(), 50);
}

function hideImportModal() {
  const modal = document.getElementById('importModal');
  if (modal) modal.setAttribute('hidden', '');
}

function setImportStatus(msg, kind) {
  const el = document.getElementById('importStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'modal-status' + (kind ? ' ' + kind : '');
}

function interfacePageOrigin(endpoint, fallbackEndpoint) {
  return endpoint?.pageOrigin || endpoint?.captured?.pageOrigin ||
    fallbackEndpoint?.pageOrigin || fallbackEndpoint?.captured?.pageOrigin;
}

// 相同接口只认“相同请求方式 + 相同 URL（去除 Query Parameters）”。
// 导入规则只存相对路径时，必须有捕获记录携带的 pageOrigin 才能还原为完整 URL；
// 绝对 URL 始终保留 origin/端口参与比较，不能只按 pathname 判断。
function normalizedInterfaceUrl(endpoint, fallbackEndpoint) {
  const raw = endpointUrl(endpoint?.url);
  if (!raw) return '';
  try {
    return new URL(raw).href;
  } catch (_) {
    const pageOrigin = interfacePageOrigin(endpoint, fallbackEndpoint);
    if (!pageOrigin) return `relative:${raw}`;
    try {
      return new URL(raw, pageOrigin).href;
    } catch (_) {
      return `relative:${raw}`;
    }
  }
}

function sameInterface(left, right) {
  if (!left || !right) return false;
  return String(left.method || '').toUpperCase() === String(right.method || '').toUpperCase() &&
    normalizedInterfaceUrl(left, right) === normalizedInterfaceUrl(right, left);
}

function findImportConflicts(importedRule) {
  const conflicts = [];
  const captured = requestLog.find(request => sameInterface(importedRule, request));
  if (captured) {
    conflicts.push({ choice: 'capture', mode: 'capture', label: '捕获', request: captured });
  }

  const emoRules = (mockRules || []).filter(rule => isCaptureRule(rule) && sameInterface(importedRule, rule));
  emoRules.forEach((rule, index) => {
    conflicts.push({
      choice: `emo:${rule.id}`,
      mode: 'emo',
      label: emoRules.length > 1 ? `Emo ${index + 1}` : 'Emo',
      rule,
    });
  });
  return conflicts;
}

function buildConflictVersion(candidate) {
  if (candidate.mode === 'edited') {
    const rule = candidate.rule;
    const captured = rule.captured || {};
    const parts = getMockParts(rule);
    return {
      ...candidate,
      dataSource: '导入文档',
      method: rule.method,
      url: displayInterfaceUrl(rule.url),
      summary: captured.summary || '',
      status: captured.status ?? parts.responseMock.status ?? rule.status ?? 200,
      requestPayload: hasOwn(captured, 'requestPayload')
        ? captured.requestPayload
        : (parts.requestMock.hasMockData ? parts.requestMock.mockData : undefined),
      responsePayload: hasOwn(captured, 'responsePayload')
        ? captured.responsePayload
        : (parts.responseMock.hasMockData ? parts.responseMock.mockData : undefined),
      requestMockData: parts.requestMock.hasMockData ? parts.requestMock.mockData : undefined,
      responseMockData: parts.responseMock.hasMockData ? parts.responseMock.mockData : undefined,
      interceptState: isRuleMocked(rule) ? '已开启' : '未开启',
    };
  }

  if (candidate.mode === 'capture') {
    const request = candidate.request;
    const snapshot = getOriginalRequestSnapshot(request);
    return {
      ...candidate,
      dataSource: '原始捕获',
      method: snapshot?.method || request.method,
      url: displayInterfaceUrl(snapshot?.url || request.url),
      summary: '',
      status: snapshot?.status,
      requestPayload: snapshot?.requestPayload,
      responsePayload: snapshot?.responsePayload,
      requestMockData: undefined,
      responseMockData: undefined,
      interceptState: request.mocked
        ? (snapshot ? '已命中 Mock（展示原始快照）' : '已命中 Mock（无原始快照）')
        : '实时捕获',
    };
  }

  const rule = candidate.rule;
  const captured = rule.captured || {};
  const parts = getMockParts(rule);
  return {
    ...candidate,
    dataSource: 'Emo 保存快照',
    method: rule.method,
    url: displayInterfaceUrl(rule.url),
    summary: captured.summary || '',
    status: captured.status,
    requestPayload: captured.requestPayload,
    responsePayload: captured.responsePayload,
    requestMockData: parts.requestMock.hasMockData ? parts.requestMock.mockData : undefined,
    responseMockData: parts.responseMock.hasMockData ? parts.responseMock.mockData : undefined,
    interceptState: isRuleMocked(rule) ? '已开启' : '未开启',
  };
}

function conflictValueKey(value) {
  if (value === undefined) return '__undefined__';
  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
}

function formatConflictValue(value) {
  if (value === undefined) return '未提供';
  if (value === '') return '空';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return String(value);
  }
}

function hideImportConflictModal(selection = null) {
  const modal = document.getElementById('importConflictModal');
  if (modal) modal.setAttribute('hidden', '');
  const resolve = importConflictResolver;
  importConflictResolver = null;
  if (resolve) resolve(selection);
}

function defaultConflictChoice(candidates) {
  return candidates.find(candidate => candidate.mode === 'edited')?.choice || candidates[0]?.choice || null;
}

function buildConflictCandidates(importedRule, conflicts) {
  return [
    { choice: 'edited', mode: 'edited', label: '已编', rule: importedRule },
    ...conflicts,
  ];
}

// “应用到后续”按来源类型与同来源候选序号匹配。Emo 规则的 id 每个接口都不同，
// 因而不能直接复用 choice 字符串；保留序号可正确对应 Emo 1 / Emo 2。
function createConflictChoiceTemplate(candidates, choice) {
  const selected = candidates.find(candidate => candidate.choice === choice);
  if (!selected) return null;
  const sameMode = candidates.filter(candidate => candidate.mode === selected.mode);
  return {
    mode: selected.mode,
    modeIndex: sameMode.findIndex(candidate => candidate.choice === selected.choice),
  };
}

function findConflictChoiceByTemplate(candidates, template) {
  if (!template) return null;
  return candidates.filter(candidate => candidate.mode === template.mode)[template.modeIndex]?.choice || null;
}

function withSelectedConflictVersion(rule, source) {
  if (!rule) return null;
  return {
    ...rule,
    conflictVersionSelected: true,
    conflictVersionSource: source,
  };
}

function selectedConflictVersionIcon(extraClass = '') {
  const classes = ['selected-conflict-version-icon', extraClass].filter(Boolean).join(' ');
  return `<span class="${classes}" role="img" aria-label="${SELECTED_CONFLICT_VERSION_TITLE}" title="${SELECTED_CONFLICT_VERSION_TITLE}">✓</span>`;
}

function showImportConflictModal(importedRule, conflicts, { remainingConflictCount = 0 } = {}) {
  const modal = document.getElementById('importConflictModal');
  const endpoint = document.getElementById('importConflictEndpoint');
  const content = document.getElementById('importConflictContent');
  const confirmBtn = document.getElementById('importConflictConfirmBtn');
  const applyRemainingBtn = document.getElementById('importConflictApplyRemainingBtn');
  if (!modal || !endpoint || !content || !confirmBtn || !applyRemainingBtn) return Promise.resolve(null);

  const candidates = buildConflictCandidates(importedRule, conflicts).map(buildConflictVersion);
  let selectedChoice = defaultConflictChoice(candidates);
  const fields = [
    { key: 'dataSource', label: '数据来源' },
    { key: 'method', label: 'Method' },
    { key: 'url', label: 'URL' },
    { key: 'summary', label: '接口摘要' },
    { key: 'status', label: 'HTTP 状态' },
    { key: 'requestPayload', label: '原始入参' },
    { key: 'responsePayload', label: '原始出参' },
    { key: 'requestMockData', label: 'Mock 入参' },
    { key: 'responseMockData', label: 'Mock 出参' },
    { key: 'interceptState', label: '拦截状态' },
  ];
  const differences = fields.filter(field =>
    new Set(candidates.map(candidate => conflictValueKey(candidate[field.key]))).size > 1
  );

  endpoint.textContent = `${importedRule.method} ${displayInterfaceUrl(importedRule.url)}`;
  const header = candidates.map((candidate, index) => `
    <th data-conflict-index="${index}">
      <label class="conflict-version-option">
        <input type="radio" name="importConflictChoice" value="${escapeHtml(candidate.choice)}" data-index="${index}"${candidate.choice === selectedChoice ? ' checked' : ''}>
        <span class="conflict-version-copy">
          <span class="conflict-version-label">${escapeHtml(candidate.label)}${selectedConflictVersionIcon('conflict-version-selection-icon')}</span>
          <span class="conflict-version-meta">${escapeHtml(candidate.method)} ${escapeHtml(candidate.url)}</span>
        </span>
      </label>
    </th>
  `).join('');
  const rows = differences.map(field => `
    <tr>
      <td class="conflict-field">${escapeHtml(field.label)}</td>
      ${candidates.map((candidate, index) => `<td data-conflict-index="${index}"><pre class="conflict-value">${escapeHtml(formatConflictValue(candidate[field.key]))}</pre></td>`).join('')}
    </tr>
  `).join('');

  content.innerHTML = `
    <table class="conflict-table">
      <thead><tr><th class="conflict-field">差异项</th>${header}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${candidates.length + 1}" class="conflict-no-diff">接口内容一致，请选择要保留的归属版本。</td></tr>`}</tbody>
    </table>
  `;
  const inputs = [...content.querySelectorAll('input[name="importConflictChoice"]')];
  const selectCandidate = (index) => {
    const input = inputs[index];
    const candidate = candidates[index];
    if (!input || !candidate) return;
    selectedChoice = candidate.choice;
    inputs.forEach((item, itemIndex) => { item.checked = itemIndex === index; });
    content.querySelectorAll('[data-conflict-index]').forEach(cell => {
      cell.classList.toggle('is-selected', Number(cell.dataset.conflictIndex) === index);
    });
    confirmBtn.disabled = false;
    confirmBtn.removeAttribute('disabled');
  };
  // 候选顺序固定以“已编”为首列，弹窗打开时默认保留导入版本。
  selectCandidate(candidates.findIndex(candidate => candidate.choice === selectedChoice));
  applyRemainingBtn.hidden = remainingConflictCount < 1;
  applyRemainingBtn.textContent = '为后续接口都应用此项';
  content.onclick = (event) => {
    const cell = event.target.closest('[data-conflict-index]');
    if (!cell || !content.contains(cell)) return;
    selectCandidate(Number(cell.dataset.conflictIndex));
  };
  content.onchange = (event) => {
    const input = event.target.closest('input[data-index]');
    if (input) selectCandidate(Number(input.dataset.index));
  };
  // 每次打开弹窗时直接绑定本次确认动作，避免依赖 init 的事件绑定时序。
  confirmBtn.onclick = () => {
    if (!selectedChoice) return;
    confirmBtn.disabled = true;
    hideImportConflictModal({ choice: selectedChoice, applyToRemaining: false });
  };
  applyRemainingBtn.onclick = () => {
    if (!selectedChoice) return;
    applyRemainingBtn.disabled = true;
    confirmBtn.disabled = true;
    hideImportConflictModal({ choice: selectedChoice, applyToRemaining: true });
  };
  applyRemainingBtn.disabled = false;
  modal.removeAttribute('hidden');

  return new Promise(resolve => {
    importConflictResolver = resolve;
  });
}

function activateListMode(mode) {
  listMode = mode;
  document.getElementById('tabCapture').classList.toggle('active', mode === 'capture');
  document.getElementById('tabEmo').classList.toggle('active', mode === 'emo');
  document.getElementById('tabEdited').classList.toggle('active', mode === 'edited');
}

function ruleWithConflictOrigin(rule, conflicts) {
  const pageOrigin = conflicts.find(conflict => conflict.mode === 'capture')?.request?.pageOrigin ||
    conflicts.find(conflict => conflict.mode === 'emo')?.rule?.captured?.pageOrigin;
  if (!pageOrigin) return rule;
  return { ...rule, captured: { ...(rule.captured || {}), pageOrigin } };
}

async function applyImportChoice(rule, conflicts, choice, existingImported = false) {
  const selectedConflict = conflicts.find(conflict => conflict.choice === choice) || null;
  const selectedMode = choice === 'edited' ? 'edited' : selectedConflict?.mode;
  const keepEmoRuleId = selectedConflict?.mode === 'emo' ? selectedConflict.rule.id : null;
  const removeRuleIds = conflicts
    .filter(conflict => conflict.mode === 'emo' && conflict.rule.id !== keepEmoRuleId)
    .map(conflict => conflict.rule.id);
  if (existingImported && choice !== 'edited') removeRuleIds.push(rule.id);
  const selectedRule = choice === 'edited'
    ? withSelectedConflictVersion({
        ...ruleWithConflictOrigin(rule, conflicts),
        listSource: 'edited',
        captureConflictResolved: true,
      }, selectedMode)
    : (selectedConflict?.mode === 'emo'
        ? withSelectedConflictVersion(selectedConflict.rule, selectedMode)
        : null);

  const res = await sendMessage({
    type: 'RESOLVE_IMPORT_CONFLICT',
    selectedRule,
    removeRuleIds,
    tabId,
  });
  if (!res.ok) throw new Error(res.error || '保存版本选择失败');

  if (selectedConflict?.mode === 'capture') {
    selectedConflictRequestKeys.add(requestKeyOf(selectedConflict.request));
  }

  if (choice === 'edited') {
    activateListMode('edited');
    await loadData();
    selectedRuleId = rule.id;
    selectedRequest = null;
    selectedRequestKey = null;
  } else if (selectedConflict?.mode === 'emo') {
    activateListMode('emo');
    await loadData();
    selectedRuleId = selectedConflict.rule.id;
    selectedRequest = null;
    selectedRequestKey = null;
  } else {
    activateListMode('capture');
    await loadData();
    selectedRequest = selectedConflict?.request || null;
    selectedRequestKey = requestKeyOf(selectedRequest);
    selectedRuleId = null;
    showPanelNotice('已保留捕获版本；点击保存后才会存入 Emo。');
  }

  selectedDataTab = 'response';
  editorDraftState = null;
  renderList();
  renderEditor();
}

function findCapturedImportConflicts() {
  return (mockRules || []).flatMap(rule => {
    const imported = rule?.imported === true || rule?.captured?.source === 'imported';
    if (!imported || rule?.captureConflictResolved === true || isCaptureRule(rule)) return [];
    if (!requestLog.some(request => sameInterface(rule, request))) return [];
    const conflicts = findImportConflicts(rule);
    return conflicts.length > 0 ? [{ rule, conflicts }] : [];
  });
}

async function maybeShowCapturedImportConflict() {
  if (capturedImportConflictInProgress || importConflictResolver) return;
  const pendingConflicts = findCapturedImportConflicts();
  const pending = pendingConflicts[0];
  if (!pending) {
    capturedConflictChoiceTemplate = null;
    return;
  }

  capturedImportConflictInProgress = true;
  let resolved = false;
  try {
    const candidates = buildConflictCandidates(pending.rule, pending.conflicts);
    let choice = findConflictChoiceByTemplate(candidates, capturedConflictChoiceTemplate);
    if (!choice) {
      const selection = await showImportConflictModal(pending.rule, pending.conflicts, {
        remainingConflictCount: pendingConflicts.length - 1,
      });
      if (!selection) {
        capturedConflictChoiceTemplate = null;
        return;
      }
      choice = selection.choice;
      if (selection.applyToRemaining) {
        capturedConflictChoiceTemplate = createConflictChoiceTemplate(candidates, choice);
      }
    }
    await applyImportChoice(pending.rule, pending.conflicts, choice, true);
    resolved = true;
  } catch (err) {
    capturedConflictChoiceTemplate = null;
    window.alert('处理接口版本冲突失败: ' + (err.message || 'unknown'));
  } finally {
    capturedImportConflictInProgress = false;
    // 同一批捕获可能命中多个已编接口；当前项完成后继续处理下一项。
    if (resolved) setTimeout(() => { void maybeShowCapturedImportConflict(); }, 0);
  }
}

async function handleImportConfirm() {
  const ta = document.getElementById('importTextarea');
  const confirmBtn = document.getElementById('importConfirmBtn');
  const text = ta?.value || '';
  setImportStatus('解析中…', '');

  let rules;
  try {
    rules = buildRulesFromSpec(text);
  } catch (err) {
    setImportStatus('解析失败：' + err.message, 'err');
    return;
  }

  confirmBtn.disabled = true;
  try {
    // 以提交时的最新捕获与规则为准，避免弹窗打开期间新请求造成漏判。
    await loadData({ checkCapturedConflicts: false });

    // 先收集整批冲突选择，用户取消时不会留下已经写入的半批规则。
    const conflictEntries = rules.map(rule => ({ rule, conflicts: findImportConflicts(rule) }));
    const plans = [];
    let choiceTemplate = null;
    for (let index = 0; index < conflictEntries.length; index++) {
      const { rule, conflicts } = conflictEntries[index];
      let choice = 'edited';
      if (conflicts.length > 0) {
        const candidates = buildConflictCandidates(rule, conflicts);
        choice = findConflictChoiceByTemplate(candidates, choiceTemplate);
        if (!choice) {
          setImportStatus(
            `已解析 ${rules.length} 个接口，正在处理冲突 ${index + 1}/${rules.length}：${rule.method} ${displayInterfaceUrl(rule.url)}`,
            '',
          );
          const remainingConflictCount = conflictEntries
            .slice(index + 1)
            .filter(entry => entry.conflicts.length > 0)
            .length;
          const selection = await showImportConflictModal(rule, conflicts, { remainingConflictCount });
          if (!selection) {
            setImportStatus('已取消导入，本批接口均未写入。', '');
            return;
          }
          choice = selection.choice;
          if (selection.applyToRemaining) {
            choiceTemplate = createConflictChoiceTemplate(candidates, choice);
          }
        }
      }
      plans.push({ rule, conflicts, choice });
    }

    const selectedRules = new Map();
    const removeRuleIds = new Set();
    const capturedConflictKeys = new Set();
    plans.forEach(({ rule, conflicts, choice }) => {
      const selectedConflict = conflicts.find(conflict => conflict.choice === choice) || null;
      const keepEmoRuleId = selectedConflict?.mode === 'emo' ? selectedConflict.rule.id : null;
      conflicts.forEach(conflict => {
        if (conflict.mode === 'emo' && conflict.rule.id !== keepEmoRuleId) {
          removeRuleIds.add(conflict.rule.id);
        }
      });
      if (choice === 'edited') {
        let selectedRule = { ...ruleWithConflictOrigin(rule, conflicts), listSource: 'edited' };
        if (conflicts.length > 0) {
          selectedRule.captureConflictResolved = true;
          selectedRule = withSelectedConflictVersion(selectedRule, 'edited');
        }
        selectedRules.set(String(selectedRule.id), selectedRule);
      } else if (selectedConflict?.mode === 'emo') {
        const selectedRule = withSelectedConflictVersion(selectedConflict.rule, 'emo');
        selectedRules.set(String(selectedRule.id), selectedRule);
      } else if (selectedConflict?.mode === 'capture') {
        capturedConflictKeys.add(requestKeyOf(selectedConflict.request));
      }
    });

    setImportStatus(`正在导入 ${rules.length} 个接口…`, '');
    const res = await sendMessage({
      type: 'RESOLVE_IMPORT_CONFLICT',
      selectedRules: [...selectedRules.values()],
      removeRuleIds: [...removeRuleIds],
      tabId,
    });
    if (!res.ok) throw new Error(res.error || '保存失败');

    capturedConflictKeys.forEach(key => selectedConflictRequestKeys.add(key));
    await loadData({ checkCapturedConflicts: false });
    const lastEditedPlan = [...plans].reverse().find(plan => plan.choice === 'edited');
    if (lastEditedPlan) {
      activateListMode('edited');
      selectedRuleId = lastEditedPlan.rule.id;
      selectedRequest = null;
      selectedRequestKey = null;
    } else {
      const lastPlan = plans[plans.length - 1];
      const selectedConflict = lastPlan.conflicts.find(conflict => conflict.choice === lastPlan.choice);
      if (selectedConflict?.mode === 'emo') {
        activateListMode('emo');
        selectedRuleId = selectedConflict.rule.id;
        selectedRequest = null;
        selectedRequestKey = null;
      } else {
        activateListMode('capture');
        selectedRequest = selectedConflict?.request || null;
        selectedRequestKey = requestKeyOf(selectedRequest);
        selectedRuleId = null;
      }
    }
    selectedDataTab = 'response';
    editorDraftState = null;
    renderList();
    renderEditor();
    const capturedChoiceCount = plans.filter(plan => plan.choice === 'capture').length;
    if (capturedChoiceCount > 0) {
      showPanelNotice(
        capturedChoiceCount === 1
          ? '已保留捕获版本；点击保存后才会存入 Emo。'
          : `已保留 ${capturedChoiceCount} 个捕获版本；点击各接口的保存按钮后才会存入 Emo。`,
      );
    }
    hideImportModal();
  } catch (err) {
    setImportStatus('导入失败：' + err.message, 'err');
  } finally {
    confirmBtn.disabled = false;
  }
}

// ── 禁监接口池交互 ──
// 从禁监池移除（放开监听）
async function removeMonitorDisabled(key) {
  const res = await sendMessage({ type: 'REMOVE_MONITOR_DISABLED', key, tabId });
  if (!res.ok) {
    window.alert('放开监听失败: ' + (res.error || 'unknown'));
    return;
  }
  await loadData();
  renderDisableMonitorList();
}

function showDisableMonitorModal() {
  const modal = document.getElementById('disableMonitorModal');
  if (!modal) return;
  modal.removeAttribute('hidden');
  renderDisableMonitorList();
}

function hideDisableMonitorModal() {
  const modal = document.getElementById('disableMonitorModal');
  if (modal) modal.setAttribute('hidden', '');
}

// 渲染禁监列表：解析 key（method + ' ' + url）拆分为 method / url 展示，并支持放开
function renderDisableMonitorList() {
  const container = document.getElementById('disableMonitorList');
  if (!container) return;
  if (!monitorDisabled || monitorDisabled.length === 0) {
    container.innerHTML = '<div class="list-empty">暂无禁监接口</div>';
    return;
  }
  const html = monitorDisabled.map(key => {
    const spaceIdx = key.indexOf(' ');
    const method = spaceIdx > 0 ? key.slice(0, spaceIdx) : '';
    const url = spaceIdx > 0 ? key.slice(spaceIdx + 1) : key;
    return `
      <div class="request-item" data-key="${escapeHtml(key)}">
        <div class="request-row">
          <span class="request-method method-${escapeHtml(method)}">${escapeHtml(method)}</span>
          <span class="request-url" title="${escapeHtml(displayInterfaceUrl(url))}">${escapeHtml(displayInterfaceUrl(url))}</span>
          <button class="request-item-delete" data-key="${escapeHtml(key)}" title="放开监听">×</button>
        </div>
      </div>
    `;
  }).join('');
  container.innerHTML = html;

  // 绑定“放开监听”按钮
  container.querySelectorAll('.request-item-delete').forEach(btn => {
    btn.style.opacity = '1'; // 列表内常驻显示删除按钮
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeMonitorDisabled(btn.dataset.key);
    });
  });
}


async function init() {
  console.log('[Mock Panel] Initializing for tab', tabId);

  // hook 由 manifest 在 document_start 静态安装（保证拦得到所有请求，含早期请求与
  // 缓存原生引用的库）。面板打开时激活记录，实现“仅在控制台打开时捕获”。
  setHookActive(true);

  // 页面导航（刷新 / 跳转）会重置 MAIN world，hook 重装为默认未激活。
  // 监听导航事件，导航后重新激活，使“打开面板 → 刷新页面 → 操作”能正常捕获。
  chrome.devtools.network.onNavigated.addListener(() => {
    console.log('[Mock Panel] Navigation detected, re-activating hook for tab', tabId);
    setHookActive(true);
  });

  // 获取当前项目
  const projectRes = await sendMessage({ type: 'GET_CURRENT_PROJECT' });
  currentProjectId = projectRes.projectId || 'gpt-admin-pre';

  // 获取接口记录和 Mock 规则
  await loadData();

  // 绑定刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadData();
  });

  // 绑定侧栏 tab 切换：捕获 / Emo / 已编
  document.getElementById('tabCapture').addEventListener('click', () => switchListMode('capture'));
  document.getElementById('tabEmo').addEventListener('click', () => switchListMode('emo'));
  document.getElementById('tabEdited').addEventListener('click', () => switchListMode('edited'));

  // 绑定清空按钮：按当前 tab 语义清空
  //  - 捕获：清空 content script 中的请求记录
  //  - Emo / 已编：分别清空对应来源的持久化规则（需二次确认）
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => handleClear());
  }

  // 绑定导入按钮：弹出 OpenAPI / Swagger 导入面板
  const importBtn = document.getElementById('importBtn');
  if (importBtn) {
    importBtn.addEventListener('click', () => showImportModal());
  }
  const importModalClose = document.getElementById('importModalClose');
  if (importModalClose) importModalClose.addEventListener('click', () => hideImportModal());
  const importCancelBtn = document.getElementById('importCancelBtn');
  if (importCancelBtn) importCancelBtn.addEventListener('click', () => hideImportModal());
  const importConfirmBtn = document.getElementById('importConfirmBtn');
  if (importConfirmBtn) importConfirmBtn.addEventListener('click', () => handleImportConfirm());
  const importModal = document.getElementById('importModal');
  if (importModal) {
    importModal.addEventListener('click', (e) => {
      if (e.target === importModal) hideImportModal();
    });
  }

  const importConflictModal = document.getElementById('importConflictModal');
  const importConflictModalClose = document.getElementById('importConflictModalClose');
  const importConflictCancelBtn = document.getElementById('importConflictCancelBtn');
  if (importConflictModalClose) importConflictModalClose.addEventListener('click', () => hideImportConflictModal());
  if (importConflictCancelBtn) importConflictCancelBtn.addEventListener('click', () => hideImportConflictModal());
  if (importConflictModal) {
    importConflictModal.addEventListener('click', (e) => {
      if (e.target === importConflictModal) hideImportConflictModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && importConflictModal && !importConflictModal.hasAttribute('hidden')) {
      hideImportConflictModal();
    } else if (e.key === 'Escape' && importModal && !importModal.hasAttribute('hidden')) {
      hideImportModal();
    }
    if (e.key === 'Escape') {
      const dm = document.getElementById('disableMonitorModal');
      if (dm && !dm.hasAttribute('hidden')) hideDisableMonitorModal();
    }
  });

  // 绑定禁监按钮：弹窗展示被禁监的接口列表，支持放开监听
  const disableMonitorBtn = document.getElementById('disableMonitorBtn');
  if (disableMonitorBtn) {
    disableMonitorBtn.addEventListener('click', () => showDisableMonitorModal());
  }
  const dmModalClose = document.getElementById('disableMonitorModalClose');
  if (dmModalClose) dmModalClose.addEventListener('click', () => hideDisableMonitorModal());
  const dmDoneBtn = document.getElementById('disableMonitorDoneBtn');
  if (dmDoneBtn) dmDoneBtn.addEventListener('click', () => hideDisableMonitorModal());
  const disableMonitorModal = document.getElementById('disableMonitorModal');
  if (disableMonitorModal) {
    disableMonitorModal.addEventListener('click', (e) => {
      if (e.target === disableMonitorModal) hideDisableMonitorModal();
    });
  }

  // 监听来自 content script 的新请求通知
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'REQUEST_LOGGED') {
      // 关闭态编辑器是只读的；真实请求回来后同步刷新原始数据回显。
      loadData().then((applied) => {
        if (!applied) return;
        const ctx = buildContext();
        if (ctx && !isRuleMocked(ctx.existingRule)) renderEditor();
      });
    }
  });
}

// 切换侧栏列表模式
async function switchListMode(mode) {
  if (mode === listMode) return;
  listMode = mode;

  document.getElementById('tabCapture').classList.toggle('active', mode === 'capture');
  document.getElementById('tabEmo').classList.toggle('active', mode === 'emo');
  document.getElementById('tabEdited').classList.toggle('active', mode === 'edited');

  // 切换 tab 时清除选中，回到空态
  selectedRequest = null;
  selectedRequestKey = null;
  selectedRuleId = null;
  selectedDataTab = 'response';
  editorDraftState = null;
  const requestList = document.getElementById('requestList');
  if (requestList) requestList.innerHTML = '<div class="list-empty">刷新中…</div>';
  renderEmptyState();
  await loadData();
  // 快速连续切换时，旧 Tab 的异步加载完成后不能覆盖新 Tab 的选中状态。
  if (mode !== listMode) return;
  selectFirstVisibleItem();
}

// 清空操作（按当前 tab 语义）
async function handleClear() {
  if (listMode === 'capture') {
    await sendMessage({ type: 'CLEAR_REQUEST_LOG', tabId });
    selectedConflictRequestKeys.clear();
    selectedRequest = null;
    selectedRequestKey = null;
    await loadData();
    renderEmptyState();
    return;
  }

  const rulesToClear = rulesForMode(listMode, false);
  if (rulesToClear.length === 0) return;
  const modeLabel = listMode === 'emo' ? 'Emo' : '已编';
  if (!window.confirm(`确定清空全部 ${rulesToClear.length} 条 ${modeLabel} Mock 规则？\n该操作不可恢复，且会立即停止这些接口的拦截。`)) {
    return;
  }
  const res = await sendMessage({ type: 'CLEAR_MOCK_RULES', scope: listMode, tabId });
  if (!res.ok) {
    window.alert('清空失败: ' + (res.error || 'unknown'));
    return;
  }
  selectedRuleId = null;
  await loadData();
  renderEmptyState();
}

// 删除单条 Emo / 已编规则，并清理当前页面中该接口的捕获与规则缓存。
async function handleDeleteRule(ruleId) {
  const rule = mockRules.find(r => r.id === ruleId);
  if (!rule) return;
  const modeLabel = listMode === 'emo' ? 'Emo' : '已编';
  if (!window.confirm(`删除 ${modeLabel} 接口？\n${rule.method} ${displayInterfaceUrl(rule.url)}\n对应的捕获信息与缓存也会一并删除。`)) return;

  const res = await sendMessage({
    type: 'DELETE_MOCK_ENDPOINT',
    ruleId,
    tabId,
    method: rule.method,
    url: rule.url,
  });
  if (!res.ok) {
    window.alert('删除失败: ' + (res.error || 'unknown'));
    return;
  }
  selectedConflictRequestKeys.delete(endpointRequestKey(rule.method, rule.url));
  if (selectedRuleId === ruleId) {
    selectedRuleId = null;
    editorDraftState = null;
    renderEmptyState();
  }
  await loadData();
}

// 删除单条捕获接口，仅清理实时捕获记录，不影响 Emo / 已编中的持久化规则。
async function handleDeleteCapturedRequest(requestId) {
  const request = requestLog.find(r => r.id === requestId);
  if (!request) return;
  if (!window.confirm(`删除捕获接口？\n${request.method} ${displayInterfaceUrl(request.url)}\n仅删除捕获记录，不影响 Emo 和已编中的相同接口。`)) return;

  const res = await sendMessage({
    type: 'DELETE_CAPTURED_REQUEST',
    tabId,
    method: request.method,
    url: request.url,
  });
  if (!res.ok) {
    window.alert('删除失败: ' + (res.error || 'unknown'));
    return;
  }

  selectedConflictRequestKeys.delete(requestKeyOf(request));

  if (selectedRequestKey === requestKeyOf(request)) {
    selectedRequest = null;
    selectedRequestKey = null;
    editorDraftState = null;
    renderEmptyState();
  }
  await loadData();
}

async function loadData({ checkCapturedConflicts = true } = {}) {
  const revision = ++dataLoadRevision;
  const [rulesRes, disRes, logRes] = await Promise.all([
    sendMessage({ type: 'GET_MOCK_RULES', projectId: currentProjectId }),
    sendMessage({ type: 'GET_MONITOR_DISABLED' }),
    sendMessage({ type: 'GET_REQUEST_LOG', tabId }),
  ]);

  // 保存操作或更新的加载已先完成时，旧响应不能再覆盖面板中的新状态。
  if (revision !== dataLoadRevision) return false;

  mockRules = rulesRes.rules || [];
  monitorDisabled = Array.isArray(disRes.disabled) ? disRes.disabled : [];
  requestLog = logRes.requests || [];
  csReady = logRes.csReady !== false; // 未显式标记为 false 则视为就绪

  // 过滤掉禁监接口：已禁监的接口不显示在捕获列表中
  const disabledSet = new Set(monitorDisabled.map(normalizeRequestKey));
  if (disabledSet.size > 0) {
    requestLog = requestLog.filter(r => !disabledSet.has(requestKeyOf(r)));
  }

  // 轮询接口刷新时，requestLog 中记录对象会被替换（id 重新生成）。
  // 若当前有选中请求，按 key 重新解析到最新记录，保持选中态与数据同步；
  // 若对应接口已不在列表（被禁监/清空），则清除选中。
  if (selectedRequestKey) {
    const latest = requestLog.find(r => requestKeyOf(r) === selectedRequestKey);
    selectedRequest = latest || null;
    if (!latest) selectedRequestKey = null;
  }

  // 更新三个 tab 的计数角标。Emo 展示从捕获页保存的规则，已编展示导入/手工规则。
  const capEl = document.getElementById('countCapture');
  if (capEl) capEl.textContent = requestLog.length;
  updateRuleCounts();

  // 禁监按钮角标
  const disBtn = document.getElementById('disableMonitorBtn');
  if (disBtn) {
    const badge = disBtn.querySelector('.toolbar-badge');
    if (badge) {
      badge.textContent = monitorDisabled.length;
      badge.style.display = monitorDisabled.length > 0 ? '' : 'none';
    }
  }

  renderList();
  if (checkCapturedConflicts) void maybeShowCapturedImportConflict();
  return true;
}

function findRuleForRequest(req) {
  if (!mockRules || !req) return null;
  return mockRules.find(rule => ruleMatchesRequest(rule, req)) || null;
}

// 捕获页只能复用已由“保存”创建的 Emo 规则；同接口的已编规则保持独立。
function findEmoRuleForRequest(req, rules = mockRules) {
  if (!Array.isArray(rules) || !req) return null;
  return rules.find(rule => isCaptureRule(rule) && ruleMatchesRequest(rule, req)) || null;
}

function endpointUrl(url) {
  return String(url || '').split('#', 1)[0].split('?', 1)[0];
}

// 仅用于 UI：隐藏协议、域名和端口，保留路径及 Query Parameters。
// 底层 rule.url / request.url 仍保留完整 URL，供严格接口识别与 Mock 匹配使用。
function displayInterfaceUrl(url) {
  const raw = String(url || '').split('#', 1)[0];
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return parsed.pathname + parsed.search;
  } catch (_) {
    if (raw.startsWith('//')) {
      try {
        const parsed = new URL(`https:${raw}`);
        return parsed.pathname + parsed.search;
      } catch (_) {}
    }
    return raw;
  }
}

function endpointRequestKey(method, url) {
  return String(method || '').toUpperCase() + ' ' + endpointUrl(url);
}

function normalizeRequestKey(key) {
  const raw = String(key || '');
  const separator = raw.indexOf(' ');
  return separator > 0
    ? endpointRequestKey(raw.slice(0, separator), raw.slice(separator + 1))
    : raw;
}

// 与页面 hook 保持一致：真实 method + 同接口 URL / 同源 path / wildcard 命中。
// pageOrigin 由 hook 随请求记录上报；旧记录没有该字段时不做 path 匹配，避免跨域误命中。
function ruleMatchesRequest(rule, req) {
  if (!rule || !req || rule.method !== req.method) return false;

  const ruleUrl = rule.url || '';
  const requestUrl = req.url || '';
  if (endpointUrl(ruleUrl) === endpointUrl(requestUrl)) return true;

  if (ruleUrl.startsWith('/') && !/:\/\//.test(ruleUrl)) {
    try {
      if (!req.pageOrigin) return false;
      const parsed = new URL(requestUrl, req.pageOrigin || undefined);
      if (parsed.origin === req.pageOrigin && parsed.pathname === endpointUrl(ruleUrl)) return true;
    } catch (_) {}
  }

  if (!ruleUrl.includes('*')) return false;
  try {
    const pattern = ruleUrl.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + pattern + '$').test(requestUrl);
  } catch (_) {
    return false;
  }
}

// 接口的稳定 key（method + ' ' + 无 query/hash 的 url），与 hook / content script 一致。
// 轮询接口每次捕获会重新生成 id，但 key 不变，故用作禁监与选中判定的唯一标识。
function requestKeyOf(req) {
  if (!req) return '';
  return endpointRequestKey(req.method, req.url);
}

function isCaptureRule(rule) {
  return rule?.listSource === 'emo' || rule?.captured?.source === 'capture';
}

function rulesForMode(mode, excludeDisabled = true) {
  if (mode !== 'emo' && mode !== 'edited') return [];
  const disabledSet = excludeDisabled
    ? new Set(monitorDisabled.map(normalizeRequestKey))
    : null;
  return (mockRules || []).filter((rule) => {
    const belongsToMode = mode === 'emo' ? isCaptureRule(rule) : !isCaptureRule(rule);
    return belongsToMode && (!disabledSet || !disabledSet.has(endpointRequestKey(rule.method, rule.url)));
  });
}

function updateRuleCounts() {
  const emoEl = document.getElementById('countEmo');
  const editedEl = document.getElementById('countEdited');
  if (emoEl) emoEl.textContent = rulesForMode('emo').length;
  if (editedEl) editedEl.textContent = rulesForMode('edited').length;
}

// 按当前 listMode 渲染侧栏列表
function renderList() {
  const container = document.getElementById('requestList');

  if (listMode === 'capture') {
    renderCaptureList(container);
  } else {
    renderRuleList(container, listMode);
  }
}

function renderCaptureList(container) {
  if (!csReady) {
    // content script 未注入（页面在扩展重载前已打开，或 URL 不匹配 manifest）
    container.innerHTML = '<div class="list-empty">未检测到内容脚本，请刷新当前页面后重试</div>';
    return;
  }

  if (!requestLog || requestLog.length === 0) {
    container.innerHTML = '<div class="list-empty">暂无捕获记录<br>在页面中发起请求后将呈现于此</div>';
    return;
  }

  const html = requestLog.map(req => {
    const time = new Date(req.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    // 轮询接口每次捕获都会重新生成 id，按不含请求参数的稳定 key 判定高亮。
    const reqKey = requestKeyOf(req);
    const isActive = selectedRequestKey === reqKey ? ' active' : '';
    const statusOk = req.status >= 200 && req.status < 400;
    const statusClass = req.status === 0 ? '' : (statusOk ? ' ok' : ' err');
    const rule = findRuleForRequest(req);
    const mocked = isRuleMocked(rule) ? '<span class="mocked-tag">MOCK</span>' : '';
    const conflictSelected = selectedConflictRequestKeys.has(reqKey)
      ? selectedConflictVersionIcon()
      : '';
    return `
      <div class="request-item${isActive}" data-id="${escapeHtml(req.id)}">
        <div class="request-row">
          <span class="request-method method-${escapeHtml(req.method)}">${escapeHtml(req.method)}</span>
          <span class="request-url" title="${escapeHtml(displayInterfaceUrl(req.url))}">${escapeHtml(displayInterfaceUrl(req.url))}</span>
          ${conflictSelected}
          ${mocked}
          <button class="request-item-delete" data-request-id="${escapeHtml(req.id)}" title="删除该接口">×</button>
        </div>
        <div class="request-meta">
          <span class="status-dot${statusClass}"></span>
          <span>${req.status || '—'}</span>
          <span>${time}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
  bindItemClicks(container, 'capture');

  container.querySelectorAll('.request-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteCapturedRequest(btn.dataset.requestId);
    });
  });
}

function renderRuleList(container, mode) {
  const isEmo = mode === 'emo';
  const modeLabel = isEmo ? 'Emo' : '已编';
  const emptyHint = isEmo ? '在捕获页保存接口后将持久保留于此' : '导入接口后将持久保留于此';
  const visible = rulesForMode(mode);
  if (visible.length === 0) {
    container.innerHTML = `<div class="list-empty">暂无${modeLabel} Mock<br>${emptyHint}</div>`;
    return;
  }

  // 按 updatedAt 倒序：最近编辑的在前
  const sorted = [...visible].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const html = sorted.map(rule => {
    const isActive = selectedRuleId === rule.id ? ' active' : '';
    const mocked = isRuleMocked(rule) ? '<span class="mocked-tag">MOCK</span>' : '<span class="mocked-tag" style="background:var(--bg-hover);color:var(--text-tertiary)">OFF</span>';
    const conflictSelected = rule.conflictVersionSelected === true
      ? selectedConflictVersionIcon()
      : '';
    const mode = ruleModeLabel(rule);
    const time = rule.updatedAt
      ? new Date(rule.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '—';
    return `
      <div class="request-item${isActive}" data-id="${escapeHtml(rule.id)}">
        <div class="request-row">
          <span class="request-method method-${escapeHtml(rule.method)}">${escapeHtml(rule.method)}</span>
          <span class="request-url" title="${escapeHtml(displayInterfaceUrl(rule.url))}">${escapeHtml(displayInterfaceUrl(rule.url))}</span>
          ${conflictSelected}
          ${mocked}
          <button class="request-item-delete" data-rule-id="${escapeHtml(rule.id)}" title="删除该接口">×</button>
        </div>
        <div class="request-meta">
          <span>${mode}</span>
          <span>·</span>
          <span>${time}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
  bindItemClicks(container, mode);

  // 绑定单条删除按钮
  container.querySelectorAll('.request-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteRule(btn.dataset.ruleId);
    });
  });
}

function bindItemClicks(container, mode) {
  container.querySelectorAll('.request-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      if (mode === 'capture') {
        selectRequest(id);
      } else {
        selectRule(id);
      }
    });
  });
}

function selectFirstVisibleItem() {
  if (listMode === 'capture') {
    const firstRequest = requestLog[0];
    if (firstRequest) {
      selectRequest(firstRequest.id);
      return;
    }
  } else {
    const firstRule = [...rulesForMode(listMode)]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    if (firstRule) {
      selectRule(firstRule.id);
      return;
    }
  }
  renderEmptyState();
}

function selectRequest(id) {
  selectedRequest = requestLog.find(r => r.id === id);
  selectedRuleId = null;
  if (!selectedRequest) return;

  // 记录稳定 key：轮询接口每次捕获会重新生成 id，但接口路径 key 不变，
  // 后续 loadData 刷新列表后据此保持高亮，并重新解析到最新记录以同步编辑器。
  selectedRequestKey = requestKeyOf(selectedRequest);
  selectedDataTab = 'response';
  editorDraftState = null;

  renderList(); // 更新高亮
  renderEditor();
}

function selectRule(id) {
  selectedRuleId = id;
  selectedRequest = null;
  selectedRequestKey = null;
  if (!mockRules.find(r => r.id === id)) return;
  selectedDataTab = 'response';
  editorDraftState = null;

  renderList(); // 更新高亮
  renderEditor();
}

// 构建统一的编辑上下文，屏蔽“捕获请求”与“Emo / 已编规则”的差异
// responsePayload / requestPayload / status 始终为“真实数据”：
//  - 已编模式：取自 rule.captured 快照（导入时生成或捕获态转存时冻结）。
//  - 捕获模式：若该接口已存在规则，优先取自规则的 captured 快照——规则在首次开启
//    拦截时冻结了当时的真实请求/响应，后续即便拦截开启后页面重发请求、hook 上报的
//    responsePayload 变成 mock 数据，快照仍保持原始值，保证关闭拦截时回显真实数据。
//    无规则时回退到捕获记录（selectedRequest）的实时数据。
// 编辑器据此在关闭拦截时回显真实数据；开启拦截时改显对应 mock 数据。
function hasOwn(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function snapshotValue(snapshot, key, fallback) {
  return hasOwn(snapshot, key) ? snapshot[key] : fallback;
}

// Mock 请求会替换捕获列表中的最新记录。content script 会把被替换前的真实记录
// 放进 original；若没有 original，则只有明确标记为非 Mock 的记录才可作为真实数据。
function getOriginalRequestSnapshot(req) {
  if (!req) return null;
  if (!req.mocked) return req;
  if (req.original && typeof req.original === 'object') return req.original;
  return null;
}

function buildContext() {
  if (listMode !== 'capture') {
    const rule = mockRules.find(r => r.id === selectedRuleId);
    if (!rule) return null;
    const cap = rule.captured || null;
    return {
      mode: listMode,
      id: rule.id,
      url: rule.url,
      method: rule.method,
      status: snapshotValue(cap, 'status', 0),
      pageOrigin: snapshotValue(cap, 'pageOrigin', ''),
      responsePayload: snapshotValue(cap, 'responsePayload', null),
      requestPayload: snapshotValue(cap, 'requestPayload', null),
      hasRealSnapshot: !!cap,
      conflictVersionSelected: rule.conflictVersionSelected === true,
      existingRule: rule,
    };
  }

  if (!selectedRequest) return null;
  const rule = findEmoRuleForRequest(selectedRequest);
  const snap = rule && rule.captured ? rule.captured : null;
  const original = getOriginalRequestSnapshot(selectedRequest);
  return {
    mode: 'capture',
    id: selectedRequest.id,
    url: selectedRequest.url,
    method: selectedRequest.method,
    pageOrigin: selectedRequest.pageOrigin || '',
    status: snapshotValue(snap, 'status', snapshotValue(original, 'status', 0)),
    responsePayload: snapshotValue(snap, 'responsePayload', snapshotValue(original, 'responsePayload', null)),
    requestPayload: snapshotValue(snap, 'requestPayload', snapshotValue(original, 'requestPayload', null)),
    hasRealSnapshot: !!snap || !!original,
    conflictVersionSelected: selectedConflictRequestKeys.has(requestKeyOf(selectedRequest)),
    existingRule: rule,
  };
}

function formatJson(data) {
  return JSON.stringify(data ?? null, null, 2);
}

function createEditorDraftState(retainedDraft, draftKey, draftFor) {
  return retainedDraft || {
    key: draftKey,
    drafts: {
      response: draftFor('response'),
      request: draftFor('request'),
    },
    dirtyTabs: new Set(),
    headerDirty: false,
    overrides: {},
    interceptEnabled: undefined,
  };
}

// 关闭态始终即时读取真实数据；开启态读取独立的 Mock 草稿。
// 此函数只决定展示内容，不修改任一数据源。
function editorPayloadText(interceptOn, draftState, draftFor, tab) {
  return interceptOn ? draftState.drafts[tab] : draftFor(tab);
}

// 常见 HTTP 状态码（Mock 响应状态下拉选项）
const MOCK_STATUS_OPTIONS = [
  { code: 200, text: '200 OK' },
  { code: 201, text: '201 Created' },
  { code: 204, text: '204 No Content' },
  { code: 400, text: '400 Bad Request' },
  { code: 401, text: '401 Unauthorized' },
  { code: 403, text: '403 Forbidden' },
  { code: 404, text: '404 Not Found' },
  { code: 422, text: '422 Unprocessable Entity' },
  { code: 500, text: '500 Internal Server Error' },
  { code: 502, text: '502 Bad Gateway' },
  { code: 503, text: '503 Service Unavailable' },
  { code: 504, text: '504 Gateway Timeout' },
];

// 从规则读取双份 Mock 意图 + mock 头部字段，统一兼容旧结构。
// 返回扁平对象，字段始终存在（缺省补默认），供面板按 interceptOn 选择展示 mock / 真实两套数据。
//   responseMock: { enabled, hasMockData, mockData, status }；requestMock: { enabled, hasMockData, mockData }
//   mockMethod / mockUrl: mock 的请求方式与地址（仅展示与持久化，不影响 mock-hook 匹配）
function getMockParts(rule) {
  const base = {
    responseMock: { enabled: false, hasMockData: false, mockData: null, status: 200 },
    requestMock: { enabled: false, hasMockData: false, mockData: null },
    mockMethod: null,
    mockUrl: null,
  };
  if (!rule) return base;

  const rm = rule.responseMock;
  const qm = rule.requestMock;
  if (rm || qm) {
    return {
      responseMock: {
        enabled: !!(rm && rm.enabled),
        hasMockData: !!(rm && (rm.hasMockData !== undefined ? rm.hasMockData : rm.mockData != null)),
        mockData: rm ? rm.mockData : null,
        status: rm && rm.status != null ? Number(rm.status) : 200,
      },
      requestMock: {
        enabled: !!(qm && qm.enabled),
        hasMockData: !!(qm && (qm.hasMockData !== undefined ? qm.hasMockData : qm.mockData != null)),
        mockData: qm ? qm.mockData : null,
      },
      mockMethod: rule.mockMethod || null,
      mockUrl: rule.mockUrl || null,
    };
  }
  // 旧结构兜底：按 mockMode 归属到对应方向，另一方向 mockData 留空（null）。
  // 旧规则仅有一份 mockData，整体归属其 mockMode 指定的方向；另一方向从未编辑过，
  // 故置 null——开启拦截时编辑器再用真实数据兜底，避免把该方向误展示为另一方向的数据。
  // mock Method/URL 用规则顶层值兜底
  const oldEnabled = rule.enabled !== false;
  const oldData = rule.mockData;
  const oldHasMockData = rule.hasMockData !== undefined ? !!rule.hasMockData : oldData != null;
  const oldStatus = rule.status != null ? Number(rule.status) : 200;
  const parts = rule.mockMode === 'request'
    ? {
        responseMock: { enabled: false, hasMockData: false, mockData: null, status: oldStatus },
        requestMock: { enabled: oldEnabled, hasMockData: oldHasMockData, mockData: oldData },
      }
    : {
        responseMock: { enabled: oldEnabled, hasMockData: oldHasMockData, mockData: oldData, status: oldStatus },
        requestMock: { enabled: false, hasMockData: false, mockData: null },
      };
  return { ...parts, mockMethod: rule.method || null, mockUrl: rule.url || null };
}

// 规则是否处于拦截开启态（任一方向 enabled）
function isRuleMocked(rule) {
  return getMockParts(rule).responseMock.enabled || getMockParts(rule).requestMock.enabled;
}

// 规则的拦截模式标签：出参/入参/出+入（用于列表展示）
function ruleModeLabel(rule) {
  const p = getMockParts(rule);
  const r = p.responseMock.enabled;
  const q = p.requestMock.enabled;
  if (r && q) return '出+入';
  if (q) return '入参';
  return '出参';
}

// 空态：未选中任何条目时展示
function renderEmptyState() {
  editorSessionRevision++;
  const content = document.getElementById('content');
  const isEmo = listMode === 'emo';
  const isEdited = listMode === 'edited';
  content.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">
        <svg class="icon icon-lg" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          <line x1="10" y1="10" x2="18" y2="10"></line>
          <line x1="10" y1="14" x2="14" y2="14"></line>
        </svg>
      </div>
      <div class="empty-title">${isEmo ? 'Emo Mock' : (isEdited ? '已编 Mock' : '暂无选中')}</div>
      <div class="empty-hint">${isEmo
        ? '从左侧选择已保存的捕获规则<br>进行 Mock 编排'
        : isEdited
        ? '从左侧选择导入的规则<br>进行 Mock 编排'
        : '从左侧列表选择一条记录<br>进行 Mock 编排'}</div>
    </div>
  `;
}

function renderEditor() {
  const sessionRevision = ++editorSessionRevision;
  const ctx = buildContext();
  if (!ctx) {
    renderEmptyState();
    return;
  }

  const content = document.getElementById('content');
  const existingRule = ctx.existingRule;
  const parts = getMockParts(existingRule);
  const initialTab = selectedDataTab;
  const draftKey = endpointRequestKey(ctx.method, ctx.url);
  const retainedDraft = editorDraftState && editorDraftState.key === draftKey
    ? editorDraftState
    : null;
  // 捕获页开关先进入草稿态，只有点击保存后才写入 Emo 并真正改变拦截规则。
  const persistedInterceptOn = parts.responseMock.enabled || parts.requestMock.enabled;
  const interceptOn = retainedDraft?.interceptEnabled ?? persistedInterceptOn;
  const pendingIntercept = ctx.mode === 'capture' &&
    retainedDraft?.interceptEnabled !== undefined &&
    retainedDraft.interceptEnabled !== persistedInterceptOn;

  // 头部展示值：开启拦截显示 mock 值（可编辑），关闭显示真实值（只读）
  const headerMethod = interceptOn
    ? (retainedDraft?.overrides.method || parts.mockMethod || ctx.method)
    : ctx.method;
  const headerUrl = interceptOn
    ? (retainedDraft?.overrides.url || parts.mockUrl || ctx.url)
    : ctx.url;
  const displayedHeaderUrl = displayInterfaceUrl(headerUrl);
  const statusText = ctx.status || '—';

  const statusOk = ctx.status >= 200 && ctx.status < 400;
  const statusBadgeClass = ctx.status === 0 ? '' : (statusOk ? ' ok' : ' err');

  // 开启拦截后所有接口（含捕获态）均可编辑 Method / URL / Status
  const canEditHeader = interceptOn;

  // 可编辑字段初值：Method / URL / Status
  const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  const methodList = [...new Set([headerMethod, ...METHODS])];
  const methodOptions = methodList
    .map(m => `<option value="${m}"${m === headerMethod ? ' selected' : ''}>${m}</option>`)
    .join('');
  const statusValue = interceptOn
    ? (retainedDraft?.overrides.status || parts.responseMock.status || 200)
    : (ctx.status || 200);
  const statusOptions = MOCK_STATUS_OPTIONS
    .map(o => `<option value="${o.code}"${Number(statusValue) === o.code ? ' selected' : ''}>${escapeHtml(o.text)}</option>`)
    .join('');

  const sourceBadge = ctx.mode === 'emo'
    ? '<span class="badge mocked">Emo</span>'
    : ctx.mode === 'edited'
      ? '<span class="badge mocked">已编</span>'
      : '';

  // 该接口是否已禁监（按 key 判定）
  const ctxKey = endpointRequestKey(ctx.method, ctx.url);
  const monitorDisabledOn = monitorDisabled.some(key => normalizeRequestKey(key) === ctxKey);

  // 头部：开启拦截后 Method/URL/Status 均可编辑；关闭时只读展示真实值
  const headerFields = canEditHeader
    ? `<select class="editor-method-select method-${escapeHtml(headerMethod)}" id="editMethod" title="HTTP 方法">${methodOptions}</select>
       <input class="editor-url-input" id="editUrl" value="${escapeHtml(displayedHeaderUrl)}" title="接口 URL（可编辑）" spellcheck="false" autocomplete="off">
       <select class="editor-status-input" id="editStatus" title="Mock 响应状态码（可编辑）">${statusOptions}</select>`
    : `<span class="editor-header-method method-${escapeHtml(ctx.method)}">${escapeHtml(ctx.method)}</span>
       <span class="editor-header-url" title="${escapeHtml(displayedHeaderUrl)}">${escapeHtml(displayedHeaderUrl)}</span>
       <span class="badge${statusBadgeClass}">${statusText}</span>`;

  const html = `
    <div class="editor">

      <!-- Full-width header（开启拦截后 Method / URL / Status 可编辑；关闭时只读展示真实值）-->
      <div class="editor-header">
        ${headerFields}
        ${sourceBadge}
        ${pendingIntercept
          ? '<span class="badge badge-warn">待保存</span>'
          : (interceptOn ? '<span class="badge mocked">INTERCEPTED</span>' : '')}
        ${monitorDisabledOn ? '<span class="badge badge-warn">禁监中</span>' : ''}
      </div>

      <!-- Left: config -->
      <div class="config-col">
        <div class="section">
          <div class="section-title">Request Info</div>
          <div class="section-body">
            <div class="kv">
              <div class="kv-row"><div class="kv-key">Source</div><div class="kv-val">${ctx.mode === 'emo' ? 'Emo（捕获后持久化）' : ctx.mode === 'edited' ? '已编（本地持久化）' : '捕获（实时请求）'}</div></div>
              <div class="kv-row"><div class="kv-key">URL</div><div class="kv-val" style="word-break:break-all">${escapeHtml(displayInterfaceUrl(ctx.url))}</div></div>
              <div class="kv-row"><div class="kv-key">Method</div><div class="kv-val">${escapeHtml(ctx.method)}</div></div>
              <div class="kv-row"><div class="kv-key">Status</div><div class="kv-val">${statusText}</div></div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Mock Control</div>
          <div class="section-body">
            <div class="intercept-row">
              <label class="switch">
                <input type="checkbox" id="monitorDisableToggle" ${monitorDisabledOn ? 'checked' : ''}>
                <span class="switch-track"><span class="switch-thumb"></span></span>
              </label>
              <span class="intercept-label">${monitorDisabledOn ? '已禁监，不再捕获该接口' : '禁监该接口（停止捕获）'}</span>
            </div>
            <div class="intercept-row">
              <label class="switch">
                <input type="checkbox" id="interceptToggle" ${interceptOn ? 'checked' : ''}>
                <span class="switch-track"><span class="switch-thumb"></span></span>
              </label>
              <span class="intercept-label">${pendingIntercept
                ? (interceptOn ? '保存后开启拦截' : '保存后关闭拦截')
                : (interceptOn ? '拦截已开启' : '已关闭，正常透传')}</span>
            </div>
            <div class="mock-actions">
              <button class="btn btn-secondary" id="generateBtn"${interceptOn ? '' : ' disabled'}>⚡ 生成假数据</button>
              <button class="btn btn-primary" id="saveMockBtn"${interceptOn || pendingIntercept ? '' : ' disabled'}>保存</button>
              <div class="status-msg" id="statusMsg"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: data editor -->
      <div class="data-col">
        <div id="tabContent" class="json-frame">
          <div class="json-frame-bar">
            <div class="mock-data-tabs" id="mockDataTabs">
              <button type="button" class="mock-data-tab${initialTab === 'response' ? ' active' : ''}" data-tab="response">出参</button>
              <button type="button" class="mock-data-tab${initialTab === 'request' ? ' active' : ''}" data-tab="request">入参</button>
            </div>
            <div class="json-frame-title">mock.payload.json</div>
          </div>
          <div id="mockDataEditor" class="json-editor-host"></div>
          <div id="jsonLintStatus" class="json-lint-status"></div>
        </div>
        <div class="hint" id="editorHint">${interceptOn ? '编辑 JSON 数据，或使用生成器快速构造假数据。点击保存后生效。' : '已关闭拦截，展示真实数据。开启拦截后可编辑 Mock 数据。'}</div>
      </div>
    </div>
  `;

  content.innerHTML = html;

  // 初始化 CodeJar 代码编辑器（Prism JSON 高亮）
  // 数据回填规则（核心）：
  //  - 拦截开启：显示对应方向已编辑过的 mockData（responseMock.mockData / requestMock.mockData），
  //    若该方向尚无 mockData 则用真实数据兜底，便于用户在此基础上编辑。
  //  - 拦截关闭：显示真实数据（ctx.responsePayload / ctx.requestPayload），编辑器只读，
  //    保留之前编辑过的 mockData 不动，重新开启时恢复。
  const editorHost = document.getElementById('mockDataEditor');

  // 判定某方向是否“无数据”
  const isEmptyPayload = (val) => {
    if (val == null || val === '' || val === '{}' || val === '[]') return true;
    if (Array.isArray(val)) return val.length === 0;
    return typeof val === 'object' && Object.keys(val).length === 0;
  };
  const realRequestEmpty = isEmptyPayload(ctx.requestPayload);
  const mockRequestEmpty = !parts.requestMock.hasMockData;

  // 出参始终可编辑展示（即便为空也显示 null，便于构造）；入参为空时显示空状态
  const draftFor = (tab) => {
    if (interceptOn) {
      const mockPart = tab === 'response' ? parts.responseMock : parts.requestMock;
      const real = tab === 'response' ? ctx.responsePayload : ctx.requestPayload;
      return formatJson(mockPart.hasMockData ? mockPart.mockData : real);
    }
    return formatJson(tab === 'response' ? ctx.responsePayload : ctx.requestPayload);
  };
  const draftState = createEditorDraftState(retainedDraft, draftKey, draftFor);
  // 关闭开关只改变当前展示内容，不改写 Mock 草稿。否则已保存后清空了 dirtyTabs 的
  // 草稿会在关闭时被真实数据覆盖，下一次开启就无法恢复之前编辑的出参/入参。
  editorDraftState = draftState;
  const editorDrafts = draftState.drafts;

  let activeTab = initialTab;
  let jsonEditor = createJsonEditor(
    editorHost,
    editorPayloadText(interceptOn, draftState, draftFor, activeTab),
  );

  // 关闭拦截时编辑器只读：禁用编辑（CodeJar 通过 contenteditable 生效，置 contentEditable=false）
  if (!interceptOn) {
    const codeEl = editorHost.querySelector('code.language-json');
    if (codeEl) codeEl.contentEditable = 'false';
  }

  // 关闭时只看真实入参；开启时已有 Mock 入参即可编辑展示。
  const requestEmpty = interceptOn
    ? realRequestEmpty && mockRequestEmpty
    : realRequestEmpty;
  function applyRequestEmptyState() {
    const frame = document.getElementById('tabContent');
    if (!frame) return;
    const existingEmpty = frame.querySelector('.data-empty-state');
    if (activeTab === 'request' && requestEmpty) {
      // 隐藏编辑器，显示空状态
      const editorEl = document.getElementById('mockDataEditor');
      const lintEl = document.getElementById('jsonLintStatus');
      if (editorEl) editorEl.style.display = 'none';
      if (lintEl) lintEl.style.display = 'none';
      if (!existingEmpty) {
        const empty = document.createElement('div');
        empty.className = 'data-empty-state';
        empty.innerHTML = '<div class="data-empty-icon">∅</div><div class="data-empty-text">该接口无入参</div>';
        frame.appendChild(empty);
      }
    } else {
      // 恢复编辑器显示，移除空状态
      const editorEl = document.getElementById('mockDataEditor');
      const lintEl = document.getElementById('jsonLintStatus');
      if (editorEl) editorEl.style.display = '';
      if (lintEl) lintEl.style.display = '';
      if (existingEmpty) existingEmpty.remove();
    }
  }

  // Tab 切换只保留面板内草稿，不写入持久化存储。
  const tabBtns = content.querySelectorAll('.mock-data-tab');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const nextTab = btn.dataset.tab;
      if (nextTab === activeTab) return;
      if (interceptOn) {
        editorDrafts[activeTab] = jsonEditor.getText();
      }
      activeTab = nextTab;
      selectedDataTab = nextTab;
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === nextTab));
      jsonEditor.updateCode(editorPayloadText(interceptOn, draftState, draftFor, activeTab));
      if (!interceptOn) {
        const codeEl2 = editorHost.querySelector('code.language-json');
        if (codeEl2) codeEl2.contentEditable = 'false';
      }
      applyRequestEmptyState();
    });
  });

  // 初始若是入参空状态则立即应用
  applyRequestEmptyState();

  // 绑定按钮
  document.getElementById('generateBtn').addEventListener('click', () => {
    const generated = handleGenerateMockData(jsonEditor, activeTab);
    if (generated && interceptOn) {
      editorDrafts[activeTab] = jsonEditor.getText();
      draftState.dirtyTabs.add(activeTab);
    }
  });
  document.getElementById('saveMockBtn').addEventListener('click', () => {
    saveMockRuleDrafts(activeTab, jsonEditor, draftState);
  });

  // 捕获页开关只改变草稿；点击保存后才创建/更新 Emo。Emo / 已编沿用即时开关。
  const toggle = document.getElementById('interceptToggle');
  if (toggle) {
    toggle.addEventListener('change', async () => {
      if (interceptOn) editorDrafts[activeTab] = jsonEditor.getText();
      editorDraftState = draftState;
      toggle.disabled = true;
      await handleToggleIntercept(toggle.checked, draftState);
    });
  }

  // 禁监开关：开启则将该接口加入禁监池（不再捕获/显示），关闭则放开监听
  const monitorToggle = document.getElementById('monitorDisableToggle');
  if (monitorToggle) {
    monitorToggle.addEventListener('change', () => handleToggleMonitorDisable(monitorToggle.checked));
  }

  // Method / URL / Status 只更新草稿，由保存按钮统一提交。
  const editMethod = document.getElementById('editMethod');
  if (editMethod) {
    editMethod.addEventListener('change', () => {
      editMethod.className = 'editor-method-select method-' + editMethod.value;
      draftState.overrides.method = editMethod.value;
      draftState.headerDirty = true;
    });
  }
  const editUrl = document.getElementById('editUrl');
  if (editUrl) {
    editUrl.addEventListener('change', () => {
      draftState.overrides.url = editUrl.value;
      draftState.headerDirty = true;
    });
  }
  const editStatus = document.getElementById('editStatus');
  if (editStatus) {
    editStatus.addEventListener('change', () => {
      draftState.overrides.status = editStatus.value;
      draftState.headerDirty = true;
    });
  }

  // 编辑器输入只更新内存草稿。
  if (interceptOn) {
    editorHost.addEventListener('input', () => {
      if (sessionRevision !== editorSessionRevision) return;
      editorDrafts[activeTab] = jsonEditor.getText();
      draftState.dirtyTabs.add(activeTab);
    });
  }
}

// 解析 JSON 文本中的对象/数组块，用于生成可折叠行范围。
function computeJsonFoldRanges(text) {
  const ranges = new Map();
  const stack = [];
  let line = 0;
  let inString = false;
  let escaped = false;
  const openers = new Set(['{', '[']);
  const closerToOpener = { '}': '{', ']': '[' };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '\n') {
      line++;
      escaped = false;
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (openers.has(ch)) {
      stack.push({ ch, line });
      continue;
    }

    const expectedOpener = closerToOpener[ch];
    if (!expectedOpener || stack.length === 0) continue;

    const opener = stack.pop();
    if (opener.ch !== expectedOpener) continue;

    // 只对跨越 2 行以上的块展示折叠按钮，保留首尾行可见。
    if (line > opener.line + 1) {
      ranges.set(opener.line, line);
    }
  }

  return ranges;
}

function getHiddenFoldLines(foldRanges, foldedStarts) {
  const hiddenLines = new Set();
  foldedStarts.forEach((startLine) => {
    const endLine = foldRanges.get(startLine);
    if (typeof endLine !== 'number') return;
    for (let i = startLine + 1; i < endLine; i++) {
      hiddenLines.add(i);
    }
  });
  return hiddenLines;
}

function getJsonErrorPosition(message) {
  const positionMatch = String(message).match(/position\s+(\d+)/i);
  if (positionMatch) return Number(positionMatch[1]);
  return null;
}

function getLineColumnFromPosition(text, position) {
  const before = text.slice(0, Math.max(0, position));
  const lines = before.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function updateJsonLintStatus(text) {
  const lintEl = document.getElementById('jsonLintStatus');
  const frameEl = document.getElementById('tabContent');
  if (!lintEl || !frameEl) return;

  try {
    JSON.parse(text);
    lintEl.className = 'json-lint-status ok';
    lintEl.textContent = 'JSON 格式正确';
    frameEl.classList.remove('has-lint-error');
  } catch (err) {
    const position = getJsonErrorPosition(err.message);
    const location = position === null ? null : getLineColumnFromPosition(text, position);
    lintEl.className = 'json-lint-status err';
    lintEl.textContent = location
      ? `JSON 格式错误：第 ${location.line} 行，第 ${location.column} 列 · ${err.message}`
      : `JSON 格式错误：${err.message}`;
    frameEl.classList.add('has-lint-error');
  }
}

// 创建 CodeJar 编辑器，返回适配对象 {updateCode, get, set}
function createJsonEditor(host, initialText) {
  const gutter = document.createElement('div');
  gutter.className = 'json-editor-gutter';

  const scroller = document.createElement('div');
  scroller.className = 'json-code-scroller';

  const pre = document.createElement('pre');
  pre.className = 'language-json';

  const code = document.createElement('code');
  code.className = 'language-json';
  code.textContent = initialText;

  pre.appendChild(code);
  scroller.appendChild(pre);
  host.appendChild(gutter);
  host.appendChild(scroller);

  let foldRanges = new Map();
  let foldedStarts = new Set();

  function getEditorText() {
    return code.textContent || '';
  }

  function renderGutter(lines, hiddenLines) {
    gutter.innerHTML = lines.map((_, lineIndex) => {
      const isFoldable = foldRanges.has(lineIndex);
      const isFolded = foldedStarts.has(lineIndex);
      const hiddenClass = hiddenLines.has(lineIndex) ? ' is-fold-hidden' : '';
      const foldButton = isFoldable
        ? `<button type="button" class="json-fold-btn" data-line="${lineIndex}" title="${isFolded ? '展开' : '折叠'}">${isFolded ? '▸' : '▾'}</button>`
        : '<span></span>';

      return `
        <div class="json-gutter-line${hiddenClass}">
          ${foldButton}
          <span class="json-line-no">${lineIndex + 1}</span>
        </div>
      `;
    }).join('');

    gutter.querySelectorAll('.json-fold-btn').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const line = Number(btn.dataset.line);
        if (foldedStarts.has(line)) {
          foldedStarts.delete(line);
        } else {
          foldedStarts.add(line);
        }
        renderEditorChrome();
      });
    });
  }

  function renderCodeLines(lines, hiddenLines) {
    code.innerHTML = lines.map((lineText, lineIndex) => {
      const highlighted = Prism.highlight(lineText, Prism.languages.json, 'json');
      const hiddenClass = hiddenLines.has(lineIndex) ? ' is-fold-hidden' : '';
      const foldedClass = foldedStarts.has(lineIndex) ? ' is-fold-start' : '';
      const endLine = foldRanges.get(lineIndex);
      const foldedCount = foldedStarts.has(lineIndex) && typeof endLine === 'number'
        ? endLine - lineIndex - 1
        : 0;
      const foldLabel = foldedCount > 0 ? ` data-fold-label="… ${foldedCount} 行已折叠"` : '';
      const trailingNewline = lineIndex < lines.length - 1 ? '\n' : '';

      return `<span class="json-code-line${hiddenClass}${foldedClass}"${foldLabel}>${highlighted}${trailingNewline}</span>`;
    }).join('');
  }

  function renderEditorChrome() {
    const text = getEditorText();
    const lines = text.split('\n');

    foldRanges = computeJsonFoldRanges(text);
    foldedStarts = new Set([...foldedStarts].filter((line) => foldRanges.has(line)));

    const hiddenLines = getHiddenFoldLines(foldRanges, foldedStarts);
    renderGutter(lines, hiddenLines);
    renderCodeLines(lines, hiddenLines);
    updateJsonLintStatus(text);
  }

  const jar = CodeJar(code, () => {
    renderEditorChrome();
  }, { tab: '  ' });

  return {
    updateCode: (text) => jar.updateCode(text),
    getText: () => getEditorText(),
    get: () => JSON.parse(getEditorText()),
    set: (data) => jar.updateCode(formatJson(data)),
  };
}

// 读取面板可编辑字段（URL / Method / Status）作为规则覆盖值
function readEditorOverrides() {
  const urlEl = document.getElementById('editUrl');
  const methodEl = document.getElementById('editMethod');
  const statusEl = document.getElementById('editStatus');
  return {
    url: urlEl ? urlEl.value : undefined,
    method: methodEl ? methodEl.value : undefined,
    status: statusEl ? statusEl.value : undefined,
  };
}

// 基于当前编辑上下文构造 Mock 规则（双份模型 + mock 头部字段）。
// 捕获模式保存时附带原始接口快照（status / 请求体 / 响应体）并标记 source:'capture'，
// 使其进入 Emo 而不进“已编”列表；Emo / 已编模式沿用规则上已有的快照。
//
// 数据来源分离（核心，满足“关闭显示真实 / 开启恢复 mock”）：
//   - rule.url / rule.method：真实值，供 mock-hook 匹配命中，始终来自 ctx（捕获/导入值）。
//   - mockMethod / mockUrl / responseMock.status：mock 展示值，与真实头部分开持久化。
//   - responseMock.mockData / requestMock.mockData：各方向 mock 数据，与开关解耦，关闭仅置 enabled=false。
function buildRule(ctx, {
  activeTab,
  mockData,
  mockDataByTab,
  updateMockData = mockData !== undefined,
  enabled,
  url,
  method,
  status,
}) {
  const existing = ctx.existingRule;
  const now = Date.now();

  const imported = !!(existing?.imported) || existing?.captured?.source === 'imported';

  // 继承已有双份数据与 mock 头部字段，保证未编辑方向 / 关闭态不丢失
  const prev = getMockParts(existing);
  let responseMock = { ...prev.responseMock };
  let requestMock = { ...prev.requestMock };
  let mockMethod = prev.mockMethod;
  let mockUrl = prev.mockUrl;

  // 批量草稿用于一次保存出参与入参；updateMockData 则兼容单方向更新。
  if (mockDataByTab) {
    if (hasOwn(mockDataByTab, 'response')) {
      responseMock.mockData = mockDataByTab.response;
      responseMock.hasMockData = true;
    }
    if (hasOwn(mockDataByTab, 'request')) {
      requestMock.mockData = mockDataByTab.request;
      requestMock.hasMockData = true;
    }
  } else if (updateMockData) {
    if (activeTab === 'response') {
      responseMock.mockData = mockData;
      responseMock.hasMockData = true;
    } else {
      requestMock.mockData = mockData;
      requestMock.hasMockData = true;
    }
  }

  // 总开关同步控制两个方向的 enabled（开=都开，关=都关）；mockData 保留不动
  const enabledDefined = enabled !== undefined;
  if (enabledDefined) {
    responseMock.enabled = !!enabled;
    requestMock.enabled = !!enabled;
  }

  // Mock 头部字段与数据由同一个保存操作统一提交。
  if (method) mockMethod = method.toUpperCase();
  if (url !== undefined && url !== null) mockUrl = String(url).trim() || mockUrl;
  if (status !== undefined && status !== '' && status !== null) {
    const s = Number(status);
    if (Number.isFinite(s)) responseMock.status = s;
  }

  if (responseMock.status == null || !Number.isFinite(Number(responseMock.status))) {
    responseMock.status = ctx.status || 200;
  }

  const rule = {
    id: existing ? existing.id : now.toString(),
    url: ctx.url,           // 真实值，供 mock-hook 匹配
    method: ctx.method,     // 真实值，供 mock-hook 匹配
    responseMock,
    requestMock,
    mockMethod,
    mockUrl,
    imported,
    ...(ctx.mode === 'capture'
      ? { listSource: 'emo' }
      : (existing?.listSource ? { listSource: existing.listSource } : {})),
    ...(existing?.captureConflictResolved === true ? { captureConflictResolved: true } : {}),
    ...((existing?.conflictVersionSelected === true || ctx.conflictVersionSelected === true)
      ? {
          conflictVersionSelected: true,
          conflictVersionSource: existing?.conflictVersionSource || (ctx.mode === 'capture' ? 'capture' : ctx.mode),
        }
      : {}),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  // 真实快照只在首次创建规则时冻结。后续保存永不从最新请求日志重写，
  // 因为拦截开启后日志中的 payload/status 可能已经是 Mock 值。
  if (existing && existing.captured) {
    rule.captured = existing.captured;
  } else if (ctx.mode === 'capture' && ctx.hasRealSnapshot) {
    rule.captured = {
      status: ctx.status,
      requestPayload: ctx.requestPayload,
      responsePayload: ctx.responsePayload,
      pageOrigin: ctx.pageOrigin || undefined,
      timestamp: now,
      source: 'capture', // 标记为捕获态规则：不进“已编”列表
    };
  }

  return rule;
}

function findLatestRuleForContext(ctx) {
  const id = ctx.existingRule && ctx.existingRule.id;
  if (id) return mockRules.find(rule => rule.id === id) || ctx.existingRule;
  if (ctx.mode === 'capture') return findEmoRuleForRequest(ctx, mockRules);
  const ctxKey = endpointRequestKey(ctx.method, ctx.url);
  return mockRules.find(rule => endpointRequestKey(rule.method, rule.url) === ctxKey) || null;
}

function upsertLocalMockRule(rule) {
  // 使仍在途中的 loadData 失效，避免旧 GET_MOCK_RULES 响应覆盖刚保存的数据。
  dataLoadRevision++;
  const index = mockRules.findIndex(item => item.id === rule.id);
  if (index >= 0) {
    mockRules[index] = rule;
  } else {
    mockRules.push(rule);
  }
  updateRuleCounts();
}

// 整条规则写入必须按用户操作顺序执行；每个任务在真正执行时读取上一个任务
// 已回写的本地规则，确保编辑出参后再编辑入参不会互相覆盖。
function persistMockRule(ctx, paramsOrFactory) {
  const contextSnapshot = { ...ctx };
  const task = mockRuleSaveQueue.then(async () => {
    const latestContext = {
      ...contextSnapshot,
      existingRule: findLatestRuleForContext(contextSnapshot),
    };
    const params = typeof paramsOrFactory === 'function'
      ? paramsOrFactory(latestContext)
      : paramsOrFactory;
    const rule = buildRule(latestContext, params);
    const result = await sendMessage({ type: 'ADD_MOCK_RULE', rule, tabId });
    if (!result.ok) throw new Error(result.error || 'Save failed');
    upsertLocalMockRule(rule);
    return rule;
  });

  mockRuleSaveQueue = task.catch(() => {});
  return task;
}

// 显式保存本次编辑的 Mock 草稿。两个 Tab 均有修改时会一次写入，
// 未修改数据但调整了 Method / URL / Status 时只更新头部字段。
async function saveMockRuleDrafts(activeTab, jsonEditor, draftState) {
  const statusEl = document.getElementById('statusMsg');
  const saveBtn = document.getElementById('saveMockBtn');
  try {
    const ctx = buildContext();
    if (!ctx) throw new Error('未选中接口');

    if (saveBtn) saveBtn.disabled = true;
    const enabled = document.getElementById('interceptToggle')?.checked ?? false;
    // 关闭态编辑器展示的是真实数据，不能用它覆盖保留在草稿中的 Mock 数据。
    if (jsonEditor && enabled) draftState.drafts[activeTab] = jsonEditor.getText();

    const tabsToSave = draftState.dirtyTabs.size > 0
      ? [...draftState.dirtyTabs]
      : (draftState.headerDirty ? [] : [activeTab]);
    const parsedDrafts = parseMockDraftTabs(draftState, tabsToSave);

    const overrides = { ...draftState.overrides, ...readEditorOverrides() };
    const rule = await persistMockRule(ctx, {
      activeTab,
      mockDataByTab: tabsToSave.length > 0 ? parsedDrafts : undefined,
      updateMockData: false,
      enabled,
      ...overrides,
    });

    if (ctx.mode !== 'capture') {
      selectedRuleId = rule.id;
    }
    renderList();

    draftState.dirtyTabs.clear();
    draftState.headerDirty = false;
    draftState.overrides = {};
    draftState.interceptEnabled = undefined;
    editorDraftState = draftState;

    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = '已保存，刷新页面后生效';
      setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'status-msg'; }, 2000);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'status-msg show err';
      statusEl.textContent = '保存失败: ' + err.message;
    }
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

function parseMockDraftTabs(draftState, tabs) {
  const parsed = {};
  for (const tab of tabs) {
    try {
      parsed[tab] = JSON.parse(draftState.drafts[tab]);
    } catch (parseErr) {
      const label = tab === 'response' ? '出参' : '入参';
      throw new Error(`${label} JSON 格式错误: ${parseErr.message}`);
    }
  }
  return parsed;
}

// 禁监开关：开启则将该接口加入禁监池（不再捕获与显示），关闭则从池中移除（放开监听）
async function handleToggleMonitorDisable(enabled) {
  const statusEl = document.getElementById('statusMsg');
  try {
    const ctx = buildContext();
    if (!ctx) throw new Error('未选中接口');
    const key = endpointRequestKey(ctx.method, ctx.url);

    if (enabled) {
      const res = await sendMessage({ type: 'ADD_MONITOR_DISABLED', entry: key, tabId });
      if (!res.ok) throw new Error(res.error || 'failed');
      // 禁监的正是当前选中接口：清除选中（接口将不再显示在捕获 / Emo / 已编列表）
      selectedRequest = null;
      selectedRequestKey = null;
      selectedRuleId = null;
    } else {
      const res = await sendMessage({ type: 'REMOVE_MONITOR_DISABLED', key, tabId });
      if (!res.ok) throw new Error(res.error || 'failed');
    }

    await loadData();
    if (enabled) {
      // 接口已被移出列表，回空态
      renderEmptyState();
    } else {
      renderEditor();
    }

    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = enabled ? '已禁监该接口，不再捕获' : '已放开监听，恢复捕获';
      setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'status-msg'; }, 2000);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'status-msg show err';
      statusEl.textContent = '操作失败: ' + err.message;
    }
    // 失败时回滚开关视觉态
    const t = document.getElementById('monitorDisableToggle');
    if (t) t.checked = !enabled;
  }
}

function shouldPersistInterceptToggle(ctx) {
  return ctx?.mode !== 'capture';
}

// 捕获页开关只切换本地编辑草稿，保存按钮是创建/更新 Emo 的唯一入口。
// Emo / 已编中的既有规则仍即时同步开关状态。
async function handleToggleIntercept(enabled, draftState = null) {
  const statusEl = document.getElementById('statusMsg');
  try {
    const ctx = buildContext();
    if (!ctx) throw new Error('未选中接口');

    if (!shouldPersistInterceptToggle(ctx)) {
      if (draftState) {
        draftState.interceptEnabled = enabled;
        editorDraftState = draftState;
      }
      renderEditor();
      const nextStatusEl = document.getElementById('statusMsg');
      if (nextStatusEl) {
        nextStatusEl.className = 'status-msg show ok';
        nextStatusEl.textContent = enabled ? '已开启编辑，点击保存后生效' : '已关闭编辑，点击保存后生效';
      }
      return;
    }

    const dirtyTabs = draftState ? [...draftState.dirtyTabs] : [];
    const mockDataByTab = draftState ? parseMockDraftTabs(draftState, dirtyTabs) : undefined;
    const overrides = draftState?.headerDirty
      ? { ...draftState.overrides, ...readEditorOverrides() }
      : {};

    await persistMockRule(ctx, {
      activeTab: selectedDataTab,
      mockDataByTab: dirtyTabs.length > 0 ? mockDataByTab : undefined,
      updateMockData: false,
      enabled,
      ...overrides,
    });

    if (draftState) {
      draftState.dirtyTabs.clear();
      draftState.headerDirty = false;
      draftState.overrides = {};
    }

    renderList();
    renderEditor();
    const nextStatusEl = document.getElementById('statusMsg');
    if (nextStatusEl) {
      nextStatusEl.className = 'status-msg show ok';
      nextStatusEl.textContent = enabled ? '已开启拦截，刷新页面生效' : '已关闭拦截，恢复正常请求';
      setTimeout(() => {
        nextStatusEl.textContent = '';
        nextStatusEl.className = 'status-msg';
      }, 2000);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'status-msg show err';
      statusEl.textContent = '操作失败: ' + err.message;
    }
    // 失败时回滚开关视觉态
    const t = document.getElementById('interceptToggle');
    if (t) {
      t.checked = !enabled;
      t.disabled = false;
    }
  }
}

// 生成假数据：作用于当前 active tab 方向，基于该方向真实数据推断 Schema。
// 生成后只写入编辑器草稿，用户点击保存后才持久化。
function handleGenerateMockData(jsonEditor, activeTab) {
  const statusEl = document.getElementById('statusMsg');

  try {
    const ctx = buildContext();
    if (!ctx) throw new Error('未选中接口');

    // 获取当前方向真实数据并推断 Schema
    const data = activeTab === 'response' ? ctx.responsePayload : ctx.requestPayload;
    const schema = inferSchema(data);

    // 生成假数据
    const fakeData = generateMockData(schema);

    // 更新编辑器
    if (jsonEditor) jsonEditor.set(fakeData);

    statusEl.className = 'status-msg show ok';
    statusEl.textContent = '假数据已生成，请点击保存';

    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-msg';
    }, 2000);
    return true;
  } catch (err) {
    statusEl.className = 'status-msg show err';
    statusEl.textContent = '生成失败: ' + err.message;
    return false;
  }
}

// ===== 侧栏拖拽与响应式布局 =====
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const NARROW_THRESHOLD = 560;

function initLayout() {
  const app = document.getElementById('app');
  const sidebar = document.getElementById('sidebar');
  const resizer = document.getElementById('resizer');

  // 恢复记忆的侧栏宽度
  const savedW = parseInt(localStorage.getItem('idt-sidebar-w'), 10);
  if (savedW >= SIDEBAR_MIN && savedW <= SIDEBAR_MAX) {
    setSidebarWidth(savedW);
  }

  // 拖拽改宽度：用增量计算，避免 padding/gap 导致把手与光标错位
  let dragging = false;
  let dragStartX = 0;
  let dragStartW = 0;
  resizer.addEventListener('mousedown', (e) => {
    dragging = true;
    dragStartX = e.clientX;
    dragStartW = sidebar.offsetWidth;
    resizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    setSidebarWidth(dragStartW + (e.clientX - dragStartX));
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem('idt-sidebar-w', sidebar.offsetWidth);
  });

  // 窄宽切换：面板总宽 < 阈值时侧栏折叠为顶部条
  const ro = new ResizeObserver(() => {
    const narrow = app.clientWidth < NARROW_THRESHOLD;
    app.dataset.layout = narrow ? 'narrow' : 'wide';
  });
  ro.observe(app);
}

function setSidebarWidth(w) {
  const clamped = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w));
  document.documentElement.style.setProperty('--sidebar-w', clamped + 'px');
}

// 启动
init().catch(err => {
  console.error('[Mock Panel] Init failed:', err);
});
initLayout();

// 面板关闭（DevTools 关闭或切换到其它面板）时关闭 hook 记录，
// 保持“仅在控制台打开时捕获”的语义：面板不在则不记录。
// 注意：panel iframe 卸载时 unload 触发，此时 background 仍可接收消息。
window.addEventListener('unload', () => {
  try {
    chrome.runtime.sendMessage({ type: 'SET_HOOK_ACTIVE', tabId, active: false }, () => {
      void chrome.runtime?.lastError;
    });
  } catch (_) {}
});
