import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OnboardingOrchestrator } from 'ngx-onboarding-flow';

import { tour } from './tour';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header>
      <strong>ngx-onboarding-flow</strong>
      <nav>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Tasks</a>
        <a id="nav-stats" routerLink="/stats" routerLinkActive="active">Stats</a>
      </nav>
      <button class="ghost" (click)="replay()">↻ Show me around</button>
    </header>

    <main><router-outlet /></main>
  `,
  styles: `
    :host { display:block; }
    header { display:flex; align-items:center; gap:1.5rem; padding:.9rem 1.5rem; background:#1e1b4b; color:#e0e7ff; }
    nav { display:flex; gap:1rem; margin-right:auto; }
    nav a { color:#c7d2fe; text-decoration:none; padding-bottom:2px; border-bottom:2px solid transparent; }
    nav a.active { color:#fff; border-bottom-color:#818cf8; }
    .ghost { font:inherit; font-size:.85rem; cursor:pointer; color:#e0e7ff; background:transparent; border:1px solid #818cf8; border-radius:999px; padding:.3rem .8rem; }
    .ghost:hover { background:#312e81; }
    main { padding:1.5rem; max-width:720px; margin:0 auto; }
  `,
})
export class AppComponent {
  private readonly onboarding = inject(OnboardingOrchestrator);

  constructor() {
    // Honours startImmediately, and won't re-run once completed.
    this.onboarding.autoStart(tour);
  }

  /**
   * start() ignores persistence by design, so a replay button needs nothing
   * else — calling reset() first would also clear the "seen" flag and let
   * autoStart fire again on the next reload.
   */
  replay(): void {
    this.onboarding.start(tour);
  }
}
