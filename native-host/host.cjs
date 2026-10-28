#!/usr/bin/env node
'use strict';
const { createHost } = require('./lib.cjs');
const host = createHost(globalThis.__IDT_COMPONENT_PATHS ? { installation: globalThis.__IDT_COMPONENT_PATHS } : {});
let buffered = Buffer.alloc(0);
let queue = Promise.resolve();

function respond(value) {
  const body = Buffer.from(JSON.stringify(value));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  process.stdout.write(Buffer.concat([header, body]));
}

process.stdin.on('data', (chunk) => {
  buffered = Buffer.concat([buffered, chunk]);
  while (buffered.length >= 4) {
    const length = buffered.readUInt32LE(0);
    if (length > 1024 * 1024) { process.stderr.write('Native message too large\n'); process.exit(1); }
    if (buffered.length < length + 4) break;
    const body = buffered.subarray(4, length + 4);
    buffered = buffered.subarray(length + 4);
    queue = queue.then(async () => {
      let message;
      try {
        message = JSON.parse(body.toString('utf8'));
        const result = await host.handle(message);
        respond({ id: message.id, ok: true, ...result });
      } catch (error) { respond({ id: message?.id, ok: false, error: error.message, code: error.code }); }
    });
  }
});
process.stdin.on('end', () => { queue.finally(() => process.exit(0)); });
