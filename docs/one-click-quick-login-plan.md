# 一键快捷登录方案设计

> 适用插件：内部开发工具箱（Chrome MV3）  
> 目标站点：`https://gpt-admin-pre.hwzxs.com`

## 1. 背景与目标

当前插件已支持：
- 后台账号密码保存
- 通过 `/huayun-ai/admin/auth/*` 登录并获取管理员 `token`
- 将 `token` 注入目标页面 `window.__ADMIN_TOKEN__`

新增 **一键快捷登录** 能力：
在管理员已登录（持有有效 `token`）的前提下，插件自动调用租户/用户查询接口，让开发/测试人员 **在 popup 里搜索租户 → 选择用户 → 一键登录到该用户对应的前端会话**，无需手动找账号、输密码、过验证码。

> 本方案默认用于 **pre/测试环境**，严禁在生产环境或敏感数据上滥用。

## 2. 核心流程

```text
┌─────────────┐     打开 popup      ┌─────────────┐
│  管理员已登录  │ ────────────────→ │  读取本地 token  │
└─────────────┘                     └──────┬──────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ▼                        ▼                        ▼
           ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
           │ GET /tenant/page │    │ GET /dept/list   │    │ GET /tenant/user/page│
           │ 搜索租户        │    │ 获取部门下拉     │    │ 获取用户列表     │
           └────────┬────────┘    └─────────────────┘    └────────┬────────┘
                    │                                             │
                    ▼                                             ▼
           ┌─────────────────┐                           ┌─────────────────┐
           │ 租户选择 + 搜索  │ ── 选中租户 ─────────────→ │ 部门筛选 + 用户搜索 │
           └─────────────────┘                           └────────┬────────┘
                                                                  │
                                                                  ▼
                                                        ┌─────────────────┐
                                                        │ 点击「一键登录」  │
                                                        └────────┬────────┘
                                                                  │
                                                                  ▼
                                                        ┌─────────────────┐
                                                        │ 调用 quickLogin  │
                                                        │ 或打开新标签注入   │
                                                        └─────────────────┘
```

## 3. 功能范围

| 能力 | 说明 | 优先级 |
|------|------|--------|
| 租户搜索 | 输入关键字，分页拉取 `tenant/page` | P0 |
| 租户选择 | 下拉列表展示租户名 + 域名，支持清空 | P0 |
| 部门筛选 | 选中租户后拉取 `dept/list`，作为用户列表筛选 | P1 |
| 用户搜索 | 按姓名/手机号搜索用户（复用 `tenant/user/page` 的 keyword） | P1 |
| 一键登录 | 选中用户后，调用后台快捷登录接口或打开目标域名并注入用户态 | P0 |
| 最近登录 | 本地保存最近 5 条登录记录，便于二次快捷进入 | P2 |
| 环境标识 | 在 popup 顶部显示当前环境（pre/prod）并加红标警示 | P1 |

## 4. 调用接口清单

基于已提供的 curl 整理：

### 4.1 租户分页
```http
POST https://gpt-admin-pre.hwzxs.com/huayun-ai/admin/tenant/page
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "current": 1,
  "size": 10,
  "searchType": ["tenantName","contactName","contactPhone","domain"],
  "keyword": ""
}
```

### 4.2 部门列表
```http
POST https://gpt-admin-pre.hwzxs.com/huayun-ai/admin/dept/list
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "tenantId": "139" }
```

### 4.3 用户分页
```http
POST https://gpt-admin-pre.hwzxs.com/huayun-ai/admin/tenant/user/page
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "current": 1,
  "size": 10,
  "deptId": "425",
  "tenantId": "139",
  "deptSource": { "name": "钉钉", "value": "dingtalk", "icon": "dingtalk" }
}
```

### 4.4 一键登录（真实接口）

```http
POST https://gpt-admin-pre.hwzxs.com/huayun-ai/admin/tenant/user/virtualLogin
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "id": "26361" }
```

说明：
- 入参为选中用户的 `id`（租户用户表主键，不是 `userId`）；
- 出参 `data` 为可直接打开的 URL 字符串，例如 `https://uuu.huayungpt.com?token=Bearer xxx`；
- 插件提取 `data` 后在新标签页打开。

## 5. UI 设计

### 5.1 整体布局

在 popup 现有「后台账号 / Token」区域下方新增 **快捷登录** 折叠面板：

```
┌─────────────────────────────────┐
│ 🛠️ 内部开发工具箱                │
├─────────────────────────────────┤
│ 当前页面: xxx                    │
├─────────────────────────────────┤
│ 后台账号                          │
│ ...                              │
├─────────────────────────────────┤
│ Token                            │
│ ...                              │
├─────────────────────────────────┤
│ ⚡ 快捷登录 [展开/收起]           │  ← 新增
│ ┌─────────────────────────────┐ │
│ │ 选择租户                     │ │
│ │ [🔍 搜索租户...        ] [▼] │ │
│ │ 华为云预览 (huawei-pre)      │ │
│ │                              │ │
│ │ 部门: [全部 ▼]               │ │
│ │ 用户: [🔍 搜索用户...    ]    │ │
│ │                              │ │
│ │ ┌────────────────────────┐  │ │
│ │ │ 张三  138****1234  [登录]│  │ │
│ │ │ 李四  139****5678  [登录]│  │ │
│ │ └────────────────────────┘  │ │
│ │          1/3  [加载更多]    │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 最近登录                          │
│ 张三 @ 华为云预览 · 2分钟前      │
└─────────────────────────────────┘
```

### 5.2 视觉规范

沿用现有 dark theme：
- 背景：`#1a1a2e`
- 卡片：`#11111f` + 边框 `#333`
- 主按钮：`#4a6cf7`
- 危险/警示：`#ff8a8a` / `#3a1f1f`
- 成功文字：`#6fe39a`
- 折叠面板标题：`#8fb3ff`

新增组件样式类：
- `.quick-login-section`：折叠面板容器
- `.quick-login-header`：标题 + 展开图标
- `.tenant-select`：可搜索下拉
- `.dept-select`：部门下拉
- `.user-list`：用户列表
- `.user-item`：用户行
- `.user-item__btn`：登录按钮
- `.env-badge`：环境标签（pre 黄、prod 红）

### 5.3 交互细节

1. **折叠面板**：默认收起，点击标题展开；展开后若已保存 token 则自动加载一次租户列表。
2. **租户搜索**：输入框防抖 300ms，触发 `tenant/page`，下拉展示最多 10 条。
3. **租户选择**：选中后清空用户列表，自动加载部门列表和第一页用户。
4. **部门筛选**：切换时重置用户分页到第一页。
5. **用户搜索**：输入框防抖 300ms，按 `keyword` 查询。
6. **一键登录**：
   - 按钮显示「登录中」并禁用，防止重复点击；
   - 成功：在新标签打开目标页并提示「已登录到 xxx」；
   - 失败：在按钮下方红色提示错误原因。
7. **最近登录**：登录成功后写入 `chrome.storage.local`，最多 5 条，点击可直接复现上一次登录。

## 6. 状态管理

### 6.1 存储键

| 键 | 类型 | 说明 |
|---|---|---|
| `adminToken` | `{ token, updatedAt }` | 已有 |
| `adminCredentials` | `{ account, password }` | 已有 |
| `quickLoginConfig` | `{ quickLoginUrl, mode }` | 新增：快捷登录接口配置 |
| `quickLoginRecent` | `Array<{tenantId, tenantName, userId, userName, domain, at}>` | 新增：最近登录记录 |

### 6.2 Popup 运行时状态

无需持久化，存储在内存对象中：
```js
const state = {
  tenantKeyword: '',
  selectedTenant: null,
  deptId: '',
  userKeyword: '',
  userPage: { current: 1, size: 10, total: 0, records: [] },
  loading: false,
  error: '',
};
```

## 7. 技术架构

### 7.1 新增/修改文件

```text
src/
├── common/
│   └── tenant.js          # 新增：租户/用户/部门 API 参数封装与响应解析
├── background/
│   ├── tenant-api.js      # 新增：跨域调用 tenant/page, dept/list, tenant/user/page
│   ├── quick-login.js       # 新增：virtualLogin 调用与最近登录记录
│   └── index.js             # 修改：注册新的消息类型
├── popup/
│   ├── quick-login-ui.js    # 新增：快捷登录 UI 渲染与事件绑定
│   └── index.js             # 修改：初始化 quick-login-ui
├── popup.html               # 修改：新增快捷登录 DOM
scripts/build.js             # 修改：加入新文件到 bundle
```

### 7.2 消息类型

| 消息类型 | 方向 | 说明 |
|---|---|---|
| `FETCH_TENANTS` | popup → background | 查询租户分页 |
| `FETCH_DEPTS` | popup → background | 查询部门列表 |
| `FETCH_USERS` | popup → background | 查询用户分页 |
| `QUICK_LOGIN` | popup → background | 执行一键登录 |
| `GET_QUICK_LOGIN_RECENT` | popup → background | 读取最近登录记录 |

## 8. 错误处理

| 场景 | 处理 |
|---|---|
| 未获取 admin token | 快捷登录面板显示「请先进行 API 登录」，禁用操作 |
| 网络 / CORS 失败 | 提示「接口请求失败：xxx」，保留当前选择 |
| 接口返回业务错误 | 提取 `msg` 字段展示 |
| 用户未选择租户 | 禁用用户搜索，提示「先选择租户」|
| virtualLogin 请求失败 | 提示「登录失败：xxx」，并在控制台打印完整响应 |

## 9. 安全与权限

1. **最小权限**：新的跨域请求仅针对 `https://*.hwzxs.com/*`，已在 `manifest.json` 中声明。
2. **Token 隔离**：用户 token 与 admin token 分别存储，避免误覆盖。
3. **环境警示**：popup 顶部识别 `gpt-admin-pre` / `gpt-admin` 域名，显示 pre（黄）或 prod（红）标签。
4. **审计日志**：每次 `QUICK_LOGIN` 在后台记录 `{tenantId, id, at}` 到 `chrome.storage.local`，便于排查。
5. **生产限制**：建议在配置中增加 `allowQuickLoginInProduction: false`，生产环境禁用一键登录按钮。

## 10. 实现步骤（Roadmap）

1. **Phase 1：基础查询能力**
   - 新增 `src/common/tenant.js` 定义接口参数和响应结构；
   - 新增 `src/background/tenant-api.js` 实现跨域调用；
   - popup 新增租户搜索 UI，能拉取并展示租户列表。

2. **Phase 2：用户选择**
   - 实现部门列表拉取与筛选；
   - 实现用户分页列表；
   - 支持用户关键字搜索与加载更多。

3. **Phase 3：一键登录**
   - 调用 `POST /huayun-ai/admin/tenant/user/virtualLogin`，入参为 `{ id: "租户用户id" }`；
   - 提取响应 `data` 中的 URL 并在新标签页打开；
   - 保存最近登录记录。

4. **Phase 4： polish**
   - 加载骨架屏；
   - 空状态提示；
   - 错误重试；
   - 更新 README。

## 11. 待确认事项

1. `tenant/user/page` 的响应字段中租户用户唯一标识为 `id`（用于 virtualLogin），用户真正 ID 为 `userId`；
2. `dept/list` 返回的是树形结构，是否需要递归展开？
3. 是否允许在生产环境域名 `gpt-admin.hwzxs.com` 上使用该功能？

## 12. 附录：virtualLogin 接口

```http
POST https://gpt-admin-pre.hwzxs.com/huayun-ai/admin/tenant/user/virtualLogin
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "id": "26361" }
```

- 请求体字段 `id` 对应 `tenant/user/page` 返回的 **租户用户 id**（注意不是 `userId`）；
- 响应 `data` 是可直接打开的 URL，插件会提取后在新标签页打开；
- 如需修改打开方式，调整 `src/background/quick-login.js` 的 `openLoginUrl`。

