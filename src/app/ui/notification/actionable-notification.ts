import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FocusTrapFactory, type FocusTrap } from '@angular/cdk/a11y';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { DismissibleNotification, type NotificationVariant } from './notification-base';

let nextId = 0;

/**
 * Carbon's actionable notification: an inline or toast notification with a
 * button in it.
 *
 * The button is the whole component. Everything else follows from it — a
 * notification the user has to *act* on is a dialog by any accessible reading,
 * so this one is `role="alertdialog"`, names itself from its own heading, takes
 * focus when it appears and keeps it until the action is taken or the thing is
 * dismissed. That is Carbon's specification and it is also simply what the role
 * promises; half of it would be worse than none.
 *
 * One component rather than two, unlike the inline/toast pair next to it, and
 * for the same reason those are two: this is where Carbon draws the line.
 * Carbon has one `ActionableNotification` with an `inline` flag, so `inline` is
 * an input here.
 *
 * Use it for something the user can still fix: a failed upload with *Retry*, a
 * draft with *Restore*. If nothing can be done about it, it is an inline
 * notification. If it must be answered before anything else can happen, it is a
 * modal.
 */
@Component({
  selector: 'ds-actionable-notification',
  encapsulation: ViewEncapsulation.None,
  imports: [Button, Icon],
  templateUrl: './actionable-notification.html',
  styleUrl: './notification.scss',
  host: {
    '[class]': 'hostClass()',
    '[attr.role]': 'resolvedRole()',
    '[attr.aria-labelledby]': 'headingId',
    '[attr.aria-describedby]': 'subtitle() ? subtitleId : null',

    // Only when we are the thing holding focus. An untrapped notification is
    // ordinary content and has no business in the tab order.
    '[attr.tabindex]': 'trapFocus() ? -1 : null',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class ActionableNotification extends DismissibleNotification {
  /**
   * Carbon's `inline` flag: wear the inline layout instead of the toast one.
   *
   * Default `false`, matching Carbon React — an actionable notification is
   * usually raised in response to something, which is the toast case. Set it
   * when the notification belongs to the region of the page it is placed in.
   */
  readonly inline = input(false, { transform: booleanAttribute });

  /**
   * The action button's label. No label, no button — that is the switch Carbon
   * uses too (`actionButtonLabel`), shortened here to match `closeLabel`.
   *
   * One verb, no full stop: *Retry*, *Restore*, *View log*. There is exactly one
   * action; a second one means this should have been a modal.
   */
  readonly actionLabel = input('');

  /**
   * The time the notification was sent, already formatted. Toast layout only —
   * the inline one has no room for a third line, which is Carbon's own rule.
   */
  readonly caption = input('');

  /**
   * Take focus on arrival and keep it until this element goes away.
   *
   * On by default because `role="alertdialog"` claims exactly that, and a screen
   * reader user who is told they are in a dialog and then tabs straight out of
   * it has been misled. Turn it off only together with `[role]` — a notification
   * that does not hold focus is a `status`, not an `alertdialog`.
   *
   * Read once, when the element is first rendered. Changing it later does not
   * grab or release focus; create or remove the notification instead, which is
   * what an application does anyway.
   */
  readonly trapFocus = input(true, { transform: booleanAttribute });

  /**
   * Escape dismisses it. Carbon calls this out as optional, and it is on here
   * for the reason it is on for dialogs: focus is trapped, so Escape is the way
   * out that does not require finding the close button.
   *
   * It emits `closed`, exactly as the close button does — including when the
   * close button is hidden, which is deliberate. Hiding the button says "read
   * this"; it does not say "you are stuck here".
   */
  readonly closeOnEscape = input(true, { transform: booleanAttribute });

  /** The action button was pressed. Carbon calls it `onActionButtonClick`. */
  readonly actionClicked = output<void>();

  protected readonly variant = computed<NotificationVariant>(() =>
    this.inline() ? 'inline' : 'toast',
  );

  protected override readonly modifiers = computed(() =>
    // `hide-close-button` is Carbon's own modifier, and it earns its place: with
    // no 48px close button holding the trailing edge, the action button ends up
    // flush against it. Measured at 0px before this was added.
    this.hideCloseButton() ? ['actionable', 'hide-close-button'] : ['actionable'],
  );

  protected readonly defaultRole = 'alertdialog' as const;

  protected readonly headingId = `ds-notification-heading-${nextId}`;
  protected readonly subtitleId = `ds-notification-subtitle-${nextId++}`;

  /** Ghost inline, tertiary on a toast. Carbon's own pairing, not a preference. */
  protected readonly actionKind = computed(() => (this.inline() ? 'ghost' : 'tertiary'));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly focusTraps = inject(FocusTrapFactory);
  private readonly trap = signal<FocusTrap | null>(null);

  constructor() {
    super();

    // Focus goes back where it came from on destroy. The element that had it is
    // read now rather than later, because by the time this notification is
    // removed the answer is `<body>`.
    let returnFocusTo: HTMLElement | null = null;

    afterNextRender(() => {
      if (!this.trapFocus()) {
        return;
      }

      returnFocusTo = document.activeElement as HTMLElement | null;
      this.trap.set(this.focusTraps.create(this.host.nativeElement));

      // The container, not the first button. It is what carries the role and the
      // accessible name, so focusing it is what makes a screen reader read the
      // heading and the subtitle before the user picks between two buttons.
      this.host.nativeElement.focus();
    });

    inject(DestroyRef).onDestroy(() => {
      this.trap()?.destroy();
      returnFocusTo?.focus();
    });
  }

  protected onEscape(event: Event): void {
    if (!this.closeOnEscape()) {
      return;
    }

    // Nothing else should act on it. An actionable notification is modal in
    // everything but the backdrop, and an Escape that also closes the dialog
    // behind it would be a surprise.
    event.stopPropagation();
    event.preventDefault();
    this.closed.emit();
  }
}
