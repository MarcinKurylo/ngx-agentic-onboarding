import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OnboardingEventBus } from 'ngx-onboarding-flow';

import { ApiService, Project, ProjectStatus } from './api.service';

type Filter = 'all' | ProjectStatus;

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  template: `
    <section id="welcome-card" class="card welcome">
      <h2>Projects overview</h2>
      <p>Browse, filter and create projects. Data loads asynchronously.</p>
    </section>

    <section class="card">
      <div class="toolbar">
        <h3>Projects</h3>

        <!-- Dropdown: opening it and picking an option both fire bus events -->
        <div class="dropdown">
          <button id="filter-btn" type="button" (click)="toggleFilter()">
            Filter: {{ filterLabel() }} ▾
          </button>
          @if (filterOpen()) {
            <ul class="menu" role="menu">
              <li>
                <button id="filter-all" type="button" (click)="applyFilter('all')">
                  All
                </button>
              </li>
              <li>
                <button id="filter-active" type="button" (click)="applyFilter('active')">
                  Active
                </button>
              </li>
              <li>
                <button type="button" (click)="applyFilter('archived')">
                  Archived
                </button>
              </li>
            </ul>
          }
        </div>

        <button id="new-project-btn" type="button" class="primary" (click)="openModal()">
          + New project
        </button>
      </div>

      <!-- Loader while the simulated request is in flight -->
      @if (loading()) {
        <div class="loader"><span class="spinner"></span> Loading projects…</div>
      } @else {
        <ul id="projects-list" class="list">
          @for (p of projects(); track p.id) {
            <li>
              <span class="dot" [class.archived]="p.status === 'archived'"></span>
              <strong>{{ p.name }}</strong>
              <em>{{ p.status === 'active' ? 'active' : 'archived' }}</em>
            </li>
          } @empty {
            <li class="muted">No projects for this filter.</li>
          }
        </ul>
      }
    </section>

    <!-- Modal (no full backdrop — Driver.js provides the dimming during a tour) -->
    @if (modalOpen()) {
      <div class="modal" role="dialog" aria-modal="true">
        <h3>New project</h3>
        <label>
          Project name
          <input id="project-name" type="text" [(ngModel)]="draftName" placeholder="e.g. Orion" />
        </label>
        <div class="modal-actions">
          <button type="button" class="ghost" (click)="closeModal()" [disabled]="creating()">
            Cancel
          </button>
          <button id="modal-submit" type="button" class="primary" (click)="submit()" [disabled]="creating()">
            @if (creating()) {
              <span class="spinner small"></span> Creating…
            } @else {
              Create project
            }
          </button>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 1.25rem 1.5rem; margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    h2, h3 { margin-top: 0; }
    .toolbar { display: flex; align-items: center; gap: 1rem; }
    .toolbar h3 { margin: 0; margin-right: auto; }
    button { font: inherit; cursor: pointer; border-radius: 8px; padding: .5rem .9rem; border: 1px solid #cbd5e1; background: #fff; }
    button.primary { background: #4f46e5; color: #fff; border: 0; font-weight: 600; }
    button.primary:hover { background: #4338ca; }
    button.ghost { background: transparent; }
    button:disabled { opacity: .6; cursor: not-allowed; }

    .dropdown { position: relative; }
    .menu {
      position: absolute; top: 110%; left: 0; z-index: 20; margin: 0; padding: .25rem;
      list-style: none; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.12); min-width: 190px;
    }
    .menu button { display: block; width: 100%; text-align: left; border: 0; }
    .menu button:hover { background: #eef2ff; }

    .loader { display: flex; align-items: center; gap: .6rem; padding: 1.5rem 0; color: #6b7280; }
    .list { list-style: none; padding: 0; margin: 1rem 0 0; }
    .list li { display: flex; align-items: center; gap: .6rem; padding: .55rem 0; border-top: 1px solid #f1f5f9; }
    .list em { color: #6b7280; margin-left: auto; font-style: normal; font-size: .85rem; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: #22c55e; }
    .dot.archived { background: #9ca3af; }
    .muted { color: #9ca3af; }

    .modal {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      z-index: 30; width: min(90vw, 380px);
      background: #fff; border-radius: 14px; padding: 1.5rem;
      box-shadow: 0 20px 60px rgba(0,0,0,.35);
    }
    .modal label { display: block; font-weight: 600; margin-bottom: 1rem; }
    .modal input { display: block; width: 100%; margin-top: .35rem; padding: .55rem .6rem; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; }
    .modal-actions { display: flex; justify-content: flex-end; gap: .5rem; }

    .spinner {
      width: 16px; height: 16px; border-radius: 50%;
      border: 2px solid #c7d2fe; border-top-color: #4f46e5;
      display: inline-block; animation: spin .7s linear infinite;
    }
    .spinner.small { width: 13px; height: 13px; border-width: 2px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `,
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly bus = inject(OnboardingEventBus);

  readonly loading = signal(true);
  readonly projects = signal<Project[]>([]);
  readonly filter = signal<Filter>('all');
  readonly filterOpen = signal(false);
  readonly modalOpen = signal(false);
  readonly creating = signal(false);
  draftName = '';

  ngOnInit(): void {
    this.load();
  }

  filterLabel(): string {
    return { all: 'All', active: 'Active', archived: 'Archived' }[this.filter()];
  }

  toggleFilter(): void {
    const open = !this.filterOpen();
    this.filterOpen.set(open);
    if (open) {
      // Business signal: the menu opened. The tour is listening.
      this.bus.emit('MENU_OPENED');
    }
  }

  applyFilter(filter: Filter): void {
    this.filter.set(filter);
    this.filterOpen.set(false);
    this.load(); // triggers the loader + a fresh "request"
    this.bus.emit('FILTER_APPLIED', { filter });
  }

  openModal(): void {
    this.draftName = '';
    this.modalOpen.set(true);
    this.bus.emit('MODAL_OPENED');
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  submit(): void {
    this.creating.set(true);
    this.api.createProject(this.draftName).subscribe((project) => {
      this.creating.set(false);
      this.modalOpen.set(false);
      // Only after the "request" resolves do we announce the domain event.
      this.bus.emit('PROJECT_CREATED', project);
      this.load();
    });
  }

  private load(): void {
    this.loading.set(true);
    const f = this.filter();
    const status = f === 'all' ? undefined : f;
    this.api.getProjects(status).subscribe((list) => {
      this.projects.set(list);
      this.loading.set(false);
    });
  }
}
