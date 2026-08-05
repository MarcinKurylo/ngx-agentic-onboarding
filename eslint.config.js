// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "ngx-ob",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "ngx-ob",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    // Consumer apps in this repo use the conventional "app" selector prefix,
    // not the library's "ngx-ob" — they are examples of using the package, not
    // part of it. Scope it here so a raw `eslint` run (husky's lint-staged)
    // agrees with `ng lint`, which already applies each project's own config.
    // `examples/` is not an angular.json project at all, so this block is the
    // only thing covering it.
    files: ["projects/demo/**/*.ts", "examples/**/*.ts"],
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "app", style: "camelCase" },
      ],
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "app", style: "kebab-case" },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  }
);
