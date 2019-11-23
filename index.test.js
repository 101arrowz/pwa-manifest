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
    result: ['apple-touch-icon.d70cfcc7.png','browserconfig.xml','favicon-16x16.a73df5b8.png','favicon-32x32.f5ca64c1.png','icon-152x152.3285094d.webp','icon-152x152.975cad21.png','icon-192x192.013060f9.png','icon-192x192.45586afc.webp','icon-384x384.2b8c3a7e.webp','icon-384x384.db0b5dd3.png','icon-512x512.be0b61d5.png','icon-512x512.e926a4ea.webp','icon-96x96.2995c7c8.webp','icon-96x96.83cd9b6d.png','mstile-150x150.1f9e7ff5.png','mstile-310x150.b697926a.png','mstile-310x310.bced08bd.png','mstile-70x70.423d485b.png']
  },
  {
    msg: 'Favicon generation works correctly',
    config: {
      generateIconOptions: {
        baseIcon: './sample/icon.svg',
        genFavicons: true
      }
    },
    result: ['apple-touch-icon.d70cfcc7.png','browserconfig.xml','favicon-16x16.a73df5b8.png','favicon-32x32.f5ca64c1.png','icon-152x152.3285094d.webp','icon-152x152.975cad21.png','icon-192x192.013060f9.png','icon-192x192.45586afc.webp','icon-384x384.2b8c3a7e.webp','icon-384x384.db0b5dd3.png','icon-512x512.be0b61d5.png','icon-512x512.e926a4ea.webp','icon-96x96.2995c7c8.webp','icon-96x96.83cd9b6d.png','mstile-150x150.1f9e7ff5.png','mstile-310x150.b697926a.png','mstile-310x310.bced08bd.png','mstile-70x70.423d485b.png']
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
        expect(generatedFiles).toEqual(expect.arrayContaining(result));
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