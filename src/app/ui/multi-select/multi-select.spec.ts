import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MultiSelect, type MultiSelectOption } from './multi-select';

const OWNERS: readonly MultiSelectOption<string>[] = [
  { value: 'platform', label: 'platform' },
  { value: 'payments', label: 'payments' },
  { value: 'commerce', label: 'commerce' },
  { value: 'growth', label: 'growth' },
  { value: 'legacy', label: 'legacy', disabled: true },
];

@Component({
  imports: [MultiSelect],
  template: `
    <nine-am-multi-select
      label="Owners"
      selectAll
      [filterable]="filterable()"
      [options]="options"
      [(selected)]="selected"
    />
  `,
})
class Host {
  readonly options = OWNERS;
  readonly selected = signal<string[]>([]);
  readonly filterable = signal(true);
}

describe('MultiSelect', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    const open = () => {
      (el.querySelector('.nine-am-multi-select__field') as HTMLButtonElement).click();
      fixture.detectChanges();
    };

    return {
      fixture,
      host: fixture.componentInstance,
      open,
      rows: () =>
        Array.from(
          document.querySelectorAll(
            '.nine-am-multi-select__item:not(.nine-am-multi-select__item--select-all)',
          ),
        ),
      rowLabels: () =>
        Array.from(
          document.querySelectorAll(
            '.nine-am-multi-select__item:not(.nine-am-multi-select__item--select-all) .nine-am-multi-select__item-text',
          ),
        ).map((e) => e.textContent?.trim()),
      selectAllRow: () =>
        document.querySelector('.nine-am-multi-select__item--select-all') as HTMLElement,
      selectAllBox: () =>
        document.querySelector('.nine-am-multi-select__item--select-all input') as HTMLInputElement,
      type(text: string) {
        const filter = document.querySelector('.nine-am-multi-select__filter') as HTMLInputElement;
        filter.value = text;
        filter.dispatchEvent(new Event('input'));
        fixture.detectChanges();
      },
    };
  }

  it('shows a count rather than the values', () => {
    const { fixture, host } = setup();
    const el = fixture.nativeElement as HTMLElement;

    host.selected.set(['platform', 'growth']);
    fixture.detectChanges();

    // A field is one line; five labels are not.
    expect(el.querySelector('.nine-am-multi-select__count')?.textContent?.trim()).toBe('2');
  });

  it('picks and unpicks a row', () => {
    const { open, rows, host, fixture } = setup();

    open();
    (rows()[0] as HTMLElement).click();
    fixture.detectChanges();

    expect(host.selected()).toEqual(['platform']);

    (rows()[0] as HTMLElement).click();
    fixture.detectChanges();

    expect(host.selected()).toEqual([]);
  });

  it('leaves disabled rows out of select-all', () => {
    const { open, selectAllRow, host, fixture } = setup();

    open();
    selectAllRow().click();
    fixture.detectChanges();

    // Four selectable, one disabled. Selecting "all" must not pick something
    // the user is not allowed to pick.
    expect(host.selected()).toEqual(['platform', 'payments', 'commerce', 'growth']);
  });

  it('applies select-all to the filtered rows and nothing else', () => {
    const { open, type, rowLabels, selectAllRow, host, fixture } = setup();

    open();
    // 'a' catches platform, payments and legacy — the last of which is disabled,
    // so it tests the filter and the disabled rule at the same time.
    type('a');

    expect(rowLabels()).toEqual(['platform', 'payments', 'legacy']);

    selectAllRow().click();
    fixture.detectChanges();

    // The part implementations get wrong: the three rows the filter is hiding
    // were not quietly swept up.
    expect(host.selected()).toEqual(['platform', 'payments']);
  });

  it('does not drop hidden rows when clearing a filtered select-all', () => {
    const { open, type, selectAllRow, host, fixture } = setup();

    open();
    host.selected.set(['commerce']);
    fixture.detectChanges();

    type('a');
    selectAllRow().click();
    fixture.detectChanges();

    // `commerce` is invisible under this filter, and clearing the visible ones
    // must leave it exactly where it was.
    expect(host.selected()).toContain('commerce');

    selectAllRow().click();
    fixture.detectChanges();

    expect(host.selected()).toEqual(['commerce']);
  });

  it('reports a partial selection as indeterminate, not as checked', () => {
    const { open, selectAllBox, host, fixture } = setup();

    open();
    host.selected.set(['platform']);
    fixture.detectChanges();

    expect(selectAllBox().indeterminate).toBe(true);
    expect(selectAllBox().checked).toBe(false);

    host.selected.set(['platform', 'payments', 'commerce', 'growth']);
    fixture.detectChanges();

    // `checked` wins over `indeterminate` in the DOM, so the component has to
    // stop reporting partial once everything is in — leaving both on would
    // render a dash where a tick belongs.
    expect(selectAllBox().checked).toBe(true);
    expect(selectAllBox().indeterminate).toBe(false);
  });

  it('forgets the filter when it closes', () => {
    const { open, type, rowLabels, fixture } = setup();

    open();
    type('a');
    expect(rowLabels()).toHaveLength(3);

    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '.nine-am-multi-select__field',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    open();

    // A menu that opens already filtered by something typed minutes ago hides
    // options for a reason nobody can see.
    expect(rowLabels()).toHaveLength(5);
  });

  it('does not reorder while the menu is open', () => {
    const { open, rows, rowLabels, fixture } = setup();

    open();
    expect(rowLabels()[0]).toBe('platform');

    // Pick the third row. Under Carbon's default the list must hold still —
    // reordering here would slide a different option under the pointer, and the
    // next click would land on something the user never chose.
    (rows()[2] as HTMLElement).click();
    fixture.detectChanges();

    expect(rowLabels()).toEqual(['platform', 'payments', 'commerce', 'growth', 'legacy']);
  });

  it('lifts the selection to the top on reopen', () => {
    const { open, rows, rowLabels, fixture } = setup();

    open();
    (rows()[2] as HTMLElement).click();
    fixture.detectChanges();

    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '.nine-am-multi-select__field',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    open();

    expect(rowLabels()[0]).toBe('commerce');
  });
});

describe('MultiSelect with fixed ordering', () => {
  @Component({
    imports: [MultiSelect],
    template: `
      <nine-am-multi-select
        label="Owners"
        selectionFeedback="fixed"
        [options]="options"
        [(selected)]="selected"
      />
    `,
  })
  class FixedHost {
    readonly options = OWNERS;
    readonly selected = signal<string[]>(['growth']);
  }

  it('keeps the given order when the order carries meaning', () => {
    const fixture = TestBed.createComponent(FixedHost);
    fixture.detectChanges();

    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '.nine-am-multi-select__field',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const labels = Array.from(
      document.querySelectorAll(
        '.nine-am-multi-select__item:not(.nine-am-multi-select__item--select-all) .nine-am-multi-select__item-text',
      ),
    ).map((e) => e.textContent?.trim());

    expect(labels[0]).toBe('platform');
  });
});
