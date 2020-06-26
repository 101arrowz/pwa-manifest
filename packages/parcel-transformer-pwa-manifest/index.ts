import PWAManifestGenerator, {
  Generation,
  htmlInsertToString
} from '@pwa-manifest/core';
import { extname } from 'path';
import { match } from 'posthtml/lib/api';
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
    const conf = (
      await config.getConfig(['.pwamanifestrc', '.manifestrc', '.pwarc'], {
        packageKey: 'pwaManifest'
      })
    ).contents;
    const pkg = await config.getPackage();
    let gen: PWAManifestGenerator;
    try {
      gen = new PWAManifestGenerator(
        conf,
        {
          baseURL: '.',
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
    config.setResult(await gen.generate());
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
      const ast = await asset.getAST();
      if (ast && ast.program) {
        match.call(ast.program, { tag: 'head' }, node => {
          node.content.push(
            ...config.html.map(([tag, attrs]) => ({ tag, attrs }))
          );
        });
        asset.setAST(ast);
      } else {
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
          origHTML = `${origHTML.slice(0, ind)}${config.html.map(
            htmlInsertToString
          )}${origHTML.slice(ind)}`;
        }
        asset.setCode(origHTML);
      }
      const newAssets: TransformerResultAsset[] = [
        asset,
        {
          filePath: 'browserconfig.xml', // TODO: necessary?
          type: 'xml',
          uniqueKey: 'ptpm-browserconfig.xml',
          isIsolated: true,
          content: config.browserConfig
        },
        {
          filePath: 'manifest.webmanifest',
          type: 'webmanifest',
          uniqueKey: 'ptpm-manifest.webmanifest',
          isIsolated: true,
          content: JSON.stringify(config.manifest)
        }
      ];
      for (const k in config.generatedFiles)
        newAssets.push({
          filePath: k,
          type: extname(k).slice(1),
          uniqueKey: 'ptpm-' + k,
          isIsolated: true,
          content: config.generatedFiles[k]
        });
      return newAssets;
    }
    return [asset];
  }
});
