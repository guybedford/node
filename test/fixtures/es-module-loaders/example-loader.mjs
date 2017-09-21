import url from 'url';
import path from 'path';
import process from 'process';

const builtins = new Set(
  Object.keys(process.binding('natives')).filter(str =>
    /^(?!(?:internal|node|v8)\/)/.test(str))
)
const JS_EXTENSIONS = new Set(['.js', '.mjs']);
export function resolve (specifier, parentModuleURL) {
  if (builtins.has(specifier)) {
    return {
      url: specifier,
      format: 'builtin'
    };
  }
  if (/^\.{0,2}[\/]/.test(specifier) !== true && !specifier.startsWith('file:')) {
    // (node_modules resolution goes here)
    throw new Error(`imports must begin with '/', './', or '../'; '${specifier}' does not`);
  }
  const resolved = new url.URL(specifier, parentModuleURL);
  const ext = path.extname(resolved.pathname);
  if (!JS_EXTENSIONS.has(ext)) {
    throw Error(`Cannot load file with non-JavaScript file extension ${ext}.`);
  }
  return {
    url: resolved.href,
    format: 'esm'
  };
}
