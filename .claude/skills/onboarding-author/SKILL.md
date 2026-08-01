---
name: onboarding-author
description: >-
  Author an ngx-agentic-onboarding tour (a typed OnboardingConfig) for an Angular
  app by scanning its routes, template ids, and event-bus emissions instead of
  hand-writing selectors. Use whenever the user wants to create, generate, extend,
  or wire up a product tour / user onboarding / walkthrough for an Angular project
  that uses (or is adopting) ngx-agentic-onboarding. Triggers: "onboarding tour",
  "product tour", "walkthrough", "generate OnboardingConfig", "add onboarding to
  my app", "wire up provideOnboarding".
---

# Authoring an ngx-agentic-onboarding tour

You are turning an existing Angular app into a working onboarding tour **from its
own code**. The whole tour is one typed `OnboardingConfig` object — no tour logic
in components. Your job is to read the app, infer the flow, and emit that config
plus the minimal wiring, then hand the user a draft to review.

This is **assisted authoring, not magic.** You infer statically; timing and
dynamic DOM are confirmed by the developer at runtime. Say so, and flag every
assumption you make.

## When this applies

The app uses `ngx-agentic-onboarding` (or is adopting it). It renders tours with a
slimmed Driver.js overlay behind an `OnboardingOrchestrator` that coordinates
async transitions: waiting for business events, driving the router, and waiting
for elements to appear after loaders.

## Procedure

Work in this order. Prefer the repo's real tools (routes file, template search)
over guessing.

1. **Establish the flow.** Use what the user described; if they didn't, propose a
   sensible first-run flow (welcome → primary action → payoff/dashboard → done).
   Keep tours short (4–8 steps). One `OnboardingConfig` per distinct flow.

2. **Map routes.** Read the routing config (e.g. `app.routes.ts`) to learn which
   component owns each screen. A step that lives on a different route than the one
   before it gets `navigateToRoute: '/that-path'`. The engine navigates, then
   waits for the target to appear — you do **not** need manual delays for routing.

3. **Find anchors (`targetSelector`).** Search templates for stable ids
   (`id="…"`) or `data-*` hooks on the elements each step should highlight. Prefer
   an existing `id`; a class is a fallback but warn it's brittle.
   - If the element you want is rendered **conditionally** (`@if`, `*ngIf`) or has
     no stable hook, **do not invent one silently** — tell the user and propose
     adding `id="…"` (or `data-onboarding="…"`) to that element, showing the exact
     line. A selector that isn't in the DOM will just time out.
   - A step with **no** `targetSelector` renders as a centered modal — right for
     welcome/finish screens (`placement: 'center'`).

4. **Wire business events (`waitForEvent`).** Search for `bus.emit('EVENT', …)`
   (the injected `OnboardingEventBus`). When a step should pause until the user
   performs a real action, set `waitForEvent: 'THAT_EVENT'`. While waiting, the
   "Next" button is hidden — the user must do the thing.
   - If the action carries data and the step should only advance for a specific
     one, add `eventFilter: (p) => …`.
   - If the app does **not** yet emit an event you need, don't fabricate a
     selector-click workaround — tell the user which `bus.emit('…')` to add and
     where (right after the domain action resolves, not before).
   - Always pair a `waitForEvent` with a safety timeout (see resilience below) so
     a user is never stranded on an event that never fires.

5. **Handle async DOM (loaders).** If the target appears after a spinner /
   `@if (loading())` / an HTTP call, the engine already polls for it
   (`waitForSelectorTimeoutMs`, default 5000 ms). Only add `delayMs` when an
   **entry animation** needs to settle after the element exists. Bump
   `waitForSelectorTimeoutMs` on a step if a request is genuinely slow.

6. **Conditional steps (`enabled`).** If a step only applies to some users (plan,
   role, feature flag), give it `enabled: (ctx) => <predicate>` (sync or async).
   A falsy result skips the step entirely — its hooks never run — and the engine
   continues in the direction of travel. Fail-open: if the predicate throws, the
   step is shown.

7. **Emit the config + wiring.** Produce `onboarding.config.ts` and the
   `provideOnboarding()` call (see Output). List every `id`/`bus.emit` you asked
   the user to add, as a checklist.

## The schema (authoritative)

```ts
interface OnboardingConfig {
  version: string;              // semver — bump to re-show a persisted tour
  id?: string;                  // required for persistence + multi-tour
  steps: readonly OnboardingStep[];
  startImmediately?: boolean;   // auto-start (guarded by persistence). default false
  persist?: boolean;            // remember completion in localStorage. default true
  options?: OnboardingOptions;  // TIMING/BEHAVIOUR only (labels live elsewhere — see below)
}

interface OnboardingStep {
  id: string;                       // stable, unique within the tour
  targetSelector?: string;          // element to highlight; omit for a centered step
  title?: string;
  content?: string;                 // popover body (plain text)
  placement?: 'top'|'top-start'|'top-end'|'bottom'|'bottom-start'|'bottom-end'
            |'left'|'right'|'auto'|'center';  // 'center' = element-less modal
  enabled?: (ctx: {step; index; total}) => boolean | Promise<boolean>;  // skip when false

  // async / event-driven control
  waitForEvent?: string;            // pause until this event fires on the bus; hides "Next"
  eventFilter?: (payload: unknown) => boolean;   // only advance on a matching payload
  waitForEventTimeoutMs?: number;   // per-step override; 0 = wait forever
  navigateToRoute?: string;         // navigate, then wait for the target
  waitForSelectorTimeoutMs?: number;// per-step DOM wait override
  delayMs?: number;                 // settle delay AFTER the target resolves (animations)

  // interaction toggles
  showNext?: boolean;               // default true (unless waitForEvent is set)
  showPrev?: boolean;               // default true except on the first step
  allowSkip?: boolean;              // default true
  optional?: boolean;               // silently skip if the target never resolves

  // awaited lifecycle hooks
  beforeStep?: (ctx) => void | Promise<void>;
  afterStep?:  (ctx) => void | Promise<void>;

  popoverClass?: string;            // extra CSS class for theming this step
}

interface OnboardingOptions {       // tour-wide timing/behaviour + defaults
  waitForSelectorTimeoutMs?: number;// default 5000
  selectorPollIntervalMs?: number;  // default 100
  abortOnMissingTarget?: boolean;   // default false (error + stop, don't crash)
  waitForEventTimeoutMs?: number;   // default 0 (forever)
  onWaitTimeout?: 'reveal'|'advance'|'skip';  // default 'reveal'
}
```

### Resilience defaults to apply

- Give event-gated tours a budget: set `options.waitForEventTimeoutMs` (e.g.
  8000) with `onWaitTimeout: 'reveal'` so a missing event reveals "Next" instead
  of hanging. Override per step with `waitForEventTimeoutMs`.
- The engine already recovers a highlighted target that re-renders away, and
  restores the route when stepping **back** to a step shown on an earlier route.
  You don't configure these — just don't fight them with manual timers.

### Labels & look — NOT in the config

Button labels and overlay styling live in the renderer, passed to
`provideOnboarding()`, **not** in `config.options`. Do not put `nextLabel` etc.
into a step or into `options` — it is ignored there.

```ts
// app.config.ts
provideOnboarding({
  nextLabel: 'Dalej', prevLabel: 'Wstecz', doneLabel: 'Zakończ',
  overlayOpacity: 0.6, stagePadding: 10, closeOnBackdropClick: false,
});
```

## Output

Emit two things.

**1. `onboarding.config.ts`** — the typed config:

```ts
import { OnboardingConfig } from 'ngx-agentic-onboarding';

export const appOnboarding: OnboardingConfig = {
  version: '1.0.0',
  id: 'main',
  options: { waitForEventTimeoutMs: 8000, onWaitTimeout: 'reveal' },
  steps: [
    { id: 'welcome', targetSelector: '#welcome', title: 'Witaj', placement: 'bottom' },
    { id: 'create', targetSelector: '#new-project', title: 'Utwórz projekt',
      waitForEvent: 'PROJECT_CREATED' },
    { id: 'stats', targetSelector: '#chart', navigateToRoute: '/dashboard',
      title: 'Twój panel', placement: 'left' },
    { id: 'done', title: 'Gotowe 🎉', placement: 'center', popoverClass: 'step-finish' },
  ],
};
```

**2. Wiring** — only what's missing:

- `provideOnboarding({ … })` in `app.config.ts` (with `driver.js/dist/driver.css`
  imported once in global styles), if not already present.
- A trigger: inject `OnboardingOrchestrator` and call `start(appOnboarding)` /
  `startIfNotCompleted(appOnboarding)` / `autoStart(appOnboarding)`.
- Reminders for every `bus.emit('EVENT', payload?)` the config's `waitForEvent`
  steps depend on — emitted from the injected `OnboardingEventBus` **after** the
  real action resolves.

Finish with a **checklist** of edits the user must make in their own code (ids to
add, events to emit), separated from the config you generated.

## Honesty & quality bar

- Never invent a selector or an event that isn't in the code. Missing hook →
  propose the exact edit; don't paper over it.
- Keep tours short and linear; branch with `enabled`, not by forking configs.
- Prefer stable `id`/`data-*` over classes; call out anything brittle.
- Every `waitForEvent` gets a timeout. Every cross-route step gets
  `navigateToRoute`. Centered steps get `placement: 'center'` and no selector.
- State plainly that the result is a draft to run and eyeball, especially for
  timing and conditionally-rendered targets.
