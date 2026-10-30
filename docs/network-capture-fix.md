# 网络请求捕获实现与排查

本文说明「接口 Mock」捕获页面请求的当前实现，以及列表为空时的检查顺序。

## 脚本运行位置

内容脚本运行在 Chrome 扩展的隔离环境，负责接收和转发消息。页面自身发起的 `fetch`、`XMLHttpRequest` 由运行在页面主环境的 `src/content/mock-hook.js` 拦截。

面板激活或开启 Mock 总开关时，后台检查开关状态，再调用 `chrome.scripting.executeScript()` 注入 `mock-hook.js`。注入后，脚本会替换当前页面的请求函数，直至页面环境被刷新或导航重建。再次注入同一页面时，脚本内的标记会避免重复安装。

## 调用流程

```text
接口 Mock 面板
  → SET_HOOK_ACTIVE / SET_MOCK_ENABLED
  → 后台确认 Mock 总开关开启
  → chrome.scripting.executeScript({ world: 'MAIN', files: ['mock-hook.js'] })
  → 内容脚本向页面同步规则和激活状态
  → 页面脚本拦截 fetch / XMLHttpRequest
  → window.postMessage 上报 IDT_REQUEST_LOGGED
  → 内容脚本合并接口记录并发送 REQUEST_LOGGED
  → 面板读取和展示捕获列表
```

后台注入代码位于 `src/background/index.js`：

```javascript
await chrome.scripting.executeScript({
  target: { tabId, allFrames: true },
  world: 'MAIN',
  files: ['mock-hook.js'],
});
```

内容脚本在页面加载时注册消息监听；页面请求拦截脚本由上述流程按需注入。页面刷新后，面板的导航处理会重新激活并触发注入，注入完成前已结束的请求需再次触发。

## 规则与开关

- `IDT_UPDATE_MOCK_RULES`：更新页面规则。
- `IDT_SET_ACTIVE`：控制请求记录和上报。
- `IDT_SET_MOCK_ENABLED`：控制总开关，关闭时停止拦截和记录。
- `IDT_UPDATE_MONITOR_DISABLED`：更新禁监接口列表，命中的接口跳过记录。

已注入脚本的 Mock 响应由总开关及规则配置控制；面板激活状态用于控制捕获和上报。保存规则后，后台先写入扩展存储，再通过 `APPLY_MOCK_RULES` 通知内容脚本，由内容脚本发送 `IDT_UPDATE_MOCK_RULES` 更新页面中的规则。

捕获记录按“方法＋去掉查询参数和片段的地址”合并，最多保留 100 个接口条目；同一接口再次请求更新原条目。

## 测试步骤

1. 执行 `npm run build`，重新加载扩展。
2. 执行 `npm run test-server`，打开 `http://localhost:8080`。
3. 重开开发者工具中的「接口 Mock」，确认总开关开启并等待注入完成。
4. 点击测试页面的请求按钮，查看捕获列表及页面控制台。
5. 选择捕获接口，开启接口拦截，切到「出参」，编辑 JSON 或点击「生成假数据」，再点击「保存」。
6. 保持当前页面，再次发送请求，确认使用刚保存的假数据。

页面控制台可出现以下日志：

```text
[Mock Interceptor - Page Context] Script started
[Mock Interceptor - Page Context] fetch hooked
[Mock Interceptor - Page Context] XMLHttpRequest hooked
[Mock Interceptor - Page Context] Rules updated:
[Mock Interceptor - Page Context] Active set to true
[Mock Interceptor - Page Context] Recording request:
[Mock Interceptor - Page Context] Mock response for
```

XMLHttpRequest 命中出参规则时输出 `Mock response for XHR`。同一页面重复注入时输出 `Already installed, skip`。

当前保存提示仍含「刷新页面后生效」的旧文字。脚本已注入、总开关开启且规则消息送达时，新规则会直接用于后续请求。

## 捕获列表为空时

1. 检查 Mock 总开关、面板激活状态及接口的禁监状态。
2. 确认请求由当前页面的 fetch 或 XMLHttpRequest 发起，且在脚本就绪后再次触发。
3. 检查 `manifest.json` 的 `content_scripts.matches` 与 `devtools_page` 配置，及后台注入是否报错。
4. 扩展重载后出现发送消息错误或上下文失效提示时，关闭并重新打开开发者工具，再刷新被调试页面。

## 文件分工

| 文件 | 作用 |
|---|---|
| `src/background/index.js` | 按需注入页面脚本、同步激活和总开关状态 |
| `src/background/mock-handler.js` | 保存并推送规则 |
| `src/content/mock-hook.js` | 拦截页面请求、按条件上报记录 |
| `src/content/mock-interceptor.js` | 中转消息、合并和保存运行时记录 |
| `devtools/panel.js` | 激活面板、编辑规则和展示数据 |
| `scripts/build.js` | 复制 `mock-hook.js` 及开发者工具资源 |

完整操作见 [Mock 使用指南](mock-feature-guide.md)，验证清单见 [快速测试指南](mock-test-guide.md)。
