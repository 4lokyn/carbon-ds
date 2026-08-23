import { Component, input, signal, ViewEncapsulation } from '@angular/core';
import { Icon } from '../icon/icon';
import { DismissibleNotification, type NotificationVariant } from './notification-base';

/**
 * Carbon's toast notification: a short, non-modal message that arrives over the
 * page, top right.
 *
 * Usually you want `NotificationService` rather than this element — it owns the
 * stack, the placement and the timeout. Place one by hand only when it belongs
 * to a region of the page instead of to the application.
 *
 * The width is fixed at 288px (352px on the widest breakpoint) because a toast
 * is not part of the layout it covers; keep the message inside two lines.
 */
@Component({
  selector: 'nine-am-toast-notification',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  templateUrl: './toast-notification.html',
  styleUrl: './notification.scss',
  host: {
    '[class]': 'hostClass()',
    '[attr.role]': 'resolvedRole()',
  },
})
export class ToastNotification extends DismissibleNotification {
  protected readonly variant = signal<NotificationVariant>('toast');
  protected readonly defaultRole = 'status' as const;

  /**
   * The time the notification was sent, already formatted — a toast is not the
   * place to decide how a date reads.
   *
   * Carbon's rule is all or nothing: either every toast in the product carries a
   * time stamp or none does. Drop it if the message needs the third line.
   */
  readonly caption = input('');
}
