# 师生关系查询与快捷登录实现说明

适用对象：维护内部开发工具箱的开发者。本文由早期方案更新而来，以当前工作区的实现为准。

## 1. 功能入口和地址

打开浏览器右侧栏，在底部点击「关系」，可选择「教师查学生」或「学生查教师」。后台账号、历史和 Token（登录凭证）分别在对应任务或工具页管理。

后台接口地址优先使用当前项目的 `customBaseUrl:<projectId>`，未设置时使用 `src/common/projects.js` 中的 `baseUrl`。默认项目地址为 `https://gpt-admin-pre.hwzxs.com`，可在「后台 Token 与 API 域名」工具页修改。接口路径从项目的 `tenantApiPaths` 读取。

每条记录可独立选择线上或本地目标。本地默认地址为 `http://localhost:8088`，端口可单独修改。该选择仅调整最终打开的地址，后台查询仍使用当前项目的 API 地址，AI 平台查询使用 `virtualLogin` 返回的来源地址。

## 2. 查询流程

```text
后台登录 → 保存当前项目的管理员 Token → 打开「关系」
  ├─ 教师查学生
  │   搜索租户（POST tenant/page）
  │   → 读取组织（POST dept/list）
  │   → 查询租户用户（POST tenant/user/page）
  │   → 选择租户用户，获取 AI 会话（POST tenant/user/virtualLogin）
  │   → 选择 AI 教师 → 按教学班级查询学生
  └─ 学生查教师
      搜索学生账号（POST tenant/user/account/page，accountType: 1）
      → 获取 AI 会话（POST tenant/user/virtualLogin）
      → 匹配学生 → 选择班级 → 查询班级教师关系
      → 回查常规后台账号（POST tenant/user/account/page，accountType: 0）
      → 使用解析出的后台账号 id 执行快捷登录
```

租户用户和后台账号记录中的 `id` 用于 `virtualLogin`；班级教师关系中的 `tmbId/userId` 用于反查对应后台账号。

## 3. 接口与请求参数

以下路径为默认项目配置。后台请求均使用 POST，并携带当前项目的管理员 Token。

| 路径 | 用途 |
|---|---|
| `/huayun-ai/admin/tenant/page` | 搜索租户分页 |
| `/huayun-ai/admin/dept/list` | 查询租户组织 |
| `/huayun-ai/admin/tenant/user/page` | 按租户、组织和姓名或手机号查询用户 |
| `/huayun-ai/admin/tenant/user/account/page` | 按姓名、账号或租户名称查询学生、常规账号 |
| `/huayun-ai/admin/tenant/user/virtualLogin` | 获取指定租户用户的 AI 登录地址 |

租户搜索请求体：

```json
{
  "current": 1,
  "size": 10,
  "searchType": ["tenantName", "contactName", "contactPhone", "domain"],
  "keyword": ""
}
```

组织查询请求体：

```json
{ "tenantId": "139" }
```

租户用户搜索请求体：

```json
{
  "current": 1,
  "size": 10,
  "deptId": "425",
  "tenantId": "139",
  "deptSource": { "name": "钉钉", "value": "dingtalk", "icon": "dingtalk" },
  "searchKey": "张三",
  "searchType": "username,phone"
}
```

学生账号搜索固定传 `accountType: 1`，并按用户选中的搜索方式传 `username`、`account`、`tenantName` 其中一个文本条件；反查教师使用 `accountType: 0`。

快捷登录请求体为 `{ "id": "26361" }`。响应中的 `data` 是携带 Token 的完整登录地址。后台从该地址解析 AI 平台来源和 Token，供后续教师、学生、班级查询使用。

AI 平台接口使用对应会话的 Token，包括 `/huayun-ai/client/student/page`、`schoolDept/tree`、`schoolManageTeacher/listByClazz` 等。完整调用与响应解析见 `src/background/tenant-api.js`。

## 4. 当前界面与交互

侧栏使用浅色背景和绿色主色，样式定义在根目录 `popup.html`：页面底色为 `#F7F9F5`，面板底色为 `#FDFEFC`，主色为 `#4A7C59`。底部保持「后台、关系、高校、APP、定位」入口；关系查询有独立工作区。

- **教师查学生**：四步依次为选择租户、选择教师账号、确认教师、查看学生。租户支持分页，组织筛选放在账号步骤，名称相同时结合人数和编号区分。选账号后先按账号或手机号找教师，无结果时改按姓名找候选人。结果唯一且身份信息一致时自动进入学生列表；多条结果或身份待核对时手动选择。
- **完成步骤**：租户和教师显示摘要，已选账号直接展示完整卡片及登录、复制等操作。返回后重选原账号或教师可继续查看原结果；刷新教师列表保留仍在当前结果中的原教师与学生筛选，原教师已移除时提示重新选择。
- **学生 APP 登录**：学生行提供文字按钮「登录 APP」；登录地址默认折叠，点击「修改」编辑，地址校验失败时自动展开。教师班级读取失败后，学生区的刷新会重新读取班级再查询学生。
- **教学范围筛选**：相关学生可按学科、学段、年级、班级筛选，选项来自已选教师的教学范围；换教师后重新选择筛选项。
- **学生查教师**：先选搜索字段，再搜索学生账号，随后逐步选择学生、班级和教师关系。
- **打开目标**：每条可登录记录分别设置线上或本地地址。调整目标或端口后，查询结果与已取得的 AI 会话保留。
- **打开 AI 平台**：优先复用与目标同源的活动标签页；协议、域名或端口不同则新开标签页。
- **评价操作**：学生评价、教师评价、AI 评价始终新开标签页。
- **复制**：重新解析登录地址并复制其中的 `?token=...`；最近使用记录保持原样。

## 5. 查询恢复与记录保存

关闭再打开侧栏后，两条查询路径的搜索条件、分页结果、筛选和已选关系会从当前项目的查询快照恢复。进入「关系」任务时，若已有选中账号且后台 Token 可用，会重新请求其 AI 会话。教师路径还会重新读取所选租户的组织数据。

AI Token 等凭据保留在侧栏内存中，查询快照保存经过清理的查询数据。快照中的 `adminSessionId` 必须与当前后台登录信息一致；旧请求返回时也会检查登录信息是否已变化。

每次后台登录成功或应用历史记录都会清空当前项目的关系查询、AI 会话缓存和最近使用记录，包括同账号重新登录。单纯切换项目、关闭侧栏或重启浏览器时，各项目最近使用记录保留。

最近使用记录最多 10 条，以 `tenantId + id + role` 合并；同一身份和角色切换线上、本地或端口后更新同一条记录。环境与端口作为记录内容保存，删除按身份和角色处理。点击历史记录时重新获取会话。

| 存储键 | 内容 |
|---|---|
| `adminToken:<projectId>` | `{ token, updatedAt, origin, siteToken, userInfo }`，兼容旧版简化记录 |
| `adminCredentials:<projectId>` | 后台账号与密码 |
| `adminLoginHistory:<projectId>` | 后台登录历史，包含账号、地址和登录信息 |
| `adminSession:<projectId>` | 当前后台登录标识、账号及地址 |
| `quickLoginQueryState:<projectId>` | `{ version, updatedAt, state }`，保存两条查询路径快照 |
| `quickLoginRecent:<projectId>` | 身份、角色、目标环境、端口和使用时间等元数据 |

后台登录或手动注入由 `src/background/admin-token-injection.js` 向同源网站写入 `localStorage.token`、`userInfo`，随后跳转网站根目录。`origin` 记录登录来源，`siteToken` 保留网站所需的原始凭证格式。

## 6. 文件分工

```text
internal-dev-toolkit/
├── popup.html                         # 侧栏界面和样式
├── src/
│   ├── common/
│   │   ├── tenant.js                  # 后台查询参数、响应解析
│   │   ├── quick-login-state.js       # 查询快照保存与读取
│   │   └── admin-login-history.js     # 后台登录信息及切换处理
│   ├── background/
│   │   ├── tenant-api.js              # 后台及 AI 平台查询
│   │   ├── quick-login.js             # 登录地址、打开方式、最近使用记录
│   │   ├── admin-token-injection.js   # 网站登录信息注入
│   │   └── index.js                   # 消息分发
│   └── popup/
│       ├── workspace-ui.js            # 任务入口和工具页
│       ├── quick-login-ui.js          # 查询与快捷登录界面
│       └── index.js                   # 注册功能初始化处理
└── scripts/build.js                   # 构建文件列表及输出
```

## 7. 主要消息

下列消息由侧栏发给后台处理：

| 消息 | 用途 |
|---|---|
| `FETCH_TENANTS` / `FETCH_DEPTS` / `FETCH_USERS` | 查询租户、组织、租户用户 |
| `FETCH_ACCOUNT_USERS` | 查询学生或常规后台账号 |
| `RESOLVE_USER_SESSION` | 获取 AI 平台来源和 Token |
| `FETCH_TEACHERS` / `FETCH_STUDENTS` | 使用 AI 会话查询教师、学生 |
| `FETCH_SEMESTERS` / `FETCH_SCHOOL_DEPT_TREE` / `FETCH_CLASS_TEACHERS` | 查询学期、班级树、班级教师关系 |
| `QUICK_LOGIN` | 获取登录地址并打开，按调用参数决定是否复用活动标签页 |
| `GET_QUICK_LOGIN_RECENT` | 读取最近使用记录 |
| `DELETE_QUICK_LOGIN_RECENT` | 按 `tenantId`、`id` 及可选的 `role` 删除记录 |

## 8. 验证重点

- 两条查询路径使用正确的 POST 请求、搜索参数和账号类型。
- 自定义后台域名保存后，后续后台请求使用新地址。
- 关闭再打开侧栏可恢复查询，进入关系任务可重新取得已选账号的 AI 会话。
- 修改单条记录的线上、本地目标或端口后，查询结果和 AI 会话保留。
- 打开平台时同源活动标签页被复用，评价操作新开标签页。
- 同一身份和角色的最近使用记录跨环境合并，删除按身份和角色生效。
- 后台登录成功或应用历史后，当前项目查询和最近使用记录清空。

构建与校验命令见 [README](../README.md)；本次文档核对依据源码，以上清单用于后续浏览器验证。
