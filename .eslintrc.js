module.exports = {
    extends: 'eslint:recommended',
    ignorePatterns: ['.eslintrc.js', 'backend/node_modules/**'],
    overrides: [
        {
            // Frontend browser scripts loaded as classic <script> tags (not ES modules).
            // Top-level declarations are global-scoped, so no /* exported */ comments needed.
            files: ['frontend/**/*.js'],
            env: { browser: true, es2021: true },
            parserOptions: { ecmaVersion: 12, sourceType: 'script' },
            globals: {
                // wt-base-element.js
                WatchTowerBaseElement: 'writable',
                // auth.js
                watchtowerLogout: 'readonly',
                // utils.js
                getStoredUser: 'readonly',
                escapeHtml: 'readonly',
                average: 'readonly',
                isStaticFrontendPreview: 'readonly',
                getFieldError: 'readonly',
                setFieldError: 'readonly',
                getEmailError: 'readonly',
                attachFieldValidation: 'readonly',
            },
            rules: {
                // Only flag unused variables in local (function) scope — top-level globals
                // are intentionally shared across script tags on the same page.
                'no-unused-vars': ['error', { vars: 'local' }],
                // builtinGlobals: false so that defining a class/function that is also
                // declared as a config-level global does not trigger no-redeclare.
                'no-redeclare': ['error', { builtinGlobals: false }],
            },
        },
        {
            // Backend Node.js source files (ES modules)
            files: ['backend/**/*.js'],
            excludedFiles: ['backend/tests/**/*.js'],
            env: { node: true, es2022: true },
            parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        },
        {
            // Backend test files (ES modules, Jest, top-level await)
            files: ['backend/tests/**/*.js'],
            env: { node: true, es2022: true, jest: true },
            parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        },
    ],
};