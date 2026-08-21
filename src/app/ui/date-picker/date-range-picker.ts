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
import { NgpDateRangePicker } from 'ng-primitives/date-picker';
import { NgpNativeDateAdapter, provideDateAdapter } from 'ng-primitives/date-time';
import { DatePickerPanel } from './date-picker-panel';
import { ISO_FORMAT, ISO_PARSE } from './date-picker';
import type { DateFormatter } from './date-picker-panel';
import type { DateParser, FirstDayOfWeek } from './date-picker';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';
import type { FieldSize } from '../field/field-types';

let nextId = 0;

/**
 * Splits a typed range back into its two halves.
 *
 * Every alternative demands whitespace around it. That is the whole trick: an
 * ISO date is full of hyphens, and `2026-08-13-2026-08-15` has no unambiguous
 * split point, while `2026-08-13 - 2026-08-15` does.
 */
const RANGE_SPLIT = /\s+(?:[–—-]|to)\s+/i;

/**
 * Range date picker: one field holding both ends, one calendar.
 *
 * Carbon renders a range as two separate fields. This is one, by request, and
 * the trade is real: a single field has to read its own separator back, so
 * `rangeSeparator` is part of the format/parse contract rather than decoration.
 * The parse side accepts an en dash, an em dash, a spaced hyphen or the word
 * "to"; all of them require surrounding whitespace, which is what keeps them
 * from colliding with the hyphens inside an ISO date.
 *
 * The panel is the same component the single picker uses. That works because
 * ng-primitives' grid directives resolve their state through a fallback, so the
 * markup does not care which of the two picker directives is above it.
 */
@Component({
  selector: 'ds-date-range-picker',
  encapsulation: ViewEncapsulation.None,
  imports: [
    Icon,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    NgpDateRangePicker,
    DatePickerPanel,
  ],
  templateUrl: './date-range-picker.html',
  styleUrl: './date-picker.scss',
  providers: [provideDateAdapter(NgpNativeDateAdapter)],
  host: { '[class]': 'hostClass()' },
})
export class DateRangePicker {
  readonly label = input.required<string>();

  /** Sits between the two dates in the field, and is read back by the parser. */
  readonly rangeSeparator = input(' – ');

  readonly start = model<Date | null>(null);
  readonly end = model<Date | null>(null);

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
  readonly firstDayOfWeek = input<FirstDayOfWeek>(1);

  /** Override both together — see the note on `DatePicker`. */
  readonly formatDate = input<DateFormatter>(ISO_FORMAT);
  readonly parseDate = input<DateParser>(ISO_PARSE);

  readonly openCalendarLabel = input('Open calendar');
  readonly previousMonthLabel = input('Previous month');
  readonly nextMonthLabel = input('Next month');

  readonly blurred = output<void>();

  protected readonly inputId = `ds-date-range-picker-${nextId++}`;
  protected readonly helperId = `${this.inputId}-helper`;
  protected readonly messageId = `${this.inputId}-message`;

  readonly open = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly fieldRef =
    viewChild.required<ElementRef<HTMLInputElement>>('field');

  // One source for the linked signal, so the text recomputes when either end
  // moves. A fresh object each time is deliberate — it is what makes the
  // linkedSignal treat "same dates, re-set" as a reason to reformat.
  private readonly range = computed(() => ({
    start: this.start(),
    end: this.end(),
  }));

  /**
   * The field's text. Two writers, like the single picker: the models reformat
   * it, and the person typing gets to leave it half-finished until blur.
   *
   * A lone start renders on its own rather than as `2026-08-13 – `. Mid-range
   * the trailing separator reads as a rendering bug, and the calendar is open
   * at that moment anyway.
   */
  protected readonly text = linkedSignal<
    { start: Date | null; end: Date | null },
    string
  >({
    source: this.range,
    computation: ({ start, end }) => {
      if (!start) {
        return '';
      }

      const from = this.formatDate()(start);

      return end ? `${from}${this.rangeSeparator()}${this.formatDate()(end)}` : from;
    },
  });

  protected readonly scrollStrategy = inject(ScrollStrategyOptions).close();

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
    const classes = [
      'ds-date-range-picker',
      `ds-date-picker--${this.size()}`,
    ];

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

  protected close(): void {
    if (!this.open()) {
      return;
    }

    this.open.set(false);
    this.fieldRef().nativeElement.focus();
  }

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
      this.start.set(null);
      this.end.set(null);
      this.blurred.emit();

      return;
    }

    const [from, to] = raw.split(RANGE_SPLIT);
    const start = this.parseDate()(from ?? '');
    const end = to === undefined ? null : this.parseDate()(to);

    // All or nothing. Committing a half-read range would leave the field
    // showing two dates while the model held one, which is worse than leaving
    // the text alone for the form to reject.
    if (start && (to === undefined || end)) {
      this.start.set(start);
      this.end.set(end);
      this.text.set(
        end
          ? `${this.formatDate()(start)}${this.rangeSeparator()}${this.formatDate()(end)}`
          : this.formatDate()(start),
      );
    }

    this.blurred.emit();
  }

  /**
   * Closing on the *end* date only, not on the start.
   *
   * Picking a range takes two clicks, and the primitive reports them as two
   * separate outputs. Closing on the first would make the second impossible.
   */
  protected onEndPicked(date: Date | undefined): void {
    this.end.set(date ?? null);

    if (date) {
      this.close();
    }
  }
}
