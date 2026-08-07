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
  selector: 'ds-toggle',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './toggle.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    <!-- Visually hidden, not absent: it owns the semantics, the tab stop and the
         focus that the switch below is styled against. The <label> forwards
         clicks to it, because a <button> is a labelable element. -->
    <button
      class="ds-toggle__button"
      type="button"
      role="switch"
      [id]="buttonId"
      [attr.aria-checked]="checked()"
      [attr.aria-labelledby]="labelId"
      [attr.aria-readonly]="readOnly() ? 'true' : null"
      [disabled]="disabled()"
      (click)="toggle()"
    ></button>

    <label class="ds-toggle__label" [for]="buttonId">
      <!-- The accessible name comes from this span alone, via aria-labelledby.
           Letting the whole label name the button would fold the "On" / "Off"
           text into it, and role="switch" already announces that state. -->
      <span
        class="ds-toggle__label-text"
        [id]="labelId"
        [class.ds-visually-hidden]="hideLabel()"
      >
        {{ label() }}
      </span>

      <span class="ds-toggle__appearance">
        <span class="ds-toggle__switch">
          <!-- Only on the small size. The check is positioned for a 16px switch,
               and on the 24px one the knob is large enough to read on its own —
               which is why Carbon draws it in exactly one of the two. -->
          @if (size() === 'sm') {
            <svg
              class="ds-toggle__check"
              width="6"
              height="5"
              viewBox="0 0 6 5"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M2.2 2.7L5 0 6 1 2.2 5 0 2.7 1 1.7z" fill="currentColor" />
            </svg>
          }
        </span>

        @if (!hideStateText()) {
          <span class="ds-toggle__text">
            {{ checked() ? onLabel() : offLabel() }}
          </span>
        }
      </span>
    </label>
  `,
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

  protected readonly buttonId = `ds-toggle-${nextId++}`;
  protected readonly labelId = `${this.buttonId}-label`;

  protected readonly hostClass = computed(() => {
    const classes = ['ds-toggle', `ds-toggle--${this.size()}`];

    if (this.checked()) {
      classes.push('ds-toggle--checked');
    }

    if (this.disabled()) {
      classes.push('ds-toggle--disabled');
    }

    if (this.readOnly()) {
      classes.push('ds-toggle--readonly');
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
