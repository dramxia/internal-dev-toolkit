/* 生成完整终端命令；下载包作为备用入口，保留 .command 执行权限。 */
(() => {
  'use strict';
  const assets = ['native-host/host.cjs', 'native-host/lib.cjs', 'native-host/installation.cjs', 'scripts/install-component-host.js'];
  const QUARANTINE_COMMAND = '/usr/bin/xattr -dr com.apple.quarantine ';
  const encoder = new TextEncoder();
  const crcTable = Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    return value >>> 0;
  });
  function crc32(data) {
    let crc = 0xffffffff;
    for (const value of data) crc = (crc >>> 8) ^ crcTable[(crc ^ value) & 255];
    return (crc ^ 0xffffffff) >>> 0;
  }
  function archive(files) {
    const local = [], central = [];
    let offset = 0, centralSize = 0;
    for (const file of files) {
      const name = encoder.encode(`component-helper/${file.name}`);
      const data = encoder.encode(file.text);
      const crc = crc32(data);
      const header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
      view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true);
      view.setUint16(12, 0x5c21, true); view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, name.length, true);
      header.set(name, 30); local.push(header, data);
      const record = new Uint8Array(46 + name.length), recordView = new DataView(record.buffer);
      recordView.setUint32(0, 0x02014b50, true); recordView.setUint16(4, 0x314, true); recordView.setUint16(6, 20, true);
      recordView.setUint16(8, 0x800, true); recordView.setUint16(14, 0x5c21, true); recordView.setUint32(16, crc, true);
      recordView.setUint32(20, data.length, true); recordView.setUint32(24, data.length, true); recordView.setUint16(28, name.length, true);
      recordView.setUint32(38, ((file.executable ? 0o100755 : 0o100644) << 16) >>> 0, true);
      recordView.setUint32(42, offset, true); record.set(name, 46); central.push(record);
      offset += header.length + data.length; centralSize += record.length;
    }
    const end = new Uint8Array(22), view = new DataView(end.buffer);
    view.setUint32(0, 0x06054b50, true); view.setUint16(8, files.length, true); view.setUint16(10, files.length, true);
    view.setUint32(12, centralSize, true); view.setUint32(16, offset, true);
    return new Blob([...local, ...central, end], { type: 'application/zip' });
  }

  function command(extensionId, removing) {
    if (!/^[a-p]{32}$/.test(extensionId)) throw new Error('扩展编号无效，请重新加载工具箱');
    const action = removing ? '卸载' : '安装';
    return `#!/bin/zsh
SCRIPT_DIR=\${0:A:h}
print '内部开发工具箱 · ${action}组件定位辅助程序'
print '此操作只需在本机完成一次，所有开发项目共用。'
node_bin=$(command -v node)
if [[ -z "$node_bin" ]]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node "$HOME"/.volta/bin/node "$HOME"/.asdf/shims/node "$HOME"/.local/share/mise/shims/node "$HOME"/.nvm/versions/node/*/bin/node(N) "$HOME"/.local/share/fnm/node-versions/*/installation/bin/node(N) "$HOME/Library/Application Support/fnm"/node-versions/*/installation/bin/node(N); do
    if [[ -x "$candidate" ]]; then node_bin="$candidate"; break; fi
  done
fi
if [[ -z "$node_bin" ]] || ! "$node_bin" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)' 2>/dev/null; then
  print '请先安装 Node.js 18 或以上版本，再重新双击此文件。'
  print '下载地址：https://nodejs.org/'
  read '?按回车键关闭窗口。'
  exit 1
fi
"$node_bin" "$SCRIPT_DIR/scripts/install-component-host.js" ${removing ? '--uninstall' : extensionId}
result=$?
if [[ $result -ne 0 ]]; then print '${action}未完成，请根据上方提示处理后重试。'; fi
read '?按回车键关闭窗口，然后回到工具箱「定位」页。'
exit $result
`;
  }

  async function readLocalAsset(file) {
    const response = await fetch(chrome.runtime.getURL(file));
    if (!response.ok) throw new Error('安装文件读取失败，请重新加载工具箱');
    return response.text();
  }

  async function createTerminalCommand(extensionId, action = 'install', readAsset = readLocalAsset) {
    if (!/^[a-p]{32}$/.test(extensionId)) throw new Error('扩展编号无效，请重新加载工具箱');
    if (!['install', 'uninstall'].includes(action)) throw new Error('安装操作无效');
    const removing = action === 'uninstall';
    const names = removing ? ['native-host/installation.cjs'] : assets.filter((name) => name.startsWith('native-host/'));
    // 每行分别序列化，保留可阅读的源码，并限制终端粘贴时的行长度。
    const payload = await Promise.all(names.map(async (name) => {
      const lines = (await readAsset(name)).split('\n').map((line) => JSON.stringify(line));
      return `    [${JSON.stringify(name)}, [\n      ${lines.join(',\n      ')}\n    ].join('\\n')]`;
    }));
    return `node <<'IDT_COMPONENT_SETUP'
// 内部开发工具箱：${removing ? '卸载' : '安装'}组件定位辅助程序。
// 写入当前用户的 Application Support 目录和 Chrome 通信注册；保留编辑器设置。
// 所需文件均来自当前扩展。执行过程中不下载远程代码。
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
(async () => {
  if (process.platform !== 'darwin') throw new Error('此安装方式用于 macOS');
  if (Number(process.versions.node.split('.')[0]) < 18) throw new Error('请先安装 Node.js 18 或以上版本');
  const files = [
${payload.join(',\n')}
  ];
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'idt-component-setup-'));
  try {
    for (const [name, text] of files) {
      const file = path.join(temporary, name);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, text, { mode: 0o600 });
    }
    const installer = require(path.join(temporary, 'native-host', 'installation.cjs'));
    ${removing ? 'await installer.uninstall();' : `await installer.install({ extensionId: ${JSON.stringify(extensionId)}, sourceRoot: temporary });`}
    console.log(${JSON.stringify(removing ? '辅助程序已卸载，编辑器设置已保留。回到工具箱「定位」页点击「检查连接」。' : '辅助程序已安装。回到工具箱「定位」页，连接成功后选择编辑器。')});
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
IDT_COMPONENT_SETUP
`;
  }

  async function createPackage(extensionId, action = 'install', readAsset = readLocalAsset) {
    const removing = action === 'uninstall';
    const title = removing ? '卸载' : '安装';
    const launcher = command(extensionId, removing);
    const files = await Promise.all(assets.map(async (name) => ({ name, text: await readAsset(name) })));
    files.push({ name: `${title}.command`, text: launcher, executable: true });
    files.push({ name: '使用说明.txt', text: `内部开发工具箱 · ${title}组件定位辅助程序\n\n使用此包：双击「${title}.command」，等待终端显示成功提示，再返回「定位」页点击「检查连接」。\n\n如果出现「Apple 无法验证」：\n1. 打开终端，粘贴以下命令，末尾保留一个空格：\n${QUARANTINE_COMMAND}\n2. 将本次解压得到的 component-helper 文件夹拖到命令末尾，按回车。\n3. 再双击「${title}.command」。\n该命令只删除所选安装包的下载隔离标记。首次解除隔离要在终端执行，此时被拦截的脚本尚未启动。\n\n也可使用工具箱「定位」页的「复制${title}命令」直接在终端完成操作。\n\n适用环境：macOS、Chrome、Node.js 18 及以上版本。\n安装一次，所有本地开发项目共用。卸载保留编辑器设置。\n扩展编号：${extensionId}\n` });
    return archive(files);
  }

  const api = { createPackage, createTerminalCommand, command, QUARANTINE_COMMAND };
  (globalThis.InternalDevToolkit ||= {}).componentInstaller = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
