const assert = require('node:assert/strict');

const storage = {};
globalThis.InternalDevToolkit = {
  currentProject: {
    getCachedProjectId() { return 'gpt-admin-pre'; },
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
      remove(key, callback) {
        delete storage[key];
        callback?.();
      },
    },
  },
};

const storageModulePath = require.resolve('../src/common/quick-login-state.js');
delete require.cache[storageModulePath];
const queryStorage = require(storageModulePath);

function collectSensitivePaths(value, path = 'state', found = []) {
  if (!value || typeof value !== 'object') return found;
  Object.entries(value).forEach(([key, child]) => {
    const childPath = `${path}.${key}`;
    if (key === 'raw' || /token|password|authorization|cookie/i.test(key)) found.push(childPath);
    collectSensitivePaths(child, childPath, found);
  });
  return found;
}

(async () => {
  const snapshot = {
    mode: 'student',
    env: 'online',
    devPort: '8088',
    teacher: {
      tenantKeyword: '一中',
      tenantRecords: [{ tenantId: 'tenant-1', tenantName: '一中', raw: { token: 'raw-secret' } }],
      selectedTenant: { tenantId: 'tenant-1', tenantName: '一中' },
      selectedUser: { id: 'user-1', userName: '教师入口', aiToken: 'teacher-secret' },
      teacherNameKeyword: '教师入口',
      teacherPage: { current: 1, size: 10, total: 1, records: [{ id: 'teacher-1', name: '教师甲' }] },
      selectedTeacher: { id: 'teacher-1', name: '教师甲' },
      studentPage: { current: 1, size: 10, total: 1, records: [{ id: 'student-1', name: '学生甲' }] },
    },
    student: {
      field: 'username',
      keyword: '学生乙',
      accountPage: { current: 1, size: 10, total: 1, records: [{ id: 'account-1', username: '学生乙' }] },
      selectedAccount: {
        id: 'account-1', loginId: 'login-1', username: '学生乙', password: 'must-not-survive',
        session: { origin: 'https://example.test', aiToken: 'student-secret' },
      },
      classes: [{ id: 'class-1', label: '一班' }],
      classTeacherMap: { 'class-1': [{ id: 'teacher-2', name: '教师乙' }] },
      selectedClassId: 'class-1',
    },
  };

  await queryStorage.save(snapshot);
  const key = 'quickLoginQueryState:gpt-admin-pre';
  assert.ok(storage[key], '查询快照应按项目命名空间保存');
  assert.equal(storage[key].version, 1);
  assert.equal(storage[key].state.teacher.teacherNameKeyword, '教师入口');
  assert.equal(storage[key].state.teacher.selectedTeacher.name, '教师甲');
  assert.equal(storage[key].state.teacher.studentPage.records[0].name, '学生甲');
  assert.equal(storage[key].state.student.selectedAccount.username, '学生乙');
  assert.equal(storage[key].state.student.classTeacherMap['class-1'][0].name, '教师乙');
  assert.deepEqual(collectSensitivePaths(storage[key].state), [], '持久化快照不得包含敏感字段或原始响应');

  const loaded = await queryStorage.load();
  assert.deepEqual(loaded, storage[key].state, '关闭并重新打开插件后应能读取完整双模式快照');

  globalThis.InternalDevToolkit.tenant = {};
  globalThis.InternalDevToolkit.messages = {};
  const uiModulePath = require.resolve('../src/popup/quick-login-ui.js');
  delete require.cache[uiModulePath];
  const { createPersistedState, restorePersistedState, state } = require(uiModulePath);
  assert.equal(restorePersistedState(loaded), true);
  assert.equal(state.mode, 'student');
  assert.equal(state.teacher.teacherNameKeyword, '教师入口');
  assert.equal(state.teacher.selectedTeacher.name, '教师甲');
  assert.equal(state.teacher.studentPage.records[0].name, '学生甲');
  assert.equal(state.student.selectedAccount.username, '学生乙');
  assert.equal(state.student.selectedClassId, 'class-1');
  assert.equal(state.teacher.selectedUser.aiToken, undefined);
  assert.equal(state.student.selectedAccount.session.aiToken, undefined);

  const restoredSnapshot = createPersistedState(state);
  assert.equal(restoredSnapshot.teacher.teacherNameKeyword, '教师入口');
  assert.equal(restoredSnapshot.teacher.selectedTeacher.name, '教师甲');
  assert.equal(restoredSnapshot.student.selectedAccount.username, '学生乙');

  await queryStorage.clear();
  assert.equal(storage[key], undefined);
  console.log('quick login query state persistence tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
