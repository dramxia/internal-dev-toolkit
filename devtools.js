/* 内部开发工具箱 — DevTools 入口 */
/* 注册 DevTools Panel */

chrome.devtools.panels.create(
  '接口 Mock',
  'icons/icon16.png',
  'devtools/panel.html',
  (panel) => {
    console.log('[Mock] DevTools panel created for tab', chrome.devtools.inspectedWindow.tabId);
  }
);
