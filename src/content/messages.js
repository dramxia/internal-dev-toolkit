/* 内部开发工具箱 — popup 与 content 之间的消息通信 */
(() => {
  'use strict';

  const ns = globalThis.InternalDevToolkit || (globalThis.InternalDevToolkit = {});

  // popup -> 当前标签页 content script
  function sendToActiveTab(message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs && tabs[0];
        if (!tab || !tab.id) {
          reject(new Error('未找到活动标签页'));
          return;
        }
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      });
    });
  }

  // content script -> background
  function sendToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime?.lastError) {
          const rawMessage = chrome.runtime.lastError.message || '后台消息发送失败';
          const portClosed = /message port closed|receiving end does not exist|could not establish connection/i.test(rawMessage);
          const type = message?.type ? `（${message.type}）` : '';
          reject(new Error(portClosed
            ? `后台脚本未响应${type}，请在扩展管理页重新加载“内部开发工具箱”后重试`
            : rawMessage));
          return;
        }
        if (response === undefined) {
          const type = message?.type ? `（${message.type}）` : '';
          reject(new Error(`后台未返回结果${type}，请重新加载扩展后重试`));
          return;
        }
        resolve(response);
      });
    });
  }

  // content script 端注册消息处理
  function onMessage(handler) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      const result = handler(msg, sender);
      if (result && typeof result.then === 'function') {
        result.then(sendResponse).catch((err) => sendResponse({ ok: false, error: err.message }));
        return true; // 异步响应
      }
      sendResponse(result);
      return false;
    });
  }

  ns.messages = { sendToActiveTab, sendToBackground, onMessage };
})();
