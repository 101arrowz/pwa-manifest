const Bundler = require('parcel-bundler');
const { tmpdir } = require('os');
const attachManifestGenerator = require('..');
const { join } = require('path');
const { readdirSync } = require('fs');
const outDir = join(tmpdir(), `_parcel-plugin-pwa-manifest/${Date.now().toString(36)}`);
const testConfigs = require('./testConfigs.json');
const bundler = new Bundler(join(__dirname, '..', 'sample', 'index.html'), {
  publicUrl: './',
  outDir,
  cache: false,
  watch: false,
  hmr: false,
  logLevel: 1
});
jest.setTimeout(30000);
attachManifestGenerator(bundler);
const manifestGen = bundler.listeners('bundled')[0];
bundler.off('bundled', manifestGen);
const testConfig = (config, resultFiles, msg) =>
  test(msg || 'icons are correctly generated', done => {
    // Simulate package.json
    bundler.on('bundled', async bundle => {
      bundle.entryAsset.getPackage = async () => ({
        name: 'tester',
        description: 'test',
        pwaManifest: config,
        pkgdir: join(__dirname, '..')
      });
      await manifestGen(bundle);
      const generatedFiles = readdirSync(outDir);
      expect(generatedFiles).toEqual(expect.arrayContaining(resultFiles));
      done();
    });
  });
for (const conf of testConfigs) {
  testConfig(conf.config, conf.result, conf.msg);
}
bundler.bundle();