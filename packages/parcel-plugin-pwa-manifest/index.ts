import PWAManifestGenerator from '@pwa-manifest/core';
import logger from '@parcel/logger';
import { ParcelAsset, ParcelBundle } from 'parcel-bundler';
import { resolve } from 'path';
import { writeFileSync, readFileSync } from 'fs';
const headSearch = /(?<=<head(.*?)>)|<\/head>/;
const htmlSearch = /(?<=<html(.*?)>)/;
const oldInjectionSearch = /<link rel="(manifest|icon|apple-touch-icon)"(.*?)>|<meta name="(msapplication(.*?)|theme-color)"(.*?)>/g;

export = (bundler: FullBundler): void => {
  let { outDir, publicURL, contentHash, target } = bundler.options;
  // istanbul ignore next
  if (target !== 'browser' || process.env.DISABLE_PWA_MANIFEST) {
    bundler.on('buildEnd', () => logger.warn('Manifest creation disabled'));
    return;
  }
  // istanbul ignore next
  if (!publicURL) publicURL = '/';
  else if (!publicURL.endsWith('/')) publicURL += '/';
  const getPkg = (entryAsset: ParcelAsset): Promise<PackageJSON> =>
    typeof entryAsset.getPackage === 'function'
      ? entryAsset.getPackage()
      : Promise.resolve(entryAsset.package);
  const onBundled = async (bundle: ParcelBundle): Promise<void> => {
    bundler.emit('pwaBuildStart');
    const pkg = await getPkg(
      bundle.entryAsset || bundle.childBundles.values().next().value.entryAsset
    );
    // istanbul ignore next

    const opts = pkg.pwaManifest || pkg['pwa-manifest'];

    // istanbul ignore next
    if (typeof opts !== 'object') {
      if (typeof opts === 'undefined')
        throw 'No PWA Manifest options found in package.json.';
      throw 'The PWA Manifest parameter in package.json must be an object containing the desired parameters.';
    }
    const generator = new PWAManifestGenerator(
      opts,
      {
        baseURL: publicURL,
        resolveDir: pkg.pkgdir
      },
      {
        name: pkg.name,
        desc: pkg.description
      }
    );
    generator.on('*', (ev, ...args) => {
      bundler.emit(`pwa${ev.slice(0, 1).toUpperCase() + ev.slice(1)}`, ...args);
      if (ev.endsWith('Start')) {
        logger.progress(args[0]);
      }
    });
    if (contentHash) generator.hashMethod = 'content';
    const {
      html,
      generatedIcons,
      browserConfig,
      manifest
    } = await generator.generate();
    logger.progress('Writing files...');
    for (const k in generatedIcons) {
      writeFileSync(resolve(outDir, k), generatedIcons[k]);
    }
    writeFileSync(resolve(outDir, 'browserconfig.xml'), browserConfig);
    writeFileSync(
      resolve(outDir, 'manifest.webmanifest'),
      JSON.stringify(manifest)
    );
    // TODO: Allow users to input HTML file paths to inject
    const injectInto = [resolve(outDir, 'index.html')];
    for (const filename of injectInto) {
      let origHTML: string;
      try {
        origHTML = readFileSync(filename).toString();
      } catch (e) {
        // istanbul ignore next
        throw `HTML file ${filename} does not exist.`;
      }
      const ind = origHTML.search(headSearch);
      // istanbul ignore next
      if (ind === -1) {
        const htmlInd = origHTML.search(htmlSearch);
        if (htmlInd === -1) {
          throw 'HTML file for link injection is invalid.';
        }
        origHTML = `${origHTML.slice(0, htmlInd)}<head><title>${
          generator.manifest.name
        }</title>${html}</head>${origHTML.slice(htmlInd)}`;
      } else {
        origHTML = `${origHTML.slice(0, ind)}${html}${origHTML.slice(ind).replace(oldInjectionSearch, '')}`;
      }
      writeFileSync(filename, origHTML);
    }
    logger.success('Manifest creation successful.');
    bundler.emit('pwaBuildEnd');
  };
  bundler.on('bundled', bundle =>
    onBundled(bundle).catch(msg => {
      logger.clear();
      logger.error('Manifest creation failed! ' + msg);
    })
  );
};
