# Mock 功能快速测试指南

## 🚀 快速开始（3 步）

### 1. 启动测试服务器

```bash
npm run test-server
```

看到以下输出表示成功：
```
🚀 测试服务器启动成功！
📍 地址: http://localhost:8080

可用接口：
  GET  /api/user/list      - 获取用户列表
  POST /api/user/detail    - 获取用户详情
  POST /api/login          - 登录接口
```

### 2. 重新加载插件

1. 打开 Chrome 浏览器
2. 地址栏输入：`chrome://extensions/`
3. 找到「内部开发工具箱」
4. 点击「重新加载」按钮（🔄）

### 3. 打开测试页面

在浏览器中访问：
```
http://localhost:8080
```

## 📝 测试步骤

### 步骤 1：查看真实请求

1. 在测试页面按 `F12` 打开 DevTools
2. 切换到「**接口 Mock**」标签
3. 点击测试页面上的按钮：
   - `GET /api/user/list`
   - `POST /api/user/detail`
   - `POST /api/login`
4. 在 DevTools Panel 左侧应该看到接口列表

**预期结果**：
- ✅ 左侧显示 3 个接口记录
- ✅ 每个记录显示 Method + URL + 时间

### 步骤 2：查看接口详情

1. 点击左侧的任意接口（如 `POST /api/user/detail`）
2. 右侧显示接口详情：
   - 📋 接口信息（URL、Method、Status）
   - ⚙️ Mock 配置（选择 Mock 模式）
   - 📝 Mock 数据编辑（显示响应 JSON）

**预期结果**：
- ✅ 右侧显示完整的响应数据
- ✅ JSON 格式化显示
- ✅ 可以切换「请求数据」和「响应数据」Tab

### 步骤 3：一键生成假数据

1. 确保「Mock 出参」被选中
2. 点击「🎲 一键生成假数据」按钮
3. 观察文本框中的数据变化

**预期结果**：
- ✅ `name` 字段变成中文姓名（如「张伟」）
- ✅ `email` 字段变成邮箱格式（如「abc123@example.com」）
- ✅ `phone` 字段变成手机号（如「13812345678」）
- ✅ `id` 字段变成随机数字
- ✅ 显示「✅ 假数据已生成」提示

### 步骤 4：保存 Mock 规则

1. 编辑文本框中的数据（或使用生成的假数据）
2. 点击「💾 保存 Mock 规则」按钮
3. 看到「✅ Mock 规则保存成功！刷新页面后生效」

**预期结果**：
- ✅ 显示成功提示
- ✅ 无报错

### 步骤 5：验证 Mock 生效

1. 刷新测试页面（`F5` 或 `Cmd+R`）
2. 再次点击同一个接口按钮（如 `POST /api/user/detail`）
3. 查看测试页面「请求日志」区域的响应数据

**预期结果**：
- ✅ 返回的是你刚才设置的 Mock 数据
- ✅ **不是**服务器的真实数据
- ✅ DevTools Panel 左侧出现新的接口记录

### 步骤 6：验证项目隔离

1. 打开插件 Popup（点击工具栏图标）
2. 在「项目」区域看到两个 pill：
   - `GPT后台-预发布`（当前激活）
   - `本地测试`
3. 点击「本地测试」pill
4. Popup 会 reload

**预期结果**：
- ✅ 切换成功
- ✅ Mock 规则仍然有效（因为已经保存到 `mockRules:local-test`）

## 🔍 常见问题排查

### 问题 1：左侧没有接口记录

**可能原因**：
1. Content script 未注入
2. 请求发送得太早（在 hook 之前）

**解决方案**：
```bash
# 1. 检查 manifest
cat dist/manifest.json | grep "run_at"
# 应该显示 "run_at": "document_start"

# 2. 检查 content script 是否加载
# 在测试页面按 F12 → Console，应该看到：
# [Mock Interceptor] Initializing...
# [Mock Interceptor] Loaded X rules
# [Mock Interceptor] fetch API hooked
# [Mock Interceptor] XMLHttpRequest hooked

# 3. 重新加载插件
# chrome://extensions/ → 找到插件 → 点击「重新加载」
```

### 问题 2：保存规则后没有生效

**原因**：需要刷新页面让 content script 重新加载规则

**解决方案**：
1. 保存规则后按 `F5` 刷新页面
2. 再次发送请求

### 问题 3：DevTools Panel 看不到

**解决方案**：
1. 确认已重新加载插件
2. 检查 DevTools 顶部标签栏
3. 点击 `>>` 按钮查找「接口 Mock」标签
4. 如果还是没有，检查 `dist/manifest.json` 是否包含 `"devtools_page": "devtools.html"`

### 问题 4：Console 报错

**常见错误 1**：`Cannot read property 'getCurrentProjectId' of undefined`

**解决方案**：
```bash
# 检查 content.js 是否包含 currentProject 模块
grep "current-project" dist/content.js
# 如果没有，说明 build 有问题，重新构建
npm run build
```

**常见错误 2**：`chrome.runtime.sendMessage is not a function`

**解决方案**：
- 这是正常的，在 Panel 关闭时会出现
- 不影响功能

## ✅ 验证清单

完整测试后，应该满足：

- [ ] 测试服务器正常运行（`http://localhost:8080`）
- [ ] 插件已重新加载
- [ ] DevTools 中看到「接口 Mock」标签
- [ ] 点击按钮后左侧显示接口列表
- [ ] 点击接口后右侧显示详情
- [ ] 一键生成假数据功能正常（name→姓名，email→邮箱）
- [ ] 保存规则无报错
- [ ] 刷新页面后 Mock 生效（返回假数据）
- [ ] Console 显示拦截日志（`[Mock Interceptor] Matched rule for...`）
- [ ] 切换项目后规则仍然有效

## 🎯 下一步

测试通过后，你可以：

1. **在真实项目中使用**：
   - 打开 `https://gpt-admin-pre.hwzxs.com`
   - 触发接口请求
   - 在 DevTools Mock Panel 中配置规则

2. **添加更多项目**：
   - 编辑 `src/common/projects.js`
   - 添加新的项目配置
   - `npm run build`
   - 重新加载插件

3. **扩展功能**：
   - 添加规则启用/禁用开关
   - 支持规则导入/导出
   - 支持延迟响应
   - 支持修改状态码

---

**测试完成标志**：所有 ✅ 都打勾，Mock 功能完全可用！
