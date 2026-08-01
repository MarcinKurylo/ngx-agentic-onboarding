import { OnboardingConfig } from 'ngx-agentic-onboarding';

import { AccountService } from './account.service';

/**
 * Tour A — the flagship async flow. Coordinates loaders, a dropdown, a modal
 * and simulated HTTP entirely from data: the engine waits for business events
 * and for elements to appear after each "request"; no component knows about it.
 */
export const appOnboarding: OnboardingConfig = {
  version: '2.0.0',
  id: 'demo-tour',
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
export function buildDashboardTour(account: AccountService): OnboardingConfig {
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
 * Tour C — account setup on the Settings route. Demonstrates a conditional
 * team-only section step and a `waitForEvent: 'SETTINGS_SAVED'` step with a
 * timeout that reveals "Next" if the user never saves.
 */
export function buildSettingsTour(account: AccountService): OnboardingConfig {
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
