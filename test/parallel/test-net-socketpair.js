'use strict';
const common = require('../common');
const assert = require('assert');
const net = require('net');

// net.socketpair() is Unix-only: the Windows uv_socketpair() emulation is
// backed by connected loopback AF_INET sockets, which leaks observable TCP
// behavior.
if (common.isWindows) {
  assert.throws(() => net.socketpair(), {
    code: 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM',
  });
  return;
}

// net.socketpair() returns two pre-connected, symmetric net.Socket instances
// that are open, readable and writable synchronously on return: no listener,
// no path, no 'connect' event.
{
  const pair = net.socketpair();
  assert.ok(Array.isArray(pair));
  assert.strictEqual(pair.length, 2);
  const [a, b] = pair;
  assert.ok(a instanceof net.Socket);
  assert.ok(b instanceof net.Socket);
  // The pair are AF_UNIX sockets adopted as pipe handles.
  assert.strictEqual(a._handle.constructor.name, 'Pipe');
  assert.strictEqual(b._handle.constructor.name, 'Pipe');
  assert.strictEqual(a.readyState, 'open');
  assert.strictEqual(b.readyState, 'open');
  assert.strictEqual(a.connecting, false);
  assert.strictEqual(b.connecting, false);

  b.on('data', common.mustCall((chunk) => {
    assert.strictEqual(chunk.toString(), 'ping');
    a.destroy();
    b.destroy();
  }));
  a.write('ping');
}

// The pair is symmetric: either end can write to the other.
{
  const [a, b] = net.socketpair();
  let fromA = '';
  let fromB = '';
  a.setEncoding('utf8');
  b.setEncoding('utf8');
  a.on('data', (c) => { fromB += c; });
  b.on('data', (c) => { fromA += c; });

  a.write('a->b');
  b.write('b->a');

  a.end();
  b.end();

  a.on('close', common.mustCall(() => {
    assert.strictEqual(fromA, 'a->b');
  }));
  b.on('close', common.mustCall(() => {
    assert.strictEqual(fromB, 'b->a');
  }));
}

// Both sockets start paused: data written before a receiver attaches is not
// dropped, and no 'end' or 'close' is emitted before the stream is resumed.
{
  const [a, b] = net.socketpair();
  a.write('early');
  a.end();
  setTimeout(common.mustCall(() => {
    b.setEncoding('utf8');
    let received = '';
    b.on('data', (c) => { received += c; });
    b.on('end', common.mustCall(() => {
      assert.strictEqual(received, 'early');
      b.destroy();
      a.destroy();
    }));
  }), common.platformTimeout(100));
}

// allowHalfOpen keeps the writable side open after the peer ends.
{
  const [a, b] = net.socketpair({ allowHalfOpen: true });
  b.resume();
  a.on('end', common.mustCall(() => {
    assert.strictEqual(a.writable, true);
    a.end();
  }));
  a.on('close', common.mustCall(() => b.destroy()));
  b.end();
  a.resume();
}

// Non-object options are rejected.
{
  assert.throws(() => net.socketpair(null), {
    code: 'ERR_INVALID_ARG_TYPE',
  });
  assert.throws(() => net.socketpair('stream'), {
    code: 'ERR_INVALID_ARG_TYPE',
  });
  assert.throws(() => net.socketpair({ allowHalfOpen: 'yes' }), {
    code: 'ERR_INVALID_ARG_TYPE',
  });
}
