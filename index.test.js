const Bundler = require('parcel-bundler');
const { tmpdir } = require('os');
const attachManifestGenerator = require('./test-build');
const { join } = require('path');
const { readdirSync, readFileSync } = require('fs');
const outDir = join(tmpdir(), `_parcel-plugin-pwa-manifest/${Date.now().toString(36)}`);
const testConfigs = [
  {
    msg: 'Default generation works correctly',
    config: {
      generateIconOptions: {
        baseIcon: './sample/icon.svg'
      }
    },
    result: ['apple-touch-icon.105de2c5.png','icon-152x152.c0cccc53.webp','icon-152x152.c5e4d8cb.png','icon-192x192.3103561d.webp','icon-192x192.cab29cd7.png','icon-384x384.2b65be8b.png','icon-384x384.a54ab4a2.webp','icon-512x512.5c88cabb.webp','icon-512x512.b24e0d51.png','icon-96x96.00714ae7.webp','icon-96x96.b73322f2.png','mstile-150x150.df894f37.png','mstile-310x150.23817a3d.png','mstile-310x310.5f619e76.png','mstile-70x70.3bcf1bff.png']
  },
  {
    msg: 'Favicon generation works correctly',
    config: {
      generateIconOptions: {
        baseIcon: './sample/icon.svg',
        genFavicons: true
      }
    },
    result: ['apple-touch-icon.105de2c5.png','favicon-16x16.726e3e17.png','favicon-32x32.6326f01e.png','icon-152x152.c0cccc53.webp','icon-152x152.c5e4d8cb.png','icon-192x192.3103561d.webp','icon-192x192.cab29cd7.png','icon-384x384.2b65be8b.png','icon-384x384.a54ab4a2.webp','icon-512x512.5c88cabb.webp','icon-512x512.b24e0d51.png','icon-96x96.00714ae7.webp','icon-96x96.b73322f2.png','mstile-150x150.df894f37.png','mstile-310x150.23817a3d.png','mstile-310x310.5f619e76.png','mstile-70x70.3bcf1bff.png']
  }
];
const bundler = new Bundler(join(__dirname, 'sample', 'index.html'), {
  publicUrl: './',
  outDir,
  cache: false,
  watch: false,
  hmr: false,
  contentHash: true,
  logLevel: 1
});
jest.setTimeout(30000);
attachManifestGenerator(bundler);
const manifestGen = bundler.listeners('bundled')[0];
bundler.off('bundled', manifestGen);
const testConfig = ({ config, result, msg, manifest, logOutput }) =>
  test.concurrent(msg || 'icons are correctly generated', () => {
    return new Promise(resolve => {
      bundler.on('bundled', async bundle => {
        bundle.entryAsset.getPackage = async () => ({
          name: 'tester',
          description: 'test',
          pwaManifest: config,
          pkgdir: __dirname
        });
        await manifestGen(bundle);
        const generatedFiles = readdirSync(outDir);
        if (logOutput) console.log(msg+': '+JSON.stringify(generatedFiles));
        expect(generatedFiles).toEqual(expect.arrayContaining([...new Set(result.concat('browserconfig.xml', 'index.html', 'manifest.webmanifest'))]));
        if (manifest) {
          const newManifest = JSON.parse(readFileSync(join(outDir, 'manifest.webmanifest')).toString());
          expect(newManifest).toMatchObject(manifest);
        }
        resolve();
      });
    })
  });
for (const conf of testConfigs) {
  testConfig(conf);
}
bundler.bundle();