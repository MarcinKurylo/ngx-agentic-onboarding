# ngx-onboarding-flow

[![CI](https://github.com/MarcinKurylo/ngx-onboarding-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/MarcinKurylo/ngx-onboarding-flow/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Live demo](https://img.shields.io/badge/demo-live-6f42c1)](https://marcinkurylo.github.io/ngx-onboarding-flow/)

**Describe the whole tour once, as data. The engine handles the async.**

A product tour is easy to fake and hard to ship. The fake one walks a static page,
selector by selector. The real one has to wait for a list to finish loading, follow
the user into a modal, change route halfway through, and pause until they actually
click *Save*. That's the point where tour logic starts leaking into the app: a flag
in a service, a subscription in a component, an `if (tour.step === 4)` in a template
that nobody dares to delete a year later.

`ngx-onboarding-flow` keeps it out. The entire flow is one typed `OnboardingConfig`,
and an async engine coordinates the transitions — waiting for your business events,
driving the router, waiting for elements to appear after loaders, re-anchoring when
a re-render tears the highlighted element away. Your components just emit the domain
events they were emitting anyway. **No tour code in your components.**

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

That object *is* the tour. Angular 16.2 through 22; the overlay is painted with a
slimmed [Driver.js](https://driverjs.com).

▶ **[Live demo](https://marcinkurylo.github.io/ngx-onboarding-flow/)** — four
independent tours over a realistic async app (loaders, a modal, routing and CDK overlays).

## You don't have to write that config by hand

A tour config is only as good as its selectors, and hand-picking them means grepping
templates for ids that may not exist yet. So the library ships with a companion
**Claude Code skill**, `onboarding-author`: it reads the app itself — routes, template
ids, event-bus emissions — proposes a flow, writes the typed config and wires up
`provideOnboarding` for you, flagging every assumption it had to make.

This repo doubles as a **Claude Code marketplace**, so you can install the skill into
any project:

```
/plugin marketplace add MarcinKurylo/ngx-onboarding-flow
/plugin install ngx-onboarding-flow@marcinkurylo
```

Then just ask for a tour ("add onboarding to my app") and Claude runs the skill, or
invoke it explicitly as `/ngx-onboarding-flow:onboarding-author`. No pinned
`version`, so the plugin tracks `main` — `/plugin update` pulls the latest skill.

<details><summary>Layout &amp; validation</summary>

- Marketplace catalog: `.claude-plugin/marketplace.json`
- Plugin: `plugins/onboarding-author/` (manifest in `.claude-plugin/plugin.json`). Its
  `skills/onboarding-author` **symlinks** the canonical `.claude/skills/onboarding-author`,
  so the skill has a single source of truth; the symlink is dereferenced into the
  plugin cache on install.
- Validate before publishing: `/plugin validate ./plugins/onboarding-author`.
</details>

## What the engine handles for you

- **One declarative config** — the whole flow lives in data, not components.
- **Event-driven** — steps pause until your app emits a domain event on the bus.
- **Async-aware** — routing, post-loader elements and lifecycle hooks are awaited
  and cancellable.
- **Resilient** — `waitForEvent` timeouts, target-loss recovery (no ghost
  highlights), route-aware back navigation.
- **Conditional steps** — per-user/context `enabled` predicates (sync or async).
- **Persistence** per tour `id` + `version`; multiple independent tours per app.
- **Themeable** — stable popover class + `--ngx-ob-*` CSS variables, or swap the
  whole popover UI via the `ONBOARDING_RENDERER` seam.
- **SSR-safe** and framework-idiomatic (Angular Signals).

## Documentation

The full API, options and theming guide live in the library README:

➡️ **[projects/ngx-onboarding-flow/README.md](./projects/ngx-onboarding-flow/README.md)**

## Repository layout

This is an Angular CLI workspace:

| Path | What |
| --- | --- |
| `projects/ngx-onboarding-flow` | The publishable library. |
| `projects/demo` | A realistic demo app (loaders, HTTP, modal, dropdown, routing, CDK overlays) with four independent tours. |
| `e2e` | Playwright end-to-end tests driving the demo. |
| `.claude-plugin` / `plugins` | Claude Code marketplace catalog + the `onboarding-author` skill packaged as a plugin. |
| `.claude/skills/onboarding-author` | The skill itself (canonical copy; the plugin symlinks it). |

## Develop

```bash
npm install

npm start            # serve the demo app -> http://localhost:4200
npm run build        # build the library -> dist/ngx-onboarding-flow
npm run build:demo   # build the demo app

# unit + integration tests (Karma/Jasmine) — set CHROME_BIN to your Chrome
CHROME_BIN=/path/to/chrome npm test
npm run test:coverage           # same, with coverage thresholds (as in CI)

npm run e2e          # end-to-end tests (Playwright, uses system Chrome)
```

## License

[MIT](./LICENSE) © Marcin Kuryło
