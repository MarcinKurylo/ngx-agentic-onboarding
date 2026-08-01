/**
 * Placement of the tooltip/popover relative to the highlighted target element.
 */
export type OnboardingStepPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'right'
  | 'auto'
  /** Render as a centered modal, ignoring any target element. */
  | 'center';

/**
 * A side-effecting hook that may run synchronously or asynchronously.
 * Returning a `Promise` (or `void`) lets the orchestrator await async work
 * before it proceeds, which is what keeps transitions from crashing the view.
 */
export type OnboardingHook = (
  context: OnboardingHookContext,
) => void | Promise<void>;

/**
 * Read-only context handed to lifecycle hooks so they can make decisions
 * without reaching back into engine internals.
 */
export interface OnboardingHookContext {
  /** The step the hook is attached to. */
  readonly step: OnboardingStep;
  /** Zero-based index of the step within the active tour. */
  readonly index: number;
  /** Total number of steps in the active tour. */
  readonly total: number;
}

/**
 * A single, declarative step of an onboarding tour.
 *
 * A step is intentionally decoupled from component code: everything the engine
 * needs — what to highlight, when to advance, where to navigate — lives here as
 * data. The async-oriented flags ({@link waitForEvent}, {@link navigateToRoute},
 * {@link waitForSelectorTimeoutMs}) are what let the engine coordinate routing
 * and DOM changes without imperative hacks in the host app.
 */
export interface OnboardingStep {
  /** Stable, unique identifier of the step within its tour. */
  readonly id: string;

  /**
   * CSS selector of the element to highlight/anchor the popover to.
   * Optional: `center`-placement steps (welcome/finish screens) need no target.
   */
  readonly targetSelector?: string;

  /** Popover heading. */
  readonly title?: string;

  /** Popover body. Plain text by default; renderers may opt into HTML. */
  readonly content?: string;

  /** Where to place the popover relative to the target. Defaults to `auto`. */
  readonly placement?: OnboardingStepPlacement;

  /**
   * Extra CSS class(es) applied to this step's popover, on top of the global
   * base class (`ngx-onboarding`) and any renderer-level class. Use it to theme
   * individual steps from your own SCSS.
   */
  readonly popoverClass?: string;

  // --- Asynchronous / event-driven control flags -------------------------

  /**
   * Business event that must fire on the {@link OnboardingEventBus} before the
   * step is considered complete. While set, the built-in "Next" action is
   * disabled and the engine waits for the user to perform the real action.
   */
  readonly waitForEvent?: string;

  /**
   * Optional predicate used to further qualify a {@link waitForEvent} match by
   * inspecting the event payload (e.g. only advance for a specific project id).
   * When omitted, any event of the matching `type` unblocks the step.
   */
  readonly eventFilter?: (payload: unknown) => boolean;

  /**
   * Route the engine should navigate to *before* attempting to show this step.
   * The engine awaits navigation completion, then waits for the target selector
   * to appear in the DOM before rendering.
   */
  readonly navigateToRoute?: string;

  /**
   * Maximum time, in milliseconds, to wait for {@link targetSelector} to appear
   * in the DOM before emitting a step error. Defaults to a global config value.
   */
  readonly waitForSelectorTimeoutMs?: number;

  /**
   * Fixed delay, in milliseconds, to wait after the target is resolved and
   * before the popover is rendered — useful for letting entry animations settle.
   */
  readonly delayMs?: number;

  // --- Interaction toggles ----------------------------------------------

  /** Show the "Next" button. Defaults to `true` unless {@link waitForEvent} is set. */
  readonly showNext?: boolean;

  /** Show the "Previous" button. Defaults to `true` for all but the first step. */
  readonly showPrev?: boolean;

  /** Allow the user to skip/close the tour from this step. Defaults to `true`. */
  readonly allowSkip?: boolean;

  /**
   * If `true`, the step is silently skipped when its target cannot be resolved
   * instead of raising an error. Useful for conditional UI.
   */
  readonly optional?: boolean;

  // --- Lifecycle hooks ---------------------------------------------------

  /** Runs (awaited) just before the step is shown. */
  readonly beforeStep?: OnboardingHook;

  /** Runs (awaited) just after the step is dismissed/advanced. */
  readonly afterStep?: OnboardingHook;
}
