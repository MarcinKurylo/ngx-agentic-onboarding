import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OnboardingEventBus } from 'ngx-agentic-onboarding';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  template: `
    <section id="welcome-card" class="card">
      <h2>Panel projektów</h2>
      <p>Zacznij od utworzenia swojego pierwszego projektu.</p>
    </section>

    <section class="card">
      <h3>Nowy projekt</h3>
      <label>
        Nazwa projektu
        <input
          type="text"
          [(ngModel)]="projectName"
          placeholder="np. Mój genialny projekt"
        />
      </label>
      <button id="btn-submit" type="button" (click)="createProject()">
        Utwórz projekt
      </button>

      @if (created()) {
        <p class="ok">
          ✅ Utworzono „{{ created() }}" — wyemitowano zdarzenie
          <code>PROJECT_CREATED</code>.
        </p>
      }
    </section>
  `,
  styles: `
    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }
    h2, h3 { margin-top: 0; }
    label { display: block; margin-bottom: 0.75rem; font-weight: 600; }
    input {
      display: block;
      width: 100%;
      max-width: 320px;
      margin-top: 0.35rem;
      padding: 0.5rem 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font: inherit;
    }
    button {
      padding: 0.55rem 1.1rem;
      border: 0;
      border-radius: 8px;
      background: #4f46e5;
      color: #fff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #4338ca; }
    .ok { color: #059669; font-weight: 600; }
    code {
      background: #eef2ff;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
    }
  `,
})
export class HomeComponent {
  private readonly bus = inject(OnboardingEventBus);
  private readonly router = inject(Router);

  projectName = '';
  readonly created = signal<string | null>(null);

  createProject(): void {
    const name = this.projectName.trim() || 'Bez nazwy';
    this.created.set(name);

    // The host app emits a plain business event — it knows nothing about the
    // tour. The orchestrator is listening and will advance + route on its own.
    this.bus.emit('PROJECT_CREATED', { name });
  }
}
