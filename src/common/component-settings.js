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
