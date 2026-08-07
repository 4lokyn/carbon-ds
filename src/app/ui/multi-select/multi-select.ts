import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  ScrollStrategyOptions,
} from '@angular/cdk/overlay';
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
import type { FieldSize } from '../field/field-types';

let nextId = 0;

/** One row. `label` is what the filter matches and what the row renders. */
export interface MultiSelectOption<T> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * Carbon MultiSelect: a field showing a count, and a listbox of checkboxes.
 *
 * Options are configured rather than projected, which is the opposite of
 * `ds-select` and for a concrete reason: select-all has to know the full set,
 * and the filter has to know each row's text. Projected `<option>` elements
 * expose neither to the component. The table made the same trade for the same
 * reason — see ui/README.md.
 *
 * `NgpListbox` owns selection, roving focus and the keyboard. We own the field,
 * the popover and every class name. Second component on ng-primitives, same
 * containment rule as the date picker: the import lives in this folder only.
 */
@Component({
  selector: 'ds-multi-select',
  encapsulation: ViewEncapsulation.None,
  imports: [
    Checkbox,
    Icon,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    NgpListbox,
    NgpListboxOption,
  ],
  styleUrl: './multi-select.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    <label class="ds-multi-select__label" [class.ds-visually-hidden]="hideLabel()">
      {{ label() }}
    </label>

    <div class="ds-multi-select__box" cdkOverlayOrigin #origin="cdkOverlayOrigin">
      <button
        #trigger
        type="button"
        class="ds-multi-select__field"
        [id]="fieldId"
        [disabled]="disabled() || readOnly()"
        [attr.aria-expanded]="open()"
        [attr.aria-haspopup]="'listbox'"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [attr.aria-describedby]="describedBy()"
        (click)="toggle()"
      >
        @if (selected().length) {
          <!-- The count, not the values. Carbon shows a single tag because a
               field is one line and five labels are not. -->
          <span class="ds-multi-select__count">{{ selected().length }}</span>
        }

        <span class="ds-multi-select__value">
          {{ selected().length ? selectionLabel()(selected().length) : placeholder() }}
        </span>

        @if (statusIcon(); as icon) {
          <ds-icon class="ds-multi-select__status" [name]="icon" />
        }

        <ds-icon class="ds-multi-select__chevron" name="chevron-down" />
      </button>
    </div>

    @if (message(); as text) {
      <div class="ds-multi-select__requirement" [id]="messageId">{{ text }}</div>
    } @else if (helperText()) {
      <div class="ds-multi-select__helper" [id]="helperId">{{ helperText() }}</div>
    }

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
      [cdkConnectedOverlayDisableClose]="true"
      (overlayOutsideClick)="onOutsideClick($event)"
      (overlayKeydown)="onOverlayKeydown($event)"
      (detach)="open.set(false)"
    >
      <!-- The size modifier is repeated here, not inherited. The overlay is
           portaled to the CDK container at body level, so the host's own size
           class is not an ancestor of any of this and cannot reach it. -->
      <div [class]="menuClass()" [style.width.px]="menuWidth()">
        @if (filterable()) {
          <input
            #filterField
            class="ds-multi-select__filter"
            type="text"
            autocomplete="off"
            [placeholder]="filterPlaceholder()"
            [value]="filter()"
            [attr.aria-label]="filterPlaceholder()"
            (input)="filter.set($any($event.target).value)"
          />
        }

        <div
          class="ds-multi-select__list"
          ngpListbox
          ngpListboxMode="multiple"
          [ngpListboxValue]="selected()"
          [ngpListboxCompareWith]="compareWith()"
          (ngpListboxValueChange)="selected.set($event)"
          [attr.aria-label]="label()"
        >
          <!-- Not a listbox option: it selects the other options rather than
               being one, so giving it a value would put it in the model. -->
          @if (selectAll() && visible().length) {
            <div
              class="ds-multi-select__item ds-multi-select__item--select-all"
              role="button"
              tabindex="0"
              [attr.aria-pressed]="allVisibleSelected()"
              (click)="toggleAll()"
              (keydown.enter)="toggleAll()"
              (keydown.space)="$event.preventDefault(); toggleAll()"
            >
              <ds-checkbox
                class="ds-multi-select__check"
                [label]="selectAllLabel()"
                hideLabel
                [checked]="allVisibleSelected()"
                [indeterminate]="someVisibleSelected()"
              />
              <span class="ds-multi-select__item-text">{{ selectAllLabel() }}</span>
            </div>
          }

          @for (option of visible(); track option.value) {
            <div
              class="ds-multi-select__item"
              ngpListboxOption
              [ngpListboxOptionValue]="option.value"
              [ngpListboxOptionDisabled]="option.disabled ?? false"
            >
              <ds-checkbox
                class="ds-multi-select__check"
                [label]="option.label"
                hideLabel
                [checked]="isSelected(option.value)"
                [disabled]="option.disabled ?? false"
              />
              <span class="ds-multi-select__item-text">{{ option.label }}</span>
            </div>
          } @empty {
            <p class="ds-multi-select__empty">{{ emptyLabel() }}</p>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class MultiSelect<T> {
  readonly label = input.required<string>();
  readonly options = input.required<readonly MultiSelectOption<T>[]>();

  readonly selected = model<T[]>([]);

  readonly size = input<FieldSize>('md');
  readonly placeholder = input('Choose options');
  readonly helperText = input('');

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
  readonly selectionLabel = input<(count: number) => string>(
    (count) => `${count} selected`,
  );

  /** Identity by default. Supply one when the values are fresh objects. */
  readonly compareWith = input<(a: T, b: T) => boolean>((a, b) => a === b);

  readonly opened = output<void>();

  protected readonly fieldId = `ds-multi-select-${nextId++}`;
  protected readonly helperId = `${this.fieldId}-helper`;
  protected readonly messageId = `${this.fieldId}-message`;

  readonly open = signal(false);
  protected readonly filter = signal('');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly triggerRef =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

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
    () => `ds-multi-select__menu ds-multi-select__menu--${this.size()}`,
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

  /** Only what the filter leaves. Select-all acts on this, not on everything. */
  protected readonly visible = computed(() => {
    const query = this.filter().trim().toLowerCase();

    if (!query) {
      return this.options();
    }

    return this.options().filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  });

  private readonly selectableVisible = computed(() =>
    this.visible().filter((option) => !option.disabled),
  );

  protected readonly allVisibleSelected = computed(() => {
    const selectable = this.selectableVisible();

    return (
      selectable.length > 0 &&
      selectable.every((option) => this.isSelected(option.value))
    );
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
    const classes = [
      'ds-multi-select',
      `ds-multi-select--${this.size()}`,
    ];

    if (this.open()) {
      classes.push('ds-multi-select--open');
    }

    if (this.invalid()) {
      classes.push('ds-multi-select--invalid');
    } else if (this.warn()) {
      classes.push('ds-multi-select--warn');
    }

    if (this.disabled()) {
      classes.push('ds-multi-select--disabled');
    }

    if (this.readOnly()) {
      classes.push('ds-multi-select--readonly');
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
