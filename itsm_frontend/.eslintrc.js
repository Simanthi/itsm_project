module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    // Consider adding 'plugin:react-hooks/recommended' if you use hooks extensively
    // Consider adding 'plugin:jsx-a11y/recommended' for accessibility
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['react', '@typescript-eslint'],
  settings: {
    react: {
      version: 'detect', // Automatically detects the React version
    },
  },
  rules: {
    // Common rules to adjust:
    'react/prop-types': 'off', // Not needed with TypeScript
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+ new JSX transform
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Can be useful, but sometimes too verbose
    '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error for 'any'
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warn on unused vars, allow '_' prefix
    // Add or override other rules as needed
    'no-restricted-globals': ['error', 'name', 'length'], // Example: disallow 'name' and 'length' as global variables
    'prefer-const': 'warn', // Suggest using const
    'no-console': 'warn', // Warn about console.log statements
  },
  ignorePatterns: ['node_modules/', 'build/', 'dist/', 'public/'], // Directories to ignore
};
