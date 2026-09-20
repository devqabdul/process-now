import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const byType = (types) => types.map((type) => ({ element: { type } }));
const policy = (from, disallow) => ({
  from: byType(from),
  disallow: byType(disallow).map((to) => ({ to })),
});

export default tseslint.config(
  { ignores: ['build', 'dev-dist', 'coverage'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      prettier,
    ],
    languageOptions: { globals: globals.browser },
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: true },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app' },
        { type: 'api', pattern: 'src/api' },
        { type: 'pages', pattern: 'src/pages' },
        { type: 'layouts', pattern: 'src/components/layouts' },
        { type: 'sections', pattern: 'src/components/sections' },
        { type: 'shared', pattern: 'src/components/shared' },
        { type: 'ui', pattern: 'src/components/ui' },
        { type: 'lib', pattern: 'src/lib' },
        { type: 'hooks', pattern: 'src/hooks' },
        { type: 'utils', pattern: 'src/utils' },
        { type: 'constants', pattern: 'src/constants' },
        { type: 'types', pattern: 'src/types' },
        { type: 'test', pattern: 'src/test' },
      ],
    },
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      // ui → shared → sections → layouts → pages; foundations never import components or pages.
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          policies: [
            policy(
              ['lib', 'utils', 'constants', 'api', 'types', 'hooks'],
              ['ui', 'shared', 'sections', 'layouts', 'pages'],
            ),
            policy(['ui'], ['shared', 'sections', 'layouts', 'pages', 'app']),
            policy(['shared'], ['sections', 'layouts', 'pages', 'app']),
            policy(['sections'], ['layouts', 'pages', 'app']),
            policy(['layouts'], ['pages', 'app']),
          ],
        },
      ],
    },
  },
);
