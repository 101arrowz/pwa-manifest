const { writeFileSync } = require('fs');
const { join, basename } = require('path');
module.exports = bundler => {
  const { publicURL, outDir } = bundler.options;
  const getOptions = (entryAsset) => (typeof entryAsset.getPackage === 'function' ? entryAsset.getPackage() : Promise.resolve(entryAsset.package)).then(pkg => pkg['pwa-manifest'] || {});
  const addBundledFiles = (bundle, arr) => {
    arr.push(join(publicURL, basename(bundle.name)));
    for (let childBundle of (bundle.childBundles || [])) addBundledFiles(childBundle, arr);
  }
  bundler.on('bundled', bundle => 
    getOptions(bundle.entryAsset).then(opts => {
      let bundledFiles = [];
      addBundledFiles(bundle, bundledFiles);
      writeFileSync(join(outDir, opts.filename || 'pwa-manifest.js'),  (opts.variableName || 'filesToCache')+'='+JSON.stringify(bundledFiles)+';');
    })
  )
}