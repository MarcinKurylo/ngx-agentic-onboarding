
import { inject, Injectable, InjectionToken, DOCUMENT } from '@angular/core';
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
  /**
   * Allow closing the tour with the Escape key. (Arrow-key step navigation is
   * not available: the renderer drives Driver.js in single-`highlight()` mode,
   * where Driver.js's arrow handlers are inert.)
   * @defaultValue true
   */
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

/**
 * Stable CSS class applied to every popover the renderer paints. Use it as a
 * theming hook, e.g. `.driver-popover.ngx-onboarding { … }`, or override the
 * `--ngx-ob-*` variables consumed by the optional theme stylesheet.
 */
export const ONBOARDING_POPOVER_CLASS = 'ngx-onboarding';

/**
 * Escapes HTML metacharacters so a string is rendered as literal text by
 * Driver.js, which assigns popover title/description/button text via
 * `innerHTML`. This is the default path for step text; raw HTML is only emitted
 * when a step explicitly sets `allowHtml`.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  /**
   * Whether the step on screen may be dismissed via Escape / backdrop. Read by
   * the destroy hook so a step with `allowSkip: false` can't be closed by key.
   */
  private allowCurrentClose = true;

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
    this.allowCurrentClose = step.allowSkip !== false;

    const instance = this.ensureDriver();
    const isLast = controls.index >= controls.total - 1;
    const { side, align } = mapPlacement(step);

    // Driver.js sets popover title/description/button text via `innerHTML`, so
    // escape by default and only pass raw HTML when the step opts in. Button
    // labels are always plain text and always escaped.
    const raw = step.allowHtml === true;

    instance.highlight({
      element: target ?? undefined,
      popover: {
        title: this.text(step.title, raw),
        description: this.text(step.content, raw),
        ...(side ? { side } : {}),
        ...(align ? { align } : {}),
        showButtons: this.buttonsFor(step, controls),
        // Per-step labels win, falling back to the renderer-wide defaults.
        nextBtnText: escapeHtml(
          isLast
            ? (step.doneLabel ?? this.config.doneLabel)
            : (step.nextLabel ?? this.config.nextLabel),
        ),
        prevBtnText: escapeHtml(step.prevLabel ?? this.config.prevLabel),
        doneBtnText: escapeHtml(step.doneLabel ?? this.config.doneLabel),
        popoverClass: this.popoverClassFor(step),
      },
    });
  }

  /**
   * Prepares step title/content for Driver.js's `innerHTML` sink: escaped by
   * default, passed through verbatim only when the step opted into raw HTML.
   * `undefined` in, `undefined` out — the popover field stays unset.
   */
  private text(value: string | undefined, raw: boolean): string | undefined {
    if (value === undefined) {
      return undefined;
    }
    return raw ? value : escapeHtml(value);
  }

  /**
   * Composes the popover's CSS classes: a stable base hook (`ngx-onboarding`)
   * that every popover carries, plus any renderer-level and per-step classes.
   * Gives host apps a reliable, low-specificity selector to theme from SCSS.
   */
  private popoverClassFor(step: OnboardingStep): string {
    return [ONBOARDING_POPOVER_CLASS, this.config.popoverClass, step.popoverClass]
      .filter(Boolean)
      .join(' ');
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
      // Escape and backdrop closes don't go through onCloseClick — Driver.js
      // routes them here and, because this hook is set, does NOT tear itself
      // down (we own the destroy). Send them through the orchestrator's single
      // exit so a keyboard/backdrop dismissal can never leave a dead tour
      // marked active. A step with allowSkip:false swallows them entirely.
      onDestroyStarted: () => {
        if (!this.allowCurrentClose) {
          return;
        }
        if (this.controls) {
          this.controls.skip();
        } else {
          this.driverInstance?.destroy();
        }
      },
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
