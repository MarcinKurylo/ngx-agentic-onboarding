# Security policy

## Reporting a vulnerability

**Please don't open a public issue.** Use GitHub's private vulnerability
reporting, which is enabled on this repository:

➡️ **[Report a vulnerability](https://github.com/MarcinKurylo/ngx-onboarding-flow/security/advisories/new)**

That opens a private thread visible only to you and the maintainer. If you'd
rather use email: **me@marcinkurylo.com**.

Useful things to include: the affected version, a minimal reproduction, and what
an attacker gets out of it. A reproduction is worth more than a description.

## What to expect

This is maintained by one person in their own time, so no SLA — but concretely:
an acknowledgement within about a week, and a fix released as soon as one is
ready and verified. You'll be credited in the advisory unless you'd rather not
be. There's no bug bounty.

## Supported versions

Only the latest published version is supported. The library is pre-1.0, so fixes
go out in a new release rather than being backported.

## Scope

**In scope** — the published `ngx-onboarding-flow` package: anything where the
library itself introduces a vulnerability into a consuming app, mishandles data
passed through it, or breaks its own documented security boundary.

**Out of scope:**

- **`allowHtml: true`.** This option deliberately renders a step's `title` and
  `content` as raw HTML instead of escaped text, and is documented as an XSS sink.
  Step text is escaped by default; opting out and then interpolating untrusted
  data is a bug in the consuming app, not here. A case where escaping *fails
  while it is on* — that we want to hear about.
- **`driver.js`**, our one runtime dependency. Report those upstream; we'll pick
  up the fix.
- **The demo app** (`projects/demo`) and the **`onboarding-author` skill**. Neither
  ships in the npm package, and the demo runs entirely against a mocked in-memory
  API.
- Anything requiring the attacker to already control the app's own source, build
  or providers.

## Notes on the design

Two properties worth knowing when assessing a report:

- **The library makes no network requests.** No `fetch`, no `HttpClient`, no
  sockets, no telemetry. Business event payloads pass through the in-memory bus
  and are never transmitted or persisted.
- **Persistence stores a tour key and a timestamp**, nothing else — no event
  payloads and no user data. The backend is swappable via `ONBOARDING_STORAGE`.
