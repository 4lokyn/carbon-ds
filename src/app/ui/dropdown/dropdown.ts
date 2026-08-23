import { CdkConnectedOverlay, CdkOverlayOrigin, ScrollStrategyOptions } from '@angular/cdk/overlay';
import {
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgpListbox, NgpListboxOption } from 'ng-primitives/listbox';
import type { FieldSize, ListOption } from '../field/field-types';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';

/** Same rows the multi-select takes. See `ListOption`. */
export type DropdownOption<T> = ListOption<T>;

let nextId = 0;

/**
 * Carbon's dropdown: pick one from a list, in a styled listbox.
 *
 * **The difference from `nine-am-select` is what draws the list.** That one is a
 * native `<select>`, so the operating system draws the options and they can
 * never be styled, never hold markup, and never be searched by anything but the
 * platform's own type-ahead. This one draws them, which is what buys Carbon's
 * appearance and costs the keyboard — the keyboard here is `ng-primitives`,
 * the same primitive the multi-select uses.
 *
 * Prefer the native one on a form a user fills in on a phone, where the
 * platform's picker is better than anything a page can draw. Prefer this one
 * where the list has to look like the rest of the product.
 *
 * Options are configured rather than projected, the same call the multi-select
 * makes and for the same reason: a filter and a type-ahead have to know each
 * row's text, and projected `<option>` elements expose neither.
 *
 * Its stylesheet is its own, and the panel rules in it are close cousins of the
 * multi-select's. Two is not yet a pattern; if a third listbox appears, the
 * panel is what to extract, the way the three menu buttons share `MenuSurface`.
 */
@Component({
  selector: 'nine-am-dropdown',
  encapsulation: ViewEncapsulation.None,
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, Icon, NgpListbox, NgpListboxOption],
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.scss',
  host: { '[class]': 'hostClass()' },
})
export class Dropdown<T> {
  /** Carbon calls this `titleText`. It is the field's label. */
  readonly label = input.required<string>();

  readonly options = input.required<readonly DropdownOption<T>[]>();

  /** The chosen value, or `null` for nothing chosen. */
  readonly selected = model<T | null>(null);

  /** Carbon calls this `label`: what the closed field says before a choice. */
  readonly placeholder = input('Choose an option');

  readonly size = input<FieldSize>('md');
  readonly helperText = input('');

  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Readable, not editable. The field keeps its place in the tab order — a
   * value a user can reach and copy but not change is different from one they
   * cannot get to at all.
   */
  readonly readOnly = input(false, { transform: booleanAttribute });

  readonly hideLabel = input(false, { transform: booleanAttribute });

  readonly invalid = input(false, { transform: booleanAttribute });
  readonly invalidText = input('');
  readonly warn = input(false, { transform: booleanAttribute });
  readonly warnText = input('');

  /** Carbon's `type="inline"`: the label sits beside the field, not above it. */
  readonly inline = input(false, { transform: booleanAttribute });

  /** How two values are told apart. Identity by default, which suits primitives. */
  readonly compareWith = input<(a: T, b: T) => boolean>((a, b) => a === b);

  /** The list was opened. Useful for fetching options the first time they are asked for. */
  readonly opened = output<void>();

  readonly open = signal(false);

  protected readonly fieldId = `nine-am-dropdown-${nextId++}`;
  protected readonly helperId = `${this.fieldId}-helper`;
  protected readonly messageId = `${this.fieldId}-message`;

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly scrollStrategy = inject(ScrollStrategyOptions).close();

  protected readonly positions = [
    {
      originX: 'start' as const,
      originY: 'bottom' as const,
      overlayX: 'start' as const,
      overlayY: 'top' as const,
    },
    {
      originX: 'start' as const,
      originY: 'top' as const,
      overlayX: 'start' as const,
      overlayY: 'bottom' as const,
    },
  ];

  protected readonly menuClass = computed(
    () => `nine-am-dropdown__menu nine-am-dropdown__menu--${this.size()}`,
  );

  protected readonly menuWidth = computed(() =>
    this.open() ? this.trigger().nativeElement.getBoundingClientRect().width : 0,
  );

  /** The row matching the current value, which is what the closed field shows. */
  protected readonly selectedOption = computed(() => {
    const value = this.selected();

    if (value === null) {
      return null;
    }

    return this.options().find((option) => this.compareWith()(option.value, value)) ?? null;
  });

  /**
   * The primitive's value is a list even when only one thing can be chosen, so
   * this is the same value in the shape it wants. Selection itself is handled on
   * the click — the listbox is here for the roles and the roving focus.
   */
  protected readonly selectedValues = computed(() => {
    const value = this.selected();

    return value === null ? [] : [value];
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
    const classes = ['nine-am-dropdown', `nine-am-dropdown--${this.size()}`];

    if (this.inline()) {
      classes.push('nine-am-dropdown--inline');
    }

    if (this.invalid()) {
      classes.push('nine-am-dropdown--invalid');
    } else if (this.warn()) {
      classes.push('nine-am-dropdown--warn');
    }

    if (this.disabled()) {
      classes.push('nine-am-dropdown--disabled');
    }

    if (this.readOnly()) {
      classes.push('nine-am-dropdown--readonly');
    }

    if (this.open()) {
      classes.push('nine-am-dropdown--open');
    }

    return classes.join(' ');
  });

  protected toggle(): void {
    if (this.readOnly()) {
      return;
    }

    const next = !this.open();

    this.open.set(next);

    if (next) {
      this.opened.emit();
    }
  }

  /**
   * A dropdown closes on a choice, unlike the multi-select beside it. One value
   * means the question is answered, and a list that stays open over an answered
   * question invites a second answer.
   */
  protected choose(option: DropdownOption<T>): void {
    if (option.disabled) {
      return;
    }

    this.selected.set(option.value);
    this.close();
  }

  protected isSelected(option: DropdownOption<T>): boolean {
    const value = this.selected();

    return value !== null && this.compareWith()(option.value, value);
  }

  protected close(): void {
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }

  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected onOutsideClick(event: MouseEvent): void {
    // A click on the trigger is what closes an open list, and it does that
    // through `toggle()`. Letting the overlay close it here as well would run
    // both and reopen it.
    if (this.trigger().nativeElement.contains(event.target as Node)) {
      return;
    }

    this.open.set(false);
  }
}
