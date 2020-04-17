import { EventEmitter } from 'events';
import Bundler, { ParcelOptions, ParcelBundle, Asset } from 'parcel-bundler';
type CorrectedParcelBundle = ParcelBundle & {
  package: (...args: unknown[]) => unknown;
  _package: (bundler: Pick<FullBundler, 'packagers'>) => Promise<void>;
  createChildBundle: (asset: Asset, options?: object) => void;
};
declare global {
  type PostHTMLBundle = { tag: string; attrs: Record<string, string> };
  class Packager {
    constructor(...args: unknown[]);
    bundle: CorrectedParcelBundle;
    addAsset(asset: Asset): Promise<void>;
    write(str: string): Promise<void>;
    addBundlesToTree(bundles: PostHTMLBundle[], tree: unknown): void;
    insertSiblingBundles(bundles: unknown[]): void;
  }
  type CorrectedParcelOptions = Omit<ParcelOptions, 'publicUrl' | 'outDir'> & {
    publicURL: string;
    outDir: string;
  };
  type FullBundler = Bundler &
    EventEmitter & {
      options: CorrectedParcelOptions;
      createBundleTree: (
        arg0: unknown,
        bundle: CorrectedParcelBundle,
        ...args: unknown[]
      ) => void;
      packagers: {
        add: (k: string, p: typeof Packager) => void;
        get: (k: string) => typeof Packager;
      };
    };
  // TODO: Improve
  type PWAManifestOptions = any; // eslint-disable-line @typescript-eslint/no-explicit-any
  type PackageJSON = {
    name?: string;
    description?: string;
    pkgdir: string;
    pwaManifest?: PWAManifestOptions;
    'pwa-manifest'?: PWAManifestOptions;
  };
}
