module.exports = api => {
  console.info('[BABEL] | Gets Configuration');

  api.cache(true);

  return {
    presets: [
      [
        '@babel/preset-env',
        {
          useBuiltIns: 'usage',
          shippedProposals: true,
          targets: {
            node: '10.15.0',
            browsers: [
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
      // 'babel-plugin-redux-saga',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-optional-chaining',
    ],
  };
};
