/* 内部开发工具箱 — Mock 拦截器（页面主上下文 / MAIN world） */
/* 由 manifest content_scripts 在 document_start 静态注入（world:MAIN），
   运行在页面真实 window 上，可拦截页面代码发起的 fetch/XHR。
   与 content script 之间通过 window.postMessage 通信：
     - 入：IDT_UPDATE_MOCK_RULES（规则更新）、IDT_SET_ACTIVE（激活开关）
     - 出：IDT_REQUEST_LOGGED（请求记录上报）
   hook 始终安装（抢在页面脚本缓存原生引用之前），但默认不记录上报；
   仅当 DevTools 面板打开时经 IDT_SET_ACTIVE 激活后才记录，
   实现“仅在控制台打开时捕获”。Mock 规则改写不受激活开关影响，始终生效。 */
(() => {
  // 防止重复注入（页面内多次注入时只装一次 hook）
  if (window.__IDT_MOCK_HOOK_INSTALLED__) {
    console.log('[Mock Interceptor - Page Context] Already installed, skip');
    return;
  }
  window.__IDT_MOCK_HOOK_INSTALLED__ = true;

  console.log('[Mock Interceptor - Page Context] Script started');
  let mockRules = [];
  let disabledKeys = new Set(); // 被禁监的接口 key（method + ' ' + url），命中则不记录上报
  let activated = false; // 是否记录并上报请求（由 DevTools 面板打开时激活）

  // 监听来自 content script 的规则更新 / 激活开关
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data) return;
    if (event.data.type === 'IDT_UPDATE_MOCK_RULES') {
      mockRules = event.data.rules || [];
      console.log('[Mock Interceptor - Page Context] Rules updated:', mockRules.length);
    } else if (event.data.type === 'IDT_UPDATE_MONITOR_DISABLED') {
      const arr = Array.isArray(event.data.disabled) ? event.data.disabled : [];
      disabledKeys = new Set(arr);
      console.log('[Mock Interceptor - Page Context] Monitor disabled updated:', disabledKeys.size);
    } else if (event.data.type === 'IDT_SET_ACTIVE') {
      activated = !!event.data.active;
      console.log('[Mock Interceptor - Page Context] Active set to', activated);
    }
  });

  // 匹配 mock 规则
  // 新结构下“是否拦截”由 responseMock.enabled / requestMock.enabled 决定，
  // 此处仅按 url+method 命中规则本身；具体拦截出参还是入参由调用方 resolveMockIntent 判定。
  // 旧结构（无 responseMock/requestMock）仍以 rule.enabled 作为命中门槛，保证兼容。
  function findMatchingRule(url, method) {
    // 预解析请求 URL 的 origin / pathname（用于导入接口的“仅路径 + 当前页面域名”匹配）
    let reqPath = null, reqOrigin = null;
    try { const u = new URL(url); reqPath = u.pathname; reqOrigin = u.origin; } catch (_) {}

    return mockRules.find(rule => {
      const hasNew = rule.responseMock || rule.requestMock;
      if (!hasNew && !rule.enabled) return false;
      if (rule.method !== method) return false;
      const ruleUrl = rule.url || '';
      // 完全匹配
      if (ruleUrl === url) return true;
      // 导入接口：仅存路径（无域名），域名用当前页面 → 同源且路径相同即命中
      if (ruleUrl.startsWith('/') && !/:\/\//.test(ruleUrl)
          && reqPath && reqOrigin === location.origin && reqPath === ruleUrl) {
        return true;
      }
      // 通配符匹配
      if (!ruleUrl.includes('*')) return false;
      try {
        const pattern = ruleUrl.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp('^' + pattern + '$').test(url);
      } catch (_) {
        return false;
      }
    });
  }

  // 取规则的 Mock 响应状态码（默认 200），优先读 responseMock.status，兼容旧 rule.status
  function mockStatus(rule) {
    const raw = rule && (rule.responseMock?.status != null ? rule.responseMock.status : (rule.status != null ? rule.status : 200));
    const s = Number(raw);
    return Number.isFinite(s) ? s : 200;
  }
  function mockStatusText(s) {
    const map = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' };
    return map[s] || (s >= 200 && s < 300 ? 'OK' : (s >= 400 ? 'Error' : 'OK'));
  }

  // 解析规则的出参/入参拦截意图，返回 { response, request }。
  // 值非 null 表示该方向需要 mock（response=出参假数据，request=入参假数据），可同时为非 null。
  // 新结构读 responseMock/requestMock；旧结构（仅 mockMode/mockData/enabled）按 mockMode 归属兼容。
  function resolveMockIntent(rule) {
    if (!rule) return { response: null, request: null };
    const rm = rule.responseMock;
    const qm = rule.requestMock;
    if (rm || qm) {
      return {
        response: (rm && rm.enabled) ? rm.mockData : null,
        request: (qm && qm.enabled) ? qm.mockData : null,
      };
    }
    if (!rule.enabled) return { response: null, request: null };
    const data = rule.mockData;
    return rule.mockMode === 'request'
      ? { response: null, request: data }
      : { response: data, request: null };
  }

  function safeParseJSON(str) {
    if (!str) return null;
    if (typeof str === 'object') return str;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }

  // 记录请求并上报给 content script
  // 同一 method+url 只保留最新一条，避免重复请求刷屏
  // 仅在激活（DevTools 面板已打开）时记录；未激活时 hook 仍透传请求，但不记录上报。
  const seenKeys = new Set();
  function recordRequest(url, method, requestPayload, responsePayload, status) {
    if (!activated) return; // 未激活：不记录、不上报，保持零开销透传
    const key = method + ' ' + url;
    // 命中禁监池：不记录、不上报（避免轮询接口刷屏且无法选中）
    if (disabledKeys.size > 0 && disabledKeys.has(key)) return;
    seenKeys.add(key);
    console.log('[Mock Interceptor - Page Context] Recording request:', method, url, status);
    const record = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      key,
      url,
      method,
      requestPayload: safeParseJSON(requestPayload),
      responsePayload: safeParseJSON(responsePayload),
      status,
      timestamp: Date.now(),
    };

    window.postMessage({
      type: 'IDT_REQUEST_LOGGED',
      record,
    }, '*');
  }

  // Hook fetch API
  console.log('[Mock Interceptor - Page Context] Hooking fetch...');
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init?.method || 'GET').toUpperCase();
    console.log('[Mock Interceptor - Page Context] Fetch intercepted:', method, url);

    const rule = findMatchingRule(url, method);
    const intent = resolveMockIntent(rule);

    // 入参改写：先于出参处理，使“改入参 + 假出参”可叠加
    if (intent.request != null) {
      init = {
        ...init,
        body: JSON.stringify(intent.request),
        headers: { ...init?.headers, 'Content-Type': 'application/json' },
      };
    }

    // 出参拦截：直接构造假响应，不发真实网络
    if (intent.response != null) {
      console.log('[Mock Interceptor - Page Context] Mock response for', method, url);
      const mStatus = mockStatus(rule);
      const mockResponse = new Response(JSON.stringify(intent.response), {
        status: mStatus,
        statusText: mockStatusText(mStatus),
        headers: { 'Content-Type': 'application/json' },
      });
      recordRequest(url, method, init?.body, intent.response, mStatus);
      return mockResponse;
    }

    try {
      const response = await originalFetch.call(this, input, init);

      // 仅激活时才 clone + 读响应体并记录；未激活时直接透传，零额外开销
      if (activated) {
        const clonedResponse = response.clone();
        clonedResponse.text().then(text => {
          recordRequest(url, method, init?.body, text, response.status);
        }).catch(() => {
          recordRequest(url, method, init?.body, null, response.status);
        });
      }

      return response;
    } catch (err) {
      recordRequest(url, method, init?.body, null, 0);
      throw err;
    }
  };
  console.log('[Mock Interceptor - Page Context] fetch hooked');

  // Hook XMLHttpRequest
  console.log('[Mock Interceptor - Page Context] Hooking XMLHttpRequest...');
  const OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new OriginalXHR();
    let url, method, requestBody;

    const originalOpen = xhr.open;
    xhr.open = function(m, u) {
      method = m.toUpperCase();
      url = u;
      console.log('[Mock Interceptor - Page Context] XHR open:', method, url);
      return originalOpen.apply(this, arguments);
    };

    const originalSend = xhr.send;
    xhr.send = function(body) {
      requestBody = body;
      const rule = findMatchingRule(url, method);
      const intent = resolveMockIntent(rule);

      // 入参改写：先于出参处理，使“改入参 + 假出参”可叠加
      if (intent.request != null) {
        requestBody = JSON.stringify(intent.request);
      }

      // 出参拦截：用真实原生 XHR 完成一次请求生命周期，让 axios 等库的监听器正常触发。
      // 不发真实网络，仅本地构造响应。
      if (intent.response != null) {
        console.log('[Mock Interceptor - Page Context] Mock response for XHR', method, url);

        const mStatus = mockStatus(rule);
        setTimeout(() => {
          const mockBody = JSON.stringify(intent.response);
          Object.defineProperty(xhr, 'readyState', { writable: true, value: 4 });
          Object.defineProperty(xhr, 'status', { writable: true, value: mStatus });
          Object.defineProperty(xhr, 'statusText', { writable: true, value: mockStatusText(mStatus) });
          Object.defineProperty(xhr, 'responseText', { writable: true, value: mockBody });
          Object.defineProperty(xhr, 'response', { writable: true, value: mockBody });
          Object.defineProperty(xhr, 'responseURL', { writable: true, value: url });

          recordRequest(url, method, requestBody, intent.response, mStatus);

          // 触发标准事件，兼容 onreadystatechange / onload / onloadend / addEventListener
          xhr.dispatchEvent(new Event('readystatechange'));
          xhr.dispatchEvent(new ProgressEvent('load'));
          xhr.dispatchEvent(new ProgressEvent('loadend'));
        }, 0);

        return;
      }

      // 用 loadend 记录所有终态（load/error/abort/timeout），且不覆盖页面自身的 onload。
      // 仅靠 onload 会漏掉失败/中止的请求，也无法兼容用 onloadend/onreadystatechange 的库（如 axios）。
      // 仅激活时注册监听并记录；未激活时直接透传，零额外开销。
      if (activated) {
        xhr.addEventListener('loadend', function() {
          recordRequest(url, method, requestBody, xhr.responseText, xhr.status);
        });
      }

      return originalSend.call(this, requestBody);
    };

    return xhr;
  };
  console.log('[Mock Interceptor - Page Context] XMLHttpRequest hooked');

  console.log('[Mock Interceptor - Page Context] All hooks installed');
})();
