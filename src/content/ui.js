/* 内部开发工具箱 — 页面 UI 注入（轻提示） */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  const TOAST_ID = 'idt-toast';

  function toast(message, { duration = 2200 } = {}) {
    let el = document.getElementById(TOAST_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = TOAST_ID;
      el.className = 'idt-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('idt-toast--show');
    clearTimeout(el._idtTimer);
    el._idtTimer = setTimeout(() => {
      el.classList.remove('idt-toast--show');
    }, duration);
  }

  ns.ui = { toast };
})();
