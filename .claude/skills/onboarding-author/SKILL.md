---
name: onboarding-author
description: >-
  Author an ngx-onboarding-flow tour (a typed OnboardingConfig) for an Angular
  app by scanning its routes, template ids, and event-bus emissions instead of
  hand-writing selectors. Use whenever the user wants to create, generate, extend,
  or wire up a product tour / user onboarding / walkthrough for an Angular project
  that uses (or is adopting) ngx-onboarding-flow. Triggers: "onboarding tour",
  "product tour", "walkthrough", "generate OnboardingConfig", "add onboarding to
  my app", "wire up provideOnboarding".
---

# Authoring an ngx-onboarding-flow tour

You are turning an existing Angular app into a working onboarding tour **from its
own code**. The whole tour is one typed `OnboardingConfig` object — no tour logic
in components. Your job is to read the app, infer the flow, write that config, and
**apply the wiring yourself** — then report what you changed and what's worth a look.

This is **assisted authoring, not magic.** You infer statically; timing and
dynamic DOM are confirmed by the developer at runtime. Say so, and flag every
assumption you make.

## When this applies

The app uses `ngx-onboarding-flow` (or is adopting it). It renders tours with a
slimmed Driver.js overlay behind an `OnboardingOrchestrator` that coordinates
async transitions: waiting for business events, driving the router, and waiting
for elements to appear after loaders.

## Procedure

Work in this order. Prefer the repo's real tools (routes file, template search)
over guessing.

**Read the stack before you apply any version-specific rule.** Open `package.json`
and note the `@angular/core` and `@angular/cdk` versions. This skill supports
Angular 16.2–22, and guidance below that names a version (the `@defer` and CDK
top-layer rules, both in step 5) applies **only** above that floor. On an older stack the
"fix" is usually an import that doesn't exist yet — a build failure, not a
no-op. Verify, then decide; never apply a version-gated rule from memory.

**When to ask vs. when to just do it.** Ask about **scope** — how many tours, what
the split is, whether to touch the test suite. Never ask about **mechanics** — ids,
emits, providers, style wiring are yours to apply (step 8). A question that
starts "should I add an id to…" is a task you should have done.

1. **Establish the flow — and confirm the split before writing.** Use what the user
   described; if they didn't, propose a sensible first-run flow (welcome → primary
   action → payoff/dashboard → done). Keep tours short (4–8 steps). One
   `OnboardingConfig` per distinct flow.
   - **If the app has more than one distinct flow — or the user asked for
     several tours — propose the split and get their answer before writing any
     config.** List the candidate tours, one line each (name + what it walks +
     roughly how many steps), and let them cut, merge or reorder. The split decides
     every downstream choice: anchors, which events you wire, how many triggers the
     UI needs. Changing it costs one message now and a rewrite later.
   - **Split by screen or job, not by user segment.** "Getting started", "the
     detail screen", "reporting" are separate tours. "Free users" vs. "paid users"
     is *not* — that's a branch **within** one tour, expressed with `enabled` (step
     6). Splitting on segments duplicates every shared step.
   - A flow that lives on a route the user reaches on their own terms (a record's
     detail page, `/thing/:id`) is its own tour, because its trigger has to resolve
     that route before starting — see step 7.

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
   - **Multi-control steps: anchor to the container, not one control.** In
     highlight mode everything *outside* the cutout is `pointer-events:none`, so
     only the highlighted element stays clickable. If a step's action needs more
     than one control — type in a field **and** press a submit button, pick from a
     group, tick then confirm — anchoring to a single control leaves the others
     dead (e.g. the user can submit with Enter but a click on the button does
     nothing). Anchor to the wrapping element (the form, the toolbar, the row) so
     every control the step asks for stays live. Add an `id` to that container if
     it lacks one.
   - A step with **no** `targetSelector` renders as a centered modal — right for
     welcome/finish screens (`placement: 'center'`).

4. **Wire business events (`waitForEvent`).** Search for `bus.emit('EVENT', …)`
   (the injected `OnboardingEventBus`). When a step should pause until the user
   performs a real action, set `waitForEvent: 'THAT_EVENT'`. While waiting, the
   "Next" button is hidden — the user must do the thing.
   - **Type the event names.** Declare an `interface AppEvents { PROJECT_CREATED:
     unknown; SETTINGS_SAVED: unknown; … }` and annotate the config as
     `OnboardingConfig<AppEvents>`. Every `waitForEvent` is then checked against it —
     a typo is a build error (with a "did you mean"), not a silent timeout. Do this
     by default: it turns your own mistakes into compile errors, which is exactly
     what step 9's build is for.
   - If the action carries data and the step should only advance for a specific
     one, add `eventFilter: (p) => …`.
   - If the app does **not** yet emit an event you need, **add the `bus.emit('…')`
     yourself** — inject `OnboardingEventBus`, emit right after the domain action
     resolves (not before), and use the *exact* same name as the step's
     `waitForEvent`. This is a mechanical edit; just make it. Only ask the user when
     *which* action should gate the step is genuinely unclear.
   - **Emit *before* an action tears the highlighted element down.** The rule above
     is "emit after the action resolves" — but when that same action also destroys
     the target (a modal that saves **and closes**, a deleted row, a navigation
     away), emit **before** the teardown call (`ref.close()`, the route change),
     still inside the success callback. The orchestrator needs the element alive to
     schedule its advance from it; emit after it's gone and you race the engine's
     "target-lost" recovery. Leave a one-line comment so the ordering isn't "tidied"
     later.
   - Always pair a `waitForEvent` with a safety timeout (see resilience below) so
     a user is never stranded on an event that never fires.

5. **Handle async DOM (loaders, overlays).** If the target appears after a spinner /
   `@if (loading())` / an HTTP call, the engine already polls for it
   (`waitForSelectorTimeoutMs`, default 5000 ms). Add `delayMs` (typically 100–200 ms)
   for the narrower case where the element **exists but isn't settled**:
   - an **entry animation** that needs to finish after the element mounts;
   - a **freshly-opened overlay/portal** (CDK `Dialog`, modal, dropdown) whose content
     the selector finds on the first frame, but which hasn't attached/positioned before
     Driver.js measures the cutout — without the delay the highlight lands where the
     dialog *will be*, not where it is. `delayMs` runs *after* the target resolves and
     *before* the cutout is measured, which is exactly this gap. Treat the value as a
     tunable guess and say so to the user.
   - **A target behind `@defer` never appears on its own — trigger it yourself.**
     (Angular 17+.) `@defer (on viewport)` renders its `@placeholder`, and the real
     content only mounts once that placeholder intersects the viewport. Aiming a step
     straight at an element inside the block **deadlocks silently**: the engine polls
     for a target that nothing will ever render, because Driver.js only scrolls
     *after* it resolves the target. It fails as a timeout, so it reads like a wrong
     selector — check the template for `@defer` before you go hunting. Give the step a
     `beforeStep` that provokes the trigger, then let the poll do its job:

     ```ts
     { id: 'yearly', targetSelector: '#yearly-heatmap',
       // #yearly-heatmap is inside @defer (on viewport) — scroll the placeholder
       // into view so the block renders, then the engine polls for the real target.
       beforeStep: () => { document.querySelector('#placeholder-id')
                             ?.scrollIntoView({ block: 'center' }); },
       waitForSelectorTimeoutMs: 8000 }
     ```

     Use `?.` — the placeholder is gone once the block has rendered, e.g. if the user
     already scrolled past it. Budget generously: the trigger, `@loading (minimum …)`
     and the fetch all stack up. Same shape for the other triggers — `on interaction`
     / `on hover` need the real event dispatched on the placeholder, `on timer` just
     needs a longer `waitForSelectorTimeoutMs`. Anchor the `@placeholder` with its own
     `id` if it hasn't got one.
   - **On CDK ≥ 20.1 only: highlighting *inside* a CDK / Material overlay needs it
     out of the top layer.** Check `@angular/cdk` in `package.json` first. **Below
     20.1 there is nothing to do** — those overlays stack by normal `z-index`, the
     Driver.js overlay already paints above them, and `OVERLAY_DEFAULT_CONFIG` does
     not exist yet, so importing it is a **build failure**, not a harmless no-op.

     From 20.1 on, overlays (`MatDialog`/`cdkDialog`, `mat-menu`, `mat-select`,
     autocomplete) render in the browser's **top layer** via the native Popover API
     (`popover="manual"`), which paints above all normal content **regardless of
     z-index** — including the tour's Driver.js overlay. A step targeting an element
     *inside* such an overlay then looks un-highlighted and its popover is unclickable
     (the CDK backdrop covers it). This is orthogonal to `delayMs` (timing) — it's
     stacking, and no z-index tweak fixes it. On that stack, when a step targets an
     element inside a CDK overlay, add `{ provide: OVERLAY_DEFAULT_CONFIG, useValue:
     { usePopover: false } }` (from `@angular/cdk/overlay`) to the app providers — it's
     the app-wide lever, and `Dialog`/`MatDialog` don't forward a per-call
     `usePopover`. Make that edit, but **call it out in the summary**: it changes CDK's
     overlay behaviour app-wide. (A standalone connected overlay can instead be scoped
     with `[cdkConnectedOverlayUsePopover]="false"`.)

   Bump `waitForSelectorTimeoutMs` on a step if a request is genuinely slow.

6. **Conditional steps (`enabled`).** If a step only applies to some users (plan,
   role, feature flag), give it `enabled: (ctx) => <predicate>` (sync or async).
   A falsy result skips the step entirely — its hooks never run — and the engine
   continues in the direction of travel. Fail-open: if the predicate throws, the
   step is shown.

7. **Tour-level preconditions — gate at the *trigger*, not per-step.** If the
   whole tour only makes sense given some precondition (a non-empty list to walk,
   a logged-in user, a screen that's reachable), check it *before starting* —
   disable the launch button or guard the trigger (`if (store.items().length === 0)
   return;`) — never with `enabled`/`optional` on the entry step. The step that
   *gets you into* the flow (opens the record, navigates to the detail route)
   can't be skipped: skip it and every later step is stranded on the wrong
   route/DOM, so per-step gating just moves the breakage downstream. Rule of
   thumb: `enabled` gates a *branch within* a running tour; the *trigger* gates
   whether the tour runs at all.

8. **Write the config and apply the wiring — don't hand it back as homework.**
   Create `onboarding.config.ts` and *make* the mechanical edits yourself:
   `provideOnboarding()`, the style imports, the `id`/`data-*` hooks, the
   `bus.emit(…)` calls, and a trigger (see Output). Reserve the closing summary for
   (a) what you changed in the user's code and (b) genuine decisions/assumptions to
   eyeball — never a to-do list of edits you could have made.

9. **Build it, then check you didn't break the suite.** Run the app's build
   (`ng build` / `npm run build`) and fix what it flags. It won't prove events fire,
   but it catches import/typo breakage — closing the loop is part of the job, not a
   hope. Then tell the user what to click to see it live.
   - **Run the existing tests if the repo has them**, and fix anything *your* wiring
     broke. This is not optional and not a question: `provideOnboarding()` and an
     injected `OnboardingEventBus` add DI dependencies to components that specs
     construct, so a green suite can go red purely from your edits. You broke it, you
     fix it.
   - **New tests for the onboarding are the user's call — ask, don't assume.** A tour
     is worth covering (a renamed id or a dropped emit breaks it silently, and
     nothing else in the build will notice), but it's a scope decision: it means new
     spec files and a testing approach they may already have opinions about. Offer it
     concretely — name what you'd assert (config shape, that each `targetSelector`
     resolves in a rendered fixture, that each `waitForEvent` has a matching emit) —
     and write them only if they say yes.

## The schema (authoritative)

```ts
interface OnboardingConfig<TEvents = Record<string, unknown>> {  // pass an event map → typed waitForEvent
  version: string;              // semver — bump to re-show a persisted tour
  id?: string;                  // required for persistence + multi-tour
  steps: readonly OnboardingStep<TEvents>[];
  startImmediately?: boolean;   // auto-start (guarded by persistence). default false
  persist?: boolean;            // remember completion in localStorage. default true
  persistOnSkip?: boolean;      // also remember a DISMISS (Escape/close), not just completion. default false
  options?: OnboardingOptions;  // TIMING/BEHAVIOUR only (button labels: per-step below, or global in provideOnboarding)
}

interface OnboardingStep<TEvents = Record<string, unknown>> {
  id: string;                       // stable, unique within the tour
  targetSelector?: string;          // element to highlight; omit for a centered step
  title?: string;                   // heading; escaped as plain text by default
  content?: string;                 // popover body; escaped as plain text by default —
                                    //   safe to interpolate user/server data
  allowHtml?: boolean;              // opt title+content OUT of escaping → raw HTML.
                                    //   trusted, developer-authored strings only (XSS sink)
  placement?: 'top'|'top-start'|'top-end'|'bottom'|'bottom-start'|'bottom-end'
            |'left'|'right'|'auto'|'center';  // 'center' = element-less modal
  enabled?: (ctx: {step; index; total}) => boolean | Promise<boolean>;  // skip when false

  // async / event-driven control
  waitForEvent?: keyof TEvents & string;  // pause until this event fires; type-checked vs the event map
  eventFilter?: (payload: unknown) => boolean;   // only advance on a matching payload (payload stays unknown)
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
  nextLabel?: string;               // per-step button label overrides; each falls
  prevLabel?: string;               //   back to the global label from provideOnboarding()
  doneLabel?: string;               //   (doneLabel is shown when the step is last)
}

interface OnboardingOptions {       // tour-wide timing/behaviour + defaults
  waitForSelectorTimeoutMs?: number;// default 5000
  selectorPollIntervalMs?: number;  // default 100
  abortOnMissingTarget?: boolean;   // default false (non-optional miss: error + render;
                                    //   true: end the tour cleanly)
  waitForEventTimeoutMs?: number;   // default 0 (forever)
  onWaitTimeout?: 'reveal'|'advance'|'skip';  // default 'reveal'
  // Button labels + closeOnBackdropClick live on the renderer config
  // (provideOnboarding), NOT here — see below.
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

### Labels & look — global in provideOnboarding(), per-step on the step

Global button labels and overlay styling belong in the renderer config passed to
`provideOnboarding()`. A single step can override its own button text with
`nextLabel`/`prevLabel`/`doneLabel`; anything it omits falls back to the global
label. (These label fields are **not** on `config.options` — don't put them there.)

```ts
// app.config.ts — global labels + look
provideOnboarding({
  nextLabel: 'Next', prevLabel: 'Back', doneLabel: 'Done',
  overlayOpacity: 0.6, stagePadding: 10, closeOnBackdropClick: false,
});

// a step overriding just its own primary label
{ id: 'finish', title: 'All set', placement: 'center', nextLabel: 'Get started' }
```

## Output

Emit two things.

**1. `onboarding.config.ts`** — the typed config:

```ts
import { OnboardingConfig } from 'ngx-onboarding-flow';

// Declare the events the tour waits on → every waitForEvent below is type-checked.
interface AppEvents {
  PROJECT_CREATED: unknown;
}

export const appOnboarding: OnboardingConfig<AppEvents> = {
  version: '1.0.0',
  id: 'main',
  options: { waitForEventTimeoutMs: 8000, onWaitTimeout: 'reveal' },
  steps: [
    { id: 'welcome', targetSelector: '#welcome', title: 'Welcome', placement: 'bottom' },
    { id: 'create', targetSelector: '#new-project', title: 'Create a project',
      waitForEvent: 'PROJECT_CREATED' },
    { id: 'stats', targetSelector: '#chart', navigateToRoute: '/dashboard',
      title: 'Your dashboard', placement: 'left' },
    { id: 'done', title: 'All set 🎉', placement: 'center', popoverClass: 'step-finish' },
  ],
};
```

**2. Wiring** — apply these yourself where missing:

- `provideOnboarding({ … })` in `app.config.ts`. Import the stylesheets too:
  `driver.js/dist/driver.css` and (optional) `ngx-onboarding-flow/styles/theme.css`.
  In an Angular app the reliable place is the **`styles` array in `angular.json`**;
  a `@import` in `styles.scss` also works but is easier to get wrong — verify it
  actually loaded (the popover renders unstyled if it didn't).
- The `bus.emit('EVENT', payload?)` calls every `waitForEvent` step depends on —
  from the injected `OnboardingEventBus`, **after** the real action resolves, names
  matching the config exactly.
- A trigger. For a first-run tour prefer `autoStart(cfg)` — but it only fires when
  the config sets **`startImmediately: true`** *and* the tour isn't already
  persisted as seen. A **dismissal no longer sticks** (default `persistOnSkip:
  false`), so a dismissed tour reappears next load; only a **completion** is
  remembered. To re-test *completed* runs while iterating, add a manual replay (a
  button calling `reset(cfg)` then `start(cfg)`) or set `persist: false` until the
  tour is accepted. Set `persistOnSkip: true` only if a dismissal should count as
  "seen forever".

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
- Close the loop: build it, run the existing suite and fix what your wiring broke
  (step 9), and give the user a way to replay the tour; never rely on a one-shot
  auto-start you can't trigger again.
- Ask about scope, decide about mechanics. The tour split (step 1) and new test
  coverage (step 9) are the user's calls; ids, emits and providers are yours.
- Check `@angular/core` and `@angular/cdk` versions before applying any rule that
  names one. The wrong version-gated "fix" is a build failure, not a no-op.
- State plainly that the result is a draft to run and eyeball, especially for
  timing and conditionally-rendered targets.
