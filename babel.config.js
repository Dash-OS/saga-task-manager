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
