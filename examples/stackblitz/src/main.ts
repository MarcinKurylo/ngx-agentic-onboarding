import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideOnboarding } from 'ngx-onboarding-flow';

import { AppComponent } from './app/app.component';
import { HomeComponent } from './app/home.component';
import { StatsComponent } from './app/stats.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([
      { path: '', component: HomeComponent },
      { path: 'stats', component: StatsComponent },
    ]),
    // Global labels and overlay look. Stylesheets come from angular.json.
    provideOnboarding({
      nextLabel: 'Next',
      prevLabel: 'Back',
      doneLabel: 'Done',
      overlayOpacity: 0.6,
      stagePadding: 8,
      closeOnBackdropClick: false,
    }),
  ],
}).catch((err) => console.error(err));
