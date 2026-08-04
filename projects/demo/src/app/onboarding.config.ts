import { OnboardingConfig } from 'ngx-agentic-onboarding';

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
      title: 'Witaj! 👋',
      content: 'To interaktywny samouczek po asynchronicznej aplikacji. Kliknij „Dalej".',
      placement: 'bottom',
    },
    {
      id: 'open-filter',
      targetSelector: '#filter-btn',
      title: 'Otwórz filtr',
      content: 'Kliknij, aby rozwinąć menu filtrowania. Samouczek czeka na akcję.',
      placement: 'bottom-start',
      waitForEvent: 'MENU_OPENED',
    },
    {
      id: 'pick-filter',
      targetSelector: '#filter-active',
      title: 'Wybierz „Aktywne"',
      content: 'Wybór filtra wyśle zapytanie i przeładuje listę (zobacz loader).',
      placement: 'right',
      waitForEvent: 'FILTER_APPLIED',
    },
    {
      id: 'new-project',
      targetSelector: '#new-project-btn',
      title: 'Nowy projekt',
      content: 'Otwórz modal tworzenia projektu.',
      placement: 'bottom-end',
      waitForEvent: 'MODAL_OPENED',
    },
    {
      id: 'project-name',
      targetSelector: '#project-name',
      title: 'Nazwij projekt',
      content: 'Wpisz nazwę (albo zostaw domyślną) i przejdź dalej.',
      placement: 'bottom',
      delayMs: 150,
    },
    {
      id: 'submit',
      targetSelector: '#modal-submit',
      title: 'Utwórz',
      content: 'Kliknij — poleci „request" (spinner), a po odpowiedzi samouczek ruszy dalej.',
      placement: 'top',
      waitForEvent: 'PROJECT_CREATED',
    },
    {
      id: 'dashboard',
      targetSelector: '#chart-main',
      title: 'Twój panel 📊',
      content: 'Silnik przełączył routing i poczekał, aż dane panelu się załadują.',
      placement: 'left',
      navigateToRoute: '/dashboard',
    },
    {
      id: 'done',
      title: 'Gotowe! 🎉',
      content: 'Cały przepływ — dropdown, loadery, modal i HTTP — obsłużony deklaratywnie.',
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
        title: 'Panel w 60 sekund 📈',
        content: 'Szybki przegląd metryk. Silnik właśnie przeniósł Cię na /dashboard.',
        placement: 'center',
        navigateToRoute: '/dashboard',
      },
      {
        id: 'db-kpi',
        targetSelector: '#kpi-tiles',
        title: 'Twoje KPI',
        content: 'Projekty, zadania i wskaźnik ukończenia — na jeden rzut oka.',
        placement: 'bottom',
      },
      {
        id: 'db-range',
        targetSelector: '#range-seg',
        title: 'Zmień zakres',
        content:
          'Wybierz inny zakres — panel przeładuje dane. Jeśli nie klikniesz, po chwili odsłonię „Dalej".',
        placement: 'bottom-end',
        waitForEvent: 'RANGE_CHANGED',
        waitForEventTimeoutMs: 7000,
      },
      {
        id: 'db-insights',
        targetSelector: '#insights-panel',
        title: 'Wgląd premium 🔒',
        content: 'Ten krok widzą wyłącznie użytkownicy planu zespołowego.',
        placement: 'bottom',
        enabled: () => account.isTeam(),
      },
      {
        id: 'db-chart',
        targetSelector: '#chart-main',
        title: 'Trend',
        content: 'Wykres dla wybranego zakresu — przeładowany po każdym „request".',
        placement: 'top',
      },
      {
        id: 'db-done',
        title: 'To tyle 🎉',
        content: 'Panel opanowany.',
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
        title: 'Overlaye CDK 🧩',
        content:
          'Samouczek prowadzi też przez prawdziwe overlaye CDK — dialog i connected overlay. Silnik przeniósł Cię na /cdk-lab.',
        placement: 'center',
        navigateToRoute: '/cdk-lab',
      },
      {
        id: 'cdk-open',
        targetSelector: '#cdk-open-dialog',
        title: 'Otwórz dialog',
        content: 'Kliknij — otworzy się cdkDialog (z własnym backdropem i focus trapem).',
        placement: 'bottom-start',
        waitForEvent: 'CDK_DIALOG_OPENED',
      },
      {
        id: 'cdk-dialog-name',
        targetSelector: '#cdk-dialog-name',
        title: 'Nazwij projekt',
        content:
          'Podświetlone pole jest w dialogu i jest w pełni interaktywne — wpisz nazwę i przejdź dalej.',
        placement: 'right',
        delayMs: 200,
      },
      {
        id: 'cdk-dialog-save',
        targetSelector: '#cdk-dialog-save',
        title: 'Zapisz',
        content: 'Kliknij „Zapisz” — dialog się zamknie i ruszymy dalej.',
        placement: 'top',
        waitForEvent: 'CDK_DIALOG_SAVED',
      },
      {
        id: 'cdk-menu-open',
        targetSelector: '#cdk-menu-trigger',
        title: 'Rozwiń widok',
        content: 'Kliknij, aby otworzyć menu wyboru widoku (connected overlay CDK).',
        placement: 'bottom-start',
        waitForEvent: 'CDK_MENU_OPENED',
      },
      {
        id: 'cdk-menu-item',
        targetSelector: '#cdk-menu-board',
        title: 'Wybierz „Tablica”',
        content:
          'Pozycja żyje w connected overlay, a mimo to jest podświetlona i klikalna — wybierz ją.',
        placement: 'right',
        delayMs: 150,
        waitForEvent: 'CDK_VIEW_PICKED',
      },
      {
        id: 'cdk-done',
        title: 'Gotowe 🎉',
        content:
          'Dialog i connected overlay obsłużone tak samo jak zwykłe elementy — bez żadnego kodu touru w komponentach.',
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
        title: 'Konfiguracja konta ⚙️',
        content: 'Przeprowadzę Cię przez ustawienia profilu i planu.',
        placement: 'center',
        navigateToRoute: '/settings',
      },
      {
        id: 'set-name',
        targetSelector: '#profile-name',
        title: 'Nazwa wyświetlana',
        content: 'Tu zmienisz swoją nazwę. Edycja włączy baner „niezapisane zmiany".',
        placement: 'bottom',
        delayMs: 120,
      },
      {
        id: 'set-plan',
        targetSelector: '#plan-toggle',
        title: 'Twój plan',
        content: 'Przełącz na „Zespół", aby odblokować sekcję zespołu (i kolejny krok).',
        placement: 'bottom',
      },
      {
        id: 'set-team',
        targetSelector: '#team-section',
        title: 'Ustawienia zespołu',
        content: 'Ta sekcja — i ten krok — pojawiają się tylko dla planu zespołowego.',
        placement: 'top',
        enabled: () => account.isTeam(),
      },
      {
        id: 'set-save',
        targetSelector: '#save-btn',
        title: 'Zapisz zmiany',
        content: 'Kliknij, aby zapisać (poleci „request"). Nie chcesz? Po chwili pokażę „Dalej".',
        placement: 'top',
        waitForEvent: 'SETTINGS_SAVED',
        waitForEventTimeoutMs: 6000,
      },
      {
        id: 'set-done',
        title: 'Gotowe ✅',
        content: 'Konto skonfigurowane. Każdy z tych samouczków ma osobny, zapamiętywany postęp.',
        placement: 'center',
        popoverClass: 'step-finish',
      },
    ],
  };
}
