#!/usr/bin/env node
/* 简单的 HTTP 服务器，用于测试 Mock 功能 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 模拟 API 响应
  if (req.url === '/api/user/list') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      code: 200,
      message: 'success',
      data: [
        { id: 1, name: '张三', email: 'zhangsan@example.com', phone: '13800138000' },
        { id: 2, name: '李四', email: 'lisi@example.com', phone: '13900139000' },
        { id: 3, name: '王五', email: 'wangwu@example.com', phone: '13700137000' },
      ],
      timestamp: Date.now()
    }));
    return;
  }

  if (req.url === '/api/user/detail') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 200,
        message: 'success',
        data: {
          id: 123,
          name: '张伟',
          email: 'zhangwei@example.com',
          phone: '13812345678',
          avatar: 'https://i.pravatar.cc/150?u=123',
          address: '北京市朝阳区建国路100号',
          createdAt: Date.now() - 86400000,
        },
        timestamp: Date.now()
      }));
    });
    return;
  }

  if (req.url === '/api/login') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 200,
        message: 'login success',
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          username: 'test',
          userId: 10001,
        },
        timestamp: Date.now()
      }));
    });
    return;
  }

  // 服务静态文件
  if (req.url === '/' || req.url === '/index.html') {
    const html = fs.readFileSync(path.join(__dirname, 'test-mock.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n🚀 测试服务器启动成功！`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`\n可用接口：`);
  console.log(`  GET  /api/user/list      - 获取用户列表`);
  console.log(`  POST /api/user/detail    - 获取用户详情`);
  console.log(`  POST /api/login          - 登录接口`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});
