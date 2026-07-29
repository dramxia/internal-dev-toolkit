const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const panelPath = path.join(__dirname, '..', 'devtools', 'panel.js');
const panelSource = fs.readFileSync(panelPath, 'utf8');
const sourceWithoutStartup = panelSource.split('// 启动')[0];
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  URL,
  chrome: {
    devtools: { inspectedWindow: { tabId: 1 } },
  },
};

vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'devtools', 'vendor', 'js-yaml.min.js'), 'utf8'),
  sandbox,
);
vm.runInContext(`${sourceWithoutStartup}\n;globalThis.__panelTest = { getMockParts, buildRule, createEditorDraftState, editorPayloadText, parseMockDraftTabs, buildRuleFromSpec, buildRulesFromSpec };`, sandbox);

const {
  getMockParts,
  buildRule,
  createEditorDraftState,
  editorPayloadText,
  parseMockDraftTabs,
  buildRuleFromSpec,
  buildRulesFromSpec,
} = sandbox.__panelTest;
const plainValue = value => JSON.parse(JSON.stringify(value));
const real = {
  url: '/api/users/real',
  method: 'GET',
  status: 200,
  responsePayload: { source: 'real-response' },
  requestPayload: { source: 'real-request' },
  hasRealSnapshot: true,
};
const mockValues = {
  response: { source: 'mock-response' },
  request: { source: 'mock-request' },
  status: 503,
  method: 'POST',
  url: '/api/users/mock',
};

const enabledRule = buildRule({ ...real, existingRule: null, mode: 'capture' }, {
  activeTab: 'response',
  mockDataByTab: {
    response: { source: 'old-mock-response' },
    request: { source: 'old-mock-request' },
  },
  updateMockData: false,
  enabled: true,
  status: 400,
  method: 'PUT',
  url: '/api/users/old-mock',
});

// 模拟用户改完五类 Mock 字段后直接关闭开关，关闭动作应同时保存这些草稿。
const disabledRule = buildRule({ ...real, existingRule: enabledRule, mode: 'capture' }, {
  activeTab: 'response',
  mockDataByTab: {
    response: mockValues.response,
    request: mockValues.request,
  },
  updateMockData: false,
  enabled: false,
  status: mockValues.status,
  method: mockValues.method,
  url: mockValues.url,
});
const disabledParts = getMockParts(disabledRule);

assert.equal(disabledParts.responseMock.enabled, false);
assert.equal(disabledParts.requestMock.enabled, false);
assert.deepEqual(disabledParts.responseMock.mockData, mockValues.response);
assert.deepEqual(disabledParts.requestMock.mockData, mockValues.request);
assert.equal(disabledParts.responseMock.status, mockValues.status);
assert.equal(disabledParts.mockMethod, mockValues.method);
assert.equal(disabledParts.mockUrl, mockValues.url);
assert.equal(disabledRule.status, undefined, '真实状态不应被 Mock 状态覆盖');
assert.equal(disabledRule.method, real.method, '真实 Method 不应被 Mock Method 覆盖');
assert.equal(disabledRule.url, real.url, '真实 URL 不应被 Mock URL 覆盖');

const reopenedRule = buildRule({ ...real, existingRule: disabledRule, mode: 'capture' }, {
  activeTab: 'response',
  updateMockData: false,
  enabled: true,
});
const reopenedParts = getMockParts(reopenedRule);

assert.equal(reopenedParts.responseMock.enabled, true);
assert.equal(reopenedParts.requestMock.enabled, true);
assert.deepEqual(reopenedParts.responseMock.mockData, mockValues.response);
assert.deepEqual(reopenedParts.requestMock.mockData, mockValues.request);
assert.equal(reopenedParts.responseMock.status, mockValues.status);
assert.equal(reopenedParts.mockMethod, mockValues.method);
assert.equal(reopenedParts.mockUrl, mockValues.url);

// 面板关闭时必须直接渲染真实值，不能把这些值写回 mock 草稿；重开后恢复 Mock。
const retainedDraft = createEditorDraftState({
  key: 'GET /api/users/real',
  drafts: {
    response: JSON.stringify(mockValues.response),
    request: JSON.stringify(mockValues.request),
  },
  dirtyTabs: new Set(),
  headerDirty: false,
  overrides: {},
}, 'GET /api/users/real', () => {
  throw new Error('已有 Mock 草稿时不应使用真实数据初始化草稿');
});
const realDraftFor = tab => JSON.stringify(
  tab === 'response' ? real.responsePayload : real.requestPayload,
);
const closedResponseText = editorPayloadText(false, retainedDraft, realDraftFor, 'response');
const closedRequestText = editorPayloadText(false, retainedDraft, realDraftFor, 'request');

assert.equal(closedResponseText, JSON.stringify(real.responsePayload));
assert.equal(closedRequestText, JSON.stringify(real.requestPayload));
assert.equal(retainedDraft.drafts.response, JSON.stringify(mockValues.response));
assert.equal(retainedDraft.drafts.request, JSON.stringify(mockValues.request));
assert.equal(
  editorPayloadText(true, retainedDraft, realDraftFor, 'response'),
  JSON.stringify(mockValues.response),
);
assert.equal(
  editorPayloadText(true, retainedDraft, realDraftFor, 'request'),
  JSON.stringify(mockValues.request),
);

assert.equal(
  JSON.stringify(parseMockDraftTabs(retainedDraft, ['response', 'request'])),
  JSON.stringify({ response: mockValues.response, request: mockValues.request }),
  '关闭开关时应能一次解析并保存出参与入参草稿',
);
assert.throws(
  () => parseMockDraftTabs({ drafts: { response: '{invalid' } }, ['response']),
  /出参 JSON 格式错误/,
  '非法 JSON 应阻止关闭，避免丢失编辑内容',
);

const multiRules = buildRulesFromSpec(JSON.stringify({
  openapi: '3.0.3',
  servers: [{ url: 'https://example.com/api' }],
  paths: {
    '/users': {
      get: {
        responses: {
          200: { content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } } },
        },
      },
      post: {
        requestBody: {
          content: { 'application/json; charset=utf-8': { schema: { $ref: '#/components/schemas/UserInput' } } },
        },
        responses: {
          201: { content: { 'application/vnd.example+json': { schema: { $ref: '#/components/schemas/User' } } } },
        },
      },
    },
  },
  components: {
    schemas: {
      User: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
      UserInput: { type: 'object', properties: { name: { type: 'string' } } },
    },
  },
}));
assert.equal(multiRules.length, 2, '合并文档中的全部 method 都应生成规则');
assert.equal(new Set(multiRules.map(rule => rule.id)).size, 2, '批量规则 id 必须唯一');
assert.deepEqual(Array.from(multiRules, rule => rule.method), ['GET', 'POST']);
assert.deepEqual(Array.from(multiRules, rule => rule.url), ['/api/users', '/api/users']);
assert.equal(multiRules[1].status, 201);
assert.equal(typeof multiRules[1].captured.requestPayload.name, 'string');

const singleRule = buildRuleFromSpec(JSON.stringify({
  openapi: '3.0.3',
  paths: {
    '/health': {
      get: {
        responses: {
          200: { content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
        },
      },
    },
  },
}));
assert.equal(singleRule.method, 'GET', '原有单接口导入入口应保持兼容');
assert.equal(singleRule.url, '/health');

const swaggerRule = buildRuleFromSpec(JSON.stringify({
  swagger: '2.0',
  basePath: '/api/v1',
  paths: {
    '/pets': {
      post: {
        parameters: [{ name: 'body', in: 'body', schema: { $ref: '#/definitions/PetInput' } }],
        responses: { 201: { description: 'created', schema: { $ref: '#/definitions/Pet' } } },
      },
    },
  },
  definitions: {
    PetInput: { type: 'object', properties: { name: { type: 'string' } } },
    Pet: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
  },
}));
assert.equal(swaggerRule.url, '/api/v1/pets');
assert.equal(swaggerRule.status, 201);
assert.equal(typeof swaggerRule.captured.requestPayload.name, 'string');

const learningReportRules = buildRulesFromSpec(`
openapi: 3.0.3
servers:
  - url: https://api.huayun.example.com
paths:
  /ai-homework/app/student/learning/schedule:
    get:
      summary: 9.1 当日课程列表
      parameters:
        - $ref: '#/components/parameters/StudentId'
        - name: date
          in: query
          required: true
          schema:
            type: string
            format: date
          example: '2026-07-28'
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/StudentScheduleResponse'
              example:
                - curriculumId: 'cur-20260728-001'
                  curriculumName: 分数的初步认识
                  status: FINISHED
  /ai-homework/app/student/learning/summary:
    get:
      summary: 9.2 我的学习概览
      parameters:
        - $ref: '#/components/parameters/StudentId'
        - $ref: '#/components/parameters/WeekStart'
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LearningSummaryResponse'
              example:
                attendedLessonCount: 14
                behaviorScore: 86
                quizAccuracy: 78
                wrongQuestionCount: 23
components:
  parameters:
    StudentId:
      name: studentId
      in: query
      required: true
      schema:
        type: string
      example: 'stu-102457'
    WeekStart:
      name: weekStart
      in: query
      required: true
      schema:
        type: string
        format: date
      example: '2026-07-27'
  schemas:
    StudentScheduleResponse:
      type: object
      properties:
        curriculumId:
          type: string
        curriculumName:
          type: string
        status:
          type: string
          enum: [PENDING, ONGOING, FINISHED]
    LearningSummaryResponse:
      type: object
      properties:
        attendedLessonCount:
          type: integer
        behaviorScore:
          type: integer
        quizAccuracy:
          type: integer
        wrongQuestionCount:
          type: integer
`);
assert.equal(learningReportRules.length, 2, 'YAML 文档中的全部路径都应被识别');
assert.equal(
  learningReportRules[0].url,
  '/ai-homework/app/student/learning/schedule',
  '导入 URL 应保留完整接口路径并移除 server 域名',
);
assert.deepEqual(
  plainValue(learningReportRules[0].captured.requestPayload),
  { studentId: 'stu-102457', date: '2026-07-28' },
  'GET query 参数及其引用/example 应被识别为入参',
);
assert.deepEqual(
  plainValue(learningReportRules[0].captured.responsePayload),
  [{ curriculumId: 'cur-20260728-001', curriculumName: '分数的初步认识', status: 'FINISHED' }],
  '媒体类型上的响应 example 应优先于随机 schema 数据',
);
assert.deepEqual(
  plainValue(learningReportRules[1].captured.requestPayload),
  { studentId: 'stu-102457', weekStart: '2026-07-27' },
);
assert.deepEqual(
  plainValue(learningReportRules[1].captured.responsePayload),
  { attendedLessonCount: 14, behaviorScore: 86, quizAccuracy: 78, wrongQuestionCount: 23 },
);

const yamlWithUnquotedDescriptionColon = [
  'openapi: 3.0.3',
  'paths:',
  '  /secure:',
  '    get:',
  '      responses:',
  "        '200':",
  '          content:',
  '            application/json:',
  '              schema:',
  '                type: object',
  '                properties:',
  '                  ok:',
  '                    type: boolean',
  '              example:',
  '                ok: true',
  'components:',
  '  securitySchemes:',
  '    bearerAuth:',
  '      type: http',
  '      scheme: bearer',
  '      bearerFormat: JWT',
  '      description: 学生端登录 token，请求头 `Authorization: Bearer <token>`',
].join('\n');
const secureRule = buildRuleFromSpec(yamlWithUnquotedDescriptionColon);
assert.equal(secureRule.url, '/secure');
assert.deepEqual(
  plainValue(secureRule.captured.responsePayload),
  { ok: true },
  '未加引号且包含冒号的 description 不应阻断 OpenAPI 导入',
);

console.log('mock panel toggle regression tests passed');
