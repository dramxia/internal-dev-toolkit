/* 内部开发工具箱 — Popup 通用 UI：统一悬浮提示（toast） */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  const TOAST_ID = 'globalToast';
  let hideTimer = 0;
  // ok 类提示自动消失；info / err 保持到下一次调用覆盖或清空
  const OK_AUTO_HIDE_MS = 1800;

  function toast(text, kind) {
    const el = document.getElementById(TOAST_ID);
    if (!el) return;
    clearTimeout(hideTimer);

    const t = text == null ? '' : String(text);
    if (!t) {
      el.classList.remove('show', 'ok', 'err');
      el.textContent = '';
      return;
    }

    el.textContent = t;
    el.classList.remove('ok', 'err');
    if (kind === 'ok' || kind === 'err') el.classList.add(kind);
    el.classList.add('show');

    if (kind === 'ok') {
      hideTimer = setTimeout(() => {
        el.classList.remove('show', 'ok', 'err');
        el.textContent = '';
      }, OK_AUTO_HIDE_MS);
    }
  }

  ns.ui = { toast };
})();
