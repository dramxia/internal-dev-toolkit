# 多项目架构测试指南

本文面向维护插件的开发者，按当前代码说明任务切换、数据保存和迁移的检查方法。

## 相关文件

| 文件 | 作用 |
|---|---|
| `src/common/projects.js` | 注册项目、接口路径和启用的功能 |
| `src/common/current-project.js` | 读取和切换后台项目，迁移旧存储键 |
| `src/common/credentials.js`、`src/common/token.js` | 按项目保存后台账号和 Token（登录凭证） |
| `src/common/admin-login-history.js` | 保存后台登录历史、更新当前登录信息 |
| `src/background/quick-login.js` | 执行快捷登录、按项目保存最近使用记录 |
| `src/background/api.js`、`tenant-api.js`、`cookies.js`（同目录） | 按当前后台项目选择登录地址、查询接口和 Cookie |
| `src/background/admin-token-injection.js` | 向同源网站的 `localStorage.token`、`userInfo` 写入登录信息 |
| `src/background/index.js` | 后台 Service Worker 入口，启动时加载项目并迁移数据 |
| `src/popup/workspace-ui.js` | 生成底部任务入口，切换任务和历史、Token 等工具页 |
| `src/popup/index.js` | 注册各功能的初始化和激活处理 |
| `scripts/build.js` | 生成根目录脚本、`manifest.json` 和 `dist/` |

## 1. 加载插件

在仓库根目录执行：

```bash
npm run build
```

打开 `chrome://extensions/`，开启「开发者模式」，加载 `dist/`；已加载时点击「重新加载」。点击扩展图标打开右侧栏。

当前注册项目为「AI平台」「高校」「APP」，底部入口为「后台、关系、高校、APP、定位」。其中「后台」「关系」使用 AI平台的后台项目上下文，「高校」「APP」使用各自模块的数据，「定位」是独立工具。

## 2. 检查旧数据迁移

迁移在后台 Service Worker 启动时执行。升级前先备份扩展的本地数据，再加载新版。

在 `chrome://extensions/` 找到插件，点击「Service Worker」打开后台控制台。存在旧数据且迁移刚执行时，会输出：

```text
[Migrate] Moved old storage to project: gpt-admin-pre
```

在该控制台查看指定的扩展存储键：

```javascript
chrome.storage.local.get([
  'adminToken', 'adminCredentials', 'quickLoginRecent',
  'adminToken:gpt-admin-pre',
  'adminCredentials:gpt-admin-pre',
  'quickLoginRecent:gpt-admin-pre'
], console.log);
```

预期：存在的旧值被写入默认项目对应的新键，随后删除三个无项目后缀的旧键。这里检查的是扩展的 `chrome.storage.local`。网站的 `localStorage` 用于网站登录信息，迁移结果应在扩展存储中查看。

## 3. 检查任务和数据保存

1. 进入「后台」，登录成功后检查 `adminToken:gpt-admin-pre` 和 `adminCredentials:gpt-admin-pre`。
2. Token 记录包含 `token`、`updatedAt`，新登录记录还带有 `origin`、`siteToken`、`userInfo`，供网站注入使用。
3. 进入「关系」完成一次查询，再关闭并打开侧栏，检查搜索条件、选择和结果恢复情况。
4. 进入「高校」或「APP」，检查顶部项目名称随任务变化，底部仍保留全部已注册入口，`currentProjectId` 保留之前的后台项目编号。
5. 登录成功或应用后台登录历史后，当前项目的关系查询和最近使用记录会清空；同一账号重新登录也执行这一处理。

后台账号、Token、登录历史和最近使用记录使用带项目编号的键。高校使用固定的 `otherLogin*` 键，APP 使用固定的 `appLogin*` 键；注册多个同类高校或 APP 项目时，会共用对应模块的数据。

## 4. 检查多个后台项目

需要准备第二个后台项目时，在 `src/common/projects.js` 的 `PROJECTS` 中追加实际可用配置。例如：

```javascript
{
  id: 'test-backend',
  name: '测试后台',
  baseUrl: 'http://localhost:3000',
  authPath: '/api/auth',
  tenantApiPaths: {
    tenantPage: '/api/tenant/page',
    deptList: '/api/dept/list',
    userPage: '/api/user/page',
    accountPage: '/api/user/account/page',
    virtualLogin: '/api/user/virtualLogin',
  },
  cookieKeys: ['SESSION_ID'],
  enabledFeatures: ['adminPanel'],
  hosts: ['localhost'],
}
```

构建并重新加载插件后，逐项检查：

1. 底部出现测试后台对应任务，顶部 `workspaceProject` 显示任务所属项目。
2. 从默认后台切到测试后台时，界面直接切换，`currentProjectId` 更新为 `test-backend`。
3. 当前后台账号表单只在首次初始化时读取；切换任务后会保留先前显示的输入内容。登录前核对账号和 API 地址，数据隔离通过存储键检查。
4. 测试项目启用 `adminPanel` 时生成「后台」入口；增加 `quickLogin` 后才生成该项目的「关系」入口。
5. 两个项目的后台存储分别使用 `:gpt-admin-pre` 和 `:test-backend` 后缀。单纯切换项目时，各项目最近使用记录保留。
6. 各项目可设置自己的 `customBaseUrl:<projectId>`。后台请求优先使用该值，空值时使用项目 `baseUrl`。

## 5. 检查构建配置

运行 `npm run check` 可构建并校验语法、JSON；该命令会更新构建产物。当前生成的 `manifest.json` 使用 `<all_urls>` 作为主机权限及内容脚本匹配范围。配置变更后通过构建生成此文件。

## 接入新功能

1. 在项目的 `enabledFeatures` 中加入功能编号。
2. 在 `src/popup/workspace-ui.js` 的 `FEATURE_META` 中注册名称、面板编号、项目上下文要求等信息；生成入口时会跳过尚未注册的功能编号。
3. 在根目录 `popup.html` 添加对应面板和控件。
4. 实现功能模块，在 `src/popup/index.js` 通过 `registerFeatureLifecycle()` 注册初始化、激活等处理。
5. 按依赖顺序加入 `scripts/build.js` 对应文件列表，再构建和检查。

## 数据恢复与排查

- **迁移日志未出现**：先查看扩展存储。旧键已经迁移后，后续启动会直接跳过迁移。
- **切换后仍显示原账号或 Token**：先确认任务是否使用后台项目上下文，再查看带项目后缀的存储键。当前后台表单的显示内容会跨任务保留。
- **新增任务未出现**：检查 `enabledFeatures`、`FEATURE_META` 和初始化注册，再构建、重新加载。
- **删除项目后的数据**：其扩展存储键仍会保留；需要清理时先备份，再按确切项目编号删除。
- **回退到旧版代码**：旧键已在迁移时删除。回退前备份当前扩展存储，再恢复与旧版结构匹配的备份；缺少备份时，需将目标项目的数据转换为旧版要求的无后缀键。确认数据格式后再运行旧版。

## 验证清单

- [ ] 构建和配置检查通过。
- [ ] 在后台控制台确认迁移结果及旧键删除情况。
- [ ] 底部任务入口、顶部项目名称正确。
- [ ] 后台任务切换更新项目上下文，高校和 APP 保留原后台项目上下文。
- [ ] 后台数据按项目保存，高校和 APP 按模块保存。
- [ ] 已记录账号表单跨任务保留输入的当前行为。
- [ ] 成功登录或应用历史清空当前项目的关系查询和最近使用记录。
- [ ] 关闭侧栏后重新打开，关系查询按当前后台登录信息恢复。
