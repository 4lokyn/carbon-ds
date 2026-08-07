import { inject, Injectable } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import type { ComponentType } from '@angular/cdk/portal';

/**
 * Thin wrapper over CDK's Dialog that pins our defaults in one place.
 *
 * The point of wrapping is not to hide the CDK — the returned DialogRef is the
 * real thing. It is so that "how our modals behave" is a decision made once,
 * instead of every call site passing its own config and slowly drifting apart.
 */
@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly dialog = inject(Dialog);

  open<R = unknown, D = unknown, C = unknown>(
    component: ComponentType<C>,
    config?: DialogConfig<D, DialogRef<R, C>>,
  ): DialogRef<R, C> {
    return this.dialog.open<R, D, C>(component, {
      panelClass: 'ds-modal-panel',

      // Carbon's spec: focus lands on the first interactive control, not on the
      // container. 'first-tabbable' is what does that.
      autoFocus: 'first-tabbable',

      // Return focus to whatever opened the modal. Without this, keyboard users
      // get dropped at the top of the document on close.
      restoreFocus: true,

      // Dismissible by default. A modal that traps you is a deliberate decision
      // (destructive confirmation, unsaved work) — pass disableClose per call.
      disableClose: false,

      ...config,
    });
  }
}
