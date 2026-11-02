/* 通知文档就绪；已开启的开发地址继续等待异步挂载的 React／Vue 组件。 */
(() => {
  const REPLACE_EVENT = 'idt-component-document-ready-replace';
  if (globalThis.__IDT_COMPONENT_DOCUMENT_READY__?.isRunning?.()) {
    globalThis.__IDT_COMPONENT_DOCUMENT_READY__.wake();
    return;
  }
  window.dispatchEvent(new Event(REPLACE_EVENT));
  globalThis.__IDT_COMPONENT_DOCUMENT_READY__?.destroy?.();
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let timer = null, observer = null, sending = false, queued = '';
  function stop() {
    clearTimeout(timer); timer = null;
    observer?.disconnect(); observer = null;
  }
  function destroy() {
    controller.abort(); stop(); queued = '';
    delete globalThis.__IDT_COMPONENT_DOCUMENT_READY__;
  }
  function isRunning() { return !controller.signal.aborted && !!chrome.runtime.id; }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => ready('mutation'), 150);
  }
  async function ready(reason = 'poll') {
    if (!isRunning()) { destroy(); return; }
    if (sending) { queued = reason; return; }
    sending = true;
    stop();
    try {
      const response = await chrome.runtime.sendMessage({ type: 'COMPONENT_DOCUMENT_READY', payload: { reason, visible: !document.hidden } });
      if (!isRunning()) return;
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
      if (queued && isRunning()) { const next = queued; queued = ''; ready(next); }
    }
  }
  globalThis.__IDT_COMPONENT_DOCUMENT_READY__ = { wake: () => ready('wake'), isRunning, destroy };
  ready('load');
  window.addEventListener(REPLACE_EVENT, destroy, options);
  window.addEventListener('pagehide', stop, options);
  window.addEventListener('pageshow', (event) => { if (event.persisted) ready('pageshow'); }, options);
  window.addEventListener('focus', () => ready('focus'), options);
  document.addEventListener('visibilitychange', () => ready(document.hidden ? 'hidden' : 'visible'), options);
})();
