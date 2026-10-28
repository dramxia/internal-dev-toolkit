/* Generated component inspector, isolated world. */

/* ===== src/common/component-settings.js ===== */
/* 组件定位的地址规则、快捷键与设置；扩展各上下文共用。 */
(() => {
  'use strict';
  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});
  const SETTINGS_KEY = 'componentInspectorSettings';
  const TAB_PREFIX = 'componentInspectorTab:';
  const ORIGIN_PREFIX = 'componentInspectorEnabled:';
  const MAX_ORIGINS = 50;
  const DEFAULT_SHORTCUT = Object.freeze({ meta: true, ctrl: false, alt: false, shift: false, code: '' });

  function originOf(value) {
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.origin : '';
    } catch (_) { return ''; }
  }

  function isAllowed(value, extraOrigins = []) {
    const origin = originOf(value);
    if (!origin) return false;
    const hostname = new URL(origin).hostname;
    return ['localhost', '127.0.0.1', '[::1]'].includes(hostname) || extraOrigins.includes(origin);
  }

  function normalizeShortcut(value) {
    const input = value || DEFAULT_SHORTCUT;
    const code = input.code || '';
    if (typeof code !== 'string' || (code && !/^(Key[A-Z]|Digit[0-9]|F([1-9]|1[0-2]))$/.test(code))) {
      throw new Error('快捷键可搭配字母、数字或 F1 至 F12，也可单独使用修饰键');
    }
    const result = { meta: !!input.meta, ctrl: !!input.ctrl, alt: !!input.alt, shift: !!input.shift, code };
    if (!result.meta && !result.ctrl && !result.alt) throw new Error('快捷键请至少包含 Command、Control 或 Option 中的一个');
    return result;
  }

  function shortcutLabel(value) {
    const shortcut = normalizeShortcut(value);
    return [shortcut.meta && '⌘ Command', shortcut.ctrl && '⌃ Control', shortcut.alt && '⌥ Option', shortcut.shift && '⇧ Shift', shortcut.code.replace(/^(Key|Digit)/, '')].filter(Boolean).join(' + ');
  }

  function matchesShortcut(event, shortcut, pressed = new Set()) {
    return !!event.metaKey === shortcut.meta && !!event.ctrlKey === shortcut.ctrl &&
      !!event.altKey === shortcut.alt && !!event.shiftKey === shortcut.shift &&
      (!shortcut.code || pressed.has(shortcut.code) || event.code === shortcut.code);
  }

  function normalizeSettings(value = {}) {
    const origins = [...new Set((Array.isArray(value.origins) ? value.origins : []).map(originOf).filter(Boolean))];
    if (origins.length > MAX_ORIGINS) throw new Error(`最多保存 ${MAX_ORIGINS} 个开发地址，请先移除旧地址`);
    return { origins, openShortcut: normalizeShortcut(value.openShortcut), menuShortcut: normalizeShortcut(value.menuShortcut) };
  }

  async function getSettings() {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    try { return normalizeSettings(data[SETTINGS_KEY]); } catch (_) { return normalizeSettings(); }
  }

  ns.componentSettings = { SETTINGS_KEY, TAB_PREFIX, ORIGIN_PREFIX, MAX_ORIGINS, DEFAULT_SHORTCUT, originOf, isAllowed, normalizeShortcut, shortcutLabel, matchesShortcut, normalizeSettings, getSettings };
  if (typeof module !== 'undefined' && module.exports) module.exports = ns.componentSettings;
})();


/* ===== src/inspector/content.js ===== */
/* 按标签页启用的定位界面。参考 click-to-react-component 的 HOVER / SELECT 交互。 */
(() => {
  'use strict';
  globalThis.__IDT_COMPONENT_INSPECTOR__?.destroy();
  const policy = globalThis.InternalDevToolkit.componentSettings;
  let config, controller, host, shadow, outline, badge, menu, details, list;
  let point = null, target = null, data = null, selected = 0, previousFocus = null;
  let held = false, busy = false, menuOpen = false, epoch = 0, pointerVersion = 0;
  let hoverTimer = null, toastTimer = null, animationFrame = null;
  const pressed = new Set();
  const markers = new Map();

  async function send(type, payload) {
    const response = await chrome.runtime.sendMessage({ type, payload: { ...payload, generation: config.generation } });
    if (!response?.ok) throw new Error(response?.error || '组件定位请求失败');
    return response;
  }
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };

  function ensureOverlay() {
    if (host?.isConnected) return;
    host = node('div');
    host.setAttribute('data-idt-component-overlay', '');
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;';
    shadow = host.attachShadow({ mode: 'open' });
    const style = node('style');
    style.textContent = `
      :host{font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#19261e;color-scheme:light}
      *{box-sizing:border-box} [hidden]{display:none!important}
      .outline{position:fixed;border:2px solid #368b57;background:#368b5710;pointer-events:none;border-radius:3px}
      .badge,.toast{position:fixed;padding:5px 9px;border-radius:5px;background:#1d3928;color:#fff;font:12px/1.5 -apple-system,sans-serif;max-width:min(460px,calc(100vw - 16px));overflow-wrap:anywhere}
      .toast{bottom:18px;left:50%;transform:translateX(-50%);box-shadow:0 4px 18px #0002}
      .menu{position:fixed;pointer-events:auto;width:min(400px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;background:#fcfdfb;border:1px solid #c4d4c7;border-radius:10px;box-shadow:0 8px 32px #14291d30;color:#19261e;font:13px/1.5 -apple-system,sans-serif}
      .head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #e0e8df;font-weight:600}
      button{font:inherit;color:inherit;cursor:pointer;border:0;background:transparent;text-align:left}
      .close{font-size:19px;line-height:1;padding:2px 5px;border-radius:4px}
      .list{padding:5px;max-height:260px;overflow:auto}
      .item{display:block;width:100%;padding:8px;border-radius:6px;overflow-wrap:anywhere}
      .item:hover,.item:focus-visible,.item[aria-selected=true]{background:#e9f1e8;outline:none}
      .item strong{display:block;font-weight:600}.path{display:block;color:#546b5b;font:11px/1.5 ui-monospace,SFMono-Regular,monospace;margin-top:3px}
      .details{margin:0;padding:12px;border-top:1px solid #e0e8df;max-height:220px;overflow:auto;font:11px/1.6 ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
      .foot{padding:8px 12px;border-top:1px solid #e0e8df;font-size:11px;color:#637768}
      button:focus-visible,.details:focus-visible{outline:2px solid #368b57;outline-offset:-2px}
    `;
    shadow.append(style);
    outline = node('div', 'outline'); badge = node('div', 'badge');
    outline.hidden = badge.hidden = true;
    shadow.append(outline, badge);
    document.documentElement.append(host);
  }

  function removeOverlay() {
    host?.remove(); host = shadow = outline = badge = menu = details = list = null;
  }
  function cleanupInteraction(restoreFocus = true) {
    epoch++;
    clearTimeout(hoverTimer); clearTimeout(toastTimer); cancelAnimationFrame(animationFrame);
    hoverTimer = toastTimer = animationFrame = null;
    const focus = previousFocus;
    previousFocus = null;
    menuOpen = held = busy = false;
    data = target = null;
    for (const [marker, element] of markers) element.removeAttribute(marker);
    markers.clear();
    removeOverlay();
    if (restoreFocus && focus?.isConnected) focus.focus?.({ preventScroll: true });
  }
  function notify(message) {
    ensureOverlay();
    shadow.querySelector('.toast')?.remove();
    const toast = node('div', 'toast', message);
    toast.setAttribute('role', 'status');
    shadow.append(toast);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.remove(); if (!held && !menuOpen) removeOverlay(); }, 3200);
  }

  function showRect(rect, text = '') {
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    ensureOverlay();
    outline.hidden = false;
    Object.assign(outline.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    badge.textContent = text || '正在识别组件…'; badge.hidden = false;
    Object.assign(badge.style, { left: `${Math.max(8, Math.min(rect.x, innerWidth - 210))}px`, top: `${Math.max(8, rect.y > 30 ? rect.y - 29 : rect.y + Math.min(rect.height, innerHeight - rect.y - 35) + 3)}px` });
  }

  async function hover() {
    if (!held || menuOpen || !point) return;
    const version = pointerVersion, interaction = epoch;
    try {
      const result = await send('COMPONENT_INSPECT', { ...point, details: false });
      if (!held || menuOpen || interaction !== epoch || version !== pointerVersion) return;
      if (result.components.length) showRect(result.rect, `${result.components[0].framework} · ${result.components[0].name}`);
      else { outline && (outline.hidden = true); badge && (badge.hidden = true); }
    } catch (error) {
      if (interaction === epoch) { cleanupInteraction(false); notify(error.message); }
    }
  }
  function scheduleHover() {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(hover, 70);
  }
  function hot(event, shortcut) { return policy.matchesShortcut(event, shortcut, pressed); }
  function anyHot(event) { return hot(event, config.openShortcut) || hot(event, config.menuShortcut); }
  function ownEvent(event) { return event.composedPath().includes(host); }
  function consume(event) { event.preventDefault(); event.stopImmediatePropagation(); }

  function onMove(event) {
    if (!event.isTrusted || ownEvent(event) || menuOpen || busy) return;
    point = { x: event.clientX, y: event.clientY };
    target = event.composedPath()[0]; pointerVersion++;
    if (!anyHot(event)) {
      if (held) cleanupInteraction(false);
      return;
    }
    held = true;
    if (target?.getBoundingClientRect) showRect(target.getBoundingClientRect());
    scheduleHover();
  }

  function onKeyDown(event) {
    if (!event.isTrusted) return;
    pressed.add(event.code);
    if (menuOpen) {
      if (event.key === 'Escape') { consume(event); cleanupInteraction(); return; }
      if (!data?.components.length) return;
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        consume(event);
        const count = data.components.length;
        selected = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (selected + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
        selectItem(true); return;
      }
      if (event.key === 'ArrowRight') { consume(event); details.hidden = false; details.focus(); return; }
      if (event.key === 'ArrowLeft') { consume(event); details.hidden = true; selectItem(true); return; }
      if (event.key === 'Enter' && event.composedPath()[0]?.className !== 'close') { consume(event); openSelected(selected); return; }
      if (event.key === 'Tab') {
        const buttons = [...menu.querySelectorAll('button')];
        const index = buttons.indexOf(shadow.activeElement);
        consume(event); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
      }
      return;
    }
    if (event.key === 'Escape') { cleanupInteraction(); return; }
    if (anyHot(event)) { held = true; if (point) scheduleHover(); }
  }
  function onKeyUp(event) {
    pressed.delete(event.code);
    if (['Meta', 'Control', 'Alt'].includes(event.key)) pressed.clear();
    if (!menuOpen && !busy && !anyHot(event)) cleanupInteraction(false);
  }

  function selectItem(focus) {
    if (!list || !data) return;
    [...list.children].forEach((button, index) => {
      button.setAttribute('aria-selected', String(index === selected));
      if (focus && index === selected) button.focus({ preventScroll: true });
    });
    const component = data.components[selected];
    details.textContent = `组件参数（props）\n\n${JSON.stringify(component.props || {}, null, 2)}`;
  }
  function makeMenu() {
    ensureOverlay();
    previousFocus = document.activeElement;
    menuOpen = true; held = false;
    menu = node('section', 'menu'); menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', '组件与父组件');
    const heading = node('div', 'head', '组件与父组件');
    const close = node('button', 'close', '×'); close.setAttribute('aria-label', '关闭组件菜单'); close.type = 'button';
    close.addEventListener('click', () => cleanupInteraction()); heading.append(close);
    list = node('div', 'list'); list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', '选择组件');
    list.append(node('div', 'foot', '正在读取组件和源码位置…'));
    details = node('pre', 'details'); details.hidden = true; details.tabIndex = 0;
    menu.append(heading, list, details, node('div', 'foot', '↑↓ 选择 · → 参数 · ← 收起 · Enter 打开 · Esc 关闭'));
    Object.assign(menu.style, { left: `${Math.max(8, Math.min(point.x + 8, innerWidth - Math.min(400, innerWidth - 16) - 8))}px`, top: `${Math.max(8, Math.min(point.y + 8, innerHeight - 340))}px` });
    shadow.append(menu); close.focus({ preventScroll: true });
  }
  function fillMenu() {
    list.replaceChildren();
    if (!data.components.length) { list.append(node('div', 'foot', '此元素暂未找到 React／Vue 组件')); return; }
    data.components.forEach((component, index) => {
      const button = node('button', 'item'); button.type = 'button'; button.setAttribute('role', 'option');
      button.append(node('strong', '', `${component.framework} · ${component.name}`));
      const source = component.source;
      button.append(node('span', 'path', source?.file ? `${source.file}${source.line ? `:${source.line}${source.column ? `:${source.column}` : ''}` : ' · 文件定位'}` : '暂未提供源码位置'));
      button.addEventListener('mouseenter', () => { selected = index; selectItem(false); });
      button.addEventListener('focus', () => { selected = index; selectItem(false); });
      button.addEventListener('click', () => openSelected(index));
      button.addEventListener('dblclick', (event) => event.preventDefault());
      list.append(button);
    });
    selected = 0; selectItem(true);
  }

  async function openSelected(index) {
    if (busy || !data) return;
    if (!data.components[index]?.source?.file) { notify('此组件暂未提供源码位置，可查看父组件'); return; }
    busy = true;
    const interaction = epoch;
    try {
      const result = await send('COMPONENT_OPEN', { snapshotId: data.snapshotId, index });
      if (interaction !== epoch) return;
      cleanupInteraction();
      notify(`已发送到 ${result.editor} · ${result.precision === 'line' ? `第 ${result.line} 行` : '文件定位'}`);
    } catch (error) {
      if (interaction === epoch) notify(error.message);
    } finally { if (interaction === epoch) busy = false; }
  }

  async function select(event, showMenu) {
    if (!event.isTrusted || ownEvent(event)) return;
    if (menuOpen) { if (!ownEvent(event)) { consume(event); cleanupInteraction(); } return; }
    if (!hot(event, showMenu ? config.menuShortcut : config.openShortcut)) return;
    consume(event);
    if (busy) return;
    point = { x: event.clientX, y: event.clientY };
    const element = event.composedPath()[0];
    const marker = `data-idt-query-${crypto.randomUUID().replaceAll('-', '')}`;
    if (!(element instanceof Element)) return;
    element.setAttribute(marker, ''); markers.set(marker, element);
    const interaction = ++epoch;
    busy = true;
    if (showMenu) makeMenu();
    try {
      const result = await send('COMPONENT_INSPECT', { ...point, marker, details: true });
      if (interaction !== epoch) return;
      data = result; busy = false;
      if (showMenu) fillMenu();
      else {
        const index = result.components.findIndex((component) => component.source?.file);
        if (index < 0) { cleanupInteraction(false); notify('此元素暂未提供源码位置，可按快捷键加右键查看组件'); }
        else await openSelected(index);
      }
    } catch (error) { if (interaction === epoch) { cleanupInteraction(false); notify(error.message); } }
    finally { element.removeAttribute(marker); markers.delete(marker); if (interaction === epoch) busy = false; }
  }

  function guardPointer(event) {
    if (!event.isTrusted || ownEvent(event)) return;
    if (menuOpen) { consume(event); if (event.type === 'pointerdown') cleanupInteraction(); return; }
    if ((event.button === 0 && hot(event, config.openShortcut)) || (event.button === 2 && hot(event, config.menuShortcut))) consume(event);
  }
  function reposition() {
    if (menuOpen) return;
    if (!held || !target?.isConnected) { if (held) cleanupInteraction(false); return; }
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(() => { if (held && target?.isConnected) showRect(target.getBoundingClientRect(), badge?.textContent); });
  }

  function destroy() {
    controller?.abort(); controller = null;
    cleanupInteraction(false); point = null; pressed.clear(); config = null;
    delete globalThis.__IDT_COMPONENT_INSPECTOR__;
  }
  function start(value) {
    if (location.origin !== value.origin) { destroy(); return; }
    controller?.abort(); cleanupInteraction(false);
    config = value; controller = new AbortController();
    const capture = { capture: true, signal: controller.signal };
    window.addEventListener('mousemove', onMove, capture);
    window.addEventListener('keydown', onKeyDown, capture);
    window.addEventListener('keyup', onKeyUp, capture);
    window.addEventListener('click', (event) => select(event, false), capture);
    window.addEventListener('contextmenu', (event) => select(event, true), capture);
    for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'auxclick']) window.addEventListener(type, guardPointer, capture);
    window.addEventListener('scroll', reposition, { ...capture, passive: true });
    window.addEventListener('resize', reposition, capture);
    window.addEventListener('blur', () => { pressed.clear(); cleanupInteraction(false); }, capture);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { pressed.clear(); cleanupInteraction(false); } }, capture);
    window.addEventListener('pagehide', destroy, capture);
  }
  globalThis.__IDT_COMPONENT_INSPECTOR__ = {
    start, destroy,
    isRunning(value) { return !!controller && !controller.signal.aborted && config?.origin === value.origin && config?.generation === value.generation; },
    resetInteraction() { pressed.clear(); point = null; cleanupInteraction(false); },
  };
})();
