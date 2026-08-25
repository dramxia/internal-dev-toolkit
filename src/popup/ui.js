/* 内部开发工具箱 — Popup 通用 UI：统一悬浮提示（toast） */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  const TOAST_ID = 'globalToast';
  let hideTimer = 0;
  // 默认仅 ok 自动消失；调用方可通过 duration 为其它类型设置关闭时间。
  const OK_AUTO_HIDE_MS = 1800;

  function toast(text, kind, options = {}) {
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

    const hasCustomDuration = options.duration != null && Number.isFinite(Number(options.duration));
    const autoHideMs = hasCustomDuration
      ? Math.max(0, Number(options.duration))
      : (kind === 'ok' ? OK_AUTO_HIDE_MS : 0);
    if (autoHideMs > 0) {
      hideTimer = setTimeout(() => {
        el.classList.remove('show', 'ok', 'err');
        el.textContent = '';
      }, autoHideMs);
    }
  }

  ns.ui = { toast };
})();
