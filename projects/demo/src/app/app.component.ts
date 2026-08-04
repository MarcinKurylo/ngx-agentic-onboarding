import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { OnboardingConfig, OnboardingOrchestrator } from 'ngx-agentic-onboarding';

import { AccountService } from './account.service';
import {
  appOnboarding,
  buildCdkTour,
  buildDashboardTour,
  buildSettingsTour,
} from './onboarding.config';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <strong>ngx-agentic-onboarding · demo</strong>
      <nav>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Projects</a>
        <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
        <a routerLink="/settings" routerLinkActive="active">Settings</a>
        <a routerLink="/cdk-lab" routerLinkActive="active">CDK Lab</a>
      </nav>
      <span class="plan" [class.team]="account.isTeam()">
        Plan: {{ account.isTeam() ? 'Team' : 'Free' }}
      </span>
    </header>

    <div class="status">
      status: <b>{{ orchestrator.status() }}</b>
      · step: <b>{{ orchestrator.currentIndex() + 1 }}/{{ orchestrator.totalSteps() }}</b>
      · completed: <b class="seen">{{ orchestrator.hasCompleted(appOnboarding) ? 'yes' : 'no' }}</b>
      @if (orchestrator.currentStep(); as step) {
        · <code>{{ step.id }}</code>
      }
    </div>

    <section class="launcher">
      <div class="launcher-head">
        <h2>Tours</h2>
        <p>Four independent scenarios — each with its own remembered progress.</p>
      </div>
      <div class="tours">
        <!-- Tour A: the flagship async flow (canonical button labels kept for e2e) -->
        <article class="tour">
          <div class="tour-top">
            <h3>Full flow</h3>
            @if (orchestrator.hasCompleted(appOnboarding)) { <span class="badge done">completed</span> }
          </div>
          <p>Dropdown → filter → modal → simulated HTTP → dashboard. Event-driven.</p>
          <div class="row">
            <button type="button" class="primary" (click)="start(appOnboarding)" [disabled]="orchestrator.isActive()">
              Run tour
            </button>
            <button type="button" class="ghost" (click)="guarded(appOnboarding)" [disabled]="orchestrator.isActive()">
              Start if not completed
            </button>
            <button type="button" class="link" (click)="reset(appOnboarding)">Reset progress</button>
          </div>
        </article>

        <!-- Tour B: dashboard focus — conditional step + waitForEvent timeout -->
        <article class="tour">
          <div class="tour-top">
            <h3>Dashboard in 60 seconds</h3>
            @if (orchestrator.hasCompleted(dashboardTour)) { <span class="badge done">completed</span> }
          </div>
          <p>Navigates to /dashboard. The range step has a <em>timeout</em>; the premium step is <em>conditional</em>.</p>
          <div class="row">
            <button type="button" class="primary" (click)="start(dashboardTour)" [disabled]="orchestrator.isActive()">
              ▶ Run
            </button>
            <button type="button" class="link" (click)="reset(dashboardTour)">Reset</button>
          </div>
        </article>

        <!-- Tour C: settings — team-only conditional step + save timeout -->
        <article class="tour">
          <div class="tour-top">
            <h3>Account setup</h3>
            @if (orchestrator.hasCompleted(settingsTour)) { <span class="badge done">completed</span> }
          </div>
          <p>Navigates to /settings. The team section appears only on the <em>Team</em> plan.</p>
          <div class="row">
            <button type="button" class="primary" (click)="start(settingsTour)" [disabled]="orchestrator.isActive()">
              ▶ Run
            </button>
            <button type="button" class="link" (click)="reset(settingsTour)">Reset</button>
          </div>
        </article>

        <!-- Tour D: CDK overlays as first-class targets — highlights and drives
             elements inside a cdkDialog and a connected-overlay menu. -->
        <article class="tour cdk">
          <div class="tour-top">
            <h3>CDK overlays 🧩</h3>
            @if (orchestrator.hasCompleted(cdkTour)) { <span class="badge done">completed</span> }
          </div>
          <p>Walks through a real <em>cdkDialog</em> and a connected overlay — highlighting works inside them just like anywhere.</p>
          <div class="row">
            <button type="button" class="primary" (click)="start(cdkTour)" [disabled]="orchestrator.isActive()">
              ▶ Run
            </button>
            <button type="button" class="link" (click)="reset(cdkTour)">Reset</button>
          </div>
        </article>
      </div>
    </section>

    <main>
      <router-outlet />
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host { display: block; font-family: system-ui, sans-serif; color: #111827; }
    .topbar {
      display: flex; align-items: center; gap: 1.5rem;
      padding: 0.9rem 1.5rem; background: #111827; color: #f9fafb;
    }
    .topbar nav { display: flex; gap: 1rem; margin-right: auto; }
    .topbar a { color: #c7d2fe; text-decoration: none; padding-bottom: 2px; border-bottom: 2px solid transparent; }
    .topbar a:hover { color: #fff; }
    .topbar a.active { color: #fff; border-bottom-color: #818cf8; }
    .plan { font-size: .8rem; background: #374151; color: #e5e7eb; padding: .3rem .7rem; border-radius: 999px; }
    .plan.team { background: #7c3aed; color: #fff; }

    .status { padding: 0.5rem 1.5rem; background: #eef2ff; font-size: 0.85rem; color: #3730a3; }
    .status .seen { color: #7c3aed; }

    .launcher { padding: 1.25rem 1.5rem 0; max-width: 1000px; margin: 0 auto; }
    .launcher-head h2 { margin: 0 0 .2rem; }
    .launcher-head p { margin: 0 0 1rem; color: #6b7280; font-size: .9rem; }
    .tours { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
    .tour {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 1rem 1.15rem; box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .tour.cdk { border-color: #ddd6fe; background: linear-gradient(180deg, #faf5ff, #fff); }
    .tour-top { display: flex; align-items: center; gap: .6rem; }
    .tour-top h3 { margin: 0; margin-right: auto; font-size: 1.02rem; }
    .tour p { color: #6b7280; font-size: .85rem; min-height: 2.4em; }
    .tour em { color: #4338ca; font-style: normal; font-weight: 600; }
    .badge.done { font-size: .68rem; font-weight: 700; color: #166534; background: #dcfce7; padding: .15rem .55rem; border-radius: 999px; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: .6rem; }
    button { font: inherit; cursor: pointer; border-radius: 8px; }
    button.primary { background: #4f46e5; color: #fff; border: 0; font-weight: 600; padding: .5rem 1rem; }
    button.primary:hover { background: #4338ca; }
    button.ghost { background: transparent; border: 1px solid #cbd5e1; padding: .5rem .9rem; }
    button.link { background: none; border: 0; color: #6b7280; text-decoration: underline; padding: .5rem .3rem; }
    button:disabled { opacity: .5; cursor: not-allowed; }

    main { padding: 1.5rem; max-width: 1000px; margin: 0 auto; }
  `,
})
export class AppComponent {
  readonly orchestrator = inject(OnboardingOrchestrator);
  readonly account = inject(AccountService);

  readonly appOnboarding = appOnboarding;
  readonly dashboardTour = buildDashboardTour(this.account);
  readonly settingsTour = buildSettingsTour(this.account);
  readonly cdkTour = buildCdkTour();

  /** Always starts the given tour. */
  start<T>(config: OnboardingConfig<T>): void {
    this.orchestrator.start(config);
  }

  /** Starts only if the tour hasn't been completed/dismissed yet. */
  guarded<T>(config: OnboardingConfig<T>): void {
    this.orchestrator.startIfNotCompleted(config);
  }

  /** Clears persisted completion so the tour can be shown again. */
  reset<T>(config: OnboardingConfig<T>): void {
    this.orchestrator.reset(config);
  }
}
