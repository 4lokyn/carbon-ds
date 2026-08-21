import {
  booleanAttribute,
  Component,
  computed,
  input,
  model,
  numberAttribute,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';

let nextId = 0;

/**
 * Carbon textarea.
 *
 * Two things differ from `ds-input` and both come from Carbon rather than from
 * preference. There is no size scale — a textarea is sized by `rows`, and Carbon
 * ships no 32/40/48 variants for it. And the type style is `body-01` rather than
 * `body-compact-01`: compact line height is for a single line, and stacks badly
 * once text wraps.
 */
@Component({
  selector: 'ds-textarea',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  templateUrl: './textarea.html',
  styleUrl: './textarea.scss',
  host: { '[class]': 'hostClass()' },
})
export class Textarea {
  readonly label = input.required<string>();
  readonly value = model('');
  readonly placeholder = input('');
  readonly helperText = input('');

  /** Carbon's default. The field is resizable vertically from here. */
  readonly rows = input(4, { transform: numberAttribute });

  /** Sets the native `maxlength`, and is the denominator for the counter. */
  readonly maxLength = input<number | undefined>(undefined);

  /** Needs `maxLength` to have anything to count against. */
  readonly showCounter = input(false, { transform: booleanAttribute });

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly hideLabel = input(false, { transform: booleanAttribute });

  readonly invalid = input(false, { transform: booleanAttribute });
  readonly invalidText = input('');
  readonly warn = input(false, { transform: booleanAttribute });
  readonly warnText = input('');

  readonly fluid = input(false, { transform: booleanAttribute });

  readonly blurred = output<void>();

  protected readonly textareaId = `ds-textarea-${nextId++}`;
  protected readonly helperId = `${this.textareaId}-helper`;
  protected readonly messageId = `${this.textareaId}-message`;

  protected readonly counter = computed(() => {
    const max = this.maxLength();

    if (!this.showCounter() || max === undefined) {
      return '';
    }

    return `${this.value().length}/${max}`;
  });

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
    const classes = ['ds-textarea'];

    if (this.fluid()) {
      classes.push('ds-textarea--fluid');
    }

    if (this.invalid()) {
      classes.push('ds-textarea--invalid');
    } else if (this.warn()) {
      classes.push('ds-textarea--warn');
    }

    if (this.disabled()) {
      classes.push('ds-textarea--disabled');
    }

    if (this.readOnly()) {
      classes.push('ds-textarea--readonly');
    }

    return classes.join(' ');
  });

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }
}
