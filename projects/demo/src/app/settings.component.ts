import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OnboardingEventBus } from 'ngx-agentic-onboarding';

import { AccountService, Plan } from './account.service';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  template: `
    <section id="profile-card" class="card">
      <h2>Profil</h2>

      <label>
        Nazwa wyświetlana
        <input
          id="profile-name"
          type="text"
          [ngModel]="account.displayName()"
          (ngModelChange)="edit(account.displayName.set, $event)"
        />
      </label>

      <label>
        E-mail
        <input
          id="profile-email"
          type="email"
          [ngModel]="account.email()"
          (ngModelChange)="edit(account.email.set, $event)"
        />
      </label>

      <label class="switch">
        <input
          id="notif-toggle"
          type="checkbox"
          [ngModel]="account.emailNotifications()"
          (ngModelChange)="edit(account.emailNotifications.set, $event)"
        />
        Powiadomienia e-mail
      </label>
    </section>

    <section id="plan-card" class="card">
      <h2>Plan</h2>
      <p class="muted">Przełącz na „Zespół", aby odblokować kroki i sekcje premium.</p>
      <div id="plan-toggle" class="segmented" role="tablist">
        <button
          type="button"
          [class.on]="account.plan() === 'free'"
          (click)="setPlan('free')"
        >
          Free
        </button>
        <button
          type="button"
          [class.on]="account.plan() === 'team'"
          (click)="setPlan('team')"
        >
          Zespół
        </button>
      </div>

      <!-- Team-only section: a tour step is gated on the very same condition. -->
      @if (account.isTeam()) {
        <div id="team-section" class="team">
          <label>
            Liczba miejsc
            <input
              type="number"
              min="1"
              [ngModel]="account.seats()"
              (ngModelChange)="edit(account.seats.set, +$event)"
            />
          </label>
        </div>
      }
    </section>

    <!-- Appears only when there are unsaved edits — a dynamically-mounted target. -->
    @if (account.dirty()) {
      <div id="unsaved-banner" class="banner">Masz niezapisane zmiany.</div>
    }

    <div class="save-row">
      <button
        id="save-btn"
        type="button"
        class="primary"
        [disabled]="saving()"
        (click)="save()"
      >
        @if (saving()) {
          <span class="spinner small"></span> Zapisywanie…
        } @else {
          Zapisz zmiany
        }
      </button>
      @if (savedAt()) {
        <span class="saved">✓ Zapisano</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 1.25rem 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    h2 { margin-top: 0; }
    .muted { color: #6b7280; margin-top: 0; }
    label { display: block; font-weight: 600; margin-bottom: 1rem; }
    input[type='text'], input[type='email'], input[type='number'] {
      display: block; width: 100%; max-width: 320px; margin-top: .35rem;
      padding: .55rem .6rem; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit;
    }
    label.switch { display: flex; align-items: center; gap: .55rem; font-weight: 500; }
    label.switch input { width: auto; margin: 0; }
    .segmented { display: inline-flex; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; }
    .segmented button { border: 0; background: #fff; padding: .55rem 1.4rem; font: inherit; cursor: pointer; }
    .segmented button.on { background: #4f46e5; color: #fff; font-weight: 700; }
    .team { margin-top: 1.1rem; padding-top: 1rem; border-top: 1px dashed #e5e7eb; }
    .banner {
      background: #fef3c7; border: 1px solid #fcd34d; color: #92400e;
      padding: .7rem 1rem; border-radius: 10px; margin-bottom: 1rem; font-weight: 600;
    }
    .save-row { display: flex; align-items: center; gap: .9rem; }
    button.primary { background: #4f46e5; color: #fff; border: 0; font-weight: 600; border-radius: 8px; padding: .6rem 1.2rem; cursor: pointer; }
    button.primary:disabled { opacity: .6; cursor: not-allowed; }
    .saved { color: #16a34a; font-weight: 600; }
    .spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid #c7d2fe; border-top-color: #fff;
      display: inline-block; animation: spin .7s linear infinite;
    }
    .spinner.small { width: 13px; height: 13px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class SettingsComponent {
  readonly account = inject(AccountService);
  private readonly bus = inject(OnboardingEventBus);

  readonly saving = signal(false);
  readonly savedAt = signal<number | null>(null);

  /** Applies an edit via the given signal setter and flags the form dirty. */
  edit<T>(setter: (value: T) => void, value: T): void {
    setter(value);
    this.account.dirty.set(true);
    this.savedAt.set(null);
  }

  setPlan(plan: Plan): void {
    if (plan === this.account.plan()) {
      return;
    }
    this.account.plan.set(plan);
    this.account.dirty.set(true);
    this.savedAt.set(null);
  }

  save(): void {
    this.saving.set(true);
    // Simulate a short "request", then announce the domain event the tour waits on.
    setTimeout(() => {
      this.saving.set(false);
      this.account.dirty.set(false);
      this.savedAt.set(Date.now());
      this.bus.emit('SETTINGS_SAVED');
    }, 900);
  }
}
