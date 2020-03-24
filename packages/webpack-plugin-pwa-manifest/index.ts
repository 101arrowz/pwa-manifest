import PWAManifestGenerator, {
  PWAManifestOptions,
  HashMethod,
  StartEvent,
  GenerationEvent,
  EndEvent,
  BaseEvent,
  EmittedGenEvent
} from '@pwa-manifest/core';
import { Hooks as HtmlWebpackPluginHooks } from 'html-webpack-plugin';
import { Compiler, compilation } from 'webpack';
import { AsyncParallelHook, SyncHook } from 'tapable';
type HtmlWebpackPluginV4 = {
  getHooks(
    c: compilation.Compilation
  ): {
    beforeEmit: HtmlWebpackPluginHooks['htmlWebpackPluginBeforeHtmlProcessing'];
  };
};
type HtmlWebpackPluginV3 = {};
type Hooks = { [k in StartEvent]: AsyncParallelHook<string> } &
  { [k in GenerationEvent]: SyncHook<EmittedGenEvent> } &
  { [k in EndEvent]: AsyncParallelHook } &
  { [k in BaseEvent]: AsyncParallelHook };
// TODO: fix
type Data = any; // eslint-disable-line @typescript-eslint/no-explicit-any
let HtmlWebpackPlugin: HtmlWebpackPluginV3 | HtmlWebpackPluginV4;
const isV4 = (
  plugin: typeof HtmlWebpackPlugin
): plugin is HtmlWebpackPluginV4 => {
  return !!(plugin as HtmlWebpackPluginV4).getHooks;
};
try {
  HtmlWebpackPlugin = require('html-webpack-plugin');
} catch (e) {
  // HtmlWebpackPlugin doesn't exist
}
const NAME = 'WebpackPluginPWAManifest';
const headSearch = /(?<=<head(.*?)>)|<\/head>/;
const toAsset = <T extends string | Buffer>(
  val: T
): { source: () => T; size: () => number } => ({
  source: () => val,
  size: () => val.length
});
const hooks = new WeakMap<compilation.Compilation, Hooks>();
const createHooks = (): Hooks => ({
  start: new AsyncParallelHook(),
  defaultIconsStart: new AsyncParallelHook(['msg']),
  defaultIconsGen: new SyncHook(['data']),
  defaultIconsEnd: new AsyncParallelHook(),
  appleTouchIconStart: new AsyncParallelHook(['msg']),
  appleTouchIconGen: new SyncHook(['data']),
  appleTouchIconEnd: new AsyncParallelHook(),
  faviconStart: new AsyncParallelHook(['msg']),
  faviconGen: new SyncHook(['data']),
  faviconEnd: new AsyncParallelHook(),
  msTileStart: new AsyncParallelHook(['msg']),
  msTileGen: new SyncHook(['data']),
  msTileEnd: new AsyncParallelHook(),
  end: new AsyncParallelHook()
});
class WebpackPluginPWAManifest {
  cb: (compilation: compilation.Compilation, d: Data) => Promise<Data>;

  constructor(opts: PWAManifestOptions, meta?: { hashMethod: HashMethod }) {
    this.cb = async (compilation, data) => {
      const logger = compilation.getLogger(NAME);
      try {
        const gen = new PWAManifestGenerator(opts, {
          baseURL: compilation.outputOptions.publicPath,
          resolveDir: '.'
        });
        const compHooks = WebpackPluginPWAManifest.getHooks(compilation);
        gen.on('*', (ev, ...args) => {
          const hook = compHooks[ev];
          if (hook.call) hook.call(...args);
          else hook.promise(...args);
          if (ev.endsWith('Start')) {
            logger.group(args[0]);
          }
        });
        if (!HtmlWebpackPlugin) {
          logger.warn(
            'html-webpack-plugin not installed, so HTML will not be injected.'
          );
          gen.hashMethod = 'none'; // If no injection, we want consistent, easy-to-type filenames
        }
        if (meta?.hashMethod) {
          gen.hashMethod = meta.hashMethod;
        }
        const {
          html,
          generatedFiles,
          browserConfig,
          manifest
        } = await gen.generate();
        if (HtmlWebpackPlugin) {
          const ind = data.html.search(headSearch);
          data.html = data.html.slice(0, ind) + html + data.html.slice(ind);
        }
        logger.group('Writing files...');
        for (const file in generatedFiles)
          compilation.assets[file] = toAsset(generatedFiles[file]);
        compilation.assets['browserconfig.xml'] = toAsset(browserConfig);
        compilation.assets['manifest.webmanifest'] = toAsset(
          JSON.stringify(manifest)
        );
        logger.groupEnd();
        logger.info('Manifest creation successful.');
      } catch (e) {
        // istanbul ignore next
        compilation.errors.push(new Error(e));
      }
      return data;
    };
  }
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(NAME, compilation => {
      if (isV4(HtmlWebpackPlugin)) {
        HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapPromise(
          NAME,
          data => this.cb(compilation, data)
        );
      } else if (HtmlWebpackPlugin) {
        (compilation.hooks as HtmlWebpackPluginHooks).htmlWebpackPluginBeforeHtmlProcessing.tapPromise(
          NAME,
          data => this.cb(compilation, data)
        );
      } else {
        compiler.hooks.make.tapPromise(NAME, compilation =>
          this.cb(compilation, null)
        );
      }
    });
  }

  static getHooks(compilation: compilation.Compilation): Hooks {
    let compHooks = hooks.get(compilation);
    if (!compHooks) {
      compHooks = createHooks();
      hooks.set(compilation, compHooks);
    }
    return compHooks;
  }
}
export = WebpackPluginPWAManifest;
