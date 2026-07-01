/* 内部开发工具箱 — Mock 拦截器（页面主上下文 / MAIN world） */
/* 由 background 通过 chrome.scripting.executeScript({world:'MAIN', files:['mock-hook.js']}) 注入。
   运行在页面真实 window 上，可拦截页面代码发起的 fetch/XHR。
   与 content script 之间通过 window.postMessage 通信：
     - 入：IDT_UPDATE_MOCK_RULES（规则更新）
     - 出：IDT_REQUEST_LOGGED（请求记录上报） */
(() => {
  // 防止重复注入（页面内多次注入时只装一次 hook）
  if (window.__IDT_MOCK_HOOK_INSTALLED__) {
    console.log('[Mock Interceptor - Page Context] Already installed, skip');
    return;
  }
  window.__IDT_MOCK_HOOK_INSTALLED__ = true;

  console.log('[Mock Interceptor - Page Context] Script started');
  let mockRules = [];

  // 监听来自 content script 的规则更新
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'IDT_UPDATE_MOCK_RULES') {
      mockRules = event.data.rules || [];
      console.log('[Mock Interceptor - Page Context] Rules updated:', mockRules.length);
    }
  });

  // 匹配 mock 规则
  function findMatchingRule(url, method) {
    // 预解析请求 URL 的 origin / pathname（用于导入接口的“仅路径 + 当前页面域名”匹配）
    let reqPath = null, reqOrigin = null;
    try { const u = new URL(url); reqPath = u.pathname; reqOrigin = u.origin; } catch (_) {}

    return mockRules.find(rule => {
      if (!rule.enabled) return false;
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

  // 取规则的 Mock 响应状态码（默认 200），支持面板可编辑的 rule.status
  function mockStatus(rule) {
    const s = rule && rule.status != null ? Number(rule.status) : 200;
    return Number.isFinite(s) ? s : 200;
  }
  function mockStatusText(s) {
    const map = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' };
    return map[s] || (s >= 200 && s < 300 ? 'OK' : (s >= 400 ? 'Error' : 'OK'));
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
  const seenKeys = new Set();
  function recordRequest(url, method, requestPayload, responsePayload, status) {
    const key = method + ' ' + url;
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

    if (rule && rule.enabled && rule.mockMode === 'response') {
      console.log('[Mock Interceptor - Page Context] Mock response for', method, url);
      const mStatus = mockStatus(rule);
      const mockResponse = new Response(JSON.stringify(rule.mockData), {
        status: mStatus,
        statusText: mockStatusText(mStatus),
        headers: { 'Content-Type': 'application/json' },
      });
      recordRequest(url, method, init?.body, rule.mockData, mStatus);
      return mockResponse;
    }

    if (rule && rule.enabled && rule.mockMode === 'request') {
      init = {
        ...init,
        body: JSON.stringify(rule.mockData),
        headers: { ...init?.headers, 'Content-Type': 'application/json' },
      };
    }

    try {
      const response = await originalFetch.call(this, input, init);
      const clonedResponse = response.clone();

      clonedResponse.text().then(text => {
        recordRequest(url, method, init?.body, text, response.status);
      }).catch(() => {
        recordRequest(url, method, init?.body, null, response.status);
      });

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

      if (rule && rule.enabled && rule.mockMode === 'response') {
        console.log('[Mock Interceptor - Page Context] Mock response for XHR', method, url);

        // 用真实原生 XHR 完成一次请求生命周期，让 axios 等库的监听器正常触发。
        // 不发真实网络，仅本地构造响应。
        const mStatus = mockStatus(rule);
        setTimeout(() => {
          const mockBody = JSON.stringify(rule.mockData);
          Object.defineProperty(xhr, 'readyState', { writable: true, value: 4 });
          Object.defineProperty(xhr, 'status', { writable: true, value: mStatus });
          Object.defineProperty(xhr, 'statusText', { writable: true, value: mockStatusText(mStatus) });
          Object.defineProperty(xhr, 'responseText', { writable: true, value: mockBody });
          Object.defineProperty(xhr, 'response', { writable: true, value: mockBody });
          Object.defineProperty(xhr, 'responseURL', { writable: true, value: url });

          recordRequest(url, method, requestBody, rule.mockData, mStatus);

          // 触发标准事件，兼容 onreadystatechange / onload / onloadend / addEventListener
          xhr.dispatchEvent(new Event('readystatechange'));
          xhr.dispatchEvent(new ProgressEvent('load'));
          xhr.dispatchEvent(new ProgressEvent('loadend'));
        }, 0);

        return;
      }

      if (rule && rule.enabled && rule.mockMode === 'request') {
        requestBody = JSON.stringify(rule.mockData);
      }

      // 用 loadend 记录所有终态（load/error/abort/timeout），且不覆盖页面自身的 onload。
      // 仅靠 onload 会漏掉失败/中止的请求，也无法兼容用 onloadend/onreadystatechange 的库（如 axios）。
      xhr.addEventListener('loadend', function() {
        recordRequest(url, method, requestBody, xhr.responseText, xhr.status);
      });

      return originalSend.call(this, requestBody);
    };

    return xhr;
  };
  console.log('[Mock Interceptor - Page Context] XMLHttpRequest hooked');

  console.log('[Mock Interceptor - Page Context] All hooks installed');
})();
