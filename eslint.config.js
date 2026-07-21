// @ts-check
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        // Node.js globals
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "writable",
        exports: "writable",
        Buffer: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        console: "readonly",
      },
    },
    rules: {
      // Allow console.log in Node.js servers
      "no-console": "off",
      // Warn on unused variables, but ignore those starting with _
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Ignore generated/third-party files
    ignores: ["node_modules/**", "data/**", "migrations/**"],
  },
];
