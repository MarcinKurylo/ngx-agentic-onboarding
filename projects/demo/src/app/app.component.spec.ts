import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OnboardingOrchestrator } from 'ngx-agentic-onboarding';

import { AppComponent } from './app.component';
import { appOnboarding } from './onboarding.config';

describe('AppComponent', () => {
  let orchestrator: OnboardingOrchestrator;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    orchestrator = TestBed.inject(OnboardingOrchestrator);
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the start-tour button', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn?.textContent).toContain('Uruchom samouczek');
  });

  it('starts the tour with the demo config on click', () => {
    const spy = spyOn(orchestrator, 'start');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();

    expect(spy).toHaveBeenCalledWith(appOnboarding);
  });
});
