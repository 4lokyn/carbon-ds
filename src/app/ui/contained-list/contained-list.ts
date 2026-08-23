import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  Component,
  computed,
  Directive,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

/**
 * `on-page` sits on the page itself and gets the page's own ground; `disclosed`
 * sits inside something that already has edges — a panel, a popover — and drops
 * the outer fill so the two do not stack.
 */
export type ContainedListKind = 'on-page' | 'disclosed';

/** Carbon's row heights: 32 / 40 / 48 / 64px. */
export type ContainedListSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * A control that belongs to the list as a whole, in the header beside its title
 * — a filter, an "Add" button.
 */
@Directive({
  selector: '[nineAmContainedListAction]',
  host: { class: 'nine-am-contained-list__action' },
})
export class ContainedListAction {}

/**
 * A control that belongs to one row but must not be inside it.
 *
 * The third time this shape has come up here, and always for the same reason: an
 * interactive row is a `<button>`, and a button may not contain another button.
 * Put an overflow menu inside one and the markup is invalid and the menu is
 * unreachable by keyboard. `AccordionItem` has the same slot, for the same rule.
 */
@Directive({
  selector: '[nineAmContainedListItemAction]',
  host: { class: 'nine-am-contained-list-item__action' },
})
export class ContainedListItemAction {}

/**
 * The glyph at the start of a row. A slot rather than an input so it can be any
 * icon the caller already has, and it exists at all because Carbon nudges it a
 * pixel down: an icon sitting on the text baseline reads as slightly high.
 */
@Directive({
  selector: '[nineAmContainedListItemIcon]',
  host: { class: 'nine-am-contained-list-item__icon' },
})
export class ContainedListItemIcon {}

/**
 * Carbon's contained list: a titled list that lives inside something.
 *
 * Not the same job as `nine-am-list`, which is bullets in running text, and not
 * the same as the table, which is rows of columns. This is the one for a panel:
 * a heading that stays put while the rows scroll under it, and rows that may or
 * may not be clickable.
 *
 * The caller writes the `<li>` elements, the same trade `Breadcrumb` and
 * `Accordion` make — "list, 8 items" is what a screen reader should say, and
 * none of that survives being rebuilt on divs.
 */
@Component({
  selector: 'nine-am-contained-list',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './contained-list.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    <div class="nine-am-contained-list__header">
      <h3 class="nine-am-contained-list__label">{{ label() }}</h3>

      <ng-content select="[nineAmContainedListAction]" />
    </div>

    <ul class="nine-am-contained-list__list">
      <ng-content />
    </ul>
  `,
})
export class ContainedList {
  /** The heading. Required — an untitled list in a panel is a list of what? */
  readonly label = input.required<string>();

  readonly kind = input<ContainedListKind>('on-page');

  readonly size = input<ContainedListSize>('lg');

  /**
   * Carbon's `--inset-rulers`: the rules between rows stop short of the edges
   * instead of running the full width. For a list inside something narrow,
   * where a full-width rule reads as the container's own edge rather than as a
   * separator between two rows.
   */
  readonly insetRulers = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() => {
    const classes = [
      'nine-am-contained-list',
      `nine-am-contained-list--${this.kind()}`,
      `nine-am-contained-list--${this.size()}`,
    ];

    if (this.insetRulers()) {
      classes.push('nine-am-contained-list--inset-rulers');
    }

    return classes.join(' ');
  });
}

/**
 * One row.
 *
 * `interactive` is the input that carries weight, and it is the same decision
 * `ExpandableTile` documents: an interactive row is a `<button>`, so it may not
 * contain a link or another button. Anything of that kind goes in the
 * `[nineAmContainedListItemAction]` slot, which sits outside it.
 */
@Component({
  selector: 'li[nineAmContainedListItem]',
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  styleUrl: './contained-list.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    @if (interactive()) {
      <button
        type="button"
        class="nine-am-contained-list-item__content"
        [disabled]="disabled()"
        (click)="selected.emit()"
      >
        <ng-container [ngTemplateOutlet]="body" />
      </button>
    } @else {
      <div class="nine-am-contained-list-item__content">
        <ng-container [ngTemplateOutlet]="body" />
      </div>
    }

    <ng-content select="[nineAmContainedListItemAction]" />

    <!--
      Projected once and stamped into whichever branch is live. Two ng-content
      elements would not do: projected nodes are created by the caller and can
      only land in one place.
    -->
    <ng-template #body><ng-content /></ng-template>
  `,
})
export class ContainedListItem {
  /** Makes the row a button. Leave it off for a row that only displays. */
  readonly interactive = input(false, { transform: booleanAttribute });

  readonly disabled = input(false, { transform: booleanAttribute });

  /** The row was chosen. Only ever fires when `interactive`. */
  readonly selected = output<void>();

  protected readonly hostClass = computed(() => {
    const classes = ['nine-am-contained-list-item'];

    if (this.interactive()) {
      classes.push('nine-am-contained-list-item--clickable');
    }

    return classes.join(' ');
  });
}

/** Import this instead of the pieces one by one. */
export const NINE_AM_CONTAINED_LIST = [
  ContainedList,
  ContainedListItem,
  ContainedListAction,
  ContainedListItemAction,
  ContainedListItemIcon,
] as const;
