import PWAManifestGenerator, {
  htmlInsertToString,
  MetaConfig,
  PWAManifestOptions
} from '@pwa-manifest/core';
import { Transformer } from '@parcel/plugin';
import { dirname } from 'path';

const headSearch = /(?<=<head(.*?)>)|<\/head>/;
const htmlSearch = /(?<=<html(.*?)>)/;

export default new Transformer<
  [PWAManifestOptions, MetaConfig, PWAManifestOptions] | void
>({
  async loadConfig({ config, logger }) {
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
    try {
      new PWAManifestGenerator(
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
    return [
      conf,
      {
        baseURL: '.',
        resolveDir: dirname(confFile.filePath)
      },
      {
        name: pkg.name,
        desc: pkg.description
      }
    ];
  },
  async transform({ asset, logger, config }) {
    if (config && asset.type === 'html') {
      const gen = new PWAManifestGenerator(...config);
      gen.hashMethod = 'none';
      gen.on('*', (ev, ...args) => {
        if (ev.endsWith('Start')) logger.log({ message: args[0] });
      });
      const result = await gen.generate();
      let origHTML = await asset.getCode();
      const newAssets: TransformerResultAsset[] = [asset];
      let htmlInject = result.html.map(htmlInsertToString).join('');
      let manifest = JSON.stringify(result.manifest);
      let browserConfig = result.browserConfig;
      for (const k in result.generatedFiles) {
        const uniqueKey = '__ptpm-' + k;
        newAssets.push({
          type: k.slice(k.lastIndexOf('.') + 1),
          uniqueKey,
          content: result.generatedFiles[k],
          pipeline: '__ptpm_raw'
        });
        const regex = new RegExp('./' + k, 'g');
        const processDep = '__ptpm(' + uniqueKey + ')';
        manifest = manifest.replace(regex, processDep);
        browserConfig = browserConfig.replace(regex, processDep);
        if (regex.test(htmlInject)) {
          htmlInject = htmlInject.replace(
            regex,
            asset.addURLDependency(uniqueKey)
          );
        }
      }
      newAssets.push(
        {
          type: 'xml',
          uniqueKey: '__ptpm-browserconfig.xml',
          content: browserConfig,
          pipeline: '__ptpm_process'
        },
        {
          type: 'webmanifest',
          uniqueKey: '__ptpm-manifest.webmanifest',
          content: manifest,
          pipeline: '__ptpm_process'
        }
      );
      htmlInject = htmlInject.replace(
        new RegExp('./manifest.webmanifest', 'g'),
        asset.addURLDependency('__ptpm-manifest.webmanifest')
      );
      htmlInject = htmlInject.replace(
        new RegExp('./browserconfig.xml', 'g'),
        asset.addURLDependency('__ptpm-browserconfig.xml')
      );
      const ind = origHTML.search(headSearch);
      // istanbul ignore next
      if (ind === -1) {
        const htmlInd = origHTML.search(htmlSearch);
        if (htmlInd === -1) {
          throw new Error(
            'Manifest injection failed: HTML file for link injection is invalid.'
          );
        }
        origHTML = `${origHTML.slice(0, htmlInd)}<head><title>${
          result.manifest.name
        }</title>${htmlInject}</head>${origHTML.slice(htmlInd)}`;
      } else {
        origHTML = `${origHTML.slice(0, ind)}${htmlInject}${origHTML.slice(
          ind
        )}`;
      }
      asset.setCode(origHTML);
      return newAssets;
    } else {
      let code = await asset.getCode();
      code = code.replace(/__ptpm\((.*?)\)/g, str =>
        asset.addURLDependency(str.slice(7, -1))
      );
      asset.setCode(code);
    }
    return [asset];
  }
});
