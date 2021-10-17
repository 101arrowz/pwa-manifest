type Diagnostic = {
  message: string;
}

type PluginLogger = {
  log(v: Diagnostic): void;
  warn(v: Diagnostic): void;
};

type TransformerResultAsset = {
  type: string;
  uniqueKey: string;
  content: string | Buffer;
  pipeline?: string;
} | Asset;

type Async<T> = T | Promise<T>;

type Options = {};

type Environment = {
  isBrowser(): boolean;
  context: string;
};

type DependencyOptions = {
  needsStableName?: boolean;
};

type Asset = {
  type: string;
  getCode(): Promise<string>;
  setCode(code: string): void;
  addURLDependency(dep: string, opts?: DependencyOptions): string;
};

type Bundle = {
  type: string;
  needsStableName: boolean;
  target: { distEntry: string };
  traverseAssets(fn: (asset: Asset) => void): void;
}

type BundleGraph = {
  getParentBundles(bundle: Bundle): Bundle[];
  getBundles(): Bundle[];
}

type PackageJSON = {
  name: string;
  description: string;
};

type Config = {
  env: Environment;
  searchPath: string;
  getConfig(locs: string[], extra: { packageKey: string }): Promise<{
    contents: import('@pwa-manifest/core').PWAManifestOptions;
    filePath: string;
  }>;
  getPackage(): Promise<PackageJSON>;
};
type Resolve = (from: string, to: string) => Promise<string>;

declare module '@parcel/plugin' {
  export class Transformer<T> {
    constructor(data: {
      loadConfig(dat: { config: Config, options: Options, logger: PluginLogger }): Async<T>;
      transform(dat: { asset: Asset, config: T, options: Options, logger: PluginLogger, resolve: Resolve }): Async<TransformerResultAsset[]>;
    });
  }
}