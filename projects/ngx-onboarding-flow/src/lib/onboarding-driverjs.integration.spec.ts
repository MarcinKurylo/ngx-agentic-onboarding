/// <reference types="jasmine" />
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  OnboardingConfig,
  OnboardingLifecycleEvent,
  OnboardingStep,
} from './models';
import { provideOnboarding } from './provide-onboarding';
import { OnboardingEventBus } from './services/onboarding-event-bus.service';
import { OnboardingOrchestrator } from './services/onboarding-orchestrator.service';
import { ONBOARDING_STORAGE } from './services/onboarding-storage';

/** Keeps completion out of real localStorage during these tests. */
const noopStorage = {
  isCompleted: () => false,
  markCompleted: () => undefined,
  clear: () => undefined,
};

/**
 * Integration layer: the orchestrator wired to the REAL Driver.js renderer,
 * rendering into the REAL DOM. This is the seam where the "1 step then Done"
 * bug actually surfaced (renderer read total=0 and marked every step last),
 * so these tests assert on the popover Driver.js paints, not on mocks.
 */
describe('Orchestrator + DriverJsRenderer (integration)', () => {
  let orchestrator: OnboardingOrchestrator;
  let bus: OnboardingEventBus;
  const createdEls: Element[] = [];

  const flush = () => new Promise<void>((r) => setTimeout(r, 0));

  function addTarget(id: string): Element {
    const el = document.createElement('div');
    el.id = id;
    el.textContent = id;
    document.body.appendChild(el);
    createdEls.push(el);
    return el;
  }

  function config(steps: OnboardingStep[]): OnboardingConfig {
    return { version: '1.0.0', id: 'it', steps };
  }

  /**
   * Text of the popover's primary button, or null when it is not actually
   * rendered. Driver.js hides the button by hiding its footer ancestor, so we
   * test real layout visibility (offsetWidth/Height/rects) rather than the
   * button's own `display`, which stays block even inside a hidden footer.
   */
  function primaryButtonText(): string | null {
    const btn = document.querySelector<HTMLElement>('.driver-popover-next-btn');
    const visible =
      !!btn &&
      !!(btn.offsetWidth || btn.offsetHeight || btn.getClientRects().length);
    return visible ? (btn!.textContent?.trim() ?? '') : null;
  }

  function popoverTitle(): string | null {
    const el = document.querySelector('.driver-popover-title');
    return el?.textContent?.trim() ?? null;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // animate:false makes each highlight render synchronously & keeps the
        // labels deterministic for assertions.
        provideOnboarding({
          animate: false,
          nextLabel: 'Dalej',
          doneLabel: 'Zakończ',
        }),
        { provide: ONBOARDING_STORAGE, useValue: noopStorage },
      ],
    });
    orchestrator = TestBed.inject(OnboardingOrchestrator);
    bus = TestBed.inject(OnboardingEventBus);
  });

  afterEach(() => {
    orchestrator.skip(); // destroys the Driver.js overlay/popover
    createdEls.forEach((el) => el.remove());
    createdEls.length = 0;
  });

  it('paints a popover and shows the correct primary button per step', async () => {
    addTarget('welcome');
    addTarget('create');
    orchestrator.start(
      config([
        { id: 's0', targetSelector: '#welcome', title: 'Witaj' },
        { id: 's1', targetSelector: '#create', title: 'Stwórz' },
      ]),
    );
    await flush();

    // Regression: with total wired correctly, step 0 of 2 is NOT the last, so
    // it must read "Dalej" — the bug rendered "Zakończ" here.
    expect(orchestrator.totalSteps()).toBe(2);
    expect(document.querySelector('.driver-popover')).not.toBeNull();
    expect(popoverTitle()).toBe('Witaj');
    expect(primaryButtonText()).toBe('Dalej');

    orchestrator.next();
    await flush();

    // Last step -> the primary button becomes the done button.
    expect(popoverTitle()).toBe('Stwórz');
    expect(primaryButtonText()).toBe('Zakończ');
  });

  it('tags the popover with the base hook class and a per-step class', async () => {
    addTarget('welcome');
    orchestrator.start(
      config([
        { id: 's0', targetSelector: '#welcome', popoverClass: 'my-step' },
      ]),
    );
    await flush();

    const pop = document.querySelector('.driver-popover');
    expect(pop?.classList.contains('ngx-onboarding')).toBeTrue();
    expect(pop?.classList.contains('my-step')).toBeTrue();
  });

  it('escapes step title/content by default, neutralising injected HTML', async () => {
    const w = window as unknown as { __xssFired?: boolean };
    w.__xssFired = false;
    addTarget('welcome');
    orchestrator.start(
      config([
        {
          id: 's0',
          targetSelector: '#welcome',
          title: 'Hi <img src=x onerror="window.__xssFired=true">',
          content: 'Body <b id="injected-marker">x</b>',
        },
      ]),
    );
    await flush();

    // The payload is rendered as literal text: no elements are parsed from it
    // and the attacker's onerror never runs.
    expect(document.querySelector('#injected-marker')).toBeNull();
    expect(w.__xssFired).toBeFalse();
    expect(popoverTitle()).toBe(
      'Hi <img src=x onerror="window.__xssFired=true">',
    );
    const desc = document.querySelector('.driver-popover-description');
    expect(desc?.textContent).toContain('<b id="injected-marker">x</b>');

    delete w.__xssFired;
  });

  it('renders raw HTML only when the step opts in with allowHtml', async () => {
    addTarget('welcome');
    orchestrator.start(
      config([
        {
          id: 's0',
          targetSelector: '#welcome',
          content: 'Body <b id="opt-in-marker">bold</b>',
          allowHtml: true,
        },
      ]),
    );
    await flush();

    // With the explicit opt-in the markup becomes a live element again.
    expect(document.querySelector('#opt-in-marker')).not.toBeNull();
  });

  it('hides the primary button while a step waits for a business event', async () => {
    addTarget('create');
    orchestrator.start(
      config([{ id: 's0', targetSelector: '#create', waitForEvent: 'DONE' }]),
    );
    await flush();

    expect(orchestrator.status()).toBe('waiting');
    // Next is hidden so the user must perform the real action.
    expect(primaryButtonText()).toBeNull();

    bus.emit('DONE');
    await flush();

    // Only one step -> firing the event completes the tour and removes overlay.
    expect(orchestrator.status()).toBe('completed');
    expect(document.querySelector('.driver-popover')).toBeNull();
  });

  it('closing with Escape routes through the orchestrator (regression: left tour active)', async () => {
    addTarget('welcome');
    orchestrator.start(
      config([
        { id: 's0', targetSelector: '#welcome', title: 'Witaj' },
        { id: 's1', title: 'Drugi' },
      ]),
    );
    await flush();
    expect(orchestrator.isActive()).toBeTrue();
    expect(document.querySelector('.driver-popover')).not.toBeNull();

    // Driver.js binds its keyboard handler on window.
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));
    await flush();

    // The overlay is gone AND the engine knows the tour ended — before the fix
    // Driver.js tore down the popover without ever telling the orchestrator, so
    // it stayed active forever and every launcher stayed disabled.
    expect(document.querySelector('.driver-popover')).toBeNull();
    expect(orchestrator.status()).toBe('skipped');
    expect(orchestrator.isActive()).toBeFalse();
  });

  it('a step with allowSkip:false cannot be dismissed with Escape', async () => {
    addTarget('welcome');
    orchestrator.start(
      config([
        { id: 's0', targetSelector: '#welcome', title: 'Obowiązkowy', allowSkip: false },
      ]),
    );
    await flush();
    expect(orchestrator.isActive()).toBeTrue();

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));
    await flush();

    // The mandatory step swallows the Escape: overlay stays, tour stays active.
    expect(document.querySelector('.driver-popover')).not.toBeNull();
    expect(orchestrator.isActive()).toBeTrue();
  });

  it('uses a per-step button label, falling back to the renderer default', async () => {
    addTarget('welcome');
    addTarget('two');
    orchestrator.start(
      config([
        { id: 's0', targetSelector: '#welcome', nextLabel: 'Rozumiem' },
        { id: 's1', targetSelector: '#two' },
      ]),
    );
    await flush();
    // s0 overrides the Next label...
    expect(primaryButtonText()).toBe('Rozumiem');

    orchestrator.next();
    await flush();
    // ...s1 has no override, so the last step falls back to the doneLabel.
    expect(primaryButtonText()).toBe('Zakończ');
  });

  it('renders a center step as a modal, ignoring its target element', async () => {
    addTarget('anchor');
    orchestrator.start(
      config([
        {
          id: 's0',
          targetSelector: '#anchor',
          placement: 'center',
          title: 'Modal',
        },
        { id: 's1', title: 'Drugi' },
      ]),
    );
    await flush();

    // The popover shows, but the target is NOT highlighted — a centered modal
    // ignores it. Driver.js tags the highlighted element with this class.
    expect(popoverTitle()).toBe('Modal');
    expect(
      document.getElementById('anchor')?.classList.contains(
        'driver-active-element',
      ),
    ).toBeFalse();
  });

  it('catches a business event fired synchronously in the StepShown handler (regression: lost)', async () => {
    addTarget('welcome');
    // The host reacts to StepShown by immediately completing the gated action,
    // firing the event inside the same emit — before the subscription used to
    // exist. With the wait armed first, it must still be caught.
    const sub = bus.events$.subscribe((e) => {
      if (
        e.type === OnboardingLifecycleEvent.StepShown &&
        (e.payload as { id?: string })?.id === 's0'
      ) {
        bus.emit('GO');
      }
    });

    orchestrator.start(
      config([
        { id: 's0', targetSelector: '#welcome', waitForEvent: 'GO' },
        { id: 's1', title: 'Drugi' },
      ]),
    );
    await flush();
    await flush();

    // The tour advanced instead of hanging on an event it never heard.
    expect(orchestrator.currentIndex()).toBe(1);
    sub.unsubscribe();
  });
});

/**
 * Zoneless coverage. From Angular 21 a fresh app is zoneless by default, so the
 * `scheduleEventAdvance` branch that re-enters NgZone (or, with a NoopNgZone,
 * schedules `afterNextRender` directly) is what a growing majority of consumers
 * actually hit. The other suites all run under zone.js, where a change detection
 * fires after every macrotask and flushes `afterNextRender` "for free" — so this
 * path is otherwise never exercised. Here there is no zone: nothing ticks unless
 * the engine itself drives a render, which is exactly what we assert.
 */
describe('Orchestrator + DriverJsRenderer (integration, zoneless)', () => {
  let orchestrator: OnboardingOrchestrator;
  let bus: OnboardingEventBus;
  let appRef: ApplicationRef;
  const createdEls: Element[] = [];

  // No zone.js driving change detection. We pump macrotasks (the engine bounces
  // its advance scheduling to a macrotask) and await app stability — we do NOT
  // call tick() ourselves, so the advance only completes if the engine actually
  // causes a render for its afterNextRender to fire on, the way a real zoneless
  // app relies on the scheduler.
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await new Promise<void>((r) => setTimeout(r));
      await appRef.whenStable();
    }
  };

  function addTarget(id: string): Element {
    const el = document.createElement('div');
    el.id = id;
    el.textContent = id;
    document.body.appendChild(el);
    createdEls.push(el);
    return el;
  }

  function config(steps: OnboardingStep[]): OnboardingConfig {
    return { version: '1.0.0', id: 'it-zoneless', steps };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideOnboarding({ animate: false, nextLabel: 'Dalej', doneLabel: 'Zakończ' }),
        { provide: ONBOARDING_STORAGE, useValue: noopStorage },
      ],
    });
    orchestrator = TestBed.inject(OnboardingOrchestrator);
    bus = TestBed.inject(OnboardingEventBus);
    appRef = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    orchestrator.skip();
    createdEls.forEach((el) => el.remove());
    createdEls.length = 0;
  });

  it('advances a waitForEvent step under zoneless change detection', async () => {
    addTarget('create');
    orchestrator.start(
      config([{ id: 's0', targetSelector: '#create', waitForEvent: 'DONE' }]),
    );
    await settle();

    expect(orchestrator.status()).toBe('waiting');

    bus.emit('DONE');
    await settle();

    // The advance is scheduled through afterNextRender; with no zone to tick for
    // us, reaching 'completed' proves the engine drove the render itself.
    expect(orchestrator.status()).toBe('completed');
    expect(document.querySelector('.driver-popover')).toBeNull();
  });

  it('advances between two steps under zoneless (mid-tour, not just completion)', async () => {
    addTarget('welcome');
    addTarget('create');
    orchestrator.start(
      config([
        { id: 's0', targetSelector: '#welcome', waitForEvent: 'GO' },
        { id: 's1', targetSelector: '#create', title: 'Drugi' },
      ]),
    );
    await settle();

    expect(orchestrator.currentIndex()).toBe(0);
    expect(orchestrator.status()).toBe('waiting');

    bus.emit('GO');
    await settle();

    expect(orchestrator.currentIndex()).toBe(1);
    expect(orchestrator.status()).not.toBe('waiting');
  });
});
