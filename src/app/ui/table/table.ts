import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  Component,
  computed,
  effect,
  input,
  model,
  signal,
  TemplateRef,
  ViewEncapsulation,
} from '@angular/core';
import { Accordion, AccordionItem, AccordionLead, AccordionTitle } from '../accordion/accordion';
import { Checkbox } from '../checkbox/checkbox';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';
import { displayAccessorFor, nextSort, sortRows } from './table-sort';
import type { DsColumn, DsSort, TableBreakpoint, TableSize } from './table-types';

let nextTableId = 0;

/** Carbon's breakpoints, in the pixels `foldBelow` measures against. */
const BREAKPOINTS: Record<TableBreakpoint, number> = {
  sm: 320,
  md: 672,
  lg: 1056,
  xlg: 1312,
  max: 1584,
};

/**
 * Carbon data table, driven by a column config rather than per-column templates.
 *
 * Behavior we own here (a native `<table>` already gives us the roles, and Carbon
 * data tables are tables, not grids — users tab through the controls rather than
 * arrowing between cells, so `@angular/aria/grid` is deliberately not used; that
 * one is for editable spreadsheet-style grids):
 *
 *   - tri-state sorting, with `aria-sort` on the header cell
 *   - selection keyed by `rowKey`, so it survives sorting and refetches
 *   - row expansion, wired with `aria-expanded` / `aria-controls`
 *
 * Pagination is deliberately outside: the caller slices `rows`, so the same table
 * works against a client-side array and a server-paged endpoint without a mode
 * switch. See `nine-am-pagination`.
 */
@Component({
  selector: 'nine-am-table',
  encapsulation: ViewEncapsulation.None,
  imports: [
    NgTemplateOutlet,
    Checkbox,
    Icon,
    Accordion,
    AccordionItem,
    AccordionLead,
    AccordionTitle,
  ],
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class Table<T> {
  readonly columns = input.required<readonly DsColumn<T>[]>();
  readonly rows = input.required<readonly T[]>();

  /**
   * Stable identity per row. Required rather than optional, and never index-based:
   * tracking by index silently breaks selection and expansion the moment the
   * table is sorted or the data refetched, and that bug is miserable to find.
   */
  readonly rowKey = input.required<(row: T) => unknown>();

  /**
   * Accessible name. Rendered as a visually-hidden `<caption>` — the visible
   * heading belongs in the toolbar above. Required, because a table announced as
   * just "table" is useless when a page has three of them.
   */
  readonly caption = input.required<string>();

  readonly size = input<TableSize>('md');

  /**
   * Alternating row backgrounds. Fine for a read-only table.
   *
   * Avoid combining it with `selectable`: in all four Carbon themes
   * `$layer-accent-01` (the stripe) and `$layer-selected-01` resolve to the same
   * color, so the two states are indistinguishable by background. The accent bar
   * on selected rows exists to keep that legible, but the striping still adds
   * noise to a table people are picking rows out of.
   */
  readonly zebra = input(false, { transform: booleanAttribute });

  readonly stickyHeader = input(false, { transform: booleanAttribute });

  /**
   * Sizes the table to its content instead of to its container.
   *
   * The default — full width — is right almost always: a table is usually a
   * page's main content and should use the room it is given. This is for the
   * case where it is not: two or three narrow columns inside a wide panel, where
   * stretching leaves a metre of empty cell between the last value and the edge.
   */
  readonly staticWidth = input(false, { transform: booleanAttribute });

  readonly loading = input(false, { transform: booleanAttribute });
  readonly skeletonRows = input(5);

  readonly sort = model<DsSort | null>(null);

  /**
   * Render `rows` in the given order and only emit `sort` changes — the caller
   * refetches. Client-side is the default because most tables are small enough
   * that a round trip is the slower option.
   */
  readonly serverSide = input(false, { transform: booleanAttribute });

  readonly selectable = input(false, { transform: booleanAttribute });
  readonly selection = model<readonly T[]>([]);

  /** Supplying this switches on the expand column. */
  readonly expandedContent = input<TemplateRef<{ $implicit: T }>>();

  /**
   * Below this breakpoint the table stops being a table and becomes a list of
   * accordions, one per row. Off by default: a table that reshapes itself
   * without being asked is a surprise, and plenty of tables are better served by
   * scrolling sideways.
   *
   * Opt in per table, because whether a row reads as a card is a question about
   * the *data* — six short columns fold well, twenty numeric ones do not.
   *
   * Measured against the viewport rather than this element's own width. A
   * container query would be the more correct answer and needs a
   * `ResizeObserver` to drive rendering; the viewport is what "responsive"
   * usually means and is what a caller can reason about from a stylesheet.
   */
  readonly foldBelow = input<TableBreakpoint | null>(null);

  /**
   * Which column becomes the heading when folded. Defaults to the first, which
   * is the name column often enough to be the right default and never wrong
   * enough to be silent about — it shows on screen the moment it is not.
   */
  readonly foldTitle = input<string>();

  readonly selectAllLabel = input('Select all rows on this page');

  /**
   * Per-row accessible names. Defaults are generic; pass a function to make them
   * specific — `(row) => 'Select ' + row.name` — which is the difference between
   * "select row, select row, select row" and something navigable.
   */
  readonly selectRowLabel = input<(row: T) => string>(() => 'Select row');
  readonly expandRowLabel = input<(row: T) => string>(() => 'Expand row');

  private readonly tableId = `nine-am-table-${nextTableId++}`;
  private readonly expandedKeys = signal<ReadonlySet<unknown>>(new Set());

  /** True while the viewport is under `foldBelow`. Always false without it. */
  protected readonly folded = signal(false);

  constructor() {
    effect((onCleanup) => {
      const at = this.foldBelow();

      // No `matchMedia` — a server render, or jsdom, which does not ship one —
      // means the table stays a table. That is the safe way to be wrong: every
      // column is still there and still readable, just wide. Folding by default
      // would hide columns in an environment that cannot say how wide it is.
      if (at === null || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        this.folded.set(false);
        return;
      }

      // 0.02 below the breakpoint, which is the usual guard against a viewport
      // sitting exactly on it and matching both the table and the list.
      const query = window.matchMedia(`(max-width: ${BREAKPOINTS[at] - 0.02}px)`);

      this.folded.set(query.matches);

      const onChange = (event: MediaQueryListEvent) => this.folded.set(event.matches);

      query.addEventListener('change', onChange);
      onCleanup(() => query.removeEventListener('change', onChange));
    });
  }

  /** The column that becomes the accordion heading. */
  protected readonly titleColumn = computed(() => {
    const key = this.foldTitle();
    const columns = this.columns();

    return columns.find((column) => column.key === key) ?? columns[0];
  });

  /** Everything else, rendered as label/value pairs under the heading. */
  protected readonly fieldColumns = computed(() => {
    const title = this.titleColumn();

    return this.columns().filter((column) => column.key !== title?.key);
  });

  protected readonly expandable = computed(() => this.expandedContent() !== undefined);

  /** Total rendered columns, including the control columns. Drives colspan. */
  protected readonly columnCount = computed(
    () => this.columns().length + (this.selectable() ? 1 : 0) + (this.expandable() ? 1 : 0),
  );

  protected readonly displayRows = computed(() =>
    this.serverSide() ? this.rows() : sortRows(this.rows(), this.columns(), this.sort()),
  );

  protected readonly tableClass = computed(() => {
    const classes = ['nine-am-table', `nine-am-table--${this.size()}`];

    if (this.zebra()) {
      classes.push('nine-am-table--zebra');
    }

    if (this.staticWidth()) {
      classes.push('nine-am-table--static-width');
    }

    return classes.join(' ');
  });

  // Built once per column change rather than per cell render.
  private readonly accessors = computed(
    () => new Map(this.columns().map((column) => [column.key, displayAccessorFor(column)])),
  );

  private readonly selectedKeys = computed(
    () => new Set(this.selection().map((row) => this.rowKey()(row))),
  );

  protected readonly skeletonRange = computed(() =>
    Array.from({ length: this.skeletonRows() }, (_, index) => index),
  );

  protected readonly columnRange = computed(() =>
    Array.from({ length: this.columnCount() }, (_, index) => index),
  );

  /** Every row on this page is selected. Scoped to the page, as Carbon does. */
  protected readonly allSelected = computed(() => {
    const rows = this.displayRows();
    const keys = this.selectedKeys();

    return rows.length > 0 && rows.every((row) => keys.has(this.rowKey()(row)));
  });

  protected readonly partiallySelected = computed(() => {
    const keys = this.selectedKeys();

    return this.displayRows().some((row) => keys.has(this.rowKey()(row))) && !this.allSelected();
  });

  protected cellText(column: DsColumn<T>, row: T): string {
    const value = this.accessors().get(column.key)?.(row);

    return value == null ? '' : String(value);
  }

  protected sortIcon(column: DsColumn<T>): IconName {
    const sort = this.sort();

    if (sort === null || sort.column !== column.key) {
      return 'arrows-vertical';
    }

    return sort.direction === 'asc' ? 'arrow-up' : 'arrow-down';
  }

  protected ariaSort(column: DsColumn<T>): 'ascending' | 'descending' | 'none' | null {
    if (column.sortable !== true) {
      return null;
    }

    const sort = this.sort();

    if (sort === null || sort.column !== column.key) {
      return 'none';
    }

    return sort.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected toggleSort(column: DsColumn<T>): void {
    if (column.sortable !== true) {
      return;
    }

    this.sort.set(nextSort(this.sort(), column.key));
  }

  protected isSelected(row: T): boolean {
    return this.selectedKeys().has(this.rowKey()(row));
  }

  protected toggleRow(row: T): void {
    const key = this.rowKey()(row);

    this.selection.set(
      this.selectedKeys().has(key)
        ? this.selection().filter((selected) => this.rowKey()(selected) !== key)
        : [...this.selection(), row],
    );
  }

  protected toggleAll(): void {
    const rows = this.displayRows();
    const pageKeys = new Set(rows.map((row) => this.rowKey()(row)));

    if (this.allSelected()) {
      // Drop only this page's rows. Selections made on other pages survive —
      // clearing them would quietly undo work the user can't even see.
      this.selection.set(
        this.selection().filter((selected) => !pageKeys.has(this.rowKey()(selected))),
      );

      return;
    }

    const alreadySelected = this.selectedKeys();

    this.selection.set([
      ...this.selection(),
      ...rows.filter((row) => !alreadySelected.has(this.rowKey()(row))),
    ]);
  }

  protected isExpanded(row: T): boolean {
    return this.expandedKeys().has(this.rowKey()(row));
  }

  protected toggleExpand(row: T): void {
    const key = this.rowKey()(row);

    this.expandedKeys.update((keys) => {
      const next = new Set(keys);

      if (!next.delete(key)) {
        next.add(key);
      }

      return next;
    });
  }

  /** Ties the expand button to the row it reveals, for `aria-controls`. */
  protected expansionId(index: number): string {
    return `${this.tableId}-expansion-${index}`;
  }
}
