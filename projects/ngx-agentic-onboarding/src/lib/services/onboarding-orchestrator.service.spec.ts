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
  const createdEls: Element[] = [];

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
    router = { navigateByUrl: jasmine.createSpy('navigateByUrl').and.resolveTo(true) };

    TestBed.configureTestingModule({
      providers: [
        OnboardingOrchestrator,
        OnboardingEventBus,
        { provide: ONBOARDING_RENDERER, useValue: renderer },
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

  describe('without a DOM (SSR)', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          OnboardingOrchestrator,
          OnboardingEventBus,
          { provide: ONBOARDING_RENDERER, useValue: renderer },
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
