import { Injectable } from '@angular/core';
import { filter, map, Observable, Subject } from 'rxjs';
import { OnboardingEvent } from '../models/onboarding-event.model';

/**
 * Central, application-wide event bus for onboarding.
 *
 * This is the first pillar of the architecture: a lightweight, universal RxJS
 * `Subject` that collects business events from anywhere in the host app (e.g.
 * `PROJECT_CREATED`) and re-broadcasts them. The orchestrator subscribes here
 * to drive event-driven step transitions, and analytics can tap the same
 * stream — one bus, many consumers.
 *
 * Provided in root so a single instance is shared across the whole app.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingEventBus {
  private readonly eventSource = new Subject<OnboardingEvent>();

  /** Hot stream of every event pushed onto the bus. */
  readonly events$: Observable<OnboardingEvent> =
    this.eventSource.asObservable();

  /**
   * Emit a business (or lifecycle) event onto the bus.
   *
   * @param type    Event identifier, e.g. `PROJECT_CREATED`.
   * @param payload Optional structured data to travel with the event.
   */
  emit<T = unknown>(type: string, payload?: T): void {
    this.eventSource.next({
      type,
      payload,
      timestamp: Date.now(),
    });
  }

  /**
   * Convenience stream filtered down to a single event `type`, with the payload
   * narrowed to `T` and unwrapped for the consumer.
   *
   * @param type Event identifier to listen for.
   */
  on<T = unknown>(type: string): Observable<T> {
    return this.events$.pipe(
      filter((event) => event.type === type),
      map((event) => event.payload as T),
    );
  }
}
