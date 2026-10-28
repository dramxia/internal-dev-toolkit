/* 通知文档就绪；已开启的开发地址继续等待异步挂载的 React／Vue 组件。 */
(() => {
  if (globalThis.__IDT_COMPONENT_DOCUMENT_READY__) {
    globalThis.__IDT_COMPONENT_DOCUMENT_READY__.wake();
    return;
  }
  let timer = null, observer = null, sending = false, queued = '';
  function stop() {
    clearTimeout(timer); timer = null;
    observer?.disconnect(); observer = null;
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => ready('mutation'), 150);
  }
  async function ready(reason = 'poll') {
    if (sending) { queued = reason; return; }
    sending = true;
    stop();
    try {
      const response = await chrome.runtime.sendMessage({ type: 'COMPONENT_DOCUMENT_READY', payload: { reason, visible: !document.hidden } });
      if (response?.ok && response.watch) {
        if (response.observe && !document.hidden) {
          observer = new MutationObserver(schedule);
          observer.observe(document.documentElement, { childList: true, subtree: true });
        }
        const delay = response.retryAfter || 1000;
        timer = setTimeout(ready, document.hidden ? Math.max(60000, delay) : delay);
      }
    } catch (_) { stop(); }
    finally {
      sending = false;
      if (queued) { const next = queued; queued = ''; ready(next); }
    }
  }
  globalThis.__IDT_COMPONENT_DOCUMENT_READY__ = { wake: () => ready('wake') };
  ready('load');
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', (event) => { if (event.persisted) ready('pageshow'); });
  window.addEventListener('focus', () => ready('focus'));
  document.addEventListener('visibilitychange', () => ready(document.hidden ? 'hidden' : 'visible'));
})();
