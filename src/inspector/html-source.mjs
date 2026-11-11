import { parse, parseFragment } from 'parse5';
import { parse as parseScript } from 'acorn';

const parseOptions = { sourceCodeLocationInfo: true };
const normalizeText = (text) => (text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
const classes = (value) => (value || '').trim().split(/\s+/).filter(Boolean);
const directText = (node) => normalizeText(node.childNodes?.filter((child) => child.nodeName === '#text').map((child) => child.value).join(' '));
const stableAttribute = /^(?:name|type|href|src|for|role|title|placeholder|alt|aria-label|data-[\w-]+)$/i;

function descriptor(tag, attrs, text, parent, position) {
  return { tag, attrs, text, parent, position, children: [] };
}

function sourcePosition(location) {
  const tag = location?.startTag || location;
  return tag ? { line: tag.startLine, column: tag.startCol } : null;
}

function offsetLocator(html) {
  const starts = [0];
  for (const match of html.matchAll(/\r\n|\r|\n/g)) starts.push(match.index + match[0].length);
  return (offset) => {
    let first = 0, last = starts.length;
    while (last - first > 1) {
      const middle = (first + last) >>> 1;
      if (starts[middle] <= offset) first = middle;
      else last = middle;
    }
    return { line: first + 1, column: offset - starts[first] + 1 };
  };
}

function scriptNodes(code, locate, sourceType, add) {
  let program;
  try { program = parseScript(code, { ecmaVersion: 'latest', sourceType }); }
  catch (_) { return; }
  const created = [];

  function literalPrefix(node) {
    if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
    if (node?.type === 'TemplateLiteral') return node.quasis[0].value.cooked;
    if (node?.type === 'BinaryExpression' && node.operator === '+') return literalPrefix(node.left);
    return '';
  }

  function fragment(node) {
    const start = node.start + 1;
    let raw = code.slice(start, node.end - 1);
    if (!/^\s*<[a-z]/i.test(raw)) return;
    // 遮掉插值表达式，保留字符位置，标签仍指向原来的行列。
    if (node.type === 'TemplateLiteral') {
      for (let i = node.quasis.length - 1; i > 0; i--) {
        const from = node.quasis[i - 1].end - start, to = node.quasis[i].start - start;
        raw = raw.slice(0, from) + raw.slice(from, to).replace(/[^\r\n]/g, ' ') + raw.slice(to);
      }
    }
    const escapes = [];
    const markup = raw.replace(/\\(["'`\\nrt])/g, (_, character, offset) => {
      escapes.push(offset);
      return { n: '\n', r: '\r', t: '\t' }[character] || character;
    });
    const queue = [...parseFragment(markup, parseOptions).childNodes];
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      for (const child of item.childNodes || []) queue.push(child);
      let offset = item.sourceCodeLocation?.startTag?.startOffset;
      if (!item.tagName || offset == null) continue;
      for (const escaped of escapes) {
        if (escaped > offset) break;
        offset++;
      }
      add(descriptor(item.tagName, new Map(item.attrs.map(({ name, value }) => [name, value])), directText(item), null, locate(start + offset)));
    }
  }

  function visit(node, scope) {
    if (node.type === 'Program' || node.type === 'BlockStatement') scope = new Map();
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
      const call = node.init;
      const tag = call?.type === 'CallExpression' && call.callee.object?.name === 'document' && call.callee.property?.name === 'createElement'
        && call.arguments[0]?.type === 'Literal' && call.arguments[0].value;
      if (typeof tag === 'string' && /^[a-z][\w-]*$/i.test(tag)) {
        const candidate = descriptor(tag.toLowerCase(), new Map(), '', null, locate(call.start));
        scope.set(node.id.name, candidate);
        created.push(candidate);
      } else scope.delete(node.id.name);
    }
    if (node.type === 'AssignmentExpression' && node.operator === '=' && node.left.type === 'MemberExpression') {
      const candidate = scope.get(node.left.object.name);
      if (candidate) {
        const name = node.left.property.name;
        const value = literalPrefix(node.right);
        if (name === 'className') candidate.attrs.set('class', value);
        if (name === 'id') candidate.attrs.set('id', value);
        if (name === 'textContent') candidate.text = normalizeText(value);
      }
    }
    if (node.type === 'TemplateLiteral' || (node.type === 'Literal' && typeof node.value === 'string')) fragment(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) if (child?.type) visit(child, scope);
      } else if (value?.type) visit(value, scope);
    }
  }

  visit(program, null);
  for (const node of created) add(node);
}

export function indexHtml(html) {
  const markup = new Map(), scripts = new Map();
  const add = (index, node) => {
    if (!index.has(node.tag)) index.set(node.tag, []);
    index.get(node.tag).push(node);
  };
  const locate = offsetLocator(html);
  const root = parse(html, parseOptions);
  const stack = [{ node: root, parent: null, flexible: false }];
  while (stack.length) {
    const { node, parent, flexible, vueKey } = stack.pop();
    const attrs = new Map(node.attrs?.map(({ name, value }) => [name, value]));
    const optional = flexible || ['v-for', 'v-if', 'v-else-if', 'v-else'].some((name) => attrs.has(name));
    const transparent = (node.tagName === 'template' && optional) || node.tagName === 'transition' ||
      (node.tagName === 'transition-group' && !attrs.has('tag'));
    const item = node.tagName && !transparent ? descriptor(node.tagName, attrs, directText(node), parent, sourcePosition(node.sourceCodeLocation)) : parent;
    if (item !== parent) {
      item.flexible = optional;
      item.vueKey = vueKey;
      parent?.children.push(item);
      if (item.position) add(markup, item);
      if (item.tag === 'script' && !attrs.has('src') && /^(?:|module|(?:text|application)\/(?:java|ecma)script)$/i.test(attrs.get('type') || '')) {
        const text = node.childNodes[0]?.sourceCodeLocation;
        if (text) {
          try {
            scriptNodes(html.slice(text.startOffset, text.endOffset), (offset) => locate(text.startOffset + offset),
              attrs.get('type') === 'module' ? 'module' : 'script', (entry) => add(scripts, entry));
          } catch (_) { /* HTML 行号仍可用，脚本语法分析失败时跳过该脚本。 */ }
        }
      }
    }
    const children = transparent && node.content ? node.content.childNodes : node.childNodes;
    let nextBranch = 0;
    const elements = [];
    for (const child of children || []) {
      if (!child.tagName) continue;
      const names = new Set(child.attrs.map(({ name }) => name));
      const conditional = ['v-if', 'v-else-if', 'v-else'].some((name) => names.has(name));
      // Vue 为同一父节点的条件分支依次生成数字 key，显式 key 和循环保留原有匹配方式。
      const branch = conditional ? nextBranch++ : undefined;
      const generatedKey = names.has('key') || names.has(':key') || names.has('v-bind:key') || names.has('v-for') ? undefined : branch;
      elements.push({ node: child, parent: item, flexible: transparent, vueKey: generatedKey });
    }
    for (let i = elements.length - 1; i >= 0; i--) stack.push(elements[i]);
  }
  return { markup, scripts };
}

function elementScore(source, live) {
  if (source.tag !== live.tag) return null;
  let score = 0, evidence = false;
  if (source.vueKey != null && live.vueKey != null) {
    if (source.vueKey !== live.vueKey) return null;
    score += 16;
  }
  const id = source.attrs.get('id');
  if (id) {
    if (id !== live.attrs.get('id')) return null;
    score += 100;
    evidence = true;
  }
  const expectedClasses = classes(source.attrs.get('class'));
  if (expectedClasses.length) {
    const actual = new Set(classes(live.attrs.get('class')));
    const matched = expectedClasses.filter((name) => actual.has(name)).length;
    if (!matched && !id) return null;
    score += matched * 3 - (expectedClasses.length - matched) * 3;
    evidence ||= matched === expectedClasses.length;
  }
  for (const [name, value] of source.attrs) {
    if (!stableAttribute.test(name)) continue;
    if (value === live.attrs.get(name)) { score += 8; evidence = true; }
    else score -= 5;
  }
  if (source.text && source.text === live.text) { score += 25; evidence = true; }
  else if (source.text && !source.text.includes('{{')) score -= 12;
  return { score, evidence };
}

function markupScore(source, path, hasScriptMatch) {
  let score = 0;
  // 插入的同类元素可能复用原标签的样式，先检查它是否仍在原标签的位置。
  const id = source.attrs.get('id');
  for (const live of path) {
    if (!source) return null;
    const match = elementScore(source, live);
    if (!match) return null;
    score += match.score;
    const peers = source.parent?.children;
    if (live.siblings && peers && peers.every((peer) => !peer.flexible)) {
      const sameOrder = peers.length === live.siblings.length && peers.every((peer, index) => peer.tag === live.siblings[index]);
      if (sameOrder) score += peers[live.index] === source ? 8 : -8;
      else if (hasScriptMatch && !id && live.index >= peers.length) return null;
    }
    source = source.parent;
  }
  return source ? null : score;
}

function uniquePosition(candidates, scoreOf) {
  let best = null, score = -Infinity, ambiguous = false;
  for (const candidate of candidates || []) {
    const next = scoreOf(candidate);
    if (next == null || next < score) continue;
    if (next === score) {
      ambiguous ||= best.line !== candidate.position.line || best.column !== candidate.position.column;
    } else {
      best = candidate.position;
      score = next;
      ambiguous = false;
    }
  }
  return ambiguous ? null : best;
}

export function locateHtmlElement(index, elementPath) {
  if (!elementPath?.length) return null;
  const path = elementPath.map((item) => ({ ...item, attrs: new Map(item.attrs), text: normalizeText(item.text) }));
  const element = path[0];
  const script = uniquePosition(index.scripts.get(element.tag), (node) => {
    const match = elementScore(node, element);
    return match?.evidence && match.score > 0 ? match.score : null;
  });
  return uniquePosition(index.markup.get(element.tag), (node) => markupScore(node, path, !!script)) || script;
}
