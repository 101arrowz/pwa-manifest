/// <reference types="../types" />

import Bundler from 'parcel-bundler';
import { resolve } from 'path';
import attachManifestGenerator from '../index';
import { readdirSync, readFileSync } from 'fs';
import { EventEmitter } from 'events';
import ParcelBundler from 'parcel-bundler';
const outDir = resolve(__dirname, 'tmp', Date.now().toString(36));
const bundler = new Bundler(resolve(__dirname, 'sample', 'index.html'), {
  outDir,
  contentHash: true,
  watch: false
}) as ParcelBundler & EventEmitter;
attachManifestGenerator(bundler as FullBundler);
jest.setTimeout(10000);
test.concurrent('Correct file list', () => {
  return new Promise(res =>
    bundler.on('pwaBuildEnd', () => {
      expect(readdirSync(outDir)).toMatchSnapshot();
      res();
    })
  );
});
test.concurrent('Correct HTML file', () => {
  return new Promise(res =>
    bundler.on('pwaBuildEnd', () => {
      expect(
        readFileSync(resolve(outDir, 'index.html')).toString()
      ).toMatchSnapshot();
      res();
    })
  );
});
test.concurrent('Correct browserconfig.xml', () => {
  return new Promise(res =>
    bundler.on('pwaBuildEnd', () => {
      expect(
        readFileSync(resolve(outDir, 'browserconfig.xml')).toString()
      ).toMatchSnapshot();
      res();
    })
  );
});
test.concurrent('Correct manifest generation', () => {
  return new Promise(res =>
    bundler.on('pwaBuildEnd', () => {
      expect(
        JSON.parse(
          readFileSync(resolve(outDir, 'manifest.webmanifest')).toString()
        )
      ).toMatchSnapshot();
      res();
    })
  );
});
bundler.bundle();
