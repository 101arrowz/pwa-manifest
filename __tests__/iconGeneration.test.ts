import { tmpdir } from 'os';
import attachManifestGenerator from '..';
import { join } from 'path';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { EventEmitter } from 'events';

// Not quite a mock since it has completely different behavior to original, but should work for all purposes
class Bundler extends EventEmitter {
  private fakeBundle: unknown;
  private manifestGen: (bundle: unknown) => Promise<void>;
  public options: CorrectedParcelOptions & { outDir: string };

  constructor({
    pkgdir = join(__dirname, '..', 'sample'),
    ...opts
  }: Omit<PackageJSON, 'pkgdir'> & {
    pkgdir?: string;
  }) {
    super();
    this.fakeBundle = {
      entryAsset: {
        getPackage: (): Promise<PackageJSON> =>
          Promise.resolve({
            pkgdir,
            ...opts
          })
      }
    };
    const timeString = Date.now().toString(36);
    let outDir = join(
      tmpdir(),
      '_parcel-plugin-pwa-manifest',
      timeString
    );
    try {
      mkdirSync(outDir);
    } catch(e) {
      // Travis CI
      const tmpDir = join(__dirname, 'tmp');
      mkdirSync(tmpDir);
      outDir = join(tmpDir, timeString)
      mkdirSync(outDir);
    }
    writeFileSync(join(outDir, 'index.html'), '<head></head>');
    this.options = {
      outDir,
      target: 'browser',
      publicURL: './',
      contentHash: true
    };
    attachManifestGenerator((this as unknown) as FullBundler);
    this.manifestGen = this.listeners('bundled')[0] as Bundler['manifestGen'];
    this.off('bundled', this.manifestGen);
  }
  async genIcons(): Promise<void> {
    return this.manifestGen(this.fakeBundle);
  }
  getFileList(): string[] {
    return readdirSync(this.options.outDir);
  }
  getManifest(): unknown {
    return readFileSync(join(this.options.outDir, 'manifest.webmanifest'));
  }
}
const defaultResult = [
  'apple-touch-icon.105de2c5.png',
  'icon-152x152.c0cccc53.webp',
  'icon-152x152.c5e4d8cb.png',
  'icon-192x192.3103561d.webp',
  'icon-192x192.cab29cd7.png',
  'icon-384x384.2b65be8b.png',
  'icon-384x384.a54ab4a2.webp',
  'icon-512x512.5c88cabb.webp',
  'icon-512x512.b24e0d51.png',
  'icon-96x96.00714ae7.webp',
  'icon-96x96.b73322f2.png',
  'mstile-150x150.df894f37.png',
  'mstile-310x150.23817a3d.png',
  'mstile-310x310.5f619e76.png',
  'mstile-70x70.3bcf1bff.png'
];
type Config = {
  msg: string;
  config: PWAManifestOptions;
  result: string[];
  manifest?: unknown;
  logOutput?: boolean;
};
const testConfigs: Config[] = [
  {
    msg: 'Default generation works correctly',
    config: {
      generateIconOptions: {
        baseIcon: './icon.svg'
      }
    },
    result: defaultResult
  },
  {
    msg: 'Favicon generation works correctly',
    config: {
      generateIconOptions: {
        baseIcon: './icon.svg',
        genFavicons: true
      }
    },
    result: [
      ...defaultResult,
      'favicon-16x16.726e3e17.png',
      'favicon-32x32.6326f01e.png'
    ]
  }
];
jest.setTimeout(30000);
const testConfig = ({
  config,
  result,
  msg,
  manifest,
  logOutput
}: Config): void =>
  test.concurrent(msg || 'icons are correctly generated', () => {
    const bundler = new Bundler({
      name: 'tester',
      description: 'test',
      pwaManifest: config
    });
    return bundler.genIcons().then(async () => {
      const generatedFiles = bundler.getFileList();
      if (logOutput)
        console.log(
          msg + ': ' + JSON.stringify(generatedFiles).replace(`"`, `'`)
        );
      expect(generatedFiles).toEqual(
        expect.arrayContaining([
          ...new Set(
            result.concat(
              'browserconfig.xml',
              'index.html',
              'manifest.webmanifest'
            )
          )
        ])
      );
      if (manifest) {
        expect(bundler.getManifest()).toMatchObject(manifest as object);
      }
    });
  });
for (const conf of testConfigs) {
  testConfig(conf);
}
