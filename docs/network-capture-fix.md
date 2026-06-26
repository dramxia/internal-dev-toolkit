# 网络请求捕获修复说明

## 问题描述

DevTools Panel 中的"接口列表"一直为空，无法捕获到页面的网络请求。

## 根本原因

在 Chrome 扩展的 Manifest V3 中，**content script 运行在隔离上下文（isolated world）**，而页面的 JavaScript 代码运行在**主上下文（main world）**。

原有代码在 content script 中直接修改 `window.fetch` 和 `window.XMLHttpRequest`，这只影响 content script 自己发起的请求，**无法拦截页面代码发起的真实网络请求**。

## 解决方案

将网络拦截代码通过 `<script>` 标签注入到页面的主上下文中，使其能够真正拦截页面的网络请求。

### 架构改动

```
旧架构：
Content Script (isolated world) → 修改 window.fetch/XHR → ❌ 无法拦截页面请求

新架构：
Content Script (isolated world)
    ↓ 注入脚本
Page Context (main world) → 修改 window.fetch/XHR → ✅ 成功拦截页面请求
    ↓ postMessage
Content Script → 接收请求记录 → 通知 DevTools Panel
```

### 通信机制

1. **Content Script → Page Context**: 通过 `window.postMessage` 传递 Mock 规则更新
2. **Page Context → Content Script**: 通过 `window.postMessage` 传递请求记录
3. **Content Script → DevTools Panel**: 通过 `chrome.runtime.sendMessage` 传递请求记录

## 测试步骤

### 1. 重新加载扩展

1. 打开 Chrome 扩展管理页面：`chrome://extensions/`
2. 找到"内部开发工具箱"扩展
3. 点击"刷新"按钮

### 2. 打开目标页面

访问配置的目标站点，例如：
- https://gpt-admin-pre.hwzxs.com
- http://localhost:3000

### 3. 打开 DevTools

1. 按 F12 打开 Chrome DevTools
2. 切换到"接口 Mock"标签页
3. 查看左侧"接口列表"区域

### 4. 触发网络请求

在页面中执行任何操作（登录、列表加载等），观察：
- Console 中应该看到 `[Mock Interceptor] Hooks installed in page context`
- DevTools Panel 的接口列表中应该实时出现捕获的请求
- 每个请求显示：方法（GET/POST）、URL、时间戳

### 5. 验证 Mock 功能

1. 点击左侧列表中的某个请求
2. 右侧显示请求详情和 Mock 配置界面
3. 点击"一键生成假数据"
4. 点击"保存 Mock 规则"
5. 刷新页面，该接口应返回 Mock 数据

## 技术细节

### 注入方式

```javascript
function injectPageScript() {
  const script = document.createElement('script');
  script.textContent = `(${pageScriptCode.toString()})();`;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}
```

### 消息通信

```javascript
// Content Script → Page Context
window.postMessage({
  type: 'IDT_UPDATE_MOCK_RULES',
  rules: mockRules,
}, '*');

// Page Context → Content Script
window.postMessage({
  type: 'IDT_REQUEST_LOGGED',
  record: { url, method, ... },
}, '*');
```

## 常见问题

### Q: 为什么不使用 chrome.scripting API？

A: `chrome.scripting.executeScript` 的 `world: 'MAIN'` 选项虽然可以在主上下文执行代码，但无法持久化 hook，且需要在每次页面加载时重新注入。直接注入 `<script>` 标签更简单可靠。

### Q: 如何确认代码运行在正确的上下文？

A: 在 Console 中执行：
```javascript
// 页面上下文中应该能看到被修改的 fetch
console.log(window.fetch.toString());
```

### Q: 如果还是看不到请求？

1. 检查 Console 是否有错误
2. 确认页面 URL 匹配 manifest.json 中的 `content_scripts.matches`
3. 检查页面是否真的使用了 fetch/XHR（某些框架可能使用 Service Worker）

## 修改文件

- `src/content/mock-interceptor.js`: 重构网络拦截逻辑，将 hook 代码注入到页面上下文
