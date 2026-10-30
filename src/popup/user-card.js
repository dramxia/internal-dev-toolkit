/* 师生查询公共用户卡片：身份、环境、登录操作与场景扩展。 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {};
  const DEFAULT_DEV_PORT = '8088';
  // 图标与选定预览一致，许可见 THIRD_PARTY_NOTICES.md。
  const icons = {
    login: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
    copy: '<svg class="icon-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"/></svg>',
    open: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg" aria-hidden="true" focusable="false"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>',
    token: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg" aria-hidden="true" focusable="false"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"></path><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"></circle></svg>',
    clipboard: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg" aria-hidden="true" focusable="false"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>',
    more: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"></path></svg>',
    chevronDown: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"></path></svg>',
    student: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg" aria-hidden="true" focusable="false"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path><path d="M22 10v6"></path><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path></svg>',
    aiReview: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg" aria-hidden="true" focusable="false"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path><path d="M20 2v4"></path><path d="M22 4h-4"></path><circle cx="4" cy="20" r="2"></circle></svg>',
    teacher: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg" aria-hidden="true" focusable="false"><path d="M16 2v2"></path><path d="M17.915 22a6 6 0 0 0-12 0"></path><path d="M8 2v2"></path><circle cx="12" cy="12" r="4"></circle><rect x="3" y="4" width="18" height="18" rx="2"></rect></svg>',
    loading: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-svg quick-user-spin" aria-hidden="true" focusable="false"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>',
    change: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 4 4-4 4M4 7h16M8 21l-4-4 4-4M20 17H4"/></svg>',
    apply: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 10-5 5 5 5M4 15h11a5 5 0 0 0 5-5V4"/></svg>',
    delete: '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>',
  };
  const LOGIN_ACTIONS = Object.freeze([
    { action: 'open', label: 'AI 平台', full: '打开 AI 平台', icon: 'open' },
    { action: 'copy', label: '复制Token', full: '复制 Token', icon: 'token' },
  ]);
  const REVIEW_ACTIONS = Object.freeze([
    { action: 'student', label: '学生评价', full: '学生评价', icon: 'student' },
    { action: 'aiReview', label: 'AI评价（前海港湾）', full: 'AI评价（前海港湾）', icon: 'aiReview' },
    { action: 'teacher', label: '教师评价', full: '教师评价', icon: 'teacher' },
  ]);
  const documents = new WeakMap();
  const copyTimers = new WeakMap();
  let menuId = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function normalizeEnv(env) { return env === 'local' || env === 'dev' ? 'local' : 'online'; }
  function validPort(value) {
    const raw = String(value ?? '').trim();
    return /^\d+$/.test(raw) && Number(raw) >= 1 && Number(raw) <= 65535;
  }
  function normalizePort(value) { return validPort(value) ? String(Number(value)) : DEFAULT_DEV_PORT; }
  function accountMatchesPhone(account, phone) {
    if (!account || !phone) return false;
    if (account === phone) return true;
    // 手机号仅有空格、连字符或国内区号差异时，也只显示一次。
    const normalize = (value) => value.replace(/[\s-]/g, '').replace(/^(?:\+86|0086|86)(?=1[3-9]\d{9}$)/, '');
    const normalizedAccount = normalize(account);
    return /^1[3-9]\d{9}$/.test(normalizedAccount) && normalizedAccount === normalize(phone);
  }
  function idAttr(id) { return id ? ' id="' + escapeHtml(id) + '"' : ''; }
  function disabledAttr(disabled) { return disabled ? ' disabled aria-disabled="true"' : ''; }
  function metaAttrs(meta) {
    const values = {
      id: meta.id, 'tenant-id': meta.tenantId, 'tenant-name': meta.tenantName,
      domain: meta.domain, industry: meta.industry, 'user-name': meta.userName,
      account: meta.account, phone: meta.phone, 'role-name': meta.roleName,
      role: meta.role || 'teacher', env: normalizeEnv(meta.env), 'local-port': normalizePort(meta.localPort),
    };
    return Object.entries(values).map(([key, value]) => ' data-' + key + '="' + escapeHtml(value) + '"').join('');
  }
  function actionButton(meta, spec, disabled, busy, inMenu = false) {
    return '<button class="action-btn ' + (inMenu ? 'quick-user-menu-item' : 'quick-user-action') + '" type="button" data-action="' + spec.action +
      '" data-base-label="' + spec.full + '" data-card-disabled="' + Boolean(disabled) + '"' + metaAttrs(meta) + disabledAttr(disabled || busy) +
      ' aria-label="' + spec.full + '">' +
      '<span class="' + (inMenu ? 'quick-user-menu-symbol' : 'quick-user-action-mark') + '">' + icons[spec.icon] + '</span>' +
      '<span class="' + (inMenu ? 'quick-user-menu-name' : 'quick-user-action-label') + '">' + spec.label + '</span></button>';
  }
  function content(options) {
    const meta = options.meta || {};
    const name = options.name || meta.userName || '(未命名)';
    const avatar = Array.from(String(options.name || meta.userName || options.details || '?').trim())[0] || '?';
    const phone = String(options.phone ?? meta.phone ?? '').trim();
    const account = String(options.account ?? meta.account ?? '').trim();
    const details = [accountMatchesPhone(account, phone) ? '' : account, options.details].filter(Boolean).join(options.detailsSeparator || ' · ');
    const unavailable = options.disabled || !meta.id || !meta.tenantId || options.adminTokenAvailable === false;
    const tag = options.selectable ? 'button' : 'div';
    const attrs = options.selectable ? ' type="button" aria-pressed="' + Boolean(options.selected) + '" data-card-disabled="' + Boolean(options.selectionDisabled) + '"' + disabledAttr(options.selectionDisabled) : '';
    const currentMenuId = 'quick-user-menu-' + (++menuId);
    const extraButton = (extra) => {
      const direct = extra.placement === 'toolbar';
      return '<button class="quick-user-extra-btn ' + (direct ? 'quick-user-action quick-user-direct-action' : 'quick-user-menu-item') + (extra.danger ? ' danger' : '') + '" type="button"' + idAttr(extra.id) +
        ' data-card-action="' + escapeHtml(extra.action) + '" data-card-disabled="' + Boolean(extra.disabled) + '"' + metaAttrs(meta) +
        disabledAttr(extra.disabled || options.busy) + ' aria-label="' + escapeHtml(extra.ariaLabel || extra.label) + '">' +
        '<span class="' + (direct ? 'quick-user-action-mark' : 'quick-user-menu-symbol') + '">' + (icons[extra.icon] || '') + '</span><span class="' + (direct ? 'quick-user-action-label' : 'quick-user-menu-name') + '">' + escapeHtml(extra.label) + '</span></button>';
    };
    const extras = (options.extraActions || []).filter((extra) => extra.placement !== 'toolbar').map(extraButton).join('');
    const directActions = (options.extraActions || []).filter((extra) => extra.placement === 'toolbar').map(extraButton).join('');
    return '<div class="quick-user-header"><' + tag + ' class="quick-user-identity' + (options.selectable ? ' quick-row-select' : '') + '"' + attrs + '>' +
      '<span class="quick-user-avatar" aria-hidden="true">' + escapeHtml(avatar.toUpperCase()) + '</span>' +
      '<span class="list-item-content"><span class="list-item-title"><span class="quick-user-name">' + escapeHtml(name) + '</span>' +
      (options.roleLabel ? '<span class="list-item-role">' + escapeHtml(options.roleLabel) + '</span>' : '') +
      '<span class="quick-user-selected"' + (options.selected ? '' : ' hidden') + '>' + icons.check + '</span></span>' +
      (details ? '<span class="list-item-meta" title="' + escapeHtml(details) + '">' + escapeHtml(details) + '</span>' : '') + '</span></' + tag + '>' +
      '<label class="quick-user-env-field"><select class="quick-user-env-select" aria-label="' + escapeHtml(name) + '的登录环境" data-card-disabled="' + Boolean(unavailable) + '"' + disabledAttr(unavailable || options.busy) + '>' +
      '<option value="online">线上环境</option><option value="local">本地环境</option></select><span class="quick-user-env-chevron">' + icons.chevronDown + '</span></label>' +
      '<div class="quick-user-phone-row">' + (phone ? '<span class="quick-user-phone">' + escapeHtml(phone) + '</span>' +
      '<button class="quick-user-phone-copy" type="button" data-phone="' + escapeHtml(phone) + '" data-copied="false" aria-label="复制' + escapeHtml(name) + '的手机号" title="复制手机号">' + icons.clipboard + '</button>' : '<span class="quick-user-phone-missing">未提供手机号</span>') + '</div>' +
      '<label class="quick-user-port-field hidden" title="本地端口"><span>端口</span><input class="quick-user-port" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="' + escapeHtml(name) + '的本地端口" data-card-disabled="' + Boolean(unavailable) + '"' + disabledAttr(unavailable || options.busy) + '></label></div>' +
      (options.duties?.length ? '<div class="quick-user-duties">' + options.duties.map(escapeHtml).join(' · ') + '</div>' : '') +
      (options.time ? '<div class="quick-user-time">' + escapeHtml(options.time) + '</div>' : '') +
      (options.note ? '<div class="quick-user-note">' + escapeHtml(options.note) + '</div>' : '') +
      '<div class="quick-user-port-error hidden" role="alert">端口范围为 1～65535</div>' +
      '<div class="quick-user-toolbar" role="group" aria-label="' + escapeHtml(name) + '的常用操作">' + LOGIN_ACTIONS.map((spec) => actionButton(meta, spec, unavailable, options.busy)).join('') + directActions +
      '<button class="quick-user-action quick-user-more-btn" type="button" aria-controls="' + currentMenuId + '" aria-expanded="false" aria-label="' + escapeHtml(name) + '的更多操作" data-card-disabled="false"' + disabledAttr(options.busy) + '><span class="quick-user-action-mark">' + icons.more + '</span><span class="quick-user-action-label">更多</span></button></div>' +
      '<div class="quick-user-more-menu" id="' + currentMenuId + '" popover="manual" hidden role="group" aria-label="' + escapeHtml(name) + '的更多功能">' + REVIEW_ACTIONS.map((spec) => actionButton(meta, spec, unavailable, options.busy, true)).join('') +
      (extras ? '<div class="quick-user-extra-actions">' + extras + '</div>' : '') + '</div>';
  }

  function stateFor(doc) { return documents.get(doc); }
  function closeMenu(card = null, restoreFocus = false, doc = card?.ownerDocument || globalThis.document) {
    const state = doc && stateFor(doc);
    if (!state?.menu || (card && state.card !== card)) return;
    const { menu, trigger } = state;
    if (typeof menu.hidePopover === 'function') { try { menu.hidePopover(); } catch (_) {} }
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    state.card?.classList.remove('is-menu-open');
    state.card = state.menu = state.trigger = null;
    if (restoreFocus && trigger.isConnected) trigger.focus();
  }
  function positionMenu(state) {
    if (!state?.menu || !state.card?.isConnected) return;
    const { card, menu } = state;
    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) { closeMenu(card); return; }
    const view = card.ownerDocument.defaultView;
    const width = Math.min(222, Math.max(0, rect.width - 16), view.innerWidth - 16);
    menu.style.width = width + 'px';
    const left = Math.max(8, Math.min(rect.right - 9 - width, view.innerWidth - width - 8));
    const height = menu.getBoundingClientRect().height;
    const below = rect.bottom - 2;
    const top = below + height <= view.innerHeight - 8 ? below : Math.max(8, rect.top - height + 1);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.maxHeight = Math.max(0, view.innerHeight - 16) + 'px';
  }
  function toggleMenu(card, focusFirst = false) {
    if (!card) return;
    const doc = card.ownerDocument;
    const state = stateFor(doc);
    const trigger = card.querySelector('.quick-user-more-btn');
    const menu = card.querySelector('.quick-user-more-menu');
    if (!state || !menu || trigger?.disabled) return;
    if (state.card === card) { closeMenu(card); return; }
    closeMenu(null, false, doc);
    state.card = card; state.menu = menu; state.trigger = trigger;
    menu.hidden = false;
    if (typeof menu.showPopover === 'function') menu.showPopover();
    trigger.setAttribute('aria-expanded', 'true');
    card.classList.add('is-menu-open');
    positionMenu(state);
    if (focusFirst) menu.querySelector('.quick-user-menu-item:not(:disabled)')?.focus();
  }
  function installEvents(doc) {
    if (!doc?.addEventListener || documents.has(doc)) return;
    const state = { card: null, menu: null, trigger: null };
    documents.set(doc, state);
    doc.addEventListener('click', (event) => {
      const trigger = event.target.closest?.('.quick-user-more-btn');
      if (trigger) {
        event.preventDefault();
        toggleMenu(trigger.closest('.quick-user-card'));
      } else if (state.menu && !event.composedPath().includes(state.menu)) {
        closeMenu(null, false, doc);
      }
      const card = event.target.closest?.('.quick-user-card');
      const selection = card?.querySelector('.quick-row-select');
      if (!selection || selection.disabled || event.defaultPrevented || card.getAttribute('aria-busy') === 'true') return;
      // 卡片空白处沿用姓名按钮的选择动作，表单和各项操作保留自己的点击行为。
      if (event.target.closest?.('button, a, input, select, textarea, label, summary, [role="button"], [contenteditable="true"], .quick-user-more-menu')) return;
      selection.click();
    });
    doc.addEventListener('keydown', (event) => {
      const trigger = event.target.closest?.('.quick-user-more-btn');
      if (trigger && event.key === 'ArrowDown') {
        event.preventDefault();
        if (state.trigger !== trigger) toggleMenu(trigger.closest('.quick-user-card'), true);
        else state.menu?.querySelector('.quick-user-menu-item:not(:disabled)')?.focus();
        return;
      }
      if (!state.menu) return;
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(null, true, doc); return; }
      if (!state.menu.contains(event.target) || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const items = [...state.menu.querySelectorAll('.quick-user-menu-item:not(:disabled)')];
      if (!items.length) return;
      event.preventDefault();
      const current = items.indexOf(doc.activeElement);
      const next = event.key === 'ArrowDown' ? (current + 1) % items.length : (current < 0 ? items.length - 1 : (current + items.length - 1) % items.length);
      items[next].focus();
    }, true); // 先处理卡片菜单的 Escape，再交给工作台的返回快捷键。
    doc.addEventListener('scroll', (event) => { if (state.menu && !state.menu.contains(event.target)) closeMenu(null, false, doc); }, true);
    doc.defaultView?.addEventListener('resize', () => positionMenu(state));
  }

  function syncTarget(container, env, localPort, syncInput = true) {
    if (!container) return;
    const normalizedEnv = normalizeEnv(env);
    const rawPort = String(localPort ?? DEFAULT_DEV_PORT).trim();
    const port = validPort(rawPort) ? normalizePort(rawPort) : rawPort;
    container.dataset.env = normalizedEnv;
    container.dataset.localPort = port;
    const select = container.querySelector('.quick-user-env-select');
    if (select) select.value = normalizedEnv;
    container.querySelector('.quick-user-port-field')?.classList.toggle('hidden', normalizedEnv !== 'local');
    const input = container.querySelector('.quick-user-port');
    if (input && syncInput) input.value = port;
    if (normalizedEnv === 'online' || validPort(port)) {
      container.querySelector('.quick-user-port-error')?.classList.add('hidden');
      input?.setAttribute('aria-invalid', 'false');
    }
    for (const selector of ['.action-btn', '.quick-user-extra-btn']) {
      container.querySelectorAll(selector).forEach((button) => {
        button.dataset.env = normalizedEnv;
        button.dataset.localPort = port;
        if (selector === '.action-btn') button.setAttribute('aria-label', button.dataset.baseLabel + '（' + (normalizedEnv === 'local' ? '本地端口 ' + port : '线上') + '）');
      });
    }
    const state = container.ownerDocument && stateFor(container.ownerDocument);
    if (state?.card === container) positionMenu(state);
  }
  function validateTarget(container) {
    if (!container || container.dataset.env !== 'local') return true;
    const input = container.querySelector('.quick-user-port');
    if (validPort(input?.value)) { syncTarget(container, 'local', normalizePort(input.value)); return true; }
    container.querySelector('.quick-user-port-error')?.classList.remove('hidden');
    input?.setAttribute('aria-invalid', 'true');
    input?.focus();
    return false;
  }
  function markPhoneCopied(button, copied = true) {
    if (!button?.isConnected) return;
    clearTimeout(copyTimers.get(button));
    button.dataset.copied = String(copied);
    button.innerHTML = copied ? icons.check : icons.clipboard;
    if (!copied) return;
    copyTimers.set(button, setTimeout(() => {
      button.dataset.copied = 'false';
      button.innerHTML = icons.clipboard;
      copyTimers.delete(button);
    }, 1600));
  }
  function setSelected(container, selected) {
    container.classList.toggle('active', Boolean(selected));
    container.querySelector('.quick-row-select')?.setAttribute('aria-pressed', String(Boolean(selected)));
    const check = container.querySelector('.quick-user-selected');
    if (check) check.hidden = !selected;
  }
  function setBusy(container, busy) {
    container.querySelectorAll('[data-card-disabled]').forEach((control) => {
      if (!busy && control.dataset.pending === 'true') {
        control.innerHTML = control.__idleHtml;
        control.setAttribute('aria-label', control.__idleLabel);
        control.removeAttribute('aria-busy');
        delete control.dataset.pending;
        delete control.__idleHtml;
        delete control.__idleLabel;
      }
      const disabled = Boolean(busy) || control.dataset.cardDisabled === 'true';
      control.disabled = disabled;
      control.setAttribute('aria-disabled', String(disabled));
    });
  }
  function setActionPending(button) {
    if (!button || button.dataset.pending === 'true') return;
    button.__idleHtml = button.innerHTML;
    button.__idleLabel = button.getAttribute('aria-label') || '';
    button.dataset.pending = 'true';
    button.setAttribute('aria-label', '处理中');
    button.setAttribute('aria-busy', 'true');
    const mark = button.querySelector('.quick-user-action-mark, .quick-user-menu-symbol');
    if (mark) mark.innerHTML = icons.loading;
    const label = button.querySelector('.quick-user-action-label');
    if (label) label.textContent = '处理中';
  }
  function render(container, options, doc = container?.ownerDocument) {
    if (!container) return;
    installEvents(doc);
    container.classList.add('list-item', 'quick-user-card', 'quick-action-row', 'quick-target-container');
    const signature = JSON.stringify(Object.assign({}, options, { busy: undefined, pendingAction: undefined }));
    if (container.dataset.cardSignature !== signature) {
      closeMenu(container);
      container.dataset.cardSignature = signature;
      container.innerHTML = content(options);
      syncTarget(container, options.meta?.env, normalizePort(options.meta?.localPort));
    }
    setBusy(container, options.busy);
    if (options.busy && options.pendingAction) setActionPending(container.querySelector('[data-action="' + options.pendingAction + '"]'));
    setSelected(container, options.selected);
  }
  function create(options, doc = document) {
    const container = doc.createElement('div');
    if (options.className) container.className = options.className;
    render(container, options, doc);
    return container;
  }
  const userCard = { create, render, syncTarget, validateTarget, setSelected, setBusy, setActionPending, toggleMenu, closeMenu, markPhoneCopied, normalizeEnv, normalizePort, icons, DEFAULT_DEV_PORT };
  ns.userCard = userCard;
  if (typeof module !== 'undefined' && module.exports) module.exports = userCard;
})();
