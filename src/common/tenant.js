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

  // 状态映射：0 = 在线（正常），1 = 离线（停用）
  // 教师状态映射：0 = 在线，1 = 离线
  function statusInfo(value) {
    const s = String(value ?? '');
    if (s === '0') return { status: s, statusText: '在线', on: true };
    if (s === '1') return { status: s, statusText: '离线', on: false };
    return { status: s, statusText: s, on: null };
  }

  // 学生状态映射：1 = 在线，2 = 离线（与教师取值不同）
  function studentStatusInfo(value) {
    const s = String(value ?? '');
    if (s === '1') return { status: s, statusText: '在线', on: true };
    if (s === '2') return { status: s, statusText: '离线', on: false };
    return { status: s, statusText: s, on: null };
  }

  function normalizeTeacher(value = {}) {
    const nestedUser = value.user && typeof value.user === 'object' ? value.user : null;
    const st = statusInfo(value.status);
    return {
      id: pickFirstString(value.id, value.teacherId, value.userId, nestedUser?.userId, nestedUser?.id),
      name: pickFirstString(value.name, value.teacherName, value.realName, nestedUser?.name, nestedUser?.username, value.username, value.userName, value.nickName),
      account: pickFirstString(value.account, value.phone, value.mobile, value.userAccount, value.loginAccount, nestedUser?.phone, nestedUser?.mobile, nestedUser?.account),
      status: st.status,
      statusText: st.statusText,
      statusOn: st.on,
      raw: value,
    };
  }

  function normalizeStudent(value = {}) {
    const st = studentStatusInfo(value.status);
    return {
      id: pickFirstString(value.id, value.studentId, value.userId),
      name: pickFirstString(value.name, value.studentName, value.realName, value.username, value.userName),
      code: pickFirstString(value.code, value.studentCode, value.studentNo, value.account, value.userAccount),
      className: pickFirstString(value.className, value.classNames, value.deptName, value.classId),
      status: st.status,
      statusText: st.statusText,
      statusOn: st.on,
      raw: value,
    };
  }

  // 解析 virtualLogin 返回的 URL：提取 origin 与 用户态 token
  // 形如 https://uuu.huayungpt.com?token=Bearer%20xxx
  function parseVirtualLoginUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return { url: '', origin: '', token: '' };
    try {
      const parsed = new URL(raw);
      let token = parsed.searchParams.get('token') || '';
      token = token.replace(/^Bearer\s+/i, '').trim();
      return { url: raw, origin: parsed.origin, token };
    } catch (_) {
      return { url: raw, origin: '', token: '' };
    }
  }

  // 仅附加非空字符串字段：值为空串/null/undefined 时不放入 body
  function appendIfFilled(body, key, value) {
    if (value == null) return;
    const s = String(value).trim();
    if (s) body[key] = s;
  }

  function buildTeacherPageBody({ current = 1, size = 10, name = '', account = '', phone = '' }) {
    const body = {
      current: Number(current) || 1,
      size: Number(size) || 10,
      _t: Date.now(),
      _r: Math.random(),
    };
    appendIfFilled(body, 'name', name);
    appendIfFilled(body, 'account', account);
    appendIfFilled(body, 'phone', phone);
    return body;
  }

  function buildStudentPageBody({ current = 1, size = 10, name = '', code = '', className = '' }) {
    const body = {
      current: Number(current) || 1,
      size: Number(size) || 10,
    };
    appendIfFilled(body, 'name', name);
    appendIfFilled(body, 'code', code);
    appendIfFilled(body, 'className', className);
    return body;
  }

  // 教师详情：/client/teacher/detail
  function buildTeacherDetailBody({ id }) {
    if (!id) throw new Error('id 不能为空');
    return { id: String(id) };
  }

  // 年级/学段/班级树：/client/schoolDept/tree（semesterId 为空时不传）
  function buildSchoolDeptTreeBody({ semesterId = '' } = {}) {
    const body = {};
    appendIfFilled(body, 'semesterId', semesterId);
    return body;
  }

  // 提取详情响应的 data 负载
  function extractDetailData(response) {
    if (!response || typeof response !== 'object') return {};
    const payload = response.data ?? response.result ?? response;
    return payload && typeof payload === 'object' ? payload : {};
  }

  // 从 schoolDept/tree 构建 id → 班级全名映射（拼父级名，如 三年级1班）
  function buildDeptIdNameMap(treeData) {
    const map = {};
    if (!treeData) return map;
    const payload = treeData.data ?? treeData.result ?? treeData;
    const roots = Array.isArray(payload) ? payload : (Array.isArray(payload?.children) ? payload.children : []);
    const walk = (nodes, prefix) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const id = pickFirstString(node.id, node.deptId);
        const name = pickFirstString(node.name, node.deptName);
        const fullName = prefix ? prefix + name : name;
        if (id) map[id] = fullName;
        if (Array.isArray(node.children) && node.children.length) walk(node.children, fullName);
      }
    };
    walk(roots, '');
    return map;
  }

  // 从教师详情中提取教学职务（科目 · 班级），用班级树把 deptId 映射成班级全名
  // 真实结构：detail.schoolSubjectTeachersDetail = [
  //   { teachType: 7, teachTypeName: '学科教师', subjectNames: ['数学'], deptIds: [3010], deptNames: ['1班'] }
  // ]
  // deptNames 只有叶子名（如 1班），需借 idNameMap 补全为 初中初三1班
  function extractTeachDuties(detail, idNameMap = {}) {
    if (!detail || typeof detail !== 'object') return [];
    const duties = [];

    const toStrArray = (v) => {
      if (v == null || v === '') return [];
      if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
      return String(v).split(/[,，、\s]+/).filter(Boolean);
    };

    const subjectList = Array.isArray(detail.schoolSubjectTeachersDetail)
      ? detail.schoolSubjectTeachersDetail
      : [];
    for (const item of subjectList) {
      if (!item || typeof item !== 'object') continue;
      const subjects = toStrArray(item.subjectNames ?? item.subjectName ?? item.subject);
      const deptIds = toStrArray(item.deptIds ?? item.deptId ?? item.classIds ?? item.classId);
      const deptNames = toStrArray(item.deptNames ?? item.deptName ?? item.classNames ?? item.className);
      // deptId 优先走班级树翻译成全名；翻译不到时回落同位置的 deptName
      const classes = deptIds.length
        ? deptIds.map((id, i) => idNameMap[id] || deptNames[i] || '').filter(Boolean)
        : deptNames;
      for (const subject of (subjects.length ? subjects : [''])) {
        for (const cls of (classes.length ? classes : [''])) {
          if (subject && cls) duties.push(`${subject} · ${cls}`);
          else if (subject || cls) duties.push(subject || cls);
        }
      }
    }
    return [...new Set(duties)];
  }

  // 从教师详情中提取 semesterId（供 schoolDept/tree 使用）
  function extractSemesterId(detail) {
    if (!detail || typeof detail !== 'object') return '';
    return pickFirstString(
      detail.semesterId, detail.semester?.id, detail.currentSemesterId,
      detail.schoolSemesterId, detail.termId,
    );
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
    buildTeacherDetailBody,
    buildSchoolDeptTreeBody,
    extractDetailData,
    buildDeptIdNameMap,
    extractTeachDuties,
    extractSemesterId,
    pickFirstString,
    appendIfFilled,
    parseVirtualLoginUrl,
    statusInfo,
    studentStatusInfo,
  };
})();
