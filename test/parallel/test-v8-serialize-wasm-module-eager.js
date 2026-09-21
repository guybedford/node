// Flags: --no-liftoff --no-wasm-lazy-compilation
'use strict';

// With eager optimizing compilation, all functions are compiled with the top
// tier at module creation, so the serialized form contains machine code.

require('../common');
const fixtures = require('../common/fixtures');
const assert = require('assert');
const v8 = require('v8');

const bytes = fixtures.readSync('es-modules/simple.wasm');
const wasmModule = new WebAssembly.Module(bytes);
const serialized = v8.serializeWasmModule(wasmModule);
assert(serialized.length > 4 + bytes.length,
       `expected compiled code in ${serialized.length} bytes`);

const deserialized = v8.deserializeWasmModule(serialized);
const instance = new WebAssembly.Instance(deserialized, {
  './wasm-dep.mjs': { jsFn: () => 40, jsInitFn: () => {} },
});
assert.strictEqual(instance.exports.add(1, 2), 3);
assert.strictEqual(instance.exports.addImported(2), 42);
