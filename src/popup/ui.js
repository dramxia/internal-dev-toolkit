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

  let menu = null;
  let menuTrigger = null;
  let observed = false;
  let compactScheduled = false;

  function ensureActionMenu() {
    if (menu) return menu;
    menu = document.createElement('div');
    menu.className = 'action-menu';
    menu.id = 'globalActionMenu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    document.body.appendChild(menu);
    menu.addEventListener('click', (event) => {
      const item = event.target.closest('[data-action-index]');
      if (!item || item.disabled) return;
      const sources = menu.__sources || [];
      const source = sources[Number(item.dataset.actionIndex)];
      const trigger = menuTrigger;
      const scope = source?.closest('.utility-screen, .panel');
      closeActionMenu(true);
      source?.click();
      const restoreFallback = () => {
        const active = document.activeElement;
        if (active && active !== document.body && active.isConnected) return;
        const fallback = trigger?.isConnected
          ? trigger
          : scope?.querySelector('.action-overflow-btn, button, input, [contenteditable="true"]');
        fallback?.focus?.({ preventScroll: true });
      };
      requestAnimationFrame(restoreFallback);
      setTimeout(restoreFallback, 300);
    });
    menu.addEventListener('keydown', (event) => {
      const items = [...menu.querySelectorAll('[role="menuitem"]:not(:disabled)')];
      const index = items.indexOf(document.activeElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        items[(index + delta + items.length) % items.length]?.focus();
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        event.stopPropagation();
        items[event.key === 'Home' ? 0 : items.length - 1]?.focus();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeActionMenu();
      }
    });
    return menu;
  }

  function actionLabel(button) {
    return button.getAttribute('aria-label') || button.title || button.textContent.trim() || '执行操作';
  }

  function closeActionMenu(restoreFocus = true) {
    if (!menu || menu.hidden) return;
    const trigger = menuTrigger;
    menu.hidden = true;
    menu.innerHTML = '';
    menu.__sources = [];
    trigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger?.focus?.({ preventScroll: true });
    menuTrigger = null;
  }

  function openActionMenu(trigger, sources) {
    const popup = ensureActionMenu();
    const actions = sources.filter(Boolean);
    if (!actions.length) return;
    closeActionMenu(false);
    menuTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    popup.__sources = actions;
    popup.innerHTML = actions.map((button, index) => {
      const danger = button.classList.contains('danger') || button.dataset.action === 'delete';
      return `<button type="button" role="menuitem" data-action-index="${index}"` +
        `${button.disabled ? ' disabled' : ''} class="${danger ? 'danger' : ''}">` +
        `${actionLabel(button)}</button>`;
    }).join('');
    popup.hidden = false;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(220, window.innerWidth - 16);
    popup.style.width = `${width}px`;
    popup.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`;
    const measuredHeight = popup.offsetHeight;
    const below = rect.bottom + 6;
    const top = below + measuredHeight <= window.innerHeight - 8
      ? below
      : Math.max(8, rect.top - measuredHeight - 6);
    popup.style.top = `${top}px`;
    requestAnimationFrame(() => popup.querySelector('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true }));
  }

  function compactRowActions(row) {
    const sources = [...row.querySelectorAll(
      '.action-btn:not(.action-overflow-btn), .recent-action-btn:not(.action-overflow-btn), ' +
      '.student-app-login-btn, .student-copy-btn'
    )];
    if (sources.length < 2) return;
    const signature = sources.map((button) => `${button.dataset.action || button.className}:${actionLabel(button)}`).join('|');
    if (row.dataset.compactSignature === signature && row.querySelector('.action-overflow-btn')) return;

    row.querySelectorAll('.action-overflow-btn').forEach((button) => button.remove());
    sources.forEach((button) => {
      button.hidden = false;
      button.dataset.compactedAction = '';
    });
    const primary = sources.find((button) =>
      ['open', 'login', 'enter'].includes(button.dataset.action) ||
      button.classList.contains('student-app-login-btn') ||
      button.classList.contains('primary')
    ) || sources[0];
    const secondary = sources.filter((button) => button !== primary);
    secondary.forEach((button) => {
      button.hidden = true;
      button.dataset.compactedAction = 'true';
    });
    const group = primary.closest('.list-item-actions, .recent-item-actions, .student-item-actions') || primary.parentElement;
    if (!group) return;
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'action-overflow-btn';
    more.title = '更多操作';
    more.setAttribute('aria-label', '更多操作');
    more.setAttribute('aria-haspopup', 'menu');
    more.setAttribute('aria-controls', 'globalActionMenu');
    more.setAttribute('aria-expanded', 'false');
    more.textContent = '...';
    more.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openActionMenu(more, secondary);
    });
    group.appendChild(more);
    row.querySelectorAll('.recent-item-actions').forEach((container) => {
      if (!container.querySelector('button:not([hidden])')) container.hidden = true;
    });
    row.dataset.compactSignature = signature;
  }

  function compactActions(root = document) {
    root.querySelectorAll(
      '.recent-item, .list-item, .quick-action-row, .student-item, .quick-stage-summary, .lookup-teacher-item'
    ).forEach(compactRowActions);
  }

  function observeActions() {
    if (observed || typeof MutationObserver === 'undefined') return;
    observed = true;
    const observer = new MutationObserver(() => {
      if (compactScheduled) return;
      compactScheduled = true;
      requestAnimationFrame(() => {
        compactScheduled = false;
        compactActions();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    compactActions();
    document.addEventListener('pointerdown', (event) => {
      if (!menu?.hidden && !menu.contains(event.target) && event.target !== menuTrigger) closeActionMenu(false);
    });
    window.addEventListener('resize', () => closeActionMenu(false));
    document.addEventListener('scroll', () => closeActionMenu(false), true);
  }

  ns.ui = { toast, compactActions, observeActions, closeActionMenu };
})();
