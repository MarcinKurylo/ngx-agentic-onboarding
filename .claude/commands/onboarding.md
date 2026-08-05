---
description: Generate an ngx-onboarding-flow tour (OnboardingConfig) from this Angular app
argument-hint: [optional: describe the flow to onboard, e.g. "first-run: create a project then see the dashboard"]
---

Author an `ngx-onboarding-flow` tour for this app using the **onboarding-author**
skill. Follow that skill's procedure exactly.

Flow to build (may be empty): $ARGUMENTS

If no flow was described above, first read the app's routes and main screens,
propose a sensible short first-run flow (welcome → primary action → payoff → done),
and confirm it with the user before generating the config.

Then:

1. Map routes → `navigateToRoute`; find stable `id`/`data-*` anchors →
   `targetSelector`; wire `bus.emit('…')` calls → `waitForEvent`; handle loaders
   and conditional (`@if`) targets per the skill's rules.
2. Output `onboarding.config.ts` (a typed `OnboardingConfig`) plus the
   `provideOnboarding()` wiring — only what's missing.
3. End with a **checklist** of edits the user must make in their own code
   (ids to add, events to emit), kept separate from the generated config.

This is assisted authoring, not magic: flag every assumption, never invent a
selector or event that isn't in the code, and say the result is a draft to run
and eyeball (especially timing and conditionally-rendered targets).
