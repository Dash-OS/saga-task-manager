import webpack from 'webpack';
import path from 'path';
import RootDir from 'app-root-dir';
import { exec, log } from './utils';
import webpackConfigurationFactory from './webpack.config';

/*
  Our Factory takes a config object and returns a webpack configuration
*/
const config = {
  isProduction: process.env.NODE_ENV === 'production',
};

const webpackConfig = webpackConfigurationFactory(config);

const rootDir = RootDir.get();

const compiler = webpack(webpackConfig);

log({
  title: 'Starting Build',
  message: 'Starting Webpack Compiltation',
});

exec(`rimraf ${path.resolve(rootDir, 'dist')}`);

compiler.run((err, stats) => {
  if (err) {
    return log({
      title: 'Build Failed',
      message: err.message,
      level: 'error',
    });
  }
  log({
    title: 'Build Complete!',
    message: 'Webpack Build Completed!',
  });
  console.log(stats.toString({ colors: true }));
});
