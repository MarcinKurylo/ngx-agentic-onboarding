import { DOCUMENT } from '@angular/common';
import { inject, Injectable, InjectionToken } from '@angular/core';
import {
  type AllowedButtons,
  type Alignment,
  type Driver,
  driver,
  type Side,
} from 'driver.js';

import { OnboardingStep } from '../models/onboarding-step.model';
import {
  OnboardingRenderControls,
  OnboardingRenderer,
} from './onboarding-renderer';

/**
 * Visual/behavioural configuration specific to the Driver.js overlay engine.
 * These are intentionally separate from the generic {@link OnboardingConfig}
 * options so that renderer styling never leaks into the framework-agnostic core.
 */
export interface DriverJsRendererConfig {
  /** Animate highlight transitions between steps. @defaultValue true */
  animate?: boolean;
  /** Backdrop colour. @defaultValue 'rgb(0, 0, 0)' */
  overlayColor?: string;
  /** Backdrop opacity in `[0, 1]`. @defaultValue 0.7 */
  overlayOpacity?: number;
  /** Padding, in px, around the highlighted element. @defaultValue 10 */
  stagePadding?: number;
  /** Corner radius, in px, of the highlight cut-out. @defaultValue 5 */
  stageRadius?: number;
  /** Enable arrow-key / escape keyboard control. @defaultValue true */
  allowKeyboardControl?: boolean;
  /** Dismiss the tour when the backdrop is clicked. @defaultValue false */
  closeOnBackdropClick?: boolean;
  /** Extra CSS class applied to every popover. */
  popoverClass?: string;
  /** Label for the "Next" button. @defaultValue 'Next' */
  nextLabel?: string;
  /** Label for the "Previous" button. @defaultValue 'Back' */
  prevLabel?: string;
  /** Label for the final "Done" button. @defaultValue 'Done' */
  doneLabel?: string;
}

/** DI token carrying the {@link DriverJsRendererConfig}. */
export const DRIVERJS_RENDERER_CONFIG =
  new InjectionToken<DriverJsRendererConfig>('DRIVERJS_RENDERER_CONFIG');

const DEFAULTS: Required<DriverJsRendererConfig> = {
  animate: true,
  overlayColor: 'rgb(0, 0, 0)',
  overlayOpacity: 0.7,
  stagePadding: 10,
  stageRadius: 5,
  allowKeyboardControl: true,
  closeOnBackdropClick: false,
  popoverClass: '',
  nextLabel: 'Next',
  prevLabel: 'Back',
  doneLabel: 'Done',
};

/**
 * {@link OnboardingRenderer} backed by Driver.js.
 *
 * It runs Driver.js in single-element `highlight()` mode rather than its own
 * `drive()` step engine: the {@link OnboardingOrchestrator} owns step
 * progression (so it can pause for async events and routing), and this renderer
 * only paints one step at a time. The popover's Next/Prev/Close buttons are
 * wired back to the orchestrator through the supplied `controls`, which also
 * disables Driver.js's built-in auto-advance.
 *
 * Requires the Driver.js stylesheet. Import it once in your app, e.g.:
 * `@import 'driver.js/dist/driver.css';`
 */
@Injectable()
export class DriverJsRenderer implements OnboardingRenderer {
  private readonly document = inject(DOCUMENT);
  private readonly config: Required<DriverJsRendererConfig> = {
    ...DEFAULTS,
    ...(inject(DRIVERJS_RENDERER_CONFIG, { optional: true }) ?? {}),
  };

  private driverInstance: Driver | null = null;
  /** Controls for the step currently on screen; read by the button hooks. */
  private controls: OnboardingRenderControls | null = null;

  show(
    step: OnboardingStep,
    target: Element | null,
    controls: OnboardingRenderControls,
  ): void {
    // SSR / no-DOM guard — nothing to paint without a browser window.
    if (!this.document?.defaultView) {
      return;
    }
    this.controls = controls;

    const instance = this.ensureDriver();
    const isLast = controls.index >= controls.total - 1;
    const { side, align } = mapPlacement(step);

    instance.highlight({
      element: target ?? undefined,
      popover: {
        title: step.title,
        description: step.content,
        ...(side ? { side } : {}),
        ...(align ? { align } : {}),
        showButtons: this.buttonsFor(step, controls),
        nextBtnText: isLast ? this.config.doneLabel : this.config.nextLabel,
        prevBtnText: this.config.prevLabel,
        doneBtnText: this.config.doneLabel,
        popoverClass: this.config.popoverClass || undefined,
      },
    });
  }

  hide(): void {
    this.driverInstance?.destroy();
    this.driverInstance = null;
    this.controls = null;
  }

  /**
   * Lazily builds the Driver.js instance. Global button hooks delegate to
   * whatever `controls` are current, so a single instance serves every step.
   */
  private ensureDriver(): Driver {
    if (this.driverInstance) {
      return this.driverInstance;
    }
    this.driverInstance = driver({
      animate: this.config.animate,
      overlayColor: this.config.overlayColor,
      overlayOpacity: this.config.overlayOpacity,
      stagePadding: this.config.stagePadding,
      stageRadius: this.config.stageRadius,
      allowKeyboardControl: this.config.allowKeyboardControl,
      allowClose: true,
      overlayClickBehavior: this.config.closeOnBackdropClick
        ? 'close'
        : (() => {
            /* swallow backdrop clicks */
          }),
      // Overriding these hooks suppresses Driver.js auto-advance and routes
      // every button back through the orchestrator.
      onNextClick: () => this.controls?.next(),
      onPrevClick: () => this.controls?.prev(),
      onCloseClick: () => this.controls?.skip(),
    });
    return this.driverInstance;
  }

  /** Computes which popover buttons to show for a given step. */
  private buttonsFor(
    step: OnboardingStep,
    controls: OnboardingRenderControls,
  ): AllowedButtons[] {
    const buttons: AllowedButtons[] = [];
    if (controls.index > 0 && step.showPrev !== false) {
      buttons.push('previous');
    }
    // While the step is gated on a business event, hide "Next" so the user
    // must perform the real action to advance.
    if (!controls.isWaitingForEvent && step.showNext !== false) {
      buttons.push('next');
    }
    if (step.allowSkip !== false) {
      buttons.push('close');
    }
    return buttons;
  }
}

/** Maps our {@link OnboardingStepPlacement} onto Driver.js side/align. */
function mapPlacement(step: OnboardingStep): {
  side?: Side;
  align?: Alignment;
} {
  const placement = step.placement;
  // `center` (element-less modal) and `auto` let Driver.js position itself.
  if (!placement || placement === 'auto' || placement === 'center') {
    return {};
  }
  const [side, suffix] = placement.split('-') as [Side, string | undefined];
  const align: Alignment | undefined =
    suffix === 'start' ? 'start' : suffix === 'end' ? 'end' : undefined;
  return { side, align };
}
