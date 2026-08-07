import { Component, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { Button, DS_MODAL } from '../ui';

export type ConfirmResult = 'confirm' | 'cancel';

/**
 * Demo content for a modal. Shows the intended shape: the opened component owns
 * the copy and the actions, <ds-modal> owns the chrome, and the result travels
 * back through DialogRef.close().
 */
@Component({
  selector: 'app-confirm-modal',
  imports: [...DS_MODAL, Button],
  template: `
    <ds-modal
      label="Cluster"
      heading="Delete production-eu-1?"
      (closeRequested)="ref.close('cancel')"
    >
      <div dsModalBody>
        <p>
          Deleting this cluster removes all 14 running services and their
          persistent volumes. Anything not backed up is gone.
        </p>
        <p style="margin-top: 1rem">This cannot be undone.</p>
      </div>

      <div dsModalFooter>
        <button dsButton kind="secondary" size="xl" (click)="ref.close('cancel')">
          Cancel
        </button>
        <button dsButton kind="danger" size="xl" (click)="ref.close('confirm')">
          Delete
        </button>
      </div>
    </ds-modal>
  `,
})
export class ConfirmModal {
  protected readonly ref = inject<DialogRef<ConfirmResult>>(DialogRef);
}
