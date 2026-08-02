import { DOCUMENT, isPlatformServer } from '@angular/common';
import {
  afterNextRender,
  computed,
  DestroyRef,
  inject,
  Injectable,
  Injector,
  NgZone,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  DEFAULT_ONBOARDING_OPTIONS,
  OnboardingConfig,
  ResolvedOnboardingOptions,
} from '../models/onboarding-config.model';
import { OnboardingLifecycleEvent } from '../models/onboarding-event.model';
import { OnboardingStep } from '../models/onboarding-step.model';
import { OnboardingEventBus } from './onboarding-event-bus.service';
import {
  ONBOARDING_RENDERER,
  OnboardingRenderControls,
} from './onboarding-renderer';
import { ONBOARDING_STORAGE } from './onboarding-storage';

/** Lifecycle status of the orchestrator's state machine. */
export type OnboardingStatus =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'skipped';

/**
 * The steering engine — pillar three of the architecture.
 *
 * It owns the tour state machine and coordinates *asynchronous* transitions:
 * running lifecycle hooks, driving the router, waiting for the target selector
 * to appear in the DOM, and — crucially — pausing on {@link OnboardingStep.waitForEvent}
 * until the host app emits the matching business event on the
 * {@link OnboardingEventBus}. Every asynchronous stage is cancellable and
 * guarded so a mid-flight navigation or a missing element can never crash the
 * host view.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingOrchestrator {
  private readonly bus = inject(OnboardingEventBus);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router, { optional: true });
  private readonly renderer = inject(ONBOARDING_RENDERER, { optional: true });
  private readonly storage = inject(ONBOARDING_STORAGE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone, { optional: true });
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  /**
   * The loaded config, held in a signal so that every `computed()` derived
   * from it (totalSteps, currentStep, progress) reacts when it changes. Read
   * everywhere via the {@link config} getter, which tracks the signal.
   */
  private readonly _config = signal<OnboardingConfig | null>(null);
  private get config(): OnboardingConfig | null {
    return this._config();
  }
  private options: ResolvedOnboardingOptions = DEFAULT_ONBOARDING_OPTIONS;

  /**
   * Monotonic token identifying the in-flight transition. Every `await` in the
   * pipeline re-checks it; if it has moved on, the stale transition bails out.
   */
  private transitionToken = 0;

  /**
   * True while a transition is parked mid-pipeline. Guards {@link next}/{@link
   * prev} so a re-entrant call (a double-click) can't read the pre-commit index
   * and re-run the same move, firing its hooks twice.
   */
  private transitionInFlight = false;

  /** Active subscription waiting on a step's business event, if any. */
  private waitSub: Subscription | null = null;

  /** Timer that fires when a business-event wait exceeds its timeout. */
  private waitTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Cancels the in-flight DOM poll / settle delay, if any. Lets a teardown or a
   * superseded transition stop it immediately instead of hammering the DOM
   * until the full selector timeout.
   */
  private pendingCancel: (() => void) | null = null;

  /** Observes the DOM to detect the visible step's target being removed. */
  private targetObserver: MutationObserver | null = null;

  /**
   * Render context of the step currently on screen. Held so the engine can
   * re-paint the same step in place (on target recovery or a wait timeout)
   * without re-running the transition pipeline or its hooks.
   */
  private active: {
    step: OnboardingStep;
    target: Element | null;
    index: number;
    token: number;
  } | null = null;

  /**
   * Router URL each step was last shown on, keyed by step index. Lets the
   * engine restore the right route when moving *backward* to a step that lived
   * on an earlier route but declares no `navigateToRoute` of its own.
   */
  private readonly shownAtUrl = new Map<number, string>();

  // --- Reactive state ----------------------------------------------------

  private readonly _index = signal(-1);
  private readonly _status = signal<OnboardingStatus>('idle');

  /** Zero-based index of the active step (`-1` when idle). */
  readonly currentIndex = this._index.asReadonly();

  /** Current lifecycle status of the engine. */
  readonly status = this._status.asReadonly();

  /** The currently active step, or `null` when idle. */
  readonly currentStep = computed<OnboardingStep | null>(() => {
    const steps = this.config?.steps;
    const i = this._index();
    return steps && i >= 0 && i < steps.length ? steps[i] : null;
  });

  /** Total number of steps in the loaded tour. */
  readonly totalSteps = computed(() => this.config?.steps.length ?? 0);

  /** Whether a tour is currently running or waiting. */
  readonly isActive = computed(
    () => this._status() === 'running' || this._status() === 'waiting',
  );

  /** Completion progress in the range `[0, 1]`. */
  readonly progress = computed(() => {
    const total = this.totalSteps();
    return total === 0 ? 0 : (this._index() + 1) / total;
  });

  constructor() {
    // Ensure we never leak overlays or event subscriptions on teardown.
    this.destroyRef.onDestroy(() => this.teardown('skipped'));
  }

  // --- Public API --------------------------------------------------------

  /**
   * Load a config (if provided) and begin the tour from the first step.
   *
   * @param config Optional config to load; reuses the previously loaded one
   *               when omitted.
   */
  start(config?: OnboardingConfig): void {
    if (config) {
      this.load(config);
    }
    if (!this.config || this.config.steps.length === 0) {
      console.warn('[ngx-agentic-onboarding] start() called with no steps.');
      return;
    }
    this.bus.emit(OnboardingLifecycleEvent.TourStarted, {
      id: this.config.id,
    });
    void this.goTo(0);
  }

  /** Advance to the next step, completing the tour after the last one. */
  next(): void {
    if (!this.isActive() || this.transitionInFlight) {
      return;
    }
    const target = this._index() + 1;
    if (target >= this.totalSteps()) {
      this.complete();
    } else {
      void this.runTransition(target, 1);
    }
  }

  /** Return to the previous step (no-op on the first step). */
  prev(): void {
    if (!this.isActive() || this.transitionInFlight) {
      return;
    }
    const target = this._index() - 1;
    if (target >= 0) {
      void this.runTransition(target, -1);
    }
  }

  /** Skip/abort the tour before completion. Counts as "seen" for persistence. */
  skip(): void {
    if (!this.isActive()) {
      return;
    }
    this.bus.emit(OnboardingLifecycleEvent.TourSkipped, {
      id: this.config?.id,
      atIndex: this._index(),
    });
    this.persistSeen();
    this.teardown('skipped');
  }

  /**
   * Start the tour unless it has already been completed/dismissed (per
   * {@link OnboardingStorage}). Returns `true` if it actually started.
   *
   * @param config Optional config to load first.
   */
  startIfNotCompleted(config?: OnboardingConfig): boolean {
    if (config) {
      this.load(config);
    }
    if (this.hasCompleted()) {
      return false;
    }
    this.start();
    return true;
  }

  /**
   * Honour {@link OnboardingConfig.startImmediately}: starts the tour (guarded
   * by persistence) only when the config opts into auto-starting. Call this
   * once the host view/router is ready. Returns `true` if it started.
   */
  autoStart(config?: OnboardingConfig): boolean {
    if (config) {
      this.load(config);
    }
    return this.config?.startImmediately ? this.startIfNotCompleted() : false;
  }

  /** Whether the (optionally given) tour has been persisted as seen. */
  hasCompleted(config?: OnboardingConfig): boolean {
    const key = this.storageKey(config ?? this.config);
    return key ? this.storage.isCompleted(key) : false;
  }

  /** Forget a tour's persisted completion so it can be shown again. */
  reset(config?: OnboardingConfig): void {
    const key = this.storageKey(config ?? this.config);
    if (key) {
      this.storage.clear(key);
    }
  }

  /**
   * Jump directly to a step by index, running the full async transition
   * pipeline. Out-of-range indices are ignored.
   */
  async goTo(index: number): Promise<void> {
    if (!this.config || index < 0 || index >= this.config.steps.length) {
      return;
    }
    await this.runTransition(index, 1);
  }

  // --- Transition pipeline ----------------------------------------------

  /**
   * Loads and normalises a config without starting the tour.
   */
  private load(config: OnboardingConfig): void {
    // Loading a new config over a running tour tears it down. Announce that as
    // a skip so the event stream stays balanced (a TourStarted always has a
    // matching end) — otherwise analytics count the replaced tour as never
    // ending. Not persisted: it was interrupted, not seen, so it can run again.
    if (this.isActive()) {
      this.bus.emit(OnboardingLifecycleEvent.TourSkipped, {
        id: this.config?.id,
        atIndex: this._index(),
      });
    }
    this.teardown('idle');
    this._config.set(config);
    this.options = { ...DEFAULT_ONBOARDING_OPTIONS, ...(config.options ?? {}) };
  }

  /**
   * The heart of the engine: sequentially and *cancellably* moves to a step.
   * Each stage re-validates the transition token so that a newer transition
   * (or a teardown) silently supersedes an in-flight one instead of racing.
   */
  private async runTransition(
    index: number,
    direction: 1 | -1,
  ): Promise<void> {
    const token = ++this.transitionToken;
    // Mark the transition in-flight for the whole pipeline so a re-entrant
    // next()/prev() is ignored until it settles. Only the current transition
    // clears the flag, so a superseded one bailing out can't unblock its
    // successor mid-flight.
    this.transitionInFlight = true;
    try {
      await this.transitionTo(index, direction, token);
    } finally {
      if (token === this.transitionToken) {
        this.transitionInFlight = false;
      }
    }
  }

  private async transitionTo(
    index: number,
    direction: 1 | -1,
    token: number,
  ): Promise<void> {
    this.cancelPendingWait();
    this.cancelPending();
    this.stopTargetWatch();

    // Resolve the step we'll actually land on, skipping any `enabled:false`
    // steps in the direction of travel. Done first so a fully-skipped move
    // never fires the outgoing step's hooks or disturbs the current view.
    let landing = await this.resolveEnabledIndex(index, direction, token);
    if (this.isStale(token)) return;
    if (landing === null) {
      if (direction === 1) {
        // Forward: nothing enabled remains -> the tour is done.
        this.complete();
      } else if (this.active) {
        // Backward with nowhere earlier to go: this transition already retired
        // the visible step's wait/watch (and bumped the token) at the top, so
        // re-arm them under the current token. Otherwise the step stays on
        // screen but deadlocks — its business event is no longer listened for
        // and its target no longer watched — with skip() the only way out.
        const { step, target } = this.active;
        this.active = { step, target, index: this._index(), token };
        this.watchTarget(step, target, token);
        if (step.waitForEvent && this._status() === 'waiting') {
          this.waitForBusinessEvent(step, token);
        }
      }
      return;
    }

    const previous = this.currentStep();
    this._status.set('running');

    let step: OnboardingStep | undefined;
    try {
      // 1. after-hook of the outgoing step — runs once for the whole move,
      //    even if the walk below skips over optional steps with no target.
      if (previous) {
        await this.runHook(previous.afterStep, this._index());
        if (this.isStale(token)) return;
        this.bus.emit(OnboardingLifecycleEvent.StepCompleted, {
          id: previous.id,
        });
      }

      // Walk toward a step whose target actually resolves. An `optional` step
      // whose target never appears is silently skipped, continuing in the
      // direction of travel.
      for (;;) {
        step = this.config!.steps[landing];
        // A centered step is a modal that ignores any target element.
        const centered = step.placement === 'center';

        // 2. before-hook of the incoming step.
        await this.runHook(step.beforeStep, landing);
        if (this.isStale(token)) return;

        // 3. drive the router. Prefer the step's explicit route; otherwise,
        //    only when stepping *backward* to a step first shown on another
        //    route, restore that route so its target exists in the DOM.
        const desiredRoute =
          step.navigateToRoute ??
          (direction === -1 ? this.shownAtUrl.get(landing) : undefined);
        if (desiredRoute && this.router && this.router.url !== desiredRoute) {
          // The current highlight's element is about to be torn away by the
          // route change — drop the overlay first so it never lingers over
          // empty space while the new route/target settles.
          this.safeHide();
          await this.navigate(desiredRoute);
          if (this.isStale(token)) return;
        }

        // 4. resolve the target. A centered step ignores any target element,
        //    so don't poll the selector at all.
        const target = centered ? null : await this.resolveTarget(step, token);
        if (this.isStale(token)) return;

        if (!target && step.targetSelector && !centered) {
          if (step.optional) {
            // Silently skip: continue toward the next enabled step. The
            // outgoing after-hook already ran, so it isn't fired again here.
            this.bus.emit(OnboardingLifecycleEvent.StepSkipped, {
              id: step.id,
              index: landing,
            });
            const next = await this.resolveEnabledIndex(
              landing + direction,
              direction,
              token,
            );
            if (this.isStale(token)) return;
            if (next === null) {
              // Ran off the end skipping optionals. Forward -> the tour is
              // done; backward -> nowhere earlier and the outgoing step is
              // already left, so end cleanly rather than deadlock.
              if (direction === 1) this.complete();
              else this.teardown('idle');
              return;
            }
            landing = next;
            continue;
          }
          this.handleMissingTarget(step, landing);
          if (this.options.abortOnMissingTarget) {
            // Contract: a missing non-optional target aborts the whole tour.
            // End it cleanly — overlay down, event stream closed — instead of
            // leaving the engine "active" forever with no popover on screen.
            // Not persisted, so the tour can still run once the target exists.
            this.bus.emit(OnboardingLifecycleEvent.TourSkipped, {
              id: this.config?.id,
              atIndex: landing,
            });
            this.teardown('skipped');
            return;
          }
        }

        // 5. optional settle delay for entry animations.
        if (step.delayMs && step.delayMs > 0) {
          await this.sleep(step.delayMs);
          if (this.isStale(token)) return;
        }

        // 6. commit: this is the point of no return for this transition.
        this._index.set(landing);
        if (this.router) {
          this.shownAtUrl.set(landing, this.router.url);
        }
        this.active = { step, target, index: landing, token };

        // Arm the business-event wait BEFORE announcing the step. A host that
        // reacts to StepShown by synchronously firing the gating event would
        // otherwise be missed — the bus is a plain Subject with no replay.
        if (step.waitForEvent) {
          this.waitForBusinessEvent(step, token);
        } else {
          this._status.set('running');
        }

        this.render(step, target, landing);
        this.bus.emit(OnboardingLifecycleEvent.StepShown, { id: step.id });
        // Keep the highlight anchored even if the host re-renders it away.
        this.watchTarget(step, target, token);
        return;
      }
    } catch (error) {
      if (this.isStale(token)) return;
      this.bus.emit(OnboardingLifecycleEvent.StepError, {
        id: step?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error('[ngx-agentic-onboarding] step transition failed:', error);
    }
  }

  /**
   * Walks from `from` in `direction`, skipping steps whose {@link
   * OnboardingStep.enabled} predicate resolves falsy, and returns the first
   * step that applies — or `null` if the walk runs off either end. Returns
   * `null` too if a newer transition supersedes this one mid-await.
   */
  private async resolveEnabledIndex(
    from: number,
    direction: 1 | -1,
    token: number,
  ): Promise<number | null> {
    const steps = this.config!.steps;
    for (let i = from; i >= 0 && i < steps.length; i += direction) {
      const step = steps[i];
      if (!step.enabled) {
        return i;
      }
      const enabled = await this.evalEnabled(step, i);
      if (this.isStale(token)) return null;
      if (enabled) {
        return i;
      }
      this.bus.emit(OnboardingLifecycleEvent.StepSkipped, {
        id: step.id,
        index: i,
      });
    }
    return null;
  }

  /** Evaluates a step's `enabled` predicate, failing open (show) on error. */
  private async evalEnabled(
    step: OnboardingStep,
    index: number,
  ): Promise<boolean> {
    try {
      const result = await step.enabled!({
        step,
        index,
        total: this.totalSteps(),
      });
      return result !== false;
    } catch (error) {
      console.warn(
        `[ngx-agentic-onboarding] enabled() for step "${step.id}" threw; ` +
          'showing the step.',
        error,
      );
      return true;
    }
  }

  /** Subscribe to the bus and auto-advance once the awaited event fires. */
  private waitForBusinessEvent(step: OnboardingStep, token: number): void {
    this._status.set('waiting');
    this.bus.emit(OnboardingLifecycleEvent.StepWaiting, {
      id: step.id,
      event: step.waitForEvent,
    });

    this.waitSub = this.bus
      .on(step.waitForEvent!)
      .subscribe((payload) => {
        if (this.isStale(token)) return;
        if (step.eventFilter && !step.eventFilter(payload)) return;
        this.cancelPendingWait();
        this.scheduleEventAdvance(token);
      });

    // Never strand the user on an event that never fires.
    const timeout =
      step.waitForEventTimeoutMs ?? this.options.waitForEventTimeoutMs;
    if (timeout && timeout > 0) {
      this.waitTimer = setTimeout(
        () => this.handleWaitTimeout(step, token),
        timeout,
      );
    }
  }

  /**
   * Advances after a business event — but only once the host has *rendered*
   * the DOM change that event represents.
   *
   * The event almost always coincides with a host state change (a new `@for`
   * row, a panel opening) whose DOM isn't in place yet inside the synchronous
   * emit. Resolving the next step's target now would match a stale DOM — a
   * floating `[$last]` marker still sitting on the previous row, so the
   * highlight lands one element behind. A plain macrotask isn't enough either:
   * under zone.js event coalescing the host's change detection is deferred to
   * an animation frame, which runs *after* a `setTimeout(0)`. {@link
   * afterNextRender} fires after that render lands, so target resolution sees
   * the final DOM.
   */
  private scheduleEventAdvance(token: number): void {
    const advance = () => {
      if (this.isStale(token)) return;
      this.next();
    };
    // On the server there is no render loop for afterNextRender to hook — it
    // returns a no-op and never fires, so the step would hang forever. There is
    // no DOM to settle either, so just advance on a macrotask.
    if (this.isServer) {
      setTimeout(advance, 0);
      return;
    }
    const schedule = () => {
      // If the event was emitted outside Angular's zone (a socket push, a bare
      // async callback), re-enter so a change detection — and therefore a
      // render — is actually scheduled; otherwise afterNextRender never fires.
      if (this.zone && !NgZone.isInAngularZone()) {
        this.zone.run(() => afterNextRender(advance, { injector: this.injector }));
      } else {
        afterNextRender(advance, { injector: this.injector });
      }
    };
    // When the event fires *inside* the step's own commit (a host reacting to
    // StepShown synchronously), an afterNextRender registered right now won't
    // fire — it's mid-pipeline, before the render cycle it needs. Bounce the
    // scheduling to a macrotask so it registers once this transition has
    // settled, in a clean render cycle. The macrotask still runs before the
    // host's coalesced change detection, so the render wait is preserved.
    if (this.transitionInFlight) {
      setTimeout(schedule, 0);
    } else {
      schedule();
    }
  }

  /**
   * Applies the configured {@link OnboardingOptions.onWaitTimeout} behaviour
   * once a business-event wait has timed out.
   */
  private handleWaitTimeout(step: OnboardingStep, token: number): void {
    if (this.isStale(token)) return;
    this.cancelPendingWait();
    this.bus.emit(OnboardingLifecycleEvent.StepWaitTimeout, {
      id: step.id,
      event: step.waitForEvent,
    });

    switch (this.options.onWaitTimeout) {
      case 'advance':
        this.next();
        return;
      case 'skip':
        this.skip();
        return;
      case 'reveal':
      default:
        // Un-gate the step: reveal "Next" so the user can proceed manually.
        this._status.set('running');
        if (this.active) {
          this.render(this.active.step, this.active.target, this.active.index, false);
        }
        return;
    }
  }

  // --- Async helpers -----------------------------------------------------

  /** Awaits router navigation; degrades gracefully if no Router is present. */
  private async navigate(route: string): Promise<void> {
    if (!this.router) {
      console.warn(
        `[ngx-agentic-onboarding] navigateToRoute="${route}" ignored: ` +
          'no Router available. Did you provide the router in this app?',
      );
      return;
    }
    try {
      await this.router.navigateByUrl(route);
    } catch (error) {
      console.warn(
        `[ngx-agentic-onboarding] navigation to "${route}" failed:`,
        error,
      );
    }
  }

  /**
   * Resolves a step's target element, polling the DOM until it appears or the
   * configured timeout elapses. Returns `null` for target-less (centered)
   * steps, when running without a DOM (SSR), or on timeout.
   */
  private resolveTarget(
    step: OnboardingStep,
    token: number,
  ): Promise<Element | null> {
    if (!step.targetSelector) {
      return Promise.resolve(null);
    }
    const selector = step.targetSelector;
    const timeout =
      step.waitForSelectorTimeoutMs ?? this.options.waitForSelectorTimeoutMs;
    const interval = this.options.selectorPollIntervalMs;
    const doc = this.document;

    // SSR / no-DOM guard.
    if (!doc || typeof doc.querySelector !== 'function') {
      return Promise.resolve(null);
    }

    return new Promise<Element | null>((resolve) => {
      const immediate = doc.querySelector(selector);
      if (immediate) {
        resolve(immediate);
        return;
      }
      const startedAt = Date.now();
      const finish = (result: Element | null): void => {
        clearInterval(handle);
        if (this.pendingCancel === cancel) this.pendingCancel = null;
        resolve(result);
      };
      const cancel = (): void => finish(null);
      this.pendingCancel = cancel;
      const handle = setInterval(() => {
        // A teardown or a newer transition bumped the token — stop polling the
        // DOM at once instead of running out the whole selector timeout.
        if (this.isStale(token)) {
          finish(null);
          return;
        }
        const found = doc.querySelector(selector);
        if (found) {
          finish(found);
        } else if (Date.now() - startedAt >= timeout) {
          finish(null);
        }
      }, interval);
    });
  }

  /** Runs an optional lifecycle hook, isolating its errors from the pipeline. */
  private async runHook(
    hook: OnboardingStep['beforeStep'],
    index: number,
  ): Promise<void> {
    if (!hook) {
      return;
    }
    try {
      await hook({ step: this.config!.steps[index], index, total: this.totalSteps() });
    } catch (error) {
      console.warn('[ngx-agentic-onboarding] lifecycle hook threw:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (this.pendingCancel === cancel) this.pendingCancel = null;
        resolve();
      }, ms);
      const cancel = (): void => {
        clearTimeout(timer);
        if (this.pendingCancel === cancel) this.pendingCancel = null;
        resolve();
      };
      this.pendingCancel = cancel;
    });
  }

  /** Cancels an in-flight DOM poll or settle delay so it stops immediately. */
  private cancelPending(): void {
    const cancel = this.pendingCancel;
    this.pendingCancel = null;
    cancel?.();
  }

  // --- Rendering & teardown ---------------------------------------------

  private render(
    step: OnboardingStep,
    target: Element | null,
    index: number,
    waiting = !!step.waitForEvent,
  ): void {
    if (!this.renderer) {
      return;
    }
    const controls: OnboardingRenderControls = {
      next: () => this.next(),
      prev: () => this.prev(),
      skip: () => this.skip(),
      index,
      total: this.totalSteps(),
      isWaitingForEvent: waiting,
    };
    try {
      this.renderer.show(step, target, controls);
    } catch (error) {
      console.error('[ngx-agentic-onboarding] renderer.show() failed:', error);
    }
  }

  /** Hides the overlay, swallowing renderer errors. */
  private safeHide(): void {
    try {
      this.renderer?.hide();
    } catch (error) {
      console.error('[ngx-agentic-onboarding] renderer.hide() failed:', error);
    }
  }

  private complete(): void {
    // A run that never committed a step (e.g. every step gated off by its
    // enabled() predicate at start) isn't "completed": emitting and persisting
    // it would burn the tour so it can never appear once the predicates flip.
    // Settle quietly back to idle instead.
    if (this._index() < 0) {
      this.teardown('idle');
      return;
    }
    this.bus.emit(OnboardingLifecycleEvent.TourCompleted, {
      id: this.config?.id,
    });
    this.persistSeen();
    this.teardown('completed');
  }

  /** Builds the persistence key for a config, or null when it can't/shouldn't persist. */
  private storageKey(cfg: OnboardingConfig | null): string | null {
    if (!cfg?.id || cfg.persist === false) {
      return null;
    }
    return `ngx-onboarding:${cfg.id}:${cfg.version}`;
  }

  /** Records the active tour as seen, if persistence applies to it. */
  private persistSeen(): void {
    const key = this.storageKey(this.config);
    if (key) {
      this.storage.markCompleted(key);
    }
  }

  private handleMissingTarget(step: OnboardingStep, index: number): void {
    this.bus.emit(OnboardingLifecycleEvent.StepError, {
      id: step.id,
      error: `Target "${step.targetSelector}" not found within timeout.`,
    });
    console.warn(
      `[ngx-agentic-onboarding] step "${step.id}" (#${index}) target ` +
        `"${step.targetSelector}" never appeared.`,
    );
  }

  // --- Target watching ---------------------------------------------------

  /**
   * Watches the DOM for the current step's highlighted target being detached,
   * which happens routinely when the host re-renders a list or the user
   * navigates away. Cheap: a single subtree observer that only acts once the
   * specific element disconnects.
   */
  private watchTarget(
    step: OnboardingStep,
    target: Element | null,
    token: number,
  ): void {
    if (!target || !step.targetSelector) {
      return;
    }
    const view = this.document?.defaultView;
    const root = this.document?.body ?? this.document?.documentElement;
    if (!view || typeof view.MutationObserver !== 'function' || !root) {
      return;
    }
    this.targetObserver = new view.MutationObserver(() => {
      if (this.isStale(token)) {
        this.stopTargetWatch();
        return;
      }
      if (!target.isConnected) {
        this.stopTargetWatch();
        void this.handleTargetLost(step, token);
      }
    });
    this.targetObserver.observe(root, { childList: true, subtree: true });
  }

  /**
   * Recovers from a target that vanished while its step was on screen: polls
   * for it to reappear (a re-render commonly swaps the node), re-painting in
   * place if it does. If it never returns, the tour is closed cleanly.
   */
  private async handleTargetLost(
    step: OnboardingStep,
    token: number,
  ): Promise<void> {
    this.bus.emit(OnboardingLifecycleEvent.StepTargetLost, {
      id: step.id,
      selector: step.targetSelector,
    });

    // Same-tick swap (a list re-render replacing the node): re-point instantly,
    // no visible gap.
    const immediate =
      this.document?.querySelector?.(step.targetSelector!) ?? null;
    if (immediate) {
      this.repaintOnto(step, immediate, token);
      return;
    }

    // Otherwise drop the overlay so it never highlights the empty space the
    // element left behind, then wait (up to the selector timeout) for it back.
    this.safeHide();
    const recovered = await this.resolveTarget(step, token);
    if (this.isStale(token)) return;

    if (recovered) {
      this.repaintOnto(step, recovered, token);
      return;
    }

    this.bus.emit(OnboardingLifecycleEvent.StepError, {
      id: step.id,
      error: `Target "${step.targetSelector}" disappeared and did not return.`,
    });
    console.warn(
      `[ngx-agentic-onboarding] step "${step.id}" target ` +
        `"${step.targetSelector}" was removed and never came back; closing.`,
    );
    this.teardown('skipped');
  }

  /** Re-renders the current step onto a fresh target element and re-arms the watch. */
  private repaintOnto(
    step: OnboardingStep,
    target: Element,
    token: number,
  ): void {
    if (this.active) this.active.target = target;
    this.render(step, target, this._index(), this._status() === 'waiting');
    this.watchTarget(step, target, token);
  }

  /** Disconnects the target observer, if any. */
  private stopTargetWatch(): void {
    this.targetObserver?.disconnect();
    this.targetObserver = null;
  }

  /** Cancels any pending business-event subscription and its timeout. */
  private cancelPendingWait(): void {
    this.waitSub?.unsubscribe();
    this.waitSub = null;
    if (this.waitTimer !== null) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
  }

  /** Fully resets engine state and tears down the overlay. */
  private teardown(status: OnboardingStatus): void {
    // Invalidate any in-flight transition.
    this.transitionToken++;
    this.cancelPendingWait();
    this.cancelPending();
    this.stopTargetWatch();
    this.active = null;
    this._index.set(-1);
    this._status.set(status);
    // Forget per-step routes so a later start() (which may reuse the config)
    // can't yank the user to a stale route from the previous run.
    this.shownAtUrl.clear();
    this.safeHide();
  }

  /** True when `token` no longer identifies the active transition. */
  private isStale(token: number): boolean {
    return token !== this.transitionToken;
  }
}
