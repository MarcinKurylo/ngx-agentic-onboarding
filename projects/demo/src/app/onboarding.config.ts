import { OnboardingConfig } from 'ngx-agentic-onboarding';

/**
 * A realistic tour that coordinates with async UI — loaders, a dropdown, a
 * modal and simulated HTTP — entirely from data. The engine waits for business
 * events and for elements to appear after each "request"; no component code
 * knows about the tour.
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
      // small settle delay so the modal's entry is fully painted
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
    },
  ],
};
