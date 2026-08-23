import type { TemplateRef } from '@angular/core';

export type SortDirection = 'asc' | 'desc';

export interface NineAmSort {
  readonly column: string;
  readonly direction: SortDirection;
}

/** Carbon row heights: 24 / 32 / 40 / 48 / 64 px. `md` is the default. */
export type TableSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type CellAlign = 'start' | 'end';

/**
 * Carbon's breakpoints by name, for `foldBelow`. The values are Carbon's own:
 * sm 320, md 672, lg 1056, xlg 1312, max 1584.
 */
export type TableBreakpoint = 'sm' | 'md' | 'lg' | 'xlg' | 'max';

/**
 * One column, described as data rather than as a template.
 *
 * The 80% case is a text column, which is a single line here. Reach for `cell`
 * only when the cell needs markup — a tag, a link, a button. That is the whole
 * bet of this API: the common case should not cost eight lines of template.
 */
export interface NineAmColumn<T> {
  /**
   * Stable id. Used as the sort key, as the `@for` track key, and — when `value`
   * is omitted — as the property name to read off the row.
   *
   * Typed as `string` rather than `keyof T` on purpose, so computed columns
   * ('fullName', 'actions') are possible. The cost is that a typo in a plain
   * text column is not a compile error; it renders blank.
   */
  readonly key: string;

  readonly header: string;

  readonly sortable?: boolean;

  /** Cell text. Use for formatting. Falls back to `row[key]` when omitted. */
  readonly value?: (row: T) => string | number | null | undefined;

  /**
   * The value to sort on, when it differs from what is displayed — a timestamp
   * behind "3 hours ago", a raw number behind "42%".
   *
   * This is also what decides whether a cell counts as empty, and empty cells
   * always sort last regardless of direction. Prefer this over `compare`: it is
   * one expression, and it gets the empty handling for free.
   */
  readonly sortBy?: (row: T) => string | number | null | undefined;

  /**
   * Template for cells that need markup. Receives the row as `$implicit`:
   *
   *     <ng-template #statusCell let-row>
   *       <nine-am-tag [color]="hue(row)">{{ row.status }}</nine-am-tag>
   *     </ng-template>
   */
  readonly cell?: TemplateRef<{ $implicit: T }>;

  /** Numbers right-align in Carbon so digits line up on the decimal. */
  readonly align?: CellAlign;

  /** Any CSS width. Without it the browser distributes space. */
  readonly width?: string;

  /**
   * Full custom ordering, ascending, for what a single sort value cannot express
   * — an enum with a business rank, a multi-key tiebreak.
   *
   * Only ever called with pairs where neither side is empty (emptiness is judged
   * from `sortBy ?? value ?? key`), and the table flips the result for a
   * descending sort. So this does not need to — and must not try to — handle
   * direction or empties itself.
   *
   * Must not return NaN. A NaN comparator result makes `Array.sort` produce
   * arbitrary output for the whole array, not just the offending pair, so a NaN
   * is clamped to 0 here rather than being allowed to corrupt the order.
   *
   * Ignored in server-side mode.
   */
  readonly compare?: (a: T, b: T) => number;
}
