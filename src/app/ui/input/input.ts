import {
  booleanAttribute,
  Component,
  computed,
  input,
  model,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';
import type { FieldSize } from '../field/field-types';

let nextId = 0;

/**
 * `search` is absent on purpose — that is `ds-search`, which brings a magnifier
 * and a clear button with it.
 */
export type InputType =
  | 'email'
  | 'number'
  | 'password'
  | 'tel'
  | 'text'
  | 'url';

/**
 * Carbon text input. Every state after this one — text-area, select — copies its
 * shape, so the machinery lives here and the rest reuses it through
 * `src/styles/_field.scss`.
 *
 * `number` is a type passthrough, not a Carbon NumberInput: `value` stays a
 * string, because `HTMLInputElement.value` is a string and a control that
 * silently parsed would have to invent an answer for `""` and for `"1e"`. The
 * caller parses. Carbon's NumberInput — the one with the steppers — is a
 * separate component and is not this.
 */
@Component({
  selector: 'ds-input',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './input.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    <!-- In the fluid variant this same element is absolutely positioned inside
         the field box. Same DOM, different CSS — a second template would be two
         places to fix every label bug. -->
    <label
      class="ds-input__label"
      [class.ds-visually-hidden]="hideLabel()"
      [for]="inputId"
    >
      {{ label() }}
    </label>

    <div class="ds-input__field-wrapper">
      <input
        class="ds-input__field"
        [id]="inputId"
        [type]="effectiveType()"
        [value]="value()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [readOnly]="readOnly()"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [attr.aria-describedby]="describedBy()"
        (input)="onInput($event)"
        (blur)="blurred.emit()"
      />

      @if (statusIcon(); as icon) {
        <ds-icon class="ds-input__status" [name]="icon" />
      }

      @if (isPassword()) {
        <button
          type="button"
          class="ds-input__reveal"
          [disabled]="disabled()"
          [attr.aria-label]="revealed() ? hidePasswordLabel() : showPasswordLabel()"
          [attr.aria-pressed]="revealed()"
          (click)="toggleReveal()"
        >
          <ds-icon [name]="revealed() ? 'view-off' : 'view'" />
        </button>
      }

      <!-- Fluid only. The field has no bottom border in that variant, so without
           this the message would sit flush against the value with nothing
           separating them. -->
      @if (fluid() && message()) {
        <div class="ds-input__divider"></div>
      }
    </div>

    <!-- One slot, not two. Carbon replaces the helper text with the requirement
         rather than stacking them: stacking moves every field below this one the
         instant it goes invalid. -->
    @if (message(); as text) {
      <div class="ds-input__requirement" [id]="messageId">{{ text }}</div>
    } @else if (helperText()) {
      <div class="ds-input__helper" [id]="helperId">{{ helperText() }}</div>
    }
  `,
})
export class Input {
  /** Required. Hide it with `hideLabel` if the layout supplies the name instead. */
  readonly label = input.required<string>();

  readonly value = model('');
  readonly type = input<InputType>('text');
  readonly size = input<FieldSize>('md');
  readonly placeholder = input('');
  readonly helperText = input('');

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly hideLabel = input(false, { transform: booleanAttribute });

  /**
   * Carbon specifies what invalid looks like; *when* it turns on is the caller's,
   * and the answer for this codebase is written down in the root README — on
   * blur, and on submit for fields nobody touched, and it clears the moment the
   * value becomes valid again. That is policy, and policy does not belong in a
   * control that cannot see the form. `blurred` is the hook for it.
   */
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly invalidText = input('');

  /** Lower than invalid: the value is usable, but the user should look at it. */
  readonly warn = input(false, { transform: booleanAttribute });
  readonly warnText = input('');

  /** Carbon's fluid field: the label sits inside a 64px box. */
  readonly fluid = input(false, { transform: booleanAttribute });

  readonly showPasswordLabel = input('Show password');
  readonly hidePasswordLabel = input('Hide password');

  /** Fires on every blur. The validation policy hangs off this. */
  readonly blurred = output<void>();

  protected readonly inputId = `ds-input-${nextId++}`;
  protected readonly helperId = `${this.inputId}-helper`;
  protected readonly messageId = `${this.inputId}-message`;

  protected readonly revealed = signal(false);

  protected readonly isPassword = computed(() => this.type() === 'password');

  protected readonly effectiveType = computed(() =>
    this.isPassword() && this.revealed() ? 'text' : this.type(),
  );

  /** Invalid outranks warn — a field cannot be both, and the error is the one
   *  that blocks the user. Carbon resolves it the same way. */
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

  // Points at whichever line is actually rendered, so a screen reader reads the
  // error when there is one and the helper text otherwise — never a stale id.
  protected readonly describedBy = computed(() => {
    if (this.message()) {
      return this.messageId;
    }

    return this.helperText() ? this.helperId : null;
  });

  protected readonly hostClass = computed(() => {
    const classes = ['ds-input', `ds-input--${this.size()}`];

    if (this.fluid()) {
      classes.push('ds-input--fluid');
    }

    if (this.invalid()) {
      classes.push('ds-input--invalid');
    } else if (this.warn()) {
      classes.push('ds-input--warn');
    }

    if (this.isPassword()) {
      classes.push('ds-input--password');
    }

    if (this.disabled()) {
      classes.push('ds-input--disabled');
    }

    if (this.readOnly()) {
      classes.push('ds-input--readonly');
    }

    return classes.join(' ');
  });

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected toggleReveal(): void {
    this.revealed.update((shown) => !shown);
  }
}
