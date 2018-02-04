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

const extensionFormatStd = {
  __proto__: null,
  '.mjs': 'esm',
  '.json': 'json',
  '.node': 'addon',
  '.js': 'commonjs'
};

const extensionFormatEsm = {
  __proto__: null,
  '.mjs': 'esm',
  '.json': 'json',
  '.node': 'addon',
  '.js': 'esm'
};

function resolve(specifier, parentURL) {
  if (NativeModule.nonInternalExists(specifier)) {
    return {
      url: specifier,
      format: 'builtin'
    };
  }

  const mainModeESM = parentURL === undefined &&
                      process.binding('config').mainMode === 'esm';

  let url, esm;
  try {
    // "esm" indicates if the package boundary is "mode": "esm"
    // where this is only checked for ambiguous extensions
    // setting mainModeESM will override this value to true
    ({ url, esm } =
      search(specifier,
             parentURL || getURLFromFilePath(`${process.cwd()}/`).href,
             mainModeESM));
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

  let format;
  if (esm) {
    format = extensionFormatEsm[ext];
    if (!format)
      throw new errors.Error('ERR_UNKNOWN_FILE_EXTENSION', url.pathname);
  } else {
    format = extensionFormatStd[ext] || parentURL === undefined && 'commonjs';
  }

  return { url: `${url}`, format };
}

module.exports = resolve;
// exported for tests
module.exports.search = search;
