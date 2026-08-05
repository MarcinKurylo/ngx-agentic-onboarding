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
