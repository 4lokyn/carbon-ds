import {
  booleanAttribute,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  input,
  model,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';

let nextGroupId = 0;
let nextId = 0;

/** Carbon stacks checkboxes by default; a short set can run in a row. */
export type CheckboxOrientation = 'vertical' | 'horizontal';

/**
 * Lets a checkbox find its group without the group having to pass anything down.
 * Optional on purpose — a lone checkbox ("I accept the terms") is a valid use.
 */
export const DS_CHECKBOX_GROUP = new InjectionToken<CheckboxGroup>('DS_CHECKBOX_GROUP');

/**
 * Carbon checkbox group: a `<fieldset>` with a `<legend>`, one helper or
 * validation message, and any number of checkboxes inside.
 *
 * It is worth being clear about what this does *not* do, because the radio group
 * next door does it and the two look alike. A radio group owns the selected
 * value — the options are one control. Checkboxes are not: each one owns its own
 * `checked`, and the group owns only what they genuinely share, which is the
 * legend, the message, `disabled` and `readOnly`. Nothing here reads or writes a
 * child's value.
 *
 * The `<fieldset>` earns its place the same way it does for radios: `disabled`
 * on it disables every control inside, and the `<legend>` names the set to a
 * screen reader. Neither works on a div.
 */
@Component({
  selector: 'ds-checkbox-group',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  templateUrl: './checkbox-group.html',
  styleUrl: './checkbox.scss',
  host: { '[class]': 'hostClass()' },
  providers: [{ provide: DS_CHECKBOX_GROUP, useExisting: CheckboxGroup }],
})
export class CheckboxGroup {
  /** Names the set. Rendered as the `<legend>`, hidden with `hideLegend`. */
  readonly legend = input.required<string>();

  readonly orientation = input<CheckboxOrientation>('vertical');
  readonly helperText = input('');

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly hideLegend = input(false, { transform: booleanAttribute });

  /**
   * Like the radio group's: the inputs stay enabled so the set can still be read
   * and tabbed through, and each checkbox refuses the change instead. `disabled`
   * would drop the whole set out of the tab order.
   */
  readonly readOnly = input(false, { transform: booleanAttribute });

  readonly invalid = input(false, { transform: booleanAttribute });
  readonly invalidText = input('');
  readonly warn = input(false, { transform: booleanAttribute });
  readonly warnText = input('');

  private readonly groupId = `ds-checkbox-group-${nextGroupId++}`;

  protected readonly helperId = `${this.groupId}-helper`;
  protected readonly messageId = `${this.groupId}-message`;

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

  /** Every checkbox in the set points at this, so all of them share one description. */
  readonly describedBy = computed(() => {
    if (this.message()) {
      return this.messageId;
    }

    return this.helperText() ? this.helperId : null;
  });

  protected readonly hostClass = computed(() => {
    const classes = ['ds-checkbox-group', `ds-checkbox-group--${this.orientation()}`];

    if (this.invalid()) {
      classes.push('ds-checkbox-group--invalid');
    } else if (this.warn()) {
      classes.push('ds-checkbox-group--warn');
    }

    if (this.disabled()) {
      classes.push('ds-checkbox-group--disabled');
    }

    if (this.readOnly()) {
      classes.push('ds-checkbox-group--readonly');
    }

    return classes.join(' ');
  });
}

/**
 * Carbon checkbox on a native `<input type="checkbox">`.
 *
 * `indeterminate` is why this is a component rather than raw markup: it is a DOM
 * *property*, not an attribute, so a template binding on the input cannot set it.
 * A table's select-all needs it.
 *
 * Works alone or inside a `ds-checkbox-group`. Inside one it stays quiet: the
 * group's message is the set's message, so a checkbox does not render a second
 * copy of it — twelve options in an invalid group would otherwise print the same
 * error twelve times. Its own `invalid` / `warn` are for the standalone case.
 */
@Component({
  selector: 'ds-checkbox',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
  host: { '[class]': 'hostClass()' },
})
export class Checkbox {
  /**
   * Required even when hidden. A checkbox with no accessible name is unusable
   * with a screen reader, and a table column of them is the worst case of it.
   */
  readonly label = input.required<string>();

  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Neither checked nor unchecked — a select-all with only some rows selected.
   * `checked` wins visually if both are set, mirroring the browser, which ignores
   * indeterminate on a checked box.
   */
  readonly indeterminate = input(false, { transform: booleanAttribute });

  /** Keeps the label for screen readers but drops it visually. */
  readonly hideLabel = input(false, { transform: booleanAttribute });

  /**
   * Focusable and announced, but not changeable.
   *
   * Unlike the toggle — which owns its state, so refusing the write is enough —
   * a native checkbox flips itself before `change` fires. The DOM property has to
   * be put back, or the box shows a tick the model does not have.
   */
  readonly readOnly = input(false, { transform: booleanAttribute });

  /** Standalone only. Inside a group, the group carries these. */
  readonly helperText = input('');
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly invalidText = input('');
  readonly warn = input(false, { transform: booleanAttribute });
  readonly warnText = input('');

  /** Fires only on user interaction, unlike writes to the `checked` model. */
  readonly toggled = output<boolean>();

  protected readonly inputId = `ds-checkbox-${nextId++}`;
  protected readonly helperId = `${this.inputId}-helper`;
  protected readonly messageId = `${this.inputId}-message`;

  protected readonly group = inject(DS_CHECKBOX_GROUP, { optional: true });

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** The group's read-only applies to every box in it. */
  protected readonly isReadOnly = computed(
    () => this.readOnly() || (this.group?.readOnly() ?? false),
  );

  protected readonly statusIcon = computed<IconName | null>(() => {
    if (this.group) {
      return null;
    }

    if (this.invalid()) {
      return 'warning-filled';
    }

    return this.warn() ? 'warning-alt-filled' : null;
  });

  protected readonly message = computed(() => {
    if (this.group) {
      return '';
    }

    if (this.invalid()) {
      return this.invalidText();
    }

    return this.warn() ? this.warnText() : '';
  });

  protected readonly describedBy = computed(() => {
    // Inside a group the description is the group's, and it is the same node for
    // every box — which is what makes twelve checkboxes announce one message.
    if (this.group) {
      return this.group.describedBy();
    }

    if (this.message()) {
      return this.messageId;
    }

    return this.helperText() ? this.helperId : null;
  });

  protected readonly hostClass = computed(() => {
    const classes = ['ds-checkbox'];

    if (this.hideLabel()) {
      classes.push('ds-checkbox--hide-label');
    }

    if (!this.group) {
      if (this.invalid()) {
        classes.push('ds-checkbox--invalid');
      } else if (this.warn()) {
        classes.push('ds-checkbox--warn');
      }
    }

    if (this.isReadOnly()) {
      classes.push('ds-checkbox--readonly');
    }

    return classes.join(' ');
  });

  constructor() {
    // The only route to the property. In an effect so it re-applies whenever the
    // signal changes, not just on first render.
    effect(() => {
      this.inputRef().nativeElement.indeterminate = this.indeterminate();
    });
  }

  protected onChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (this.isReadOnly()) {
      input.checked = this.checked();
      return;
    }

    this.checked.set(input.checked);
    this.toggled.emit(input.checked);
  }
}

export const DS_CHECKBOX = [Checkbox, CheckboxGroup] as const;
