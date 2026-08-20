const assert = require('assert');

async function loadMessagesWithRuntime(sendMessage) {
  globalThis.InternalDevToolkit = {};
  globalThis.chrome = {
    runtime: {
      lastError: null,
      sendMessage,
      onMessage: { addListener() {} },
    },
    tabs: {},
  };
  delete require.cache[require.resolve('../src/content/messages.js')];
  require('../src/content/messages.js');
  return globalThis.InternalDevToolkit.messages;
}

(async () => {
  const failedMessages = await loadMessagesWithRuntime((_message, callback) => {
    globalThis.chrome.runtime.lastError = {
      message: 'The message port closed before a response was received.',
    };
    callback(undefined);
  });

  await assert.rejects(
    failedMessages.sendToBackground({ type: 'FETCH_CLASS_TEACHERS' }),
    (error) => error.message.includes('FETCH_CLASS_TEACHERS') && error.message.includes('重新加载'),
  );

  const successfulMessages = await loadMessagesWithRuntime((_message, callback) => {
    globalThis.chrome.runtime.lastError = null;
    callback({ ok: true, value: 1 });
  });
  assert.deepStrictEqual(
    await successfulMessages.sendToBackground({ type: 'PING' }),
    { ok: true, value: 1 },
  );

  console.log('message transport tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
