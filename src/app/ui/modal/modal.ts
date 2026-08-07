import {
  afterNextRender,
  Component,
  Directive,
  ElementRef,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';

let nextId = 0;

/**
 * The presentational shell of a modal. Behavior — focus trap, restore focus on
 * close, Escape handling, scroll blocking, the backdrop — all comes from
 * @angular/cdk/dialog. We supply the chrome.
 *
 * Open it through ModalService rather than placing it inline; that is what wires
 * up DialogRef.
 */
@Component({
  selector: 'ds-modal',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './modal.scss',
  host: { class: 'ds-modal' },
  template: `
    <header class="ds-modal__header">
      @if (label()) {
        <p class="ds-modal__label">{{ label() }}</p>
      }

      <h2 class="ds-modal__heading" [id]="headingId">{{ heading() }}</h2>

      <button
        class="ds-modal__close"
        type="button"
        [attr.aria-label]="closeLabel()"
        (click)="requestClose()"
      >
        <!-- Carbon Close/20 -->
        <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
          <path
            fill="currentColor"
            d="M17.4141 16L24 9.4141 22.5859 8 16 14.5859 9.4143 8 8 9.4141 14.5859 16 8 22.5859 9.4143 24 16 17.4141 22.5859 24 24 22.5859z"
          />
        </svg>
      </button>
    </header>

    <ng-content />
  `,
})
export class Modal {
  /** Optional eyebrow above the title — Carbon uses it for the object type. */
  readonly label = input<string>();

  readonly heading = input.required<string>();

  /** Accessible name for the close button. Pass the translated string. */
  readonly closeLabel = input('Close');

  /** Fires before the dialog closes, so the caller can veto or clean up. */
  readonly closeRequested = output<void>();

  protected readonly headingId = `ds-modal-heading-${nextId++}`;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Optional: absent when the component is rendered inline (a story, a test).
  private readonly dialogRef = inject(DialogRef, { optional: true });

  constructor() {
    // The CDK puts role="dialog" and aria-modal on its own container element and
    // reads aria-labelledby from the config at creation time — before this
    // component, and therefore the heading, exists. Setting it from here is what
    // lets the heading stay the single source of the accessible name.
    afterNextRender(() => {
      this.host.nativeElement
        .closest('.cdk-dialog-container')
        ?.setAttribute('aria-labelledby', this.headingId);
    });
  }

  protected requestClose(): void {
    this.closeRequested.emit();
    this.dialogRef?.close();
  }
}

/** Scrollable content region. Everything long goes in here, not in the shell. */
@Directive({
  selector: '[dsModalBody]',
  host: { class: 'ds-modal__body' },
})
export class ModalBody {}

/** Action row. Carbon expects two or three buttons, at size `xl`. */
@Directive({
  selector: '[dsModalFooter]',
  host: { class: 'ds-modal__footer' },
})
export class ModalFooter {}

export const DS_MODAL = [Modal, ModalBody, ModalFooter] as const;
