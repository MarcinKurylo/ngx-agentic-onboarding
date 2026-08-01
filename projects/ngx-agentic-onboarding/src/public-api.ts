/*
 * Public API Surface of ngx-agentic-onboarding
 */

// Models & types
export * from './lib/models';

// Services (event-driven core)
export * from './lib/services/onboarding-event-bus.service';
export * from './lib/services/onboarding-orchestrator.service';
export * from './lib/services/onboarding-renderer';

// Driver.js overlay renderer (pillar 3)
export * from './lib/services/driverjs-renderer';
export * from './lib/provide-onboarding';
