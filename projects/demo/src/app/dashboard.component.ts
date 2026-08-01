import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService, Stats } from './api.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <section class="card">
      <h2>Statystyki</h2>

      @if (loading()) {
        <div class="loader"><span class="spinner"></span> Ładowanie danych panelu…</div>
      } @else {
        @if (stats(); as s) {
          <div class="tiles">
            <div class="tile"><b>{{ s.projects }}</b><span>projekty</span></div>
            <div class="tile"><b>{{ s.tasks }}</b><span>zadania</span></div>
            <div class="tile"><b>{{ (s.completion * 100).toFixed(0) }}%</b><span>ukończenie</span></div>
          </div>

          <div id="chart-main" class="chart">
            @for (v of s.series; track $index) {
              <div class="bar" [style.height.%]="v"></div>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 1.25rem 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    h2 { margin-top: 0; }
    .loader { display: flex; align-items: center; gap: .6rem; padding: 2rem 0; color: #6b7280; }
    .tiles { display: flex; gap: 1rem; margin-bottom: 1.25rem; }
    .tile { flex: 1; background: #f8fafc; border-radius: 10px; padding: 1rem; text-align: center; }
    .tile b { display: block; font-size: 1.6rem; color: #4338ca; }
    .tile span { color: #6b7280; font-size: .85rem; }
    .chart { display: flex; align-items: flex-end; gap: .75rem; height: 180px; padding: 1rem; background: #f8fafc; border-radius: 10px; }
    .bar { flex: 1; background: linear-gradient(180deg, #6366f1, #4338ca); border-radius: 6px 6px 0 0; }
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

  readonly loading = signal(true);
  readonly stats = signal<Stats | null>(null);

  ngOnInit(): void {
    this.api.getStats().subscribe((s) => {
      this.stats.set(s);
      this.loading.set(false);
    });
  }
}
