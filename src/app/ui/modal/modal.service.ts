import { inject, Injectable } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import type { ComponentType } from '@angular/cdk/portal';

/**
 * Carbon's four modal widths. `md` is the default.
 *
 * Each is a share of the viewport rather than a pixel count, and the share
 * changes at every breakpoint — see the table in modal.scss. Pick by how much
 * room the content needs: `xs` for a one-line confirmation, `lg` for a table.
 */
export type ModalSize = 'xs' | 'sm' | 'md' | 'lg';

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

  /**
   * `size` is here rather than on `ds-modal` because the width belongs to the
   * overlay pane, which is the CDK's element and sits above the component in the
   * tree. A `size` input on the modal could not reach it.
   */
  open<R = unknown, D = unknown, C = unknown>(
    component: ComponentType<C>,
    config?: DialogConfig<D, DialogRef<R, C>> & { size?: ModalSize },
  ): DialogRef<R, C> {
    const { size = 'md', ...dialogConfig } = config ?? {};

    return this.dialog.open<R, D, C>(component, {
      panelClass: ['ds-modal-panel', `ds-modal-panel--${size}`],

      // Carbon's spec: focus lands on the first interactive control, not on the
      // container. 'first-tabbable' is what does that.
      autoFocus: 'first-tabbable',

      // Return focus to whatever opened the modal. Without this, keyboard users
      // get dropped at the top of the document on close.
      restoreFocus: true,

      // Dismissible by default. A modal that traps you is a deliberate decision
      // (destructive confirmation, unsaved work) — pass disableClose per call.
      disableClose: false,

      // The rest of the caller's config, with `size` already taken out — it is
      // ours, not the CDK's, and passing it through would leave an unknown key
      // on DialogConfig.
      ...dialogConfig,
    });
  }
}
