# Changelog

All notable changes to **ngx-onboarding-flow** are documented here. The
format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] — 2026-08-05

Documentation only — the engine is byte-identical to 0.1.0. Published because the
README is what npm shows, and 0.1.0's was misleading about the companion skill.

### Changed

- The README no longer implies the `onboarding-author` Claude Code skill arrives
  with the package. It doesn't and can't — Claude Code loads skills from plugins,
  never from `node_modules` — so the page now says so and carries the install
  commands.
- Added a link to the runnable
  [StackBlitz example](https://stackblitz.com/github/MarcinKurylo/ngx-onboarding-flow/tree/main/examples/stackblitz).

## [0.1.0] — 2026-08-05

First public release. A config-driven, event-driven onboarding / product-tour
engine for Angular: describe a whole tour as one typed `OnboardingConfig` and an
async engine coordinates the transitions, painting the overlay with a slimmed
[Driver.js](https://driverjs.com). Components contribute a domain event where the
real action happens; no tour logic lives in them.

Supports **Angular 16.2 through 22** (`@angular/router` optional). The package
ships only injectable services, which is what lets one build serve that range.

### Added

- **`OnboardingOrchestrator`** — the async engine. Steps advance on your business
  events (`waitForEvent`), it drives the router, and it waits for elements to
  appear after loaders. Every stage is cancellable.
- **`OnboardingEventBus`** — the bus your app emits domain events on, plus the
  engine's own typed lifecycle events for analytics.
- **Resilience** — `waitForEvent` timeouts with `onWaitTimeout`, target-loss
  recovery, and route-aware back navigation.
- **Persistence** keyed by tour `id` + `version`, swappable via
  `ONBOARDING_STORAGE`; any number of independent tours per app.
- **Conditional steps** — `enabled` predicates (sync or async) and `optional`
  targets.
- **Theming** — `--ngx-ob-*` CSS variables and a stable popover class, or replace
  the popover UI entirely through the `ONBOARDING_RENDERER` seam.

Full API and options: see the
[library README](./projects/ngx-onboarding-flow/README.md).

[Unreleased]: https://github.com/MarcinKurylo/ngx-onboarding-flow/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/MarcinKurylo/ngx-onboarding-flow/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MarcinKurylo/ngx-onboarding-flow/releases/tag/v0.1.0
