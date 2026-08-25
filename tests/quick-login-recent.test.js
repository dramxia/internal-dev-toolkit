const assert = require('node:assert/strict');

const storage = {};
globalThis.InternalDevToolkitBg = {};
globalThis.InternalDevToolkit = {
  currentProject: {
    async getCurrentProjectId() { return 'gpt-admin-pre'; },
  },
};
globalThis.chrome = {
  runtime: { lastError: null },
  storage: {
    local: {
      get(key, callback) {
        callback({ [key]: storage[key] });
      },
      set(values, callback) {
        Object.assign(storage, values);
        callback?.();
      },
    },
  },
};

const modulePath = require.resolve('../src/background/quick-login.js');
delete require.cache[modulePath];
const {
  compactRecentRecords,
  deleteRecent,
  getRecent,
  normalizeRecentRecord,
  recordRecent,
  sameRecentIdentity,
} = require(modulePath);

const key = 'quickLoginRecent:gpt-admin-pre';
storage[key] = [
  {
    tenantId: 'tenant-1', id: 'user-1', tenantName: '一号租户', userName: '教师甲',
    role: 'teacher', env: 'online', localPort: '', at: 300,
    token: 'must-not-survive', loginUrl: 'https://example.test?token=secret',
  },
  {
    tenantId: 'tenant-1', id: 'user-1', tenantName: '一号租户', userName: '教师甲',
    role: 'teacher', env: 'local', localPort: '9090', at: 200,
  },
  {
    tenantId: 'tenant-1', id: 'user-1', tenantName: '一号租户', userName: '教师甲',
    role: 'teacher', env: 'local', localPort: '8088', at: 100,
  },
  {
    tenantId: 'tenant-1', id: 'user-1', tenantName: '一号租户', userName: '学生甲',
    role: 'student', env: 'online', at: 90,
  },
  {
    tenantId: 'tenant-1', id: 'user-2', tenantName: '一号租户', userName: '教师乙',
    role: 'teacher', env: 'online', at: 80,
  },
];

(async () => {
  assert.equal(
    sameRecentIdentity(
      { tenantId: 'tenant-1', id: 'user-1', role: 'teacher', env: 'online', localPort: '' },
      { tenantId: 'tenant-1', id: 'user-1', role: 'teacher', env: 'local', localPort: '5173' },
    ),
    true,
    '同一租户账号和角色不应再按环境或端口拆分',
  );
  assert.equal(
    sameRecentIdentity(
      { tenantId: 'tenant-1', id: 'user-1', role: 'teacher' },
      { tenantId: 'tenant-1', id: 'user-1', role: 'student' },
    ),
    false,
    '不同角色仍应保留独立最近记录',
  );

  const compacted = compactRecentRecords(storage[key]);
  assert.equal(compacted.length, 3, '旧版不同环境和端口的重复身份应合并');
  assert.equal(compacted[0].env, 'online', '最新记录决定默认环境');
  assert.equal(compacted[0].localPort, '9090', '线上记录也应保留最近一次有效本地端口');
  assert.equal(compacted[0].token, undefined);
  assert.equal(compacted[0].loginUrl, undefined);
  assert.equal(normalizeRecentRecord({ env: 'online' }).localPort, '8088');

  const migrated = await getRecent();
  assert.deepEqual(migrated, compacted, '读取时应迁移旧环境重复记录');
  assert.deepEqual(storage[key], compacted, '迁移结果应回写 storage');

  await recordRecent({
    tenantId: 'tenant-1', id: 'user-1', tenantName: '一号租户', userName: '教师甲',
    role: 'teacher', env: 'local', localPort: '5173',
  });
  let records = await getRecent();
  assert.equal(records.length, 3, '切换环境后仍只保留同一身份的一条记录');
  assert.equal(records[0].env, 'local');
  assert.equal(records[0].localPort, '5173');

  await recordRecent({
    tenantId: 'tenant-1', id: 'user-1', tenantName: '一号租户', userName: '教师甲',
    role: 'teacher', env: 'online', localPort: '',
  });
  records = await getRecent();
  assert.equal(records[0].env, 'online', '线上操作应更新该记录默认环境');
  assert.equal(records[0].localPort, '5173', '切回线上不应丢失该行本地端口');

  globalThis.InternalDevToolkitBg.tenantApi = {
    async quickLogin() { return { data: 'https://tenant.example.test?token=Bearer%20runtime' }; },
  };
  await globalThis.InternalDevToolkitBg.quickLogin.quickLogin({
    tenantId: 'tenant-1', id: 'user-1', tenantName: '一号租户', userName: '教师甲',
    role: 'teacher', env: 'online', localPort: '6123',
  });
  records = await getRecent();
  assert.equal(records[0].env, 'online');
  assert.equal(records[0].localPort, '6123', '线上操作应记录该行携带的本地端口，但打开目标仍由 UI 保持线上');

  await deleteRecent({
    tenantId: 'tenant-1', id: 'user-1', role: 'teacher', env: 'local', localPort: '9999',
  });
  records = await getRecent();
  assert.equal(records.some((item) => item.id === 'user-1' && item.role === 'teacher'), false, '删除不应再依赖环境或端口');
  assert.equal(records.some((item) => item.id === 'user-1' && item.role === 'student'), true, '删除教师记录不应删除同身份学生角色');

  console.log('quick login recent storage tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
