import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
import { provideRouter } from '@angular/router';
import { provideOnboarding } from 'ngx-agentic-onboarding';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // CDK ≥20.1 renders overlays in the browser's *top layer* (via the native
    // Popover API: `popover="manual"`), which paints above all normal content
    // regardless of z-index. That defeats the tour's Driver.js overlay — the
    // spotlight and popover would sit *under* a cdkDialog/menu, so a step
    // targeting an element inside a CDK overlay looks un-highlighted. Opting
    // CDK overlays out of the top layer restores z-index stacking, letting the
    // tour paint on top. See the "CDK overlays" note in the README.
    { provide: OVERLAY_DEFAULT_CONFIG, useValue: { usePopover: false } },
    provideOnboarding({
      overlayOpacity: 0.65,
      nextLabel: 'Dalej',
      prevLabel: 'Wstecz',
      doneLabel: 'Zakończ',
    }),
  ],
};
