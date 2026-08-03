# ngx-agentic-onboarding

Lightweight, **config-driven** and **event-driven** onboarding / product-tour
engine for Angular 16.2+. Define the whole tour in one typed object; the engine
coordinates asynchronous transitions — waiting for business events, driving the
router, and waiting for elements to appear after loaders — and paints the
overlay with a slimmed [Driver.js](https://driverjs.com). No tour code in your
components.

## Install

```bash
npm i ngx-agentic-onboarding driver.js
```

## Compatibility

Supports **Angular 16.2 through 22** (peer range `>=16.2.0 <23.0.0`). `@angular/router`
is an optional peer — the engine works without it, and `navigateToRoute` steps are
simply ignored when no `Router` is present.

Why the wide range works:

- The package ships **only injectable services** (no components/directives), so its
  compiled Angular Package Format declares `minVersion: 12.0.0` — any Angular linker
  from v16 up can consume it, regardless of the Angular version it was built with.
- The newest Angular APIs it uses — `afterNextRender` and `signal().asReadonly()` —
  landed in **v16.2**, which is why the floor is 16.2 rather than 16.0. Everything
  else (`inject`, `signal`/`computed`, `DestroyRef`) is available from v16.

Caveats to know:

- On **Angular 16.2**, `signal`/`computed` are Angular's *developer-preview* APIs. They
  are functionally present and the engine uses them internally only, but 16.x users
  inherit that preview status. From **17+** signals are stable.
- CI builds and runs the unit/integration + e2e suites on the workspace's Angular
  (21.x). A separate, on-demand consumer-build matrix compiles a fresh app against
  every supported major (16.2–22) to keep the range CI-verified rather than merely
  declared.

## Setup

```ts
// app.config.ts
import { provideRouter } from '@angular/router';
import { provideOnboarding } from 'ngx-agentic-onboarding';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideOnboarding({ nextLabel: 'Next', overlayOpacity: 0.6 }),
  ],
};
```

Import the stylesheets once (global styles):

```scss
@import 'driver.js/dist/driver.css';
@import 'ngx-agentic-onboarding/styles/theme.css'; /* optional themeable default */
```

## Define a tour

```ts
import { OnboardingConfig } from 'ngx-agentic-onboarding';

export const appOnboarding: OnboardingConfig = {
  version: '1.0.0',
  id: 'main',
  steps: [
    { id: 'welcome', targetSelector: '#welcome', title: 'Hi!' },
    {
      id: 'create',
      targetSelector: '#new-project',
      title: 'Create a project',
      waitForEvent: 'PROJECT_CREATED', // pauses until your app emits it
    },
    {
      id: 'stats',
      targetSelector: '#chart',
      navigateToRoute: '/dashboard', // routes, then waits for #chart to appear
    },
  ],
};
```

Start it, and emit business events from anywhere — the engine is listening:

```ts
export class AppComponent {
  private readonly orchestrator = inject(OnboardingOrchestrator);
  private readonly bus = inject(OnboardingEventBus);

  start() { this.orchestrator.start(appOnboarding); }

  // elsewhere, when the real action happens:
  onProjectCreated(p: Project) { this.bus.emit('PROJECT_CREATED', p); }
}
```

### Key step options

| Option | Effect |
| --- | --- |
| `targetSelector` | Element to highlight (omit for a centered step). |
| `enabled` | Predicate (sync/async) — skip the step when it returns false. |
| `waitForEvent` | Pause until this event fires on the bus; hides "Next". |
| `eventFilter` | Only advance when the event payload matches. |
| `waitForEventTimeoutMs` | Give up waiting after N ms (see Resilience). |
| `navigateToRoute` | Navigate, then wait for the target to appear. |
| `delayMs` / `waitForSelectorTimeoutMs` | Timing for async DOM. |
| `beforeStep` / `afterStep` | Awaited lifecycle hooks. |
| `popoverClass` | Extra CSS class for theming this step. |

## Conditional steps

Steps can opt out of a tour per user or context — no need to fork the config.
Give a step an `enabled` predicate (sync or async); when it resolves falsy the
engine skips it entirely (its hooks never run) and continues in the direction of
travel. Skipped steps emit `onboarding:step_skipped`.

```ts
steps: [
  { id: 'welcome', targetSelector: '#welcome' },
  { id: 'invite-team', targetSelector: '#invite',
    enabled: () => user.plan === 'team' },              // sync
  { id: 'beta-panel', targetSelector: '#beta',
    enabled: () => flags.isOn('beta-onboarding') },     // async ok too
]
```

If the predicate throws, the step is shown (fail-open) so content is never lost.

## Resilience

Async tours can strand a user if the app misbehaves — an event that never fires,
or a highlighted element that a re-render tears away. The engine guards both:

**Event timeouts.** A `waitForEvent` step normally waits forever. Give it a
budget and the engine reacts when it lapses instead of hanging:

```ts
provideOnboarding(/* renderer opts */);

// in the config's options:
const cfg: OnboardingConfig = {
  version: '1.0.0', id: 'main',
  options: {
    waitForEventTimeoutMs: 15000, // global budget (0 = wait forever, default)
    onWaitTimeout: 'reveal',      // 'reveal' | 'advance' | 'skip'
  },
  steps: [
    { id: 'create', targetSelector: '#save', waitForEvent: 'SAVED',
      waitForEventTimeoutMs: 8000 /* per-step override */ },
  ],
};
```

`reveal` (default) un-hides "Next" so the user can proceed manually; `advance`
moves on automatically; `skip` ends the tour. Every timeout emits an
`onboarding:step_wait_timeout` event on the bus.

**Target recovery.** While a step is on screen the engine watches its target. If
the host detaches it (e.g. a list re-renders), the engine re-resolves the same
selector and re-paints in place; if it never returns, the tour closes cleanly
(`onboarding:step_target_lost`, then `onboarding:step_error`). No stale highlight
left anchored to nothing — the overlay is dropped while the element is missing,
never ghosting over empty space.

**Route-aware back navigation.** The engine remembers which route each step was
shown on. Stepping back to a step that lived on an earlier route restores that
route first (even if the step declares no `navigateToRoute`), so its target is
actually there. Redundant navigations are skipped when you're already on the
right route.

## Persistence

Completing or dismissing a tour is remembered (localStorage, keyed by
`id`+`version`) so it won't reappear:

```ts
orchestrator.startIfNotCompleted(appOnboarding); // start unless already seen
orchestrator.autoStart(appOnboarding);           // honours config.startImmediately
orchestrator.reset(appOnboarding);               // show it again
```

Set `persist: false` on the config to opt out. Swap the backend by providing
`ONBOARDING_STORAGE`.

## Multiple tours

An app can define any number of tours — each its own `OnboardingConfig` with a
distinct `id`. The orchestrator is a singleton (one overlay at a time), and its
methods all accept a config, so you steer every tour through the one instance.
Persistence is keyed per `id` + `version`, so completions never bleed across
tours:

```ts
export const dashboardTour: OnboardingConfig = { version: '1.0.0', id: 'dashboard', steps: [/*…*/] };
export const billingTour:   OnboardingConfig = { version: '2.1.0', id: 'billing',   steps: [/*…*/] };

orchestrator.startIfNotCompleted(dashboardTour);
orchestrator.autoStart(billingTour);
orchestrator.hasCompleted(billingTour); // independent of dashboardTour
```

Bumping one tour's `version` re-shows only that tour. Starting a new tour
cleanly tears down any tour already running.

## Theming

You control the look entirely from your own SCSS — the library ships a default,
and you override it. Every popover carries a stable `ngx-onboarding` class.

**Option A — override CSS variables** (with `theme.css` imported):

```scss
:root {
  --ngx-ob-accent: #e11d48;   /* primary button */
  --ngx-ob-radius: 16px;
  --ngx-ob-shadow: 0 18px 50px rgba(0, 0, 0, 0.25);
  /* also: --ngx-ob-bg, --ngx-ob-fg, --ngx-ob-muted, --ngx-ob-accent-fg,
     --ngx-ob-secondary-bg/-fg/-border, --ngx-ob-btn-radius, --ngx-ob-font … */
}
```

**Option B — target the classes directly** (skip `theme.css` for full control):

```scss
.driver-popover.ngx-onboarding {
  background: #0b1020;
  color: #e5e7eb;
}
.driver-popover.ngx-onboarding.step-finish .driver-popover-title { color: #16a34a; }
```

Per-step styling: set `popoverClass: 'step-finish'` on a step and scope your rules
to it (as above).

## Lifecycle events

The engine publishes its own events on the same `OnboardingEventBus`, namespaced
with an `onboarding:` prefix (see `OnboardingLifecycleEvent`). Subscribe for
analytics, or to react to the tour:

```ts
bus.on(OnboardingLifecycleEvent.StepShown).subscribe((p) => track('step', p));
```

| Event | Fires when |
| --- | --- |
| `TourStarted` | A tour run begins. |
| `TourCompleted` | The last step is finished. |
| `TourSkipped` | The user/code aborts before completion. |
| `StepShown` | A step is painted (after routing/DOM resolution). |
| `StepCompleted` | A step is advanced away from. |
| `StepSkipped` | A step is skipped by its `enabled` predicate. |
| `StepWaiting` | A step starts waiting on a business event. |
| `StepWaitTimeout` | A `waitForEvent` wait exceeded its timeout. |
| `StepTargetLost` | A visible step's target was detached from the DOM. |
| `StepError` | A recoverable error (e.g. target never appeared). |

## License

[MIT](./LICENSE) © Marcin Kuryło
