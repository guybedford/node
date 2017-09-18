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
  constructor({ resolve = ModuleRequest.resolve, dynamicInstantiate } = {},
              base = getBase()) {
    this.moduleMap = new ModuleMap();
    if (typeof base !== 'undefined' && base instanceof URL !== true) {
      throw new errors.TypeError('ERR_INVALID_ARG_TYPE', 'base', 'URL');
    }
    this.base = base;
    this.resolver = resolve.bind(null);
    this.dynamicInstantiate = dynamicInstantiate;
  }

  async resolve(specifier, parentURLOrString = this.base) {
    if (typeof parentURLOrString === 'string') {
      parentURLOrString = new URL(parentURLOrString);
    } else if (parentURLOrString instanceof URL === false) {
      throw new errors.TypeError('ERR_INVALID_ARG_TYPE',
                                 'parentURLOrString', 'URL');
    }
    const { url, format } = await this.resolver(specifier,
                                                parentURLOrString.href,
                                                ModuleRequest.resolve);

    if (typeof format !== 'string') {
      throw new errors.TypeError('ERR_INVALID_ARG_TYPE', 'format',
                                 ['esm', 'cjs', 'binary', 'builtin']);
    }
    if (!ModuleRequest.loaders.has(format) &&
        !(format === 'dynamic' && this.dynamicInstantiate)) {
      throw new errors.Error('ERR_UNKNOWN_MODULE_FORMAT', format);
    }

    let urlObj;
    if (format === 'builtin') {
      urlObj = new URL(`node:${url}`);
    } else {
      urlObj = new URL(url);
      if (urlObj.protocol !== 'file:' && urlObj.protocol !== 'node:') {
        throw new errors.Error('ERR_INVALID_PROTOCOL',
                               urlObj.protocol, 'file:');
      }
    }

    return { url: urlObj, format: format };
  }

  async getModuleJob(specifier, parentURLOrString = this.base) {
    const { url, format } = await this.resolve(specifier, parentURLOrString);
    const urlString = `${url}`;
    let job = this.moduleMap.get(urlString);
    if (job === undefined) {
      let loaderInstance;
      if (format === 'dynamic') {
        loaderInstance = async (url) => {
          const { exports, execute } = await this.dynamicInstantiate(urlString);
          const ctx = createDynamicModule(exports, url, (reflect) => {
            debug(`Loading custom loader ${url.pathname}`);
            execute(reflect.exports);
          });
          return ctx.module;
        };
      } else {
        loaderInstance = ModuleRequest.loaders.get(format);
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
