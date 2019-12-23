const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackPluginPWAManifest = require('.');
const { join } = require('path');
webpack({
  plugins: [new HtmlWebpackPlugin(), new WebpackPluginPWAManifest({
    name: 'epic',
    genIconOpts: {
      baseIcon: './__tests__/sample/icon.svg'
    }
  })],
  entry: join(__dirname, '__tests__', 'sample', 'index.js')
}).run((err, stats) => {});