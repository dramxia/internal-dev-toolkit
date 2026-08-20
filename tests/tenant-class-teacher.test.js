const assert = require('assert');

globalThis.InternalDevToolkit = {};
require('../src/common/tenant.js');

const tenant = globalThis.InternalDevToolkit.tenant;

const treeResponse = {
  code: 200,
  data: [
    {
      id: '2',
      deptName: '小学',
      subDeptType: 1,
      children: [
        {
          id: '3',
          deptName: '三年级',
          subDeptType: 2,
          children: [
            { id: '2979', parentId: '3', deptName: '1班', subDeptType: 3, children: [] },
            { id: '2980', parentId: '3', deptName: '2班', subDeptType: 3, children: [] },
          ],
        },
        {
          id: '5',
          deptName: '五年级',
          subDeptType: 2,
          children: [
            { id: '2989', parentId: '5', deptName: '1班', subDeptType: 3, children: [] },
          ],
        },
      ],
    },
  ],
};

const teacherResponse = {
  code: 200,
  data: [
    {
      deptId: 2989,
      clazzTeacherRespList: [
        {
          semesterId: 141,
          teachTypeName: '班主任',
          subjectName: '',
          tmbUserList: [
            { tmbId: '24526', userId: '20420', userName: '李书韵', phone: '13611230002' },
          ],
        },
        {
          semesterId: 141,
          teachTypeName: '学科教师',
          subjectName: '语文',
          tmbUserList: [
            { tmbId: '24526', userId: '20420', userName: '李书韵', phone: '13611230002' },
            { tmbId: '24525', userId: '20419', userName: '未来智慧负责人', phone: '13611230001' },
          ],
        },
        {
          semesterId: 141,
          teachTypeName: '学科教师',
          subjectName: '数学',
          tmbUserList: [
            { tmbId: '24526', userId: '20420', userName: '李书韵', phone: '13611230002' },
          ],
        },
      ],
    },
  ],
};

const semesterResponse = {
  code: 200,
  data: {
    records: [
      { id: '141', year: '2027-2028', type: 1, isCurrent: 1 },
      { id: '139', year: '2026-2027', type: 2, isCurrent: 2 },
    ],
    total: 2,
    current: 1,
    size: 999,
  },
};

const semesterPage = tenant.extractPageData(semesterResponse);
const semesters = semesterPage.records.map(tenant.normalizeSemester);
assert.deepStrictEqual(tenant.buildSemesterPageBody(), { current: 1, size: 999 });
assert.strictEqual(semesters[0].label, '2027-2028 · 学期1 · 当前');
assert.strictEqual(tenant.resolveSemesterId(semesters), '141');
assert.strictEqual(tenant.resolveSemesterId(semesters, '139'), '139');
assert.strictEqual(tenant.resolveSemesterId(semesters, 'missing'), '141');

const classes = tenant.extractClassOptions(treeResponse);
assert.strictEqual(classes.length, 3);
assert.deepStrictEqual(classes.map((item) => item.label), [
  '小学 / 三年级 / 1班',
  '小学 / 三年级 / 2班',
  '小学 / 五年级 / 1班',
]);

const studentById = tenant.normalizeStudent({
  id: 's1',
  studentName: '张同学',
  clazzId: 2989,
  clazzName: '1班',
});
assert.strictEqual(studentById.classId, '2989');
assert.strictEqual(tenant.findStudentClass(studentById, classes).label, '小学 / 五年级 / 1班');

const studentByFullName = tenant.normalizeStudent({
  id: 's2',
  studentName: '王同学',
  className: '三年级 2班',
});
assert.strictEqual(tenant.findStudentClass(studentByFullName, classes).id, '2980');

const ambiguousStudent = tenant.normalizeStudent({ id: 's3', className: '1班' });
assert.strictEqual(tenant.findStudentClass(ambiguousStudent, classes), null);

const studentByDeptList = tenant.normalizeStudent({
  id: 's4',
  deptIds: [2979],
  deptNames: ['1班'],
});
assert.strictEqual(tenant.findStudentClass(studentByDeptList, classes).id, '2979');

const teacherMap = tenant.buildClassTeacherMap(teacherResponse);
assert.strictEqual(teacherMap['2989'].length, 2);
assert.strictEqual(teacherMap['2989'][0].id, '24526');
assert.deepStrictEqual(teacherMap['2989'][0].duties, [
  '班主任',
  '学科教师 · 语文',
  '学科教师 · 数学',
]);
assert.deepStrictEqual(teacherMap['2989'][1].duties, ['学科教师 · 语文']);
assert.strictEqual(tenant.extractClazzTeacherSemesterId(teacherResponse), '141');
assert.deepStrictEqual(tenant.buildClazzTeacherListBody({ semesterId: '141' }), { semesterId: '141' });
assert.deepStrictEqual(tenant.buildClazzTeacherListBody(), {});

assert.strictEqual(tenant.extractSemesterId({
  schoolSubjectTeachersDetail: [{ semesterId: 141 }],
}), '141');

console.log('tenant class teacher tests passed');
