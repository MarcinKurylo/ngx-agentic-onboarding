# ngx-agentic-onboarding

[![CI](https://github.com/MarcinKurylo/ngx-agentic-onboarding/actions/workflows/ci.yml/badge.svg)](https://github.com/MarcinKurylo/ngx-agentic-onboarding/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Lightweight, **config-driven** and **event-driven** onboarding / product-tour
engine for Angular 19+. Describe an entire tour as a single typed object; an
async engine coordinates the transitions — waiting for business events, driving
the router, and waiting for elements to appear after loaders — and paints the
overlay with a slimmed [Driver.js](https://driverjs.com). **No tour code in your
components.**

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

## Repository layout

This is an Angular CLI workspace:

| Path | What |
| --- | --- |
| `projects/ngx-agentic-onboarding` | The publishable library. |
| `projects/demo` | A realistic demo app (loaders, HTTP, modal, dropdown, routing) with three independent tours. |
| `e2e` | Playwright end-to-end tests driving the demo. |

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
