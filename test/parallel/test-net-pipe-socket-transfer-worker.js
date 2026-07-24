'use strict';

// This test verifies that a pipe-backed net.Socket connection (a Unix domain
// socket) can be transferred to a worker thread via worker_threads
// postMessage()'s transferList. Pipe transfer is not supported on Windows,
// consistent with sending pipe handles over the child_process IPC channel.

const common = require('../common');

if (common.isWindows)
  common.skip('pipe socket transfer is not supported on Windows');
const assert = require('assert');
const net = require('net');
const {
  Worker,
  parentPort,
  workerData,
} = require('worker_threads');

if (workerData?.role === 'pipe') {
  // Worker side: receive the transferred connection and echo everything back.
  parentPort.on('message', common.mustCall(({ socket }) => {
    assert.ok(socket instanceof net.Socket);
    socket.setEncoding('utf8');
    socket.on('data', common.mustCall((chunk) => {
      socket.end(`echo:${chunk}`);
    }));
  }));
  return;
}

const tmpdir = require('../common/tmpdir');
tmpdir.refresh();

const worker = new Worker(__filename, { workerData: { role: 'pipe' } });

const server = net.createServer(common.mustCall((socket) => {
  // Hand the freshly accepted pipe connection off to the worker. It must not
  // be read from in this thread before transferring.
  worker.postMessage({ socket }, [socket]);

  // The source socket is now owned by the worker: it is detached and destroyed
  // on this side, so further use fails cleanly instead of dropping data.
  assert.strictEqual(socket._handle, null);
  assert.strictEqual(socket.destroyed, true);

  server.close();
}));

server.listen(common.PIPE, common.mustCall(() => {
  const client = net.connect(common.PIPE, common.mustCall(() => {
    client.write('hello');
  }));
  client.setEncoding('utf8');
  let response = '';
  client.on('data', (chunk) => { response += chunk; });
  client.on('end', common.mustCall(() => {
    assert.strictEqual(response, 'echo:hello');
    worker.terminate();
  }));
}));
