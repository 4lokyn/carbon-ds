import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  ScrollStrategyOptions,
} from '@angular/cdk/overlay';
import {
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgpDatePicker } from 'ng-primitives/date-picker';
import { NgpNativeDateAdapter, provideDateAdapter } from 'ng-primitives/date-time';
import { type DateFormatter, DatePickerPanel } from './date-picker-panel';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';
import type { FieldSize } from '../field/field-types';

let nextId = 0;

/** Monday is 1, Sunday is 7. */
export type FirstDayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Reads the field's text back. Returns `null` when the text is not a date. */
export type DateParser = (text: string) => Date | null;

/**
 * ISO 8601, and deliberately not a locale format.
 *
 * The default formatter and parser have to round-trip: whatever the field shows
 * must be something the field can read back, or typing over your own value
 * fails. ISO is the only format that is unambiguous in every locale — `03/04`
 * is two different days depending on who is reading. Override BOTH inputs
 * together to change it; overriding one is the bug this pairing exists to
 * prevent.
 */
export const ISO_FORMAT: DateFormatter = (date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
};

export const ISO_PARSE: DateParser = (text) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());

  if (!match) {
    return null;
  }

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);

  // Rejects 2026-02-31, which the Date constructor would roll over to March 3.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

/**
 * Carbon date picker: a text field with a calendar in a popover.
 *
 * Single date. `ds-date-range-picker` is the two-field version; both share the
 * calendar panel, because the primitive's grid directives resolve either state.
 *
 * The popover is `@angular/cdk/overlay`, not ng-primitives' own — we already use
 * the CDK for `Modal`, and taking theirs would mean shipping `@floating-ui/dom`
 * as a second positioning engine for no gain. It stays a peer dependency that
 * nothing imports, so it tree-shakes out.
 */
@Component({
  selector: 'ds-date-picker',
  encapsulation: ViewEncapsulation.None,
  imports: [
    Icon,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    NgpDatePicker,
    DatePickerPanel,
  ],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.scss',
  providers: [provideDateAdapter(NgpNativeDateAdapter)],
  host: { '[class]': 'hostClass()' },
})
export class DatePicker {
  readonly label = input.required<string>();
  readonly value = model<Date | null>(null);
  readonly size = input<FieldSize>('md');
  readonly placeholder = input('yyyy-mm-dd');
  readonly helperText = input('');

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly hideLabel = input(false, { transform: booleanAttribute });

  readonly invalid = input(false, { transform: booleanAttribute });
  readonly invalidText = input('');
  readonly warn = input(false, { transform: booleanAttribute });
  readonly warnText = input('');

  readonly min = input<Date | null>(null);
  readonly max = input<Date | null>(null);
  readonly dateDisabled = input<(date: Date) => boolean>(() => false);

  /**
   * Monday by default, which is ISO 8601 and most of the world. Carbon inherits
   * Sunday from flatpickr's US locale; that is a locale default rather than a
   * design decision, so this is one input away rather than baked in.
   */
  readonly firstDayOfWeek = input<FirstDayOfWeek>(1);

  /** Override both together, or the field stops being able to read itself. */
  readonly formatDate = input<DateFormatter>(ISO_FORMAT);
  readonly parseDate = input<DateParser>(ISO_PARSE);

  readonly openCalendarLabel = input('Open calendar');
  readonly previousMonthLabel = input('Previous month');
  readonly nextMonthLabel = input('Next month');

  readonly blurred = output<void>();

  protected readonly inputId = `ds-date-picker-${nextId++}`;
  protected readonly helperId = `${this.inputId}-helper`;
  protected readonly messageId = `${this.inputId}-message`;

  readonly open = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly fieldRef =
    viewChild.required<ElementRef<HTMLInputElement>>('field');

  /**
   * The field's text. A `linkedSignal` rather than a computed, because it has two
   * writers: the model (which reformats it) and the person typing into it (who
   * must be allowed to leave it half-finished until they blur).
   */
  protected readonly text = linkedSignal<Date | null, string>({
    source: this.value,
    computation: (date) => (date ? this.formatDate()(date) : ''),
  });

  /**
   * Close on scroll, not the CDK's default reposition.
   *
   * Reposition keeps the panel glued to the field, which sounds right and looks
   * wrong: scroll the field off the top of the viewport and the calendar rides
   * up with it, clipped against the edge and floating over unrelated content.
   * A popover whose anchor has left the screen has nothing left to anchor to.
   */
  protected readonly scrollStrategy = inject(ScrollStrategyOptions).close();

  /** Below the field, flipping above when there is no room. */
  protected readonly positions = [
    {
      originX: 'start' as const,
      originY: 'bottom' as const,
      overlayX: 'start' as const,
      overlayY: 'top' as const,
    },
    {
      originX: 'start' as const,
      originY: 'top' as const,
      overlayX: 'start' as const,
      overlayY: 'bottom' as const,
    },
  ];

  protected readonly statusIcon = computed<IconName | null>(() => {
    if (this.invalid()) {
      return 'warning-filled';
    }

    return this.warn() ? 'warning-alt-filled' : null;
  });

  protected readonly message = computed(() => {
    if (this.invalid()) {
      return this.invalidText();
    }

    return this.warn() ? this.warnText() : '';
  });

  protected readonly describedBy = computed(() => {
    if (this.message()) {
      return this.messageId;
    }

    return this.helperText() ? this.helperId : null;
  });

  protected readonly hostClass = computed(() => {
    const classes = ['ds-date-picker', `ds-date-picker--${this.size()}`];

    if (this.invalid()) {
      classes.push('ds-date-picker--invalid');
    } else if (this.warn()) {
      classes.push('ds-date-picker--warn');
    }

    if (this.disabled()) {
      classes.push('ds-date-picker--disabled');
    }

    if (this.readOnly()) {
      classes.push('ds-date-picker--readonly');
    }

    return classes.join(' ');
  });

  protected toggle(): void {
    this.open.update((wasOpen) => !wasOpen);
  }

  /** Closes and brings focus back. For Escape and for picking a date. */
  protected close(): void {
    if (!this.open()) {
      return;
    }

    this.open.set(false);

    // The calendar is being destroyed, and focus inside a destroyed element
    // falls to <body> — which drops a keyboard user out of the form.
    this.fieldRef().nativeElement.focus();
  }

  /**
   * The CDK's outside-click listener is on the document, and the click that
   * opens the calendar is still travelling when the overlay attaches — so the
   * listener sees that very click as "outside" and closes what just opened. The
   * field, trigger button included, is not outside.
   *
   * No refocus here either: the person clicked somewhere else on purpose, and
   * yanking focus back into the field would fight them for it.
   */
  /**
   * Escape, handled here rather than by the CDK.
   *
   * `CdkConnectedOverlay` closes on Escape by default, but it does it by
   * detaching the overlay — which leaves focus wherever it was, and if that was
   * inside the calendar it is now inside a destroyed element, i.e. on `<body>`.
   * `disableClose` turns that off so this can close *and* put focus back.
   *
   * The keydown arrives through the CDK's document-level dispatcher, so it fires
   * whether focus is in the calendar or still on the trigger.
   */
  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected onOutsideClick(event: MouseEvent): void {
    if (this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.open.set(false);
  }

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
  }

  protected onBlur(): void {
    const raw = this.text().trim();

    if (!raw) {
      this.value.set(null);
    } else {
      const parsed = this.parseDate()(raw);

      if (parsed) {
        this.value.set(parsed);
        // Re-assert rather than leaving it to the linkedSignal: typing a date
        // that is already selected changes no signal, so nothing would
        // recompute and the field would keep whatever the person typed.
        this.text.set(this.formatDate()(parsed));
      }
      // Unparseable text is left exactly as typed. Deciding that is an error is
      // the form's job, same as every other control here — see `invalid`.
    }

    this.blurred.emit();
  }

  protected onPick(date: Date | undefined): void {
    this.value.set(date ?? null);
    this.close();
  }
}
