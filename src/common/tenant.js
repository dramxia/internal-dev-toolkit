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

  // /admin/tenant/user/account/page 的记录。这里的 id 是 virtualLogin
  // 接受的租户用户主键；tmbId/userId 仅作为关系字段保留，绝不互相替代。
  function normalizeAccount(value = {}) {
    const rawType = value.type ?? value.accountType ?? '';
    const type = rawType === '' || rawType == null ? '' : String(rawType);
    return {
      id: pickFirstString(value.id),
      loginId: pickFirstString(value.id),
      tmbId: pickFirstString(value.tmbId),
      userId: pickFirstString(value.userId),
      username: pickFirstString(value.username, value.userName, value.name),
      account: pickFirstString(value.account, value.phone, value.mobile),
      tenantId: pickFirstString(value.tenantId),
      tenantName: pickFirstString(value.tenantName),
      domain: pickFirstString(value.domain, value.tenantDomain),
      phone: pickFirstString(value.phone, value.mobile),
      industry: value.industry ?? '',
      accountType: value.accountType == null ? '' : String(value.accountType),
      type,
      status: value.status == null ? '' : String(value.status),
      statusText: statusInfo(value.status).statusText,
      raw: value,
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

  function normalizeDept(value = {}, inheritedSource = DEFAULT_DEPT_SOURCE) {
    return {
      deptId: String(value.deptId ?? value.id ?? ''),
      deptName: String(value.deptName ?? value.name ?? ''),
      deptSource: value.deptSource ?? inheritedSource,
      children: Array.isArray(value.children) ? value.children : [],
    };
  }

  function flattenDeptOptions(response) {
    const result = [];
    const seen = new Set();
    function visit(nodes, parents = [], source = DEFAULT_DEPT_SOURCE) {
      for (const raw of nodes) {
        if (!raw || typeof raw !== 'object' || Number(raw.isDeleted) === 1) continue;
        const dept = normalizeDept(raw, source);
        if (!dept.deptId || seen.has(dept.deptId)) continue;
        seen.add(dept.deptId);
        const names = [...parents, dept.deptName || '未命名组织'];
        const count = raw.deptUserNum == null ? null : Number(raw.deptUserNum);
        result.push({
          deptId: dept.deptId,
          deptName: names.at(-1),
          deptSource: dept.deptSource,
          depth: parents.length,
          path: names.join(' / '),
          userCount: Number.isFinite(count) && count >= 0 ? count : null,
        });
        visit(dept.children, names, dept.deptSource);
      }
    }
    visit(extractListData(response));
    return result;
  }

  function buildTenantPageBody({ current = 1, size = 10, keyword = '' }) {
    return {
      current: Number(current) || 1,
      size: Number(size) || 10,
      searchType: ['tenantName', 'contactName', 'contactPhone', 'domain'],
      keyword: String(keyword || ''),
    };
  }

  function buildUserPageBody({ tenantId, deptId = '', deptSource = DEFAULT_DEPT_SOURCE, current = 1, size = 10, keyword = '' }) {
    if (!tenantId) throw new Error('tenantId 不能为空');
    return {
      current: Number(current) || 1,
      size: Number(size) || 10,
      deptId: String(deptId || ''),
      tenantId: String(tenantId),
      deptSource,
      searchKey: String(keyword || ''),
      searchType: 'username,phone',
    };
  }

  // 后台账号分页：accountType 是请求筛选字段（0=常规账号，1=学生账号，4=校外账号）。
  // 只发送当前选中的一个文本条件，避免后台将多个条件按 AND 组合造成误筛。
  function buildAccountPageBody({
    current = 1,
    size = 10,
    username = '',
    account = '',
    tenantName = '',
    accountType,
    status,
  } = {}) {
    const body = {
      current: Number(current) || 1,
      size: Number(size) || 10,
    };
    appendIfFilled(body, 'username', username);
    appendIfFilled(body, 'account', account);
    appendIfFilled(body, 'tenantName', tenantName);
    // accountType=0 是有效筛选值，不能使用 truthy 判断。
    if (accountType !== undefined && accountType !== null && String(accountType) !== '') {
      body.accountType = Number(accountType);
    }
    if (status !== undefined && status !== null && String(status) !== '') {
      body.status = Number(status);
    }
    return body;
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
    const totalValue = Number(payload.total);
    return {
      records: Array.isArray(payload.records) ? payload.records : Array.isArray(payload.list) ? payload.list : [],
      total: Number.isFinite(totalValue) && totalValue >= 0
        ? totalValue
        : (Array.isArray(payload.records) ? payload.records.length : 0),
      current: Number(payload.current) || 1,
      size: Number(payload.size) || 10,
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

  function firstListValue(value) {
    return Array.isArray(value) ? value[0] : value;
  }

  // 后端同一字段可能返回数组、单值或分隔符字符串，统一成字符串数组。
  function toStringList(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value).split(/[,，、\s]+/).filter(Boolean);
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
      tmbId: pickFirstString(value.tmbId),
      userId: pickFirstString(value.userId, nestedUser?.userId),
      tenantId: pickFirstString(value.tenantId),
      name: pickFirstString(value.name, value.teacherName, value.realName, nestedUser?.name, nestedUser?.username, value.username, value.userName, value.nickName),
      account: pickFirstString(value.account, value.phone, value.mobile, value.userAccount, value.loginAccount, nestedUser?.phone, nestedUser?.mobile, nestedUser?.account),
      phone: pickFirstString(value.phone, value.mobile, nestedUser?.phone, nestedUser?.mobile),
      status: st.status,
      statusText: st.statusText,
      statusOn: st.on,
      raw: value,
    };
  }

  function normalizeStudent(value = {}) {
    const st = studentStatusInfo(value.status);
    const nestedClass = value.clazz && typeof value.clazz === 'object'
      ? value.clazz
      : (value.class && typeof value.class === 'object'
          ? value.class
          : (value.schoolDept && typeof value.schoolDept === 'object' ? value.schoolDept : null));
    return {
      id: pickFirstString(value.id, value.studentId, value.userId),
      tenantId: pickFirstString(value.tenantId),
      tenantName: pickFirstString(value.tenantName, value.schoolName),
      name: pickFirstString(value.name, value.studentName, value.realName, value.username, value.userName),
      code: pickFirstString(value.code, value.studentCode, value.studentNo, value.account, value.userAccount),
      account: pickFirstString(value.account, value.userAccount),
      password: pickFirstString(value.password, value.studentPassword, value.initialPassword, value.defaultPassword),
      classId: pickFirstString(
        value.classId, value.clazzId, value.deptId, value.schoolDeptId,
        firstListValue(value.classIds), firstListValue(value.clazzIds), firstListValue(value.deptIds),
        nestedClass?.id, nestedClass?.classId, nestedClass?.clazzId, nestedClass?.deptId,
      ),
      className: pickFirstString(
        value.className, firstListValue(value.classNames), value.clazzName, value.deptName,
        firstListValue(value.clazzNames), firstListValue(value.deptNames),
        nestedClass?.name, nestedClass?.className, nestedClass?.clazzName, nestedClass?.deptName,
      ),
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

  function buildStudentPageBody({ current = 1, size = 10, name = '', code = '', account = '', className = '', clazzId = '', clazzIds = [] }) {
    const body = {
      current: Number(current) || 1,
      size: Number(size) || 10,
    };
    appendIfFilled(body, 'name', name);
    appendIfFilled(body, 'code', code);
    appendIfFilled(body, 'account', account);
    appendIfFilled(body, 'className', className);
    appendIfFilled(body, 'clazzId', clazzId);
    if (Array.isArray(clazzIds) && clazzIds.length) {
      body.clazzIds = clazzIds.map((id) => String(id)).filter(Boolean);
    }
    return body;
  }

  function buildSemesterPageBody({ current = 1, size = 999 } = {}) {
    return {
      current: Number(current) || 1,
      size: Number(size) || 999,
    };
  }

  function normalizeSemester(value = {}) {
    const id = pickFirstString(value.id, value.semesterId);
    const year = pickFirstString(value.year, value.schoolYear);
    const type = pickFirstString(value.type, value.semesterType);
    const isCurrent = String(value.isCurrent ?? '') === '1';
    const parts = [year, type ? `学期${type}` : ''].filter(Boolean);
    return {
      id,
      year,
      type,
      startDate: pickFirstString(value.startDate),
      endDate: pickFirstString(value.endDate),
      isCurrent,
      label: `${parts.join(' · ') || id}${isCurrent ? ' · 当前' : ''}`,
      raw: value,
    };
  }

  function resolveSemesterId(semesters = [], preferredId = '') {
    const preferred = String(preferredId || '');
    if (preferred && semesters.some((semester) => String(semester?.id || '') === preferred)) {
      return preferred;
    }
    return pickFirstString(semesters[0]?.id);
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

  // 班级教师关系：/client/schoolManageTeacher/listByClazz
  function buildClazzTeacherListBody({ semesterId = '' } = {}) {
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
    const roots = Array.isArray(payload) ? payload
      : (Array.isArray(payload?.children) ? payload.children
        : (Array.isArray(payload?.treeList) ? payload.treeList
          : (Array.isArray(payload?.records) ? payload.records : [])));
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

  // 组织树节点层级：subDeptType/deptType 1=学段，2=年级，3=班级。
  function deptNodeType(node) {
    const raw = String(node?.subDeptType ?? node?.deptType ?? node?.type ?? '').toLowerCase();
    if (raw === '3' || raw === 'class' || node?.isClass === true) return 'class';
    if (raw === '2' || raw === 'grade') return 'grade';
    if (raw === '1' || raw === 'stage' || raw === 'section') return 'stage';
    return '';
  }

  // 定位班级所属的学段与年级。缺少层级类型的租户树按位置兜底：
  // 班级的直接上级视作年级，再上一级视作学段。
  function resolveClassLineage(ancestors = []) {
    const usable = ancestors.filter((item) => item && item.id);
    let stage = usable.filter((item) => item.type === 'stage').at(-1) || null;
    let grade = usable.filter((item) => item.type === 'grade').at(-1) || null;
    if (!grade) {
      const parent = usable.at(-1) || null;
      if (parent && parent !== stage) grade = parent;
    }
    if (!stage) {
      const index = grade ? usable.indexOf(grade) : usable.length;
      stage = index > 0 ? usable[index - 1] : null;
    }
    return { stage, grade };
  }

  // 将 schoolDept/tree 的班级叶子扁平化，保留完整路径以区分不同年级的同名班级。
  function extractClassOptions(treeData) {
    const payload = treeData?.data ?? treeData?.result ?? treeData;
    const roots = Array.isArray(payload) ? payload
      : (Array.isArray(payload?.children) ? payload.children
        : (Array.isArray(payload?.treeList) ? payload.treeList
          : (Array.isArray(payload?.records) ? payload.records : [])));
    const classes = [];

    const walk = (nodes, parentPath = [], parentIds = [], ancestors = []) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const id = pickFirstString(node.id, node.deptId);
        const name = pickFirstString(node.deptName, node.name);
        const path = name ? [...parentPath, name] : parentPath;
        const ids = id ? [...parentIds, id] : parentIds;
        const children = Array.isArray(node.children) ? node.children : [];
        const nodeType = deptNodeType(node);
        if (nodeType === 'class' && id) {
          const { stage, grade } = resolveClassLineage(ancestors);
          classes.push({
            id,
            name,
            label: path.join(' / '),
            path,
            parentId: pickFirstString(node.parentId),
            ancestorIds: ids.slice(0, -1),
            stageId: stage?.id || '',
            stageName: stage?.name || '',
            gradeId: grade?.id || '',
            gradeName: grade?.name || '',
          });
        }
        if (children.length) walk(children, path, ids, [...ancestors, { id, name, type: nodeType }]);
      }
    };

    walk(roots);
    return classes;
  }

  // 教学职务上的部门可能是学段/年级/班级，统一展开成班级 id。
  function expandDeptIdsToClassIds(deptIds, classOptions = []) {
    const source = Array.isArray(deptIds) ? deptIds : [deptIds];
    const targets = new Set(source.map((id) => String(id ?? '').trim()).filter(Boolean));
    if (!targets.size) return [];
    const result = [];
    for (const item of (Array.isArray(classOptions) ? classOptions : [])) {
      const id = pickFirstString(item?.id);
      if (!id) continue;
      const ancestorIds = Array.isArray(item?.ancestorIds) ? item.ancestorIds : [];
      if (targets.has(id) || ancestorIds.some((ancestorId) => targets.has(String(ancestorId)))) result.push(id);
    }
    return result;
  }

  // 教师详情 → 可筛选的教学范围（学科 × 班级）。
  // 没有学科的任教关系（班主任、管理班级等）归入空学科，只在「全部学科」下出现。
  function buildTeacherScopeEntries(detail, classOptions = []) {
    const classById = new Map((Array.isArray(classOptions) ? classOptions : [])
      .filter((item) => item && item.id)
      .map((item) => [String(item.id), item]));
    const entries = [];
    const seen = new Set();
    const addEntry = (subject, classId) => {
      const cls = classById.get(String(classId));
      if (!cls) return;
      const key = subject + '¦' + cls.id;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({
        subject,
        classId: String(cls.id),
        className: cls.name || '',
        classLabel: cls.label || cls.name || '',
        gradeId: cls.gradeId || '',
        gradeName: cls.gradeName || '',
        stageId: cls.stageId || '',
        stageName: cls.stageName || '',
      });
    };

    const subjectDetails = Array.isArray(detail?.schoolSubjectTeachersDetail)
      ? detail.schoolSubjectTeachersDetail
      : [];
    for (const item of subjectDetails) {
      if (!item || typeof item !== 'object') continue;
      const subjects = toStringList(item.subjectNames ?? item.subjectName ?? item.subject);
      const deptIds = toStringList(item.deptIds ?? item.deptId ?? item.classIds ?? item.classId ?? item.clazzIds ?? item.clazzId);
      for (const classId of expandDeptIdsToClassIds(deptIds, classOptions)) {
        if (subjects.length) subjects.forEach((subject) => addEntry(subject, classId));
        else addEntry('', classId);
      }
    }

    // 其它来源（班主任、管理班级等）补齐尚未出现的班级，避免筛选项少于实际教学范围。
    const covered = new Set(entries.map((entry) => entry.classId));
    for (const classId of expandDeptIdsToClassIds(extractTeacherClassIds(detail), classOptions)) {
      if (!covered.has(String(classId))) addEntry('', classId);
    }
    return entries;
  }

  // 学科 → 学段 → 年级 → 班级 逐级联动：每级选项只来自上级已选范围，
  // 上级变化后失效的下级选择自动清空；classIds 为当前筛选命中的班级。
  function resolveTeacherScope(entries = [], filter = {}) {
    const rows = (Array.isArray(entries) ? entries : []).filter((row) => row && row.classId);
    const uniqueOptions = (list, valueKey, buildLabel) => {
      const seen = new Set();
      const options = [];
      for (const row of list) {
        const value = String(row?.[valueKey] ?? '');
        if (!value || seen.has(value)) continue;
        seen.add(value);
        options.push({ value, label: buildLabel(row) || value });
      }
      return options;
    };
    const pick = (options, value) => (options.some((item) => item.value === String(value || '')) ? String(value) : '');

    const subjects = uniqueOptions(rows, 'subject', (row) => row.subject);
    const subject = pick(subjects, filter?.subject);
    const bySubject = subject ? rows.filter((row) => row.subject === subject) : rows;

    const stages = uniqueOptions(bySubject, 'stageId', (row) => row.stageName);
    const stageId = pick(stages, filter?.stageId);
    const byStage = stageId ? bySubject.filter((row) => row.stageId === stageId) : bySubject;

    // 未选中的上级层级并入下级标签，避免同名年级/班级无法区分。
    const grades = uniqueOptions(byStage, 'gradeId', (row) => [stageId ? '' : row.stageName, row.gradeName].filter(Boolean).join(' / '));
    const gradeId = pick(grades, filter?.gradeId);
    const byGrade = gradeId ? byStage.filter((row) => row.gradeId === gradeId) : byStage;

    const classes = uniqueOptions(byGrade, 'classId', (row) => [
      stageId ? '' : row.stageName,
      gradeId ? '' : row.gradeName,
      row.className,
    ].filter(Boolean).join(' / '));
    const classId = pick(classes, filter?.classId);
    const matched = classId ? byGrade.filter((row) => row.classId === classId) : byGrade;

    return {
      filter: { subject, stageId, gradeId, classId },
      subjects,
      stages,
      grades,
      classes,
      classIds: [...new Set(matched.map((row) => row.classId))],
      active: Boolean(subject || stageId || gradeId || classId),
    };
  }

  function normalizeClassText(value) {
    return String(value || '').trim().toLowerCase().replace(/[\s/\\·._-]+/g, '');
  }

  // 将后台 account/page 学生记录与 AI client/student/page 记录做严格匹配。
  // 返回全部候选，不替调用方擅自选择同名/同账号记录。
  function matchStudentCandidates(account, students = []) {
    const a = account && typeof account === 'object' ? account : {};
    const accountTenant = normalizeClassText(a.tenantId);
    const username = normalizeClassText(a.username);
    const loginAccount = normalizeClassText(a.account);
    const source = Array.isArray(students) ? students : [];
    const tenantScoped = accountTenant
      ? source.filter((student) => {
          const tenantId = normalizeClassText(student?.tenantId);
          return tenantId === accountTenant;
        })
      : source;
    const byName = username
      ? tenantScoped.filter((student) => normalizeClassText(student?.name) === username)
      : [];
    const byAccount = loginAccount
      ? tenantScoped.filter((student) => [student?.code, student?.account].some((value) => normalizeClassText(value) === loginAccount))
      : [];
    if (byAccount.length) return { matches: byAccount, matchedBy: 'account' };
    if (byName.length) return { matches: byName, matchedBy: 'username' };
    return { matches: [], matchedBy: '' };
  }

  // 学生接口优先用 classId/clazzId 定位；只有班级名称能唯一命中时才回落名称匹配。
  function findStudentClass(student, classOptions = []) {
    if (!student || !Array.isArray(classOptions) || !classOptions.length) return null;
    const raw = student.raw && typeof student.raw === 'object' ? student.raw : student;
    const nestedClass = raw.clazz && typeof raw.clazz === 'object'
      ? raw.clazz
      : (raw.class && typeof raw.class === 'object'
          ? raw.class
          : (raw.schoolDept && typeof raw.schoolDept === 'object' ? raw.schoolDept : null));
    const classId = pickFirstString(
      student.classId, raw.classId, raw.clazzId, raw.deptId, raw.schoolDeptId,
      firstListValue(raw.classIds), firstListValue(raw.clazzIds), firstListValue(raw.deptIds),
      nestedClass?.id, nestedClass?.classId, nestedClass?.clazzId, nestedClass?.deptId,
    );
    if (classId) {
      const byId = classOptions.find((item) => String(item.id) === classId);
      if (byId) return byId;
    }

    const className = normalizeClassText(pickFirstString(
      student.className, raw.className, firstListValue(raw.classNames), raw.clazzName, raw.deptName,
      firstListValue(raw.clazzNames), firstListValue(raw.deptNames),
      nestedClass?.name, nestedClass?.className, nestedClass?.clazzName, nestedClass?.deptName,
    ));
    if (!className) return null;

    const matches = classOptions.filter((item) => {
      const path = Array.isArray(item.path) ? item.path : [];
      const aliases = [
        item.label,
        item.name,
        path.join(''),
        path.slice(1).join(''),
        path.slice(-2).join(''),
      ].map(normalizeClassText).filter(Boolean);
      return aliases.includes(className);
    });
    return matches.length === 1 ? matches[0] : null;
  }

  // listByClazz → deptId -> 教师列表。同一教师兼任多个角色/科目时合并为一条。
  function buildClassTeacherMap(response) {
    const payload = response?.data ?? response?.result ?? response;
    const rows = Array.isArray(payload) ? payload
      : (Array.isArray(payload?.records) ? payload.records
        : (Array.isArray(payload?.list) ? payload.list : []));
    const result = {};

    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const deptId = pickFirstString(row.deptId, row.classId, row.clazzId);
      if (!deptId) continue;
      const teachers = new Map();
      const assignments = Array.isArray(row.clazzTeacherRespList) ? row.clazzTeacherRespList : [];

      for (const assignment of assignments) {
        if (!assignment || typeof assignment !== 'object') continue;
        const teachTypeName = pickFirstString(assignment.teachTypeName);
        const subjectName = pickFirstString(assignment.subjectName);
        const duty = teachTypeName && subjectName
          ? `${teachTypeName} · ${subjectName}`
          : (teachTypeName || subjectName);
        const users = Array.isArray(assignment.tmbUserList) ? assignment.tmbUserList : [];

        for (const user of users) {
          if (!user || typeof user !== 'object') continue;
          const tmbId = pickFirstString(user.tmbId, user.id);
          const userId = pickFirstString(user.userId);
          const key = tmbId || userId;
          if (!key) continue;
          let teacher = teachers.get(key);
          if (!teacher) {
            teacher = {
              id: key,
              tmbId,
              userId,
              name: pickFirstString(user.userName, user.name, user.teacherName, user.realName),
              account: pickFirstString(user.phone, user.mobile, user.account, user.email),
              phone: pickFirstString(user.phone, user.mobile),
              duties: [],
              raw: user,
            };
            teachers.set(key, teacher);
          }
          if (duty && !teacher.duties.includes(duty)) teacher.duties.push(duty);
        }
      }

      result[deptId] = [...teachers.values()];
    }
    return result;
  }

  function extractClazzTeacherSemesterId(response) {
    const payload = response?.data ?? response?.result ?? response;
    const rows = Array.isArray(payload) ? payload
      : (Array.isArray(payload?.records) ? payload.records : []);
    if (!rows.length) return '';
    for (const row of rows) {
      const assignments = Array.isArray(row?.clazzTeacherRespList) ? row.clazzTeacherRespList : [];
      for (const assignment of assignments) {
        const semesterId = pickFirstString(assignment?.semesterId);
        if (semesterId) return semesterId;
      }
    }
    return '';
  }

  // 从教师详情中提取教学职务（科目 · 班级），用班级树把 deptId 映射成班级全名
  // 真实结构：detail.schoolSubjectTeachersDetail = [
  //   { teachType: 7, teachTypeName: '学科教师', subjectNames: ['数学'], deptIds: [3010], deptNames: ['1班'] }
  // ]
  // deptNames 只有叶子名（如 1班），需借 idNameMap 补全为 初中初三1班
  function extractTeachDuties(detail, idNameMap = {}) {
    if (!detail || typeof detail !== 'object') return [];
    const duties = [];

    const subjectList = Array.isArray(detail.schoolSubjectTeachersDetail)
      ? detail.schoolSubjectTeachersDetail
      : [];
    for (const item of subjectList) {
      if (!item || typeof item !== 'object') continue;
      const subjects = toStringList(item.subjectNames ?? item.subjectName ?? item.subject);
      const deptIds = toStringList(item.deptIds ?? item.deptId ?? item.classIds ?? item.classId);
      const deptNames = toStringList(item.deptNames ?? item.deptName ?? item.classNames ?? item.className);
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
    const direct = pickFirstString(
      detail.semesterId, detail.semester?.id, detail.currentSemesterId,
      detail.schoolSemesterId, detail.termId,
    );
    if (direct) return direct;
    const subjectDetails = Array.isArray(detail.schoolSubjectTeachersDetail)
      ? detail.schoolSubjectTeachersDetail
      : [];
    for (const item of subjectDetails) {
      const semesterId = pickFirstString(item?.semesterId, item?.semester?.id, item?.termId);
      if (semesterId) return semesterId;
    }
    return '';
  }

  // 从教师详情中提取其教学班级 id，用于按班级查询相关学生。
  function extractTeacherClassIds(detail) {
    if (!detail || typeof detail !== 'object') return [];
    const ids = new Set();
    const collect = (value) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        value.forEach(collect);
        return;
      }
      if (typeof value === 'object') {
        ['deptIds', 'deptId', 'classIds', 'classId', 'clazzIds', 'clazzId', 'schoolDeptIds', 'schoolDeptId', 'classList', 'clazzList'].forEach((key) => collect(value[key]));
        for (const listKey of ['classList', 'clazzList']) {
          if (!Array.isArray(value[listKey])) continue;
          value[listKey].forEach((item) => {
            if (item && typeof item === 'object') collect(item.id ?? item.classId ?? item.clazzId ?? item.deptId);
          });
        }
        return;
      }
      String(value).split(/[,，、\s]+/).map((item) => item.trim()).filter(Boolean).forEach((item) => ids.add(item));
    };
    ['schoolSubjectTeachersDetail', 'schoolManageTeachersDetail', 'subjectTeachers', 'manageTeachers', 'teacherClassList', 'clazzList'].forEach((key) => collect(detail[key]));
    return [...ids];
  }

  namespace.tenant = {
    DEFAULT_DEPT_SOURCE,
    normalizeTenant,
    normalizeUser,
    normalizeAccount,
    normalizeDept,
    flattenDeptOptions,
    buildTenantPageBody,
    buildUserPageBody,
    buildAccountPageBody,
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
    buildSemesterPageBody,
    normalizeSemester,
    resolveSemesterId,
    buildTeacherDetailBody,
    buildSchoolDeptTreeBody,
    buildClazzTeacherListBody,
    extractDetailData,
    buildDeptIdNameMap,
    extractClassOptions,
    expandDeptIdsToClassIds,
    buildTeacherScopeEntries,
    resolveTeacherScope,
    findStudentClass,
    matchStudentCandidates,
    buildClassTeacherMap,
    extractClazzTeacherSemesterId,
    extractTeachDuties,
    extractSemesterId,
    extractTeacherClassIds,
    pickFirstString,
    appendIfFilled,
    parseVirtualLoginUrl,
    statusInfo,
    studentStatusInfo,
  };
})();
