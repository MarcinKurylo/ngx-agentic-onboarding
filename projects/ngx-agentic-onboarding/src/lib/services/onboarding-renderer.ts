import { InjectionToken } from '@angular/core';
import { OnboardingStep } from '../models/onboarding-step.model';

/**
 * Controls handed to a renderer so the popover's buttons can drive the engine
 * without the renderer needing a reference to the orchestrator itself.
 */
export interface OnboardingRenderControls {
  /** Advance to the next step (or finish on the last step). */
  next(): void;
  /** Go back to the previous step. */
  prev(): void;
  /** Skip/abort the tour. */
  skip(): void;
  /** Zero-based index of the step being rendered. */
  readonly index: number;
  /** Total number of steps in the active tour. */
  readonly total: number;
  /** Whether a business event is blocking automatic advancement. */
  readonly isWaitingForEvent: boolean;
}

/**
 * The overlay engine contract. The orchestrator core is deliberately agnostic
 * about *how* a step is drawn — this seam lets us plug in a slimmed Driver.js
 * renderer (pillar 3) without touching the state machine, and swap in a no-op
 * for tests or SSR.
 */
export interface OnboardingRenderer {
  /**
   * Render/move the highlight + popover to the given step.
   *
   * @param step     The step to display.
   * @param target   Resolved target element, or `null` for centered steps.
   * @param controls Callbacks + metadata for the popover UI.
   */
  show(
    step: OnboardingStep,
    target: Element | null,
    controls: OnboardingRenderControls,
  ): void;

  /** Tear down any overlay/highlight currently on screen. */
  hide(): void;
}

/**
 * DI token for the active {@link OnboardingRenderer}. Optional: when no renderer
 * is provided the orchestrator still runs its full state machine (useful for
 * headless tests), it simply has nothing to draw.
 */
export const ONBOARDING_RENDERER = new InjectionToken<OnboardingRenderer>(
  'ONBOARDING_RENDERER',
);
