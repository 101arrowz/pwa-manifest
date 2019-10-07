const { writeFileSync } = require('fs');
const { join, relative, sep } = require('path');
module.exports = bundler => {
  const { publicURL, outDir } = bundler.options;
  if (!publicURL.endsWith('/'))
    publicURL += '/';
  const getOptions = (entryAsset) => (typeof entryAsset.getPackage === 'function' ? entryAsset.getPackage() : Promise.resolve(entryAsset.package)).then(pkg => pkg['pwaManifest'] || pkg['pwa-manifest'] || {});
  const addBundledFiles = (bundle, arr) => {
    arr.push(publicURL+relative(outDir, bundle.name).split(sep).join('/'));
    for (let childBundle of (bundle.childBundles || [])) addBundledFiles(childBundle, arr);
  }
  bundler.on('bundled', bundle => 
    getOptions(bundle.entryAsset).then(opts => {
      let bundledFiles = [];
      addBundledFiles(bundle, bundledFiles);
      writeFileSync(join(outDir, opts.filename || 'pwa-manifest.js'+(opts.asJSON ? 'on' : '')), opts.asJSON ? JSON.stringify(bundledFiles) : (opts.variableName || 'filesToCache')+'='+JSON.stringify(bundledFiles)+';');
    })
  )
}