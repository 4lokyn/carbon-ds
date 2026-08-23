import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Table } from './table';
import type { NineAmColumn, NineAmSort } from './table-types';

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

    <nine-am-table
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
  readonly sort = signal<NineAmSort | null>(null);
  readonly selection = signal<readonly Widget[]>([]);

  readonly rowKey = (row: Widget): string => row.id;

  readonly columns: readonly NineAmColumn<Widget>[] = [
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
    return Array.from(el.querySelectorAll('tbody tr:not(.nine-am-table__row--expansion)')).map(
      (row) => row.querySelectorAll('td')[2]?.textContent?.trim() ?? '',
    );
  }

  it('renders a visually hidden caption as the accessible name', () => {
    const { el } = setup();

    expect(el.querySelector('caption')?.textContent?.trim()).toBe('Widgets');
    expect(el.querySelector('caption')?.className).toContain('nine-am-visually-hidden');
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

    const selectAll = el.querySelector('thead input[type="checkbox"]') as HTMLInputElement;

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

    const selectAll = el.querySelector('thead input[type="checkbox"]') as HTMLInputElement;

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
    const firstRowCheckbox = el.querySelector('tbody input[type="checkbox"]') as HTMLInputElement;
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

    const expand = el.querySelector('tbody .nine-am-table__expand') as HTMLButtonElement;

    expect(expand.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.nine-am-table__row--expansion')).toBeNull();

    expand.click();
    fixture.detectChanges();

    expect(expand.getAttribute('aria-expanded')).toBe('true');

    const expansion = el.querySelector('.nine-am-table__row--expansion');
    expect(expansion).toBeTruthy();

    // aria-controls has to resolve to the row that actually appeared.
    expect(expand.getAttribute('aria-controls')).toBe(expansion?.id);
    expect(expansion?.textContent?.trim()).toBe('detail for carbon');
  });

  it('spans the empty row across every column, control columns included', () => {
    const { fixture, host, el } = setup();

    host.rows.set([]);
    fixture.detectChanges();

    const emptyCell = el.querySelector('.nine-am-table__cell--empty');

    // 3 data columns + select + expand
    expect(emptyCell?.getAttribute('colspan')).toBe('5');
  });

  it('renders skeleton rows instead of data while loading', () => {
    @Component({
      imports: [Table],
      template: `
        <nine-am-table
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
      readonly columns: readonly NineAmColumn<Widget>[] = [{ key: 'name', header: 'Name' }];
    }

    const fixture = TestBed.createComponent(LoadingHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.nine-am-table__row--skeleton').length).toBe(3);
    expect(el.textContent).not.toContain('carbon');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Loading Widgets');
  });
});

/**
 * jsdom ships a `matchMedia` that always reports `matches: false`, so the fold
 * is unreachable without standing in for it. This is the whole of the stub: a
 * controllable answer and a listener list nobody uses, because the component
 * reads `matches` once when the query is created.
 */
function stubMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({
      matches,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

interface Plan {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly seats: number;
}

@Component({
  imports: [Table],
  template: `
    <nine-am-table
      caption="Plans"
      selectable
      [columns]="columns"
      [rows]="rows"
      [rowKey]="rowKey"
      [foldBelow]="foldBelow()"
      [foldTitle]="foldTitle()"
      [(selection)]="selection"
    />
  `,
})
class FoldHost {
  readonly foldBelow = signal<'md' | null>('md');
  readonly foldTitle = signal<string | undefined>(undefined);
  readonly selection = signal<readonly Plan[]>([]);

  readonly rows: readonly Plan[] = [
    { id: 'a', name: 'api-gateway', region: 'eu-central', seats: 6 },
    { id: 'b', name: 'billing', region: 'us-east', seats: 2 },
  ];

  readonly columns: readonly NineAmColumn<Plan>[] = [
    { key: 'name', header: 'Name' },
    { key: 'region', header: 'Region' },
    { key: 'seats', header: 'Seats' },
  ];

  readonly rowKey = (row: Plan) => row.id;
}

describe('Table, folded', () => {
  function setup(matches: boolean) {
    stubMatchMedia(matches);

    const fixture = TestBed.createComponent(FoldHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      table: () => el.querySelector('table'),
      items: () => Array.from(el.querySelectorAll('li[nineamaccordionitem], li')),
      headings: () => Array.from(el.querySelectorAll('.nine-am-accordion__heading')),
      labels: () =>
        Array.from(el.querySelectorAll('.nine-am-table__field-label')).map((n) =>
          n.textContent?.trim(),
        ),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('stays a table when the viewport is wide enough', () => {
    const { table, headings } = setup(false);

    expect(table()).not.toBeNull();
    expect(headings()).toHaveLength(0);
  });

  it('stays a table when nothing asked it to fold', () => {
    const { table, apply, host } = setup(true);

    apply(() => host.foldBelow.set(null));

    // The flag is the whole of it. A table that reshapes itself without being
    // asked is a surprise, and sideways scrolling suits plenty of them.
    expect(table()).not.toBeNull();
  });

  it('becomes one accordion item per row', () => {
    const { table, headings } = setup(true);

    expect(table()).toBeNull();
    expect(headings()).toHaveLength(2);
    expect(headings()[0].textContent?.trim()).toBe('api-gateway');
  });

  it('puts every other column under the heading, and follows foldTitle', () => {
    const { labels, apply, host, headings } = setup(true);

    expect(labels()).toEqual(['Region', 'Seats', 'Region', 'Seats']);

    apply(() => host.foldTitle.set('region'));

    expect(headings()[0].textContent?.trim()).toBe('eu-central');
    expect(labels()).toEqual(['Name', 'Seats', 'Name', 'Seats']);
  });

  it('offers select-all above the list, where the header row would have been', () => {
    // Stubbed here rather than leaning on a previous test having done it —
    // a spec that passes because of the one before it is not a spec.
    stubMatchMedia(true);

    const fixture = TestBed.createComponent(FoldHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const selectAll = el.querySelector<HTMLInputElement>('.nine-am-table__folded-select-all input');

    // Above the accordion, not inside it: the accordion renders a <ul>, and a
    // <ul> may only own <li> elements.
    expect(selectAll).not.toBeNull();
    expect(el.querySelector('.nine-am-accordion')?.contains(selectAll)).toBe(false);

    selectAll!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selection().map((row) => row.id)).toEqual(['a', 'b']);

    selectAll!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selection()).toEqual([]);
  });

  it('shows the select-all label, which no header row is left to explain', () => {
    const { apply, host } = setup(true);

    const label = document.querySelector('.nine-am-table__folded-select-all label');

    expect(label?.textContent?.trim()).toBe('Select all rows on this page');

    apply(() => host.foldBelow.set(null));

    // And it is gone with the fold, because the header cell takes over.
    expect(document.querySelector('.nine-am-table__folded-select-all')).toBeNull();
  });

  it('keeps selection, with the checkbox outside the heading button', () => {
    const { headings, host } = setup(true);

    const checkbox = (document.querySelectorAll('.nine-am-accordion__lead input')[0] ??
      null) as HTMLInputElement | null;

    // Load-bearing, not tidiness: a `<button>` may not contain a checkbox. Put
    // it inside the heading and the markup is invalid and the checkbox is
    // unreachable by keyboard.
    expect(checkbox).not.toBeNull();
    expect(headings()[0].contains(checkbox)).toBe(false);

    checkbox!.click();

    expect(host.selection().map((row) => row.id)).toEqual(['a']);
  });
});
