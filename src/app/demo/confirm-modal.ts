import { Component, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { Button, NINE_AM_MODAL } from '../ui';

export type ConfirmResult = 'confirm' | 'cancel';

/**
 * Demo content for a modal. Shows the intended shape: the opened component owns
 * the copy and the actions, <nine-am-modal> owns the chrome, and the result travels
 * back through DialogRef.close().
 */
@Component({
  selector: 'app-confirm-modal',
  imports: [...NINE_AM_MODAL, Button],
  template: `
    <nine-am-modal
      label="Cluster"
      heading="Delete production-eu-1?"
      (closeRequested)="ref.close('cancel')"
    >
      <div nineAmModalBody>
        <p>
          Deleting this cluster removes all 14 running services and their
          persistent volumes. Anything not backed up is gone.
        </p>
        <p style="margin-top: 1rem">This cannot be undone.</p>
      </div>

      <div nineAmModalFooter>
        <button nineAmButton kind="secondary" size="xl" (click)="ref.close('cancel')">
          Cancel
        </button>
        <button nineAmButton kind="danger" size="xl" (click)="ref.close('confirm')">
          Delete
        </button>
      </div>
    </nine-am-modal>
  `,
})
export class ConfirmModal {
  protected readonly ref = inject<DialogRef<ConfirmResult>>(DialogRef);
}
