# 接口 Mock 功能使用指南

## 功能概述

接口 Mock 是一个强大的调试工具，允许你在浏览器中拦截 API 请求并返回自定义的假数据，无需修改后端代码。

## 核心特性

✅ **自动拦截** - 自动捕获页面中的所有 fetch/XHR 请求  
✅ **智能记录** - 记录请求和响应数据，最多保留 100 条  
✅ **灵活 Mock** - 支持 Mock 入参或出参  
✅ **一键生成** - 自动识别字段类型，生成合理的假数据  
✅ **项目隔离** - 不同项目的 Mock 规则互不干扰  
✅ **持久化** - Mock 规则保存后重启浏览器仍然有效  

## 使用步骤

### 1. 打开 DevTools Panel

1. 在任意页面按 `F12` 打开 Chrome DevTools
2. 找到顶部标签栏中的「**接口 Mock**」标签
3. 如果看不到，点击 `>>` 按钮查找

### 2. 发送测试请求

在页面中触发网络请求（如点击按钮、提交表单等），DevTools Panel 左侧会自动显示接口列表。

### 3. 选择接口进行 Mock

1. 在左侧列表中点击要 Mock 的接口
2. 右侧会显示该接口的详细信息：
   - 📋 **接口信息**：URL、Method、Status
   - ⚙️ **Mock 配置**：选择 Mock 模式
   - 📝 **Mock 数据编辑**：编辑请求/响应数据

### 4. 编辑 Mock 数据

有两种方式：

#### 方式 1：手动编辑 JSON
直接在文本框中编辑 JSON 数据

#### 方式 2：一键生成假数据
点击「🎲 一键生成假数据」按钮，系统会根据字段名智能生成：
- `name/username` → 张伟、王芳 等中文姓名
- `email` → test@example.com
- `phone/mobile` → 13812345678
- `id/userId` → 随机数字
- `avatar/image` → 图片 URL
- `time/date` → 时间戳
- `address` → 北京市朝阳区...

### 5. 保存 Mock 规则

点击「💾 保存 Mock 规则」按钮，规则会：
1. 保存到 `chrome.storage.local`（持久化）
2. 按当前项目隔离存储
3. 立即通知 content script 生效

### 6. 验证 Mock 效果

1. 刷新页面（让 content script 重新加载规则）
2. 再次触发相同的接口请求
3. 请求会被拦截并返回你设置的 Mock 数据

## Mock 模式说明

### Mock 出参（推荐）

**作用**：拦截响应，返回假数据，**不发送真实请求**

**使用场景**：
- 后端接口未就绪，前端需要假数据调试
- 测试异常情况（如空数据、错误响应）
- 演示时使用假数据避免泄露真实信息

**示例**：
```javascript
// 真实请求：POST /api/user/list
// Mock 出参后：直接返回假数据，不请求后端
{
  "code": 200,
  "data": [
    { "id": 1, "name": "张伟", "email": "test@example.com" }
  ]
}
```

### Mock 入参

**作用**：修改请求参数，发送真实请求，返回后端的真实响应

**使用场景**：
- 测试不同参数组合的效果
- 快速切换请求参数而不修改代码

**示例**：
```javascript
// 真实请求：POST /api/user/list { "page": 1 }
// Mock 入参后：发送 { "page": 999 } 到后端，返回后端的真实数据
```

## 技术原理

### 拦截机制

Content Script 在页面加载时 Hook 了 `window.fetch` 和 `XMLHttpRequest`：

```javascript
// fetch 拦截
const originalFetch = window.fetch;
window.fetch = async function(input, init) {
  const rule = findMatchingRule(url, method);
  if (rule && rule.mockMode === 'response') {
    return new Response(JSON.stringify(rule.mockData), { status: 200 });
  }
  return originalFetch.call(this, input, init);
};
```

### 数据流

```
┌──────────────┐
│ DevTools     │ 用户编辑 Mock 规则
│ Panel        │
└──────┬───────┘
       │ chrome.runtime.sendMessage({ type: 'ADD_MOCK_RULE' })
       ↓
┌──────────────┐
│ Background   │ 保存到 chrome.storage.local['mockRules:projectId']
│ Service      │
│ Worker       │
└──────┬───────┘
       │ chrome.tabs.sendMessage({ type: 'APPLY_MOCK_RULES' })
       ↓
┌──────────────┐
│ Content      │ 更新内存中的规则，拦截 fetch/XHR
│ Script       │
└──────────────┘
       ↓
┌──────────────┐
│ Page         │ 页面发起请求时被拦截，返回 Mock 数据
│              │
└──────────────┘
```

## 项目隔离

Mock 规则按项目命名空间存储：

```javascript
// 存储 key
'mockRules:gpt-admin-pre'  // 项目 A 的规则
'mockRules:another-project' // 项目 B 的规则
```

切换项目时，自动加载对应项目的规则。

## 限制与注意事项

⚠️ **只能拦截页面发起的请求**  
无法拦截 Service Worker、Extension 自身、或其他 Tab 的请求。

⚠️ **需要刷新页面**  
保存规则后需要刷新页面，让 content script 重新加载规则。

⚠️ **最多保留 100 条记录**  
接口记录列表会自动清理，只保留最近 100 条。

⚠️ **规则匹配区分大小写**  
`/api/User/list` 和 `/api/user/list` 是不同的 URL。

## 常见问题

### Q: 为什么保存规则后没有生效？

A: 需要**刷新页面**。Mock 规则在页面加载时注入到 content script 中，保存后需要刷新。

### Q: 可以 Mock HTTPS 请求吗？

A: 可以。拦截器工作在页面 JavaScript 层，不受协议限制。

### Q: 如何禁用某条规则？

A: 目前暂不支持禁用，可以删除规则后重新添加。后续版本会加入启用/禁用开关。

### Q: 支持通配符吗？

A: 支持简单的通配符 `*`。例如 `/api/*/list` 可以匹配 `/api/user/list` 和 `/api/order/list`。

### Q: Mock 规则会同步到其他设备吗？

A: 不会。规则保存在本地 `chrome.storage.local`，不会同步。

## 测试步骤

1. 构建插件：
   ```bash
   npm run build
   ```

2. 加载插件到 Chrome：
   - 打开 `chrome://extensions/`
   - 开启「开发者模式」
   - 点击「加载已解压的扩展程序」
   - 选择 `dist/` 目录

3. 打开测试页面：
   ```
   file:///path/to/test-mock.html
   ```

4. 按照上述使用步骤测试功能

## 后续优化计划

- [ ] 支持规则启用/禁用开关
- [ ] 支持规则列表显示（在 Panel 左上角）
- [ ] 支持规则导入/导出（JSON 文件）
- [ ] 支持更复杂的 URL 匹配规则（正则表达式）
- [ ] 支持延迟响应（模拟慢网络）
- [ ] 支持修改响应状态码（如 404、500）
- [ ] 支持修改响应头（如 Content-Type）

## 架构文件清单

**新建文件（8 个）**：
- `devtools.html` / `devtools.js` - DevTools 入口
- `devtools/panel.html` / `devtools/panel.js` - Panel UI
- `src/common/mock-storage.js` - Mock 规则存储
- `src/common/mock-generator.js` - 假数据生成器
- `src/content/mock-interceptor.js` - fetch/XHR 拦截器
- `src/background/mock-handler.js` - 消息处理

**修改文件（3 个）**：
- `scripts/build.js` - 添加 devtools_page，复制 devtools/
- `src/background/index.js` - 注册 Mock 消息
- `src/content/index.js` - 初始化拦截器

---

**开发完成时间**: 2026-06-25  
**功能状态**: ✅ 完成
