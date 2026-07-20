'use strict';
const common = require('../common');
const dnstools = require('../common/dns');
const dns = require('dns');
const assert = require('assert');
const dgram = require('dgram');
const dnsPromises = dns.promises;

// A NOERROR response whose answer section carries only a CNAME chain (no
// records of the queried type) must resolve to an empty result, not ENODATA.
// Refs: https://github.com/nodejs/node/pull/64355

const server = dgram.createSocket('udp4');

server.on('message', common.mustCallAtLeast((msg, { address, port }) => {
  const parsed = dnstools.parseDNSPacket(msg);
  const domain = parsed.questions[0].domain;
  assert.strictEqual(domain, 'example.org');

  server.send(dnstools.writeDNSPacket({
    id: parsed.id,
    questions: parsed.questions,
    answers: [
      { type: 'CNAME', value: 'example.com', ttl: 123, domain },
    ],
  }), port, address);
}, 1));

server.bind(0, common.mustCall(async () => {
  const address = server.address();
  dns.setServers([`127.0.0.1:${address.port}`]);

  assert.deepStrictEqual(await dnsPromises.resolve4('example.org'), []);
  assert.deepStrictEqual(await dnsPromises.resolve6('example.org'), []);
  assert.deepStrictEqual(await dnsPromises.resolveTxt('example.org'), []);
  assert.deepStrictEqual(await dnsPromises.resolveMx('example.org'), []);
  assert.deepStrictEqual(await dnsPromises.resolveSrv('example.org'), []);
  assert.deepStrictEqual(await dnsPromises.resolveCaa('example.org'), []);

  // NS and PTR lookups report ENODATA when no matching records exist.
  await assert.rejects(dnsPromises.resolveNs('example.org'),
                       { code: 'ENODATA' });
  await assert.rejects(dnsPromises.resolvePtr('example.org'),
                       { code: 'ENODATA' });

  dns.resolveTxt('example.org', common.mustSucceed((records) => {
    assert.deepStrictEqual(records, []);
    server.close();
  }));
}));
