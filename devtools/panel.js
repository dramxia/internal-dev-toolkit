/* 内部开发工具箱 — DevTools Panel 逻辑 */

const tabId = chrome.devtools.inspectedWindow.tabId;
let currentProjectId = null;
let mockRules = [];
let requestLog = [];
let selectedRequest = null;
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

// 初始化
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

  // 绑定清空按钮：清空 content script 中的请求记录并刷新列表
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      await sendMessage({ type: 'CLEAR_REQUEST_LOG', tabId });
      selectedRequest = null;
      await loadData();
    });
  }

  // 监听来自 content script 的新请求通知
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'REQUEST_LOGGED') {
      // 新请求到达，刷新列表
      loadData();
    }
  });
}

async function loadData() {
  // 获取 Mock 规则
  const rulesRes = await sendMessage({ type: 'GET_MOCK_RULES', projectId: currentProjectId });
  mockRules = rulesRes.rules || [];

  // 获取接口记录
  const logRes = await sendMessage({ type: 'GET_REQUEST_LOG', tabId });
  requestLog = logRes.requests || [];
  csReady = logRes.csReady !== false; // 未显式标记为 false 则视为就绪

  renderRequestList();
}

function findRuleForRequest(req) {
  if (!mockRules || !req) return null;
  return mockRules.find(r => r.url === req.url && r.method === req.method) || null;
}

function renderRequestList() {
  const container = document.getElementById('requestList');

  if (!csReady) {
    // content script 未注入（页面在扩展重载前已打开，或 URL 不匹配 manifest）
    container.innerHTML = '<div class="list-empty">未检测到内容脚本，请刷新当前页面后重试</div>';
    return;
  }

  if (!requestLog || requestLog.length === 0) {
    container.innerHTML = '<div class="list-empty">暂无记录</div>';
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
      <div class="request-item${isActive}" data-id="${req.id}">
        <div class="request-row">
          <span class="request-method method-${req.method}">${escapeHtml(req.method)}</span>
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

  // 绑定点击事件
  container.querySelectorAll('.request-item').forEach(item => {
    item.addEventListener('click', () => {
      selectRequest(item.dataset.id);
    });
  });
}

function selectRequest(id) {
  selectedRequest = requestLog.find(r => r.id === id);
  if (!selectedRequest) return;

  renderRequestList(); // 更新高亮
  renderEditor();
}

function formatJson(data) {
  return JSON.stringify(data ?? null, null, 2);
}

function renderEditor() {
  const content = document.getElementById('content');
  const existingRule = findRuleForRequest(selectedRequest);
  const interceptOn = existingRule && existingRule.enabled;
  const statusText = selectedRequest.status || '—';
  const modeText = existingRule?.mockMode === 'request' ? 'Mock 入参' : 'Mock 出参';
  const initialTab = existingRule?.mockMode === 'request' ? 'request' : 'response';

  const statusOk = selectedRequest.status >= 200 && selectedRequest.status < 400;
  const statusBadgeClass = selectedRequest.status === 0 ? '' : (statusOk ? ' ok' : ' err');

  const html = `
    <div class="editor">

      <!-- Full-width header -->
      <div class="editor-header">
        <span class="editor-header-method method-${escapeHtml(selectedRequest.method)}">${escapeHtml(selectedRequest.method)}</span>
        <span class="editor-header-url" title="${escapeHtml(selectedRequest.url)}">${escapeHtml(selectedRequest.url)}</span>
        <span class="badge${statusBadgeClass}">${statusText}</span>
        ${interceptOn ? '<span class="badge mocked">INTERCEPTED</span>' : ''}
      </div>

      <!-- Left: config -->
      <div class="config-col">
        <div class="section">
          <div class="section-title">Request Info</div>
          <div class="section-body">
            <div class="kv">
              <div class="kv-row"><div class="kv-key">URL</div><div class="kv-val">${escapeHtml(selectedRequest.url)}</div></div>
              <div class="kv-row"><div class="kv-key">Method</div><div class="kv-val">${escapeHtml(selectedRequest.method)}</div></div>
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
        <div class="hint">编辑 JSON 数据，或使用生成器快速构造假数据。</div>
      </div>

      <!-- Full-width action dock -->
      <div class="action-dock">
        <div class="btn-group">
          <button class="btn btn-secondary" id="generateBtn">⚡ 生成假数据</button>
          <button class="btn btn-primary" id="saveBtn">保存 Mock 规则</button>
        </div>
        <div class="status-msg" id="statusMsg"></div>
      </div>
    </div>
  `;

  content.innerHTML = html;

  // 初始化 CodeJar 代码编辑器（Prism JSON 高亮）
  // 有已保存规则时优先回填 mockData，否则使用接口原始请求/响应数据。
  const editorHost = document.getElementById('mockDataEditor');
  const editorDrafts = {
    response: formatJson(selectedRequest.responsePayload),
    request: formatJson(selectedRequest.requestPayload),
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

async function handleToggleIntercept(enabled, jsonEditor) {
  const statusEl = document.getElementById('statusMsg');
  try {
    const mockMode = document.querySelector('input[name="mockMode"]:checked').value;
    let mockData;
    try { mockData = jsonEditor ? jsonEditor.get() : selectedRequest.responsePayload; } catch (_) { mockData = selectedRequest.responsePayload; }

    // 复用已有规则 id 或新建
    const existing = findRuleForRequest(selectedRequest);
    const rule = {
      id: existing ? existing.id : Date.now().toString(),
      url: selectedRequest.url,
      method: selectedRequest.method,
      mockMode,
      mockData: existing ? existing.mockData : mockData,
      enabled,
      createdAt: existing ? existing.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

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
    const activeTab = document.querySelector('input[name="mockMode"]:checked').value;

    // 获取当前数据并推断 Schema
    const data = activeTab === 'response' ? selectedRequest.responsePayload : selectedRequest.requestPayload;
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
    const mockMode = document.querySelector('input[name="mockMode"]:checked').value;
    let mockData;
    try {
      mockData = jsonEditor ? jsonEditor.get() : selectedRequest.responsePayload;
    } catch (parseErr) {
      throw new Error('JSON 格式错误: ' + parseErr.message);
    }

    const existingRule = findRuleForRequest(selectedRequest);
    const now = Date.now();
    const rule = {
      id: existingRule ? existingRule.id : now.toString(),
      url: selectedRequest.url,
      method: selectedRequest.method,
      mockMode: mockMode,
      mockData: mockData,
      enabled: document.getElementById('interceptToggle')?.checked ?? true,
      createdAt: existingRule ? existingRule.createdAt : now,
      updatedAt: now,
    };

    const result = await sendMessage({
      type: 'ADD_MOCK_RULE',
      rule,
      tabId,
    });

    if (result.ok) {
      statusEl.className = 'status-msg show ok';
      statusEl.textContent = 'Mock 规则保存成功，刷新页面后生效';

      // 重新加载规则列表
      await loadData();
    } else {
      throw new Error(result.error || 'Save failed');
    }

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
