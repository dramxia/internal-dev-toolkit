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
    return { origins, clickAction: value.clickAction === 'copy' ? 'copy' : 'open', openShortcut: normalizeShortcut(value.openShortcut), menuShortcut: normalizeShortcut(value.menuShortcut) };
  }

  async function getSettings() {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    try { return normalizeSettings(data[SETTINGS_KEY]); } catch (_) { return normalizeSettings(); }
  }

  ns.componentSettings = { SETTINGS_KEY, TAB_PREFIX, ORIGIN_PREFIX, MAX_ORIGINS, DEFAULT_SHORTCUT, originOf, isAllowed, normalizeShortcut, shortcutLabel, matchesShortcut, normalizeSettings, getSettings };
  if (typeof module !== 'undefined' && module.exports) module.exports = ns.componentSettings;
})();


/* ===== src/inspector/content.js ===== */
/* 按标签页启用的定位界面。样式与交互沿用 click-to-react-component，主题色改为绿色。
 * Copyright (c) 2022 Eric Clemmons, MIT；见 THIRD_PARTY_NOTICES.md。
 */
(() => {
  'use strict';
  globalThis.__IDT_COMPONENT_INSPECTOR__?.destroy();
  const policy = globalThis.InternalDevToolkit.componentSettings;
  let config, controller, host, shadow, menu, list, arrow;
  let point = null, target = null, highlighted = null, data = null, selected = -1, previousFocus = null;
  let held = false, busy = false, menuOpen = false, epoch = 0;
  let toastTimer = null, animationFrame = null, indicatorFrame = null, restoreScroll = null;
  let indicatorState = null;
  let menuEntries = [];
  const pressed = new Set();
  const markers = new Map();
  const indicatorStyles = new Map();

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
    const pageStyle = getComputedStyle(document.body);
    host.style.setProperty('font-family', pageStyle.fontFamily, 'important');
    host.style.setProperty('line-height', pageStyle.lineHeight, 'important');
    shadow = host.attachShadow({ mode: 'open' });
    const style = node('style');
    style.textContent = `
      :host{color-scheme:light}
      *{box-sizing:border-box} [hidden]{display:none!important}
      .toast{position:fixed;padding:5px 9px;border-radius:5px;background:#1d3928;color:#fff;font:12px/1.5 -apple-system,sans-serif;max-width:min(460px,calc(100vw - 16px));overflow-wrap:anywhere}
      .toast{bottom:18px;left:50%;transform:translateX(-50%);box-shadow:0 4px 18px #0002}
      .backdrop{position:fixed;inset:0;pointer-events:auto}
      .menu{all:unset;box-sizing:border-box;position:fixed;outline:0;background:#fff;color:#000;font-weight:bold;overflow:visible;padding:5px;font-size:13px;border-radius:6px;border:none;pointer-events:auto;
        --shadow-elevation-medium:0px 1px 0.8px rgb(0 0 0 / 11%),0px 1.5px 1.1px -1.7px rgb(0 0 0 / 8%),0px 5.1px 3.8px -3.3px rgb(0 0 0 / 5%),0px 15px 11.3px -5px rgb(0 0 0 / 3%);
        box-shadow:0px 1px 0.8px rgb(0 0 0 / 10%),0px 1.1px 0.8px -0.7px rgb(0 0 0 / 9%),0px 2.1px 1.6px -1.4px rgb(0 0 0 / 7%),0px 4.9px 3.7px -2.1px rgb(0 0 0 / 6%),0px 10.1px 7.6px -2.9px rgb(0 0 0 / 5%),0px 18.9px 14.2px -3.6px rgb(0 0 0 / 4%),0px 31.9px 23.9px -4.3px rgb(0 0 0 / 2%),0px 50px 37.5px -5px rgb(0 0 0 / 1%);
        filter:drop-shadow(0px 0px 0.5px rgb(0 0 0 / 50%))}
      .list{margin:0;max-height:calc(100vh - 10px);overflow-y:auto}
      .item{all:unset;outline:0;display:flex;flex-direction:column;width:100%;padding:5px;border-radius:4px;font-size:13px;max-width:50vw;box-sizing:border-box}
      .item:focus,.item:not([disabled]):active{cursor:pointer;background:#368b57;color:#fff;box-shadow:var(--shadow-elevation-medium)}
      .item:focus code,.item:not([disabled]):active code{color:#fff}
      .item>*+*{margin-top:3px}
      .item code{color:#368b57;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
      .item code var{background:rgb(0 0 0 / 5%);cursor:help;border-radius:3px;padding:3px 6px;font-style:normal;font-weight:normal;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif}
      .path{font-weight:normal;font-style:normal;font-size:11px;opacity:.5;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
      .path data::after{content:attr(value);float:right;padding-left:15px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .arrow{position:absolute;background:inherit;width:8px;height:8px;transform:rotate(45deg);pointer-events:none}
      .empty{padding:5px;font-weight:normal}
    `;
    shadow.append(style);
    document.documentElement.append(host);
  }

  function showIndicator() {
    cancelAnimationFrame(indicatorFrame); indicatorFrame = null;
    if (!(target instanceof Element) || !target.isConnected) { clearIndicator(); return; }
    ensureOverlay();
    const state = menuOpen ? 'SELECT' : 'HOVER';
    if (highlighted !== target) {
      highlighted?.removeAttribute('data-idt-component-target');
      target.setAttribute('data-idt-component-target', state);
    } else if (indicatorState !== state) target.setAttribute('data-idt-component-target', state);
    highlighted = target;
    // 这个属性影响整页的指针样式，只在进入选择或切换菜单时更新。
    if (indicatorState !== state) document.documentElement.setAttribute('data-idt-component-state', state);
    indicatorState = state;
    let root = target.getRootNode();
    while (root) {
      if (!indicatorStyles.has(root)) {
        const style = node('style');
        style.textContent = `${root === document ? '[data-idt-component-state] *' : '*'}{pointer-events:auto!important}
          [data-idt-component-target]{cursor:context-menu!important;outline:#368b57 auto 1px!important}`;
        (root === document ? document.documentElement : root).append(style);
        indicatorStyles.set(root, style);
      }
      root = root.host?.getRootNode();
    }
  }
  function clearIndicator() {
    highlighted?.removeAttribute('data-idt-component-target'); highlighted = null;
    if (indicatorState !== null) document.documentElement.removeAttribute('data-idt-component-state');
    indicatorState = null;
    for (const style of indicatorStyles.values()) style.remove();
    indicatorStyles.clear();
  }
  function lockScroll() {
    const saved = [];
    const gutter = innerWidth - document.documentElement.clientWidth;
    const save = (element, name, value) => {
      saved.push([element, name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]);
      element.style.setProperty(name, value, 'important');
    };
    if (gutter > 0) save(document.body, 'padding-right', `${parseFloat(getComputedStyle(document.body).paddingRight) + gutter}px`);
    save(document.body, 'overflow', 'hidden');
    save(document.documentElement, 'overflow', 'hidden');
    restoreScroll = () => {
      for (const [element, name, value, priority] of saved) {
        if (value) element.style.setProperty(name, value, priority);
        else element.style.removeProperty(name);
      }
    };
  }
  function removeOverlay() {
    host?.remove(); host = shadow = menu = list = arrow = null;
  }
  function cleanupInteraction(restoreFocus = true) {
    epoch++;
    clearTimeout(toastTimer); cancelAnimationFrame(animationFrame); cancelAnimationFrame(indicatorFrame);
    toastTimer = animationFrame = indicatorFrame = null;
    const focus = previousFocus;
    previousFocus = null;
    menuOpen = held = busy = false;
    data = null; menuEntries = []; selected = -1;
    clearIndicator();
    restoreScroll?.(); restoreScroll = null;
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

  function hot(event, shortcut) { return policy.matchesShortcut(event, shortcut, pressed); }
  function anyHot(event) { return hot(event, config.openShortcut) || hot(event, config.menuShortcut); }
  function ownEvent(event) { return event.composedPath().includes(host); }
  function consume(event) { event.preventDefault(); event.stopImmediatePropagation(); }

  function onMove(event) {
    if (!event.isTrusted || ownEvent(event) || menuOpen || busy) return;
    point = { x: event.clientX, y: event.clientY };
    target = event.composedPath()[0];
    if (!anyHot(event)) {
      if (held) cleanupInteraction(false);
      return;
    }
    if (!held) { held = true; showIndicator(); return; }
    // 同一帧里经过多个元素时，只绘制最终目标；停留在同一元素时无需写入页面。
    if (target !== highlighted && indicatorFrame === null) {
      indicatorFrame = requestAnimationFrame(() => {
        indicatorFrame = null;
        if (held && !menuOpen && !busy) showIndicator();
      });
    }
  }

  function onKeyDown(event) {
    if (!event.isTrusted) return;
    pressed.add(event.code);
    if (menuOpen) {
      if (event.key === 'Escape') { consume(event); cleanupInteraction(); return; }
      if (!menuEntries.length) { if (event.key === 'Tab') consume(event); return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        consume(event);
        const count = menuEntries.length;
        selected = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : selected < 0 ? (event.key === 'ArrowDown' ? 0 : count - 1) : Math.max(0, Math.min(count - 1, selected + (event.key === 'ArrowDown' ? 1 : -1)));
        selectItem(true, true); return;
      }
      if (event.key === 'Enter' && selected >= 0) { consume(event); openSelected(menuEntries[selected].index); return; }
      if (event.key === 'Tab') {
        const buttons = [...list.children];
        const index = buttons.indexOf(shadow.activeElement);
        consume(event); buttons[(index < 0 ? (event.shiftKey ? buttons.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length)]?.focus();
      }
      return;
    }
    if (event.key === 'Escape') { cleanupInteraction(); return; }
    if (anyHot(event)) { held = true; showIndicator(); }
  }
  function onKeyUp(event) {
    pressed.delete(event.code);
    if (['Meta', 'Control', 'Alt'].includes(event.key)) pressed.clear();
    if (held && !menuOpen && !busy && !anyHot(event)) cleanupInteraction(false);
  }

  function selectItem(focus, scroll = false) {
    if (!list || !data) return;
    [...list.children].forEach((button, index) => {
      button.tabIndex = index === selected ? 0 : -1;
      if (focus && index === selected && shadow.activeElement !== button) button.focus({ preventScroll: true });
    });
    if (scroll) list.children[selected]?.scrollIntoView({ block: 'nearest' });
  }
  function positionMenu() {
    if (!menu || !point) return;
    const { width, height } = menu.getBoundingClientRect();
    const right = innerWidth - point.x - 5;
    const left = point.x - 5;
    const placement = width <= right || right >= left ? 'right' : 'left';
    const x = Math.max(0, Math.min(innerWidth - width, placement === 'right' ? point.x + 5 : point.x - width - 5));
    const y = Math.max(0, Math.min(innerHeight - height, point.y - height / 2));
    Object.assign(menu.style, { left: `${x}px`, top: `${y}px` });
    menu.dataset.placement = placement;
    Object.assign(arrow.style, { left: placement === 'right' ? '-4px' : '', right: placement === 'left' ? '-4px' : '', top: `${Math.max(4, Math.min(height - 12, point.y - y - 4))}px` });
  }
  function makeMenu() {
    ensureOverlay();
    previousFocus ||= document.activeElement;
    menuOpen = true; held = false;
    showIndicator();
    const backdrop = node('div', 'backdrop');
    menu = node('dialog', 'menu'); menu.open = true; menu.tabIndex = -1;
    menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', '组件与父组件');
    list = node('form', 'list'); list.method = 'dialog';
    list.addEventListener('submit', (event) => event.preventDefault());
    list.append(node('div', 'empty', '正在读取组件和源码位置…'));
    arrow = node('div', 'arrow'); arrow.setAttribute('aria-hidden', 'true');
    menu.append(list, arrow); backdrop.append(menu); shadow.append(backdrop);
    backdrop.addEventListener('pointerdown', (event) => { if (!event.composedPath().includes(menu)) { consume(event); cleanupInteraction(); } });
    backdrop.addEventListener('contextmenu', (event) => event.preventDefault());
    lockScroll(); positionMenu(); menu.focus({ preventScroll: true });
  }
  function fillMenu() {
    list.replaceChildren();
    menuEntries = data.components.map((component, index) => ({ component, index })).filter(({ component }) => component.source?.file);
    if (!menuEntries.length) { list.append(node('div', 'empty', '此元素暂未提供组件源码位置')); positionMenu(); return; }
    menuEntries.forEach(({ component, index: componentIndex }, index) => {
      const button = node('button', 'item'); button.type = 'submit'; button.tabIndex = -1; button.setAttribute('role', 'menuitem');
      const code = node('code', '', `<${component.name}`);
      for (const [name, value] of Object.entries(component.props || {})) {
        const prop = node('var', '', name);
        prop.title = String(value);
        code.append(document.createTextNode(' '), prop);
      }
      code.append(document.createTextNode('>'));
      button.append(code);
      const source = component.source;
      const path = node('cite', 'path');
      const file = node('data', '', source.file.replace(/.*(src|pages)/, '$1'));
      file.value = source.line ? `${source.line}${source.column ? `:${source.column}` : ''}` : '文件定位';
      path.append(file); button.append(path);
      button.addEventListener('mousemove', () => { if (selected !== index) { selected = index; selectItem(true); } });
      button.addEventListener('focus', () => { if (selected !== index) { selected = index; selectItem(false); } });
      button.addEventListener('click', (event) => { event.preventDefault(); openSelected(componentIndex); });
      button.addEventListener('dblclick', (event) => event.preventDefault());
      list.append(button);
    });
    selected = -1; positionMenu();
  }

  async function openSelected(index, action = 'open') {
    if (busy || !data) return;
    if (!data.components[index]?.source?.file) { notify('此组件暂未提供源码位置，可查看父组件'); return; }
    busy = true;
    const interaction = epoch;
    try {
      const result = await send(action === 'copy' ? 'COMPONENT_COPY' : 'COMPONENT_OPEN', { snapshotId: data.snapshotId, index });
      if (interaction !== epoch) return;
      cleanupInteraction();
      if (action === 'copy') notify(`已复制：${result.location}`);
    } catch (error) {
      if (interaction === epoch) {
        if (action === 'copy') cleanupInteraction(false);
        notify(error.message);
      }
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
    target = element; held = true; showIndicator();
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
        else await openSelected(index, config.clickAction);
      }
    } catch (error) { if (interaction === epoch) { cleanupInteraction(false); notify(error.message); } }
    finally { element.removeAttribute(marker); markers.delete(marker); if (interaction === epoch) busy = false; }
  }

  function guardPointer(event) {
    if (!event.isTrusted || ownEvent(event)) return;
    if (menuOpen) { consume(event); if (event.type === 'pointerdown') cleanupInteraction(); return; }
    if ((event.button === 0 && hot(event, config.openShortcut)) || (event.button === 2 && hot(event, config.menuShortcut))) {
      if (event.type === 'pointerdown' && event.button === 2) previousFocus = document.activeElement;
      consume(event);
    }
  }
  function reposition() {
    if (!menuOpen) { if (held && !target?.isConnected) cleanupInteraction(false); return; }
    if (animationFrame === null) animationFrame = requestAnimationFrame(() => {
      animationFrame = null;
      positionMenu();
    });
  }

  function destroy() {
    controller?.abort(); controller = null;
    cleanupInteraction(false); point = target = null; pressed.clear(); config = null;
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
    window.addEventListener('blur', (event) => { if (event.target === window) { pressed.clear(); if (!menuOpen && !busy) cleanupInteraction(false); } }, capture);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { pressed.clear(); if (!menuOpen && !busy) cleanupInteraction(false); } }, capture);
    window.addEventListener('pagehide', destroy, capture);
  }
  globalThis.__IDT_COMPONENT_INSPECTOR__ = {
    start, destroy,
    isRunning(value) { return !!controller && !controller.signal.aborted && config?.origin === value.origin && config?.generation === value.generation; },
    resetInteraction() { pressed.clear(); point = target = null; cleanupInteraction(false); },
  };
})();
