import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { OnboardingOrchestrator } from 'ngx-agentic-onboarding';

import { appOnboarding } from './onboarding.config';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="topbar">
      <strong>ngx-agentic-onboarding · demo</strong>
      <nav>
        <a routerLink="/">Projekty</a>
        <a routerLink="/dashboard">Panel</a>
      </nav>
      <div class="actions">
        <button type="button" (click)="startTour()" [disabled]="orchestrator.isActive()">
          ▶ Uruchom samouczek
        </button>
        <button type="button" (click)="startGuarded()" [disabled]="orchestrator.isActive()">
          Start jeśli nieukończony
        </button>
        <button type="button" class="ghost" (click)="resetProgress()">
          Resetuj postęp
        </button>
      </div>
    </header>

    <div class="status">
      status: <b>{{ orchestrator.status() }}</b>
      · krok: <b>{{ orchestrator.currentIndex() + 1 }}/{{ orchestrator.totalSteps() }}</b>
      · ukończony: <b class="seen">{{ orchestrator.hasCompleted(appOnboarding) ? 'tak' : 'nie' }}</b>
      @if (orchestrator.currentStep(); as step) {
        · <code>{{ step.id }}</code>
      }
    </div>

    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    :host { display: block; font-family: system-ui, sans-serif; color: #111827; }
    .topbar {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 0.9rem 1.5rem;
      background: #111827;
      color: #f9fafb;
    }
    .topbar nav { display: flex; gap: 1rem; margin-right: auto; }
    .topbar a { color: #c7d2fe; text-decoration: none; }
    .topbar a:hover { color: #fff; }
    .actions { display: flex; gap: 0.5rem; }
    .topbar button {
      padding: 0.5rem 1rem;
      border: 0;
      border-radius: 8px;
      background: #22c55e;
      color: #06210f;
      font-weight: 700;
      cursor: pointer;
    }
    .topbar button.ghost {
      background: transparent;
      color: #c7d2fe;
      border: 1px solid #374151;
    }
    .topbar button:disabled { opacity: 0.5; cursor: not-allowed; }
    .status .seen { color: #7c3aed; }
    .status {
      padding: 0.5rem 1.5rem;
      background: #eef2ff;
      font-size: 0.85rem;
      color: #3730a3;
    }
    main { padding: 1.5rem; max-width: 720px; margin: 0 auto; }
  `,
})
export class AppComponent {
  // Public so the template can read the orchestrator's reactive signals.
  readonly orchestrator = inject(OnboardingOrchestrator);
  readonly appOnboarding = appOnboarding;

  /** Always starts, regardless of whether the tour was seen before. */
  startTour(): void {
    this.orchestrator.start(appOnboarding);
  }

  /** Starts only if the tour hasn't been completed/dismissed yet. */
  startGuarded(): void {
    this.orchestrator.startIfNotCompleted(appOnboarding);
  }

  /** Clears persisted completion so the tour can be shown again. */
  resetProgress(): void {
    this.orchestrator.reset(appOnboarding);
  }
}
