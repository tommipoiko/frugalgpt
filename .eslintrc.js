module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'airbnb',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    overrides: [
        {
            env: {
                node: true
            },
            files: [
                '.eslintrc.{js,cjs}'
            ],
            parserOptions: {
                sourceType: 'script'
            }
        },
        {
            files: ['**/*.jsx'],
            rules: {
                // Tailwind class lists routinely exceed 100 cols; keep strict in .js services.
                'max-len': 'off'
            }
        },
        {
            files: ['src/components/Sidenav.jsx'],
            rules: {
                // Rename dialog should focus the input when opened.
                'jsx-a11y/no-autofocus': 'off'
            }
        }
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    rules: {
        indent: ['error', 4],
        'react/jsx-indent': ['error', 4],
        'react/jsx-indent-props': ['error', 4],
        'react/jsx-props-no-spreading': 'off',
        'react/prop-types': 'off',
        'newline-per-chained-call': 'off',
        'no-console': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'off',
        semi: ['error', 'never'],
        'comma-dangle': ['error', 'never'],
        'max-len': ['error', { code: 100 }],
        // Tailwind layouts often wrap inputs in extra elements; nesting checks are noisy.
        'jsx-a11y/label-has-associated-control': 'off'
    },
    settings: {
        react: {
            version: 'detect'
        }
    }
}
