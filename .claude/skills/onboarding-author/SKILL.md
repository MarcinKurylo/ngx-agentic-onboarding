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
in components. Your job is to read the app, infer the flow, write that config, and
**apply the wiring yourself** — then report what you changed and what's worth a look.

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
   - If the element has no stable hook, **add one yourself** — an `id="…"` (or
     `data-onboarding="…"`) on that element — rather than anchoring to a selector
     that isn't there (it would just time out). Conditionally-rendered elements
     (`@if`, `*ngIf`) are fine as targets *as long as they carry an id*; the engine
     waits for them to appear. Only ask the user when the *choice* of anchor is
     genuinely ambiguous.
   - **Lists (`@for`/`*ngFor`): anchor by identity, not position.** If a step
     targets an item in a list that an *earlier* step's action mutates (e.g. an
     "add" appends a row), don't blindly anchor to `$first`/`$last` — anchor to the
     row the action actually created (often the newly appended one), so you
     highlight what the user just did, not a stale position.
   - A step with **no** `targetSelector` renders as a centered modal — right for
     welcome/finish screens (`placement: 'center'`).

4. **Wire business events (`waitForEvent`).** Search for `bus.emit('EVENT', …)`
   (the injected `OnboardingEventBus`). When a step should pause until the user
   performs a real action, set `waitForEvent: 'THAT_EVENT'`. While waiting, the
   "Next" button is hidden — the user must do the thing.
   - If the action carries data and the step should only advance for a specific
     one, add `eventFilter: (p) => …`.
   - If the app does **not** yet emit an event you need, **add the `bus.emit('…')`
     yourself** — inject `OnboardingEventBus`, emit right after the domain action
     resolves (not before), and use the *exact* same name as the step's
     `waitForEvent`. This is a mechanical edit; just make it. Only ask the user when
     *which* action should gate the step is genuinely unclear.
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

7. **Write the config and apply the wiring — don't hand it back as homework.**
   Create `onboarding.config.ts` and *make* the mechanical edits yourself:
   `provideOnboarding()`, the style imports, the `id`/`data-*` hooks, the
   `bus.emit(…)` calls, and a trigger (see Output). Reserve the closing summary for
   (a) what you changed in the user's code and (b) genuine decisions/assumptions to
   eyeball — never a to-do list of edits you could have made.

8. **Build it.** Run the app's build (`ng build` / `npm run build`) and fix what it
   flags. It won't prove events fire, but it catches import/typo breakage — closing
   the loop is part of the job, not a hope. Then tell the user what to click to see
   it live.

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
  // ⚠️ Typed here but the Driver renderer IGNORES them — dead config in `options`.
  // Set labels + closeOnBackdropClick in provideOnboarding() instead (see below).
  nextLabel?: string; prevLabel?: string; skipLabel?: string; doneLabel?: string;
  closeOnBackdropClick?: boolean;
}
```

### Resilience — the event advances, the timeout only rescues

- **The business event is the advancement mechanism — always.** Design steps to
  move on when the real thing happens (step 4). Never use a timer to pace a tour
  along; if you catch yourself relying on the timeout to advance, the event wiring
  is wrong.
- **The timeout is a safety net, not a plan.** Its only job is to stop a user being
  stranded forever when an event *doesn't* fire (mis-wired name, an action the user
  can't/won't do, element gone). Prefer `onWaitTimeout: 'reveal'` — it just surfaces
  "Next" and loses nothing. Reach for `'advance'`/`'skip'` only as a deliberate last
  resort, never the default flow.
- **Set it generously — it should almost never fire.** A too-short budget with
  `'reveal'` looks exactly like a hang: "Next" pops up before the user finished,
  masking a *missing* emit as "slow UI". Floor it above the real action time (click
  ~10–15 s, type-then-submit ~40–60 s, plus network) and err long. First make sure
  the event is actually wired — a good timeout never excuses a bad emit.
- The engine already recovers a highlighted target that re-renders away, and
  restores the route when stepping **back** to a step shown on an earlier route.
  You don't configure these — just don't fight them with manual timers.

### Labels & look — set in provideOnboarding(), not the config

Button labels and overlay styling belong in the renderer config passed to
`provideOnboarding()`. The trap: `nextLabel`/`prevLabel`/`skipLabel`/`doneLabel`
and `closeOnBackdropClick` are **also typed on `OnboardingOptions`**, so putting
them in `config.options` compiles cleanly and then **silently does nothing** — the
Driver renderer never reads them there. Always set them in `provideOnboarding()`.

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

**2. Wiring** — apply these yourself where missing:

- `provideOnboarding({ … })` in `app.config.ts`. Import the stylesheets too:
  `driver.js/dist/driver.css` and (optional) `ngx-agentic-onboarding/styles/theme.css`.
  In an Angular app the reliable place is the **`styles` array in `angular.json`**;
  a `@import` in `styles.scss` also works but is easier to get wrong — verify it
  actually loaded (the popover renders unstyled if it didn't).
- The `bus.emit('EVENT', payload?)` calls every `waitForEvent` step depends on —
  from the injected `OnboardingEventBus`, **after** the real action resolves, names
  matching the config exactly.
- A trigger. For a first-run tour prefer `autoStart(cfg)` — but it only fires when
  the config sets **`startImmediately: true`** *and* the tour isn't already
  persisted as seen. Since completion is remembered (localStorage), **also add a
  manual replay** (a small button calling `reset(cfg)` then `start(cfg)`), or set
  `persist: false` until the tour is accepted — otherwise it runs once per browser
  profile and you can't re-check it while iterating.

Close by reporting **what you changed in the user's code** and any **decisions or
assumptions worth eyeballing** (timing, conditional targets) — not a to-do list of
mechanical edits, which you should already have made.

## Honesty & quality bar

- Never invent a selector or an event that isn't in the code. Missing hook →
  propose the exact edit; don't paper over it.
- Keep tours short and linear; branch with `enabled`, not by forking configs.
- Prefer stable `id`/`data-*` over classes; call out anything brittle.
- Advance on the event; keep a generous `reveal` timeout only as a safety net,
  never as pacing. Every cross-route step gets `navigateToRoute`. Centered steps
  get `placement: 'center'` and no selector.
- Close the loop: build it (step 8) and give the user a way to replay the tour;
  never rely on a one-shot auto-start you can't trigger again.
- State plainly that the result is a draft to run and eyeball, especially for
  timing and conditionally-rendered targets.
