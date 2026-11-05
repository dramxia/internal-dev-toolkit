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
  const TASK_EDITORS = Object.freeze([{ id: 'chatgpt', name: 'ChatGPT' }]);
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
    const clickAction = value.clickAction === 'chatgpt' ? 'agent' : value.clickAction;
    return {
      origins,
      clickAction: ['copy', 'agent'].includes(clickAction) ? clickAction : 'open',
      taskEditor: TASK_EDITORS.some((editor) => editor.id === value.taskEditor) ? value.taskEditor : 'chatgpt',
      autoSend: value.autoSend !== false,
      openShortcut: normalizeShortcut(value.openShortcut),
      menuShortcut: normalizeShortcut(value.menuShortcut),
    };
  }

  async function getSettings() {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    try { return normalizeSettings(data[SETTINGS_KEY]); } catch (_) { return normalizeSettings(); }
  }

  ns.componentSettings = { SETTINGS_KEY, TAB_PREFIX, ORIGIN_PREFIX, MAX_ORIGINS, TASK_EDITORS, DEFAULT_SHORTCUT, originOf, isAllowed, normalizeShortcut, shortcutLabel, matchesShortcut, normalizeSettings, getSettings };
  if (typeof module !== 'undefined' && module.exports) module.exports = ns.componentSettings;
})();


/* ===== src/inspector/content.js ===== */
/* 按标签页启用的定位界面。样式与交互沿用 click-to-react-component，主题色改为绿色。
 * Copyright (c) 2022 Eric Clemmons, MIT；见 THIRD_PARTY_NOTICES.md。
 */
(() => {
  'use strict';
  const REPLACE_EVENT = 'idt-component-inspector-replace';
  // 扩展重载后会进入新的脚本环境，通过页面事件通知旧环境释放菜单和监听器。
  window.dispatchEvent(new Event(REPLACE_EVENT));
  globalThis.__IDT_COMPONENT_INSPECTOR__?.destroy();
  const policy = globalThis.InternalDevToolkit.componentSettings;
  let config, controller, host, shadow, menu, list, arrow;
  let point = null, target = null, highlighted = null, data = null, selected = -1, previousFocus = null;
  let held = false, busy = false, menuOpen = false, epoch = 0;
  let toastTimer = null, animationFrame = null, indicatorFrame = null, restoreScroll = null;
  let indicatorState = null;
  let menuEntries = [];
  let draftInput = null, draftStatus = null, draftIndex = -1;
  let draftControls = null;
  let draftPosition = null, draftDrag = null, draftResizeObserver = null;
  const pressed = new Set();
  const markers = new Map();
  const indicatorStyles = new Map();

  function contextActive() {
    if (chrome.runtime.id) return true;
    destroy();
    return false;
  }

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
  function draftIcon(name) {
    const paths = {
      turn: ['M15 14l5-5-5-5', 'M4 20v-7a4 4 0 0 1 4-4h12'],
      close: ['M18 6 6 18', 'm6 6 12 12'],
      copy: ['M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z', 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'],
      check: ['M20 6 9 17l-5-5'],
      send: ['M7 7h10v10', 'M7 17 17 7'],
      success: ['M9 12l2 2 4-4', 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'],
    };
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) icon.setAttribute(key, value);
    for (const d of paths[name]) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d); icon.append(path);
    }
    return icon;
  }

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
      /* 任务浮框与 popup.html 的 panel、sage、text、border、error 和 shadow-md 保持一致。 */
      .draft,.draft-toast{--draft-paper:#FDFEFC;--draft-soft:#F0F5EE;--draft-ink:#1C2E20;--draft-text:#46584B;--draft-muted:#72826F;--draft-line:rgba(74,124,89,.12);--draft-green:#4A7C59;--draft-green-hover:#3F6B4E;--draft-green-ink:#FAFCF8;--draft-tint:#EAF2E8;--draft-error:#B0552F;--draft-shadow:0 2px 6px rgba(28,46,32,.04),0 18px 40px rgba(74,124,89,.10);color-scheme:light;
        font:400 13px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
      .menu.draft{width:min(406px,calc(100vw - 24px));padding:17px 20px 15px;max-height:calc(100vh - 24px);overflow:auto;border:1px solid var(--draft-line);border-radius:22px;background:var(--draft-paper);color:var(--draft-ink);box-shadow:var(--draft-shadow);filter:none}
      .draft>.arrow{display:none}.draft .list{max-height:none;overflow:visible}
      .draft button,.draft textarea{font:inherit}.draft button{cursor:pointer;-webkit-tap-highlight-color:transparent}.draft button:disabled{cursor:not-allowed}
      .draft button:focus-visible,.draft textarea:focus-visible{outline:2px solid var(--draft-green-hover);outline-offset:3px}
      .draft-top{display:flex;align-items:center;gap:8px;min-width:0;cursor:grab;user-select:none;touch-action:none}
      .draft[data-dragging] .draft-top{cursor:grabbing}
      .draft-title{flex:1;margin:0;font:500 14px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
      .draft-icon{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9px;background:var(--draft-tint);color:var(--draft-green);flex-shrink:0}
      .draft-icon-button{display:inline-flex;flex:0 0 auto;align-items:center;justify-content:center;border:0;width:30px;height:30px;padding:0;border-radius:10px;background:transparent;color:var(--draft-muted)}
      .draft-icon-button:hover{background:var(--draft-soft);color:var(--draft-green-hover)}
      .draft-context{margin:14px 0 10px;display:grid;gap:8px;min-width:0}
      .draft-source-heading{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .draft-component{min-width:0;overflow-wrap:anywhere;padding:3px 8px;border-radius:6px;background:var(--draft-soft);color:var(--draft-ink);font:500 12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
      .draft-address-row{display:grid;grid-template-columns:minmax(0,1fr) 28px;align-items:start;gap:8px;padding:10px 8px 10px 12px;border-radius:11px;background:var(--draft-soft)}
      .draft-source{padding:0;border:0;border-radius:4px;background:transparent;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;color:var(--draft-text);font:400 11px/1.75 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
      .draft-copy{width:28px;height:28px;border-radius:8px;margin-top:-4px;position:relative}.draft-copy:hover{background:var(--draft-paper)}
      .draft-copy[data-copied="true"]{color:var(--draft-green)}.draft-copy>span{display:inline-flex}.draft-copy svg{width:14px;height:14px}
      .draft-copy-feedback{min-height:18px;flex-shrink:0;font-size:11px;line-height:1.6;color:var(--draft-green);text-align:right}
      .draft-copy-feedback[data-kind="manual"]{color:var(--draft-muted)}
      .draft-copy::after{content:attr(data-tooltip);position:absolute;bottom:calc(100% + 8px);right:0;white-space:nowrap;padding:6px 10px;border-radius:14px;background:var(--draft-ink);color:var(--draft-paper);font:500 12px/1.5 -apple-system,sans-serif;pointer-events:none;visibility:hidden}
      .draft-copy:hover::after,.draft-copy:focus-visible::after{visibility:visible}
      .draft textarea{display:block;width:100%;min-width:0;min-height:112px;padding:9px 0;resize:none;border:0;border-radius:10px;background:var(--draft-paper);color:var(--draft-ink);line-height:1.5;caret-color:var(--draft-green)}
      .draft textarea::placeholder{color:var(--draft-muted);opacity:.85}.draft textarea:read-only{opacity:.7}
      .draft-status-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .draft-status{flex:1;margin:0;color:var(--draft-text);font-size:12px;line-height:1.6;overflow-wrap:anywhere}.draft-status[data-kind="error"]{color:var(--draft-error)}
      .draft-length{margin-top:10px;color:var(--draft-muted);font-size:11px;font-variant-numeric:tabular-nums}
      .draft-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--draft-line);margin-top:13px;padding-top:13px}
      .draft-hint{font-size:11px;color:var(--draft-muted);line-height:1.65}.draft-hint span{display:block}
      .draft button.draft-send{display:inline-flex;justify-content:center;align-items:center;gap:7px;min-height:34px;padding:7px 14px;border:0;border-radius:11px;background:var(--draft-green);color:var(--draft-green-ink);font-weight:400;white-space:nowrap;transition:background .16s ease,color .16s ease,opacity .16s ease,transform .16s ease}
      .draft-send:hover:not(:disabled){background:var(--draft-green-hover)}.draft-send:active{transform:translateY(1px)}.draft-send:disabled{opacity:.4}
      .toast.draft-toast{display:flex;align-items:flex-start;gap:9px;width:max-content;max-width:min(520px,calc(100vw - 32px));padding:11px 16px;background:var(--draft-paper);color:var(--draft-ink);border:1px solid var(--draft-line);border-radius:14px;box-shadow:var(--draft-shadow);font-size:12px}
      .draft-toast svg{margin-top:2px;color:var(--draft-green);flex:0 0 auto}
      @media(pointer:coarse){.draft textarea{font-size:16px}.draft .draft-icon-button,.draft button.draft-send{min-width:44px;min-height:44px}.draft-address-row{grid-template-columns:minmax(0,1fr) 44px}}
      @media(prefers-reduced-motion:reduce){.draft *{transition:none!important}}
    `;
    shadow.append(style);
    document.documentElement.append(host);
  }

  function showIndicator() {
    cancelAnimationFrame(indicatorFrame); indicatorFrame = null;
    if (!(target instanceof Element) || !target.isConnected) { clearIndicator(); return; }
    ensureOverlay();
    const state = draftInput ? 'DRAFT' : menuOpen ? 'SELECT' : 'HOVER';
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
          [data-idt-component-target]{cursor:context-menu!important;outline:#368b57 auto 1px!important}
          [data-idt-component-target="DRAFT"]{outline:2px solid #368b57!important;outline-offset:2px!important}`;
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
  function cleanupInteraction(restoreFocus = true, { keepToast = false } = {}) {
    epoch++;
    const toast = keepToast && shadow?.querySelector('.toast');
    if (!toast) { clearTimeout(toastTimer); toastTimer = null; }
    cancelAnimationFrame(animationFrame); cancelAnimationFrame(indicatorFrame);
    animationFrame = indicatorFrame = null;
    stopDraftDrag(); draftPosition = null;
    draftResizeObserver?.disconnect(); draftResizeObserver = null;
    const focus = previousFocus;
    previousFocus = null;
    menuOpen = held = busy = false;
    data = null; menuEntries = []; selected = -1;
    draftInput = draftStatus = null; draftIndex = -1;
    clearTimeout(draftControls?.copyTimer); draftControls = null;
    clearIndicator();
    restoreScroll?.(); restoreScroll = null;
    for (const [marker, element] of markers) element.removeAttribute(marker);
    markers.clear();
    if (toast) {
      // 松开快捷键只结束高亮，提示沿用原来的倒计时。
      shadow.querySelector('.backdrop')?.remove();
      menu = list = arrow = null;
    } else removeOverlay();
    if (restoreFocus && focus?.isConnected) focus.focus?.({ preventScroll: true });
  }
  function notify(message, task = false) {
    ensureOverlay();
    shadow.querySelector('.toast')?.remove();
    const toast = node('div', task ? 'toast draft-toast' : 'toast');
    if (task) toast.append(draftIcon('success'), node('span', '', message));
    else toast.textContent = message;
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
    if (!contextActive()) return;
    if (!event.isTrusted || ownEvent(event) || menuOpen || busy) return;
    point = { x: event.clientX, y: event.clientY };
    target = event.composedPath()[0];
    if (!anyHot(event)) {
      if (held) cleanupInteraction(false, { keepToast: true });
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
    if (!contextActive()) return;
    if (!event.isTrusted) return;
    pressed.add(event.code);
    if (draftInput) {
      event.stopImmediatePropagation();
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape') { consume(event); cleanupInteraction(); }
      else if (event.key === 'Enter' && !event.shiftKey && shadow.activeElement === draftInput) { consume(event); if (!event.repeat) submitDraft(); }
      else if (event.key === 'Tab') {
        consume(event);
        const controls = [...list.querySelectorAll('button:not([disabled]),textarea')];
        const index = controls.indexOf(shadow.activeElement);
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus({ preventScroll: true });
      }
      return;
    }
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
    if (!contextActive()) return;
    pressed.delete(event.code);
    if (['Meta', 'Control', 'Alt'].includes(event.key)) pressed.clear();
    if (held && !menuOpen && !busy && !anyHot(event)) cleanupInteraction(false, { keepToast: true });
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
    if (draftPosition) {
      draftPosition.x = Math.max(12, Math.min(innerWidth - width - 12, draftPosition.x));
      draftPosition.y = Math.max(12, Math.min(innerHeight - height - 12, draftPosition.y));
      Object.assign(menu.style, { left: `${draftPosition.x}px`, top: `${draftPosition.y}px` });
      return;
    }
    if (draftInput && target?.isConnected) {
      const rect = target.getBoundingClientRect();
      point = { x: rect.right, y: rect.top + Math.min(rect.height / 2, 60) };
    }
    const right = innerWidth - point.x - 5;
    const left = point.x - 5;
    const placement = width <= right || right >= left ? 'right' : 'left';
    const margin = draftInput ? 12 : 0;
    const x = Math.max(margin, Math.min(innerWidth - width - margin, placement === 'right' ? point.x + 5 : point.x - width - 5));
    const y = Math.max(margin, Math.min(innerHeight - height - margin, point.y - height / 2));
    Object.assign(menu.style, { left: `${x}px`, top: `${y}px` });
    menu.dataset.placement = placement;
    Object.assign(arrow.style, { left: placement === 'right' ? '-4px' : '', right: placement === 'left' ? '-4px' : '', top: `${Math.max(4, Math.min(height - 12, point.y - y - 4))}px` });
  }
  function stopDraftDrag() {
    const drag = draftDrag;
    draftDrag = null;
    if (menu) delete menu.dataset.dragging;
    if (drag?.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
  }
  function enableDraftDrag(handle) {
    handle.title = '拖动调整位置';
    handle.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
      consume(event);
      const rect = menu.getBoundingClientRect();
      draftPosition = { x: rect.left, y: rect.top };
      draftDrag = { handle, pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
      handle.setPointerCapture(event.pointerId);
      menu.dataset.dragging = 'true';
    });
    handle.addEventListener('pointermove', (event) => {
      if (draftDrag?.pointerId !== event.pointerId) return;
      consume(event);
      draftPosition = { x: event.clientX - draftDrag.offsetX, y: event.clientY - draftDrag.offsetY };
      positionMenu();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, (event) => {
      if (draftDrag?.pointerId !== event.pointerId) return;
      consume(event); stopDraftDrag();
    });
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

  function setDraftStatus(message = '', kind = '') {
    draftStatus.textContent = message;
    draftStatus.hidden = !message;
    draftStatus.dataset.kind = kind;
    draftStatus.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    positionMenu();
  }

  function setDraftBusy(value) {
    busy = value;
    draftInput.readOnly = value;
    draftControls.send.disabled = value;
    draftControls.sendLabel.textContent = value ? '发送中' : '发送';
    menu.setAttribute('aria-busy', String(value));
  }

  function setDraftSource(location) {
    const source = draftControls.source;
    source.replaceChildren();
    location.split('/').forEach((part, index) => {
      if (index) source.append(document.createTextNode('/'), node('wbr'));
      source.append(document.createTextNode(part));
    });
    positionMenu();
  }

  function resetDraftCopy(controls) {
    clearTimeout(controls.copyTimer);
    controls.copy.dataset.copied = 'false';
    controls.copyIcon.hidden = false;
    controls.copiedIcon.hidden = true;
    controls.copy.setAttribute('aria-label', '复制完整组件地址');
    controls.copy.dataset.tooltip = '复制地址';
    controls.copyFeedback.textContent = '';
    controls.copyFeedback.dataset.kind = '';
  }

  async function copyDraftSource() {
    const controls = draftControls;
    if (!controls || controls.copyBusy || !data) return;
    const interaction = epoch;
    controls.copyBusy = true;
    resetDraftCopy(controls);
    try {
      const result = await send('COMPONENT_COPY', { snapshotId: data.snapshotId, index: draftIndex, keepSnapshot: true });
      if (interaction !== epoch || draftControls !== controls) return;
      if (result.location && result.location !== controls.source.textContent) setDraftSource(result.location);
      controls.copy.dataset.copied = 'true';
      controls.copyIcon.hidden = true;
      controls.copiedIcon.hidden = false;
      controls.copy.setAttribute('aria-label', '组件地址已复制');
      controls.copy.dataset.tooltip = '已复制';
      controls.copyFeedback.textContent = '已复制';
      controls.copyTimer = setTimeout(() => resetDraftCopy(controls), 1800);
    } catch (_) {
      if (interaction !== epoch || draftControls !== controls) return;
      const range = document.createRange();
      range.selectNodeContents(controls.source);
      const selection = window.getSelection();
      selection?.removeAllRanges(); selection?.addRange(range);
      const modifier = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl + ';
      controls.copyFeedback.textContent = `已选中，按 ${modifier}C 复制`;
      controls.copyFeedback.dataset.kind = 'manual';
      controls.copyTimer = setTimeout(() => resetDraftCopy(controls), 5000);
    } finally { controls.copyBusy = false; }
  }

  function makeDraft(index, location) {
    makeMenu();
    menu.classList.add('draft');
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', '发送任务');
    list.replaceChildren();
    const component = data.components[index];
    const top = node('div', 'draft-top');
    enableDraftDrag(top);
    const icon = node('span', 'draft-icon'); icon.append(draftIcon('turn'));
    const close = node('button', 'draft-icon-button draft-close'); close.type = 'button';
    close.setAttribute('aria-label', '关闭发送任务'); close.append(draftIcon('close'));
    close.addEventListener('click', () => cleanupInteraction());
    top.append(icon, node('h3', 'draft-title', '发送任务'), close);
    const context = node('div', 'draft-context');
    const heading = node('div', 'draft-source-heading');
    const copyFeedback = node('span', 'draft-copy-feedback');
    copyFeedback.setAttribute('role', 'status'); copyFeedback.setAttribute('aria-live', 'polite');
    heading.append(node('span', 'draft-component', component.name), copyFeedback);
    const addressRow = node('div', 'draft-address-row');
    const source = node('code', 'draft-source');
    const copy = node('button', 'draft-icon-button draft-copy'); copy.type = 'button';
    const copyIcon = node('span'); copyIcon.append(draftIcon('copy'));
    const copiedIcon = node('span'); copiedIcon.append(draftIcon('check'));
    copy.append(copyIcon, copiedIcon); copy.addEventListener('click', copyDraftSource);
    addressRow.append(source, copy); context.append(heading, addressRow);
    draftInput = node('textarea');
    draftInput.setAttribute('aria-label', '任务内容');
    draftInput.placeholder = '描述你想对这个组件做的修改…';
    draftInput.maxLength = 10000;
    draftInput.rows = 4;
    draftIndex = index;
    const statusRow = node('div', 'draft-status-row');
    draftStatus = node('p', 'draft-status'); draftStatus.hidden = true;
    draftStatus.setAttribute('role', 'status');
    draftStatus.setAttribute('aria-live', 'polite');
    const length = node('span', 'draft-length'); length.hidden = true;
    statusRow.append(draftStatus, length);
    const footer = node('div', 'draft-footer');
    const hint = node('div', 'draft-hint');
    hint.append(node('span', '', 'Enter 发送任务'), node('span', '', 'Shift + Enter 换行'));
    const sendButton = node('button', 'draft-send'); sendButton.type = 'button';
    const sendLabel = node('span', '', '发送'); sendButton.append(sendLabel, draftIcon('send'));
    sendButton.addEventListener('click', submitDraft);
    footer.append(hint, sendButton);
    draftControls = { source, copy, copyIcon, copiedIcon, copyFeedback, copyBusy: false, copyTimer: null, send: sendButton, sendLabel };
    resetDraftCopy(draftControls);
    draftInput.addEventListener('input', () => {
      if (!busy) setDraftStatus();
      length.hidden = draftInput.value.length < 9000;
      length.textContent = `${draftInput.value.length.toLocaleString('en-US')} / 10,000`;
      positionMenu();
    });
    list.append(top, context, draftInput, statusRow, footer);
    showIndicator();
    setDraftSource(location);
    positionMenu(); draftInput.focus({ preventScroll: true });
    draftResizeObserver = new ResizeObserver(reposition);
    draftResizeObserver.observe(menu);
  }

  async function submitDraft() {
    if (busy || !draftInput || !data) return;
    const text = draftInput.value;
    if (!text.trim()) { setDraftStatus('请先输入内容', 'error'); draftInput.focus({ preventScroll: true }); return; }
    const interaction = epoch;
    setDraftBusy(true);
    setDraftStatus('正在打开编辑器…');
    try {
      const result = await send('COMPONENT_AGENT', { snapshotId: data.snapshotId, index: draftIndex, text });
      if (interaction !== epoch) return;
      cleanupInteraction(false);
      const reasons = {
        disabled: '自动发送已关闭',
        accessibility: '辅助程序尚未获得辅助功能权限',
        focus: '编辑器未保持在前台',
        window: '尚未读到编辑器窗口',
        page: '尚未识别到编辑器页面',
        draft: '尚未核对到本次输入内容',
        button: '尚未找到可用的发送按钮',
        changed: '窗口或草稿内容已变化',
        press: '发送按钮点击失败',
        timeout: '自动发送等待超时',
        automation: '自动发送脚本运行失败',
      };
      notify(result.sendStatus === 'pressed' ? '已打开编辑器并点击发送' : `${reasons[result.reason] || '自动发送未完成'}，草稿已保留，请在桌面发送`, true);
    } catch (error) {
      if (interaction === epoch) {
        setDraftStatus(error.message, 'error');
        draftInput.focus({ preventScroll: true });
      }
    } finally { if (interaction === epoch) setDraftBusy(false); }
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
    if (!contextActive()) return;
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
        else if (config.clickAction === 'agent') {
          busy = true;
          const source = await send('COMPONENT_SOURCE_LOCATION', { snapshotId: data.snapshotId, index });
          if (interaction !== epoch) return;
          busy = false;
          makeDraft(index, source.location);
        }
        else await openSelected(index, config.clickAction);
      }
    } catch (error) { if (interaction === epoch) { cleanupInteraction(false); notify(error.message); } }
    finally { element.removeAttribute(marker); markers.delete(marker); if (interaction === epoch) busy = false; }
  }

  function guardPointer(event) {
    if (!contextActive()) return;
    if (!event.isTrusted || ownEvent(event)) return;
    if (menuOpen) { consume(event); if (event.type === 'pointerdown') cleanupInteraction(); return; }
    if ((event.button === 0 && hot(event, config.openShortcut)) || (event.button === 2 && hot(event, config.menuShortcut))) {
      if (event.type === 'pointerdown' && (event.button === 2 || config.clickAction === 'agent')) previousFocus = document.activeElement;
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
    window.addEventListener(REPLACE_EVENT, destroy, capture);
    window.addEventListener('mousemove', onMove, capture);
    window.addEventListener('keydown', onKeyDown, capture);
    window.addEventListener('keyup', onKeyUp, capture);
    window.addEventListener('click', (event) => select(event, false), capture);
    window.addEventListener('contextmenu', (event) => select(event, true), capture);
    for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'auxclick']) window.addEventListener(type, guardPointer, capture);
    window.addEventListener('scroll', reposition, { ...capture, passive: true });
    window.addEventListener('resize', reposition, capture);
    window.addEventListener('blur', (event) => { if (event.target === window) { stopDraftDrag(); pressed.clear(); if ((!menuOpen || draftInput) && !busy) cleanupInteraction(false, { keepToast: true }); } }, capture);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { pressed.clear(); if (!menuOpen && !busy) cleanupInteraction(false, { keepToast: true }); } }, capture);
    window.addEventListener('pagehide', destroy, capture);
  }
  globalThis.__IDT_COMPONENT_INSPECTOR__ = {
    start, destroy,
    isRunning(value) { return !!chrome.runtime.id && !!controller && !controller.signal.aborted && config?.origin === value.origin && config?.generation === value.generation; },
    resetInteraction() { pressed.clear(); point = target = null; cleanupInteraction(false); },
  };
})();
