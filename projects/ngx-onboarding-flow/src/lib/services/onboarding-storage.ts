import { DOCUMENT } from '@angular/common';
import { inject, InjectionToken } from '@angular/core';

/**
 * Persistence seam for remembering which tours a user has already seen, so a
 * completed/dismissed tour does not reappear. Swappable via DI (e.g. to persist
 * server-side or in cookies); the default is localStorage.
 */
export interface OnboardingStorage {
  /** Whether the tour under `key` has been marked as seen. */
  isCompleted(key: string): boolean;
  /** Record the tour under `key` as seen. */
  markCompleted(key: string): void;
  /** Forget the tour under `key` so it can be shown again. */
  clear(key: string): void;
}

/**
 * Default {@link OnboardingStorage} backed by `localStorage`. SSR- and
 * privacy-safe: every access is guarded, so a missing window or a throwing
 * localStorage (Safari private mode, blocked storage) degrades to a no-op
 * rather than crashing.
 */
export class LocalStorageOnboardingStorage implements OnboardingStorage {
  constructor(private readonly document: Document) {}

  private get storage(): Storage | null {
    try {
      return this.document?.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  isCompleted(key: string): boolean {
    try {
      return this.storage?.getItem(key) != null;
    } catch {
      return false;
    }
  }

  markCompleted(key: string): void {
    try {
      this.storage?.setItem(key, new Date().toISOString());
    } catch {
      /* storage unavailable — nothing to persist */
    }
  }

  clear(key: string): void {
    try {
      this.storage?.removeItem(key);
    } catch {
      /* storage unavailable — nothing to clear */
    }
  }
}

/**
 * DI token for the active {@link OnboardingStorage}. Provided in root with a
 * localStorage-backed default, so persistence works out of the box; override it
 * to plug in a custom backend.
 */
export const ONBOARDING_STORAGE = new InjectionToken<OnboardingStorage>(
  'ONBOARDING_STORAGE',
  {
    providedIn: 'root',
    factory: () => new LocalStorageOnboardingStorage(inject(DOCUMENT)),
  },
);
