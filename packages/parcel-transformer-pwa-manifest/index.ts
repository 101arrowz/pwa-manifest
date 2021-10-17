import PWAManifestGenerator, {
  Generation,
  htmlInsertToString
} from '@pwa-manifest/core';
import { Transformer } from '@parcel/plugin';
import { dirname } from 'path';
import assert from 'assert';

const headSearch = /(?<=<head(.*?)>)|<\/head>/;
const htmlSearch = /(?<=<html(.*?)>)/;

export default new Transformer<Generation | void>({
  async loadConfig({ config, options, logger }) {
    if (!config.env.isBrowser()) {
      logger.warn({
        message: `Not generating a manifest for ${config.searchPath}: context "${config.env.context}" is not a browser context`
      });
      return;
    }
    const confFile = await config.getConfig(
      [
        '.pwamanifestrc',
        '.pwamanifestrc.json',
        '.pwamanifestrc.js',
        'pwamanifest.config.js'
      ],
      {
        packageKey: 'pwaManifest'
      }
    );
    const conf = confFile?.contents;
    if (!conf) {
      throw new Error('Manifest creation failed: No config found.');
    }
    const pkg = await config.getPackage();
    let gen: PWAManifestGenerator;
    try {
      gen = new PWAManifestGenerator(
        conf,
        {
          baseURL: '.',
          resolveDir: dirname(confFile.filePath)
        },
        {
          name: pkg.name,
          desc: pkg.description
        }
      );
    } catch (e) {
      throw new Error(`Manifest creation failed: ${e}`);
    }
    gen.hashMethod = 'none';
    gen.on('*', (ev, ...args) => {
      if (ev.endsWith('Start')) logger.log({ message: args[0] });
    });
    return await gen.generate();
  },
  async transform({ asset, config }) {
    if (config && asset.type === 'html') {
      let origHTML = await asset.getCode();
      const newAssets: TransformerResultAsset[] = [asset];
      let htmlInject = config.html
        .map(htmlInsertToString)
        .join('');
      let manifest = JSON.stringify(config.manifest);
      let browserConfig = config.browserConfig;
      for (const k in config.generatedFiles) {
        const uniqueKey = '__ptpm-' + k;
        newAssets.push({
          type: k.slice(k.lastIndexOf('.') + 1),
          uniqueKey,
          content: config.generatedFiles[k],
          pipeline: '__ptpm_raw'
        });
        const regex = new RegExp('./' + k, 'g');
        manifest = manifest.replace(regex, uniqueKey);
        const inBC = regex.test(browserConfig);
        const inHTML = regex.test(htmlInject);
        if (inBC || inHTML) {
          const dep = asset.addURLDependency(uniqueKey);
          if (inBC) browserConfig = browserConfig.replace(regex, dep);
          if (inHTML) htmlInject = htmlInject.replace(regex, dep);
        }
      }
      newAssets.push({
        type: 'xml',
        uniqueKey: '__ptpm-browserconfig.xml',
        content: browserConfig,
        pipeline: '__ptpm_raw'
      }, {
        type: 'webmanifest',
        uniqueKey: '__ptpm-manifest.webmanifest',
        content: manifest
      });
      htmlInject = htmlInject.replace(new RegExp('./manifest.webmanifest', 'g'), asset.addURLDependency('__ptpm-manifest.webmanifest', {
        needsStableName: true
      }));
      htmlInject = htmlInject.replace(new RegExp('./browserconfig.xml', 'g'), asset.addURLDependency('__ptpm-browserconfig.xml', {
        needsStableName: true
      }));
      const ind = origHTML.search(headSearch);
      // istanbul ignore next
      if (ind === -1) {
        const htmlInd = origHTML.search(htmlSearch);
        if (htmlInd === -1) {
          throw new Error('Manifest injection failed: HTML file for link injection is invalid.');
        }
        origHTML = `${origHTML.slice(0, htmlInd)}<head><title>${config.manifest.name}</title>${htmlInject}</head>${origHTML.slice(htmlInd)}`;
      }
      else {
        origHTML = `${origHTML.slice(0, ind)}${htmlInject}${origHTML.slice(ind)}`;
      }
      asset.setCode(origHTML);
      return newAssets;
    }
    return [asset];
  }
});
