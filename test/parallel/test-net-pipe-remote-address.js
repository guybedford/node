'use strict';

const common = require('../common');
const assert = require('assert');
const net = require('net');
const tmpdir = require('../common/tmpdir');

tmpdir.refresh();

function checkPipePeer(socket, expected) {
  assert.strictEqual(socket.remoteAddress, expected);
  assert.strictEqual(socket.remoteFamily, undefined);
  assert.strictEqual(socket.remotePort, undefined);
}

// An unbound client has no name, and the connecting side is not given the
// name of the listener it connected to.
{
  const path = `${common.PIPE}-unbound`;
  const server = net.createServer(common.mustCall((socket) => {
    checkPipePeer(socket, undefined);
    socket.end();
  }));
  server.listen(path, common.mustCall(() => {
    const client = net.connect({ path });
    checkPipePeer(client, undefined);
    client.on('connect', common.mustCall(() => {
      checkPipePeer(client, undefined);
      client.resume();
    }));
    client.on('close', common.mustCall(() => {
      checkPipePeer(client, undefined);
      server.close();
    }));
  }));
}

function testBound(serverPath, clientPath) {
  const server = net.createServer(common.mustCall((socket) => {
    checkPipePeer(socket, clientPath);
    socket.resume();
    // The cached value survives the peer closing and the socket's destruction.
    socket.on('close', common.mustCall(() => {
      assert.strictEqual(socket.destroyed, true);
      checkPipePeer(socket, clientPath);
      server.close();
    }));
  }));
  server.listen(serverPath, common.mustCall(() => {
    const client = new net.Socket({
      handle: new net.BoundSocket({ path: clientPath }),
    });
    client.connect({ path: serverPath });
    client.on('connect', common.mustCall(() => {
      checkPipePeer(client, undefined);
      client.end();
    }));
  }));
}

// Binding a client to a path is specific to Unix domain sockets.
if (!common.isWindows) {
  testBound(`${common.PIPE}-server`, `${common.PIPE}-client`);
}

if (common.isLinux) {
  testBound(`\0node-test-peer-server-${process.pid}`,
            `\0node-test-peer-client-${process.pid}`);
}

// A BlockList only applies to IP peers and must not reject pipe connections.
{
  const path = `${common.PIPE}-blocklist`;
  const blockList = new net.BlockList();
  blockList.addCIDR('0.0.0.0/0');
  blockList.addCIDR('::/0');
  const server = net.createServer({ blockList }, common.mustCall((socket) => {
    socket.end();
    server.close();
  }));
  server.listen(path, common.mustCall(() => {
    net.connect({ path }).resume();
  }));
}

// Dropped pipe connections keep reporting no 'drop' data.
{
  const path = `${common.PIPE}-drop`;
  const server = net.createServer(common.mustNotCall());
  server.maxConnections = 0;
  server.on('drop', common.mustCall((data) => {
    assert.strictEqual(data, undefined);
    server.close();
  }));
  server.listen(path, common.mustCall(() => {
    net.connect({ path }).on('error', () => {}).resume();
  }));
}
