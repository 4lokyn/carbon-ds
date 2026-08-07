import { nextSort, sortRows } from './table-sort';
import type { DsColumn } from './table-types';

interface Row {
  readonly name: string;
  readonly size: number | null;
  readonly rank: string;
}

const nameColumn: DsColumn<Row> = { key: 'name', header: 'Name', sortable: true };
const sizeColumn: DsColumn<Row> = { key: 'size', header: 'Size', sortable: true };
const plainColumn: DsColumn<Row> = { key: 'rank', header: 'Rank' };

const columns = [nameColumn, sizeColumn, plainColumn];

const row = (name: string, size: number | null, rank = 'a'): Row => ({
  name,
  size,
  rank,
});

const names = (rows: readonly Row[]): string[] => rows.map((r) => r.name);
const sizes = (rows: readonly Row[]): (number | null)[] =>
  rows.map((r) => r.size);

describe('nextSort', () => {
  it('cycles unsorted -> ascending -> descending -> unsorted', () => {
    const first = nextSort(null, 'name');
    expect(first).toEqual({ column: 'name', direction: 'asc' });

    const second = nextSort(first, 'name');
    expect(second).toEqual({ column: 'name', direction: 'desc' });

    // The third click must return to unsorted, otherwise there is no way back to
    // the order the server sent.
    expect(nextSort(second, 'name')).toBeNull();
  });

  it('restarts at ascending when moving to a different column', () => {
    expect(nextSort({ column: 'size', direction: 'desc' }, 'name')).toEqual({
      column: 'name',
      direction: 'asc',
    });
  });
});

describe('sortRows', () => {
  it('returns the input untouched when there is no sort', () => {
    const rows = [row('b', 1), row('a', 2)];

    expect(sortRows(rows, columns, null)).toBe(rows);
  });

  it('does not mutate the input array', () => {
    const rows = [row('b', 1), row('a', 2)];
    const snapshot = names(rows);

    sortRows(rows, columns, { column: 'name', direction: 'asc' });

    expect(names(rows)).toEqual(snapshot);
  });

  it('ignores sort state pointing at a column that is gone', () => {
    const rows = [row('b', 1), row('a', 2)];

    expect(sortRows(rows, columns, { column: 'removed', direction: 'asc' })).toBe(
      rows,
    );
  });

  it('ignores a column that is not marked sortable', () => {
    const rows = [row('b', 1, 'z'), row('a', 2, 'a')];

    expect(sortRows(rows, columns, { column: 'rank', direction: 'asc' })).toBe(
      rows,
    );
  });

  it('sorts numbers numerically rather than lexically', () => {
    const rows = [row('a', 10), row('b', 9), row('c', 2)];

    const sorted = sortRows(rows, columns, {
      column: 'size',
      direction: 'asc',
    });

    // Lexical ordering would put 10 before 2 and 9.
    expect(sizes(sorted)).toEqual([2, 9, 10]);
  });

  it('sorts strings with natural number ordering', () => {
    const rows = [row('item 10', 1), row('item 9', 1), row('item 2', 1)];

    const sorted = sortRows(rows, columns, {
      column: 'name',
      direction: 'asc',
    });

    expect(names(sorted)).toEqual(['item 2', 'item 9', 'item 10']);
  });

  it('keeps empty values last in BOTH directions', () => {
    const rows = [row('a', null), row('b', 5), row('c', 1)];

    expect(
      sizes(sortRows(rows, columns, { column: 'size', direction: 'asc' })),
    ).toEqual([1, 5, null]);

    // The point of baking direction into the comparator: a missing reading is not
    // "the largest value", so it must not float to the top on a descending sort.
    expect(
      sizes(sortRows(rows, columns, { column: 'size', direction: 'desc' })),
    ).toEqual([5, 1, null]);
  });

  it('treats an empty string as empty, not as the smallest string', () => {
    const rows = [row('', 1), row('b', 1), row('a', 1)];

    expect(
      names(sortRows(rows, columns, { column: 'name', direction: 'asc' })),
    ).toEqual(['a', 'b', '']);
  });

  it('uses a custom comparator when the column supplies one', () => {
    const ranked: DsColumn<Row> = {
      key: 'rank',
      header: 'Rank',
      sortable: true,
      // Deliberately the reverse of alphabetical, to prove it is really used.
      compare: (a, b) => b.rank.localeCompare(a.rank),
    };

    const rows = [row('a', 1, 'a'), row('b', 1, 'b'), row('c', 1, 'c')];

    expect(
      names(sortRows(rows, [ranked], { column: 'rank', direction: 'asc' })),
    ).toEqual(['c', 'b', 'a']);
  });

  it('sorts on sortBy in preference to value and key', () => {
    const column: DsColumn<Row> = {
      key: 'name',
      header: 'Name',
      sortable: true,
      value: () => 'same for everyone',
      sortBy: (r) => r.size,
    };

    const rows = [row('a', 3), row('b', 1), row('c', 2)];

    expect(
      names(sortRows(rows, [column], { column: 'name', direction: 'asc' })),
    ).toEqual(['b', 'c', 'a']);
  });

  it('judges emptiness from sortBy, not from the formatted value', () => {
    // Mirrors the CPU column in the demo: displays an em dash for a missing
    // reading, which is not an empty string, so emptiness has to come from sortBy.
    const column: DsColumn<Row> = {
      key: 'size',
      header: 'CPU',
      sortable: true,
      value: (r) => (r.size === null ? '—' : `${r.size}%`),
      sortBy: (r) => r.size,
    };

    const rows = [row('a', null), row('b', 5), row('c', 1)];

    expect(
      sizes(sortRows(rows, [column], { column: 'size', direction: 'asc' })),
    ).toEqual([1, 5, null]);
    expect(
      sizes(sortRows(rows, [column], { column: 'size', direction: 'desc' })),
    ).toEqual([5, 1, null]);
  });

  it('never hands an empty value to a custom comparator', () => {
    // Regression: `(a.x ?? NaN) - (b.x ?? NaN)` is the natural way to write a
    // nullable numeric comparator, and a NaN result makes Array.sort emit
    // arbitrary order for the ENTIRE array. Emptiness is settled before `compare`
    // runs, so this comparator only ever sees numbers.
    const naive: DsColumn<Row> = {
      key: 'size',
      header: 'Size',
      sortable: true,
      compare: (a, b) => (a.size ?? Number.NaN) - (b.size ?? Number.NaN),
    };

    const rows = [
      row('a', 10),
      row('b', null),
      row('c', 2),
      row('d', null),
      row('e', 9),
      row('f', 1),
    ];

    expect(
      sizes(sortRows(rows, [naive], { column: 'size', direction: 'asc' })),
    ).toEqual([1, 2, 9, 10, null, null]);
    expect(
      sizes(sortRows(rows, [naive], { column: 'size', direction: 'desc' })),
    ).toEqual([10, 9, 2, 1, null, null]);
  });

  it('clamps a NaN comparator result instead of letting it scramble the array', () => {
    const broken: DsColumn<Row> = {
      key: 'size',
      header: 'Size',
      sortable: true,
      compare: () => Number.NaN,
    };

    const rows = [row('a', 3), row('b', 1), row('c', 2)];

    // Every pair reads as equal, so a stable sort leaves the input order and,
    // crucially, loses nothing.
    expect(
      names(sortRows(rows, [broken], { column: 'size', direction: 'asc' })),
    ).toEqual(['a', 'b', 'c']);
  });

  it('reads a value function in preference to the key', () => {
    const reversed: DsColumn<Row> = {
      key: 'name',
      header: 'Name',
      sortable: true,
      value: (r) => [...r.name].reverse().join(''),
    };

    const rows = [row('ba', 1), row('ab', 1)];

    // 'ab' -> 'ba', 'ba' -> 'ab', so ascending on the reversed value flips them.
    expect(
      names(sortRows(rows, [reversed], { column: 'name', direction: 'asc' })),
    ).toEqual(['ba', 'ab']);
  });
});
