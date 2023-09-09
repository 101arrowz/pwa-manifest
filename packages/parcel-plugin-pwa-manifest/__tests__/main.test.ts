/// <reference types="../types" />

// TODO: fix

/*
import Bundler from 'parcel-bundler';
import { resolve } from 'path';
import attachManifestGenerator from '../index';
import { readdirSync, readFileSync } from 'fs';
const outDir = resolve(__dirname, 'tmp', Date.now().toString(36));
const bundler = new Bundler(resolve(__dirname, 'sample', 'index.html'), {
  outDir,
  contentHash: true,
  watch: false
});
attachManifestGenerator(bundler as FullBundler);
jest.setTimeout(10000);
test('Integrated correctly', done => {
  new Promise<void>(res =>
    bundler.on('buildEnd', () => {
      expect(readdirSync(outDir)).toMatchSnapshot();
      expect(
        readFileSync(resolve(outDir, 'index.html')).toString()
      ).toMatchSnapshot();
      expect(
        readFileSync(resolve(outDir, 'browserconfig.xml')).toString()
      ).toMatchSnapshot();
      expect(
        JSON.parse(
          readFileSync(resolve(outDir, 'manifest.webmanifest')).toString()
        )
      ).toMatchSnapshot();
      res();
    })
  ).then(done);
});
bundler.bundle();
*/

test.skip('TODO', () => {})