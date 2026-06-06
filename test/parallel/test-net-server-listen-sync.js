'use strict';
const common = require('../common');
const assert = require('assert');
const net = require('net');

// listenSync() binds and listens synchronously, returning the resolved
// AddressInfo with the OS-assigned ephemeral port.
{
  const server = net.createServer();
  const addr = server.listenSync({ host: '127.0.0.1', port: 0, backlog: 511 });

  assert.strictEqual(addr.address, '127.0.0.1');
  assert.strictEqual(addr.family, 'IPv4');
  assert.strictEqual(typeof addr.port, 'number');
  assert.ok(addr.port > 0);

  // address() is valid synchronously and matches the returned AddressInfo.
  assert.deepStrictEqual(server.address(), addr);
  assert.strictEqual(server.listening, true);

  // The 'listening' event is still emitted (on the next tick).
  server.on('listening', common.mustCall(() => server.close()));
}

// 'connection' events still flow asynchronously after a synchronous listen.
{
  const server = net.createServer(common.mustCall((socket) => {
    socket.end();
    server.close();
  }));
  const addr = server.listenSync({ host: '127.0.0.1', port: 0 });
  const client = net.connect(addr.port, '127.0.0.1');
  client.on('end', common.mustCall());
  client.resume();
}

// Throws synchronously on EADDRINUSE.
{
  const first = net.createServer();
  const addr = first.listenSync({ host: '127.0.0.1', port: 0 });

  const second = net.createServer();
  assert.throws(() => {
    second.listenSync({ host: '127.0.0.1', port: addr.port });
  }, {
    code: 'EADDRINUSE',
    syscall: 'listen',
  });
  assert.strictEqual(second.listening, false);
  assert.strictEqual(second.address(), null);

  first.close();
}

// Throws synchronously on a non-numeric host (no DNS resolution).
{
  const server = net.createServer();
  assert.throws(() => {
    server.listenSync({ host: 'localhost', port: 0 });
  }, {
    code: 'ERR_INVALID_ARG_VALUE',
    name: 'TypeError',
  });
  assert.strictEqual(server.listening, false);
}

// Throws when already listening.
{
  const server = net.createServer();
  server.listenSync({ host: '127.0.0.1', port: 0 });
  assert.throws(() => {
    server.listenSync({ host: '127.0.0.1', port: 0 });
  }, {
    code: 'ERR_SERVER_ALREADY_LISTEN',
  });
  server.close();
}

// Requires an options object.
{
  const server = net.createServer();
  assert.throws(() => server.listenSync(), {
    code: 'ERR_INVALID_ARG_TYPE',
  });
  assert.throws(() => server.listenSync(0), {
    code: 'ERR_INVALID_ARG_TYPE',
  });
}

// Listening on the unspecified address (no host) works and resolves a port.
{
  const server = net.createServer();
  const addr = server.listenSync({ port: 0 });
  assert.strictEqual(typeof addr.port, 'number');
  assert.ok(addr.port > 0);
  server.close();
}

// IPv6 literal host.
if (common.hasIPv6) {
  const server = net.createServer();
  const addr = server.listenSync({ host: '::1', port: 0 });
  assert.strictEqual(addr.address, '::1');
  assert.strictEqual(addr.family, 'IPv6');
  server.close();
}
