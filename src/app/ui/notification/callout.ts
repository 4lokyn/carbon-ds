import { Component, input, signal, ViewEncapsulation } from '@angular/core';
import { Icon } from '../icon/icon';
import { NotificationBase, type NotificationVariant } from './notification-base';

/**
 * Carbon's callout: important information that is part of the page rather than
 * an event in it.
 *
 * The three things it does not have are the definition of it. No close button —
 * it cannot be dismissed, because it is not news, it is a condition. No live
 * region and no `role` — it loads with the page, so announcing it would
 * interrupt a screen reader reading the page it is already part of. No timeout,
 * for the same reason.
 *
 * Place it next to what it is about: above the form whose fields it constrains,
 * inside the panel whose limits it states. A callout at the top of a page,
 * talking about something further down, is an inline notification wearing the
 * wrong component.
 *
 * Width comes from the container. Unlike the other variants there is no cap —
 * a callout is laid out with the content it belongs to, not over it.
 *
 * Links inside it are reached with Tab like any other content, which is the
 * whole reason it may hold them and a toast may not.
 */
@Component({
  selector: 'nine-am-callout',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  templateUrl: './callout.html',
  styleUrl: './notification.scss',
  host: {
    '[class]': 'hostClass()',
  },
})
export class Callout extends NotificationBase {
  /**
   * An id put on the heading, so something projected into the body can point at
   * it. Carbon calls it `titleId` and its own example is the reason it exists: a
   * link inside a callout wants `aria-describedby` on the sentence that explains
   * why it is there, and "learn more" on its own tells a screen reader nothing.
   *
   * Left unset, no id is emitted — this is not an internal wiring the way it is
   * on `ActionableNotification`, which needs one to name itself.
   */
  readonly headingId = input<string>();

  protected readonly variant = signal<NotificationVariant>('callout');
}
