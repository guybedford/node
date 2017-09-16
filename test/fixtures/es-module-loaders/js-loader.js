const URL = require('url').URL;
const builtins = new Set(
  Object.keys(process.binding('natives')).filter(str =>
    /^(?!(?:internal|node|v8)\/)/.test(str))
)
module.exports = {
  resolve (specifier, base) {
    if (builtins.has(specifier)) {
      return {
        url: specifier,
        loader: 'builtin'
      };
    }
    // load all dependencies as esm, regardless of file extension
    const url = new URL(specifier, base);
    return {
      url,
      loader: 'esm'
    };
  }
};
