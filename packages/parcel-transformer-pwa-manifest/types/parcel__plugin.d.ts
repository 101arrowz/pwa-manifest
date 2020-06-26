type SynthAsset = {
  filePath: string;
  code: string;
};
type TransformerResultAsset = Asset | {
  content: string | Buffer;
  type: string;
  filePath: string;
  uniqueKey: string;
  isIsolated: boolean;
};

type Diagnostic = {
  message: string;
}

type PluginLogger = {
  log(v: Diagnostic): void;
};

type AST = { program: unknown };
type Options = { rootDir: string; }
type Asset = {
  type: string;
  filePath: string;
  getAST(): Promise<AST>;
  getCode(): Promise<string>;
  setAST(ast: AST): void;
  setCode(code: string): void;
}
type Async<T> = T | Promise<T>;
type Config<T> = {
  result: T;
  getConfig(locs: string[], extra: { packageKey: string }): Promise<{ contents: import('@pwa-manifest/core').PWAManifestOptions; }>;
  setResult(conf: T): void
  getPackage(): Promise<{ name?: string; description?: string }>;
};
type Resolve = (from: string, to: string) => Promise<string>;

declare module '@parcel/plugin' {
  export class Transformer<T, S> {
    constructor(data: {
      loadConfig(dat: { config: Config<T>, options: Options, logger: PluginLogger }): Promise<void>;
      preSerializeConfig?(dat: { config: Config<S>, options: Options, logger: PluginLogger }): Promise<void>;
      postDeserializeConfig?(dat: { config: Config<T>, options: Options, logger: PluginLogger }): Promise<void>;
      transform(dat: { asset: Asset, config: T | null, options: Options, logger: PluginLogger, resolve: Resolve }): Async<TransformerResultAsset[]>;
    });
  }
}