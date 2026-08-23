import {
  booleanAttribute,
  computed,
  Directive,
  input,
  output,
  signal,
  type Signal,
} from '@angular/core';
import type { IconName } from '../icon/icons';

/**
 * Carbon's four statuses. Each is a color and an icon, and the pairing is fixed
 * — a green error or an unlabelled red is exactly the inconsistency the status
 * set exists to prevent.
 */
export type NotificationStatus = 'error' | 'success' | 'warning' | 'info';

/**
 * Carbon's four variants, which are four layouts rather than four components:
 * `inline` waits in the flow, `toast` arrives over the page, `callout` loads
 * with the page and never leaves. `actionable` is not in this list because it is
 * not a layout of its own — it borrows `inline` or `toast` and adds a button.
 */
export type NotificationVariant = 'inline' | 'toast' | 'callout';

/**
 * Carbon's accessibility guidance names `alert`, `log` and `status` for a
 * notification that needs no user action, and warns against venturing past
 * them. `status` is polite: the screen reader finishes its sentence first.
 * `alert` interrupts, which is right for a failure the user has to know about
 * now and wrong for everything else.
 *
 * `alertdialog` is the fourth, and it is the one that comes with obligations:
 * Carbon asks for it when the notification *requires* an action, and a dialog
 * role without a focus trap and an accessible name is a lie to a screen reader.
 * `ActionableNotification` is the only thing here that provides both, which is
 * why it is the only thing here that defaults to it.
 */
export type NotificationRole = 'status' | 'alert' | 'log' | 'alertdialog';

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
 * What every notification shares, dismissible or not. Not a component of its own
 * — Carbon has no such thing, and neither should the public API.
 *
 * The variants differ in layout and in nothing else: same statuses, same
 * contrast switch, same content. Keeping that agreement in one place is what
 * stops them from drifting into components that merely look related.
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
   * The layout this notification wears. A signal rather than a constant because
   * `ActionableNotification` chooses between two of them at runtime, and the
   * host class has to follow.
   */
  protected abstract readonly variant: Signal<NotificationVariant>;

  /**
   * Modifiers this variant adds on top of the layout and the status.
   *
   * There is exactly one so far and it is the reason this exists:
   * `ActionableNotification` wears `--inline` or `--toast` like everything else
   * *and* has to be reachable as itself, because its arrangement of the same
   * pieces differs from both.
   */
  protected readonly modifiers: Signal<readonly string[]> = signal([]);

  protected readonly icon = computed(() => STATUS_ICON[this.status()]);

  protected readonly hostClass = computed(() => {
    const classes = [
      'nine-am-notification',
      `nine-am-notification--${this.variant()}`,
      `nine-am-notification--${this.status()}`,
      ...this.modifiers().map((modifier) => `nine-am-notification--${modifier}`),
    ];

    if (this.lowContrast()) {
      classes.push('nine-am-notification--low-contrast');
    }

    return classes.join(' ');
  });
}

/**
 * The three variants a user can get rid of: inline, toast and actionable.
 * `Callout` deliberately stops one level up — it has no close button, no live
 * region and nothing to emit, and giving it those inputs would advertise
 * behavior it does not have.
 */
@Directive()
export abstract class DismissibleNotification extends NotificationBase {
  /**
   * Carbon: the close button is optional, and should be left out when it is
   * critical that the user reads or acts on the notification.
   */
  readonly hideCloseButton = input(false, { transform: booleanAttribute });

  /** Accessible name for the close button. Pass the translated string. */
  readonly closeLabel = input('Close notification');

  /**
   * See `NotificationRole`. Left unset it is the variant's own default —
   * `status` for inline and toast, `alertdialog` for actionable.
   *
   * `null` removes the attribute, for the case where something else is doing
   * the announcing — which is what `NotificationService` does, and why. A
   * notification that is announced twice is worse than one announced once.
   */
  readonly role = input<NotificationRole | null | undefined>(undefined);

  /**
   * The close button was pressed. Nothing is removed for you — the notification
   * is your element and you decide whether it disappears, which is what lets a
   * caller animate it out or keep it and mark it read. `NotificationService`
   * does the removing for toasts it owns.
   */
  readonly closed = output<void>();

  protected abstract readonly defaultRole: NotificationRole;

  /** What actually reaches the DOM: the caller's answer if they gave one, ours otherwise. */
  protected readonly resolvedRole = computed(() => {
    const role = this.role();
    return role === undefined ? this.defaultRole : role;
  });
}
