
const path = require('path');
const KintonePlugin = require('@kintone/webpack-plugin-kintone-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
  mode: 'production',

  entry: {
    mobile: './src/js/mobile.js',
    config: './src/js/config.js',
    desktop: "./src/ts/main.ts"
  },
  output: {
    path: path.resolve(__dirname, 'plugin', 'js'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json']
  },
  module: {
    rules: [
        {
            test: /\.(ts|js)x?$/, 
            loader: 'babel-loader', 
            exclude: /node_modules/ 
        },
        {
            test: /\.css$/,
            use: ["style-loader", "css-loader"],
        }
    ],
  },
  plugins: [
    new KintonePlugin({
      manifestJSONPath: './plugin/manifest.json',
      privateKeyPath: './private_prod.ppk',
      pluginZipPath: './dist/QRCheckinPlugin.zip'
    }),
    new ForkTsCheckerWebpackPlugin(),
  ],
  cache: true,
  watchOptions: {
      poll: true
  }
};
