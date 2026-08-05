import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { OnboardingEventBus } from 'ngx-onboarding-flow';

import { AccountService } from './account.service';
import { ApiService, Stats, StatsRange } from './api.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <section class="card">
      <div class="toolbar">
        <h2>Statistics</h2>

        <!-- Range switcher: all options live inside one highlighted box, so a
             tour can gate on picking one and the option stays clickable under
             the overlay. Picking reloads (loader) and fires RANGE_CHANGED. -->
        <div id="range-seg" class="segmented" role="tablist" aria-label="Range">
          <button type="button" [class.on]="range() === '7d'" (click)="pickRange('7d')">7 days</button>
          <button type="button" [class.on]="range() === '30d'" (click)="pickRange('30d')">30 days</button>
          <button type="button" [class.on]="range() === '90d'" (click)="pickRange('90d')">90 days</button>
        </div>
      </div>

      @if (loading()) {
        <div class="loader"><span class="spinner"></span> Loading dashboard data…</div>
      } @else {
        @if (stats(); as s) {
          <div id="kpi-tiles" class="tiles">
            <div class="tile"><b>{{ s.projects }}</b><span>projects</span></div>
            <div class="tile"><b>{{ s.tasks }}</b><span>tasks</span></div>
            <div class="tile"><b>{{ (s.completion * 100).toFixed(0) }}%</b><span>completion</span></div>
          </div>

          <!-- Premium panel: only rendered for the team plan. A tour step is
               gated on the same condition, so free users never see it or hear
               about it. -->
          @if (account.isTeam()) {
            <div id="insights-panel" class="insights">
              <span class="badge">PREMIUM</span>
              <div>
                <b>{{ s.velocity }}</b> completed tasks / week
                <p>Insight available on the team plan.</p>
              </div>
            </div>
          }

          <div id="chart-main" class="chart">
            @for (v of s.series; track $index) {
              <div class="bar" [style.height.%]="v"></div>
            }
          </div>
        }
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 1.25rem 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    h2 { margin-top: 0; }
    .toolbar { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .toolbar h2 { margin: 0; margin-right: auto; }
    .segmented { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; }
    .segmented button { border: 0; background: #fff; padding: .5rem 1rem; font: inherit; cursor: pointer; }
    .segmented button + button { border-left: 1px solid #e5e7eb; }
    .segmented button.on { background: #4f46e5; color: #fff; font-weight: 700; }
    .loader { display: flex; align-items: center; gap: .6rem; padding: 2rem 0; color: #6b7280; }
    .tiles { display: flex; gap: 1rem; margin-bottom: 1.25rem; }
    .tile { flex: 1; background: #f8fafc; border-radius: 10px; padding: 1rem; text-align: center; }
    .tile b { display: block; font-size: 1.6rem; color: #4338ca; }
    .tile span { color: #6b7280; font-size: .85rem; }
    .insights {
      display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem;
      padding: 1rem 1.25rem; border-radius: 10px;
      background: linear-gradient(120deg, #eef2ff, #faf5ff); border: 1px solid #ddd6fe;
    }
    .insights b { font-size: 1.4rem; color: #6d28d9; }
    .insights p { margin: .2rem 0 0; color: #6b7280; font-size: .8rem; }
    .badge {
      align-self: flex-start; font-size: .68rem; font-weight: 800; letter-spacing: .06em;
      color: #fff; background: #7c3aed; padding: .15rem .5rem; border-radius: 999px;
    }
    .chart { display: flex; align-items: flex-end; gap: .75rem; height: 180px; padding: 1rem; background: #f8fafc; border-radius: 10px; }
    .bar { flex: 1; background: linear-gradient(180deg, #6366f1, #4338ca); border-radius: 6px 6px 0 0; transition: height .3s ease; }
    .spinner {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid #c7d2fe; border-top-color: #4f46e5;
      display: inline-block; animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly bus = inject(OnboardingEventBus);
  readonly account = inject(AccountService);

  readonly loading = signal(true);
  readonly stats = signal<Stats | null>(null);
  readonly range = signal<StatsRange>('30d');

  ngOnInit(): void {
    this.load();
  }

  pickRange(range: StatsRange): void {
    if (range === this.range()) {
      return;
    }
    this.range.set(range);
    this.load();
    this.bus.emit('RANGE_CHANGED', { range });
  }

  private load(): void {
    this.loading.set(true);
    this.api.getStats(this.range()).subscribe((s) => {
      this.stats.set(s);
      this.loading.set(false);
    });
  }
}
