import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `
    <section class="card">
      <h2>Statystyki</h2>
      <p>Panel pojawił się po automatycznym przełączeniu routingu.</p>

      <div id="chart-main" class="chart">
        <div class="bar" style="height: 40%"></div>
        <div class="bar" style="height: 70%"></div>
        <div class="bar" style="height: 55%"></div>
        <div class="bar" style="height: 90%"></div>
        <div class="bar" style="height: 65%"></div>
      </div>
    </section>
  `,
  styles: `
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }
    h2 { margin-top: 0; }
    .chart {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      height: 180px;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 10px;
    }
    .bar {
      flex: 1;
      background: linear-gradient(180deg, #6366f1, #4338ca);
      border-radius: 6px 6px 0 0;
    }
  `,
})
export class DashboardComponent {}
