import { Component, ViewEncapsulation } from '@angular/core';
import { Icon } from '../icon/icon';
import { NotificationBase } from './notification-base';

/**
 * Carbon's inline notification: the status of an action, shown in the flow it
 * belongs to rather than over it.
 *
 * Place it at the top of the content area it concerns, or directly above a
 * form's submit row. It fills the width it is given — up to Carbon's cap, which
 * is 288px and widens by breakpoint to 832px — and it never dismisses itself.
 * That is the difference from a toast, and it is the whole reason to choose one:
 * an inline notification waits.
 */
@Component({
  selector: 'ds-inline-notification',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  templateUrl: './inline-notification.html',
  styleUrl: './notification.scss',
  host: {
    '[class]': 'hostClass()',
    '[attr.role]': 'role()',
  },
})
export class InlineNotification extends NotificationBase {
  protected readonly variant = 'inline' as const;
}
