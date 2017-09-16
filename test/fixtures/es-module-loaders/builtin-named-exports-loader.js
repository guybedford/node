const URL = require('url').URL;
const builtins = new Set(
  Object.keys(process.binding('natives')).filter(str =>
    /^(?!(?:internal|node|v8)\/)/.test(str))
)

async function builtinNamedExportsLoader (url) {
  const builtinInstance = require(url);
  const builtinExports = ['default', ...Object.keys(builtinInstance)];
  return {
    exports: builtinExports,
    execute: exports => {
      for (let name of builtinExports)
        exports[name] = builtinInstance[name];
      exports.default = builtinInstance;
    }
  };
}

module.exports = {
  resolve (specifier, base, defaultResolver) {
    if (builtins.has(specifier)) {
      return {
        url: specifier,
        loader: builtinNamedExportsLoader
      };
    }
    return defaultResolver(specifier, base);
  }
};
