// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // React Native does not need HTML entity escaping inside <Text>
      'react/no-unescaped-entities': 'off',
    },
  },
]);
