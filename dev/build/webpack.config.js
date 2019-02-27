import path from 'path';

import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';
import RootDir from 'app-root-dir';
import TerserPlugin from 'terser-webpack-plugin';
import pkg from '../../package.json';

import { log } from './utils';

const rootDir = RootDir.get();

export default function getWebpackConfiguration(config) {
  const { isProduction } = config;
  log({
    title: 'Building Webpack Configuration',
    message: JSON.stringify(config, null, 2),
  });

  return {
    mode: isProduction ? 'production' : 'development',

    devtool: 'source-map',

    entry: [path.resolve(rootDir, './src/index.js')],

    output: {
      path: path.resolve(rootDir, './dist'),
      filename: `${pkg.name}.js`,
      library: pkg.name,
      libraryTarget: 'umd',
      umdNamedDefine: true,
    },

    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': process.env.NODE_ENV,
      }),
    ],
    optimization: {
      minimizer: [
        new TerserPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
          terserOptions: {
            mangle: false,
            compress: false,
          },
        }),
      ],
    },
    module: {
      // strictExportPresence: true,
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          include: [path.resolve(rootDir, './src')],
          use: [
            {
              loader: 'babel-loader',
              options: {
                babelrc: false,
                cacheDirectory: true,
                presets: [
                  [
                    '@babel/preset-env',
                    {
                      modules: false,
                      useBuiltIns: 'usage',
                      shippedProposals: true,
                      targets: {
                        node: '10.15.0',
                        browsers: [
                          // 'last 2 versions',
                          'last 2 Chrome versions',
                          'last 2 Firefox versions',
                          'last 3 Edge versions',
                          'last 1 Safari versions',
                        ],
                      },
                    },
                  ],
                ],
                plugins: [
                  '@babel/plugin-transform-runtime',
                  '@babel/plugin-proposal-class-properties',
                  '@babel/plugin-proposal-optional-chaining',
                ],
              },
            },
            { loader: 'eslint-loader' },
          ],
        },
      ],
    },

    externals: [nodeExternals()],
  };
}
