# Live example

A deliberately tiny Angular app wired to
[`ngx-onboarding-flow`](https://www.npmjs.com/package/ngx-onboarding-flow) from
npm, so the tour is the only interesting thing in it.

▶ **[Open it on StackBlitz](https://stackblitz.com/github/MarcinKurylo/ngx-onboarding-flow/tree/main/examples/stackblitz)**
— runs in the browser, no account and no local setup. First boot takes a few
seconds while npm installs.

## What it shows

The tour starts on load. In five steps it covers the three things that are
awkward to do by hand:

- a step that **waits for a business event** (`waitForEvent: 'TASK_ADDED'`),
  which fires only after the faked request resolves — so it can't advance early;
- a step that **changes route** (`navigateToRoute: '/stats'`) and then waits for
  its target to render;
- centered steps with no target, for the opening and closing screens.

## Where to look

**[`src/app/tour.ts`](./src/app/tour.ts)** is the whole tour — one typed
`OnboardingConfig`. Reorder the steps, rewrite the copy, point one somewhere
else; the preview reloads. Replay from "Show me around" in the header.

The rest of the app contributes exactly one line of onboarding code: the
`bus.emit('TASK_ADDED', …)` in
[`home.component.ts`](./src/app/home.component.ts), emitted where the real work
finishes.

## Running it locally

```bash
npm install
npm start
```

Full documentation is in the
[project README](https://github.com/MarcinKurylo/ngx-onboarding-flow#readme).
