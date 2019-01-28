import path from 'path';

import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';
import RootDir from 'app-root-dir';
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
    target: 'web',

    devtool: 'inline-source-map',

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
                        browsers: ['last 2 versions'],
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
