# Contributing

Thanks for looking. This is a small, opinionated library — issues and PRs are
welcome, and the notes below cover the two or three things about this repo that
aren't obvious from the file tree.

## The one thing that will trip you up

`tsconfig.json` maps the package name to the **built** library:

```jsonc
"paths": { "ngx-onboarding-flow": ["./dist/ngx-onboarding-flow"] }
```

So the demo app and the whole test suite consume `dist/`, exactly the way a real
consumer would — which is what makes the compatibility matrix meaningful. The
cost is a build step you have to remember:

```bash
npm install
npm run build        # <- before anything else, and after every lib change
```

Skip it on a fresh clone and `npm start` / `npm test` fail on module resolution.
Editing something under `projects/ngx-onboarding-flow`? Rebuild (or keep
`npm run watch` running) before you trust a test result.

## Running things

```bash
npm start                        # serve the demo -> http://localhost:4200
npm run build                    # build the library -> dist/ngx-onboarding-flow
npm run watch                    # rebuild the library on change
npm run build:demo               # build the demo app

CHROME_BIN=/path/to/chrome npm test          # unit + integration (Karma/Jasmine)
CHROME_BIN=/path/to/chrome npm run test:coverage   # same, with CI's thresholds

npm run e2e                      # Playwright; uses your system Chrome
npm run lint
```

Karma needs `CHROME_BIN` pointed at a Chrome binary. Playwright uses the
system Chrome (`channel: 'chrome'`), so there's no browser download — and its
`webServer` builds the library itself before serving the demo, so `npm run e2e`
is safe to run cold.

Coverage thresholds are enforced, not advisory: statements 80, branches 62,
functions 78, lines 82. `npm run test:coverage` is what CI runs.

## Workflow

`main` is protected — no direct pushes, for anyone. Branch, open a PR, get the
three required checks green (Lint, Unit & integration, E2E), then merge.

A pre-commit hook lints staged `.ts`/`.html` via lint-staged.

Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `ci:`,
`chore:`, `refactor!:` for breaking changes), optionally scoped — `fix(demo):`,
`ci(pages):`.

Two workflows are **on demand** rather than per-PR, because they're slow or
consequential:

- **`compat-matrix.yml`** (`workflow_dispatch`) compiles a fresh consumer app
  against every supported Angular major, 16.2 → 22. Run it when you touch the
  public API, peer ranges, or anything version-sensitive.
- **`release.yml`** fires on a `v*` tag. The publish step is currently
  commented out on purpose — see the checklist inside the file.

## Where things live

| Path | What |
| --- | --- |
| `projects/ngx-onboarding-flow` | The published library. Services only — no components or directives, which is why the package supports such a wide Angular range. |
| `projects/demo` | The demo app, also deployed to GitHub Pages. |
| `e2e` | Playwright specs driving the demo. |
| `.claude/skills/onboarding-author` | The `onboarding-author` skill — **canonical copy**. |
| `plugins/onboarding-author` | The same skill packaged as a Claude Code plugin. |

Public API changes go through `projects/ngx-onboarding-flow/src/public-api.ts`;
it's deliberately explicit, so a new export is a conscious act.

**The plugin's skill is a symlink, not a copy.**
`plugins/onboarding-author/skills/onboarding-author` points at
`.claude/skills/onboarding-author`. Edit the canonical file; don't create a second
copy under `plugins/` to keep them "in sync".

## Scope

The library ships no components on purpose — the popover UI is a swappable seam
(`ONBOARDING_RENDERER`), and the compiled package declaring only injectables is
what lets one build serve Angular 16.2 through 22. PRs adding components to the
public surface are a hard sell; a renderer implementation in your own app is the
supported path.

## Changelog

User-visible changes get an entry under `[Unreleased]` in `CHANGELOG.md`
(Keep a Changelog format). Docs-only and CI-only PRs don't need one.
