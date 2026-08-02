/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';

import { OnboardingConfig, OnboardingStep } from './models';
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
});
