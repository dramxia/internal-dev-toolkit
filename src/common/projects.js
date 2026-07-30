/* ===== src/common/projects.js ===== */
// 项目注册表 - 所有后台项目的配置集中在此
// 新增项目时在 PROJECTS 数组中追加配置对象，然后 npm run build

const PROJECTS = [
  {
    id: 'gpt-admin-pre',
    name: 'AI平台',
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
