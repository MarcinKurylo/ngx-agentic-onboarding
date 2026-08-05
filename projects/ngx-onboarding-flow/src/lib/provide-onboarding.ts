import {
  EnvironmentProviders,
  makeEnvironmentProviders,
} from '@angular/core';

import {
  DRIVERJS_RENDERER_CONFIG,
  DriverJsRenderer,
  DriverJsRendererConfig,
} from './services/driverjs-renderer';
import { ONBOARDING_RENDERER } from './services/onboarding-renderer';

/**
 * Registers the onboarding engine with the Driver.js overlay renderer.
 *
 * Add it to your application's providers; the {@link OnboardingEventBus} and
 * {@link OnboardingOrchestrator} are already `providedIn: 'root'`, so this only
 * wires up the renderer + its configuration.
 *
 * @example
 * ```ts
 * // app.config.ts
 * import 'driver.js/dist/driver.css'; // or @import in your global styles
 * import { provideOnboarding } from 'ngx-onboarding-flow';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideRouter(routes),
 *     provideOnboarding({ overlayOpacity: 0.6, nextLabel: 'Dalej' }),
 *   ],
 * };
 * ```
 *
 * @param config Optional Driver.js-specific look & feel overrides.
 */
export function provideOnboarding(
  config?: DriverJsRendererConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: DRIVERJS_RENDERER_CONFIG, useValue: config ?? {} },
    { provide: ONBOARDING_RENDERER, useClass: DriverJsRenderer },
  ]);
}
