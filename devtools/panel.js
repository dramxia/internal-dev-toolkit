/* 内部开发工具箱 — DevTools Panel 逻辑 */

const tabId = chrome.devtools.inspectedWindow.tabId;
let currentProjectId = null;
let mockRules = [];
let requestLog = [];
let selectedRequest = null; // 捕获列表中选中的请求记录
let selectedRequestKey = null; // 选中请求的稳定 key（method + ' ' + url），用于轮询场景下保持高亮
let selectedRuleId = null;  // 已编列表中选中的规则 id
let listMode = 'capture';   // 'capture' | 'edited'，默认捕获
let csReady = true; // content script 是否在当前标签页就绪
let monitorDisabled = []; // 被禁监的接口 key（method + ' ' + url）数组，按项目持久化

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
  return jsyaml.load(trimmed);
}

// 解析 $ref（仅支持文档内引用 #/...）
function resolveRef(spec, ref) {
  if (!ref || typeof ref !== 'string' || ref[0] !== '#') return null;
  let cur = spec;
  for (const seg of ref.slice(1).split('/').filter(Boolean)) {
    cur = cur?.[seg];
    if (cur == null) return null;
  }
  return cur;
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

// 从 OpenAPI spec 提取首个接口（path + method）
function extractEndpoint(spec) {
  if (!spec || !spec.paths) throw new Error('未找到 paths，不是合法的 OpenAPI/Swagger 文档');
  const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
  for (const path of Object.keys(spec.paths)) {
    const pathItem = spec.paths[path];
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of Object.keys(pathItem)) {
      if (!HTTP_METHODS.includes(method.toLowerCase())) continue;
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object') continue;
      return { path, method: method.toUpperCase(), operation };
    }
  }
  throw new Error('未找到可导入的接口（paths 内无 HTTP 方法）');
}

// 取响应体 schema
function getResponseSchema(spec, operation) {
  const responses = operation.responses || {};
  const okKey = Object.keys(responses).find(k => /^(2\d\d|200)$/.test(String(k))) || Object.keys(responses)[0];
  const resp = responses[okKey];
  return resp?.content?.['application/json']?.schema || null;
}

// 取请求体 schema
function getRequestSchema(spec, operation) {
  return operation.requestBody?.content?.['application/json']?.schema || null;
}

// 拼接完整 URL（servers[0].url + path）
function buildEndpointUrl(spec, path) {
  const server = (spec.servers && spec.servers[0] && spec.servers[0].url) || '';
  return server.replace(/\/+$/, '') + path;
}

// 导入接口的 URL：仅取 spec 的路径部分（含上下文路径，如 /ai-reading/），不携带域名。
// 域名在拦截时默认使用当前页面域名（见 mock-hook findMatchingRule 的路径匹配）。
function buildImportUrl(spec, path) {
  const fullSpecUrl = buildEndpointUrl(spec, path);
  try {
    return new URL(fullSpecUrl).pathname;
  } catch (_) {
    return path; // spec 无 server（相对路径）时，直接用 path
  }
}

// 解析 + 生成 + 构造 Mock 规则
function buildRuleFromSpec(text) {
  const spec = parseOpenApiSpec(text);
  const { path, method, operation } = extractEndpoint(spec);
  const url = buildImportUrl(spec, path); // 仅路径，不携带域名

  const responseSchema = getResponseSchema(spec, operation);
  const requestSchema = getRequestSchema(spec, operation);
  if (!responseSchema) {
    throw new Error(`接口 ${method} ${path} 未定义 200 响应体，无法生成 Mock`);
  }

  const responseMock = schemaToMock(spec, responseSchema);
  const requestMock = requestSchema ? schemaToMock(spec, requestSchema) : null;

  const now = Date.now();
  return {
    id: now.toString(),
    url,
    method,
    mockMode: 'response',
    mockData: responseMock,
    enabled: true,
    imported: true,
    status: 200,
    createdAt: now,
    updatedAt: now,
    captured: {
      status: 200,
      requestPayload: requestMock,
      responsePayload: responseMock,
      timestamp: now,
      source: 'imported',
      summary: operation.summary || '',
    },
  };
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

async function handleImportConfirm() {
  const ta = document.getElementById('importTextarea');
  const confirmBtn = document.getElementById('importConfirmBtn');
  const text = ta?.value || '';
  setImportStatus('解析中…', '');

  let rule;
  try {
    rule = buildRuleFromSpec(text);
  } catch (err) {
    setImportStatus('解析失败：' + err.message, 'err');
    return;
  }

  confirmBtn.disabled = true;
  try {
    const res = await sendMessage({ type: 'ADD_MOCK_RULE', rule, tabId });
    if (!res.ok) throw new Error(res.error || '保存失败');

    // 切换到“已编”并选中刚导入的规则
    listMode = 'edited';
    document.getElementById('tabCapture').classList.remove('active');
    document.getElementById('tabEdited').classList.add('active');
    const ta2 = document.getElementById('toolbarActions');
    if (ta2) ta2.setAttribute('hidden', '');

    await loadData();
    selectedRuleId = rule.id;
    selectedRequest = null;
    selectedRequestKey = null;
    renderList();
    renderEditor();

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
          <span class="request-url" title="${escapeHtml(url)}">${escapeHtml(url)}</span>
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

  // 绑定侧栏 tab 切换：捕获 / 已编
  document.getElementById('tabCapture').addEventListener('click', () => switchListMode('capture'));
  document.getElementById('tabEdited').addEventListener('click', () => switchListMode('edited'));

  // 绑定清空按钮：按当前 tab 语义清空
  //  - 捕获：清空 content script 中的请求记录
  //  - 已编：清空当前项目所有已保存的 Mock 规则（手动清空，需二次确认）
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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && importModal && !importModal.hasAttribute('hidden')) {
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
      // 新请求到达，刷新数据（仅在捕获 tab 下需要重渲染列表）
      loadData();
    }
  });
}

// 切换侧栏列表模式
function switchListMode(mode) {
  if (mode === listMode) return;
  listMode = mode;

  document.getElementById('tabCapture').classList.toggle('active', mode === 'capture');
  document.getElementById('tabEdited').classList.toggle('active', mode === 'edited');

  // 刷新/清空按钮仅在“捕获”tab 下出现
  const toolbarActions = document.getElementById('toolbarActions');
  if (toolbarActions) {
    if (mode === 'capture') {
      toolbarActions.removeAttribute('hidden');
    } else {
      toolbarActions.setAttribute('hidden', '');
    }
  }

  // 切换 tab 时清除选中，回到空态
  selectedRequest = null;
  selectedRequestKey = null;
  selectedRuleId = null;
  renderList();
  renderEmptyState();
}

// 清空操作（按当前 tab 语义）
async function handleClear() {
  if (listMode === 'capture') {
    await sendMessage({ type: 'CLEAR_REQUEST_LOG', tabId });
    selectedRequest = null;
    selectedRequestKey = null;
    await loadData();
    renderEmptyState();
    return;
  }

  // 已编：清空全部已保存 Mock 规则
  if (!mockRules || mockRules.length === 0) return;
  if (!window.confirm(`确定清空全部 ${mockRules.length} 条已编 Mock 规则？\n该操作不可恢复，且会立即停止所有拦截。`)) {
    return;
  }
  const res = await sendMessage({ type: 'CLEAR_MOCK_RULES', tabId });
  if (!res.ok) {
    window.alert('清空失败: ' + (res.error || 'unknown'));
    return;
  }
  selectedRuleId = null;
  await loadData();
  renderEmptyState();
}

// 删除单条已编规则
async function handleDeleteRule(ruleId) {
  const rule = mockRules.find(r => r.id === ruleId);
  if (!rule) return;
  if (!window.confirm(`删除已编规则？\n${rule.method} ${rule.url}`)) return;

  const res = await sendMessage({ type: 'DELETE_MOCK_RULE', ruleId, tabId });
  if (!res.ok) {
    window.alert('删除失败: ' + (res.error || 'unknown'));
    return;
  }
  if (selectedRuleId === ruleId) {
    selectedRuleId = null;
    renderEmptyState();
  }
  await loadData();
}

async function loadData() {
  // 获取 Mock 规则（“已编”列表数据源，按项目持久化）
  const rulesRes = await sendMessage({ type: 'GET_MOCK_RULES', projectId: currentProjectId });
  mockRules = rulesRes.rules || [];

  // 获取禁监接口池（按项目持久化）
  const disRes = await sendMessage({ type: 'GET_MONITOR_DISABLED' });
  monitorDisabled = Array.isArray(disRes.disabled) ? disRes.disabled : [];

  // 获取接口记录（“捕获”列表数据源，来自 content script 内存）
  const logRes = await sendMessage({ type: 'GET_REQUEST_LOG', tabId });
  requestLog = logRes.requests || [];
  csReady = logRes.csReady !== false; // 未显式标记为 false 则视为就绪

  // 过滤掉禁监接口：已禁监的接口不显示在捕获列表中
  const disabledSet = new Set(monitorDisabled);
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

  // 更新两个 tab 的计数角标（已编计数仅含用户主动添加的接口，排除捕获态规则与已禁监接口）
  const capEl = document.getElementById('countCapture');
  const edEl = document.getElementById('countEdited');
  if (capEl) capEl.textContent = requestLog.length;
  const visibleEdited = mockRules.filter(r =>
    r.captured?.source !== 'capture' &&
    !disabledSet.has(r.method + ' ' + r.url)
  );
  if (edEl) edEl.textContent = visibleEdited.length;

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
}

function findRuleForRequest(req) {
  if (!mockRules || !req) return null;
  return mockRules.find(r => r.url === req.url && r.method === req.method) || null;
}

// 接口的稳定 key（method + ' ' + url），与 hook / content script 中的去重 key 一致。
// 轮询接口每次捕获会重新生成 id，但 key 不变，故用作禁监与选中判定的唯一标识。
function requestKeyOf(req) {
  if (!req) return '';
  return req.key || (req.method + ' ' + req.url);
}

// 按当前 listMode 渲染侧栏列表
function renderList() {
  const container = document.getElementById('requestList');

  if (listMode === 'capture') {
    renderCaptureList(container);
  } else {
    renderEditedList(container);
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
    // 轮询接口每次捕获都会重新生成 id，故按稳定 key（method + ' ' + url）判定高亮
    const reqKey = req.key || (req.method + ' ' + req.url);
    const isActive = selectedRequestKey === reqKey ? ' active' : '';
    const statusOk = req.status >= 200 && req.status < 400;
    const statusClass = req.status === 0 ? '' : (statusOk ? ' ok' : ' err');
    const rule = findRuleForRequest(req);
    const mocked = isRuleMocked(rule) ? '<span class="mocked-tag">MOCK</span>' : '';
    return `
      <div class="request-item${isActive}" data-id="${escapeHtml(req.id)}">
        <div class="request-row">
          <span class="request-method method-${escapeHtml(req.method)}">${escapeHtml(req.method)}</span>
          <span class="request-url" title="${escapeHtml(req.url)}">${escapeHtml(req.url)}</span>
          ${mocked}
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
}

function renderEditedList(container) {
  if (!mockRules || mockRules.length === 0) {
    container.innerHTML = '<div class="list-empty">暂无已编 Mock<br>保存规则后将持久保留于此</div>';
    return;
  }

  // “已编”列表仅展示用户主动添加（导入）的接口：
  // 排除捕获态规则（captured.source === 'capture'，由捕获 tab 开启 mock 生成）与已禁监接口
  const disabledSet = new Set(monitorDisabled);
  const visible = mockRules.filter(r =>
    r.captured?.source !== 'capture' &&
    !disabledSet.has(r.method + ' ' + r.url)
  );
  if (visible.length === 0) {
    container.innerHTML = '<div class="list-empty">暂无已编 Mock<br>保存规则后将持久保留于此</div>';
    return;
  }

  // 按 updatedAt 倒序：最近编辑的在前
  const sorted = [...visible].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const html = sorted.map(rule => {
    const isActive = selectedRuleId === rule.id ? ' active' : '';
    const mocked = isRuleMocked(rule) ? '<span class="mocked-tag">MOCK</span>' : '<span class="mocked-tag" style="background:var(--bg-hover);color:var(--text-tertiary)">OFF</span>';
    const mode = ruleModeLabel(rule);
    const time = rule.updatedAt
      ? new Date(rule.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '—';
    return `
      <div class="request-item${isActive}" data-id="${escapeHtml(rule.id)}">
        <div class="request-row">
          <span class="request-method method-${escapeHtml(rule.method)}">${escapeHtml(rule.method)}</span>
          <span class="request-url" title="${escapeHtml(rule.url)}">${escapeHtml(rule.url)}</span>
          ${mocked}
          <button class="request-item-delete" data-rule-id="${escapeHtml(rule.id)}" title="删除该规则">×</button>
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
  bindItemClicks(container, 'edited');

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

function selectRequest(id) {
  selectedRequest = requestLog.find(r => r.id === id);
  selectedRuleId = null;
  if (!selectedRequest) return;

  // 记录稳定 key：轮询接口每次捕获会重新生成 id，但 key（method+url）不变，
  // 后续 loadData 刷新列表后据此保持高亮，并重新解析到最新记录以同步编辑器。
  selectedRequestKey = selectedRequest.key || (selectedRequest.method + ' ' + selectedRequest.url);

  renderList(); // 更新高亮
  renderEditor();
}

function selectRule(id) {
  selectedRuleId = id;
  selectedRequest = null;
  selectedRequestKey = null;
  if (!mockRules.find(r => r.id === id)) return;

  renderList(); // 更新高亮
  renderEditor();
}

// 构建统一的编辑上下文，屏蔽“捕获请求”与“已编规则”的差异
// responsePayload / requestPayload / status 始终为“真实数据”：
//  - 已编模式：取自 rule.captured 快照（导入时生成或捕获态转存时冻结）。
//  - 捕获模式：若该接口已存在规则，优先取自规则的 captured 快照——规则在首次开启
//    拦截时冻结了当时的真实请求/响应，后续即便拦截开启后页面重发请求、hook 上报的
//    responsePayload 变成 mock 数据，快照仍保持原始值，保证关闭拦截时回显真实数据。
//    无规则时回退到捕获记录（selectedRequest）的实时数据。
// 编辑器据此在关闭拦截时回显真实数据；开启拦截时改显对应 mock 数据。
function buildContext() {
  if (listMode === 'edited') {
    const rule = mockRules.find(r => r.id === selectedRuleId);
    if (!rule) return null;
    const cap = rule.captured || {};
    return {
      mode: 'edited',
      id: rule.id,
      url: rule.url,
      method: rule.method,
      status: cap.status ?? 0,
      responsePayload: cap.responsePayload ?? null,
      requestPayload: cap.requestPayload ?? null,
      existingRule: rule,
    };
  }

  if (!selectedRequest) return null;
  const rule = findRuleForRequest(selectedRequest);
  // 命中规则且规则带有 captured 快照：用快照作为“真实数据”，避免 hook 上报被 mock
  // 数据覆盖后污染；否则回退到捕获记录的实时数据。
  const snap = rule && rule.captured ? rule.captured : null;
  return {
    mode: 'capture',
    id: selectedRequest.id,
    url: selectedRequest.url,
    method: selectedRequest.method,
    status: snap ? (snap.status ?? selectedRequest.status) : selectedRequest.status,
    responsePayload: snap ? (snap.responsePayload ?? selectedRequest.responsePayload) : selectedRequest.responsePayload,
    requestPayload: snap ? (snap.requestPayload ?? selectedRequest.requestPayload) : selectedRequest.requestPayload,
    existingRule: rule,
  };
}

function formatJson(data) {
  return JSON.stringify(data ?? null, null, 2);
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
//   responseMock: { enabled, mockData, status }；requestMock: { enabled, mockData }
//   mockMethod / mockUrl: mock 的请求方式与地址（仅展示与持久化，不影响 mock-hook 匹配）
function getMockParts(rule) {
  const base = {
    responseMock: { enabled: false, mockData: null, status: 200 },
    requestMock: { enabled: false, mockData: null },
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
        mockData: rm ? rm.mockData : null,
        status: rm && rm.status != null ? Number(rm.status) : 200,
      },
      requestMock: {
        enabled: !!(qm && qm.enabled),
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
  const oldStatus = rule.status != null ? Number(rule.status) : 200;
  const parts = rule.mockMode === 'request'
    ? {
        responseMock: { enabled: false, mockData: null, status: oldStatus },
        requestMock: { enabled: oldEnabled, mockData: oldData },
      }
    : {
        responseMock: { enabled: oldEnabled, mockData: oldData, status: oldStatus },
        requestMock: { enabled: false, mockData: null },
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
  const content = document.getElementById('content');
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
      <div class="empty-title">${isEdited ? '已编 Mock' : '暂无选中'}</div>
      <div class="empty-hint">${isEdited
        ? '从左侧选择规则进行编辑<br>或保存捕获的接口至此'
        : '从左侧列表选择一条记录<br>进行 Mock 编排'}</div>
    </div>
  `;
}

function renderEditor() {
  const ctx = buildContext();
  if (!ctx) {
    renderEmptyState();
    return;
  }

  const content = document.getElementById('content');
  const existingRule = ctx.existingRule;
  const parts = getMockParts(existingRule);
  // 总开关：任一方向开启即视为拦截开启
  const interceptOn = parts.responseMock.enabled || parts.requestMock.enabled;

  // 头部展示值：开启拦截显示 mock 值（可编辑），关闭显示真实值（只读）
  const headerMethod = interceptOn ? (parts.mockMethod || ctx.method) : ctx.method;
  const headerUrl = interceptOn ? (parts.mockUrl || ctx.url) : ctx.url;
  const headerStatus = interceptOn ? (parts.responseMock.status || ctx.status || 200) : (ctx.status || '—');
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
  const statusValue = interceptOn ? (parts.responseMock.status || 200) : (ctx.status || 200);
  const statusOptions = MOCK_STATUS_OPTIONS
    .map(o => `<option value="${o.code}"${Number(statusValue) === o.code ? ' selected' : ''}>${escapeHtml(o.text)}</option>`)
    .join('');

  // 已编 tab 下提示来源；捕获 tab 下提示正常
  const sourceBadge = ctx.mode === 'edited'
    ? '<span class="badge mocked">已编</span>'
    : '';

  // 该接口是否已禁监（按 key 判定）
  const ctxKey = ctx.method + ' ' + ctx.url;
  const monitorDisabledOn = monitorDisabled.includes(ctxKey);

  // 头部：开启拦截后 Method/URL/Status 均可编辑；关闭时只读展示真实值
  const headerFields = canEditHeader
    ? `<select class="editor-method-select method-${escapeHtml(headerMethod)}" id="editMethod" title="HTTP 方法">${methodOptions}</select>
       <input class="editor-url-input" id="editUrl" value="${escapeHtml(headerUrl)}" title="接口 URL（可编辑）" spellcheck="false" autocomplete="off">
       <select class="editor-status-input" id="editStatus" title="Mock 响应状态码（可编辑）">${statusOptions}</select>`
    : `<span class="editor-header-method method-${escapeHtml(ctx.method)}">${escapeHtml(ctx.method)}</span>
       <span class="editor-header-url" title="${escapeHtml(ctx.url)}">${escapeHtml(ctx.url)}</span>
       <span class="badge${statusBadgeClass}">${statusText}</span>`;

  const html = `
    <div class="editor">

      <!-- Full-width header（开启拦截后 Method / URL / Status 可编辑；关闭时只读展示真实值）-->
      <div class="editor-header">
        ${headerFields}
        ${sourceBadge}
        ${interceptOn ? '<span class="badge mocked">INTERCEPTED</span>' : ''}
        ${monitorDisabledOn ? '<span class="badge badge-warn">禁监中</span>' : ''}
      </div>

      <!-- Left: config -->
      <div class="config-col">
        <div class="section">
          <div class="section-title">Request Info</div>
          <div class="section-body">
            <div class="kv">
              <div class="kv-row"><div class="kv-key">Source</div><div class="kv-val">${ctx.mode === 'edited' ? '已编（本地持久化）' : '捕获（实时请求）'}</div></div>
              <div class="kv-row"><div class="kv-key">URL</div><div class="kv-val" style="word-break:break-all">${escapeHtml(ctx.url)}</div></div>
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
              <span class="intercept-label">${interceptOn ? '拦截已开启' : '已关闭，正常透传'}</span>
            </div>
            <div class="mock-actions">
              <button class="btn btn-secondary" id="generateBtn">⚡ 生成假数据</button>
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
              <button type="button" class="mock-data-tab active" data-tab="response">出参</button>
              <button type="button" class="mock-data-tab" data-tab="request">入参</button>
            </div>
            <div class="json-frame-title">mock.payload.json</div>
          </div>
          <div id="mockDataEditor" class="json-editor-host"></div>
          <div id="jsonLintStatus" class="json-lint-status"></div>
        </div>
        <div class="hint" id="editorHint">${interceptOn ? '编辑 JSON 数据，或使用生成器快速构造假数据。改动将自动保存。' : '已关闭拦截，展示真实数据。开启拦截后可编辑 Mock 数据。'}</div>
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
  const initialTab = 'response';

  // 判定某方向是否“无数据”：真实 payload 与 mockData 均为空
  const isEmptyPayload = (val) => val == null || val === '' || val === '{}' || val === '[]';
  const realRequestEmpty = isEmptyPayload(ctx.requestPayload);
  const mockRequestEmpty = isEmptyPayload(parts.requestMock.mockData);

  // 出参始终可编辑展示（即便为空也显示 null，便于构造）；入参为空时显示空状态
  const draftFor = (tab) => {
    if (interceptOn) {
      const md = tab === 'response' ? parts.responseMock.mockData : parts.requestMock.mockData;
      const real = tab === 'response' ? ctx.responsePayload : ctx.requestPayload;
      return formatJson(md != null ? md : real);
    }
    return formatJson(tab === 'response' ? ctx.responsePayload : ctx.requestPayload);
  };
  const editorDrafts = {
    response: draftFor('response'),
    request: draftFor('request'),
  };

  let activeTab = initialTab;
  let jsonEditor = createJsonEditor(editorHost, editorDrafts[activeTab]);

  // 关闭拦截时编辑器只读：禁用编辑（CodeJar 通过 contenteditable 生效，置 contentEditable=false）
  if (!interceptOn) {
    const codeEl = editorHost.querySelector('code.language-json');
    if (codeEl) codeEl.contentEditable = 'false';
  }

  // 入参空状态：真实入参与 mock 入参均为空时，切到入参 Tab 显示空状态提示
  const requestEmpty = realRequestEmpty && mockRequestEmpty;
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

  // 出参/入参 Tab 切换：先把当前 Tab 草稿落盘（拦截开启时），再切到目标 Tab。
  // 这样两个方向的 mockData 始终同步到规则，重渲染（如切开关）不丢数据。
  const tabBtns = content.querySelectorAll('.mock-data-tab');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const nextTab = btn.dataset.tab;
      if (nextTab === activeTab) return;
      // 拦截开启时，离开当前 Tab 前先静默保存其草稿，避免切换/重渲染丢失
      if (interceptOn) {
        editorDrafts[activeTab] = jsonEditor.getText();
        await autoSaveMockRule(activeTab, jsonEditor, { silent: true });
      }
      activeTab = nextTab;
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === nextTab));
      jsonEditor.updateCode(editorDrafts[activeTab]);
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
  document.getElementById('generateBtn').addEventListener('click', () => handleGenerateMockData(jsonEditor, activeTab));

  // 拦截开关：实时保存 enabled 状态，无需点保存
  const toggle = document.getElementById('interceptToggle');
  if (toggle) {
    toggle.addEventListener('change', () => handleToggleIntercept(toggle.checked, jsonEditor, activeTab));
  }

  // 禁监开关：开启则将该接口加入禁监池（不再捕获/显示），关闭则放开监听
  const monitorToggle = document.getElementById('monitorDisableToggle');
  if (monitorToggle) {
    monitorToggle.addEventListener('change', () => handleToggleMonitorDisable(monitorToggle.checked));
  }

  // Method / URL / Status 可编辑：变更立即保存
  const editMethod = document.getElementById('editMethod');
  if (editMethod) {
    editMethod.addEventListener('change', () => {
      editMethod.className = 'editor-method-select method-' + editMethod.value;
      autoSaveMockRule(activeTab, jsonEditor);
    });
  }
  const editUrl = document.getElementById('editUrl');
  if (editUrl) {
    editUrl.addEventListener('change', () => {
      autoSaveMockRule(activeTab, jsonEditor);
    });
  }
  const editStatus = document.getElementById('editStatus');
  if (editStatus) {
    editStatus.addEventListener('change', () => {
      autoSaveMockRule(activeTab, jsonEditor);
    });
  }

  // 拦截开启时：编辑器内容变化自动保存（debounce ~500ms，且仅合法 JSON）
  if (interceptOn) {
    let saveTimer = null;
    editorHost.addEventListener('input', () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        autoSaveMockRule(activeTab, jsonEditor, { silent: true });
      }, 500);
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
// 使其不进“已编”列表（已编列表仅展示导入接口）；已编模式沿用规则上已有的快照。
//
// 数据来源分离（核心，满足“关闭显示真实 / 开启恢复 mock”）：
//   - rule.url / rule.method：真实值，供 mock-hook 匹配命中，始终来自 ctx（捕获/导入值）。
//   - mockMethod / mockUrl / responseMock.status：mock 展示值，开启拦截时由面板字段写入，
//     关闭拦截时沿用既有值（不覆盖），保证重开可复原。
//   - responseMock.mockData / requestMock.mockData：各方向 mock 数据，与开关解耦，关闭仅置 enabled=false。
function buildRule(ctx, { activeTab, mockData, enabled, url, method, status }) {
  const existing = ctx.existingRule;
  const now = Date.now();

  const imported = !!(existing?.imported) || existing?.captured?.source === 'imported';

  // 继承已有双份数据与 mock 头部字段，保证未编辑方向 / 关闭态不丢失
  const prev = getMockParts(existing);
  let responseMock = { ...prev.responseMock };
  let requestMock = { ...prev.requestMock };
  let mockMethod = prev.mockMethod;
  let mockUrl = prev.mockUrl;

  // 用当前编辑器内容更新 activeTab 方向的 mockData。
  // mockData 为 null/undefined 时保留既有值（如关闭拦截时不覆盖已编辑数据）。
  if (mockData != null) {
    if (activeTab === 'response') {
      responseMock.mockData = mockData;
    } else {
      requestMock.mockData = mockData;
    }
  }

  // 总开关同步控制两个方向的 enabled（开=都开，关=都关）；mockData 保留不动
  const enabledDefined = enabled !== undefined;
  if (enabledDefined) {
    responseMock.enabled = !!enabled;
    requestMock.enabled = !!enabled;
  }

  // mock 头部字段：仅在“开启拦截”时用面板字段更新；关闭时保留既有值不覆盖
  const turningOn = enabledDefined && enabled;
  if (turningOn) {
    if (method) mockMethod = method.toUpperCase();
    if (url) mockUrl = String(url).trim() || mockUrl;
    if (status !== undefined && status !== '' && status !== null) {
      const s = Number(status);
      if (Number.isFinite(s)) responseMock.status = s;
    }
  }
  // status 兜底：开启但面板未给值时，沿用既有 status，否则用真实 status
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
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  if (ctx.mode === 'capture') {
    rule.captured = {
      status: ctx.status,
      requestPayload: ctx.requestPayload,
      responsePayload: ctx.responsePayload,
      timestamp: now,
      source: 'capture', // 标记为捕获态规则：不进“已编”列表
    };
  } else if (existing && existing.captured) {
    rule.captured = existing.captured;
  }

  return rule;
}

// 实时自动保存：由编辑器 input（debounce）、开关/状态/Method 切换触发。
// silent=true 时不在 UI 上提示成功（避免输入过程中频繁闪烁），仅失败时提示。
async function autoSaveMockRule(activeTab, jsonEditor, opts = {}) {
  const statusEl = document.getElementById('statusMsg');
  try {
    const ctx = buildContext();
    if (!ctx) throw new Error('未选中接口');

    let mockData;
    try {
      mockData = jsonEditor ? jsonEditor.get() : null;
    } catch (parseErr) {
      // JSON 非法时不保存，但也不报红（编辑中途常见），仅更新 lint 状态由编辑器自身处理
      return;
    }

    const enabled = document.getElementById('interceptToggle')?.checked ?? false;
    const rule = buildRule(ctx, {
      activeTab,
      mockData,
      enabled,
      ...readEditorOverrides(),
    });

    const result = await sendMessage({ type: 'ADD_MOCK_RULE', rule, tabId });
    if (!result.ok) throw new Error(result.error || 'Save failed');

    if (ctx.mode === 'edited') {
      selectedRuleId = rule.id;
    }

    if (!opts.silent && statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = '已自动保存，刷新页面后生效';
      setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'status-msg'; }, 2000);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'status-msg show err';
      statusEl.textContent = '保存失败: ' + err.message;
    }
  }
}

// 禁监开关：开启则将该接口加入禁监池（不再捕获与显示），关闭则从池中移除（放开监听）
async function handleToggleMonitorDisable(enabled) {
  const statusEl = document.getElementById('statusMsg');
  try {
    const ctx = buildContext();
    if (!ctx) throw new Error('未选中接口');
    const key = ctx.method + ' ' + ctx.url;

    if (enabled) {
      const res = await sendMessage({ type: 'ADD_MONITOR_DISABLED', entry: key, tabId });
      if (!res.ok) throw new Error(res.error || 'failed');
      // 禁监的正是当前选中接口：清除选中（接口将不再显示在捕获/已编列表）
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

// 拦截总开关：开启/关闭时同步两个方向的 enabled，但 mockData 始终保留不动，
// 保证“关闭→重开”能恢复之前编辑过的出参/入参 mock 数据。
async function handleToggleIntercept(enabled, jsonEditor, activeTab) {
  const statusEl = document.getElementById('statusMsg');
  try {
    const ctx = buildContext();
    if (!ctx) throw new Error('未选中接口');

    // 开启时：若当前方向尚无 mockData，用编辑器当前内容（真实数据兜底）初始化，
    // 避免开启拦截后 mockData 为空导致拦截不生效。
    let mockData;
    if (enabled) {
      try {
        mockData = jsonEditor ? jsonEditor.get() : null;
      } catch (_) {
        mockData = null;
      }
    }

    const rule = buildRule(ctx, {
      activeTab,
      mockData,
      enabled,
      ...readEditorOverrides(),
    });

    const result = await sendMessage({ type: 'ADD_MOCK_RULE', rule, tabId });
    if (!result.ok) throw new Error(result.error || 'failed');

    if (statusEl) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = enabled ? '已开启拦截，刷新页面生效' : '已关闭拦截，恢复正常请求';
      setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'status-msg'; }, 2000);
    }
    await loadData();
    renderEditor();
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'status-msg show err';
      statusEl.textContent = '操作失败: ' + err.message;
    }
    // 失败时回滚开关视觉态
    const t = document.getElementById('interceptToggle');
    if (t) t.checked = !enabled;
  }
}

// 生成假数据：作用于当前 active tab 方向，基于该方向真实数据推断 Schema。
// 生成后立即写入编辑器并自动保存（拦截开启时）。
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

    // 拦截开启时立即自动保存生成的数据
    const interceptOn = document.getElementById('interceptToggle')?.checked;
    if (interceptOn) {
      autoSaveMockRule(activeTab, jsonEditor, { silent: true });
    }

    statusEl.className = 'status-msg show ok';
    statusEl.textContent = '假数据已生成';

    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-msg';
    }, 2000);
  } catch (err) {
    statusEl.className = 'status-msg show err';
    statusEl.textContent = '生成失败: ' + err.message;
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
