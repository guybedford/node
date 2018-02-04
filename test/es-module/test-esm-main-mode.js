// Flags: --experimental-modules --mode=esm
/* eslint-disable required-modules */
import cjs from '../fixtures/es-modules/esm-cjs-nested/cjs-nested/module';
import { esm } from './esm-dep';
import assert from 'assert';
// asserts success
assert.ok(true);
// assert we loaded esm dependency as ".js" in this mode
assert.strictEqual(esm, 'esm');
// assert we loaded CommonJS dependency
assert.strictEqual(cjs, 'cjs');
