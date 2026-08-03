/// <reference types="jasmine" />

import { DOCUMENT } from '@angular/common';
import { ApplicationRef, PLATFORM_ID } from '@angular/core';
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

// Advancing after a business event is gated behind `afterNextRender`, so a
// render has to run for the tour to move on. Tick the ApplicationRef to fire
// those callbacks, then yield a macrotask for the async transition pipeline.
const flush = async () => {
  TestBed.inject(ApplicationRef).tick();
  await new Promise<void>((r) => setTimeout(r, 0));
};
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
  let router: { url: string; navigateByUrl: jasmine.Spy };
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
    router = {
      url: '/',
      navigateByUrl: jasmine
        .createSpy('navigateByUrl')
        .and.callFake((u: string) => {
          router.url = u;
          return Promise.resolve(true);
        }),
    };

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

    it('defers the advance a macrotask so the host can flush its render', async () => {
      orchestrator.start(
        config([{ id: 's0', waitForEvent: 'X' }, { id: 's1' }]),
      );
      await flush();
      expect(orchestrator.status()).toBe('waiting');

      // Synchronously after the event, we must NOT have advanced yet: the DOM
      // change the event triggers hasn't rendered, so resolving s1's target now
      // could match a stale element.
      bus.emit('X');
      expect(orchestrator.currentIndex()).toBe(0);

      await flush();
      expect(orchestrator.currentIndex()).toBe(1);
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

    it('re-points instantly (no hide) when swapped within the same tick', async () => {
      const el = addTarget('welcome');
      orchestrator.start(config([{ id: 's0', targetSelector: '#welcome' }]));
      await flush();
      const hidesBefore = renderer.hideCount;

      el.remove();
      const el2 = addTarget('welcome'); // same synchronous tick
      await wait(40);

      expect(renderer.hideCount).toBe(hidesBefore); // no visible gap
      expect(renderer.last.target).toBe(el2);
    });

    it('hides the overlay while a lost target is missing (no ghost highlight)', async () => {
      const el = addTarget('welcome');
      orchestrator.start(
        config([{ id: 's0', targetSelector: '#welcome' }], {
          waitForSelectorTimeoutMs: 300,
          selectorPollIntervalMs: 10,
        }),
      );
      await flush();
      const hidesBefore = renderer.hideCount;

      el.remove(); // gone, nothing to replace it yet
      await wait(40);
      expect(renderer.hideCount).toBeGreaterThan(hidesBefore); // dropped, not ghosting

      const el2 = addTarget('welcome'); // returns a moment later
      await wait(40);
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

  describe('route memory (back navigation)', () => {
    it('restores the route a step was shown on when stepping back', async () => {
      router.url = '/home';
      orchestrator.start(
        config([
          { id: 's0' }, // shown on /home
          { id: 's1', navigateToRoute: '/dash' },
        ]),
      );
      await flush();
      expect(router.url).toBe('/home');

      orchestrator.next(); // -> /dash
      await flush();
      expect(router.url).toBe('/dash');
      expect(orchestrator.currentIndex()).toBe(1);

      router.navigateByUrl.calls.reset();
      orchestrator.prev(); // back to s0, which lived on /home
      await flush();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
      expect(router.url).toBe('/home');
      expect(orchestrator.currentIndex()).toBe(0);
    });

    it('does not re-navigate when already on the desired route', async () => {
      router.url = '/dash';
      orchestrator.start(config([{ id: 's0', navigateToRoute: '/dash' }]));
      await flush();

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(orchestrator.currentIndex()).toBe(0);
    });
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

  it('silently skips an OPTIONAL step whose target never appears, moving on', async () => {
    const seen = events();
    orchestrator.start(
      config(
        [
          { id: 's0', targetSelector: '#absent', optional: true },
          { id: 's1' },
        ],
        { waitForSelectorTimeoutMs: 40, selectorPollIntervalMs: 10 },
      ),
    );
    await wait(120);
    await flush();

    // No error, and the orphaned step is skipped — not rendered as a modal
    // anchored to nothing — so the tour lands on the next step instead.
    expect(seen).not.toContain(OnboardingLifecycleEvent.StepError);
    expect(seen).toContain(OnboardingLifecycleEvent.StepSkipped);
    expect(orchestrator.currentIndex()).toBe(1);
    expect(renderer.last.step.id).toBe('s1');
    expect(renderer.shown.some((s) => s.step.id === 's0')).toBeFalse();
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

  describe('never leaves a tour active with no way out', () => {
    it('re-arms a waiting step when prev() has nowhere to land (regression: deadlock)', async () => {
      orchestrator.start(
        config([
          { id: 's0', enabled: () => false },
          { id: 's1', waitForEvent: 'X' },
          { id: 's2' },
        ]),
      );
      await flush();
      // s0 is disabled, so start lands on s1 and pauses for its event.
      expect(orchestrator.currentIndex()).toBe(1);
      expect(orchestrator.status()).toBe('waiting');

      // The Back button is offered (index > 0) but nothing enabled precedes s1.
      orchestrator.prev();
      await flush();

      // Still on the same waiting step...
      expect(orchestrator.currentIndex()).toBe(1);
      expect(orchestrator.status()).toBe('waiting');

      // ...and crucially the business event still advances it. Before the fix
      // prev() had cancelled this subscription and nothing re-armed it, so the
      // step deadlocked with skip() the only escape.
      bus.emit('X');
      await flush();
      expect(orchestrator.currentIndex()).toBe(2);
    });

    it('aborts cleanly when a non-optional target is missing and abortOnMissingTarget is set (regression: zombie)', async () => {
      const seen = events();
      orchestrator.start(
        config([{ id: 's0', targetSelector: '#never' }], {
          abortOnMissingTarget: true,
          waitForSelectorTimeoutMs: 0,
          selectorPollIntervalMs: 5,
        }),
      );
      await wait(40);
      await flush();

      // The tour ends instead of staying "active" forever with no popover.
      expect(orchestrator.isActive()).toBeFalse();
      expect(orchestrator.status()).toBe('skipped');
      expect(renderer.shown.length).toBe(0);
      expect(seen).toContain(OnboardingLifecycleEvent.StepError);
      expect(seen).toContain(OnboardingLifecycleEvent.TourSkipped);
    });
  });

  describe('user-visible transition bugs', () => {
    it('does not persist a run where every step was gated off (regression: locked out)', async () => {
      let allowed = false;
      const cfg = config([
        { id: 's0', enabled: () => allowed },
        { id: 's1', enabled: () => allowed },
      ]);

      orchestrator.start(cfg);
      await flush();

      // Nothing was shown -> nothing persisted, engine settles to idle.
      expect(orchestrator.currentIndex()).toBe(-1);
      expect(orchestrator.status()).toBe('idle');
      expect(storage.isCompleted(KEY)).toBeFalse();

      // Predicates flip on later -> the tour can still run.
      allowed = true;
      expect(orchestrator.startIfNotCompleted(cfg)).toBeTrue();
      await flush();
      expect(orchestrator.currentIndex()).toBe(0);
    });

    it('ignores a re-entrant next() while a transition is in flight (regression: double hooks)', async () => {
      let afterS0 = 0;
      orchestrator.start(
        config([
          {
            id: 's0',
            afterStep: async () => {
              afterS0++;
              await wait(20);
            },
          },
          { id: 's1' },
          { id: 's2' },
        ]),
      );
      await flush();
      expect(orchestrator.currentIndex()).toBe(0);

      // Two rapid clicks: the second must be ignored while the first transition
      // is still parked on s0's async afterStep.
      orchestrator.next();
      orchestrator.next();
      await wait(40);
      await flush();

      expect(orchestrator.currentIndex()).toBe(1); // advanced once, not twice
      expect(afterS0).toBe(1); // afterStep ran exactly once
    });
  });

  describe('route restore (shownAtUrl)', () => {
    it('restores the route a routeless step was first shown on, when stepping back', async () => {
      const cfg = config([
        { id: 's0', navigateToRoute: '/a' },
        { id: 's1' }, // no route of its own: first shown on /a
        { id: 's2', navigateToRoute: '/c' },
      ]);
      orchestrator.start(cfg);
      await flush(); // s0 -> /a
      orchestrator.next();
      await flush(); // s1, stays on /a
      orchestrator.next();
      await flush(); // s2 -> /c
      expect(router.url).toBe('/c');

      orchestrator.prev();
      await flush(); // back to s1 -> restore /a from shownAtUrl
      expect(orchestrator.currentIndex()).toBe(1);
      expect(router.url).toBe('/a');
    });

    it('does not restore stale routes on a fresh forward run (regression: both-directions + no clear)', async () => {
      const cfg = config([{ id: 's0' }, { id: 's1', navigateToRoute: '/b' }]);
      orchestrator.start(cfg);
      await flush(); // s0 on '/'
      orchestrator.next();
      await flush(); // s1 -> /b (shownAtUrl now populated)
      orchestrator.skip(); // teardown must clear shownAtUrl

      router.url = '/elsewhere';
      router.navigateByUrl.calls.reset();
      orchestrator.start(cfg);
      await flush(); // s0 again — no route of its own, moving forward

      // Before the fix, s0 (routeless, forward) consulted a surviving
      // shownAtUrl['/'] and yanked the user off /elsewhere. Now: no navigation.
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(router.url).toBe('/elsewhere');
    });
  });

  describe('resource & event-stream hygiene', () => {
    it('stops polling the DOM once the tour is torn down (regression: interval leak)', async () => {
      const spy = spyOn(document, 'querySelector').and.callThrough();
      orchestrator.start(
        config([{ id: 's0', targetSelector: '#never' }], {
          waitForSelectorTimeoutMs: 5000,
          selectorPollIntervalMs: 10,
        }),
      );
      await wait(35); // let a few polls run
      expect(spy.calls.count()).toBeGreaterThan(0);

      orchestrator.skip();
      const afterSkip = spy.calls.count();
      await wait(60); // several poll intervals later

      // The poller was cancelled on teardown — no DOM hits after the skip,
      // instead of hammering querySelector until the 5s selector timeout.
      expect(spy.calls.count()).toBe(afterSkip);
    });

    it('emits TourSkipped when a new tour replaces a running one (regression: silent teardown)', async () => {
      const seen = events();
      orchestrator.start(config([{ id: 'a0' }, { id: 'a1' }]));
      await flush();
      expect(orchestrator.isActive()).toBeTrue();

      // Start a different tour while the first is still running.
      orchestrator.start(config([{ id: 'b0' }]));
      await flush();

      // The replaced tour's end is announced, not swallowed, so a funnel sees a
      // matching end for its TourStarted.
      expect(seen).toContain(OnboardingLifecycleEvent.TourSkipped);
      expect(
        seen.filter((t) => t === OnboardingLifecycleEvent.TourStarted).length,
      ).toBe(2);
    });
  });

  describe('on the server (SSR platform)', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          OnboardingOrchestrator,
          OnboardingEventBus,
          { provide: ONBOARDING_RENDERER, useValue: renderer },
          { provide: ONBOARDING_STORAGE, useValue: storage },
          { provide: Router, useValue: router },
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      orchestrator = TestBed.inject(OnboardingOrchestrator);
      bus = TestBed.inject(OnboardingEventBus);
    });

    it('advances an event-gated step on a macrotask (afterNextRender never fires on the server)', async () => {
      orchestrator.start(
        config([{ id: 's0', waitForEvent: 'X' }, { id: 's1' }]),
      );
      await flush();
      expect(orchestrator.status()).toBe('waiting');

      bus.emit('X');
      await wait(10); // server path defers via setTimeout(advance, 0)
      expect(orchestrator.currentIndex()).toBe(1);
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
