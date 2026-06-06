'use strict';
const common = require('../common');
const assert = require('assert');
const dgram = require('dgram');

// bindSync() binds synchronously and returns the resolved AddressInfo with the
// OS-assigned ephemeral port.
{
  const sock = dgram.createSocket('udp4');
  const addr = sock.bindSync({ address: '0.0.0.0', port: 0 });

  assert.strictEqual(addr.address, '0.0.0.0');
  assert.strictEqual(addr.family, 'IPv4');
  assert.strictEqual(typeof addr.port, 'number');
  assert.ok(addr.port > 0);

  // address() is valid synchronously and matches the returned AddressInfo.
  assert.deepStrictEqual(sock.address(), addr);

  // The 'listening' event is still emitted (on the next tick).
  sock.on('listening', common.mustCall(() => sock.close()));
}

// 'message' events still flow asynchronously after a synchronous bind.
{
  const receiver = dgram.createSocket('udp4');
  const addr = receiver.bindSync({ address: '127.0.0.1', port: 0 });

  receiver.on('message', common.mustCall((msg) => {
    assert.strictEqual(msg.toString(), 'hello');
    receiver.close();
  }));

  const sender = dgram.createSocket('udp4');
  sender.send('hello', addr.port, '127.0.0.1', common.mustCall(() => {
    sender.close();
  }));
}

// Throws synchronously on EADDRINUSE.
{
  const first = dgram.createSocket('udp4');
  const addr = first.bindSync({ address: '127.0.0.1', port: 0 });

  const second = dgram.createSocket('udp4');
  assert.throws(() => {
    second.bindSync({ address: '127.0.0.1', port: addr.port });
  }, {
    code: 'EADDRINUSE',
    syscall: 'bind',
  });

  first.close();
  second.close();
}

// Throws synchronously on a non-numeric address (no DNS resolution).
{
  const sock = dgram.createSocket('udp4');
  assert.throws(() => {
    sock.bindSync({ address: 'localhost', port: 0 });
  }, {
    code: 'ERR_INVALID_ARG_VALUE',
    name: 'TypeError',
  });
  sock.close();
}

// Throws when already bound.
{
  const sock = dgram.createSocket('udp4');
  sock.bindSync({ port: 0 });
  assert.throws(() => {
    sock.bindSync({ port: 0 });
  }, {
    code: 'ERR_SOCKET_ALREADY_BOUND',
  });
  sock.close();
}

// Defaults the address to the wildcard when omitted.
{
  const sock = dgram.createSocket('udp4');
  const addr = sock.bindSync({ port: 0 });
  assert.strictEqual(addr.address, '0.0.0.0');
  sock.close();
}

// Symmetric positional form: bindSync(port, address).
{
  const sock = dgram.createSocket('udp4');
  const addr = sock.bindSync(0, '127.0.0.1');
  assert.strictEqual(addr.address, '127.0.0.1');
  assert.ok(addr.port > 0);
  sock.close();
}

// udp6 wildcard default.
if (common.hasIPv6) {
  const sock = dgram.createSocket('udp6');
  const addr = sock.bindSync({ port: 0 });
  assert.strictEqual(addr.family, 'IPv6');
  sock.close();
}
