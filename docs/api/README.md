# ngx-onboarding-flow

## Enumerations

### OnboardingLifecycleEvent

Defined in: [models/onboarding-event.model.ts:32](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L32)

Internal, engine-emitted lifecycle events. These are published on the same
bus as business events but namespaced with an `onboarding:` prefix so that
analytics consumers can easily filter engine noise from domain signals.

#### Enumeration Members

##### TourStarted

> **TourStarted**: `"onboarding:tour_started"`

Defined in: [models/onboarding-event.model.ts:34](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L34)

A tour run has started.

##### TourCompleted

> **TourCompleted**: `"onboarding:tour_completed"`

Defined in: [models/onboarding-event.model.ts:36](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L36)

A tour run has completed all of its steps.

##### TourSkipped

> **TourSkipped**: `"onboarding:tour_skipped"`

Defined in: [models/onboarding-event.model.ts:38](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L38)

The user (or code) skipped/aborted the tour before completion.

##### StepShown

> **StepShown**: `"onboarding:step_shown"`

Defined in: [models/onboarding-event.model.ts:40](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L40)

A step is about to be shown (after routing/DOM resolution).

##### StepCompleted

> **StepCompleted**: `"onboarding:step_completed"`

Defined in: [models/onboarding-event.model.ts:42](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L42)

A step has been advanced away from (next/prev/event).

##### StepSkipped

> **StepSkipped**: `"onboarding:step_skipped"`

Defined in: [models/onboarding-event.model.ts:47](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L47)

A step was skipped without being shown because its
[OnboardingStep.enabled](#enabled) predicate returned `false`.

##### StepWaiting

> **StepWaiting**: `"onboarding:step_waiting"`

Defined in: [models/onboarding-event.model.ts:49](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L49)

The engine is waiting on a business event to unblock a step.

##### StepWaitTimeout

> **StepWaitTimeout**: `"onboarding:step_wait_timeout"`

Defined in: [models/onboarding-event.model.ts:55](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L55)

A [OnboardingStep.waitForEvent](#waitforevent) wait exceeded its configured timeout
without the business event firing. The engine then applies the configured
[OnboardingOptions.onWaitTimeout](#onwaittimeout) behaviour.

##### StepTargetLost

> **StepTargetLost**: `"onboarding:step_target_lost"`

Defined in: [models/onboarding-event.model.ts:61](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L61)

A visible step's highlighted target was removed from the DOM. The engine
attempts to re-resolve it; if it never returns, a [StepError](#steperror) follows
and the overlay is closed.

##### StepError

> **StepError**: `"onboarding:step_error"`

Defined in: [models/onboarding-event.model.ts:63](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L63)

A recoverable error occurred (e.g. selector never appeared).

## Classes

### DriverJsRenderer

Defined in: [services/driverjs-renderer.ts:106](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L106)

[OnboardingRenderer](#onboardingrenderer) backed by Driver.js.

It runs Driver.js in single-element `highlight()` mode rather than its own
`drive()` step engine: the [OnboardingOrchestrator](#onboardingorchestrator) owns step
progression (so it can pause for async events and routing), and this renderer
only paints one step at a time. The popover's Next/Prev/Close buttons are
wired back to the orchestrator through the supplied `controls`, which also
disables Driver.js's built-in auto-advance.

Requires the Driver.js stylesheet. Import it once in your app, e.g.:
`@import 'driver.js/dist/driver.css';`

#### Implements

- [`OnboardingRenderer`](#onboardingrenderer)

#### Constructors

##### Constructor

> **new DriverJsRenderer**(): [`DriverJsRenderer`](#driverjsrenderer)

###### Returns

[`DriverJsRenderer`](#driverjsrenderer)

#### Methods

##### show()

> **show**(`step`, `target`, `controls`): `void`

Defined in: [services/driverjs-renderer.ts:122](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L122)

Render/move the highlight + popover to the given step.

###### Parameters

###### step

[`OnboardingStep`](#onboardingstep)

The step to display.

###### target

`Element` \| `null`

Resolved target element, or `null` for centered steps.

###### controls

[`OnboardingRenderControls`](#onboardingrendercontrols)

Callbacks + metadata for the popover UI.

###### Returns

`void`

###### Implementation of

[`OnboardingRenderer`](#onboardingrenderer).[`show`](#show-1)

##### hide()

> **hide**(): `void`

Defined in: [services/driverjs-renderer.ts:187](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L187)

Tear down any overlay/highlight currently on screen.

###### Returns

`void`

###### Implementation of

[`OnboardingRenderer`](#onboardingrenderer).[`hide`](#hide-1)

***

### OnboardingEventBus

Defined in: [services/onboarding-event-bus.service.ts:17](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-event-bus.service.ts#L17)

Central, application-wide event bus for onboarding.

This is the first pillar of the architecture: a lightweight, universal RxJS
`Subject` that collects business events from anywhere in the host app (e.g.
`PROJECT_CREATED`) and re-broadcasts them. The orchestrator subscribes here
to drive event-driven step transitions, and analytics can tap the same
stream — one bus, many consumers.

Provided in root so a single instance is shared across the whole app.

#### Constructors

##### Constructor

> **new OnboardingEventBus**(): [`OnboardingEventBus`](#onboardingeventbus)

###### Returns

[`OnboardingEventBus`](#onboardingeventbus)

#### Properties

##### events$

> `readonly` **events$**: `Observable`\<[`OnboardingEvent`](#onboardingevent)\<`unknown`\>\>

Defined in: [services/onboarding-event-bus.service.ts:21](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-event-bus.service.ts#L21)

Hot stream of every event pushed onto the bus.

#### Methods

##### emit()

> **emit**\<`T`\>(`type`, `payload?`): `void`

Defined in: [services/onboarding-event-bus.service.ts:30](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-event-bus.service.ts#L30)

Emit a business (or lifecycle) event onto the bus.

###### Type Parameters

###### T

`T` = `unknown`

###### Parameters

###### type

`string`

Event identifier, e.g. `PROJECT_CREATED`.

###### payload?

`T`

Optional structured data to travel with the event.

###### Returns

`void`

##### on()

> **on**\<`T`\>(`type`): `Observable`\<`T`\>

Defined in: [services/onboarding-event-bus.service.ts:44](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-event-bus.service.ts#L44)

Convenience stream filtered down to a single event `type`, with the payload
narrowed to `T` and unwrapped for the consumer.

###### Type Parameters

###### T

`T` = `unknown`

###### Parameters

###### type

`string`

Event identifier to listen for.

###### Returns

`Observable`\<`T`\>

***

### OnboardingOrchestrator

Defined in: [services/onboarding-orchestrator.service.ts:50](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L50)

The steering engine — pillar three of the architecture.

It owns the tour state machine and coordinates *asynchronous* transitions:
running lifecycle hooks, driving the router, waiting for the target selector
to appear in the DOM, and — crucially — pausing on [OnboardingStep.waitForEvent](#waitforevent)
until the host app emits the matching business event on the
[OnboardingEventBus](#onboardingeventbus). Every asynchronous stage is cancellable and
guarded so a mid-flight navigation or a missing element can never crash the
host view.

#### Constructors

##### Constructor

> **new OnboardingOrchestrator**(): [`OnboardingOrchestrator`](#onboardingorchestrator)

Defined in: [services/onboarding-orchestrator.service.ts:152](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L152)

###### Returns

[`OnboardingOrchestrator`](#onboardingorchestrator)

#### Properties

##### currentIndex

> `readonly` **currentIndex**: `Signal`\<`number`\>

Defined in: [services/onboarding-orchestrator.service.ts:126](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L126)

Zero-based index of the active step (`-1` when idle).

##### status

> `readonly` **status**: `Signal`\<[`OnboardingStatus`](#onboardingstatus)\>

Defined in: [services/onboarding-orchestrator.service.ts:129](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L129)

Current lifecycle status of the engine.

##### currentStep

> `readonly` **currentStep**: `Signal`\<[`OnboardingStep`](#onboardingstep)\<[`OnboardingEventMap`](#onboardingeventmap)\> \| `null`\>

Defined in: [services/onboarding-orchestrator.service.ts:132](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L132)

The currently active step, or `null` when idle.

##### totalSteps

> `readonly` **totalSteps**: `Signal`\<`number`\>

Defined in: [services/onboarding-orchestrator.service.ts:139](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L139)

Total number of steps in the loaded tour.

##### isActive

> `readonly` **isActive**: `Signal`\<`boolean`\>

Defined in: [services/onboarding-orchestrator.service.ts:142](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L142)

Whether a tour is currently running or waiting.

##### progress

> `readonly` **progress**: `Signal`\<`number`\>

Defined in: [services/onboarding-orchestrator.service.ts:147](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L147)

Completion progress in the range `[0, 1]`.

#### Methods

##### start()

> **start**\<`TEvents`\>(`config?`): `void`

Defined in: [services/onboarding-orchestrator.service.ts:165](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L165)

Load a config (if provided) and begin the tour from the first step.

###### Type Parameters

###### TEvents

`TEvents` = [`OnboardingEventMap`](#onboardingeventmap)

###### Parameters

###### config?

[`OnboardingConfig`](#onboardingconfig)\<`TEvents`\>

Optional config to load; reuses the previously loaded one
              when omitted.

###### Returns

`void`

##### next()

> **next**(): `void`

Defined in: [services/onboarding-orchestrator.service.ts:180](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L180)

Advance to the next step, completing the tour after the last one.

###### Returns

`void`

##### prev()

> **prev**(): `void`

Defined in: [services/onboarding-orchestrator.service.ts:193](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L193)

Return to the previous step (no-op on the first step).

###### Returns

`void`

##### skip()

> **skip**(): `void`

Defined in: [services/onboarding-orchestrator.service.ts:208](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L208)

Skip/abort the tour before completion. A dismissal is remembered as "seen"
only when the config opts in with [OnboardingConfig.persistOnSkip](#persistonskip);
by default it is not, so the tour can reappear later.

###### Returns

`void`

##### startIfNotCompleted()

> **startIfNotCompleted**\<`TEvents`\>(`config?`): `boolean`

Defined in: [services/onboarding-orchestrator.service.ts:228](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L228)

Start the tour unless it has already been completed/dismissed (per
[OnboardingStorage](#onboardingstorage)). Returns `true` if it actually started.

###### Type Parameters

###### TEvents

`TEvents` = [`OnboardingEventMap`](#onboardingeventmap)

###### Parameters

###### config?

[`OnboardingConfig`](#onboardingconfig)\<`TEvents`\>

Optional config to load first.

###### Returns

`boolean`

##### autoStart()

> **autoStart**\<`TEvents`\>(`config?`): `boolean`

Defined in: [services/onboarding-orchestrator.service.ts:246](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L246)

Honour [OnboardingConfig.startImmediately](#startimmediately): starts the tour (guarded
by persistence) only when the config opts into auto-starting. Call this
once the host view/router is ready. Returns `true` if it started.

###### Type Parameters

###### TEvents

`TEvents` = [`OnboardingEventMap`](#onboardingeventmap)

###### Parameters

###### config?

[`OnboardingConfig`](#onboardingconfig)\<`TEvents`\>

###### Returns

`boolean`

##### hasCompleted()

> **hasCompleted**\<`TEvents`\>(`config?`): `boolean`

Defined in: [services/onboarding-orchestrator.service.ts:254](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L254)

Whether the (optionally given) tour has been persisted as seen.

###### Type Parameters

###### TEvents

`TEvents` = [`OnboardingEventMap`](#onboardingeventmap)

###### Parameters

###### config?

[`OnboardingConfig`](#onboardingconfig)\<`TEvents`\>

###### Returns

`boolean`

##### reset()

> **reset**\<`TEvents`\>(`config?`): `void`

Defined in: [services/onboarding-orchestrator.service.ts:260](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L260)

Forget a tour's persisted completion so it can be shown again.

###### Type Parameters

###### TEvents

`TEvents` = [`OnboardingEventMap`](#onboardingeventmap)

###### Parameters

###### config?

[`OnboardingConfig`](#onboardingconfig)\<`TEvents`\>

###### Returns

`void`

##### goTo()

> **goTo**(`index`): `Promise`\<`void`\>

Defined in: [services/onboarding-orchestrator.service.ts:271](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L271)

Jump directly to a step by index, running the full async transition
pipeline. Out-of-range indices are ignored.

###### Parameters

###### index

`number`

###### Returns

`Promise`\<`void`\>

***

### LocalStorageOnboardingStorage

Defined in: [services/onboarding-storage.ts:24](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-storage.ts#L24)

Default [OnboardingStorage](#onboardingstorage) backed by `localStorage`. SSR- and
privacy-safe: every access is guarded, so a missing window or a throwing
localStorage (Safari private mode, blocked storage) degrades to a no-op
rather than crashing.

#### Implements

- [`OnboardingStorage`](#onboardingstorage)

#### Constructors

##### Constructor

> **new LocalStorageOnboardingStorage**(`document`): [`LocalStorageOnboardingStorage`](#localstorageonboardingstorage)

Defined in: [services/onboarding-storage.ts:25](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-storage.ts#L25)

###### Parameters

###### document

`Document`

###### Returns

[`LocalStorageOnboardingStorage`](#localstorageonboardingstorage)

#### Methods

##### isCompleted()

> **isCompleted**(`key`): `boolean`

Defined in: [services/onboarding-storage.ts:35](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-storage.ts#L35)

Whether the tour under `key` has been marked as seen.

###### Parameters

###### key

`string`

###### Returns

`boolean`

###### Implementation of

[`OnboardingStorage`](#onboardingstorage).[`isCompleted`](#iscompleted)

##### markCompleted()

> **markCompleted**(`key`): `void`

Defined in: [services/onboarding-storage.ts:43](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-storage.ts#L43)

Record the tour under `key` as seen.

###### Parameters

###### key

`string`

###### Returns

`void`

###### Implementation of

[`OnboardingStorage`](#onboardingstorage).[`markCompleted`](#markcompleted)

##### clear()

> **clear**(`key`): `void`

Defined in: [services/onboarding-storage.ts:51](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-storage.ts#L51)

Forget the tour under `key` so it can be shown again.

###### Parameters

###### key

`string`

###### Returns

`void`

###### Implementation of

[`OnboardingStorage`](#onboardingstorage).[`clear`](#clear)

## Interfaces

### OnboardingOptions

Defined in: [models/onboarding-config.model.ts:17](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L17)

Global, tour-wide defaults and behaviour toggles. Individual steps may
override the timing-related values.

#### Properties

##### waitForSelectorTimeoutMs?

> `readonly` `optional` **waitForSelectorTimeoutMs?**: `number`

Defined in: [models/onboarding-config.model.ts:23](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L23)

Default maximum time, in milliseconds, to wait for a step's target
selector to appear before erroring. Steps may override this.

###### Default Value

```ts
5000
```

##### selectorPollIntervalMs?

> `readonly` `optional` **selectorPollIntervalMs?**: `number`

Defined in: [models/onboarding-config.model.ts:30](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L30)

How often, in milliseconds, to poll the DOM while waiting for a target
selector to appear.

###### Default Value

```ts
100
```

##### abortOnMissingTarget?

> `readonly` `optional` **abortOnMissingTarget?**: `boolean`

Defined in: [models/onboarding-config.model.ts:37](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L37)

If `true`, an unresolved (non-optional) target aborts the whole tour.
If `false`, the engine emits an error event and stops on that step.

###### Default Value

```ts
false
```

##### waitForEventTimeoutMs?

> `readonly` `optional` **waitForEventTimeoutMs?**: `number`

Defined in: [models/onboarding-config.model.ts:46](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L46)

Default maximum time, in milliseconds, to wait for a step's
[OnboardingStep.waitForEvent](#waitforevent) before applying [onWaitTimeout](#onwaittimeout).
`0` (the default) waits indefinitely; steps may override via
[OnboardingStep.waitForEventTimeoutMs](#waitforeventtimeoutms-1).

###### Default Value

```ts
0
```

##### onWaitTimeout?

> `readonly` `optional` **onWaitTimeout?**: [`OnWaitTimeoutBehavior`](#onwaittimeoutbehavior)

Defined in: [models/onboarding-config.model.ts:52](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L52)

What to do when a [OnboardingStep.waitForEvent](#waitforevent) wait times out.

###### Default Value

```ts
'reveal'
```

***

### OnboardingConfig

Defined in: [models/onboarding-config.model.ts:75](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L75)

The root, strongly-typed onboarding definition. An entire user onboarding
flow is described by a single one of these objects — no component code, no
imperative tour-service calls.

#### Example

```ts
export const appOnboarding: OnboardingConfig = {
  version: '1.0.0',
  steps: [
    { id: 'welcome', targetSelector: '#welcome-card', title: 'Hi!' },
    { id: 'create', targetSelector: '#btn-submit', waitForEvent: 'PROJECT_CREATED' },
    { id: 'stats', targetSelector: '#chart-main', navigateToRoute: '/dashboard' },
  ],
};
```

#### Type Parameters

##### TEvents

`TEvents` = [`OnboardingEventMap`](#onboardingeventmap)

Optional [OnboardingEventMap](#onboardingeventmap) that type-checks every
step's [OnboardingStep.waitForEvent](#waitforevent) name and `eventFilter` payload.

#### Properties

##### version

> `readonly` **version**: `string`

Defined in: [models/onboarding-config.model.ts:77](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L77)

Semantic version of this configuration, for persistence/migrations.

##### id?

> `readonly` `optional` **id?**: `string`

Defined in: [models/onboarding-config.model.ts:80](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L80)

Optional identifier, useful when an app ships more than one tour.

##### steps

> `readonly` **steps**: readonly [`OnboardingStep`](#onboardingstep)\<`TEvents`\>[]

Defined in: [models/onboarding-config.model.ts:83](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L83)

Ordered list of steps that make up the tour.

##### startImmediately?

> `readonly` `optional` **startImmediately?**: `boolean`

Defined in: [models/onboarding-config.model.ts:90](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L90)

Hint that this tour should auto-start (guarded by persistence) rather than
waiting for an explicit trigger. Honoured by
[OnboardingOrchestrator.autoStart](#autostart). Defaults to `false`.

##### persist?

> `readonly` `optional` **persist?**: `boolean`

Defined in: [models/onboarding-config.model.ts:98](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L98)

Master switch for remembering this tour (via [OnboardingStorage](#onboardingstorage)) so
it is not shown again. Requires [id](#id). Defaults to `true`. Set `false`
to disable persistence entirely — handy while authoring a tour so it always
re-runs.

##### persistOnSkip?

> `readonly` `optional` **persistOnSkip?**: `boolean`

Defined in: [models/onboarding-config.model.ts:108](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L108)

Whether *dismissing* the tour (Escape / close) also persists as "seen", the
way a genuine completion does. Defaults to `false`: a dismissal does not lock
the tour out, so it can reappear on the next visit — and you are not fighting
localStorage every time you iterate on it. Only a real completion sticks.
Requires [persist](#persist) to be on. Set `true` for the old "dismissed once,
gone forever" behaviour.

##### options?

> `readonly` `optional` **options?**: [`OnboardingOptions`](#onboardingoptions)

Defined in: [models/onboarding-config.model.ts:111](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L111)

Tour-wide timing and behaviour options.

***

### OnboardingEvent

Defined in: [models/onboarding-event.model.ts:10](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L10)

A single business event flowing through the [OnboardingEventBus](#onboardingeventbus).

Events are the backbone of the event-driven architecture: the host
application emits domain events (e.g. `PROJECT_CREATED`) and the
orchestrator reacts to them to advance the tour.

#### Type Parameters

##### T

`T` = `unknown`

Shape of the optional payload carried by the event.

#### Properties

##### type

> `readonly` **type**: `string`

Defined in: [models/onboarding-event.model.ts:15](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L15)

Unique, application-defined identifier of the event, e.g. `PROJECT_CREATED`.
By convention we use `SCREAMING_SNAKE_CASE`, but any string is accepted.

##### payload?

> `readonly` `optional` **payload?**: `T`

Defined in: [models/onboarding-event.model.ts:18](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L18)

Optional structured data attached to the event.

##### timestamp?

> `readonly` `optional` **timestamp?**: `number`

Defined in: [models/onboarding-event.model.ts:24](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-event.model.ts#L24)

Epoch milliseconds at which the event was emitted.
Populated automatically by the bus when omitted.

***

### OnboardingHookContext

Defined in: [models/onboarding-step.model.ts:30](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L30)

Read-only context handed to lifecycle hooks so they can make decisions
without reaching back into engine internals.

#### Properties

##### step

> `readonly` **step**: [`OnboardingStep`](#onboardingstep)

Defined in: [models/onboarding-step.model.ts:32](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L32)

The step the hook is attached to.

##### index

> `readonly` **index**: `number`

Defined in: [models/onboarding-step.model.ts:34](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L34)

Zero-based index of the step within the active tour.

##### total

> `readonly` **total**: `number`

Defined in: [models/onboarding-step.model.ts:36](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L36)

Total number of steps in the active tour.

***

### OnboardingStep

Defined in: [models/onboarding-step.model.ts:66](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L66)

A single, declarative step of an onboarding tour.

A step is intentionally decoupled from component code: everything the engine
needs — what to highlight, when to advance, where to navigate — lives here as
data. The async-oriented flags ([waitForEvent](#waitforevent), [navigateToRoute](#navigatetoroute),
[waitForSelectorTimeoutMs](#waitforselectortimeoutms-1)) are what let the engine coordinate routing
and DOM changes without imperative hacks in the host app.

#### Type Parameters

##### TEvents

`TEvents` = [`OnboardingEventMap`](#onboardingeventmap)

Optional [OnboardingEventMap](#onboardingeventmap) that makes
[waitForEvent](#waitforevent) and [eventFilter](#eventfilter) type-safe.

#### Properties

##### id

> `readonly` **id**: `string`

Defined in: [models/onboarding-step.model.ts:68](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L68)

Stable, unique identifier of the step within its tour.

##### targetSelector?

> `readonly` `optional` **targetSelector?**: `string`

Defined in: [models/onboarding-step.model.ts:74](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L74)

CSS selector of the element to highlight/anchor the popover to.
Optional: `center`-placement steps (welcome/finish screens) need no target.

##### title?

> `readonly` `optional` **title?**: `string`

Defined in: [models/onboarding-step.model.ts:80](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L80)

Popover heading. Treated as plain text and HTML-escaped before display
(see [allowHtml](#allowhtml) to opt into raw HTML).

##### content?

> `readonly` `optional` **content?**: `string`

Defined in: [models/onboarding-step.model.ts:87](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L87)

Popover body. Treated as plain text and HTML-escaped before display, so
interpolating user- or server-supplied data is safe by default
(see [allowHtml](#allowhtml) to opt into raw HTML).

##### allowHtml?

> `readonly` `optional` **allowHtml?**: `boolean`

Defined in: [models/onboarding-step.model.ts:95](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L95)

Opt this step's [title](#title)/[content](#content) out of escaping and render
them as raw HTML. Only enable it for trusted, developer-authored strings —
passing attacker-influenced data with `allowHtml: true` is an XSS sink.

###### Default Value

```ts
false
```

##### placement?

> `readonly` `optional` **placement?**: [`OnboardingStepPlacement`](#onboardingstepplacement)

Defined in: [models/onboarding-step.model.ts:98](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L98)

Where to place the popover relative to the target. Defaults to `auto`.

##### enabled?

> `readonly` `optional` **enabled?**: (`context`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [models/onboarding-step.model.ts:114](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L114)

Predicate deciding whether this step applies to the current user/context.
Evaluated (and awaited) right before the engine would land on the step; a
`false` result skips it entirely — its hooks never run — and the engine
continues in the direction of travel (forward on next, backward on prev).
May be async, e.g. to check a feature flag or a remote entitlement. When it
throws, the step is shown (fail-open) so onboarding content is never lost.

###### Parameters

###### context

[`OnboardingHookContext`](#onboardinghookcontext)

###### Returns

`boolean` \| `Promise`\<`boolean`\>

###### Example

```ts
{ id: 'invite-team', targetSelector: '#invite',
  enabled: ({ }) => user.plan === 'team' }
```

##### popoverClass?

> `readonly` `optional` **popoverClass?**: `string`

Defined in: [models/onboarding-step.model.ts:121](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L121)

Extra CSS class(es) applied to this step's popover, on top of the global
base class (`ngx-onboarding`) and any renderer-level class. Use it to theme
individual steps from your own SCSS.

##### nextLabel?

> `readonly` `optional` **nextLabel?**: `string`

Defined in: [models/onboarding-step.model.ts:127](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L127)

Overrides the "Next" button text for this step only. Falls back to the
renderer-wide label (configured via `provideOnboarding`) when omitted.

##### prevLabel?

> `readonly` `optional` **prevLabel?**: `string`

Defined in: [models/onboarding-step.model.ts:133](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L133)

Overrides the "Back" button text for this step only. Falls back to the
renderer-wide label when omitted.

##### doneLabel?

> `readonly` `optional` **doneLabel?**: `string`

Defined in: [models/onboarding-step.model.ts:139](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L139)

Overrides the final "Done" button text for this step only (shown when the
step is the last one). Falls back to the renderer-wide label when omitted.

##### waitForEvent?

> `readonly` `optional` **waitForEvent?**: `Extract`\<keyof `TEvents`, `string`\>

Defined in: [models/onboarding-step.model.ts:149](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L149)

Business event that must fire on the [OnboardingEventBus](#onboardingeventbus) before the
step is considered complete. While set, the built-in "Next" action is
disabled and the engine waits for the user to perform the real action.
Type-checked against [OnboardingEventMap](#onboardingeventmap) when one is supplied.

##### eventFilter?

> `readonly` `optional` **eventFilter?**: (`payload`) => `boolean`

Defined in: [models/onboarding-step.model.ts:156](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L156)

Optional predicate used to further qualify a [waitForEvent](#waitforevent) match by
inspecting the event payload (e.g. only advance for a specific project id).
When omitted, any event of the matching `type` unblocks the step.

###### Parameters

###### payload

`unknown`

###### Returns

`boolean`

##### waitForEventTimeoutMs?

> `readonly` `optional` **waitForEventTimeoutMs?**: `number`

Defined in: [models/onboarding-step.model.ts:164](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L164)

Maximum time, in milliseconds, to wait for [waitForEvent](#waitforevent) before the
engine gives up and applies [OnboardingOptions.onWaitTimeout](#onwaittimeout) (so the
user is never stranded on a step whose event never fires). Overrides the
global default; `0` disables the timeout for this step.

##### navigateToRoute?

> `readonly` `optional` **navigateToRoute?**: `string`

Defined in: [models/onboarding-step.model.ts:171](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L171)

Route the engine should navigate to *before* attempting to show this step.
The engine awaits navigation completion, then waits for the target selector
to appear in the DOM before rendering.

##### waitForSelectorTimeoutMs?

> `readonly` `optional` **waitForSelectorTimeoutMs?**: `number`

Defined in: [models/onboarding-step.model.ts:177](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L177)

Maximum time, in milliseconds, to wait for [targetSelector](#targetselector) to appear
in the DOM before emitting a step error. Defaults to a global config value.

##### delayMs?

> `readonly` `optional` **delayMs?**: `number`

Defined in: [models/onboarding-step.model.ts:183](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L183)

Fixed delay, in milliseconds, to wait after the target is resolved and
before the popover is rendered — useful for letting entry animations settle.

##### showNext?

> `readonly` `optional` **showNext?**: `boolean`

Defined in: [models/onboarding-step.model.ts:188](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L188)

Show the "Next" button. Defaults to `true` unless [waitForEvent](#waitforevent) is set.

##### showPrev?

> `readonly` `optional` **showPrev?**: `boolean`

Defined in: [models/onboarding-step.model.ts:191](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L191)

Show the "Previous" button. Defaults to `true` for all but the first step.

##### allowSkip?

> `readonly` `optional` **allowSkip?**: `boolean`

Defined in: [models/onboarding-step.model.ts:194](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L194)

Allow the user to skip/close the tour from this step. Defaults to `true`.

##### optional?

> `readonly` `optional` **optional?**: `boolean`

Defined in: [models/onboarding-step.model.ts:200](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L200)

If `true`, the step is silently skipped when its target cannot be resolved
instead of raising an error. Useful for conditional UI.

##### beforeStep?

> `readonly` `optional` **beforeStep?**: [`OnboardingHook`](#onboardinghook)

Defined in: [models/onboarding-step.model.ts:205](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L205)

Runs (awaited) just before the step is shown.

##### afterStep?

> `readonly` `optional` **afterStep?**: [`OnboardingHook`](#onboardinghook)

Defined in: [models/onboarding-step.model.ts:208](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L208)

Runs (awaited) just after the step is dismissed/advanced.

***

### DriverJsRendererConfig

Defined in: [services/driverjs-renderer.ts:22](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L22)

Visual/behavioural configuration specific to the Driver.js overlay engine.
These are intentionally separate from the generic [OnboardingConfig](#onboardingconfig)
options so that renderer styling never leaks into the framework-agnostic core.

#### Properties

##### animate?

> `optional` **animate?**: `boolean`

Defined in: [services/driverjs-renderer.ts:24](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L24)

Animate highlight transitions between steps.

###### Default Value

```ts
true
```

##### overlayColor?

> `optional` **overlayColor?**: `string`

Defined in: [services/driverjs-renderer.ts:26](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L26)

Backdrop colour.

###### Default Value

```ts
'rgb(0, 0, 0)'
```

##### overlayOpacity?

> `optional` **overlayOpacity?**: `number`

Defined in: [services/driverjs-renderer.ts:28](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L28)

Backdrop opacity in `[0, 1]`.

###### Default Value

```ts
0.7
```

##### stagePadding?

> `optional` **stagePadding?**: `number`

Defined in: [services/driverjs-renderer.ts:30](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L30)

Padding, in px, around the highlighted element.

###### Default Value

```ts
10
```

##### stageRadius?

> `optional` **stageRadius?**: `number`

Defined in: [services/driverjs-renderer.ts:32](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L32)

Corner radius, in px, of the highlight cut-out.

###### Default Value

```ts
5
```

##### allowKeyboardControl?

> `optional` **allowKeyboardControl?**: `boolean`

Defined in: [services/driverjs-renderer.ts:39](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L39)

Allow closing the tour with the Escape key. (Arrow-key step navigation is
not available: the renderer drives Driver.js in single-`highlight()` mode,
where Driver.js's arrow handlers are inert.)

###### Default Value

```ts
true
```

##### closeOnBackdropClick?

> `optional` **closeOnBackdropClick?**: `boolean`

Defined in: [services/driverjs-renderer.ts:41](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L41)

Dismiss the tour when the backdrop is clicked.

###### Default Value

```ts
false
```

##### popoverClass?

> `optional` **popoverClass?**: `string`

Defined in: [services/driverjs-renderer.ts:43](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L43)

Extra CSS class applied to every popover.

##### nextLabel?

> `optional` **nextLabel?**: `string`

Defined in: [services/driverjs-renderer.ts:45](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L45)

Label for the "Next" button.

###### Default Value

```ts
'Next'
```

##### prevLabel?

> `optional` **prevLabel?**: `string`

Defined in: [services/driverjs-renderer.ts:47](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L47)

Label for the "Previous" button.

###### Default Value

```ts
'Back'
```

##### doneLabel?

> `optional` **doneLabel?**: `string`

Defined in: [services/driverjs-renderer.ts:49](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L49)

Label for the final "Done" button.

###### Default Value

```ts
'Done'
```

***

### OnboardingRenderControls

Defined in: [services/onboarding-renderer.ts:8](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L8)

Controls handed to a renderer so the popover's buttons can drive the engine
without the renderer needing a reference to the orchestrator itself.

#### Properties

##### index

> `readonly` **index**: `number`

Defined in: [services/onboarding-renderer.ts:16](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L16)

Zero-based index of the step being rendered.

##### total

> `readonly` **total**: `number`

Defined in: [services/onboarding-renderer.ts:18](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L18)

Total number of steps in the active tour.

##### isWaitingForEvent

> `readonly` **isWaitingForEvent**: `boolean`

Defined in: [services/onboarding-renderer.ts:20](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L20)

Whether a business event is blocking automatic advancement.

#### Methods

##### next()

> **next**(): `void`

Defined in: [services/onboarding-renderer.ts:10](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L10)

Advance to the next step (or finish on the last step).

###### Returns

`void`

##### prev()

> **prev**(): `void`

Defined in: [services/onboarding-renderer.ts:12](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L12)

Go back to the previous step.

###### Returns

`void`

##### skip()

> **skip**(): `void`

Defined in: [services/onboarding-renderer.ts:14](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L14)

Skip/abort the tour.

###### Returns

`void`

***

### OnboardingRenderer

Defined in: [services/onboarding-renderer.ts:29](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L29)

The overlay engine contract. The orchestrator core is deliberately agnostic
about *how* a step is drawn — this seam lets us plug in a slimmed Driver.js
renderer (pillar 3) without touching the state machine, and swap in a no-op
for tests or SSR.

#### Methods

##### show()

> **show**(`step`, `target`, `controls`): `void`

Defined in: [services/onboarding-renderer.ts:37](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L37)

Render/move the highlight + popover to the given step.

###### Parameters

###### step

[`OnboardingStep`](#onboardingstep)

The step to display.

###### target

`Element` \| `null`

Resolved target element, or `null` for centered steps.

###### controls

[`OnboardingRenderControls`](#onboardingrendercontrols)

Callbacks + metadata for the popover UI.

###### Returns

`void`

##### hide()

> **hide**(): `void`

Defined in: [services/onboarding-renderer.ts:44](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L44)

Tear down any overlay/highlight currently on screen.

###### Returns

`void`

***

### OnboardingStorage

Defined in: [services/onboarding-storage.ts:9](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-storage.ts#L9)

Persistence seam for remembering which tours a user has already seen, so a
completed/dismissed tour does not reappear. Swappable via DI (e.g. to persist
server-side or in cookies); the default is localStorage.

#### Methods

##### isCompleted()

> **isCompleted**(`key`): `boolean`

Defined in: [services/onboarding-storage.ts:11](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-storage.ts#L11)

Whether the tour under `key` has been marked as seen.

###### Parameters

###### key

`string`

###### Returns

`boolean`

##### markCompleted()

> **markCompleted**(`key`): `void`

Defined in: [services/onboarding-storage.ts:13](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-storage.ts#L13)

Record the tour under `key` as seen.

###### Parameters

###### key

`string`

###### Returns

`void`

##### clear()

> **clear**(`key`): `void`

Defined in: [services/onboarding-storage.ts:15](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-storage.ts#L15)

Forget the tour under `key` so it can be shown again.

###### Parameters

###### key

`string`

###### Returns

`void`

## Type Aliases

### OnWaitTimeoutBehavior

> **OnWaitTimeoutBehavior** = `"reveal"` \| `"advance"` \| `"skip"`

Defined in: [models/onboarding-config.model.ts:11](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L11)

What the engine does when a [OnboardingStep.waitForEvent](#waitforevent) wait exceeds
its timeout without the business event firing:
- `reveal`  — stop waiting and reveal the "Next" button so the user can
              advance manually (the safe default: nothing is lost).
- `advance` — automatically move on to the next step.
- `skip`    — abort the whole tour.

***

### OnboardingStepPlacement

> **OnboardingStepPlacement** = `"top"` \| `"top-start"` \| `"top-end"` \| `"bottom"` \| `"bottom-start"` \| `"bottom-end"` \| `"left"` \| `"right"` \| `"auto"` \| `"center"`

Defined in: [models/onboarding-step.model.ts:4](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L4)

Placement of the tooltip/popover relative to the highlighted target element.

***

### OnboardingHook

> **OnboardingHook** = (`context`) => `void` \| `Promise`\<`void`\>

Defined in: [models/onboarding-step.model.ts:22](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L22)

A side-effecting hook that may run synchronously or asynchronously.
Returning a `Promise` (or `void`) lets the orchestrator await async work
before it proceeds, which is what keeps transitions from crashing the view.

#### Parameters

##### context

[`OnboardingHookContext`](#onboardinghookcontext)

#### Returns

`void` \| `Promise`\<`void`\>

***

### OnboardingEventMap

> **OnboardingEventMap** = `Record`\<`string`, `unknown`\>

Defined in: [models/onboarding-step.model.ts:52](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-step.model.ts#L52)

Set of your app's business-event names. Declare one and pass it as the type
argument to [OnboardingConfig](#onboardingconfig) / [OnboardingStep](#onboardingstep) to get
**type-checked `waitForEvent` names** — a typo is a compile error (red
squiggle), not a silent runtime timeout. The permissive default keeps
`waitForEvent` a plain `string`.

#### Example

```ts
type AppEvents = { PROJECT_CREATED: unknown; SETTINGS_SAVED: unknown };
const tour: OnboardingConfig<AppEvents> = { … };
```

***

### OnboardingStatus

> **OnboardingStatus** = `"idle"` \| `"running"` \| `"waiting"` \| `"completed"` \| `"skipped"`

Defined in: [services/onboarding-orchestrator.service.ts:31](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-orchestrator.service.ts#L31)

Lifecycle status of the orchestrator's state machine.

## Variables

### DEFAULT\_ONBOARDING\_OPTIONS

> `const` **DEFAULT\_ONBOARDING\_OPTIONS**: `ResolvedOnboardingOptions`

Defined in: [models/onboarding-config.model.ts:122](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/models/onboarding-config.model.ts#L122)

Engine-wide default options applied when a config omits values.

***

### DRIVERJS\_RENDERER\_CONFIG

> `const` **DRIVERJS\_RENDERER\_CONFIG**: `InjectionToken`\<[`DriverJsRendererConfig`](#driverjsrendererconfig)\>

Defined in: [services/driverjs-renderer.ts:53](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L53)

DI token carrying the [DriverJsRendererConfig](#driverjsrendererconfig).

***

### ONBOARDING\_POPOVER\_CLASS

> `const` **ONBOARDING\_POPOVER\_CLASS**: `"ngx-onboarding"` = `'ngx-onboarding'`

Defined in: [services/driverjs-renderer.ts:61](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/driverjs-renderer.ts#L61)

Stable CSS class applied to every popover the renderer paints. Use it as a
theming hook, e.g. `.driver-popover.ngx-onboarding { … }`, or override the
`--ngx-ob-*` variables consumed by the optional theme stylesheet.

***

### ONBOARDING\_RENDERER

> `const` **ONBOARDING\_RENDERER**: `InjectionToken`\<[`OnboardingRenderer`](#onboardingrenderer)\>

Defined in: [services/onboarding-renderer.ts:52](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-renderer.ts#L52)

DI token for the active [OnboardingRenderer](#onboardingrenderer). Optional: when no renderer
is provided the orchestrator still runs its full state machine (useful for
headless tests), it simply has nothing to draw.

***

### ONBOARDING\_STORAGE

> `const` **ONBOARDING\_STORAGE**: `InjectionToken`\<[`OnboardingStorage`](#onboardingstorage)\>

Defined in: [services/onboarding-storage.ts:65](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/services/onboarding-storage.ts#L65)

DI token for the active [OnboardingStorage](#onboardingstorage). Provided in root with a
localStorage-backed default, so persistence works out of the box; override it
to plug in a custom backend.

## Functions

### provideOnboarding()

> **provideOnboarding**(`config?`): `EnvironmentProviders`

Defined in: [provide-onboarding.ts:36](https://github.com/MarcinKurylo/ngx-onboarding-flow/blob/main/projects/ngx-onboarding-flow/src/lib/provide-onboarding.ts#L36)

Registers the onboarding engine with the Driver.js overlay renderer.

Add it to your application's providers; the [OnboardingEventBus](#onboardingeventbus) and
[OnboardingOrchestrator](#onboardingorchestrator) are already `providedIn: 'root'`, so this only
wires up the renderer + its configuration.

#### Parameters

##### config?

[`DriverJsRendererConfig`](#driverjsrendererconfig)

Optional Driver.js-specific look & feel overrides.

#### Returns

`EnvironmentProviders`

#### Example

```ts
// app.config.ts
import 'driver.js/dist/driver.css'; // or @import in your global styles
import { provideOnboarding } from 'ngx-onboarding-flow';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideOnboarding({ overlayOpacity: 0.6, nextLabel: 'Dalej' }),
  ],
};
```
