import { OnboardingStep } from './onboarding-step.model';

/**
 * What the engine does when a {@link OnboardingStep.waitForEvent} wait exceeds
 * its timeout without the business event firing:
 * - `reveal`  — stop waiting and reveal the "Next" button so the user can
 *               advance manually (the safe default: nothing is lost).
 * - `advance` — automatically move on to the next step.
 * - `skip`    — abort the whole tour.
 */
export type OnWaitTimeoutBehavior = 'reveal' | 'advance' | 'skip';

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

  /**
   * Default maximum time, in milliseconds, to wait for a step's
   * {@link OnboardingStep.waitForEvent} before applying {@link onWaitTimeout}.
   * `0` (the default) waits indefinitely; steps may override via
   * {@link OnboardingStep.waitForEventTimeoutMs}.
   * @defaultValue 0
   */
  readonly waitForEventTimeoutMs?: number;

  /**
   * What to do when a {@link OnboardingStep.waitForEvent} wait times out.
   * @defaultValue 'reveal'
   */
  readonly onWaitTimeout?: OnWaitTimeoutBehavior;
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
   * Hint that this tour should auto-start (guarded by persistence) rather than
   * waiting for an explicit trigger. Honoured by
   * {@link OnboardingOrchestrator.autoStart}. Defaults to `false`.
   */
  readonly startImmediately?: boolean;

  /**
   * Master switch for remembering this tour (via {@link OnboardingStorage}) so
   * it is not shown again. Requires {@link id}. Defaults to `true`. Set `false`
   * to disable persistence entirely — handy while authoring a tour so it always
   * re-runs.
   */
  readonly persist?: boolean;

  /**
   * Whether *dismissing* the tour (Escape / close) also persists as "seen", the
   * way a genuine completion does. Defaults to `false`: a dismissal does not lock
   * the tour out, so it can reappear on the next visit — and you are not fighting
   * localStorage every time you iterate on it. Only a real completion sticks.
   * Requires {@link persist} to be on. Set `true` for the old "dismissed once,
   * gone forever" behaviour.
   */
  readonly persistOnSkip?: boolean;

  /** Tour-wide timing and behaviour options. */
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
  waitForEventTimeoutMs: 0,
  onWaitTimeout: 'reveal',
};
