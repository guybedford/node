'use strict';

// This test verifies the guards that reject transferring a net.Socket or
// net.Server that is not in a clean, movable state. Serialization is triggered
// with a MessageChannel, so no worker thread is required.

const common = require('../common');

const assert = require('assert');
const net = require('net');
const { MessageChannel } = require('worker_threads');

const { port1 } = new MessageChannel();

// A Server that is not listening (no handle) cannot be transferred.
{
  const server = net.createServer();
  assert.throws(() => port1.postMessage({ server }, [server]), {
    code: 'ERR_WORKER_HANDLE_NOT_TRANSFERABLE',
  });
}

// A pipe-backed Socket cannot be transferred on Windows, consistent with
// sending pipe handles over the child_process IPC channel.
if (common.isWindows) {
  // Use a dedicated port: the buffered-data case below closes port1 from an
  // asynchronous callback.
  const { port1: pipePort } = new MessageChannel();
  const server = net.createServer(common.mustCall((socket) => {
    socket.destroy();
    server.close();
  }));
  server.listen(common.PIPE, common.mustCall(() => {
    const client = net.connect(common.PIPE, common.mustCall(() => {
      assert.throws(() => pipePort.postMessage({ client }, [client]), {
        code: 'ERR_WORKER_HANDLE_NOT_TRANSFERABLE',
      });
      client.destroy();
      pipePort.close();
    }));
    client.on('error', () => {});
  }));
}

// A Socket that has already consumed data cannot be transferred, because that
// buffered data would be lost on the sending side.
{
  const server = net.createServer(common.mustCall((socket) => {
    socket.on('data', common.mustCall(() => {
      assert.throws(() => port1.postMessage({ socket }, [socket]), {
        code: 'ERR_WORKER_HANDLE_NOT_TRANSFERABLE',
      });
      // The socket is still usable after a rejected transfer.
      assert.ok(socket._handle != null);
      socket.destroy();
      server.close();
      port1.close();
    }));
  }));

  server.listen(0, common.mustCall(() => {
    const client = net.connect(server.address().port, common.mustCall(() => {
      client.end('data');
    }));
    // The server destroys the socket after the rejected transfer, which may
    // surface as a reset on the client; swallow it either way.
    client.on('error', () => {});
  }));
}
