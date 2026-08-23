import {
  booleanAttribute,
  Component,
  computed,
  input,
  model,
  output,
  ViewEncapsulation,
} from '@angular/core';

let nextId = 0;

/** Carbon ships two: 48×24 and 32×16. */
export type ToggleSize = 'sm' | 'md';

/**
 * Carbon toggle switch.
 *
 * A `<button role="switch">` rather than a checkbox, which is Carbon's choice and
 * the right one: a switch takes effect immediately, a checkbox is a value you
 * submit later, and screen readers announce the two differently.
 *
 * `checked` is a `model()`, so this already satisfies `FormCheckboxControl` —
 * the same contract `Checkbox` meets, with no adapter. See ui/README.md.
 */
@Component({
  selector: 'nine-am-toggle',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './toggle.html',
  styleUrl: './toggle.scss',
  host: { '[class]': 'hostClass()' },
})
export class Toggle {
  /** Required. The accessible name, hidden visually with `hideLabel`. */
  readonly label = input.required<string>();

  readonly checked = model(false);
  readonly size = input<ToggleSize>('md');

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly hideLabel = input(false, { transform: booleanAttribute });

  /**
   * Focusable and announced, but not changeable. Unlike the radio group this
   * needs no click trickery — we own `checked`, so there is no browser state to
   * undo, and refusing the write is enough.
   */
  readonly readOnly = input(false, { transform: booleanAttribute });

  /** The state text beside the switch. Carbon shows it; `hideStateText` drops it. */
  readonly onLabel = input('On');
  readonly offLabel = input('Off');
  readonly hideStateText = input(false, { transform: booleanAttribute });

  /** Fires only on user interaction, unlike writes to the `checked` model. */
  readonly toggled = output<boolean>();

  protected readonly buttonId = `nine-am-toggle-${nextId++}`;
  protected readonly labelId = `${this.buttonId}-label`;

  protected readonly hostClass = computed(() => {
    const classes = ['nine-am-toggle', `nine-am-toggle--${this.size()}`];

    if (this.checked()) {
      classes.push('nine-am-toggle--checked');
    }

    if (this.disabled()) {
      classes.push('nine-am-toggle--disabled');
    }

    if (this.readOnly()) {
      classes.push('nine-am-toggle--readonly');
    }

    return classes.join(' ');
  });

  protected toggle(): void {
    if (this.readOnly()) {
      return;
    }

    const next = !this.checked();

    this.checked.set(next);
    this.toggled.emit(next);
  }
}
