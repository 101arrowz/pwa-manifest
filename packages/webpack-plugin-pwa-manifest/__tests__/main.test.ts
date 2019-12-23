import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import WebpackPluginPWAManifest from '../index';
import { join } from 'path';
webpack({
  plugins: [new HtmlWebpackPlugin(), new WebpackPluginPWAManifest({
    name: 'epic',
    genIconOpts: {
      baseIcon: './sample/icon.svg'
    }
  })],
  entry: join(__dirname, 'sample', 'index.js')
}).run((err, stats) => console.log(err, stats));
test('', () => {
  expect(true).toBe(true);
})