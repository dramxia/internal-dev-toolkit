/* 内部开发工具箱 — DevTools Panel 逻辑 */

const tabId = chrome.devtools.inspectedWindow.tabId;
let currentProjectId = null;
let mockRules = [];
let requestLog = [];
let selectedRequest = null; // 捕获列表中选中的请求记录
let selectedRuleId = null;  // 已编列表中选中的规则 id
let listMode = 'capture';   // 'capture' | 'edited'，默认捕获
let csReady = true; // content script 是否在当前标签页就绪

// 工具函数
function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      resolve(response || {});
    });
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
    renderList();
    renderEditor();

    hideImportModal();
  } catch (err) {
    setImportStatus('导入失败：' + err.message, 'err');
  } finally {
    confirmBtn.disabled = false;
  }
}


async function init() {
  console.log('[Mock Panel] Initializing for tab', tabId);

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
  });

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
  selectedRuleId = null;
  renderList();
  renderEmptyState();
}

// 清空操作（按当前 tab 语义）
async function handleClear() {
  if (listMode === 'capture') {
    await sendMessage({ type: 'CLEAR_REQUEST_LOG', tabId });
    selectedRequest = null;
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

  // 获取接口记录（“捕获”列表数据源，来自 content script 内存）
  const logRes = await sendMessage({ type: 'GET_REQUEST_LOG', tabId });
  requestLog = logRes.requests || [];
  csReady = logRes.csReady !== false; // 未显式标记为 false 则视为就绪

  // 更新两个 tab 的计数角标
  const capEl = document.getElementById('countCapture');
  const edEl = document.getElementById('countEdited');
  if (capEl) capEl.textContent = requestLog.length;
  if (edEl) edEl.textContent = mockRules.length;

  renderList();
}

function findRuleForRequest(req) {
  if (!mockRules || !req) return null;
  return mockRules.find(r => r.url === req.url && r.method === req.method) || null;
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
    const isActive = selectedRequest?.id === req.id ? ' active' : '';
    const statusOk = req.status >= 200 && req.status < 400;
    const statusClass = req.status === 0 ? '' : (statusOk ? ' ok' : ' err');
    const rule = findRuleForRequest(req);
    const mocked = rule && rule.enabled ? '<span class="mocked-tag">MOCK</span>' : '';
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

  // 按 updatedAt 倒序：最近编辑的在前
  const sorted = [...mockRules].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const html = sorted.map(rule => {
    const isActive = selectedRuleId === rule.id ? ' active' : '';
    const mocked = rule.enabled ? '<span class="mocked-tag">MOCK</span>' : '<span class="mocked-tag" style="background:var(--bg-hover);color:var(--text-tertiary)">OFF</span>';
    const mode = rule.mockMode === 'request' ? '入参' : '出参';
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

  renderList(); // 更新高亮
  renderEditor();
}

function selectRule(id) {
  selectedRuleId = id;
  selectedRequest = null;
  if (!mockRules.find(r => r.id === id)) return;

  renderList(); // 更新高亮
  renderEditor();
}

// 构建统一的编辑上下文，屏蔽“捕获请求”与“已编规则”的差异
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
      status: rule.status ?? cap.status ?? 0,
      responsePayload: cap.responsePayload ?? rule.mockData,
      requestPayload: cap.requestPayload ?? rule.mockData,
      existingRule: rule,
    };
  }

  if (!selectedRequest) return null;
  return {
    mode: 'capture',
    id: selectedRequest.id,
    url: selectedRequest.url,
    method: selectedRequest.method,
    status: selectedRequest.status,
    responsePayload: selectedRequest.responsePayload,
    requestPayload: selectedRequest.requestPayload,
    existingRule: findRuleForRequest(selectedRequest),
  };
}

function formatJson(data) {
  return JSON.stringify(data ?? null, null, 2);
}

// 空态：未选中任何条目时展示
function renderEmptyState() {
  const content = document.getElementById('content');
  const isEdited = listMode === 'edited';
  content.innerHTML = `
    <div class="empty-state">
      <div class="es-particles">
        <span class="es-p"></span><span class="es-p"></span><span class="es-p"></span><span class="es-p"></span>
        <span class="es-p"></span><span class="es-p"></span><span class="es-p"></span><span class="es-p"></span>
      </div>
      <div class="empty-state-icon">
        <svg width="30" height="30" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 18c2.7-2.7 6.3-4 10-4s7.3 1.3 10 4"/>
          <path d="M8.5 22c1.5-1.5 3.5-2.2 5.5-2.2s4 .7 5.5 2.2"/>
          <circle cx="14" cy="25" r="1.2" fill="currentColor" stroke="none"/>
          <path d="M1 14C5 10 9.3 8 14 8s9 2 13 6" opacity="0.4"/>
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
  const interceptOn = existingRule && existingRule.enabled;
  const statusText = ctx.status || '—';
  const initialTab = existingRule?.mockMode === 'request' ? 'request' : 'response';

  const statusOk = ctx.status >= 200 && ctx.status < 400;
  const statusBadgeClass = ctx.status === 0 ? '' : (statusOk ? ' ok' : ' err');

  // 仅“导入”接口允许编辑 URL / Method / Status
  const isImported = existingRule?.imported === true || existingRule?.captured?.source === 'imported';

  // 可编辑字段初值：URL / Method / Status（仅导入接口使用）
  const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  const methodList = [...new Set([ctx.method, ...METHODS])];
  const methodOptions = methodList
    .map(m => `<option value="${m}"${m === ctx.method ? ' selected' : ''}>${m}</option>`)
    .join('');
  const statusValue = existingRule?.status != null ? existingRule.status : (ctx.status || 200);

  // 已编 tab 下提示来源；捕获 tab 下提示正常
  const sourceBadge = ctx.mode === 'edited'
    ? '<span class="badge mocked">已编</span>'
    : '';

  // 头部：导入接口可编辑，其余只读
  const headerFields = isImported
    ? `<select class="editor-method-select method-${escapeHtml(ctx.method)}" id="editMethod" title="HTTP 方法">${methodOptions}</select>
       <input class="editor-url-input" id="editUrl" value="${escapeHtml(ctx.url)}" title="接口 URL（可编辑）" spellcheck="false" autocomplete="off">
       <input class="editor-status-input${statusBadgeClass}" type="number" id="editStatus" value="${statusValue}" title="Mock 响应状态码（可编辑）">`
    : `<span class="editor-header-method method-${escapeHtml(ctx.method)}">${escapeHtml(ctx.method)}</span>
       <span class="editor-header-url" title="${escapeHtml(ctx.url)}">${escapeHtml(ctx.url)}</span>
       <span class="badge${statusBadgeClass}">${statusText}</span>`;

  const html = `
    <div class="editor">

      <!-- Full-width header（仅导入接口的 URL / Method / Status 可编辑）-->
      <div class="editor-header">
        ${headerFields}
        ${sourceBadge}
        ${interceptOn ? '<span class="badge mocked">INTERCEPTED</span>' : ''}
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
                <input type="checkbox" id="interceptToggle" ${interceptOn ? 'checked' : ''}>
                <span class="switch-track"><span class="switch-thumb"></span></span>
              </label>
              <span class="intercept-label">${interceptOn ? '拦截已开启' : '已关闭，正常透传'}</span>
            </div>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="mockMode" value="response" ${(!existingRule || existingRule.mockMode === 'response') ? 'checked' : ''}>
                <span>Mock 出参（返回假数据）</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="mockMode" value="request" ${existingRule?.mockMode === 'request' ? 'checked' : ''}>
                <span>Mock 入参（发送假请求）</span>
              </label>
            </div>
            <div class="mock-actions">
              <button class="btn btn-secondary" id="generateBtn">⚡ 生成假数据</button>
              <button class="btn btn-primary" id="saveBtn">保存 Mock 规则</button>
              <div class="status-msg" id="statusMsg"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: data editor -->
      <div class="data-col">
        <div id="tabContent" class="json-frame">
          <div class="json-frame-bar">
            <div class="json-window-dots"><span></span><span></span><span></span></div>
            <div class="json-frame-title">mock.payload.json</div>
          </div>
          <div id="mockDataEditor" class="json-editor-host"></div>
          <div id="jsonLintStatus" class="json-lint-status"></div>
        </div>
        <div class="hint">编辑 JSON 数据，或使用生成器快速构造假数据。保存后将持久化至“已编”。</div>
      </div>
    </div>
  `;

  content.innerHTML = html;

  // 初始化 CodeJar 代码编辑器（Prism JSON 高亮）
  // 有已保存规则时优先回填 mockData，否则使用接口原始请求/响应数据。
  const editorHost = document.getElementById('mockDataEditor');
  const editorDrafts = {
    response: formatJson(ctx.responsePayload),
    request: formatJson(ctx.requestPayload),
  };
  if (existingRule) {
    editorDrafts[initialTab] = formatJson(existingRule.mockData);
  }

  let activeTab = initialTab;
  let jsonEditor = createJsonEditor(editorHost, editorDrafts[activeTab]);

  // 数据编排内容随 Mock 控制台的 mockMode（出参/入参）切换：先保存当前草稿，再恢复目标草稿，避免未保存编辑丢失。
  content.querySelectorAll('input[name="mockMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const nextTab = radio.value;
      if (nextTab === activeTab) return;

      editorDrafts[activeTab] = jsonEditor.getText();
      activeTab = nextTab;
      jsonEditor.updateCode(editorDrafts[activeTab]);
    });
  });

  // 绑定按钮
  document.getElementById('generateBtn').addEventListener('click', () => handleGenerateMockData(jsonEditor));
  document.getElementById('saveBtn').addEventListener('click', () => handleSaveMockRule(jsonEditor));

  // 拦截开关：实时保存 enabled 状态，无需点保存
  const toggle = document.getElementById('interceptToggle');
  if (toggle) {
    toggle.addEventListener('change', () => handleToggleIntercept(toggle.checked, jsonEditor));
  }

  // Method / Status 可编辑：实时更新样式（颜色随值变化）
  const editMethod = document.getElementById('editMethod');
  if (editMethod) {
    editMethod.addEventListener('change', () => {
      editMethod.className = 'editor-method-select method-' + editMethod.value;
    });
  }
  const editStatus = document.getElementById('editStatus');
  if (editStatus) {
    editStatus.addEventListener('input', () => {
      const s = Number(editStatus.value);
      const ok = s >= 200 && s < 400;
      editStatus.className = 'editor-status-input' + (s === 0 ? '' : (ok ? ' ok' : ' err'));
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

// 基于当前编辑上下文构造 Mock 规则
// 捕获模式保存时附带原始接口快照（status / 请求体 / 响应体），便于“已编”回看与对比；
// 已编模式则沿用规则上已有的快照。
// 仅“导入”接口（imported=true）的 url/method/status 可编辑；status 作为顶层字段决定 Mock 响应状态码。
function buildRule(ctx, { mockMode, mockData, enabled, url, method, status }) {
  const existing = ctx.existingRule;
  const now = Date.now();

  const imported = !!(existing?.imported) || existing?.captured?.source === 'imported';

  const finalUrl = (url && String(url).trim()) || ctx.url;
  const finalMethod = (method || ctx.method).toUpperCase();

  const rule = {
    id: existing ? existing.id : now.toString(),
    url: finalUrl,
    method: finalMethod,
    mockMode,
    mockData,
    enabled,
    imported,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  // 仅导入接口保存可编辑的 status；非导入规则不写 status（mock-hook 默认 200，保持原行为）
  if (imported) {
    let s = (status !== undefined && status !== '' && status !== null) ? Number(status) : (existing?.status ?? 200);
    if (!Number.isFinite(s)) s = 200;
    rule.status = s;
  }

  if (ctx.mode === 'capture') {
    rule.captured = {
      status: ctx.status,
      requestPayload: ctx.requestPayload,
      responsePayload: ctx.responsePayload,
      timestamp: now,
    };
  } else if (existing && existing.captured) {
    rule.captured = existing.captured;
  }

  return rule;
}

async function handleToggleIntercept(enabled, jsonEditor) {
  const statusEl = document.getElementById('statusMsg');
  try {
    const ctx = buildContext();
    if (!ctx) throw new Error('未选中接口');

    const mockMode = document.querySelector('input[name="mockMode"]:checked').value;
    let mockData;
    try {
      mockData = jsonEditor ? jsonEditor.get() : (ctx.existingRule?.mockData ?? ctx.responsePayload);
    } catch (_) {
      mockData = ctx.existingRule?.mockData ?? ctx.responsePayload;
    }

    const rule = buildRule(ctx, {
      mockMode,
      mockData: ctx.existingRule ? ctx.existingRule.mockData : mockData,
      enabled,
      ...readEditorOverrides(),
    });

    const result = await sendMessage({ type: 'ADD_MOCK_RULE', rule, tabId });
    if (!result.ok) throw new Error(result.error || 'failed');

    // 更新开关文案
    const label = document.querySelector('.intercept-label');
    if (label) label.textContent = `拦截该接口${enabled ? '（已开启）' : '（已关闭，正常请求）'}`;

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
  }
}

function handleGenerateMockData(jsonEditor) {
  const statusEl = document.getElementById('statusMsg');

  try {
    const ctx = buildContext();
    if (!ctx) throw new Error('未选中接口');

    const activeTab = document.querySelector('input[name="mockMode"]:checked').value;

    // 获取当前数据并推断 Schema
    const data = activeTab === 'response' ? ctx.responsePayload : ctx.requestPayload;
    const schema = inferSchema(data);

    // 生成假数据
    const fakeData = generateMockData(schema);

    // 更新编辑器
    if (jsonEditor) jsonEditor.set(fakeData);

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

async function handleSaveMockRule(jsonEditor) {
  const statusEl = document.getElementById('statusMsg');

  try {
    const ctx = buildContext();
    if (!ctx) throw new Error('未选中接口');

    const mockMode = document.querySelector('input[name="mockMode"]:checked').value;
    let mockData;
    try {
      mockData = jsonEditor ? jsonEditor.get() : (ctx.existingRule?.mockData ?? ctx.responsePayload);
    } catch (parseErr) {
      throw new Error('JSON 格式错误: ' + parseErr.message);
    }

    const rule = buildRule(ctx, {
      mockMode,
      mockData,
      enabled: document.getElementById('interceptToggle')?.checked ?? true,
      ...readEditorOverrides(),
    });

    const result = await sendMessage({
      type: 'ADD_MOCK_RULE',
      rule,
      tabId,
    });

    if (!result.ok) {
      throw new Error(result.error || 'Save failed');
    }

    // 保存后，已编模式下锁定选中到该规则，便于继续编辑
    if (ctx.mode === 'edited') {
      selectedRuleId = rule.id;
    }

    statusEl.className = 'status-msg show ok';
    statusEl.textContent = '已保存至“已编”，刷新页面后生效';

    // 重新加载规则列表
    await loadData();
    renderEditor();

    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-msg';
    }, 3000);

  } catch (err) {
    statusEl.className = 'status-msg show err';
    statusEl.textContent = '保存失败: ' + err.message;
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
