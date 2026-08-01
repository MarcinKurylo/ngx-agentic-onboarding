import { OnboardingConfig } from 'ngx-agentic-onboarding';

/**
 * The entire demo onboarding flow, defined declaratively in one place.
 * No component touches this — the orchestrator drives it end to end.
 */
export const appOnboarding: OnboardingConfig = {
  version: '1.0.0',
  id: 'demo-tour',
  steps: [
    {
      id: 'step_welcome',
      targetSelector: '#welcome-card',
      title: 'Witaj! 👋',
      content:
        'To krótki samouczek biblioteki ngx-agentic-onboarding. Kliknij „Next", aby zacząć.',
      placement: 'bottom',
    },
    {
      id: 'step_create',
      targetSelector: '#btn-submit',
      title: 'Stwórz projekt',
      content:
        'Wpisz nazwę i kliknij „Utwórz projekt". Samouczek POCZEKA na realną akcję — przycisk „Next" jest ukryty aż do zdarzenia PROJECT_CREATED.',
      placement: 'top',
      waitForEvent: 'PROJECT_CREATED',
    },
    {
      id: 'step_dashboard',
      targetSelector: '#chart-main',
      title: 'Twój panel 📊',
      content:
        'Silnik automatycznie przełączył routing na /dashboard i poczekał, aż wykres pojawi się w DOM. To Twój panel statystyk!',
      placement: 'left',
      navigateToRoute: '/dashboard',
    },
  ],
};
