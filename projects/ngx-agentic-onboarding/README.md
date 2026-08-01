# ngx-agentic-onboarding

Lightweight, **config-driven** and **event-driven** onboarding / product-tour
engine for Angular 19+. Define the whole tour in one typed object; the engine
coordinates asynchronous transitions — waiting for business events, driving the
router, and waiting for elements to appear after loaders — and paints the
overlay with a slimmed [Driver.js](https://driverjs.com). No tour code in your
components.

## Install

```bash
npm i ngx-agentic-onboarding driver.js
```

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
| `waitForEvent` | Pause until this event fires on the bus; hides "Next". |
| `eventFilter` | Only advance when the event payload matches. |
| `waitForEventTimeoutMs` | Give up waiting after N ms (see Resilience). |
| `navigateToRoute` | Navigate, then wait for the target to appear. |
| `delayMs` / `waitForSelectorTimeoutMs` | Timing for async DOM. |
| `beforeStep` / `afterStep` | Awaited lifecycle hooks. |
| `popoverClass` | Extra CSS class for theming this step. |

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
left anchored to nothing.

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

## License

MIT
