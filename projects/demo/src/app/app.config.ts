import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideOnboarding } from 'ngx-agentic-onboarding';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideOnboarding({
      overlayOpacity: 0.65,
      nextLabel: 'Dalej',
      prevLabel: 'Wstecz',
      doneLabel: 'Zakończ',
    }),
  ],
};
