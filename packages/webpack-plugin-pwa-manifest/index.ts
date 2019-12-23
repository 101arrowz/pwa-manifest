import PWAManifestGenerator, { PWAManifestOptions } from '@pwa-manifest/core';
import HtmlWebpackPlugin, { Hooks } from 'html-webpack-plugin';
import { Compiler } from 'webpack';
const NAME = 'WebpackPluginPWAManifest';
const headSearch = /(?<=<head(.*?)>)|<\/head>/;
const toAsset = <T extends string | Buffer>(val: T): { source: () => T, size: () => number } => ({
  source: () => val,
  size: () => val.length
})
class WebpackPluginPWAManifest {
  opts: PWAManifestOptions;

  constructor(opts: PWAManifestOptions) {
    this.opts = opts;
  }
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(NAME, compilation => {
      (compilation.hooks as Hooks).htmlWebpackPluginBeforeHtmlProcessing.tapPromise(
        NAME,
        async data => {
          try {
            const gen = new PWAManifestGenerator(this.opts, {
              baseURL: compilation.outputOptions.publicPath,
              resolveDir: '.'
            });
            const { html, generatedIcons, browserConfig, manifest } = await gen.generate();
            const ind = data.html.search(headSearch);
            data.html = data.html.slice(0, ind) + html + data.html.slice(ind);
            for (const icon in generatedIcons)
              compilation.assets[icon] = toAsset(generatedIcons[icon]);
            compilation.assets['browserconfig.xml'] = toAsset(browserConfig);
            compilation.assets['manifest.webmanifest'] = toAsset(JSON.stringify(manifest));
          } catch(e) {
            compilation.errors.push(new Error(e));
          }
          return data;
        }
      );
    });
  }
}
export = WebpackPluginPWAManifest;