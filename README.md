# 内部开发工具箱

公司内部开发用浏览器插件脚手架（Chrome MV3）。提供页面增强、工具栏弹窗、设置持久化、消息通信以及租户用户一键快捷登录，可作为内部工具开发的起点。

**支持多项目管理**：在同一插件内配置多个后台项目，每个项目独立的登录态、API 路径和功能组合。

## 功能

- **多项目架构**：通过 `src/common/projects.js` 静态注册多个后台项目，popup 顶部切换器快速切换，每个项目独立存储 token/账号密码/最近登录记录
- **页面就绪标记**：在匹配域名页面右下角注入「内部工具箱已就绪」标记
- **工具栏弹窗**：显示当前页面标题 / URL，并提供后台账号管理与 Token 操作
- **设置持久化**：账号密码、Token 与最近登录记录通过 `chrome.storage.local` 保存（按项目命名空间隔离）
- **消息通信**：popup ↔ content ↔ background 三方消息链路示例
- **后台 API 登录**：通过账号密码跨域调用后台登录接口，获取并保存 admin token，同时可在目标页面自动注入 `window.__ADMIN_TOKEN__`
- **一键快捷登录**：在已获取 admin token 的前提下，搜索租户 → 选择部门 → 搜索用户 → 一键登录到指定用户的前端会话（调用 `virtualLogin` 并在新标签页打开返回 URL）
- **最近登录记录**：快捷登录成功后本地保存最近 10 条记录，便于再次进入

## 安装方法

### 1. 生成图标与构建

```bash
npm run icons   # 生成占位 PNG 图标（首次或图标缺失时执行）
npm run build   # 打包 content.js / popup.js / background.js 并输出到 dist/
```

### 2. 加载到 Chrome

1. 打开 `chrome://extensions/`
2. 右上角开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `internal-dev-toolkit` 文件夹（或构建后的 `dist/` 目录）

## 配置多项目

### 新增项目

编辑 `src/common/projects.js`，在 `PROJECTS` 数组中追加配置对象：

```js
{
  id: 'my-backend',                              // 唯一 ID
  name: '我的后台',                               // 显示名称
  baseUrl: 'https://my-backend.example.com',     // 后台域名
  authPath: '/api/admin/auth',                   // 登录接口路径前缀
  tenantApiPaths: {                              // 租户/用户 API 路径（可选，无快捷登录功能可省略）
    tenantPage: '/api/tenant/page',
    deptList: '/api/dept/list',
    userPage: '/api/user/page',
    virtualLogin: '/api/user/virtualLogin',
  },
  cookieKeys: ['SESSION_ID'],                    // WAF Cookie 名称（按实际情况）
  enabledFeatures: ['adminPanel', 'quickLogin'], // 启用的功能：adminPanel（账号&Token）/ quickLogin（快捷登录）
  hosts: ['my-backend.example.com'],             // 域名列表（支持 *.domain 通配符）
}
```

运行 `npm run build` 后，`manifest.json` 的 `host_permissions` 和 `content_scripts.matches` 会自动生成。

### 切换项目

打开 popup，顶部「项目」区域显示所有已注册项目的 pill 按钮，点击切换。每个项目独立的登录态和最近登录记录。

### 禁用某功能

修改项目配置的 `enabledFeatures` 数组：
- 移除 `'adminPanel'` → 隐藏「后台账号 & Token」卡片
- 移除 `'quickLogin'` → 隐藏「一键快捷登录」卡片

## 开发

```bash
npm run build   # 重新打包
npm run check   # 构建并做语法 / JSON 校验
```

零依赖构建：源码位于 `src/`，`scripts/build.js` 按依赖顺序拼接各模块，生成根目录 `content.js` / `popup.js` / `background.js`，并自动从 `src/common/projects.js` 生成 `manifest.json`。

**⚠️  `manifest.json` 由构建脚本自动生成，请勿手动编辑。**

## 文件结构

```text
internal-dev-toolkit/
├── src/
│   ├── common/
│   │   ├── projects.js          # 项目注册表（新增项目在此配置）
│   │   ├── current-project.js   # 当前激活项目管理 + 数据迁移
│   │   ├── credentials.js       # 账号密码读写（按项目命名空间）
│   │   ├── token.js             # 登录 token 读写（按项目命名空间）
│   │   └── tenant.js            # 租户/用户/部门数据模型与接口参数封装
│   ├── background/
│   │   ├── cookies.js           # 读取目标站 WAF Cookie（动态获取项目配置）
│   │   ├── api.js               # 后台登录接口调用（getCaptcha / login / valid / token 解析）
│   │   ├── tenant-api.js        # 租户/用户/部门跨域查询接口
│   │   ├── quick-login.js       # 一键登录执行与最近登录记录（按项目命名空间）
│   │   └── index.js             # Service Worker 消息入口 + 初始化（加载项目、数据迁移）
│   ├── content/
│   │   ├── index.js             # Content Script 入口
│   │   ├── ui.js                # 页面 UI 注入（Toast）
│   │   ├── messages.js          # 消息通信（popup/background/content）
│   │   ├── api-token.js         # 将 token 注入页面
│   │   └── api-proxy.js         # 页面侧代理请求（备用链路）
│   └── popup/
│       ├── index.js             # popup 主逻辑
│       └── quick-login-ui.js    # 快捷登录面板 UI
├── scripts/
│   ├── build.js                 # 零依赖构建脚本
│   └── gen-icons.js             # 占位图标生成
├── dist/                        # 构建输出
├── docs/
│   └── one-click-quick-login-plan.md  # 快捷登录方案设计
├── manifest.json                # 插件配置（MV3）
├── background.js                # 构建产物（Service Worker）
├── content.js                   # 构建产物
├── popup.html                   # 工具栏弹窗界面
├── popup.js                     # 构建产物
├── styles.css                   # 注入样式
└── icons/
```

## 扩展指引

- 新增页面能力：在 `src/content/` 下新增模块，加入 `scripts/build.js` 的 `contentFiles`（注意依赖顺序，被依赖者在前）。
- 新增后台能力：在 `src/background/` 下新增模块，加入 `scripts/build.js` 的 `backgroundFiles`。
- 新增公共模块：在 `src/common/` 下新增模块，按需加入 `contentFiles` / `popupFiles` / `backgroundFiles`。
- 消息类型：
  - content 消息：在 `src/content/index.js` 的 `onMessage` 中扩展 `type` 分支，popup 通过 `ns.messages.sendToActiveTab(...)` 调用。
  - background 消息：在 `src/background/index.js` 的 `onMessage` 中扩展，popup 通过 `ns.messages.sendToBackground(...)` 调用。

## 后台 API 登录说明

插件通过 Service Worker 跨域请求 `https://gpt-admin-pre.hwzxs.com/huayun-ai/admin/auth/*`：

1. `POST /getCaptcha` → 获取 ticket
2. `POST /login` → 提交手机号、ticket、moveLength、加密后的密码，触发验证码下发
3. `POST /valid` → 提交手机号、固定验证码、加密后的密码，换取 token
4. 从 `/valid` 响应中解析 `token`（兼容 `data.token`、`data.accessToken`、`data.access_token` 等常见字段）
5. 保存到 `chrome.storage.local`，并在目标页面注入 `window.__ADMIN_TOKEN__`

> **注意**：默认使用 SHA-256 对密码做摘要。若后台采用其他加密方式，请修改 `src/background/api.js` 中的 `encryptPassword`。若 `/getCaptcha` 返回结构或验证码逻辑与当前假设不符，请同步调整 `extractTicket` / `extractMoveLength`。

## 一键快捷登录说明

在 popup 中展开「⚡ 一键登录到租户用户」面板后，按以下流程操作：

1. 确保已通过「API 登录」获取到 admin token。
2. 在「选择租户」输入框搜索并点选租户。
3. 在「部门筛选」下拉框选择部门（可选）。
4. 在「搜索用户」输入框输入姓名或手机号关键字。
5. 点击用户右侧的「登录」按钮，插件会调用 `POST /huayun-ai/admin/tenant/user/virtualLogin`，并在新标签页打开返回的 URL。
6. 登录成功后会自动保存到「最近登录」列表（最多 5 条）。

涉及接口：

- `POST /huayun-ai/admin/tenant/page` — 搜索租户分页
- `POST /huayun-ai/admin/dept/list` — 按租户查询部门列表
- `POST /huayun-ai/admin/tenant/user/page` — 按租户/部门/关键字查询用户分页
- `POST /huayun-ai/admin/tenant/user/virtualLogin` — 一键登录，入参 `{ id: "租户用户id" }`，返回可直接打开的 URL

> **安全提示**：快捷登录默认面向 pre / 测试环境，请避免在生产环境或包含敏感数据的租户上滥用。popup 顶部会根据当前域名显示 `PRE` / `PROD` / `DEV` 环境标识作为警示。

## 存储键说明

| 键 | 类型 | 说明 |
|---|---|---|
| `adminToken` | `{ token, updatedAt }` | admin 登录 token |
| `adminCredentials` | `{ account, password }` | 后台登录账号密码（明文存储，仅供内部自用） |
| `quickLoginRecent` | `Array<{ tenantId, tenantName, id, userName, domain, at }>` | 最近快捷登录记录 |
