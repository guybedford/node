// Flags: --experimental-modules --loader ./test/fixtures/es-module-loaders/builtin-named-exports-loader.js
/* eslint-disable required-modules */
import { readFile } from 'fs';
import assert from 'assert';
import ok from './test-esm-ok.mjs';

assert(ok);
assert(readFile);
