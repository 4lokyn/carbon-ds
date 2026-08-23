import { booleanAttribute, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';

/**
 * Where the process has got to. `active` while it runs, and then one of the two
 * endings — which is what makes the bar worth watching to the end.
 */
export type ProgressStatus = 'active' | 'finished' | 'error';

/** Carbon's two track heights: 8px and 4px. */
export type ProgressSize = 'big' | 'small';

/**
 * `inline` puts the label beside the track instead of above it and hides the
 * helper text; `indented` keeps the stacked layout but insets the text to line
 * up with a form beside it.
 */
export type ProgressType = 'default' | 'inline' | 'indented';

let nextId = 0;

/**
 * Carbon's progress bar: how far along something is, and how much longer.
 *
 * **Leave `value` unset for an indeterminate bar.** That is the whole switch,
 * and it is the honest one: a bar that reports a percentage it cannot know is
 * worse than a bar that admits it is still working. Set it the moment the
 * process can say.
 *
 * Not a spinner. Carbon's guidance is that a progress bar is for something with
 * a duration a user is waiting through — a download, an install, a transfer.
 * For "the page is doing something", that is `Loading`.
 */
@Component({
  selector: 'nine-am-progress-bar',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './progress-bar.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    <div class="nine-am-progress-bar__label" [class.nine-am-visually-hidden]="hideLabel()">
      <span class="nine-am-progress-bar__label-text" [id]="labelId">{{ label() }}</span>

      @if (statusIcon(); as icon) {
        <nine-am-icon class="nine-am-progress-bar__status-icon" [name]="icon" [size]="16" />
      }
    </div>

    <div
      class="nine-am-progress-bar__track"
      role="progressbar"
      [attr.aria-labelledby]="labelId"
      [attr.aria-describedby]="helperText() ? helperId : null"
      [attr.aria-valuemin]="indeterminate() ? null : 0"
      [attr.aria-valuemax]="indeterminate() ? null : max()"
      [attr.aria-valuenow]="indeterminate() ? null : clamped()"
    >
      <div class="nine-am-progress-bar__bar" [style.transform]="'scaleX(' + fraction() + ')'"></div>
    </div>

    @if (helperText()) {
      <!--
        Announced, and politely. The bar itself carries the number; this is
        where "3 of 12 files" or "Upload failed" lives, and a change to it is
        the only part of the component a screen reader would otherwise miss.
      -->
      <div class="nine-am-progress-bar__helper-text" [id]="helperId" aria-live="polite">
        {{ helperText() }}
      </div>
    }
  `,
})
export class ProgressBar {
  /** Names the process. Required — a bar with no label is a moving rectangle. */
  readonly label = input.required<string>();

  /** Keeps the label for a screen reader and takes it off the screen. */
  readonly hideLabel = input(false, { transform: booleanAttribute });

  /** The detail under the bar: counts, sizes, the reason it failed. */
  readonly helperText = input('');

  /**
   * How far along. **Leave it unset and the bar is indeterminate** — Carbon's
   * own switch, and `null` counts as unset for the same reason: a value that
   * has not arrived yet is not zero.
   */
  readonly value = input<number | null>(null);

  readonly max = input(100);

  readonly status = input<ProgressStatus>('active');

  readonly size = input<ProgressSize>('big');

  readonly type = input<ProgressType>('default');

  protected readonly labelId = `nine-am-progress-bar-label-${nextId}`;
  protected readonly helperId = `nine-am-progress-bar-helper-${nextId++}`;

  /** No value and still running. A finished or failed bar is never indeterminate. */
  protected readonly indeterminate = computed(
    () => this.value() === null && this.status() === 'active',
  );

  protected readonly clamped = computed(() => {
    const value = this.value();

    if (value === null) {
      return 0;
    }

    return Math.min(Math.max(value, 0), this.max());
  });

  /**
   * The bar is drawn with `scaleX` rather than a width, which is what lets it
   * animate on the compositor instead of relaying out the track on every tick.
   * A finished or failed bar is full regardless of the number: the ending is
   * what it is reporting, not the arithmetic.
   */
  protected readonly fraction = computed(() => {
    if (this.status() !== 'active') {
      return 1;
    }

    const max = this.max();

    return max > 0 ? this.clamped() / max : 0;
  });

  protected readonly statusIcon = computed<IconName | null>(() => {
    if (this.status() === 'finished') {
      return 'checkmark-filled';
    }

    return this.status() === 'error' ? 'error-filled' : null;
  });

  protected readonly hostClass = computed(() => {
    const classes = [
      'nine-am-progress-bar',
      `nine-am-progress-bar--${this.size()}`,
      `nine-am-progress-bar--${this.type()}`,
    ];

    if (this.status() !== 'active') {
      classes.push(`nine-am-progress-bar--${this.status()}`);
    }

    if (this.indeterminate()) {
      classes.push('nine-am-progress-bar--indeterminate');
    }

    return classes.join(' ');
  });
}
