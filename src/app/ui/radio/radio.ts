import {
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';

let nextGroupId = 0;
let nextRadioId = 0;

export type RadioOrientation = 'horizontal' | 'vertical';

/**
 * Carbon radio group, on native `<input type="radio">` inside a `<fieldset>`.
 *
 * Almost all of the behavior here is the browser's, and that is the point. Give
 * radios a shared `name` and you get single selection, arrow-key navigation,
 * roving tab order (the group is one tab stop, not one per option) and form
 * submission — none of which we implement. `@angular/aria` has no radio
 * primitive and does not need one.
 *
 * The `<fieldset>` is load-bearing too: `disabled` on it disables every control
 * inside, and the `<legend>` is what names the group to a screen reader. Both are
 * free, and neither works if you swap the fieldset for a div.
 */
@Component({
  selector: 'ds-radio-group',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './radio.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    <fieldset class="ds-radio-group__fieldset" [disabled]="disabled()">
      <!-- Must be the fieldset's first child to name the group. -->
      <legend
        class="ds-radio-group__legend"
        [class.ds-visually-hidden]="hideLegend()"
      >
        {{ legend() }}
      </legend>

      <div class="ds-radio-group__items">
        <ng-content />
      </div>
    </fieldset>

    @if (message(); as text) {
      <div class="ds-radio-group__requirement" [id]="messageId">
        @if (statusIcon(); as icon) {
          <ds-icon class="ds-radio-group__status" [name]="icon" />
        }
        <span>{{ text }}</span>
      </div>
    } @else if (helperText()) {
      <div class="ds-radio-group__helper" [id]="helperId">
        {{ helperText() }}
      </div>
    }
  `,
})
export class RadioGroup {
  /** Names the group. Rendered as the `<legend>`, hidden with `hideLegend`. */
  readonly legend = input.required<string>();

  readonly value = model('');
  readonly orientation = input<RadioOrientation>('horizontal');
  readonly helperText = input('');

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly hideLegend = input(false, { transform: booleanAttribute });

  /**
   * Read-only has no native equivalent for a radio, and `disabled` is the wrong
   * substitute here — unlike a select, disabling every radio would drop the whole
   * group out of the tab order, so a keyboard user could not even read the
   * choice. The inputs stay enabled and the group refuses the change instead.
   */
  readonly readOnly = input(false, { transform: booleanAttribute });

  readonly invalid = input(false, { transform: booleanAttribute });
  readonly invalidText = input('');
  readonly warn = input(false, { transform: booleanAttribute });
  readonly warnText = input('');

  /** Fires only on user interaction, unlike writes to the `value` model. */
  readonly selected = output<string>();

  /** Shared by every radio in the group — this is what makes it a group. */
  readonly name = `ds-radio-group-${nextGroupId++}`;

  protected readonly helperId = `${this.name}-helper`;
  protected readonly messageId = `${this.name}-message`;

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

  /** Every radio points at this, so all of them share one description. */
  readonly describedBy = computed(() => {
    if (this.message()) {
      return this.messageId;
    }

    return this.helperText() ? this.helperId : null;
  });

  protected readonly hostClass = computed(() => {
    const classes = ['ds-radio-group', `ds-radio-group--${this.orientation()}`];

    if (this.invalid()) {
      classes.push('ds-radio-group--invalid');
    } else if (this.warn()) {
      classes.push('ds-radio-group--warn');
    }

    if (this.disabled()) {
      classes.push('ds-radio-group--disabled');
    }

    if (this.readOnly()) {
      classes.push('ds-radio-group--readonly');
    }

    return classes.join(' ');
  });

  /** Called by the children. Read-only swallows it rather than blocking focus. */
  select(next: string): void {
    if (this.readOnly()) {
      return;
    }

    this.value.set(next);
    this.selected.emit(next);
  }
}

/**
 * One option. Has to be inside a `ds-radio-group` — the group owns the `name`,
 * the selected value and the validation state, and there is nothing sensible a
 * lone radio could do with any of them.
 */
@Component({
  selector: 'ds-radio',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ds-radio' },
  template: `
    <input
      class="ds-radio__input"
      type="radio"
      [id]="inputId"
      [name]="group.name"
      [value]="value()"
      [checked]="group.value() === value()"
      [disabled]="disabled()"
      [attr.aria-describedby]="group.describedBy()"
      (click)="onClick($event)"
      (change)="onChange()"
    />

    <label class="ds-radio__label" [for]="inputId">
      <span class="ds-radio__appearance"></span>
      <span class="ds-radio__label-text">{{ label() }}</span>
    </label>
  `,
})
export class Radio {
  readonly label = input.required<string>();
  readonly value = input.required<string>();

  /** Disables this option alone. The group's own `disabled` covers all of them. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly group = inject(RadioGroup);
  protected readonly inputId = `ds-radio-${nextRadioId++}`;

  /**
   * Read-only has to be stopped here, on the click, and not in `change`.
   *
   * By the time `change` fires the browser has already checked this radio *and*
   * unchecked the previous one, and a single input cannot undo that — setting
   * `checked = false` here would leave the group with nothing selected. Nor does
   * the model help: the value never moved, so no signal changes and Angular has
   * no reason to re-render the old selection back.
   *
   * `preventDefault` on the click cancels the activation before any of it
   * happens. Arrow-key selection dispatches a click too, so this covers the
   * keyboard as well as the mouse.
   */
  protected onClick(event: Event): void {
    if (this.group.readOnly()) {
      event.preventDefault();
    }
  }

  protected onChange(): void {
    this.group.select(this.value());
  }
}

/** Import this instead of the two classes one by one. */
export const DS_RADIO_GROUP = [RadioGroup, Radio] as const;
