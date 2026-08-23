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
import { Checkbox } from '../checkbox/checkbox';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';
import type { FieldSize, ListOption } from '../field/field-types';

let nextId = 0;

/** One row. `label` is what the filter matches and what the row renders. */
/**
 * Kept as a name because it reads better at the call site, but the shape lives
 * in `field/field-types.ts` — `nine-am-dropdown` takes the same rows, and one
 * of them defining the interface for both would be an odd place for it.
 */
export type MultiSelectOption<T> = ListOption<T>;

/**
 * Where the selected rows sit in the list.
 *
 * - `top-after-reopen` — Carbon's default, and the only one that is not a
 *   trade-off. Picked rows rise to the top, but only once the menu has been
 *   closed and opened again, so nothing moves while the pointer is over it.
 * - `top` — rows rise the instant they are picked. Honest about the state and
 *   awful to use with a mouse: the row under the cursor is not the row you
 *   clicked a moment ago.
 * - `fixed` — never reorder. Right when the given order carries meaning of its
 *   own (a sequence, a ranking, a size ladder) and losing it costs more than
 *   finding a selection does.
 */
export type SelectionFeedback = 'top-after-reopen' | 'top' | 'fixed';

/**
 * Carbon MultiSelect: a field showing a count, and a listbox of checkboxes.
 *
 * Options are configured rather than projected, which is the opposite of
 * `nine-am-select` and for a concrete reason: select-all has to know the full set,
 * and the filter has to know each row's text. Projected `<option>` elements
 * expose neither to the component. The table made the same trade for the same
 * reason — see ui/README.md.
 *
 * `NgpListbox` owns selection, roving focus and the keyboard. We own the field,
 * the popover and every class name. Second component on ng-primitives, same
 * containment rule as the date picker: the import lives in this folder only.
 */
@Component({
  selector: 'nine-am-multi-select',
  encapsulation: ViewEncapsulation.None,
  imports: [Checkbox, Icon, CdkConnectedOverlay, CdkOverlayOrigin, NgpListbox, NgpListboxOption],
  templateUrl: './multi-select.html',
  styleUrl: './multi-select.scss',
  host: { '[class]': 'hostClass()' },
})
export class MultiSelect<T> {
  readonly label = input.required<string>();
  readonly options = input.required<readonly MultiSelectOption<T>[]>();

  readonly selected = model<T[]>([]);

  readonly size = input<FieldSize>('md');
  readonly placeholder = input('Choose options');
  readonly helperText = input('');

  /** See `SelectionFeedback`. Carbon's default, and ours. */
  readonly selectionFeedback = input<SelectionFeedback>('top-after-reopen');

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readOnly = input(false, { transform: booleanAttribute });
  readonly hideLabel = input(false, { transform: booleanAttribute });

  readonly invalid = input(false, { transform: booleanAttribute });
  readonly invalidText = input('');
  readonly warn = input(false, { transform: booleanAttribute });
  readonly warnText = input('');

  /** Adds the select-all row. Off by default — it only suits a short list. */
  readonly selectAll = input(false, { transform: booleanAttribute });
  readonly selectAllLabel = input('Select all');

  /** Turns this into Carbon's filterable variant, i.e. a combo box. */
  readonly filterable = input(false, { transform: booleanAttribute });
  readonly filterPlaceholder = input('Filter options');
  readonly emptyLabel = input('No options match');

  /**
   * Pluralization is a function, not a string — a design system cannot know
   * that Serbian needs three forms where English needs two.
   */
  readonly selectionLabel = input<(count: number) => string>((count) => `${count} selected`);

  /** Identity by default. Supply one when the values are fresh objects. */
  readonly compareWith = input<(a: T, b: T) => boolean>((a, b) => a === b);

  readonly opened = output<void>();

  protected readonly fieldId = `nine-am-multi-select-${nextId++}`;
  protected readonly helperId = `${this.fieldId}-helper`;
  protected readonly messageId = `${this.fieldId}-message`;

  readonly open = signal(false);
  protected readonly filter = signal('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly triggerRef = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

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
    () => `nine-am-multi-select__menu nine-am-multi-select__menu--${this.size()}`,
  );

  /**
   * The menu matches the field's width — Carbon's list box is one column.
   *
   * Measured into a plain signal on the way in, and applied as a style on the
   * panel rather than through `cdkConnectedOverlayWidth`. The CDK input reads
   * its value as it attaches the overlay — earlier than a binding updated in
   * the same pass — so it kept sizing the panel to its content (187px against a
   * 308px field). A style binding on the element itself has no such ordering.
   */
  protected readonly menuWidth = signal(0);

  /**
   * The selection as of the last moment ordering was allowed to change.
   *
   * `top-after-reopen` is the whole reason this exists: the list must *not*
   * reorder under the pointer while you are picking, so what counts as "selected"
   * for ordering is frozen until the menu is reopened.
   */
  private readonly orderedBy = signal<readonly T[]>([]);

  /** Only what the filter leaves. Select-all acts on this, not on everything. */
  private readonly matching = computed(() => {
    const query = this.filter().trim().toLowerCase();

    if (!query) {
      return this.options();
    }

    return this.options().filter((option) => option.label.toLowerCase().includes(query));
  });

  /** What the menu renders: filtered, then ordered per `selectionFeedback`. */
  protected readonly visible = computed(() => {
    const matching = this.matching();
    const feedback = this.selectionFeedback();

    if (feedback === 'fixed') {
      return matching;
    }

    const same = this.compareWith();
    const picked = feedback === 'top' ? this.selected() : this.orderedBy();

    const isPicked = (option: MultiSelectOption<T>) =>
      picked.some((value) => same(value, option.value));

    // Two passes rather than a comparator: `Array.sort` is only stable within
    // the spec's guarantees, and partitioning says what we mean — selected
    // first, everything else in the order it was given, neither group reshuffled.
    return [
      ...matching.filter((option) => isPicked(option)),
      ...matching.filter((option) => !isPicked(option)),
    ];
  });

  private readonly selectableVisible = computed(() =>
    this.visible().filter((option) => !option.disabled),
  );

  protected readonly allVisibleSelected = computed(() => {
    const selectable = this.selectableVisible();

    return selectable.length > 0 && selectable.every((option) => this.isSelected(option.value));
  });

  /**
   * Feeds the checkbox's indeterminate state, and `checked` wins over it — so
   * this deliberately reports false once everything is selected rather than
   * relying on the checkbox to resolve the clash.
   */
  protected readonly someVisibleSelected = computed(() => {
    const selectable = this.selectableVisible();
    const picked = selectable.filter((option) => this.isSelected(option.value));

    return picked.length > 0 && picked.length < selectable.length;
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
    const classes = ['nine-am-multi-select', `nine-am-multi-select--${this.size()}`];

    if (this.open()) {
      classes.push('nine-am-multi-select--open');
    }

    if (this.invalid()) {
      classes.push('nine-am-multi-select--invalid');
    } else if (this.warn()) {
      classes.push('nine-am-multi-select--warn');
    }

    if (this.disabled()) {
      classes.push('nine-am-multi-select--disabled');
    }

    if (this.readOnly()) {
      classes.push('nine-am-multi-select--readonly');
    }

    return classes.join(' ');
  });

  protected isSelected(value: T): boolean {
    const same = this.compareWith();

    return this.selected().some((picked) => same(picked, value));
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();

      return;
    }

    this.menuWidth.set(this.host.nativeElement.getBoundingClientRect().width);

    // Reopening is what re-sorts, under the default. Taken before the menu is
    // shown so the first paint is already in the new order.
    this.orderedBy.set(this.selected());

    this.open.set(true);
    this.opened.emit();
  }

  protected close(): void {
    if (!this.open()) {
      return;
    }

    this.open.set(false);

    // Carbon keeps the filter across openings; we clear it. A menu that opens
    // already filtered by something typed minutes ago hides options for a
    // reason nobody can see.
    this.filter.set('');
    this.triggerRef().nativeElement.focus();
  }

  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected onOutsideClick(event: MouseEvent): void {
    if (this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.open.set(false);
    this.filter.set('');
  }

  /**
   * Applies to the *filtered* rows only, which is the part people get wrong.
   * Selecting all while a filter is on must not quietly pick up the hundred
   * rows the filter is hiding — and clearing must not drop them either.
   */
  protected toggleAll(): void {
    const same = this.compareWith();
    const selectable = this.selectableVisible().map((option) => option.value);

    if (this.allVisibleSelected()) {
      this.selected.update((current) =>
        current.filter((picked) => !selectable.some((v) => same(picked, v))),
      );

      return;
    }

    this.selected.update((current) => [
      ...current,
      ...selectable.filter((v) => !current.some((picked) => same(picked, v))),
    ]);
  }
}
