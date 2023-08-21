/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ["plugin:react-hooks/recommended", "prettier"],
  env: {
    "cypress/globals": true,
  },
  plugins: ["cypress"],
  // We're using vitest which has a very similar API to jest
  // (so the linting plugins work nicely), but we have to
  // set the jest version explicitly.
  settings: {
    jest: {
      version: 28,
    },
  },
};
