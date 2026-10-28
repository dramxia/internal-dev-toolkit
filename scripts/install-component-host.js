#!/usr/bin/env node
'use strict';
const path = require('node:path');
const { installationPaths, install, uninstall } = require('../native-host/installation.cjs');

async function main() {
  if (process.platform !== 'darwin') throw new Error('此安装脚本用于 macOS');
  const removing = process.argv.includes('--uninstall');
  const extensionId = process.argv.find((arg) => /^[a-p]{32}$/.test(arg));
  const paths = installationPaths();
  if (removing) {
    await uninstall(paths);
    console.log('组件定位辅助程序已卸载。编辑器设置保留在 ' + paths.dataDir);
    return;
  }
  if (!extensionId) throw new Error('请提供扩展编号：node scripts/install-component-host.js <扩展编号>\n扩展编号可在「组件定位」页或 chrome://extensions 中查看。');
  await install({ extensionId, sourceRoot: path.join(__dirname, '..'), paths });
  console.log('组件定位辅助程序已安装。回到工具箱「定位」页，连接成功后选择编辑器。');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
