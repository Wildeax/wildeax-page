import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // src/play/sync.tsx is the seam over playhtml. A seam nobody enforces stops
    // being a seam within two months, at which point swapping the backend means
    // touching every component instead of one file.
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/play/sync.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'playhtml',
            message: 'Import from @/play instead. Only src/play/sync.tsx may import playhtml.',
          },
          {
            name: '@playhtml/react',
            message: 'Import from @/play instead. Only src/play/sync.tsx may import playhtml.',
          },
        ],
      }],
    },
  },
])
