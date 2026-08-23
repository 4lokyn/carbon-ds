import type { DsColumn, DsSort, SortDirection } from './table-types';

type CellValue = string | number | null | undefined;

// `numeric: true` so 'item 2' sorts before 'item 10'. 'base' sensitivity so case
// and accents don't split otherwise-equal values. Undefined locale means the
// user's, which is the point — 'Č' belongs after 'C' in Serbian and this is the
// only way to get that right without hardcoding a locale.
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/** Reads the property named by `key`. The fallback when nothing else is given. */
function keyReader<T>(column: DsColumn<T>): (row: T) => CellValue {
  // The cast is the price of letting `key` be a plain string rather than
  // `keyof T` — see the note on DsColumn.key.
  return (row) => (row as Record<string, unknown>)[column.key] as CellValue;
}

/** What the cell renders. */
export function displayAccessorFor<T>(column: DsColumn<T>): (row: T) => CellValue {
  return column.value ?? keyReader(column);
}

/**
 * What the cell sorts on, and what emptiness is judged from.
 *
 * Falls back through `sortBy -> value -> key`, so a column that displays a
 * formatted string and gives no `sortBy` sorts on that string. That is usually
 * fine for text and wrong for anything formatted — hence `sortBy`.
 */
export function sortAccessorFor<T>(column: DsColumn<T>): (row: T) => CellValue {
  return column.sortBy ?? column.value ?? keyReader(column);
}

/** Kept for callers that only care about display. */
export const accessorFor = displayAccessorFor;

function isEmpty(value: CellValue): boolean {
  return value === null || value === undefined || value === '';
}

/** Builds a comparator with the direction already baked in. */
export function comparatorFor<T>(
  column: DsColumn<T>,
  direction: SortDirection,
): (a: T, b: T) => number {
  const sign = direction === 'asc' ? 1 : -1;
  const read = sortAccessorFor(column);
  const custom = column.compare;

  return (a, b) => {
    const av = read(a);
    const bv = read(b);

    // Emptiness is settled here, before any custom comparator runs, and without
    // the sign applied — so empties stay last in both directions. This is also
    // why a custom `compare` cannot express "empties last" itself: the table
    // would flip whatever it returned.
    if (isEmpty(av)) {
      return isEmpty(bv) ? 0 : 1;
    }
    if (isEmpty(bv)) {
      return -1;
    }

    if (custom) {
      const result = custom(a, b);

      // A NaN from a comparator makes Array.sort emit arbitrary order for the
      // WHOLE array — one bad pair corrupts everything. `(a.x ?? NaN) - (b.x ?? NaN)`
      // is the easy way to write that bug, so clamp instead of propagating.
      return Number.isNaN(result) ? 0 : result * sign;
    }

    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * sign;
    }

    return collator.compare(String(av), String(bv)) * sign;
  };
}

/** Returns a sorted copy. Never mutates the input — it may be a signal's value. */
export function sortRows<T>(
  rows: readonly T[],
  columns: readonly DsColumn<T>[],
  sort: DsSort | null,
): readonly T[] {
  if (!sort) {
    return rows;
  }

  const column = columns.find((candidate) => candidate.key === sort.column);

  // Sort state can outlive the column it points at — a saved view, a column the
  // user turned off. Rendering unsorted beats throwing.
  if (!column || column.sortable !== true) {
    return rows;
  }

  return [...rows].sort(comparatorFor(column, sort.direction));
}

/**
 * The header click cycle: unsorted -> ascending -> descending -> unsorted.
 *
 * The third state matters. Without it there is no way back to the order the
 * server sent, which for a lot of lists is itself meaningful (most recent first).
 */
export function nextSort(current: DsSort | null, key: string): DsSort | null {
  if (current === null || current.column !== key) {
    return { column: key, direction: 'asc' };
  }

  if (current.direction === 'asc') {
    return { column: key, direction: 'desc' };
  }

  return null;
}
