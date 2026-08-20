/* 内部开发工具箱 — 租户/用户/部门接口数据模型与参数封装 */
/* 仅包含纯函数，不发起实际网络请求。 */
(() => {
  'use strict';

  const namespace = (globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {});

  const DEFAULT_DEPT_SOURCE = Object.freeze({ name: '钉钉', value: 'dingtalk', icon: 'dingtalk' });

  function normalizeUser(value = {}) {
    return {
      id: String(value.id ?? ''),
      userId: String(value.userId ?? ''),
      userName: String(value.username ?? value.userName ?? value.name ?? ''),
      phone: String(value.phone ?? value.mobile ?? value.account ?? ''),
      account: String(value.account ?? ''),
      deptId: String(value.deptId ?? ''),
      deptName: String(value.deptName ?? ''),
      tenantId: String(value.tenantId ?? ''),
      accessKey: String(value.accessKey ?? ''),
      roleName: String(value.roleName ?? '') || (Array.isArray(value.roleNameList) ? value.roleNameList.join('、') : ''),
    };
  }

  function normalizeTenant(value = {}) {
    return {
      tenantId: String(value.tenantId ?? value.id ?? ''),
      tenantName: String(value.tenantName ?? value.name ?? ''),
      domain: String(value.domain ?? ''),
      contactName: String(value.contactName ?? ''),
      contactPhone: String(value.contactPhone ?? ''),
      industry: value.industry ?? '',
    };
  }

  function normalizeDept(value = {}) {
    return {
      deptId: String(value.deptId ?? value.id ?? ''),
      deptName: String(value.deptName ?? value.name ?? ''),
      deptSource: value.deptSource ?? DEFAULT_DEPT_SOURCE,
      children: Array.isArray(value.children) ? value.children : [],
    };
  }

  function buildTenantPageBody({ current = 1, size = 10, keyword = '' }) {
    return {
      current: Number(current) || 1,
      size: Number(size) || 10,
      searchType: ['tenantName', 'contactName', 'contactPhone', 'domain'],
      keyword: String(keyword || ''),
    };
  }

  function buildUserPageBody({ tenantId, deptId = '', current = 1, size = 10, keyword = '' }) {
    if (!tenantId) throw new Error('tenantId 不能为空');
    return {
      current: Number(current) || 1,
      size: Number(size) || 10,
      deptId: String(deptId || ''),
      tenantId: String(tenantId),
      searchKey: String(keyword || ''),
      searchType: 'username,phone',
    };
  }

  function buildDeptListBody({ tenantId }) {
    if (!tenantId) throw new Error('tenantId 不能为空');
    return { tenantId: String(tenantId) };
  }

  function buildQuickLoginBody({ id }) {
    if (!id) throw new Error('id 不能为空');
    return { id: String(id) };
  }

  // 兼容常见响应结构：{ data: { records: [], total: 0 } } 或 { data: { list: [], total: 0 } } 或 { result: { records: [] } }
  function extractPageData(response) {
    if (!response || typeof response !== 'object') return { records: [], total: 0 };
    const payload = response.data ?? response.result ?? response;
    if (!payload || typeof payload !== 'object') return { records: [], total: 0 };
    return {
      records: Array.isArray(payload.records) ? payload.records : Array.isArray(payload.list) ? payload.list : [],
      total: typeof payload.total === 'number' ? payload.total : (Array.isArray(payload.records) ? payload.records.length : 0),
      current: payload.current ?? 1,
      size: payload.size ?? 10,
    };
  }

  function extractListData(response) {
    if (!response || typeof response !== 'object') return [];
    const payload = response.data ?? response.result ?? response;
    return Array.isArray(payload) ? payload : [];
  }

  function extractErrorMessage(response) {
    if (!response || typeof response !== 'object') return '';
    return response.msg || response.message || response.error || response.errorMessage || '';
  }

  function extractToken(response) {
    if (!response || typeof response !== 'object') return '';
    const data = response.data ?? response.result ?? response;
    if (typeof data === 'string') return data;
    return data?.token || data?.accessToken || data?.access_token || data?.authorization || data?.jwt || '';
  }

  // ── 教师 / 学生 / 班级 数据结构 ──

  function pickFirstString(...candidates) {
    for (const v of candidates) {
      if (v == null) continue;
      const s = String(v).trim();
      if (s) return s;
    }
    return '';
  }

  function normalizeTeacher(value = {}) {
    const nestedUser = value.user && typeof value.user === 'object' ? value.user : null;
    return {
      id: pickFirstString(value.id, value.teacherId, value.userId, nestedUser?.userId, nestedUser?.id),
      name: pickFirstString(value.name, value.teacherName, value.realName, nestedUser?.name, nestedUser?.username, value.username, value.userName, value.nickName),
      account: pickFirstString(value.account, value.phone, value.mobile, value.userAccount, value.loginAccount, nestedUser?.phone, nestedUser?.mobile, nestedUser?.account),
      // 行政职务（对应班级/部门）
      adminDuties: pickFirstString(value.adminDuties, value.adminDuty, value.administrativeDuty, value.deptName, value.className, value.classNames),
      // 教学职务
      teachDuties: pickFirstString(value.teachDuties, value.teachDuty, value.teachingDuty, value.subjectName, value.subjectNames),
      status: String(value.status ?? ''),
      statusText: String(value.status) === '1' || value.status === 1 ? '启用' : (String(value.status) === '0' || value.status === 0 ? '禁用' : String(value.status || '')),
      raw: value,
    };
  }

  function normalizeStudent(value = {}) {
    return {
      id: pickFirstString(value.id, value.studentId, value.userId),
      name: pickFirstString(value.name, value.studentName, value.realName, value.username, value.userName),
      code: pickFirstString(value.code, value.studentCode, value.studentNo, value.account, value.userAccount),
      className: pickFirstString(value.className, value.classNames, value.deptName, value.classId),
      status: String(value.status ?? ''),
      statusText: String(value.status) === '1' || value.status === 1 ? '启用' : (String(value.status) === '0' || value.status === 0 ? '禁用' : String(value.status || '')),
      raw: value,
    };
  }

  // 从 schoolDept/tree 中提取所有班级（叶子节点）
  function flattenDeptTree(nodes, result = []) {
    if (!Array.isArray(nodes)) return result;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const item = {
        id: pickFirstString(node.id, node.deptId),
        name: pickFirstString(node.name, node.deptName),
        parentId: pickFirstString(node.parentId, node.pid),
        type: pickFirstString(node.type, node.deptType, node.level),
        children: node.children,
      };
      result.push(item);
      if (Array.isArray(node.children) && node.children.length) {
        flattenDeptTree(node.children, result);
      }
    }
    return result;
  }

  // 从 schoolDept/tree 中收集班级名（叶子节点 name）
  function extractClassNames(treeData) {
    if (!treeData) return [];
    const payload = treeData.data ?? treeData.result ?? treeData;
    const nodes = Array.isArray(payload) ? payload : (Array.isArray(payload?.children) ? payload.children : []);
    const flat = flattenDeptTree(nodes);
    // 叶子节点（无 children 或 children 为空）视为班级
    return flat
      .filter((n) => !n.children || !n.children.length)
      .map((n) => n.name)
      .filter(Boolean);
  }

  function buildTeacherPageBody({ current = 1, size = 10, name = '', account = '' }) {
    return {
      current: Number(current) || 1,
      size: Number(size) || 10,
      name: String(name || ''),
      account: String(account || ''),
      phone: '',
      _t: Date.now(),
      _r: Math.random(),
    };
  }

  function buildStudentPageBody({ current = 1, size = 10, name = '', code = '', className = '' }) {
    const body = {
      current: Number(current) || 1,
      size: Number(size) || 10,
      name: String(name || ''),
      code: String(code || ''),
    };
    if (className) body.className = String(className);
    return body;
  }

  namespace.tenant = {
    DEFAULT_DEPT_SOURCE,
    normalizeTenant,
    normalizeUser,
    normalizeDept,
    buildTenantPageBody,
    buildUserPageBody,
    buildDeptListBody,
    buildQuickLoginBody,
    extractPageData,
    extractListData,
    extractErrorMessage,
    extractToken,
    // 教师 / 学生
    normalizeTeacher,
    normalizeStudent,
    buildTeacherPageBody,
    buildStudentPageBody,
    extractClassNames,
    flattenDeptTree,
    pickFirstString,
  };
})();
