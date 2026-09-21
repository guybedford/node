'use strict';

require('../common');
const fixtures = require('../common/fixtures');
const assert = require('assert');
const v8 = require('v8');

const simpleBytes = fixtures.readSync('es-modules/simple.wasm');
const simpleImports = {
  './wasm-dep.mjs': { jsFn: () => 40, jsInitFn: () => {} },
};

// Round-trips a module and its exports through the serialized form.
{
  const wasmModule = new WebAssembly.Module(simpleBytes);
  const serialized = v8.serializeWasmModule(wasmModule);
  assert(Buffer.isBuffer(serialized));
  // Header + wire bytes are always present.
  assert(serialized.length >= 4 + simpleBytes.length);
  assert.strictEqual(serialized.readUInt32LE(0), simpleBytes.length);
  assert.deepStrictEqual(serialized.subarray(4, 4 + simpleBytes.length),
                         simpleBytes);

  const deserialized = v8.deserializeWasmModule(serialized);
  assert(deserialized instanceof WebAssembly.Module);
  assert.deepStrictEqual(WebAssembly.Module.exports(deserialized),
                         WebAssembly.Module.exports(wasmModule));
  assert.deepStrictEqual(WebAssembly.Module.imports(deserialized),
                         WebAssembly.Module.imports(wasmModule));
  const { exports } = new WebAssembly.Instance(deserialized, simpleImports);
  assert.strictEqual(exports.add(1, 2), 3);
  assert.strictEqual(exports.addImported(2), 42);
}

// Accepts any ArrayBufferView over the serialized data.
{
  const serialized = v8.serializeWasmModule(new WebAssembly.Module(simpleBytes));
  const copy = new Uint8Array(serialized.length + 8);
  copy.set(serialized, 8);
  const view = new DataView(copy.buffer, 8, serialized.length);
  const { exports } = new WebAssembly.Instance(
    v8.deserializeWasmModule(view), simpleImports);
  assert.strictEqual(exports.add(20, 22), 42);
}

// Compiled code that does not match this process is rejected and the module
// is recompiled from the wire bytes.
{
  const serialized = v8.serializeWasmModule(new WebAssembly.Module(simpleBytes));
  const corrupted = Buffer.concat([serialized, Buffer.alloc(64, 0xff)]);
  corrupted.fill(0xff, 4 + simpleBytes.length);
  const { exports } = new WebAssembly.Instance(
    v8.deserializeWasmModule(corrupted), simpleImports);
  assert.strictEqual(exports.add(1, 1), 2);
}

// Compile options must match those used for the original compilation.
{
  const bytes = fixtures.readSync('es-modules/js-string-builtins.wasm');
  const options = {
    builtins: ['js-string'],
    importedStringConstants: 'wasm:js/string-constants',
  };
  const wasmModule = new WebAssembly.Module(bytes, options);
  const serialized = v8.serializeWasmModule(wasmModule);

  const deserialized = v8.deserializeWasmModule(serialized, options);
  assert.deepStrictEqual(WebAssembly.Module.imports(deserialized), []);
  const { exports } = new WebAssembly.Instance(deserialized, {});
  assert.strictEqual(exports.getLength('hello'), 5);
  assert.strictEqual(exports.getHello(), 'hello');

  // Without the options the builtins are ordinary imports again.
  const plain = v8.deserializeWasmModule(serialized);
  assert.strictEqual(WebAssembly.Module.imports(plain).length, 4);
}

// Invalid input.
{
  for (const invalid of [undefined, null, 42, {}, new Uint8Array(4)]) {
    assert.throws(() => v8.serializeWasmModule(invalid),
                  { code: 'ERR_INVALID_ARG_TYPE' });
  }
  for (const invalid of [undefined, null, 42, {}, 'str']) {
    assert.throws(() => v8.deserializeWasmModule(invalid),
                  { code: 'ERR_INVALID_ARG_TYPE' });
  }
  assert.throws(() => v8.deserializeWasmModule(Buffer.alloc(2)),
                { code: 'ERR_INVALID_ARG_VALUE' });
  const tooLong = Buffer.alloc(8);
  tooLong.writeUInt32LE(100, 0);
  assert.throws(() => v8.deserializeWasmModule(tooLong),
                { code: 'ERR_INVALID_ARG_VALUE' });
  assert.throws(() => v8.deserializeWasmModule(Buffer.alloc(4), null),
                { code: 'ERR_INVALID_ARG_TYPE' });
  assert.throws(() => v8.deserializeWasmModule(Buffer.alloc(4),
                                               { builtins: 'js-string' }),
                { code: 'ERR_INVALID_ARG_TYPE' });
  assert.throws(() => v8.deserializeWasmModule(Buffer.alloc(4),
                                               { importedStringConstants: 1 }),
                { code: 'ERR_INVALID_ARG_TYPE' });
  // Well-formed envelope around invalid wire bytes is a CompileError.
  const badWire = Buffer.alloc(8);
  badWire.writeUInt32LE(4, 0);
  assert.throws(() => v8.deserializeWasmModule(badWire),
                WebAssembly.CompileError);
}
