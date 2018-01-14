'use strict';

const { URL } = require('url');
const CJSmodule = require('module');
const internalFS = require('internal/fs');
const NativeModule = require('native_module');
const { extname } = require('path');
const { realpathSync } = require('fs');
const preserveSymlinks = !!process.binding('config').preserveSymlinks;
const errors = require('internal/errors');
const { resolve: moduleWrapResolve } = internalBinding('module_wrap');
const StringStartsWith = Function.call.bind(String.prototype.startsWith);
const { getURLFromFilePath, getPathFromURL } = require('internal/url');

module.exports = resolve;
// exported for tests
module.exports.search = search;

const realpathCache = new Map();

function search(target, base, checkPjsonMode) {
  if (base === undefined) {
    // We cannot search without a base.
    throw new errors.Error('ERR_MISSING_MODULE', target);
  }
  try {
    return moduleWrapResolve(target, base, checkPjsonMode);
  } catch (e) {
    e.stack; // cause V8 to generate stack before rethrow
    let error = e;
    try {
      const questionedBase = new URL(base);
      const tmpMod = new CJSmodule(questionedBase.pathname, null);
      tmpMod.paths = CJSmodule._nodeModulePaths(
        new URL('./', questionedBase).pathname);
      const found = CJSmodule._resolveFilename(target, tmpMod);
      error = new errors.Error('ERR_MODULE_RESOLUTION_LEGACY', target,
                               base, found);
    } catch (problemChecking) {
      // ignore
    }
    throw error;
  }
}

const extensionFormatMap = {
  __proto__: null,
  '.mjs': 'esm',
  '.json': 'json',
  '.node': 'addon',
  '.js': 'commonjs'
};

function resolve(specifier, parentURL) {
  if (NativeModule.nonInternalExists(specifier)) {
    return {
      url: specifier,
      format: 'builtin'
    };
  }

  // main
  let mainFormat;
  if (parentURL === undefined) {
    mainFormat = process.binding('config').mainFormat;
  }

  let url, esm;
  try {
    ({ url, esm } =
      search(specifier,
             parentURL || getURLFromFilePath(`${process.cwd()}/`).href,
             mainFormat ? false : true));
  } catch (e) {
    if (typeof e.message === 'string' &&
        StringStartsWith(e.message, 'Cannot find module'))
      e.code = 'MODULE_NOT_FOUND';
    throw e;
  }

  if (!preserveSymlinks) {
    const real = realpathSync(getPathFromURL(url), {
      [internalFS.realpathCacheKey]: realpathCache
    });
    const old = url;
    url = getURLFromFilePath(real);
    url.search = old.search;
    url.hash = old.hash;
  }

  const ext = extname(url.pathname);

  // top-level mains support format flag and commonjs
  // fallback for backwards compat
  if (parentURL === undefined)
    return {
      url: `${url}`,
      format: mainFormat ||
        (esm ? 'esm' : extensionFormatMap[ext] || 'commonjs')
    };

  // all other imports are extension-format-based
  return { url: `${url}`, format: esm ? 'esm' : extensionFormatMap[ext] };
}
