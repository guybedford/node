const URL = require('url').URL;
const builtins = new Set(
  Object.keys(process.binding('natives')).filter(str =>
    /^(?!(?:internal|node|v8)\/)/.test(str))
)

module.exports = {
  resolve (specifier, base, defaultResolver) {
    if (builtins.has(specifier)) {
      return {
        url: `node:${specifier}`,
        format: 'dynamic'
      };
    }
    return defaultResolver(specifier, base);
  },

  async dynamicInstantiate (url) {
    const builtinInstance = require(url.substr(5));
    const builtinExports = ['default', ...Object.keys(builtinInstance)];
    return {
      exports: builtinExports,
      execute: exports => {
        for (let name of builtinExports)
          exports[name].set(builtinInstance[name]);
        exports.default.set(builtinInstance);
      }
    };
  }
};
