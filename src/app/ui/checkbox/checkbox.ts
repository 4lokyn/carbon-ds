import {
  booleanAttribute,
  Component,
  effect,
  ElementRef,
  input,
  model,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

let nextId = 0;

/**
 * Carbon checkbox on a native `<input type="checkbox">`.
 *
 * `indeterminate` is why this is a component rather than raw markup: it is a DOM
 * *property*, not an attribute, so a template binding on the input cannot set it.
 * A table's select-all needs it.
 */
@Component({
  selector: 'ds-checkbox',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './checkbox.scss',
  host: {
    class: 'ds-checkbox',
    '[class.ds-checkbox--hide-label]': 'hideLabel()',
  },
  template: `
    <input
      #input
      class="ds-checkbox__input"
      type="checkbox"
      [id]="inputId"
      [checked]="checked()"
      [disabled]="disabled()"
      (change)="onChange($event)"
    />

    <label class="ds-checkbox__label" [for]="inputId">
      <!-- Hidden visually but still in the a11y tree, so it remains the
           accessible name. No aria-label needed — that would only shadow it. -->
      <span class="ds-checkbox__text" [class.ds-visually-hidden]="hideLabel()">
        {{ label() }}
      </span>
    </label>
  `,
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

  /** Fires only on user interaction, unlike writes to the `checked` model. */
  readonly toggled = output<boolean>();

  protected readonly inputId = `ds-checkbox-${nextId++}`;

  private readonly inputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('input');

  constructor() {
    // The only route to the property. In an effect so it re-applies whenever the
    // signal changes, not just on first render.
    effect(() => {
      this.inputRef().nativeElement.indeterminate = this.indeterminate();
    });
  }

  protected onChange(event: Event): void {
    const next = (event.target as HTMLInputElement).checked;
    this.checked.set(next);
    this.toggled.emit(next);
  }
}
