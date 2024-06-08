module.exports = {
    root: true,
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    ignorePatterns: ['.eslintrc.cjs', 'static'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
    },
    rules: {
        '@typescript-eslint/switch-exhaustiveness-check': "error",
        '@typescript-eslint/no-unused-vars': "off",
        'prefer-const': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        "@typescript-eslint/no-for-in-array": "error",
        "@typescript-eslint/no-unsafe-declaration-merging": "off",
        "@typescript-eslint/exactOptionalPropertyTypes": "false"
    },
    "overrides": [
        {
            "files": ["tests/**/*"],
            "env": {
                "jest": true
            }
        }
    ]
}