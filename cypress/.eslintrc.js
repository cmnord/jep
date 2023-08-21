/** @type {import('eslint').Linter.Config} */
module.exports = {
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json",
  },
  ignorePatterns: ["*.js"],
};
