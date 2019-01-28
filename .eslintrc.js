module.exports = {
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 10,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true,
      jsx: true,
    },
  },
  extends: ['airbnb', 'plugin:prettier/recommended'],
  env: {
    browser: true,
  },
  globals: {
    debug: true,
  },
  rules: {
    'import/prefer-default-export': 'off',
    'no-use-before-define': 'off',
    'no-console': 'off',
    'no-underscore-dangle': 'off',
    'comma-dangle': ['error', 'always-multiline'],
    'consistent-return': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: ['dev/**'] },
    ],
  },
  plugins: ['promise', 'prettier'],
};
