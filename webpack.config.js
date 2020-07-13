const path = require('path');

const config = {
  entry: {
    index: './index.js',
    'web-worker': './SSEStream.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [{
      test: /\.jsx|.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/env', {
              targets: {
                ie: 11
              }
            }]
          ]
        }
      }
    }]
  },
  devtool: 'none'
};

if(process.env.NODE_ENV === 'development') {
  config.devtool = 'source-map';
  config.devServer = {
    contentBase: path.join(__dirname, 'dist'),
    proxy: {
      '/connection': 'http://localhost:3000'
    },
    compress: true,
    port: 9000,
    hot: true,
  };
}

module.exports = config;
