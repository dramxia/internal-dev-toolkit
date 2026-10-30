# Mock 功能快速测试指南

本文用于验证当前面板的捕获、编辑、保存和请求拦截。

## 1. 准备测试页面

在仓库根目录执行：

```bash
npm run build
npm run test-server
```

测试服务使用 `http://localhost:8080`，提供以下接口：

- `GET /api/user/list`
- `POST /api/user/detail`
- `POST /api/login`

在 `chrome://extensions/` 加载或重新加载插件。扩展重载后，关闭旧开发者工具，打开 `http://localhost:8080` 并刷新页面，再重新打开开发者工具中的「接口 Mock」。开启 Mock 总开关，等待注入完成。

## 2. 查看真实请求

依次点击测试页面上的三个请求按钮。

预期：

- 左侧「捕获」显示三个接口条目，记录包含方法、地址、状态和时间等信息。
- 点击接口后，右侧可切换「出参」「入参」，查看对应数据。
- 同一接口再次请求时更新原条目。查询参数、片段或请求体变化也会合并；内容脚本最多保留 100 个接口条目。
- 拦截开关关闭时，编辑器只读，「生成假数据」按钮置灰。

## 3. 编辑与生成

1. 选择 `POST /api/user/detail`，开启接口拦截开关。
2. 选择「出参」，点击「生成假数据」。
3. 检查 `name`、`email`、`phone`、`id` 等字段变化。
4. 修改一个容易辨认的字段，例如将姓名设为「Mock 测试用户」。
5. 切到「入参」再切回「出参」，检查草稿仍保留。

预期：捕获页开启开关后显示待保存状态，生成后提示「假数据已生成，请点击保存」。切换入参、出参只保留面板草稿。

面板使用简化生成器：`uuid` 生成整数，数字类型的 `createdAt` 生成普通整数；完整规则见 [生成器说明](mock-generator-features.md)。

## 4. 保存并验证

1. 点击「保存」，检查 Emo 列表出现对应规则。
2. 保持当前页面，再次点击 `POST /api/user/detail`。
3. 检查测试页响应包含「Mock 测试用户」，捕获列表原条目更新为本次结果。
4. 将响应状态码改为有效测试值，例如 `404`，保存后再次发起请求，检查状态码。

预期：脚本已注入且总开关开启时，保存会立即推送规则，后续请求使用新规则。界面目前仍显示「已保存，刷新页面后生效」的旧提示。正常验证可直接再次发送请求；重载扩展后则需重开开发者工具并刷新页面。

## 5. 检查规则启停和草稿保存

1. 在 Emo 中关闭该规则，重新发请求，应收到真实响应。
2. 重新开启，已保存的 Mock 数据和头部编辑值应恢复。
3. 修改出参、切到入参修改，再点击「保存」；重新打开开发者工具后检查两份数据均已保存。
4. 在捕获页只调整开关，检查规则仍处于待保存状态；点击「保存」后再验证请求。
5. 关闭 Mock 总开关，确认请求恢复真实响应且捕获条目停止更新，再开启继续测试。

Emo 和已编中的规则开关会立即写入，同时保存当前待提交的改动。捕获页的开关通过「保存」提交。

## 6. 检查项目存储

当前项目注册表包含「AI平台」「高校」「APP」。默认后台项目编号为 `gpt-admin-pre`，测试页面地址为 localhost 时，规则仍按当前后台项目编号保存。

在扩展后台 Service Worker 控制台检查：

```javascript
chrome.storage.local.get([
  'currentProjectId',
  'mockRules:gpt-admin-pre'
], console.log);
```

侧栏切到高校或 APP 时，会保留原后台项目上下文。多后台项目测试需先按 [多项目指南](multi-project-architecture-test-guide.md) 准备第二个后台项目，再分别保存规则、检查 `mockRules:<projectId>`。

切换后台项目本身只更新上下文，已打开页面中的旧规则仍保留。重新激活面板触发注入或下一次保存后，再检查页面收到的当前项目规则。测试时分别核对扩展存储与页面实际响应。

## 排查方法

### 捕获列表为空

1. 确认 Mock 总开关开启，面板已激活，该接口已允许监听。
2. 检查 `manifest.json` 的内容脚本配置与 `devtools_page`，构建后重新加载扩展。
3. 在脚本就绪后重新触发页面的 fetch 或 XMLHttpRequest 请求。
4. 在页面控制台查找以下日志：

```text
[Mock Interceptor] Initializing in content script...
[Mock Interceptor - Page Context] Script started
[Mock Interceptor - Page Context] fetch hooked
[Mock Interceptor - Page Context] XMLHttpRequest hooked
[Mock Interceptor - Page Context] Active set to true
[Mock Interceptor - Page Context] Recording request:
```

重复激活同一页面时，可能看到 `Already installed, skip`。请求日志以实际请求为准。

### 规则保存后效果异常

检查请求方法、原始地址、规则启用状态和已保存的数据方向。地址、方法编辑值存入 `mockUrl/mockMethod`，当前匹配使用原始 `rule.url/rule.method`。正常同步可看到 `Rules updated:`，出参命中时可看到 `Mock response for` 或 `Mock response for XHR`。

### 出现扩展上下文失效或发送消息错误

遇到 `Extension context invalidated`、`chrome.runtime.sendMessage is not a function` 等发送异常时，按面板提示关闭并重新打开开发者工具，再刷新被调试页面。面板会将这些异常按扩展上下文失效处理。

## 验证清单

- [ ] 测试服务运行，三个接口可正常返回真实数据。
- [ ] 面板激活且总开关开启后能捕获请求。
- [ ] 同一接口重复请求会更新原条目。
- [ ] 关闭拦截时只读，开启后可编辑并生成假数据。
- [ ] 捕获页开关和入参、出参草稿按预期保存，保存后进入 Emo。
- [ ] 页面脚本已就绪时，新规则用于后续请求。
- [ ] 自定义状态码、规则启停和 Mock 总开关生效。
- [ ] 两份数据在显式保存后可重新读取。
- [ ] 规则存储键与当前后台项目编号一致。
- [ ] 扩展重载后的面板恢复步骤有效。
