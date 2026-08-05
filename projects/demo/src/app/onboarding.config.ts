import { OnboardingConfig } from 'ngx-onboarding-flow';

import { AccountService } from './account.service';

/**
 * The business events this demo's tours wait on. Declaring them makes every
 * `waitForEvent` below type-checked — a typo is a compile error (red squiggle),
 * not a silent runtime timeout. Payloads are `void` here since the demo gates on
 * the events themselves, not their data.
 */
interface DemoEvents {
  MENU_OPENED: void;
  FILTER_APPLIED: void;
  MODAL_OPENED: void;
  PROJECT_CREATED: void;
  RANGE_CHANGED: void;
  SETTINGS_SAVED: void;
  CDK_MENU_OPENED: void;
  CDK_VIEW_PICKED: void;
  CDK_DIALOG_OPENED: void;
  CDK_DIALOG_SAVED: void;
}

/**
 * Tour A — the flagship async flow. Coordinates loaders, a dropdown, a modal
 * and simulated HTTP entirely from data: the engine waits for business events
 * and for elements to appear after each "request"; no component knows about it.
 */
export const appOnboarding: OnboardingConfig<DemoEvents> = {
  version: '2.0.0',
  id: 'demo-tour',
  // Opt into remembering a dismissal (not just a completion) — the other demo
  // tours keep the default, where dismissing lets the tour reappear next visit.
  persistOnSkip: true,
  steps: [
    {
      id: 'welcome',
      targetSelector: '#welcome-card',
      title: 'Welcome! 👋',
      content: 'An interactive tour of an async app. Click "Next" to begin.',
      placement: 'bottom',
      // #welcome-card lives on the home route. Return there on init so the tour
      // works when launched from any page (the launcher is on every route) —
      // just like the other three tours navigate to their own start route.
      navigateToRoute: '/',
    },
    {
      id: 'open-filter',
      targetSelector: '#filter-btn',
      title: 'Open the filter',
      content: 'Click to open the filter menu. The tour waits for your action.',
      placement: 'bottom-start',
      waitForEvent: 'MENU_OPENED',
    },
    {
      id: 'pick-filter',
      targetSelector: '#filter-active',
      title: 'Pick "Active"',
      content: 'Choosing a filter sends a request and reloads the list (watch the loader).',
      placement: 'right',
      waitForEvent: 'FILTER_APPLIED',
    },
    {
      id: 'new-project',
      targetSelector: '#new-project-btn',
      title: 'New project',
      content: 'Open the project-creation modal.',
      placement: 'bottom-end',
      waitForEvent: 'MODAL_OPENED',
    },
    {
      id: 'project-name',
      targetSelector: '#project-name',
      title: 'Name the project',
      content: 'Type a name (or leave the default) and continue.',
      placement: 'bottom',
      delayMs: 150,
    },
    {
      id: 'submit',
      targetSelector: '#modal-submit',
      title: 'Create',
      content: 'Click — a "request" fires (spinner), and the tour moves on once it resolves.',
      placement: 'top',
      waitForEvent: 'PROJECT_CREATED',
    },
    {
      id: 'dashboard',
      targetSelector: '#chart-main',
      title: 'Your dashboard 📊',
      content: 'The engine switched routes and waited for the dashboard data to load.',
      placement: 'left',
      navigateToRoute: '/dashboard',
    },
    {
      id: 'done',
      title: 'All set! 🎉',
      content: 'The whole flow — dropdown, loaders, modal and HTTP — handled declaratively.',
      placement: 'center',
      popoverClass: 'step-finish',
    },
  ],
};

/**
 * Tour B — a focused dashboard walkthrough on its own route. Shows off:
 * a `waitForEvent` step with a timeout (the range dropdown reveals "Next" if
 * you don't interact), and a **conditional** premium step that only appears on
 * the team plan. It has its own `id`, so its completion is remembered
 * independently of the other tours.
 */
export function buildDashboardTour(account: AccountService): OnboardingConfig<DemoEvents> {
  return {
    version: '1.0.0',
    id: 'dashboard-tour',
    steps: [
      {
        id: 'db-welcome',
        title: 'Dashboard in 60 seconds 📈',
        content: 'A quick metrics tour. The engine just moved you to /dashboard.',
        placement: 'center',
        navigateToRoute: '/dashboard',
      },
      {
        id: 'db-kpi',
        targetSelector: '#kpi-tiles',
        title: 'Your KPIs',
        content: 'Projects, tasks and completion rate — at a glance.',
        placement: 'bottom',
      },
      {
        id: 'db-range',
        targetSelector: '#range-seg',
        title: 'Change the range',
        content:
          "Pick a different range — the dashboard reloads. If you don't click, I'll reveal \"Next\" shortly.",
        placement: 'bottom-end',
        waitForEvent: 'RANGE_CHANGED',
        waitForEventTimeoutMs: 7000,
      },
      {
        id: 'db-insights',
        targetSelector: '#insights-panel',
        title: 'Premium insights 🔒',
        content: 'Only team-plan users see this step.',
        placement: 'bottom',
        enabled: () => account.isTeam(),
      },
      {
        id: 'db-chart',
        targetSelector: '#chart-main',
        title: 'Trend',
        content: 'The chart for the selected range — reloaded after each "request".',
        placement: 'top',
      },
      {
        id: 'db-done',
        title: "That's it 🎉",
        content: 'Dashboard mastered.',
        placement: 'center',
        popoverClass: 'step-finish',
      },
    ],
  };
}

/**
 * Tour D — overlays that live in the CDK's `cdk-overlay-container` (a `cdkDialog`
 * with its own backdrop + focus trap, and a connected-overlay menu) are first-class
 * targets: the engine highlights elements inside them and the user interacts
 * normally. This tour walks through both — filling in a dialog and picking from a
 * dropdown panel — entirely event-driven, just like every other tour.
 */
export function buildCdkTour(): OnboardingConfig<DemoEvents> {
  return {
    version: '1.0.0',
    id: 'cdk-tour',
    options: {
      // If the user pauses on an interactive step, reveal "Next" after a while
      // so the tour can always move on.
      waitForEventTimeoutMs: 8000,
      onWaitTimeout: 'reveal',
    },
    steps: [
      {
        id: 'cdk-welcome',
        title: 'CDK overlays 🧩',
        content:
          'The tour also walks through real CDK overlays — a dialog and a connected overlay. The engine moved you to /cdk-lab.',
        placement: 'center',
        navigateToRoute: '/cdk-lab',
      },
      {
        id: 'cdk-open',
        targetSelector: '#cdk-open-dialog',
        title: 'Open the dialog',
        content: 'Click — a cdkDialog opens (with its own backdrop and focus trap).',
        placement: 'bottom-start',
        waitForEvent: 'CDK_DIALOG_OPENED',
      },
      {
        id: 'cdk-dialog-name',
        targetSelector: '#cdk-dialog-name',
        title: 'Name the project',
        content:
          'The highlighted field lives in the dialog and is fully interactive — type a name and continue.',
        placement: 'right',
        delayMs: 200,
      },
      {
        id: 'cdk-dialog-save',
        targetSelector: '#cdk-dialog-save',
        title: 'Save',
        content: 'Click "Save" — the dialog closes and we move on.',
        placement: 'top',
        waitForEvent: 'CDK_DIALOG_SAVED',
      },
      {
        id: 'cdk-menu-open',
        targetSelector: '#cdk-menu-trigger',
        title: 'Open the view menu',
        content: 'Click to open the view picker (a CDK connected overlay).',
        placement: 'bottom-start',
        waitForEvent: 'CDK_MENU_OPENED',
      },
      {
        id: 'cdk-menu-item',
        targetSelector: '#cdk-menu-board',
        title: 'Pick "Board"',
        content:
          "This item lives in the connected overlay, yet it's highlighted and clickable — pick it.",
        placement: 'right',
        delayMs: 150,
        waitForEvent: 'CDK_VIEW_PICKED',
      },
      {
        id: 'cdk-done',
        title: 'Done 🎉',
        content:
          'The dialog and connected overlay handled just like regular elements — with no tour code in the components.',
        placement: 'center',
        popoverClass: 'step-finish',
      },
    ],
  };
}

/**
 * Tour C — account setup on the Settings route. Demonstrates a conditional
 * team-only section step and a `waitForEvent: 'SETTINGS_SAVED'` step with a
 * timeout that reveals "Next" if the user never saves.
 */
export function buildSettingsTour(account: AccountService): OnboardingConfig<DemoEvents> {
  return {
    version: '1.0.0',
    id: 'settings-tour',
    steps: [
      {
        id: 'set-welcome',
        title: 'Account setup ⚙️',
        content: "I'll walk you through your profile and plan settings.",
        placement: 'center',
        navigateToRoute: '/settings',
      },
      {
        id: 'set-name',
        targetSelector: '#profile-name',
        title: 'Display name',
        content: 'Change your name here. Editing shows the "unsaved changes" banner.',
        placement: 'bottom',
        delayMs: 120,
      },
      {
        id: 'set-plan',
        targetSelector: '#plan-toggle',
        title: 'Your plan',
        content: 'Switch to "Team" to unlock the team section (and the next step).',
        placement: 'bottom',
      },
      {
        id: 'set-team',
        targetSelector: '#team-section',
        title: 'Team settings',
        content: 'This section — and this step — appear only on the team plan.',
        placement: 'top',
        enabled: () => account.isTeam(),
      },
      {
        id: 'set-save',
        targetSelector: '#save-btn',
        title: 'Save changes',
        content: "Click to save (a \"request\" fires). Don't want to? I'll reveal \"Next\" shortly.",
        placement: 'top',
        waitForEvent: 'SETTINGS_SAVED',
        waitForEventTimeoutMs: 6000,
      },
      {
        id: 'set-done',
        title: 'All done ✅',
        content: 'Account configured. Each of these tours has its own remembered progress.',
        placement: 'center',
        popoverClass: 'step-finish',
      },
    ],
  };
}
