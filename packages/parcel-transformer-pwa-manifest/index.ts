import PWAManifestGenerator, {
  Generation,
  htmlInsertToString
} from '@pwa-manifest/core';
import { Transformer } from '@parcel/plugin';

const headSearch = /(?<=<head(.*?)>)|<\/head>/;
const htmlSearch = /(?<=<html(.*?)>)/;

export default new Transformer<
  Generation,
  Omit<Generation, 'generatedFiles'> & {
    generatedFiles: Record<string, number[]>;
  }
>({
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
        'pwamanifest.conifg.js'
      ],
      {
        packageKey: 'pwaManifest'
      }
    );
    const pkgJson = await config.getPackage();
    const envBrowsers = config.env.engines.browsers!;
    let publicUrl = '/';
    if (pkgJson && pkgJson.targets) {
      for (const k in pkgJson.targets) {
        const target = pkgJson.targets[k];
        if (target.context && target.context !== 'browser') {
          continue;
        }
        if (typeof envBrowsers === 'string') {
          if (target.engines?.browsers !== envBrowsers) {
            continue;
          }
        } else if (
          target.engines?.browsers &&
          !(
            Array.isArray(target.engines.browsers) &&
            target.engines.browsers.length === envBrowsers.length &&
            target.engines.browsers.every((v, i) => envBrowsers[i] === v)
          )
        ) {
          continue;
        }
        publicUrl = target.publicUrl || '/';
      }
    }
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
          baseURL: publicUrl,
          resolveDir: options.rootDir
        },
        {
          name: pkg.name,
          desc: pkg.description
        }
      );
    } catch (e) {
      throw new Error(`Manifest creation failed: ${e}`);
    }
    // TODO: way to specify fingerprinting level
    gen.hashMethod = 'content';
    gen.on('*', (ev, ...args) => {
      if (ev.endsWith('Start')) logger.log({ message: args[0] });
    });
    try {
      config.setResult(await gen.generate());
    } catch (e) {
      throw new Error(`Manifest creation failed: ${e}`);
    }
  },
  async preSerializeConfig({ config }) {
    if (!config.result) return;
    const newFiles: Record<string, number[]> = {};
    for (const k in config.result.generatedFiles) {
      newFiles[k] = [...config.result.generatedFiles[k]];
    }
    config.result = {
      ...config.result,
      generatedFiles: newFiles
    };
  },
  async postDeserializeConfig({ config }) {
    const newFiles: Record<string, Buffer> = {};
    for (const k in config.result.generatedFiles) {
      newFiles[k] = Buffer.from(config.result.generatedFiles[k]);
    }
    config.setResult({
      ...config.result,
      generatedFiles: newFiles
    });
  },
  async transform({ asset, config }) {
    if (config && asset.type === 'html') {
      let origHTML = await asset.getCode();
      const ind = origHTML.search(headSearch);
      // istanbul ignore next
      if (ind === -1) {
        const htmlInd = origHTML.search(htmlSearch);
        if (htmlInd === -1) {
          throw 'HTML file for link injection is invalid.';
        }
        origHTML = `${origHTML.slice(0, htmlInd)}<head><title>${
          config.manifest.name
        }</title>${config.html
          .map(htmlInsertToString)
          .join('')}</head>${origHTML.slice(htmlInd)}`;
      } else {
        origHTML = `${origHTML.slice(0, ind)}${config.html
          .map(htmlInsertToString)
          .join('')}${origHTML.slice(ind)}`;
      }
      asset.setCode(origHTML);
      const newAssets: TransformerResultAsset[] = [
        asset,
        {
          type: 'xml',
          uniqueKey: 'ptpm-browserconfig.xml',
          content: config.browserConfig
        },
        {
          type: 'webmanifest',
          uniqueKey: 'ptpm-manifest.webmanifest',
          content: JSON.stringify(config.manifest)
        }
      ];
      for (const k in config.generatedFiles)
        newAssets.push({
          type: k.slice(k.lastIndexOf('.') + 1),
          uniqueKey: 'ptpm-' + k,
          content: config.generatedFiles[k]
        });
      return newAssets;
    }
    return [asset];
  }
});
