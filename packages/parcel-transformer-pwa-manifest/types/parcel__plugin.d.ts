type SynthAsset = {
  filePath: string;
  code: string;
};
type TransformerResultAsset = Asset | {
  content: string | Buffer;
  type: string;
  uniqueKey: string;
};

type Diagnostic = {
  message: string;
}

type PluginLogger = {
  log(v: Diagnostic): void;
  warn(v: Diagnostic): void;
};

type Options = { rootDir: string; }
type Asset = {
  type: string;
  filePath: string;
  getCode(): Promise<string>;
  setCode(code: string): void;
}
type Async<T> = T | Promise<T>;
type Engines = {
  browsers?: string | string[];
};
type Environment = {
  context: string;
  engines: Engines;
  isBrowser(): boolean;
};
type PackageJSON = {
  name?: string;
  description?: string;
  targets: {
    [k: string]: {
      context?: string;
      engines?: Engines;
      publicUrl?: string;
    }
  };
};
type Config<T> = {
  env: Environment;
  result: T;
  searchPath: string;
  getConfig(locs: string[], extra: { packageKey: string }): Promise<{
    contents: import('@pwa-manifest/core').PWAManifestOptions;
    filePath: string;
  }>;
  setResult(conf: T): void
  getPackage(): Promise<PackageJSON>;
};
type Resolve = (from: string, to: string) => Promise<string>;

declare module '@parcel/plugin' {
  export class Transformer<T, S> {
    constructor(data: {
      loadConfig(dat: { config: Config<T>, options: Options, logger: PluginLogger }): Async<void>;
      preSerializeConfig?(dat: { config: Config<S>, options: Options, logger: PluginLogger }): Async<void>;
      postDeserializeConfig?(dat: { config: Config<T>, options: Options, logger: PluginLogger }): Async<void>;
      transform(dat: { asset: Asset, config: T | null, options: Options, logger: PluginLogger, resolve: Resolve }): Async<TransformerResultAsset[]>;
    });
  }
}