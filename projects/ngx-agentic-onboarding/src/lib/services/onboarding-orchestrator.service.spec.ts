/// <reference types="jasmine" />
import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import {
  OnboardingConfig,
  OnboardingLifecycleEvent,
  OnboardingStep,
} from '../models';
import { OnboardingEventBus } from './onboarding-event-bus.service';
import { OnboardingOrchestrator } from './onboarding-orchestrator.service';
import {
  ONBOARDING_RENDERER,
  OnboardingRenderControls,
  OnboardingRenderer,
} from './onboarding-renderer';
import { ONBOARDING_STORAGE, OnboardingStorage } from './onboarding-storage';

/** In-memory storage double so tests never touch real localStorage. */
class FakeStorage implements OnboardingStorage {
  readonly seen = new Set<string>();
  isCompleted(key: string): boolean {
    return this.seen.has(key);
  }
  markCompleted(key: string): void {
    this.seen.add(key);
  }
  clear(key: string): void {
    this.seen.delete(key);
  }
}

/** Renderer double that records every show/hide for assertions. */
class FakeRenderer implements OnboardingRenderer {
  readonly shown: {
    step: OnboardingStep;
    target: Element | null;
    controls: OnboardingRenderControls;
  }[] = [];
  hideCount = 0;

  show(
    step: OnboardingStep,
    target: Element | null,
    controls: OnboardingRenderControls,
  ): void {
    this.shown.push({ step, target, controls });
  }
  hide(): void {
    this.hideCount++;
  }

  get last() {
    return this.shown[this.shown.length - 1];
  }
}

const flush = () => new Promise<void>((r) => setTimeout(r, 0));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Builds a config; steps default to target-less (center) steps. */
function config(
  steps: OnboardingStep[],
  options?: OnboardingConfig['options'],
): OnboardingConfig {
  return { version: '1.0.0', id: 'test', steps, options };
}

describe('OnboardingOrchestrator', () => {
  let orchestrator: OnboardingOrchestrator;
  let bus: OnboardingEventBus;
  let renderer: FakeRenderer;
  let router: { navigateByUrl: jasmine.Spy };
  let storage: FakeStorage;
  const createdEls: Element[] = [];
  const KEY = 'ngx-onboarding:test:1.0.0';

  function addTarget(id: string): Element {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
    createdEls.push(el);
    return el;
  }

  function events(): string[] {
    const seen: string[] = [];
    bus.events$.subscribe((e) => seen.push(e.type));
    return seen;
  }

  beforeEach(() => {
    renderer = new FakeRenderer();
    storage = new FakeStorage();
    router = { navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) };

    TestBed.configureTestingModule({
      providers: [
        OnboardingOrchestrator,
        OnboardingEventBus,
        { provide: ONBOARDING_RENDERER, useValue: renderer },
        { provide: ONBOARDING_STORAGE, useValue: storage },
        { provide: Router, useValue: router },
      ],
    });
    orchestrator = TestBed.inject(OnboardingOrchestrator);
    bus = TestBed.inject(OnboardingEventBus);
  });

  afterEach(() => {
    createdEls.forEach((el) => el.remove());
    createdEls.length = 0;
  });

  it('reflects the loaded step count reactively (regression: totalSteps stayed 0)', async () => {
    // Read the derived signals BEFORE loading — the original bug cached these
    // at 0 forever because they read a plain (non-signal) field.
    expect(orchestrator.totalSteps()).toBe(0);
    expect(orchestrator.progress()).toBe(0);

    orchestrator.start(config([{ id: 's0' }, { id: 's1' }, { id: 's2' }]));
    await flush();

    expect(orchestrator.totalSteps()).toBe(3);
    expect(orchestrator.currentIndex()).toBe(0);
    expect(orchestrator.currentStep()?.id).toBe('s0');
    expect(orchestrator.status()).toBe('running');
    expect(orchestrator.progress()).toBeCloseTo(1 / 3);
  });

  it('advances with next() and returns with prev()', async () => {
    orchestrator.start(config([{ id: 's0' }, { id: 's1' }, { id: 's2' }]));
    await flush();

    orchestrator.next();
    await flush();
    expect(orchestrator.currentIndex()).toBe(1);

    orchestrator.prev();
    await flush();
    expect(orchestrator.currentIndex()).toBe(0);
    expect(renderer.last.step.id).toBe('s0');
  });

  it('completes after the last step and tears down', async () => {
    const seen = events();
    orchestrator.start(config([{ id: 's0' }, { id: 's1' }]));
    await flush();

    orchestrator.next(); // -> s1 (last)
    await flush();
    orchestrator.next(); // past last -> complete
    await flush();

    expect(orchestrator.status()).toBe('completed');
    expect(orchestrator.currentIndex()).toBe(-1);
    expect(renderer.hideCount).toBeGreaterThan(0);
    expect(seen).toContain(OnboardingLifecycleEvent.TourCompleted);
  });

  describe('waitForEvent', () => {
    it('pauses on a gated step and advances when the event fires', async () => {
      orchestrator.start(
        config([{ id: 's0' }, { id: 's1', waitForEvent: 'X' }, { id: 's2' }]),
      );
      await flush();
      orchestrator.next(); // -> s1 (gated)
      await flush();

      expect(orchestrator.status()).toBe('waiting');
      expect(orchestrator.currentIndex()).toBe(1);
      expect(renderer.last.controls.isWaitingForEvent).toBeTrue();

      bus.emit('X');
      await flush();

      expect(orchestrator.currentIndex()).toBe(2);
      expect(orchestrator.status()).toBe('running');
    });

    it('respects eventFilter and ignores non-matching payloads', async () => {
      orchestrator.start(
        config([
          {
            id: 's0',
            waitForEvent: 'X',
            eventFilter: (p) => (p as { ok: boolean }).ok === true,
          },
          { id: 's1' },
        ]),
      );
      await flush();
      expect(orchestrator.status()).toBe('waiting');

      bus.emit('X', { ok: false });
      await flush();
      expect(orchestrator.currentIndex()).toBe(0); // still gated

      bus.emit('X', { ok: true });
      await flush();
      expect(orchestrator.currentIndex()).toBe(1);
    });
  });

  describe('waitForEvent timeout', () => {
    it('reveals Next and stays put when the event never fires (default)', async () => {
      orchestrator.start(
        config([
          { id: 's0', waitForEvent: 'X', waitForEventTimeoutMs: 30 },
          { id: 's1' },
        ]),
      );
      await flush();
      expect(orchestrator.status()).toBe('waiting');
      expect(renderer.last.controls.isWaitingForEvent).toBeTrue();

      await wait(70);

      // Un-gated in place: same step, Next now available, not advanced.
      expect(orchestrator.status()).toBe('running');
      expect(orchestrator.currentIndex()).toBe(0);
      expect(renderer.last.controls.isWaitingForEvent).toBeFalse();
    });

    it('emits StepWaitTimeout when the wait elapses', async () => {
      const seen = events();
      orchestrator.start(
        config([{ id: 's0', waitForEvent: 'X', waitForEventTimeoutMs: 30 }]),
      );
      await wait(70);

      expect(seen).toContain(OnboardingLifecycleEvent.StepWaitTimeout);
    });

    it('auto-advances on timeout when onWaitTimeout is "advance"', async () => {
      orchestrator.start(
        config([{ id: 's0', waitForEvent: 'X' }, { id: 's1' }], {
          waitForEventTimeoutMs: 30,
          onWaitTimeout: 'advance',
        }),
      );
      await wait(70);

      expect(orchestrator.currentIndex()).toBe(1);
      expect(orchestrator.status()).toBe('running');
    });

    it('aborts the tour on timeout when onWaitTimeout is "skip"', async () => {
      orchestrator.start(
        config([{ id: 's0', waitForEvent: 'X' }, { id: 's1' }], {
          waitForEventTimeoutMs: 30,
          onWaitTimeout: 'skip',
        }),
      );
      await wait(70);

      expect(orchestrator.status()).toBe('skipped');
      expect(orchestrator.currentIndex()).toBe(-1);
    });

    it('does not fire the timeout once the event arrives first', async () => {
      orchestrator.start(
        config([
          { id: 's0', waitForEvent: 'X', waitForEventTimeoutMs: 40 },
          { id: 's1' },
        ]),
      );
      await flush();
      bus.emit('X');
      await flush();
      expect(orchestrator.currentIndex()).toBe(1);

      // The now-cancelled timer must not disturb the following step.
      await wait(70);
      expect(orchestrator.currentIndex()).toBe(1);
      expect(orchestrator.status()).toBe('running');
    });
  });

  describe('target loss while a step is visible', () => {
    it('re-resolves and re-paints when the target is swapped out', async () => {
      const el = addTarget('welcome');
      orchestrator.start(
        config([{ id: 's0', targetSelector: '#welcome' }], {
          waitForSelectorTimeoutMs: 200,
          selectorPollIntervalMs: 10,
        }),
      );
      await flush();
      expect(renderer.last.target).toBe(el);
      const shownBefore = renderer.shown.length;

      // Host re-renders the list: old node detached, fresh one takes its place.
      el.remove();
      const el2 = addTarget('welcome');
      await wait(80);

      expect(renderer.shown.length).toBeGreaterThan(shownBefore);
      expect(renderer.last.target).toBe(el2);
      expect(orchestrator.status()).toBe('running');
    });

    it('closes the tour cleanly when the target never returns', async () => {
      const seen = events();
      const el = addTarget('welcome');
      orchestrator.start(
        config([{ id: 's0', targetSelector: '#welcome' }], {
          waitForSelectorTimeoutMs: 40,
          selectorPollIntervalMs: 10,
        }),
      );
      await flush();

      el.remove();
      await wait(120);

      expect(seen).toContain(OnboardingLifecycleEvent.StepTargetLost);
      expect(seen).toContain(OnboardingLifecycleEvent.StepError);
      expect(orchestrator.status()).toBe('skipped');
      expect(orchestrator.currentIndex()).toBe(-1);
    });
  });

  describe('conditional steps (enabled)', () => {
    it('skips a disabled step going forward', async () => {
      orchestrator.start(
        config([
          { id: 's0' },
          { id: 's1', enabled: () => false },
          { id: 's2' },
        ]),
      );
      await flush();
      orchestrator.next(); // targets s1 (disabled) -> lands on s2
      await flush();

      expect(orchestrator.currentIndex()).toBe(2);
      expect(orchestrator.currentStep()?.id).toBe('s2');
    });

    it('skips a disabled step going backward', async () => {
      orchestrator.start(
        config([
          { id: 's0' },
          { id: 's1', enabled: () => false },
          { id: 's2' },
        ]),
      );
      await flush();
      orchestrator.next();
      await flush();
      expect(orchestrator.currentIndex()).toBe(2);

      orchestrator.prev(); // targets s1 (disabled) -> lands on s0
      await flush();
      expect(orchestrator.currentIndex()).toBe(0);
    });

    it('awaits an async enabled() predicate', async () => {
      orchestrator.start(
        config([
          { id: 's0' },
          { id: 's1', enabled: () => Promise.resolve(false) },
          { id: 's2' },
        ]),
      );
      await flush();
      orchestrator.next();
      await flush();

      expect(orchestrator.currentStep()?.id).toBe('s2');
    });

    it('skips a disabled first step when starting', async () => {
      orchestrator.start(
        config([{ id: 's0', enabled: () => false }, { id: 's1' }]),
      );
      await flush();

      expect(orchestrator.currentStep()?.id).toBe('s1');
    });

    it('emits StepSkipped for a disabled step and never runs its hooks', async () => {
      const seen = events();
      const hookRan = jasmine.createSpy('beforeStep');
      orchestrator.start(
        config([
          { id: 's0' },
          { id: 's1', enabled: () => false, beforeStep: hookRan },
          { id: 's2' },
        ]),
      );
      await flush();
      orchestrator.next();
      await flush();

      expect(seen).toContain(OnboardingLifecycleEvent.StepSkipped);
      expect(hookRan).not.toHaveBeenCalled();
    });

    it('completes when every remaining step is disabled', async () => {
      const seen = events();
      orchestrator.start(
        config([{ id: 's0' }, { id: 's1', enabled: () => false }]),
      );
      await flush();
      orchestrator.next(); // nothing enabled ahead -> complete
      await flush();

      expect(orchestrator.status()).toBe('completed');
      expect(seen).toContain(OnboardingLifecycleEvent.TourCompleted);
    });

    it('passes step/index/total context to enabled()', async () => {
      const contexts: { index: number; total: number }[] = [];
      orchestrator.start(
        config([
          { id: 's0' },
          {
            id: 's1',
            enabled: (c) => {
              contexts.push({ index: c.index, total: c.total });
              return true;
            },
          },
        ]),
      );
      await flush();
      orchestrator.next();
      await flush();

      expect(contexts[0]).toEqual({ index: 1, total: 2 });
    });

    it('shows the step (fail-open) when enabled() throws', async () => {
      orchestrator.start(
        config([
          { id: 's0' },
          {
            id: 's1',
            enabled: () => {
              throw new Error('boom');
            },
          },
        ]),
      );
      await flush();
      orchestrator.next();
      await flush();

      expect(orchestrator.currentStep()?.id).toBe('s1');
    });
  });

  it('navigates via the router before showing a step', async () => {
    orchestrator.start(
      config([{ id: 's0' }, { id: 's1', navigateToRoute: '/dash' }]),
    );
    await flush();
    orchestrator.next();
    await flush();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dash');
    expect(orchestrator.currentIndex()).toBe(1);
  });

  it('resolves a present target element and passes it to the renderer', async () => {
    const el = addTarget('welcome');
    orchestrator.start(config([{ id: 's0', targetSelector: '#welcome' }]));
    await flush();

    expect(renderer.last.target).toBe(el);
  });

  it('emits StepError for a missing non-optional target but still shows it', async () => {
    const seen = events();
    orchestrator.start(
      config([{ id: 's0', targetSelector: '#absent' }], {
        waitForSelectorTimeoutMs: 40,
        selectorPollIntervalMs: 10,
      }),
    );
    await wait(120);

    expect(seen).toContain(OnboardingLifecycleEvent.StepError);
    expect(renderer.last.step.id).toBe('s0');
    expect(renderer.last.target).toBeNull();
  });

  it('does not error for a missing OPTIONAL target', async () => {
    const seen = events();
    orchestrator.start(
      config([{ id: 's0', targetSelector: '#absent', optional: true }], {
        waitForSelectorTimeoutMs: 40,
        selectorPollIntervalMs: 10,
      }),
    );
    await wait(120);

    expect(seen).not.toContain(OnboardingLifecycleEvent.StepError);
    expect(renderer.last.target).toBeNull();
  });

  it('skip() aborts, tears down and emits TourSkipped', async () => {
    const seen = events();
    orchestrator.start(config([{ id: 's0' }, { id: 's1' }]));
    await flush();

    orchestrator.skip();

    expect(orchestrator.status()).toBe('skipped');
    expect(orchestrator.currentIndex()).toBe(-1);
    expect(renderer.hideCount).toBeGreaterThan(0);
    expect(seen).toContain(OnboardingLifecycleEvent.TourSkipped);
  });

  it('runs before/after hooks around a transition', async () => {
    const calls: string[] = [];
    orchestrator.start(
      config([
        { id: 's0', afterStep: () => void calls.push('after-s0') },
        { id: 's1', beforeStep: () => void calls.push('before-s1') },
      ]),
    );
    await flush();
    orchestrator.next();
    await flush();

    expect(calls).toEqual(['after-s0', 'before-s1']);
  });

  it('emits TourStarted and StepShown lifecycle events', async () => {
    const seen = events();
    orchestrator.start(config([{ id: 's0' }]));
    await flush();

    expect(seen).toContain(OnboardingLifecycleEvent.TourStarted);
    expect(seen).toContain(OnboardingLifecycleEvent.StepShown);
  });

  describe('persistence', () => {
    it('marks the tour as seen on complete()', async () => {
      orchestrator.start(config([{ id: 's0' }]));
      await flush();
      orchestrator.next(); // completes the single-step tour
      await flush();

      expect(storage.isCompleted(KEY)).toBeTrue();
    });

    it('marks the tour as seen on skip()', async () => {
      orchestrator.start(config([{ id: 's0' }, { id: 's1' }]));
      await flush();
      orchestrator.skip();

      expect(storage.isCompleted(KEY)).toBeTrue();
    });

    it('does not persist when persist:false', async () => {
      orchestrator.start({
        version: '1.0.0',
        id: 'test',
        persist: false,
        steps: [{ id: 's0' }],
      });
      await flush();
      orchestrator.next();
      await flush();

      expect(storage.isCompleted(KEY)).toBeFalse();
    });

    it('startIfNotCompleted starts when unseen and refuses when seen', async () => {
      const cfg = config([{ id: 's0' }]);

      expect(orchestrator.startIfNotCompleted(cfg)).toBeTrue();
      await flush();
      expect(orchestrator.isActive()).toBeTrue();

      orchestrator.skip(); // marks seen
      expect(orchestrator.startIfNotCompleted(cfg)).toBeFalse();
      expect(orchestrator.isActive()).toBeFalse();
    });

    it('autoStart only starts when startImmediately is set (and unseen)', async () => {
      // No flag -> no auto start.
      expect(orchestrator.autoStart(config([{ id: 's0' }]))).toBeFalse();

      // Flag set + unseen -> starts.
      const auto: OnboardingConfig = {
        version: '1.0.0',
        id: 'test',
        startImmediately: true,
        steps: [{ id: 's0' }],
      };
      expect(orchestrator.autoStart(auto)).toBeTrue();
      await flush();

      // Flag set but already seen -> refuses.
      storage.markCompleted(KEY);
      expect(orchestrator.autoStart(auto)).toBeFalse();
    });

    it('reset() forgets a persisted completion', () => {
      storage.markCompleted(KEY);
      orchestrator.reset(config([{ id: 's0' }]));

      expect(storage.isCompleted(KEY)).toBeFalse();
    });
  });

  describe('without a DOM (SSR)', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          OnboardingOrchestrator,
          OnboardingEventBus,
          { provide: ONBOARDING_RENDERER, useValue: renderer },
          { provide: ONBOARDING_STORAGE, useValue: storage },
          { provide: Router, useValue: router },
          { provide: DOCUMENT, useValue: {} }, // no querySelector
        ],
      });
      orchestrator = TestBed.inject(OnboardingOrchestrator);
      bus = TestBed.inject(OnboardingEventBus);
    });

    it('resolves a null target instead of crashing', async () => {
      orchestrator.start(config([{ id: 's0', targetSelector: '#x' }]));
      await flush();

      expect(orchestrator.currentIndex()).toBe(0);
      expect(renderer.last.target).toBeNull();
    });
  });
});
