import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { OverlayModule } from '@angular/cdk/overlay';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OnboardingEventBus } from 'ngx-agentic-onboarding';

/**
 * Content of the CDK dialog. Rendered by the CDK into `.cdk-overlay-container`
 * (a sibling of the app root under `<body>`), with its own backdrop and focus
 * trap — i.e. a genuine `cdkModal`, not the hand-rolled div the flagship tour
 * uses. Stable ids let a tour target fields *inside* the overlay.
 */
@Component({
  selector: 'app-cdk-project-dialog',
  imports: [FormsModule],
  template: `
    <div class="dlg" role="dialog" aria-modal="true" aria-label="New project">
      <h3>New project (CDK Dialog)</h3>

      <label>
        Name
        <input id="cdk-dialog-name" type="text" [(ngModel)]="name" placeholder="e.g. Orion" />
      </label>

      <label>
        Description
        <textarea
          id="cdk-dialog-desc"
          rows="3"
          [(ngModel)]="desc"
          placeholder="What is this project for?"
        ></textarea>
      </label>

      <div class="actions">
        <button type="button" class="ghost" (click)="ref.close()">Cancel</button>
        <button id="cdk-dialog-save" type="button" class="primary" (click)="save()">
          Save project
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .dlg {
      background: #fff; border-radius: 14px; padding: 1.5rem;
      width: min(92vw, 420px); box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
    }
    h3 { margin: 0 0 1rem; }
    label { display: block; font-weight: 600; margin-bottom: 1rem; }
    input, textarea {
      display: block; width: 100%; margin-top: 0.35rem; padding: 0.55rem 0.6rem;
      border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; box-sizing: border-box;
    }
    .actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
    button { font: inherit; cursor: pointer; border-radius: 8px; padding: 0.5rem 0.9rem; border: 1px solid #cbd5e1; background: #fff; }
    button.primary { background: #4f46e5; color: #fff; border: 0; font-weight: 600; }
    button.ghost { background: transparent; }
  `,
})
export class CdkProjectDialogComponent {
  readonly ref = inject<DialogRef<string>>(DialogRef);
  private readonly bus = inject(OnboardingEventBus);
  readonly data = inject(DIALOG_DATA, { optional: true });

  name = '';
  desc = '';

  save(): void {
    this.bus.emit('CDK_DIALOG_SAVED', { name: this.name, desc: this.desc });
    this.ref.close(this.name);
  }
}

/**
 * "CDK Lab" — a page whose interactive bits live in real CDK overlays, showing
 * that the onboarding engine treats out-of-flow `cdk-overlay-container` content
 * as first-class tour targets:
 *
 *  - a **CDK Dialog** (backdrop + focus trap), and
 *  - a **connected overlay** menu (a dropdown panel anchored to a button).
 *
 * Both emit bus events so a tour can gate on opening them, then highlight and
 * drive the elements inside them like any other step.
 */
@Component({
  selector: 'app-cdk-lab',
  imports: [OverlayModule],
  template: `
    <section class="card">
      <h2>CDK Lab 🧩</h2>
      <p>
        This page's interactive bits live in real CDK overlays (a dialog + a
        connected overlay). Run the "CDK overlays" tour and it walks you through
        them as smoothly as any regular element.
      </p>

      <div class="row">
        <button id="cdk-open-dialog" type="button" class="primary" (click)="openDialog()">
          + New project (Dialog)
        </button>

        <!-- Connected overlay: the panel renders into cdk-overlay-container,
             below the tour backdrop's z-index — so once open during a tour it
             appears dimmed and inert. -->
        <button
          id="cdk-menu-trigger"
          type="button"
          class="ghost"
          cdkOverlayOrigin
          #menuOrigin="cdkOverlayOrigin"
          (click)="toggleMenu()"
        >
          View: {{ view() }} ▾
        </button>

        <ng-template
          cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="menuOrigin"
          [cdkConnectedOverlayOpen]="menuOpen()"
          (overlayOutsideClick)="menuOpen.set(false)"
        >
          <ul id="cdk-menu-panel" class="menu" role="menu">
            <li><button type="button" (click)="pickView('List')">List</button></li>
            <li>
              <button id="cdk-menu-board" type="button" (click)="pickView('Board')">
                Board
              </button>
            </li>
            <li><button type="button" (click)="pickView('Calendar')">Calendar</button></li>
          </ul>
        </ng-template>
      </div>

      @if (lastSaved()) {
        <p class="saved">Last saved: <strong>{{ lastSaved() }}</strong></p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
      padding: 1.25rem 1.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }
    h2 { margin-top: 0; }
    p { color: #6b7280; }
    .row { display: flex; gap: 0.75rem; margin-top: 1rem; }
    button { font: inherit; cursor: pointer; border-radius: 8px; padding: 0.5rem 0.9rem; border: 1px solid #cbd5e1; background: #fff; }
    button.primary { background: #4f46e5; color: #fff; border: 0; font-weight: 600; }
    button.ghost { background: transparent; }
    .saved { margin-top: 1rem; color: #166534; }
    /* The connected-overlay panel. */
    .menu {
      margin: 0.35rem 0 0; padding: 0.25rem; list-style: none; min-width: 180px;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
    .menu button { display: block; width: 100%; text-align: left; border: 0; }
    .menu button:hover { background: #eef2ff; }
  `,
})
export class CdkLabComponent {
  private readonly dialog = inject(Dialog);
  private readonly bus = inject(OnboardingEventBus);

  readonly menuOpen = signal(false);
  readonly view = signal('List');
  readonly lastSaved = signal<string | null>(null);

  openDialog(): void {
    // Announce the domain event first, so a waiting tour step advances as the
    // overlay opens.
    this.bus.emit('CDK_DIALOG_OPENED');
    const ref = this.dialog.open<string>(CdkProjectDialogComponent, {
      // CDK default: a backdrop that captures clicks, plus a focus trap.
      autoFocus: 'dialog',
    });
    ref.closed.subscribe((name) => {
      if (name) {
        this.lastSaved.set(name);
      }
    });
  }

  toggleMenu(): void {
    const open = !this.menuOpen();
    this.menuOpen.set(open);
    if (open) {
      this.bus.emit('CDK_MENU_OPENED');
    }
  }

  pickView(view: string): void {
    this.view.set(view);
    this.menuOpen.set(false);
    this.bus.emit('CDK_VIEW_PICKED', { view });
  }
}
