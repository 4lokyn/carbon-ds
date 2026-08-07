import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Table } from './table';
import type { DsColumn, DsSort } from './table-types';

interface Widget {
  readonly id: string;
  readonly name: string;
  readonly qty: number;
}

const WIDGETS: readonly Widget[] = [
  { id: 'c', name: 'carbon', qty: 3 },
  { id: 'a', name: 'argon', qty: 1 },
  { id: 'b', name: 'boron', qty: 2 },
];

@Component({
  imports: [Table],
  template: `
    <ng-template #detail let-row>detail for {{ row.name }}</ng-template>

    <ds-table
      caption="Widgets"
      selectable
      [columns]="columns"
      [rows]="rows()"
      [rowKey]="rowKey"
      [(sort)]="sort"
      [(selection)]="selection"
      [expandedContent]="detail"
    />
  `,
})
class Host {
  readonly rows = signal(WIDGETS);
  readonly sort = signal<DsSort | null>(null);
  readonly selection = signal<readonly Widget[]>([]);

  readonly rowKey = (row: Widget): string => row.id;

  readonly columns: readonly DsColumn<Widget>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'qty', header: 'Qty', sortable: true, align: 'end' },
    { key: 'note', header: 'Note', value: () => 'static' },
  ];
}

describe('Table', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      el,
      headers: () => Array.from(el.querySelectorAll('th')),
    };
  }

  function nameColumnText(el: HTMLElement): string[] {
    return Array.from(
      el.querySelectorAll('tbody tr:not(.ds-table__row--expansion)'),
    ).map((row) => row.querySelectorAll('td')[2]?.textContent?.trim() ?? '');
  }

  it('renders a visually hidden caption as the accessible name', () => {
    const { el } = setup();

    expect(el.querySelector('caption')?.textContent?.trim()).toBe('Widgets');
    expect(el.querySelector('caption')?.className).toContain(
      'ds-visually-hidden',
    );
  });

  it('marks sortable headers with aria-sort=none and leaves others bare', () => {
    const { headers } = setup();

    // [expand, select, Name, Qty, Note]
    expect(headers()[2].getAttribute('aria-sort')).toBe('none');
    expect(headers()[3].getAttribute('aria-sort')).toBe('none');
    expect(headers()[4].hasAttribute('aria-sort')).toBe(false);
  });

  it('cycles aria-sort and the rendered order as the header is clicked', () => {
    const { fixture, el, headers } = setup();

    const nameHeader = headers()[2];
    const button = nameHeader.querySelector('button') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
    expect(nameColumnText(el)).toEqual(['argon', 'boron', 'carbon']);

    button.click();
    fixture.detectChanges();
    expect(nameHeader.getAttribute('aria-sort')).toBe('descending');
    expect(nameColumnText(el)).toEqual(['carbon', 'boron', 'argon']);

    button.click();
    fixture.detectChanges();
    expect(nameHeader.getAttribute('aria-sort')).toBe('none');
    // Back to the order the rows were supplied in.
    expect(nameColumnText(el)).toEqual(['carbon', 'argon', 'boron']);
  });

  it('falls back to reading the key when a column has no value function', () => {
    const { el } = setup();

    const firstRow = el.querySelectorAll('tbody tr')[0];
    const cells = firstRow.querySelectorAll('td');

    // [expand, select, name, qty, note]
    expect(cells[2].textContent?.trim()).toBe('carbon');
    expect(cells[3].textContent?.trim()).toBe('3');
    expect(cells[4].textContent?.trim()).toBe('static');
  });

  it('puts the select-all checkbox in the indeterminate state for a partial selection', () => {
    const { fixture, host, el } = setup();

    const selectAll = el.querySelector(
      'thead input[type="checkbox"]',
    ) as HTMLInputElement;

    expect(selectAll.indeterminate).toBe(false);
    expect(selectAll.checked).toBe(false);

    host.selection.set([WIDGETS[0]]);
    fixture.detectChanges();

    expect(selectAll.indeterminate).toBe(true);
    expect(selectAll.checked).toBe(false);

    host.selection.set([...WIDGETS]);
    fixture.detectChanges();

    expect(selectAll.indeterminate).toBe(false);
    expect(selectAll.checked).toBe(true);
  });

  it('select-all toggles every row, and toggles them all back off', () => {
    const { fixture, host, el } = setup();

    const selectAll = el.querySelector(
      'thead input[type="checkbox"]',
    ) as HTMLInputElement;

    selectAll.click();
    fixture.detectChanges();
    expect(host.selection().length).toBe(3);

    selectAll.click();
    fixture.detectChanges();
    expect(host.selection().length).toBe(0);
  });

  it('keeps the selection when the rows are re-sorted', () => {
    const { fixture, host, el } = setup();

    // Select 'carbon', which is first while unsorted and last once sorted asc.
    const firstRowCheckbox = el.querySelector(
      'tbody input[type="checkbox"]',
    ) as HTMLInputElement;
    firstRowCheckbox.click();
    fixture.detectChanges();

    expect(host.selection().map((w) => w.id)).toEqual(['c']);

    host.sort.set({ column: 'name', direction: 'asc' });
    fixture.detectChanges();

    // Still exactly one selected row, and still the same one — this is what
    // keying by rowKey buys over tracking by index.
    expect(host.selection().map((w) => w.id)).toEqual(['c']);

    const checked = Array.from(
      el.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]'),
    ).filter((input) => input.checked);

    expect(checked.length).toBe(1);
  });

  it('keeps the selection when the same rows arrive as new object identities', () => {
    const { fixture, host } = setup();

    host.selection.set([WIDGETS[1]]);
    fixture.detectChanges();

    // A refetch: same data, fresh objects. Reference equality would lose this.
    host.rows.set(WIDGETS.map((widget) => ({ ...widget })));
    fixture.detectChanges();

    const checkedIds = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'),
    )
      .filter((row) => row.querySelector<HTMLInputElement>('input')?.checked)
      .map((row) => row.querySelectorAll('td')[2]?.textContent?.trim());

    expect(checkedIds).toEqual(['argon']);
  });

  it('wires the expand button to the row it reveals', () => {
    const { fixture, el } = setup();

    const expand = el.querySelector(
      'tbody .ds-table__expand',
    ) as HTMLButtonElement;

    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.ds-table__row--expansion')).toBeNull();

    expand.click();
    fixture.detectChanges();

    expect(expand.getAttribute('aria-expanded')).toBe('true');

    const expansion = el.querySelector('.ds-table__row--expansion');
    expect(expansion).toBeTruthy();

    // aria-controls has to resolve to the row that actually appeared.
    expect(expand.getAttribute('aria-controls')).toBe(expansion?.id);
    expect(expansion?.textContent?.trim()).toBe('detail for carbon');
  });

  it('spans the empty row across every column, control columns included', () => {
    const { fixture, host, el } = setup();

    host.rows.set([]);
    fixture.detectChanges();

    const emptyCell = el.querySelector('.ds-table__cell--empty');

    // 3 data columns + select + expand
    expect(emptyCell?.getAttribute('colspan')).toBe('5');
  });

  it('renders skeleton rows instead of data while loading', () => {
    @Component({
      imports: [Table],
      template: `
        <ds-table
          loading
          caption="Widgets"
          [skeletonRows]="3"
          [columns]="columns"
          [rows]="rows"
          [rowKey]="rowKey"
        />
      `,
    })
    class LoadingHost {
      readonly rows = WIDGETS;
      readonly rowKey = (row: Widget): string => row.id;
      readonly columns: readonly DsColumn<Widget>[] = [
        { key: 'name', header: 'Name' },
      ];
    }

    const fixture = TestBed.createComponent(LoadingHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.ds-table__row--skeleton').length).toBe(3);
    expect(el.textContent).not.toContain('carbon');
    expect(el.querySelector('[role="status"]')?.textContent).toContain(
      'Loading Widgets',
    );
  });
});
