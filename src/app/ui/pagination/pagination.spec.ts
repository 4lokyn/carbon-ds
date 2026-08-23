import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

@Component({
  imports: [Pagination],
  template: `
    <nine-am-pagination
      [total]="total()"
      [isLastPage]="isLastPage()"
      [(page)]="page"
      [(pageSize)]="pageSize"
    />
  `,
})
class Host {
  readonly total = signal<number | null>(103);
  readonly isLastPage = signal(false);
  readonly page = signal(1);
  readonly pageSize = signal(10);
}

describe('Pagination', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      ranges: () =>
        Array.from(el.querySelectorAll('.nine-am-pagination__range')).map((e) =>
          e.textContent?.trim(),
        ),
      pageSelect: () =>
        el.querySelector('.nine-am-pagination__select[id*="-page-"]') as HTMLSelectElement | null,
      sizeSelect: () =>
        el.querySelector('.nine-am-pagination__select[id*="-size-"]') as HTMLSelectElement,
      nav: () => Array.from(el.querySelectorAll<HTMLButtonElement>('.nine-am-pagination__nav')),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('reads out the range and the page count when the total is known', () => {
    const { ranges } = setup();

    expect(ranges()[0]).toBe('1–10 of 103 items');
    expect(ranges()[1]).toBe('of 11 pages');
  });

  it('still says "of 0 items" for an empty set', () => {
    const { ranges, apply, host } = setup();

    apply(() => host.total.set(0));

    // A total of 0 is a *known* total. Falling through to the unknown-count
    // wording here would tell the user we had lost count of an empty table.
    expect(ranges()[0]).toBe('0–0 of 0 items');
  });

  it('drops the page select when the count is unknown', () => {
    const { pageSelect, ranges, apply, host } = setup();

    apply(() => host.total.set(null));

    // A select of pages we cannot enumerate would be a control that lies.
    expect(pageSelect()).toBeNull();
    expect(ranges()[0]).toBe('1–10 items');
    expect(ranges()[1]).toBe('Page 1');
  });

  it('leaves Next enabled until the caller says it is the last page', () => {
    const { nav, apply, host } = setup();

    apply(() => host.total.set(null));

    const next = () => nav()[1];
    expect(next().disabled).toBe(false);

    // With no count there is nothing to compare the page against — only the
    // caller, who just got a short page, knows.
    apply(() => host.isLastPage.set(true));
    expect(next().disabled).toBe(true);
  });

  it('does not clamp the page when there is no count to clamp against', () => {
    const { nav, apply, host } = setup();

    apply(() => host.total.set(null));

    nav()[1].click();
    expect(host.page()).toBe(2);
  });

  it('returns to the first page when the page size changes', () => {
    const { sizeSelect, apply, host } = setup();

    apply(() => host.page.set(6));

    const select = sizeSelect();
    select.value = '50';
    select.dispatchEvent(new Event('change'));

    // Page 6 of a 50-per-page list is past the end of 103 items, and would
    // render empty — staying put is the bug this guards.
    expect(host.pageSize()).toBe(50);
    expect(host.page()).toBe(1);
  });
});
