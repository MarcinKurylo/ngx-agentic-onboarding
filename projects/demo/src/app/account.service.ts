import { Injectable, signal } from '@angular/core';

export type Plan = 'free' | 'team';

/**
 * App-wide account state shared by the pages and — crucially — read by the
 * onboarding tours' `enabled` predicates. Flipping {@link plan} to `team`
 * makes the team-only steps and UI appear; that's what drives the
 * config-driven conditional-step demo.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  readonly plan = signal<Plan>('free');
  readonly displayName = signal('Marcin');
  readonly email = signal('me@example.com');
  readonly emailNotifications = signal(true);
  readonly seats = signal(3);

  /** True when the settings form has edits that haven't been "saved" yet. */
  readonly dirty = signal(false);

  isTeam(): boolean {
    return this.plan() === 'team';
  }
}
