import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import WebpackPluginPWAManifest from '../index';
import { join } from 'path';
import { readdirSync, readFileSync } from 'fs';
jest.setTimeout(30000);
test('Integrated correctly', async done => {
  const base = join(__dirname, 'sample');
  const out = join(__dirname, 'tmp', Date.now().toString(36));
  await new Promise((res, rej) => {
    webpack({
      mode: 'development',
      plugins: [
        new HtmlWebpackPlugin(),
        new WebpackPluginPWAManifest({
          name: 'epic',
          genIconOpts: {
            baseIcon: join(base, 'icon.svg')
          }
        })
      ],
      output: {
        path: out
      },
      entry: join(base, 'index.js')
    }).run(err => {
      if (err) rej(err);
      else res();
    });
  });
  expect(readdirSync(out)).toMatchSnapshot();
  expect(
    readFileSync(join(out, 'browserconfig.xml')).toString()
  ).toMatchSnapshot();
  expect(readFileSync(join(out, 'index.html')).toString()).toMatchSnapshot();
  expect(
    JSON.parse(readFileSync(join(out, 'manifest.webmanifest')).toString())
  ).toMatchSnapshot();
  done();
});
