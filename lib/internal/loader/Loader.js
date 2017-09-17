'use strict';

const { URL } = require('url');
const { getURLFromFilePath } = require('internal/url');

const {
  getNamespaceOfModuleWrap,
  createDynamicModule
} = require('internal/loader/ModuleWrap');

const ModuleMap = require('internal/loader/ModuleMap');
const ModuleJob = require('internal/loader/ModuleJob');
const ModuleRequest = require('internal/loader/ModuleRequest');
const errors = require('internal/errors');
const debug = require('util').debuglog('esm');

function getBase() {
  try {
    return getURLFromFilePath(`${process.cwd()}/`);
  } catch (e) {
    e.stack;
    // If the current working directory no longer exists.
    if (e.code === 'ENOENT') {
      return undefined;
    }
    throw e;
  }
}

class Loader {
  constructor(resolver = ModuleRequest.resolve, base = getBase()) {
    this.moduleMap = new ModuleMap();
    if (typeof base !== 'undefined' && base instanceof URL !== true) {
      throw new errors.TypeError('ERR_INVALID_ARG_TYPE', 'base', 'URL');
    }
    this.base = base;
    this.resolver = resolver.bind(null);
  }

  async resolve(specifier, parentURLOrString = this.base) {
    if (typeof parentURLOrString === 'string') {
      parentURLOrString = new URL(parentURLOrString);
    } else if (parentURLOrString instanceof URL === false) {
      throw new errors.TypeError('ERR_INVALID_ARG_TYPE',
                                 'parentURLOrString', 'URL');
    }
    const resolved = await this.resolver(specifier, parentURLOrString,
                                         ModuleRequest.resolve);
    let url = resolved.url;
    if (typeof loader !== 'string') {
      if (typeof loader !== 'function') {
        throw new errors.TypeError('ERR_INVALID_ARG_TYPE', 'loader', 'Loader');
      }
      return { url, loader: resolved.loader };
    }
    if (!ModuleRequest.loaders.has(resolved.loader)) {
      throw new errors.Error('ERR_UNKNOWN_LOADER', resolved.loader);
    }
    if (resolved.loader === 'builtin') {
      url = new URL(`node:${url}`);
    } else {
      if (typeof url === 'string') {
        url = new URL(url);
      } else if (!(url instanceof URL)) {
        throw new errors.TypeError('ERR_INVALID_ARG_TYPE', 'url', 'URL');
      }
      if (url.protocol !== 'file:') {
        throw new errors.Error('ERR_INVALID_PROTOCOL',
                               url.protocol, 'file:');
      }
    }
    return { url, loader: resolved.loader };
  }

  async getModuleJob(specifier, parentURLOrString = this.base) {
    const { url, loader } = await this.resolve(specifier, parentURLOrString);
    const urlString = `${url}`;
    let job = this.moduleMap.get(urlString);
    if (job === undefined) {
      let loaderInstance;
      if (typeof loader === 'string') {
        loaderInstance = ModuleRequest.loaders.get(loader);
      } else {
        loaderInstance = async function(url) {
          const { exports, execute } = await loader(url);
          const ctx = createDynamicModule(exports, url, (reflect) => {
            debug(`Loading custom loader ${url.pathname}`);
            execute(reflect.exports);
          });
          return ctx.module;
        };
      }
      job = new ModuleJob(this, url, loaderInstance);
      this.moduleMap.set(urlString, job);
    }
    return job;
  }

  async import(specifier, parentURLOrString = this.base) {
    const job = await this.getModuleJob(specifier, parentURLOrString);
    const module = await job.run();
    return getNamespaceOfModuleWrap(module);
  }
}
Object.setPrototypeOf(Loader.prototype, null);
module.exports = Loader;
