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
    const time = new Date(req.timestamp).toLocaleTimeString();
    const isActive = selectedRequest?.id === req.id ? ' active' : '';
    const statusOk = req.status >= 200 && req.status < 400;
    const statusClass = req.status === 0 ? '' : (statusOk ? ' ok' : ' err');
    const rule = findRuleForRequest(req);
    const mocked = rule && rule.enabled ? ' <span class="mocked-tag">Mock</span>' : '';
    return `
      <div class="request-item${isActive}" data-id="${req.id}">
        <div class="request-row">
          <span class="request-method method-${req.method}">${escapeHtml(req.method)}</span>
          <span class="request-url" title="${escapeHtml(req.url)}">${escapeHtml(req.url)}</span>${mocked}
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

function renderEditor() {
  const content = document.getElementById('content');
  const existingRule = findRuleForRequest(selectedRequest);
  const interceptOn = existingRule && existingRule.enabled;
  const statusText = selectedRequest.status || '—';
  const modeText = existingRule?.mockMode === 'request' ? 'Mock 入参' : 'Mock 出参';

  const html = `
    <div class="editor">
      <div class="editor-hero">
        <div class="hero-kicker">Selected Endpoint</div>
        <div class="hero-main">
          <div class="hero-method">${escapeHtml(selectedRequest.method)}</div>
          <div class="hero-copy">
            <h1 class="hero-url">${escapeHtml(selectedRequest.url)}</h1>
            <div class="hero-subline">
              <span class="hero-pill">Status ${statusText}</span>
              <span class="hero-pill">${interceptOn ? '拦截已开启' : '正常透传'}</span>
              <span class="hero-pill">${escapeHtml(modeText)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="config-stack">
        <div class="section info-card">
          <div class="section-title">接口情报</div>
          <div class="kv">
            <div class="kv-row"><div class="kv-key">URL</div><div class="kv-val mono">${escapeHtml(selectedRequest.url)}</div></div>
            <div class="kv-row"><div class="kv-key">Method</div><div class="kv-val">${escapeHtml(selectedRequest.method)}</div></div>
            <div class="kv-row"><div class="kv-key">Status</div><div class="kv-val">${statusText}</div></div>
          </div>
        </div>

        <div class="section config-card">
          <div class="section-title">Mock 控制台</div>
          <div class="intercept-row">
            <label class="switch">
              <input type="checkbox" id="interceptToggle" ${interceptOn ? 'checked' : ''}>
              <span class="switch-track"><span class="switch-thumb"></span></span>
            </label>
            <span class="intercept-label">拦截该接口${interceptOn ? '（已开启）' : '（已关闭，正常请求）'}</span>
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

      <div class="section data-panel">
        <div class="section-header-line">
          <div class="section-title">数据编排</div>
          <div class="tabs">
            <div class="tab active" data-tab="response">响应数据</div>
            <div class="tab" data-tab="request">请求数据</div>
          </div>
        </div>
        <div id="tabContent" class="json-frame">
          <div class="json-frame-bar">
            <div class="json-window-dots"><span></span><span></span><span></span></div>
            <div class="json-frame-title">mock.payload.json</div>
          </div>
          <div id="mockDataEditor" class="json-editor-host"></div>
        </div>
        <div class="hint">编辑 JSON 数据，或使用下方生成器快速构造假数据。</div>
      </div>

      <div class="action-dock">
        <div class="btn-group">
          <button class="btn btn-secondary" id="generateBtn">一键生成假数据</button>
          <button class="btn btn-primary" id="saveBtn">保存 Mock 规则</button>
        </div>
        <div class="status-msg" id="statusMsg"></div>
      </div>
    </div>
  `;

  content.innerHTML = html;

  // 初始化 CodeJar 代码编辑器（Prism JSON 高亮）
  const editorHost = document.getElementById('mockDataEditor');
  const initialText = JSON.stringify(selectedRequest.responsePayload ?? null, null, 2);
  let jsonEditor = createJsonEditor(editorHost, initialText);

  // 绑定 tab 切换
  content.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      content.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const tabName = tab.dataset.tab;
      const data = tabName === 'response' ? selectedRequest.responsePayload : selectedRequest.requestPayload;
      jsonEditor.updateCode(JSON.stringify(data ?? null, null, 2));
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

// 创建 CodeJar 编辑器，返回适配对象 {updateCode, get, set}
function createJsonEditor(host, initialText) {
  const pre = document.createElement('pre');
  pre.className = 'language-json';
  const code = document.createElement('code');
  code.className = 'language-json';
  code.textContent = initialText;
  pre.appendChild(code);
  host.appendChild(pre);

  const jar = CodeJar(code, (editor) => {
    Prism.highlightElement(editor);
  }, { tab: '  ' });

  return {
    updateCode: (text) => jar.updateCode(text),
    get: () => JSON.parse(code.textContent),
    set: (data) => jar.updateCode(JSON.stringify(data ?? null, null, 2)),
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
    const activeTab = document.querySelector('.tab.active').dataset.tab;

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

    const rule = {
      id: existingRule ? existingRule.id : Date.now().toString(),
      url: selectedRequest.url,
      method: selectedRequest.method,
      mockMode: mockMode,
      mockData: mockData,
      enabled: document.getElementById('interceptToggle')?.checked ?? true,
      createdAt: existingRule ? existingRule.createdAt : Date.now(),
      updatedAt: Date.now(),
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

  // 拖拽改宽度
  let dragging = false;
  resizer.addEventListener('mousedown', (e) => {
    dragging = true;
    resizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const w = e.clientX - app.getBoundingClientRect().left;
    setSidebarWidth(w);
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
