/**
 * A single business event flowing through the {@link OnboardingEventBus}.
 *
 * Events are the backbone of the event-driven architecture: the host
 * application emits domain events (e.g. `PROJECT_CREATED`) and the
 * orchestrator reacts to them to advance the tour.
 *
 * @typeParam T - Shape of the optional payload carried by the event.
 */
export interface OnboardingEvent<T = unknown> {
  /**
   * Unique, application-defined identifier of the event, e.g. `PROJECT_CREATED`.
   * By convention we use `SCREAMING_SNAKE_CASE`, but any string is accepted.
   */
  readonly type: string;

  /** Optional structured data attached to the event. */
  readonly payload?: T;

  /**
   * Epoch milliseconds at which the event was emitted.
   * Populated automatically by the bus when omitted.
   */
  readonly timestamp?: number;
}

/**
 * Internal, engine-emitted lifecycle events. These are published on the same
 * bus as business events but namespaced with an `onboarding:` prefix so that
 * analytics consumers can easily filter engine noise from domain signals.
 */
export enum OnboardingLifecycleEvent {
  /** A tour run has started. */
  TourStarted = 'onboarding:tour_started',
  /** A tour run has completed all of its steps. */
  TourCompleted = 'onboarding:tour_completed',
  /** The user (or code) skipped/aborted the tour before completion. */
  TourSkipped = 'onboarding:tour_skipped',
  /** A step is about to be shown (after routing/DOM resolution). */
  StepShown = 'onboarding:step_shown',
  /** A step has been advanced away from (next/prev/event). */
  StepCompleted = 'onboarding:step_completed',
  /** The engine is waiting on a business event to unblock a step. */
  StepWaiting = 'onboarding:step_waiting',
  /** A recoverable error occurred (e.g. selector never appeared). */
  StepError = 'onboarding:step_error',
}
