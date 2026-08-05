import { Component, inject, signal } from '@angular/core';
import { OnboardingEventBus } from 'ngx-onboarding-flow';

import { AppEvents } from './tour';

/** Home screen: a list of tasks and a button that adds one. */
@Component({
  selector: 'app-home',
  template: `
    <section id="welcome" class="card">
      <h1>Tasks</h1>
      <p class="muted">A deliberately tiny app, so the tour is the interesting part.</p>
    </section>

    <section class="card">
      <button id="add-btn" class="primary" [disabled]="saving()" (click)="add()">
        {{ saving() ? 'Adding…' : '+ Add task' }}
      </button>

      <ul id="task-list" class="list">
        @for (t of tasks(); track t) {
          <li>{{ t }}</li>
        } @empty {
          <li class="muted">Nothing yet — add one above.</li>
        }
      </ul>
    </section>
  `,
  styles: `
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1.25rem 1.5rem; margin-bottom:1rem; }
    h1 { margin:0 0 .25rem; font-size:1.4rem; }
    .muted { color:#64748b; }
    .primary { font:inherit; cursor:pointer; border:0; border-radius:9px; padding:.55rem 1rem; background:#4f46e5; color:#fff; font-weight:600; }
    .primary:disabled { background:#a5b4fc; cursor:default; }
    .list { list-style:none; padding:0; margin:1rem 0 0; }
    .list li { padding:.6rem .8rem; background:#f8fafc; border-radius:8px; margin-bottom:.4rem; }
  `,
})
export class HomeComponent {
  private readonly bus = inject(OnboardingEventBus);

  readonly tasks = signal<string[]>([]);
  readonly saving = signal(false);
  private n = 0;

  add(): void {
    this.saving.set(true);
    // A fake request, so the tour has real async to wait through.
    setTimeout(() => {
      const title = `Task ${++this.n}`;
      this.tasks.update((list) => [...list, title]);
      this.saving.set(false);
      // The one line this app contributes to onboarding: a domain event,
      // emitted once the work is actually done.
      this.bus.emit<AppEvents['TASK_ADDED']>('TASK_ADDED', { title });
    }, 600);
  }
}
