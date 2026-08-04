# ngx-agentic-onboarding

[![CI](https://github.com/MarcinKurylo/ngx-agentic-onboarding/actions/workflows/ci.yml/badge.svg)](https://github.com/MarcinKurylo/ngx-agentic-onboarding/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Live demo](https://img.shields.io/badge/demo-live-6f42c1)](https://marcinkurylo.github.io/ngx-agentic-onboarding/)

Lightweight, **config-driven** and **event-driven** onboarding / product-tour
engine for Angular 16.2+. Describe an entire tour as a single typed object; an
async engine coordinates the transitions — waiting for business events, driving
the router, and waiting for elements to appear after loaders — and paints the
overlay with a slimmed [Driver.js](https://driverjs.com). **No tour code in your
components.**

▶ **[Live demo](https://marcinkurylo.github.io/ngx-agentic-onboarding/)** — four
independent tours over a realistic async app (loaders, a modal, routing and CDK overlays).

```ts
export const tour: OnboardingConfig = {
  version: '1.0.0', id: 'main',
  steps: [
    { id: 'welcome', targetSelector: '#welcome', title: 'Hi!' },
    { id: 'create',  targetSelector: '#save', waitForEvent: 'SAVED' }, // pauses for your app
    { id: 'stats',   targetSelector: '#chart', navigateToRoute: '/dashboard' },
  ],
};
```

## Highlights

- **One declarative config** — the whole flow lives in data, not components.
- **Event-driven** — steps pause until your app emits a domain event on the bus.
- **Async-aware** — routing, post-loader elements and lifecycle hooks are awaited
  and cancellable.
- **Resilient** — `waitForEvent` timeouts, target-loss recovery (no ghost
  highlights), route-aware back navigation.
- **Conditional steps** — per-user/context `enabled` predicates (sync or async).
- **Persistence** per tour `id` + `version`; multiple independent tours per app.
- **Themeable** — stable popover class + `--ngx-ob-*` CSS variables.
- **SSR-safe** and framework-idiomatic (Angular Signals).

## Documentation

The full API, options and theming guide live in the library README:

➡️ **[projects/ngx-agentic-onboarding/README.md](./projects/ngx-agentic-onboarding/README.md)**

## Onboarding-author skill (Claude Code plugin)

This repo doubles as a **Claude Code marketplace**. The companion `onboarding-author`
skill — it generates a tour from an Angular app's routes, template ids and
event-bus emissions instead of hand-written selectors — is packaged as a plugin you
can install into any project:

```
/plugin marketplace add MarcinKurylo/ngx-agentic-onboarding
/plugin install ngx-agentic-onboarding@marcinkurylo
```

Then just ask for a tour ("add onboarding to my app") and Claude runs the skill, or
invoke it explicitly as `/ngx-agentic-onboarding:onboarding-author`. No pinned
`version`, so the plugin tracks `main` — `/plugin update` pulls the latest skill.

<details><summary>Layout &amp; validation</summary>

- Marketplace catalog: `.claude-plugin/marketplace.json`
- Plugin: `plugins/onboarding-author/` (manifest in `.claude-plugin/plugin.json`). Its
  `skills/onboarding-author` **symlinks** the canonical `.claude/skills/onboarding-author`,
  so the skill has a single source of truth; the symlink is dereferenced into the
  plugin cache on install.
- Validate before publishing: `/plugin validate ./plugins/onboarding-author`.
</details>

## Repository layout

This is an Angular CLI workspace:

| Path | What |
| --- | --- |
| `projects/ngx-agentic-onboarding` | The publishable library. |
| `projects/demo` | A realistic demo app (loaders, HTTP, modal, dropdown, routing, CDK overlays) with four independent tours. |
| `e2e` | Playwright end-to-end tests driving the demo. |
| `.claude-plugin` / `plugins` | Claude Code marketplace catalog + the `onboarding-author` skill packaged as a plugin. |
| `.claude/skills/onboarding-author` | The skill itself (canonical copy; the plugin symlinks it). |

## Develop

```bash
npm install

npm start            # serve the demo app -> http://localhost:4200
npm run build        # build the library -> dist/ngx-agentic-onboarding
npm run build:demo   # build the demo app

# unit + integration tests (Karma/Jasmine) — set CHROME_BIN to your Chrome
CHROME_BIN=/path/to/chrome npm test
npm run test:coverage           # same, with coverage thresholds (as in CI)

npm run e2e          # end-to-end tests (Playwright, uses system Chrome)
```

## License

[MIT](./LICENSE) © Marcin Kuryło
