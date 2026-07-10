'use strict';

// This test verifies that one end of a net.socketpair() can be transferred to
// a worker thread via worker_threads postMessage()'s transferList, and that
// the two threads can then communicate over the pair.

const common = require('../common');

if (common.isWindows)
  common.skip('net.socketpair() is not supported on Windows');

const assert = require('assert');
const net = require('net');
const {
  MessageChannel,
  Worker,
  parentPort,
  workerData,
} = require('worker_threads');

if (workerData?.role === 'socketpair') {
  // Worker side: receive the transferred end and echo everything back.
  parentPort.on('message', common.mustCall(({ socket }) => {
    assert.ok(socket instanceof net.Socket);
    socket.setEncoding('utf8');
    socket.on('data', common.mustCall((chunk) => {
      socket.end(`echo:${chunk}`);
    }));
  }));
  return;
}

// A pristine socketpair end transfers to a worker and echoes back.
{
  const worker = new Worker(__filename, {
    workerData: { role: 'socketpair' },
  });

  const [a, b] = net.socketpair();
  worker.postMessage({ socket: b }, [b]);

  // The source socket is now owned by the worker: it is detached and destroyed
  // on this side, so further use fails cleanly instead of dropping data.
  assert.strictEqual(b._handle, null);
  assert.strictEqual(b.destroyed, true);

  a.setEncoding('utf8');
  let response = '';
  a.on('data', (chunk) => { response += chunk; });
  a.on('end', common.mustCall(() => {
    assert.strictEqual(response, 'echo:hello');
    a.destroy();
    worker.terminate();
  }));
  a.write('hello');
}

// A socketpair end that has already been written to cannot be transferred,
// and remains usable after the rejected transfer.
{
  const { port1 } = new MessageChannel();
  const [a, b] = net.socketpair();
  a.write('dirty');
  assert.throws(() => port1.postMessage({ socket: a }, [a]), {
    code: 'ERR_WORKER_HANDLE_NOT_TRANSFERABLE',
  });
  assert.ok(a._handle != null);
  b.setEncoding('utf8');
  b.on('data', common.mustCall((chunk) => {
    assert.strictEqual(chunk, 'dirty');
    a.destroy();
    b.destroy();
    port1.close();
  }));
}
