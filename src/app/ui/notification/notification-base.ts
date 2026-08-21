import { booleanAttribute, computed, Directive, input, output } from '@angular/core';
import type { IconName } from '../icon/icons';

/**
 * Carbon's four statuses. Each is a color and an icon, and the pairing is fixed
 * — a green error or an unlabelled red is exactly the inconsistency the status
 * set exists to prevent.
 */
export type NotificationStatus = 'error' | 'success' | 'warning' | 'info';

/**
 * Carbon's accessibility guidance names `alert`, `log` and `status` for a
 * notification that needs no user action, and warns against venturing past
 * them. `status` is polite: the screen reader finishes its sentence first.
 * `alert` interrupts, which is right for a failure the user has to know about
 * now and wrong for everything else.
 */
export type NotificationRole = 'status' | 'alert' | 'log';

const STATUS_ICON: Record<NotificationStatus, IconName> = {
  error: 'error-filled',
  success: 'checkmark-filled',

  // The one status whose icon is not the plain knockout glyph. Carbon paints
  // this exclamation black on the yellow circle instead of punching a hole in
  // it; see `warning-filled-solid` in icons.ts.
  warning: 'warning-filled-solid',
  info: 'information-filled',
};

/**
 * What the inline and toast notifications share. Not a component of its own —
 * Carbon has no such thing, and neither should the public API.
 *
 * The two variants differ in layout and in nothing else: same statuses, same
 * contrast switch, same close button, same content. Keeping that agreement in
 * one place is what stops them from drifting into two components that merely
 * look related.
 */
@Directive()
export abstract class NotificationBase {
  readonly status = input<NotificationStatus>('info');

  /**
   * Carbon calls this the title. It is `heading` here for the same reason
   * `Modal` uses `heading`: `title` is a global HTML attribute, and a static
   * `title="Upload failed"` would set the input *and* stay on the element as a
   * native tooltip — a second, uninvited copy of the text on hover.
   *
   * Keep it short and drop the full stop; the subtitle carries the detail.
   */
  readonly heading = input.required<string>();

  /** Carbon's body content. One or two sentences, and never a restatement of the heading. */
  readonly subtitle = input('');

  /**
   * Carbon's low-contrast style: a tinted surface instead of the inverse one.
   *
   * The default is the high-contrast style, matching Carbon React's own default
   * so a port does not silently change appearance. Carbon's usage guidance is
   * the other way round — "when in doubt, use low-contrast", with high contrast
   * reserved for critical messaging — so most applications should set this and
   * set it everywhere. Never mix the two within one variant.
   */
  readonly lowContrast = input(false, { transform: booleanAttribute });

  /**
   * Carbon: the close button is optional, and should be left out when it is
   * critical that the user reads or acts on the notification.
   */
  readonly hideCloseButton = input(false, { transform: booleanAttribute });

  /** Accessible name for the close button. Pass the translated string. */
  readonly closeLabel = input('Close notification');

  /**
   * See `NotificationRole`. Defaults to the polite one.
   *
   * `null` removes the attribute, for the case where something else is doing
   * the announcing — which is what `NotificationService` does, and why. A
   * notification that is announced twice is worse than one announced once.
   */
  readonly role = input<NotificationRole | null>('status');

  /**
   * The close button was pressed. Nothing is removed for you — the notification
   * is your element and you decide whether it disappears, which is what lets a
   * caller animate it out or keep it and mark it read. `NotificationService`
   * does the removing for toasts it owns.
   */
  readonly closed = output<void>();

  protected abstract readonly variant: 'inline' | 'toast';

  protected readonly icon = computed(() => STATUS_ICON[this.status()]);

  protected readonly hostClass = computed(() => {
    const classes = [
      'ds-notification',
      `ds-notification--${this.variant}`,
      `ds-notification--${this.status()}`,
    ];

    if (this.lowContrast()) {
      classes.push('ds-notification--low-contrast');
    }

    return classes.join(' ');
  });
}
