import PWAManifestGenerator, {
  PWAManifestOptions,
  Event,
  StartEvent,
  GenerationEvent,
  EndEvent,
  BaseEvent,
  EmittedGenEvent,
  Generation
} from '@pwa-manifest/core';
import { dirname } from 'path';
import callsite from 'callsite';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { Compiler, compilation } from 'webpack';
import { AsyncParallelHook, SyncHook } from 'tapable';
import { EventEmitter } from 'events';
type Hooks = { [k in StartEvent]: AsyncParallelHook<string> } &
  { [k in GenerationEvent]: SyncHook<EmittedGenEvent> } &
  { [k in EndEvent]: AsyncParallelHook } &
  { [k in BaseEvent]: AsyncParallelHook };
// TODO: fix
const NAME = 'WebpackPluginPWAManifest';
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
  safariPinnedTabStart: new AsyncParallelHook(['msg']),
  safariPinnedTabGen: new SyncHook(['data']),
  safariPinnedTabEnd: new AsyncParallelHook(),
  screenshotsStart: new AsyncParallelHook(['msg']),
  screenshotsGen: new SyncHook(['data']),
  screenshotsEnd: new AsyncParallelHook(),
  shortcutIconsStart: new AsyncParallelHook(['msg']),
  shortcutIconsGen: new SyncHook(['data']),
  shortcutIconsEnd: new AsyncParallelHook(),
  faviconStart: new AsyncParallelHook(['msg']),
  faviconGen: new SyncHook(['data']),
  faviconEnd: new AsyncParallelHook(),
  msTileStart: new AsyncParallelHook(['msg']),
  msTileGen: new SyncHook(['data']),
  msTileEnd: new AsyncParallelHook(),
  end: new AsyncParallelHook()
});

class WebpackPluginPWAManifest extends EventEmitter {
  private resolveDir: string;
  constructor(
    private opts: PWAManifestOptions,
    private conf: { fingerprint: boolean } = { fingerprint: true }
  ) {
    super();
    const cs = callsite()[1];
    this.resolveDir = cs ? dirname(cs.getFileName()) : '.';
  }
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(NAME, compilation => {
      let gen: PWAManifestGenerator;
      const logger = compilation.getLogger(NAME);
      try {
        gen = new PWAManifestGenerator(this.opts, {
          baseURL: compilation.outputOptions.publicPath
        });
      } catch (e) {
        compilation.errors.push(new Error(e as string));
        return;
      }
      if (this.conf.fingerprint)
        gen.hashMethod =
          process.env.NODE_ENV === 'production' ? 'content' : 'name';
      else gen.hashMethod = 'none';
      const hooks = WebpackPluginPWAManifest.getHooks(compilation);
      gen.on('*', (ev, ...args) => {
        if (ev.endsWith('Start')) logger.status(args[0]);
        const hook = hooks[ev];
        if (hook instanceof SyncHook) hook.call(...args);
        else hook.promise(...args);
        this.emit(ev, ...args);
      });
      const genProm = gen.generate();
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tapPromise(
        NAME,
        async data => {
          let generation: Generation;
          try {
            generation = await genProm;
          } catch (e) {
            compilation.errors.push(e);
            return data;
          }
          const { html, generatedFiles, browserConfig, manifest } = generation;
          for (const filename in generatedFiles)
            compilation.assets[filename] = toAsset(generatedFiles[filename]);
          compilation.assets['browserconfig.xml'] = toAsset(browserConfig);
          compilation.assets['manifest.webmanifest'] = toAsset(
            JSON.stringify(manifest)
          );
          data.headTags = data.headTags.concat(
            ...html.map(([tagName, attributes]) => ({
              tagName,
              attributes,
              voidTag: true
            }))
          );
          return data;
        }
      );
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(ev: Event | '*', ...args: any[]): boolean {
    if (ev !== '*') super.emit('*', ev, ...args); // Allows attaching a listener to all events
    return super.emit(ev, ...args);
  }
  on(ev: StartEvent, listener: (msg: string) => void): this;
  on(ev: GenerationEvent, listener: (data: EmittedGenEvent) => void): this;
  on(ev: EndEvent, listener: () => void): this;
  on(ev: BaseEvent, listener: () => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(ev: '*', listener: (ev: Event, ...args: any[]) => void): this;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(ev: Event | '*', listener: (...args: any[]) => void): this {
    return super.on(ev, listener);
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
