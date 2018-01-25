// Flags: --experimental-modules --loader ./test/fixtures/es-module-loaders/loader-shared-dep.mjs --format commonjs
/* eslint-disable required-modules */
'use strict';
const assert = require('assert');
assert(true);
