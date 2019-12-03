import Bundler, { ParcelOptions } from 'parcel-bundler';
import { PngOptions, WebpOptions, JpegOptions, TiffOptions } from 'sharp';
declare global {
  type CorrectedParcelOptions = ParcelOptions & {
    publicURL: string;
  };
  type FullBundler = Bundler & {
    options: CorrectedParcelOptions;
  };
  type FormatOptions = {
    png: PngOptions;
    webp?: WebpOptions;
    jpeg?: JpegOptions;
    tiff?: TiffOptions;
  };
  type Verifier = (v: unknown) => boolean;
  type IconEntry = {
    src: string;
    sizes: string;
    type: string;
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
