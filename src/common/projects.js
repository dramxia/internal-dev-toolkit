/* ===== src/common/projects.js ===== */
// 项目注册表 - 所有后台项目的配置集中在此
// 新增项目时在 PROJECTS 数组中追加配置对象，然后 npm run build

const PROJECTS = [
  {
    id: 'gpt-admin-pre',
    name: 'GPT后台-预发布',
    baseUrl: 'https://gpt-admin-pre.hwzxs.com',
    authPath: '/huayun-ai/admin/auth',
    tenantApiPaths: {
      tenantPage: '/huayun-ai/admin/tenant/page',
      deptList: '/huayun-ai/admin/dept/list',
      userPage: '/huayun-ai/admin/tenant/user/page',
      virtualLogin: '/huayun-ai/admin/tenant/user/virtualLogin',
    },
    cookieKeys: ['HWWAFSESID', 'HWWAFSESTIME'],
    enabledFeatures: ['adminPanel', 'quickLogin'],
    hosts: ['gpt-admin-pre.hwzxs.com', '*.hwzxs.com'],
  },
  {
    id: 'local-test',
    name: '本地测试',
    baseUrl: 'http://localhost:3000',
    authPath: '/api/auth',
    tenantApiPaths: {
      tenantPage: '/api/tenant/page',
      deptList: '/api/dept/list',
      userPage: '/api/user/page',
      virtualLogin: '/api/user/virtualLogin',
    },
    cookieKeys: [],
    enabledFeatures: ['adminPanel', 'quickLogin'],
    hosts: ['localhost', '127.0.0.1'],
  },
];

const DEFAULT_PROJECT_ID = 'gpt-admin-pre';

function getById(id) {
  return PROJECTS.find(p => p.id === id);
}

// 浏览器环境暴露到全局命名空间
if (typeof globalThis !== 'undefined') {
  globalThis.InternalDevToolkit = globalThis.InternalDevToolkit || {};
  globalThis.InternalDevToolkit.projects = {
    PROJECTS,
    DEFAULT_PROJECT_ID,
    getById,
  };
}

// Node.js 环境（scripts/build.js）导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PROJECTS, DEFAULT_PROJECT_ID, getById };
}
