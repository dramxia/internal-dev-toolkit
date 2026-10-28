const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const { createHost, cleanSource, resolveProjectFile, rootFromCommand, EDITOR_PICKER_SCRIPT } = require('../native-host/lib.cjs');
const run = promisify(execFile);

(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'idt-component-native-'));
  const root = await fs.realpath(temp);
  let server;
  try {
    await fs.mkdir(path.join(root, 'src'));
    await fs.writeFile(path.join(root, 'src', '中文 Button.jsx'), 'export const Button = () => null;');
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'native-fixture', dependencies: { react: '18' } }));
    assert.equal(cleanSource('webpack://app/./src/App.vue?type=script'), 'src/App.vue');
    assert.equal(cleanSource('http://localhost:5173/@fs/Users/me/My%20Project/App.vue'), '/Users/me/My Project/App.vue');
    assert.equal(await resolveProjectFile(root, '/src/中文%20Button.jsx'), path.join(root, 'src', '中文 Button.jsx'));
    await assert.rejects(() => resolveProjectFile(root, '/etc/hosts'), /未找到/);
    await fs.symlink('/etc/hosts', path.join(root, 'src', 'outside'));
    await assert.rejects(() => resolveProjectFile(root, 'src/outside'), /未找到/);
    assert.equal(rootFromCommand('node /tool/vite.js "apps/my web" --host', root), path.join(root, 'apps/my web'));
    assert.equal(rootFromCommand('next dev apps/web -p 3000', root), path.join(root, 'apps/web'));
    if (process.platform !== 'darwin') { console.log('native path tests passed; macOS process checks skipped'); return; }
    await run('/usr/bin/osacompile', ['-o', path.join(root, 'editor-picker.scpt'), '-e', EDITOR_PICKER_SCRIPT]);
    server = spawn(process.execPath, ['-e', "require('node:http').createServer((q,s)=>s.end('ok')).listen(0,'127.0.0.1',function(){console.log(this.address().port)})"], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
    const port = await new Promise((resolve) => server.stdout.once('data', (data) => resolve(Number(data.toString().trim()))));
    const origin = `http://127.0.0.1:${port}`;
    const launches = [];
    const appPath = path.join(root, "中文 Editor's Folder", 'Cursor.app');
    const cli = path.join(appPath, 'Contents', 'Resources', 'app', 'bin', 'cursor');
    await fs.mkdir(path.dirname(cli), { recursive: true }); await fs.writeFile(cli, 'fixture');
    await fs.writeFile(path.join(appPath, 'Contents', 'Info.plist'), '<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>com.todesktop.230313mzl4w4u92</string></dict></plist>');
    let pickerSelection = null;
    const host = createHost({ dataDir: path.join(root, 'state'), run: async (file, args, options) => {
      if (file === cli) { launches.push(args); return { stdout: '' }; }
      if (file === '/usr/bin/osascript') {
        assert.match(args[1], /choose file/);
        assert.match(args[1], /com\.apple\.application-bundle/);
        assert.match(args[1], /default location \(path to applications folder\)/);
        if (pickerSelection) return { stdout: pickerSelection + '\n' };
        throw new Error('User cancelled (-128)');
      }
      return run(file, args, options);
    } });
    assert.equal((await host.status()).editor, null);
    const { project } = await host.identifyProject({ origin, hints: ['/src/中文%20Button.jsx'] });
    assert.equal(project.root, root);
    assert.equal(project.pid, server.pid);
    await assert.rejects(() => host.openSource({ origin, projectId: project.id, source: { file: 'src/中文 Button.jsx' } }), /选择有效/);
    const config = await host.readConfig(); config.editor = { path: appPath, name: 'Cursor', bundleId: 'com.todesktop.230313mzl4w4u92' }; await host.saveConfig(config);
    assert.equal((await host.handle({ action: 'chooseEditor' })).cancelled, true);
    assert.equal((await host.status()).editor.path, appPath);
    pickerSelection = appPath + '/';
    const selected = await host.handle({ action: 'chooseEditor' });
    assert.equal(selected.editor.path, appPath);
    assert.equal(selected.editor.bundleId, 'com.todesktop.230313mzl4w4u92');
    pickerSelection = path.join(root, 'src', '中文 Button.jsx');
    await assert.rejects(() => host.handle({ action: 'chooseEditor' }), /有效的 macOS 应用程序/);
    assert.equal((await host.status()).editor.path, appPath, '误选其他文件应保留原编辑器');
    const opened = await host.openSource({ origin, projectId: project.id, source: { file: '/src/中文%20Button.jsx', line: 7, column: 3 } });
    assert.equal(opened.precision, 'line');
    assert.deepEqual(launches[0], ['--reuse-window', '--goto', `${root}/src/中文 Button.jsx:7:3`]);
    await assert.rejects(() => host.openSource({ origin, projectId: 'outdated', source: { file: 'src/中文 Button.jsx' } }), /目录已变化/);
    assert.equal((await host.checkProject({ origin, projectId: project.id })).project.id, project.id);
    const previousPid = server.pid, launchesBeforeRestart = launches.length;
    const stopped = new Promise((resolve) => server.once('exit', resolve)); server.kill(); await stopped;
    server = null;
    await assert.rejects(() => host.checkProject({ origin, projectId: project.id }), (error) => error.code === 'COMPONENT_SERVER_OFFLINE');
    server = spawn(process.execPath, ['-e', `require('node:http').createServer((q,s)=>s.end('restarted')).listen(${port},'127.0.0.1',function(){console.log(this.address().port)})`], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
    await new Promise((resolve) => server.stdout.once('data', resolve));
    assert.notEqual(server.pid, previousPid);
    await assert.rejects(() => host.checkProject({ origin, projectId: project.id }), (error) => error.code === 'COMPONENT_PROJECT_STALE');
    await assert.rejects(() => host.openSource({ origin, projectId: project.id, source: { file: 'src/中文 Button.jsx' } }), (error) => error.code === 'COMPONENT_PROJECT_STALE');
    assert.equal(launches.length, launchesBeforeRestart, '旧服务记录失效时应先重新识别项目');
    const restarted = (await host.identifyProject({ origin, hints: ['/src/中文%20Button.jsx'] })).project;
    assert.equal(restarted.pid, server.pid);
    assert.notEqual(restarted.id, project.id);
    await host.openSource({ origin, projectId: restarted.id, source: { file: '/src/中文%20Button.jsx', line: 7, column: 3 } });
    assert.deepEqual(launches.at(-1), ['--reuse-window', '--goto', `${root}/src/中文 Button.jsx:7:3`]);
    // 模拟 TermRelay：进程从仓库根启动，React 前端实际在 apps/web。
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'workspace-fixture', private: true }));
    await fs.writeFile(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');
    const webRoot = path.join(root, 'apps', 'web');
    const adminRoot = path.join(root, 'apps', 'admin');
    for (const directory of [webRoot, adminRoot]) {
      await fs.mkdir(path.join(directory, 'src', 'app'), { recursive: true });
      await fs.writeFile(path.join(directory, 'package.json'), JSON.stringify({ name: path.basename(directory), dependencies: { react: '19' } }));
      await fs.writeFile(path.join(directory, 'src', 'main.tsx'), 'export {};');
    }
    await fs.writeFile(path.join(webRoot, 'src', 'app', 'Workspace.tsx'), 'export const Workspace = () => null;');
    await assert.rejects(() => host.identifyProject({ origin }), /尚未识别/, '只有依赖声明时应等待页面源码证据');
    await assert.rejects(() => host.identifyProject({ origin, hints: ['/src/main.tsx'] }), /多个可能/, '两个子项目同名源码存在时应提示歧义');
    const web = (await host.identifyProject({ origin, hints: ['/src/main.tsx', '/src/app/Workspace.tsx'] })).project;
    assert.equal(web.root, webRoot, '应根据实际组件文件选择前端子项目');
    assert.equal(web.pid, server.pid, '子项目继续绑定实际监听端口的根进程');
    await host.openSource({ origin, projectId: web.id, source: { file: '/src/app/Workspace.tsx', line: 1, column: 1 } });
    assert.deepEqual(launches.at(-1), ['--reuse-window', '--goto', `${webRoot}/src/app/Workspace.tsx:1:1`]);
    await assert.rejects(() => host.openSource({ origin, projectId: web.id, source: { file: '../../src/中文 Button.jsx' } }), /未找到/, '子项目识别后仍应限制源码访问范围');
    await fs.rm(path.join(root, 'pnpm-workspace.yaml'));
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['apps/*'] }));
    assert.equal((await host.identifyProject({ origin, hints: ['/src/app/Workspace.tsx'] })).project.root, webRoot, 'package.json 工作区也应支持');
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'plain-project-collection' }));
    assert.equal((await host.identifyProject({ origin, hints: ['/src/app/Workspace.tsx'] })).project.root, webRoot, '父目录未声明 workspaces 时也应查找子项目');
    await fs.rm(path.join(root, 'package.json'));
    assert.equal((await host.identifyProject({ origin, hints: ['/src/app/Workspace.tsx'] })).project.root, webRoot, '普通项目集合目录可以没有 package.json');
    await assert.rejects(() => host.identifyProject({ origin, hints: ['/src/main.tsx'] }), /多个可能/, '未声明工作区的同名文件也应报告歧义');
    await assert.rejects(() => host.identifyProject({ origin, hints: ['/src/Missing.tsx'] }), /尚未识别/, '源码不匹配时应保留未识别状态');
    for (const directory of ['node_modules/decoy', 'dist/decoy', '.cache/decoy']) {
      const decoy = path.join(root, directory);
      await fs.mkdir(path.join(decoy, 'src', 'app'), { recursive: true });
      await fs.writeFile(path.join(decoy, 'package.json'), JSON.stringify({ dependencies: { react: '19' } }));
      await fs.writeFile(path.join(decoy, 'src', 'app', 'Workspace.tsx'), 'export {};');
      await fs.writeFile(path.join(decoy, 'src', 'Hidden.tsx'), 'export {};');
    }
    await fs.symlink(path.join(root, '.cache', 'decoy'), path.join(root, 'linked-project'));
    assert.equal((await host.identifyProject({ origin, hints: ['/src/app/Workspace.tsx'] })).project.root, webRoot, '应跳过依赖、产物和隐藏目录');
    await assert.rejects(() => host.identifyProject({ origin, hints: ['/src/Hidden.tsx'] }), /尚未识别/, '应跳过目录软链接');
    await fs.mkdir(path.join(root, 'many-folders'));
    await Promise.all(Array.from({ length: 260 }, (_, index) => fs.mkdir(path.join(root, 'many-folders', String(index)))));
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies: { react: '18' } }));
    assert.equal((await host.identifyProject({ origin, hints: ['/src/中文%20Button.jsx'] })).project.root, root, '直接匹配当前项目时应避免搜索无关子目录');
    await fs.rm(path.join(root, 'package.json'));
    await assert.rejects(() => host.identifyProject({ origin, hints: ['/src/app/Workspace.tsx'] }), /目录较多/, '搜索达到上限时应提示从子项目启动');
    console.log('component native tests passed (real port → process → project directory)');
  } finally {
    if (server?.exitCode === null) { const exit = new Promise((resolve) => server.once('exit', resolve)); server.kill(); await exit; }
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
