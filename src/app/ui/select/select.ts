import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  model,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';
import type { FieldSize } from '../field/field-types';

let nextId = 0;

/**
 * Carbon select, on a native `<select>`.
 *
 * Options are projected rather than configured — `<ds-select><option …>` — which
 * is what Carbon does and what keeps `<optgroup>`, `disabled` and a native
 * placeholder row working without us re-exposing each one. The table went the
 * other way (config-driven columns) because a table cell needs formatting and
 * sorting hooks; an option needs neither.
 *
 * There is no placeholder input for the same reason: an empty first `<option>`
 * is the native idiom and the caller already has one.
 */
@Component({
  selector: 'ds-select',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './select.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    <label
      class="ds-select__label"
      [class.ds-visually-hidden]="hideLabel()"
      [for]="selectId"
    >
      {{ label() }}
    </label>

    <div class="ds-select__field-wrapper">
      <select
        #select
        class="ds-select__field"
        [id]="selectId"
        [disabled]="disabled() || readOnly()"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [attr.aria-describedby]="describedBy()"
        (change)="onChange($event)"
        (blur)="blurred.emit()"
      >
        <ng-content />
      </select>

      <!-- After the select in the DOM so the chevron cannot intercept the click
           that opens it; it is pointer-events:none as well, belt and braces. -->
      <ds-icon class="ds-select__arrow" name="chevron-down" />

      @if (statusIcon(); as icon) {
        <ds-icon class="ds-select__status" [name]="icon" />
      }

      @if (fluid() && message()) {
        <div class="ds-select__divider"></div>
      }
    </div>

    @if (message(); as text) {
      <div class="ds-select__requirement" [id]="messageId">{{ text }}</div>
    } @else if (helperText()) {
      <div class="ds-select__helper" [id]="helperId">{{ helperText() }}</div>
    }
  `,
})
export class Select {
  readonly label = input.required<string>();
  readonly value = model('');
  readonly size = input<FieldSize>('md');
  readonly helperText = input('');

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly hideLabel = input(false, { transform: booleanAttribute });

  /**
   * Carbon styles a read-only select as text, but a native `<select>` has no
   * readonly — `readonly` on it does nothing. So this sets `disabled` on the
   * element and restores the look. The consequence worth knowing: like every
   * disabled control, a read-only select is not submitted with its form. Send
   * the value yourself, or keep it in a hidden input.
   */
  readonly readOnly = input(false, { transform: booleanAttribute });

  readonly invalid = input(false, { transform: booleanAttribute });
  readonly invalidText = input('');
  readonly warn = input(false, { transform: booleanAttribute });
  readonly warnText = input('');

  readonly fluid = input(false, { transform: booleanAttribute });

  readonly blurred = output<void>();

  protected readonly selectId = `ds-select-${nextId++}`;
  protected readonly helperId = `${this.selectId}-helper`;
  protected readonly messageId = `${this.selectId}-message`;

  private readonly selectRef =
    viewChild.required<ElementRef<HTMLSelectElement>>('select');

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
    const classes = ['ds-select', `ds-select--${this.size()}`];

    if (this.fluid()) {
      classes.push('ds-select--fluid');
    }

    if (this.invalid()) {
      classes.push('ds-select--invalid');
    } else if (this.warn()) {
      classes.push('ds-select--warn');
    }

    if (this.disabled()) {
      classes.push('ds-select--disabled');
    }

    if (this.readOnly()) {
      classes.push('ds-select--readonly');
    }

    return classes.join(' ');
  });

  constructor() {
    // Re-assert `value` on the element, because the [value] binding above lands
    // before projected options exist when they are rendered from data that
    // arrives later.
    //
    // The guard is the whole point. Assigning `.value` a string no option
    // carries does not leave a <select> alone — it sets selectedIndex to -1 and
    // the field goes visibly blank. An unconditional write therefore wipes the
    // display of every select whose options do not happen to include an empty
    // one, which is most of them.
    effect(() => {
      const element = this.selectRef().nativeElement;
      const wanted = this.value();

      if (Array.from(element.options).some((o) => o.value === wanted)) {
        element.value = wanted;
      }
    });

    // A <select> with nothing explicitly selected settles on its first option,
    // so the element holds a value the model never agreed to. Adopt it once, or
    // a form submitted without anyone touching this field sends '' while the
    // user was looking at "Development".
    afterNextRender(() => {
      const element = this.selectRef().nativeElement;

      if (this.value() === '' && element.value !== '') {
        this.value.set(element.value);
      }
    });
  }

  protected onChange(event: Event): void {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}
