/// <reference types="jasmine" />
import { LocalStorageOnboardingStorage } from './onboarding-storage';

describe('LocalStorageOnboardingStorage', () => {
  const KEY = 'ngx-onboarding:spec:1.0.0';

  afterEach(() => localStorage.removeItem(KEY));

  it('round-trips completion through real localStorage', () => {
    const store = new LocalStorageOnboardingStorage(document);

    expect(store.isCompleted(KEY)).toBeFalse();
    store.markCompleted(KEY);
    expect(store.isCompleted(KEY)).toBeTrue();
    expect(localStorage.getItem(KEY)).not.toBeNull();

    store.clear(KEY);
    expect(store.isCompleted(KEY)).toBeFalse();
  });

  it('degrades to a no-op without a window (SSR)', () => {
    const store = new LocalStorageOnboardingStorage({} as Document);

    expect(store.isCompleted(KEY)).toBeFalse();
    expect(() => store.markCompleted(KEY)).not.toThrow();
    expect(() => store.clear(KEY)).not.toThrow();
  });

  it('swallows errors when storage access throws (e.g. blocked cookies)', () => {
    const doc = {
      defaultView: {
        get localStorage(): Storage {
          throw new Error('access denied');
        },
      },
    } as unknown as Document;
    const store = new LocalStorageOnboardingStorage(doc);

    expect(store.isCompleted(KEY)).toBeFalse();
    expect(() => store.markCompleted(KEY)).not.toThrow();
  });
});
