# 多项目架构重构 - 测试指南

## 已完成的改动

### Phase 1: 基础设施 ✅
- ✅ 新建 `src/common/projects.js` - 项目注册表
- ✅ 新建 `src/common/current-project.js` - 当前项目管理 + 数据迁移逻辑
- ✅ 修改 `scripts/build.js` - 自动生成 manifest.json

### Phase 2: 存储层改造 ✅
- ✅ `src/common/credentials.js` - 改为 `adminCredentials:<projectId>` 命名空间
- ✅ `src/common/token.js` - 改为 `adminToken:<projectId>` 命名空间
- ✅ `src/background/quick-login.js` - 改为 `quickLoginRecent:<projectId>` 命名空间
- ✅ `src/background/api.js` - BASE_URL 动态获取
- ✅ `src/background/tenant-api.js` - BASE_URL 动态获取
- ✅ `src/background/cookies.js` - 动态获取 cookie keys
- ✅ `src/background/index.js` - 启动时加载项目并执行迁移
- ✅ `src/content/api-token.js` - 多项目 host 匹配

### Phase 3: UI 层 ✅
- ✅ 新建 `src/popup/project-switcher-ui.js` - 项目切换器
- ✅ 修改 `popup.html` - 插入切换器 DOM + pill 样式
- ✅ 修改 `src/popup/index.js` - 加载项目、初始化切换器、根据 enabledFeatures 隐藏功能卡
- ✅ 修改 `src/popup/quick-login-ui.js` - envBadge 显示项目名

### Phase 4: 验证与清理 ✅
- ✅ 更新 README.md - 说明多项目架构和配置方法
- ✅ 构建验证通过

## 快速测试

### 1. 加载插件

```bash
# 在项目根目录
npm run build

# Chrome 浏览器
# 1. 打开 chrome://extensions/
# 2. 开启「开发者模式」
# 3. 点击「加载已解压的扩展程序」
# 4. 选择 dist/ 目录
```

### 2. 数据迁移测试

**如果你之前使用过旧版本**（有登录过），打开插件 popup：
- 打开 Chrome DevTools → Console
- 应该看到：`[Migrate] Moved old storage to project: gpt-admin-pre`
- DevTools → Application → Storage → Local Storage → chrome-extension://...
  - 旧 key（`adminToken`、`adminCredentials`、`quickLoginRecent`）已消失
  - 新 key（`adminToken:gpt-admin-pre` 等）已出现

### 3. 基本功能测试

**当前只有一个项目时**：
1. 打开 popup，顶部「项目」区域显示一个 pill：`GPT后台-预发布`（高亮状态）
2. 输入账号密码，点击「登录」，token 应该保存到 `adminToken:gpt-admin-pre`
3. 快捷登录功能正常工作

### 4. 多项目切换测试

**添加测试项目**：
编辑 `src/common/projects.js`，在 `PROJECTS` 数组末尾添加：

```js
{
  id: 'test-backend',
  name: '测试后台',
  baseUrl: 'http://localhost:3000',
  authPath: '/api/auth',
  tenantApiPaths: {
    tenantPage: '/api/tenant/page',
    deptList: '/api/dept/list',
    userPage: '/api/user/page',
    virtualLogin: '/api/user/virtualLogin',
  },
  cookieKeys: ['SESSION_ID'],
  enabledFeatures: ['adminPanel'],  // 只启用账号面板，不启用快捷登录
  hosts: ['localhost'],
},
```

运行 `npm run build`，重新加载插件。

**测试步骤**：
1. 打开 popup，顶部应显示两个 pill：`GPT后台-预发布`（高亮）、`测试后台`
2. 在「GPT后台-预发布」中登录，输入框有内容
3. 点击「测试后台」pill，popup reload
4. 输入框变空（独立登录态）
5. 「一键快捷登录」卡片消失（该项目未启用 quickLogin）
6. 点击回「GPT后台-预发布」，输入框恢复之前的账号

### 5. manifest.json 自动生成测试

检查 `manifest.json`：
```bash
cat manifest.json | grep -A 5 host_permissions
```

应该包含：
- `https://gpt-admin-pre.hwzxs.com/*`
- `https://*.hwzxs.com/*`
- `http://localhost/*` （如果添加了 test-backend）

## 验证清单

- [ ] 构建无错误（`npm run check`）
- [ ] manifest.json 自动生成正确
- [ ] 旧数据自动迁移（Console 有迁移日志）
- [ ] 项目切换器显示正常
- [ ] 切换项目时 popup reload
- [ ] 不同项目独立的登录态
- [ ] enabledFeatures 控制功能卡显示
- [ ] 快捷登录记录按项目隔离
- [ ] envBadge 显示项目名而非硬编码 PRE/PROD

## 常见问题

### Q: 切换项目后白屏？
A: 检查 DevTools Console 是否有错误。可能是 current-project.js 的 loadCurrentProject 未在 popup init 时调用。

### Q: 迁移逻辑没执行？
A: 
1. 确认 background Service Worker 启动时调用了 `migrateOldStorageKeys()`
2. 在 `chrome://extensions/` 点击「Service Worker」查看 Console
3. 手动触发：DevTools Console 执行 `chrome.storage.local.get(null, console.log)` 查看所有 key

### Q: 新增项目后 manifest 没更新？
A: 运行 `npm run build`，manifest.json 会被覆盖。不要手动编辑 manifest.json。

### Q: Token 保存后切换项目为何还能看到？
A: 这是 bug。检查 `src/common/token.js` 是否正确使用 `await getStorageKey()`。

## 后续扩展

### 添加新项目
编辑 `src/common/projects.js`，追加配置对象，运行 `npm run build`。

### 添加新功能卡
1. 在 `enabledFeatures` 数组中定义新 feature id（如 `'newFeature'`）
2. popup.html 中添加新卡片 `<div class="card" id="newFeatureSection">`
3. popup/index.js init() 中根据 `enabledFeatures.includes('newFeature')` 控制显示

### 垃圾回收
如果删除了某个项目配置，其命名空间的 storage key 会残留。可在 `src/common/current-project.js` 添加清理逻辑：
```js
async function cleanupOrphanedKeys() {
  const all = await chrome.storage.local.get(null);
  const validIds = PROJECTS.map(p => p.id);
  const orphaned = Object.keys(all).filter(k => {
    const match = k.match(/^(adminToken|adminCredentials|quickLoginRecent):(.+)$/);
    return match && !validIds.includes(match[2]);
  });
  if (orphaned.length) {
    await chrome.storage.local.remove(orphaned);
    console.log('[Cleanup] Removed orphaned keys:', orphaned);
  }
}
```

## 回滚方案

如果重构有问题，回退到重构前的 commit：
```bash
git log --oneline  # 找到重构前的 commit hash
git checkout <hash>
npm run build
```

旧版本的 storage key（无后缀）会继续工作。
