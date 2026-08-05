---
description: Generate an ngx-onboarding-flow tour (OnboardingConfig) from this Angular app
argument-hint: [optional: describe the flow to onboard, e.g. "first-run: create a project then see the dashboard"]
---

Author an `ngx-onboarding-flow` tour for this app using the **onboarding-author**
skill. Follow that skill's procedure exactly.

Flow to build (may be empty): $ARGUMENTS

If no flow was described above, read the app's routes and main screens and propose
one before generating anything. Either way, follow the skill's own rules on what to
ask about — the tour split and any new test coverage are the user's calls; ids,
emits, providers and style wiring are yours to apply.

The skill is the source of truth for the procedure. Do not take shortcuts around
it, and in particular:

- **Apply the wiring yourself.** Add the missing `id`/`data-*` anchors, the
  `bus.emit('…')` calls, `provideOnboarding()` and the stylesheets. These are
  mechanical edits — make them.
- **Do not end with a checklist of edits you could have made.** The closing summary
  is for what you changed in the user's code and the genuine decisions or
  assumptions worth eyeballing (timing, conditionally-rendered targets) — never
  homework.
- **Close the loop**: build it, and run the existing test suite if there is one,
  fixing anything your wiring broke.

This is assisted authoring, not magic: flag every assumption, never invent a
selector or event that isn't in the code, and say the result is a draft to run and
eyeball.
