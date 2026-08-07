import {
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  ViewEncapsulation,
} from '@angular/core';
import {
  injectDatePickerState,
  injectDateRangePickerState,
  NgpDatePickerCell,
  NgpDatePickerCellRender,
  NgpDatePickerDateButton,
  NgpDatePickerGrid,
  NgpDatePickerLabel,
  NgpDatePickerNextMonth,
  NgpDatePickerPreviousMonth,
  NgpDatePickerRowRender,
} from 'ng-primitives/date-picker';
import { Icon } from '../icon/icon';

/** Renders a date as text. See `DatePicker` for the format/parse pairing rule. */
export type DateFormatter = (date: Date) => string;

/**
 * The month header and day grid, shared by the single and range pickers.
 *
 * It works for both because ng-primitives' grid directives resolve their state
 * through a fallback — single picker first, range picker second — so the same
 * markup drives either one depending on which directive is on the ancestor. This
 * component does the same lookup for the month label, since that text is ours
 * rather than the primitive's.
 *
 * Internal. It has no meaning outside a `ngpDatePicker` / `ngpDateRangePicker`
 * ancestor and would throw without one.
 */
@Component({
  selector: 'ds-date-picker-panel',
  encapsulation: ViewEncapsulation.None,
  imports: [
    Icon,
    NgpDatePickerLabel,
    NgpDatePickerPreviousMonth,
    NgpDatePickerNextMonth,
    NgpDatePickerGrid,
    NgpDatePickerRowRender,
    NgpDatePickerCellRender,
    NgpDatePickerCell,
    NgpDatePickerDateButton,
  ],
  host: { class: 'ds-date-picker__panel' },
  template: `
    <div class="ds-date-picker__header">
      <button
        type="button"
        class="ds-date-picker__nav"
        ngpDatePickerPreviousMonth
        [attr.aria-label]="previousMonthLabel()"
      >
        <ds-icon name="chevron-left" />
      </button>

      <!-- The primitive supplies only the id and aria-live here; the text is
           ours, which is the whole reason this component needs the state. -->
      <span class="ds-date-picker__month" ngpDatePickerLabel>
        {{ monthLabel() }}
      </span>

      <button
        type="button"
        class="ds-date-picker__nav"
        ngpDatePickerNextMonth
        [attr.aria-label]="nextMonthLabel()"
      >
        <ds-icon name="chevron-right" />
      </button>
    </div>

    <table class="ds-date-picker__grid" ngpDatePickerGrid>
      <thead>
        <tr>
          @for (day of weekdays(); track day.long) {
            <!-- One letter to fit the 40px column, the full name in the abbr
                 attribute so a screen reader still says "Wednesday". -->
            <th class="ds-date-picker__weekday" scope="col" [attr.abbr]="day.long">
              {{ day.narrow }}
            </th>
          }
        </tr>
      </thead>

      <tbody>
        <tr *ngpDatePickerRowRender>
          <td *ngpDatePickerCellRender="let date" ngpDatePickerCell>
            <button type="button" class="ds-date-picker__day" ngpDatePickerDateButton>
              {{ date.getDate() }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  `,
})
export class DatePickerPanel {
  readonly previousMonthLabel = input('Previous month');
  readonly nextMonthLabel = input('Next month');

  /**
   * Overrides the month heading. Null means the locale's own "August 2026".
   *
   * Null rather than a default lambda on purpose: an `input()` default is
   * evaluated as a field initializer but *called* later, so a lambda reaching
   * for `inject()` throws NG0203 the first time the heading renders — and
   * because that happens inside a computed during template evaluation, it takes
   * the whole calendar down with it rather than just the heading.
   */
  readonly formatMonth = input<DateFormatter | null>(null);

  private readonly locale = inject(LOCALE_ID);

  // The same fallback the primitive's own grid directives use: whichever of the
  // two picker directives is on the ancestor wins.
  private readonly single = injectDatePickerState<Date>({ optional: true });
  private readonly range = injectDateRangePickerState<Date>({ optional: true });

  private readonly controller = computed(() => this.single() ?? this.range());

  // Built once. Constructing an Intl.DateTimeFormat is expensive enough to show
  // up when someone holds down PageDown.
  private readonly monthFormat = new Intl.DateTimeFormat(this.locale, {
    month: 'long',
    year: 'numeric',
  });

  private readonly narrowDay = new Intl.DateTimeFormat(this.locale, {
    weekday: 'narrow',
  });

  private readonly longDay = new Intl.DateTimeFormat(this.locale, {
    weekday: 'long',
  });

  protected readonly monthLabel = computed(() => {
    const date = this.controller()?.focusedDate();

    if (!date) {
      return '';
    }

    const custom = this.formatMonth();

    return custom ? custom(date) : this.monthFormat.format(date);
  });

  /**
   * Built from a real week rather than a hardcoded list, so it follows both the
   * locale and `firstDayOfWeek`. 2024-01-01 is a Monday, which is what makes the
   * offset arithmetic readable.
   */
  protected readonly weekdays = computed(() => {
    const first = this.controller()?.firstDayOfWeek() ?? 1;

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(2024, 0, 1 + ((first - 1 + index) % 7));

      return {
        narrow: this.narrowDay.format(day),
        long: this.longDay.format(day),
      };
    });
  });
}
