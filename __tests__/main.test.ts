import { tmpdir } from 'os';
import attachManifestGenerator from '..';
import { join } from 'path';
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync
} from 'fs';
import { EventEmitter } from 'events';
import logger from '@parcel/logger';
import testConfigs, { Config } from './testConfigs';
jest.mock('@parcel/logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;
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
    let outDir = join(tmpdir(), '_parcel-plugin-pwa-manifest', timeString);
    try {
      mkdirSync(outDir);
    } catch (e) {
      // Travis CI
      const tmpDir = join(__dirname, 'tmp');
      if (!existsSync(tmpDir)) mkdirSync(tmpDir);
      outDir = join(tmpDir, timeString);
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
    return JSON.parse(
      readFileSync(join(this.options.outDir, 'manifest.webmanifest')).toString()
    );
  }
  getBrowserConfig(): string {
    return readFileSync(join(this.options.outDir, 'browserconfig.xml'))
      .toString()
      .slice(74, -39);
  }
  getHTML(): string {
    return readFileSync(join(this.options.outDir, 'index.html'))
      .toString()
      .slice(6, -7);
  }
}
jest.setTimeout(30000);
const DEFAULT_REQUIRED_FILES = [
  'index.html',
  'manifest.webmanifest',
  'browserconfig.xml'
];
const testConfig = ({
  config,
  result,
  msg,
  manifest,
  browserconfig,
  html,
  logOutput
}: Config): void =>
  test.concurrent(msg || 'icons are correctly generated', async () => {
    const bundler = new Bundler({
      name: 'tester',
      description: 'test',
      pwaManifest: config
    });
    await bundler.genIcons();
    const generatedFiles = bundler.getFileList();
    if (logOutput)
      console.log(
        msg +
          '\nFiles: [' +
          generatedFiles
            .filter(str => !DEFAULT_REQUIRED_FILES.includes(str))
            .map(str => "'" + str.replace(/'/, "\\'") + "'")
            .join(', ') +
          ']\nOutput at: ' +
          bundler.options.outDir
      );
    if (mockedLogger.success.mock.calls.length === 0)
      throw new Error(mockedLogger.error.mock.calls[0][0]);
    expect(generatedFiles).toEqual(
      expect.arrayContaining([
        ...new Set(result.concat(...DEFAULT_REQUIRED_FILES))
      ])
    );
    if (manifest) {
      expect(bundler.getManifest()).toMatchObject(manifest as object);
    }
    if (browserconfig) {
      expect(bundler.getBrowserConfig()).toMatch(new RegExp(browserconfig));
    }
    if (html) {
      expect(bundler.getHTML()).toMatch(new RegExp(html));
    }
  });
for (const conf of testConfigs) {
  testConfig(conf);
}
