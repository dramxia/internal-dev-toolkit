/* React 的 Fiber 查找、owner 追溯与 _debugSource 读取参考 click-to-react-component。
 * Copyright (c) 2022 Eric Clemmons, MIT；见 THIRD_PARTY_NOTICES.md。
 * 该函数由 executeScript 序列化到 MAIN world。所有辅助函数必须位于函数内部。
 * 只返回数据快照，不安装 hook，不保存框架对象或修改业务状态。
 */
function inspectComponentPage(options) {
  'use strict';
  options = options || {};
  if (options.origin && location.origin !== options.origin) return { error: '页面地址已变化' };
  const limit = 32;

  function parentElement(element) {
    return element.parentElement || element.getRootNode?.().host || null;
  }

  function reactFiber(element) {
    const renderers = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers;
    if (renderers?.values) {
      for (const renderer of renderers.values()) {
        try {
          const fiber = renderer.findFiberByHostInstance?.(element);
          if (fiber) return fiber;
        } catch (_) { /* React 正在提交时节点可能已卸载。 */ }
      }
    }
    for (const key of Object.keys(element)) {
      if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) return element[key];
    }
    return element._reactRootContainer?._internalRoot?.current?.child || null;
  }

  function snapshot(value) {
    const seen = new WeakSet();
    let remaining = 16000;
    let entries = 0;
    function visit(item, depth) {
      if (remaining <= 0 || entries++ > 250) return '[内容已截断]';
      if (item === null || typeof item === 'boolean' || typeof item === 'number') return item;
      if (typeof item === 'string') { const text = item.slice(0, Math.min(remaining, 2000)); remaining -= text.length; return text + (text.length < item.length ? '…' : ''); }
      if (typeof item === 'undefined') return '[undefined]';
      if (typeof item === 'bigint') return `${item}n`;
      if (typeof item === 'symbol') return String(item);
      if (typeof item === 'function') return `[函数 ${item.name || '匿名'}]`;
      if (item instanceof Element) return `<${item.tagName.toLowerCase()}>`;
      if (depth > 4) return Array.isArray(item) ? `[数组 ${item.length} 项]` : '[对象]';
      if (seen.has(item)) return '[循环引用]';
      seen.add(item);
      const result = Array.isArray(item) ? [] : Object.create(null);
      try {
        for (const key of Object.keys(item).slice(0, 50)) {
          if (remaining <= 0) break;
          const descriptor = Object.getOwnPropertyDescriptor(item, key);
          result[key] = descriptor && 'value' in descriptor ? visit(descriptor.value, depth + 1) : '[访问器]';
        }
      } catch (_) { return '[暂时无法读取]'; }
      return result;
    }
    return visit(value, 0);
  }

  function typeName(type) {
    if (typeof type === 'string') return type;
    return type?.displayName || type?.name || type?.render?.displayName || type?.render?.name || type?.type?.displayName || type?.type?.name || '匿名组件';
  }

  // 与参考菜单一致，只展示字符串、数字等简单参数；参数名悬停时显示当前值。
  function menuProps(props, defaults) {
    const result = Object.create(null);
    for (const key of Object.keys(props || {}).slice(0, 50)) {
      if (key === 'key') continue;
      try {
        const descriptor = Object.getOwnPropertyDescriptor(props, key);
        if (!descriptor || !('value' in descriptor)) continue;
        const value = descriptor.value;
        if (defaults && value === Object.getOwnPropertyDescriptor(defaults, key)?.value) continue;
        if (['string', 'number', 'boolean', 'symbol'].includes(typeof value)) result[key] = value;
      } catch (_) { /* 跳过当前无法读取的参数。 */ }
    }
    return snapshot(result);
  }

  function sourceFromFiber(fiber) {
    const source = fiber._debugSource;
    if (source?.fileName) return { file: source.fileName, line: source.lineNumber || null, column: source.columnNumber || null, ...(source.endLineNumber ? { endLine: source.endLineNumber } : {}), kind: 'source' };
    const stack = fiber._debugStack?.stack;
    return stack ? { stack: String(stack).slice(0, 24000), kind: 'stack' } : null;
  }

  function reactChain(fiber, includeProps) {
    const visited = new Set();
    const result = [];
    while (fiber && result.length < limit && !visited.has(fiber)) {
      visited.add(fiber);
      const type = fiber.type || fiber.elementType;
      if (type && typeof type !== 'symbol') {
        result.push({ framework: 'React', name: typeName(type), source: sourceFromFiber(fiber), props: includeProps ? menuProps(fiber.memoizedProps || fiber.pendingProps, type?.defaultProps) : undefined });
      }
      fiber = fiber._debugOwner || fiber.return;
    }
    return result;
  }

  function vueChain(instance, version, includeProps) {
    const result = [];
    const visited = new Set();
    while (instance && result.length < limit && !visited.has(instance)) {
      visited.add(instance);
      const type = version === 2 ? instance.$options : instance.type;
      const file = type?.__file;
      let props;
      if (includeProps) {
        if (version === 2) {
          // Vue 2 的已声明 props 使用框架响应式 getter，需要先取出当前值。
          const values = Object.create(null);
          for (const key of Object.keys(type?.props || instance.$props || {}).slice(0, 50)) {
            try { values[key] = instance.$props?.[key]; } catch (_) { values[key] = '[暂时无法读取]'; }
          }
          props = menuProps(values);
        } else props = menuProps(instance.props);
      }
      result.push({ framework: `Vue ${version}`, name: type?.name || type?.__name || type?._componentTag || file?.split('/').pop()?.replace(/\.vue$/, '') || '匿名组件', source: file ? { file, line: null, column: null, kind: 'source' } : null, props });
      instance = version === 2 ? instance.$parent : instance.parent;
    }
    return result;
  }

  function find(element, includeProps) {
    const target = element;
    for (let depth = 0; element && depth < 80; depth++, element = parentElement(element)) {
      const fiber = reactFiber(element);
      if (fiber) return reactChain(fiber, includeProps);
      const vue3 = element.__vueParentComponent || element.__vue_app__?._instance;
      if (vue3) return vueChain(vue3, 3, includeProps);
      let vue2 = element.__vue__;
      if (vue2) {
        const visited = new Set();
        while (!visited.has(vue2)) {
          visited.add(vue2);
          const child = vue2.$children?.find((item) => item.$el?.contains?.(target));
          if (!child) break;
          vue2 = child;
        }
        return vueChain(vue2, 2, includeProps);
      }
    }
    return [];
  }

  const scripts = () => [...new Set([...Array.from(document.scripts, (script) => script.src), ...performance.getEntriesByType('resource').filter((entry) => entry.initiatorType === 'script').map((entry) => entry.name)])].filter(Boolean).slice(-40);
  if (options.mode === 'detect') {
    const frameworks = new Set();
    const hints = new Set();
    const sources = new Map();
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);
    let element = walker.currentNode;
    for (let count = 0; element && count < 3000; count++, element = walker.nextNode()) {
      const chain = find(element, false);
      for (const item of chain) {
        frameworks.add(item.framework);
        if (item.source?.file) hints.add(item.source.file);
        if (item.source && sources.size < 12) sources.set(JSON.stringify(item.source), item.source);
      }
      if (hints.size >= 16 || sources.size >= 12) break;
    }
    return { frameworks: [...frameworks], hints: [...hints].slice(0, 32), sources: [...sources.values()], scripts: scripts() };
  }

  let element;
  if (/^data-idt-query-[a-f0-9]{32}$/.test(options.marker || '')) {
    const roots = [document];
    while (roots.length && !element) {
      const root = roots.shift();
      element = root.querySelector(`[${options.marker}]`);
      if (!element) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let item;
        for (let count = 0; (item = walker.nextNode()) && count < 5000; count++) if (item.shadowRoot) roots.push(item.shadowRoot);
      }
    }
    element?.removeAttribute(options.marker);
    if (!element) return { components: [] };
  } else element = document.elementFromPoint(options.x, options.y);
  const visited = new Set();
  while (!options.marker && element?.shadowRoot && !visited.has(element)) {
    visited.add(element);
    const inner = element.shadowRoot.elementFromPoint?.(options.x, options.y);
    if (!inner || inner === element) break;
    element = inner;
  }
  if (!element) return { components: [] };
  const components = find(element, options.props !== false);
  // 已存在的 Vue Inspector 标记可直接提供模板行列，无需改造业务项目。
  const marker = element.closest?.('[data-v-inspector]')?.getAttribute('data-v-inspector');
  const match = marker?.match(/^(.*):(\d+):(\d+)$/);
  if (match && components[0]?.framework.startsWith('Vue')) {
    components[0].source = { file: match[1], line: Number(match[2]), column: Number(match[3]), kind: 'source' };
  }
  const rect = element.getBoundingClientRect();
  return { components, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, scripts: scripts() };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { inspectComponentPage };
