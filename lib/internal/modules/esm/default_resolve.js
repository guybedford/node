'use strict';

const { URL } = require('url');
const CJSmodule = require('internal/modules/cjs/loader');
const internalFS = require('internal/fs/utils');
const { NativeModule, internalBinding } = require('internal/bootstrap/loaders');
const { extname } = require('path');
const { realpathSync } = require('fs');
const preserveSymlinks = !!process.binding('config').preserveSymlinks;
const preserveSymlinksMain = !!process.binding('config').preserveSymlinksMain;
const {
  ERR_MISSING_MODULE,
  ERR_MODULE_RESOLUTION_LEGACY,
  ERR_UNKNOWN_FILE_EXTENSION
} = require('internal/errors').codes;
const { resolve: moduleWrapResolve } = internalBinding('module_wrap');
const StringStartsWith = Function.call.bind(String.prototype.startsWith);
const { getURLFromFilePath, getPathFromURL } = require('internal/url');

const realpathCache = new Map();

function search(target, base, legacyMode) {
  if (base === undefined) {
    // We cannot search without a base.
    throw new ERR_MISSING_MODULE(target);
  }
  try {
    return moduleWrapResolve(target, base, legacyMode);
  } catch (e) {
    e.stack; // cause V8 to generate stack before rethrow
    let error = e;
    try {
      const questionedBase = new URL(base);
      const tmpMod = new CJSmodule(questionedBase.pathname, null);
      tmpMod.paths = CJSmodule._nodeModulePaths(
        new URL('./', questionedBase).pathname);
      const found = CJSmodule._resolveFilename(target, tmpMod);
      error = new ERR_MODULE_RESOLUTION_LEGACY(target, base, found);
    } catch (problemChecking) {
      // ignore
    }
    throw error;
  }
}

function resolve(specifier, parentURL) {
  if (NativeModule.nonInternalExists(specifier)) {
    return {
      url: specifier,
      format: 'builtin'
    };
  }

  const isMain = parentURL === undefined;
  const legacyMode = isMain && !process.binding('config').module;

  let url, legacy;
  try {
    // "legacy_main" indicates the file should be loaded as CommonJS
    ({ url, legacy } =
      search(specifier,
             parentURL || getURLFromFilePath(`${process.cwd()}/`).href,
             legacyMode));
    if (legacyMode)
      legacy = legacyMode;
  } catch (e) {
    if (typeof e.message === 'string' &&
        StringStartsWith(e.message, 'Cannot find module'))
      e.code = 'MODULE_NOT_FOUND';
    throw e;
  }

  if (isMain ? !preserveSymlinksMain : !preserveSymlinks) {
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
  switch (ext) {
    case '.js': format = legacy ? 'cjs' : 'esm'; break;
    case '.mjs': format = 'esm'; break;
    case '.json': format = 'json'; break;
    case '.node': format = 'addon'; break;
    default:
      if (legacy && isMain)
        format = 'cjs';
      else
        throw new ERR_UNKNOWN_FILE_EXTENSION(url.pathname);
  }

  return { url: `${url}`, format };
}

module.exports = resolve;
// exported for tests
module.exports.search = search;
