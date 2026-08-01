/// <reference types="jasmine" />
import { TestBed } from '@angular/core/testing';
import { OnboardingEvent } from '../models/onboarding-event.model';
import { OnboardingEventBus } from './onboarding-event-bus.service';

describe('OnboardingEventBus', () => {
  let bus: OnboardingEventBus;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [OnboardingEventBus] });
    bus = TestBed.inject(OnboardingEventBus);
  });

  it('emits an event with type, payload and a timestamp', () => {
    const received: OnboardingEvent[] = [];
    bus.events$.subscribe((e) => received.push(e));

    const before = Date.now();
    bus.emit('PROJECT_CREATED', { id: 7 });

    expect(received.length).toBe(1);
    expect(received[0].type).toBe('PROJECT_CREATED');
    expect(received[0].payload).toEqual({ id: 7 });
    expect(received[0].timestamp).toBeGreaterThanOrEqual(before);
  });

  it('is hot: only delivers events emitted after subscription', () => {
    bus.emit('EARLY');
    const received: string[] = [];
    bus.events$.subscribe((e) => received.push(e.type));

    bus.emit('LATE');

    expect(received).toEqual(['LATE']);
  });

  describe('on(type)', () => {
    it('filters to a single type and unwraps the payload', () => {
      const payloads: unknown[] = [];
      bus.on<{ name: string }>('PROJECT_CREATED').subscribe((p) =>
        payloads.push(p),
      );

      bus.emit('OTHER', { nope: true });
      bus.emit('PROJECT_CREATED', { name: 'Alpha' });
      bus.emit('PROJECT_CREATED', { name: 'Beta' });

      expect(payloads).toEqual([{ name: 'Alpha' }, { name: 'Beta' }]);
    });

    it('emits undefined for a payload-less event of the matching type', () => {
      const payloads: unknown[] = [];
      bus.on('PING').subscribe((p) => payloads.push(p));

      bus.emit('PING');

      expect(payloads).toEqual([undefined]);
    });
  });
});
