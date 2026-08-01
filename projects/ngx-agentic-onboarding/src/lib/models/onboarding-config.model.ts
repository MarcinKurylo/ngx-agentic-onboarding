import { OnboardingStep } from './onboarding-step.model';

/**
 * Global, tour-wide defaults and behaviour toggles. Individual steps may
 * override the timing-related values.
 */
export interface OnboardingOptions {
  /**
   * Default maximum time, in milliseconds, to wait for a step's target
   * selector to appear before erroring. Steps may override this.
   * @defaultValue 5000
   */
  readonly waitForSelectorTimeoutMs?: number;

  /**
   * How often, in milliseconds, to poll the DOM while waiting for a target
   * selector to appear.
   * @defaultValue 100
   */
  readonly selectorPollIntervalMs?: number;

  /**
   * If `true`, an unresolved (non-optional) target aborts the whole tour.
   * If `false`, the engine emits an error event and stops on that step.
   * @defaultValue false
   */
  readonly abortOnMissingTarget?: boolean;

  /** Text for the "Next" control. @defaultValue 'Next' */
  readonly nextLabel?: string;

  /** Text for the "Previous" control. @defaultValue 'Back' */
  readonly prevLabel?: string;

  /** Text for the "Skip/Close" control. @defaultValue 'Skip' */
  readonly skipLabel?: string;

  /** Text for the final "Done" control. @defaultValue 'Done' */
  readonly doneLabel?: string;

  /** Whether clicking the backdrop dismisses the tour. @defaultValue false */
  readonly closeOnBackdropClick?: boolean;
}

/**
 * The root, strongly-typed onboarding definition. An entire user onboarding
 * flow is described by a single one of these objects — no component code, no
 * imperative tour-service calls.
 *
 * @example
 * ```ts
 * export const appOnboarding: OnboardingConfig = {
 *   version: '1.0.0',
 *   steps: [
 *     { id: 'welcome', targetSelector: '#welcome-card', title: 'Hi!' },
 *     { id: 'create', targetSelector: '#btn-submit', waitForEvent: 'PROJECT_CREATED' },
 *     { id: 'stats', targetSelector: '#chart-main', navigateToRoute: '/dashboard' },
 *   ],
 * };
 * ```
 */
export interface OnboardingConfig {
  /** Semantic version of this configuration, for persistence/migrations. */
  readonly version: string;

  /** Optional identifier, useful when an app ships more than one tour. */
  readonly id?: string;

  /** Ordered list of steps that make up the tour. */
  readonly steps: readonly OnboardingStep[];

  /**
   * If `true`, the tour starts automatically once the orchestrator is wired up
   * (e.g. on app bootstrap). Defaults to `false` — start it explicitly instead.
   */
  readonly startImmediately?: boolean;

  /** Tour-wide options and default labels/timings. */
  readonly options?: OnboardingOptions;
}

/**
 * Fully-resolved options with every value present, produced by merging
 * {@link OnboardingConfig.options} over the engine defaults.
 * @internal
 */
export type ResolvedOnboardingOptions = Required<OnboardingOptions>;

/** Engine-wide default options applied when a config omits values. */
export const DEFAULT_ONBOARDING_OPTIONS: ResolvedOnboardingOptions = {
  waitForSelectorTimeoutMs: 5000,
  selectorPollIntervalMs: 100,
  abortOnMissingTarget: false,
  nextLabel: 'Next',
  prevLabel: 'Back',
  skipLabel: 'Skip',
  doneLabel: 'Done',
  closeOnBackdropClick: false,
};
