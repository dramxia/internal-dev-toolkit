/* 辅助程序更新只读取当前扩展自带的固定文件。内容摘要随文件变化，无需手工调整版本号。 */
(() => {
  'use strict';
  const files = ['host.cjs', 'lib.cjs', 'installation.cjs'];
  let cached;
  async function loadBundle() {
    if (!cached) {
      cached = (async () => {
        const entries = await Promise.all(files.map(async (file) => {
          const response = await fetch(chrome.runtime.getURL(`native-host/${file}`), { cache: 'no-store' });
          if (!response.ok) throw new Error('辅助程序更新文件读取失败，请重新加载扩展');
          return [file, await response.text()];
        }));
        const bytes = new TextEncoder().encode(JSON.stringify(entries));
        if (bytes.length > 512 * 1024) throw new Error('辅助程序更新文件过大');
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return { revision: [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join(''), files: Object.fromEntries(entries) };
      })();
      cached.catch(() => { cached = null; });
    }
    return cached;
  }
  (globalThis.InternalDevToolkit ||= {}).componentRuntime = { loadBundle };
})();
