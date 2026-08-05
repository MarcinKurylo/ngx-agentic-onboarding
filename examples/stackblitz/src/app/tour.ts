import { OnboardingConfig } from 'ngx-onboarding-flow';

/**
 * The events this tour waits on. Declaring them makes every `waitForEvent`
 * below type-checked — a typo becomes a compile error instead of a step that
 * silently waits forever.
 */
export interface AppEvents {
  TASK_ADDED: { title: string };
}

/**
 * ─── This object is the entire tour. ─────────────────────────────────────
 *
 * There is no tour code anywhere else in this app — no step counters, no
 * flags, no subscriptions. The only thing the components contribute is a
 * single `bus.emit('TASK_ADDED', …)` where the real action happens.
 *
 * Try editing it: reorder the steps, change the copy, point a step somewhere
 * else. The tour re-runs from the "Show me around" button in the header.
 */
export const tour: OnboardingConfig<AppEvents> = {
  version: '1.0.0',
  id: 'example',
  startImmediately: true,
  options: {
    // A safety net, never the pacing: steps advance on the real event.
    waitForEventTimeoutMs: 30_000,
    onWaitTimeout: 'reveal',
  },
  steps: [
    {
      id: 'welcome',
      placement: 'center',
      // The replay button can be pressed from any route, and every step after
      // this one lives on the home screen — so the tour takes itself there
      // first instead of assuming it is already in the right place.
      navigateToRoute: '/',
      title: 'This whole tour is one object 👋',
      content:
        'Five steps, described as data in tour.ts. The engine handles the routing, the waiting and the DOM.',
      nextLabel: 'Show me',
    },
    {
      id: 'add',
      targetSelector: '#add-btn',
      placement: 'bottom',
      title: 'Now do something real',
      content:
        'Click "Add task". The step has waitForEvent: "TASK_ADDED", so the Next button is hidden — the tour waits for you, not for a timer.',
      waitForEvent: 'TASK_ADDED',
    },
    {
      id: 'list',
      targetSelector: '#task-list',
      placement: 'top',
      title: 'It waited for the server',
      content:
        'The event fires after the (faked) request resolves, so this step could not run early even if you clicked fast.',
    },
    {
      id: 'chart',
      // Different route: the engine navigates, then waits for #chart to exist.
      navigateToRoute: '/stats',
      targetSelector: '#chart',
      placement: 'top',
      title: 'And it can change route',
      content:
        'This step lives on /stats. navigateToRoute took you here and waited for the element to render.',
    },
    {
      id: 'done',
      placement: 'center',
      title: "That's the whole idea 🎉",
      content:
        'Open tour.ts and change something — the preview reloads. Full docs are linked in the README.',
      doneLabel: 'Let me play',
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────
 * THINGS TO TRY
 *
 * Each of these is a real, working snippet. Uncomment it, save, and the
 * preview reloads — then hit "Show me around" in the header to replay.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ── 1. Add a step ────────────────────────────────────────────────────────
 * Paste this into `steps` above, just before the 'chart' step. Anything with
 * a stable id can be a target.
 *
 *   {
 *     id: 'nav',
 *     targetSelector: '#nav-stats',
 *     placement: 'bottom',
 *     title: 'This is where we are going',
 *     content: 'Steps are just array entries — reorder or delete them freely.',
 *   },
 *
 * ── 2. Make a step picky about the event ─────────────────────────────────
 * Add this line to the 'add' step. Now the tour waits for a *second* task:
 * the first one fires TASK_ADDED, but the filter rejects it.
 *
 *   eventFilter: (p) => (p as AppEvents['TASK_ADDED']).title === 'Task 2',
 *
 * ── 3. Theme one step differently ────────────────────────────────────────
 * Add this to any step above…
 *
 *   popoverClass: 'highlight-step',
 *
 * …and paste this into src/styles.css:
 *
 *   .driver-popover.highlight-step { background: #1e1b4b; color: #e0e7ff; }
 *   .driver-popover.highlight-step .driver-popover-title { color: #fff; }
 *
 * ── 4. Skip a step conditionally ─────────────────────────────────────────
 * `enabled` runs right before the engine would land on the step. Return
 * false and it is skipped entirely — its hooks never run.
 *
 *   enabled: () => new Date().getHours() < 12,
 *
 * ── 5. Let the user leave whenever ───────────────────────────────────────
 * Drop the safety timeout and the tour will wait on an event forever:
 *
 *   options: { waitForEventTimeoutMs: 0 }
 *
 * Then try the 'add' step without clicking anything. `onWaitTimeout: 'reveal'`
 * is what normally rescues you after 30s by un-hiding "Next".
 */
