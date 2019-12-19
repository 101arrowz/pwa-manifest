import { EventEmitter } from 'events';
import Bundler, { ParcelOptions } from 'parcel-bundler';
declare global {
  type CorrectedParcelOptions = Omit<ParcelOptions, 'publicUrl' | 'outDir'> & {
    publicURL: string;
    outDir: string;
  };
  type FullBundler = Bundler &
    EventEmitter & {
      options: CorrectedParcelOptions;
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
