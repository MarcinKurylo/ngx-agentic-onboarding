# Changelog

All notable changes to **ngx-onboarding-flow** are documented here. The
format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-08-01

First public pre-release. A lightweight, config-driven and event-driven
onboarding / product-tour engine for Angular, with a slimmed Driver.js overlay.

### Added

- **Config-driven tours** — describe an entire tour as one typed
  `OnboardingConfig`; no tour code in your components.
- **Event-driven engine** (`OnboardingOrchestrator`) coordinating asynchronous
  transitions: awaiting business events, driving the router, and waiting for
  target elements to appear after loaders. Every stage is cancellable.
- **Business event bus** (`OnboardingEventBus`) with typed lifecycle events.
- **Driver.js renderer** behind an `OnboardingRenderer` seam, run in
  single-step `highlight()` mode so the engine owns progression.
- **Persistence** keyed by tour `id` + `version` (localStorage by default,
  swappable via `ONBOARDING_STORAGE`); `startIfNotCompleted`, `autoStart`,
  `hasCompleted`, `reset`.
- **Theming** via a stable `ngx-onboarding` popover class, `--ngx-ob-*` CSS
  variables (optional `theme.css`), and per-step `popoverClass`.
- **Resilience** — `waitForEvent` timeouts (`waitForEventTimeoutMs` +
  `onWaitTimeout: 'reveal' | 'advance' | 'skip'`) and target-loss recovery
  (re-resolves a detached target, drops the overlay instead of ghosting over
  empty space, closes cleanly if it never returns).
- **Route-aware back navigation** — the engine remembers the route each step
  was shown on and restores it when stepping back; redundant navigations are
  skipped.
- **Conditional steps** via an `enabled` predicate (sync/async), skipped
  without running their hooks; fail-open on error.
- Lifecycle events: `TourStarted/Completed/Skipped`,
  `StepShown/Completed/Skipped/Waiting/WaitTimeout/TargetLost/Error`.

[Unreleased]: https://github.com/MarcinKurylo/ngx-onboarding-flow/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/MarcinKurylo/ngx-onboarding-flow/releases/tag/v0.1.0
