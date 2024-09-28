import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import eslint from '@eslint/js';
import PrettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  eslint.configs.recommended,
  PrettierRecommended,
  {
    ignores: [
      'eslint.config.js',
      'core/external/*.js',
      'plugins/external/*.js',
      '**/node_modules',
      '**/build',
      '**/mobile',
      '**/docs',
      '**/json_examples',
      '**/external',
    ],
  },
  {
    plugins: {
      prettier,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jquery,
        ...globals.greasemonkey,
      },

      ecmaVersion: 2024,
      sourceType: 'module',
    },

    rules: {
      eqeqeq: 'error',
      'spaced-comment': 'error',
      'no-unused-expressions': 'error',
    },
  },
  {
    files: ['plugins/*.js'],
    rules: {
      'no-unused-vars': ['error', { vars: 'all', varsIgnorePattern: '^setup|changelog$' }],
    },
  },
];
