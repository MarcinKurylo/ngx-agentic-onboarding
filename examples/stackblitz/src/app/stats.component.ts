import { Component } from '@angular/core';

/** Second route, so the tour has somewhere to navigate to. */
@Component({
  selector: 'app-stats',
  template: `
    <section class="card">
      <h1>Stats</h1>
      <div id="chart" class="chart">
        @for (b of bars; track b.day) {
          <div class="col">
            <div class="bar" [style.height.%]="b.value"></div>
            <span>{{ b.day }}</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.25rem 1.5rem; }
    h1 { margin:0 0 1rem; font-size:1.4rem; }
    .chart { display:flex; align-items:flex-end; gap:.75rem; height:160px; }
    .col { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; gap:.4rem; }
    .bar { width:100%; background:#4f46e5; border-radius:6px 6px 0 0; }
    .col span { font-size:.75rem; color:#64748b; }
  `,
})
export class StatsComponent {
  readonly bars = [
    { day: 'Mon', value: 40 },
    { day: 'Tue', value: 75 },
    { day: 'Wed', value: 55 },
    { day: 'Thu', value: 90 },
    { day: 'Fri', value: 65 },
  ];
}
