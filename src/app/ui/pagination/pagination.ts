import {
  booleanAttribute,
  Component,
  computed,
  input,
  model,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';
import type { FieldSize } from '../field/field-types';

let nextId = 0;

/**
 * Carbon pagination. Deliberately a sibling of the table rather than part of it:
 * the caller owns the slice, so the same `ds-table` serves a client-side array and
 * a server-paged endpoint with no mode switch.
 *
 * `page` is 1-based, matching what it displays. Converting to an offset is the
 * caller's job and is one line: `(page - 1) * pageSize`.
 */
@Component({
  selector: 'ds-pagination',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  host: { '[class]': 'hostClass()' },
})
export class Pagination {
  /**
   * How many items there are in total, or `null` when nobody knows.
   *
   * Carbon spells the second case as a separate `pagesUnknown` boolean sitting
   * next to `totalItems`. `null` says the same thing and makes the contradiction
   * unrepresentable — there is no way to claim 4,000 items and no total at the
   * same time, and no question of which one wins.
   *
   * Unknown is the normal case for a cursor-paged API, and it is the reason
   * `isLastPage` exists.
   */
  readonly total = input.required<number | null>();

  /**
   * Only consulted when `total` is `null`. With no count there is nothing to
   * compare the page against, so the only way to know the end has been reached
   * is for the caller — who just got a short page or an empty cursor — to say so.
   */
  readonly isLastPage = input(false, { transform: booleanAttribute });

  /** 1-based. */
  readonly page = model(1);
  readonly pageSize = model(10);

  /** Carbon's own default set. */
  readonly pageSizes = input<readonly number[]>([10, 20, 30, 40, 50]);

  /** Matches the field scale everything else here uses. */
  readonly size = input<FieldSize>('md');

  /** Greys the whole control out — for while a page is loading. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly itemsPerPageLabel = input('Items per page:');
  readonly previousLabel = input('Previous page');
  readonly nextLabel = input('Next page');
  readonly pageSelectLabel = input('Page number');

  // Functions rather than strings so callers can localize and pluralize. A design
  // system cannot know that Serbian needs three plural forms.
  readonly rangeLabel = input<(first: number, last: number, total: number) => string>(
    (first, last, total) => `${first}–${last} of ${total} items`,
  );

  /** The same line with the part we don't know left out, rather than faked. */
  readonly rangeLabelUnknown = input<(first: number, last: number) => string>(
    (first, last) => `${first}–${last} items`,
  );

  readonly pageCountLabel = input<(pages: number) => string>(
    (pages) => `of ${pages} ${pages === 1 ? 'page' : 'pages'}`,
  );

  /** Shown in place of the page select when the page count is unknown. */
  readonly pageLabel = input<(page: number) => string>((page) => `Page ${page}`);

  protected readonly sizeId = `ds-pagination-size-${nextId}`;
  protected readonly pageId = `ds-pagination-page-${nextId++}`;

  protected readonly countKnown = computed(() => this.total() !== null);

  // Never below 1, so an empty table still reads "1 of 1 page" rather than "of 0".
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil((this.total() ?? 0) / this.pageSize())),
  );

  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.pageCount() }, (_, index) => index + 1),
  );

  protected readonly firstItem = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );

  protected readonly lastItem = computed(() => {
    const end = this.page() * this.pageSize();
    const total = this.total();

    // With no total there is nothing to clamp against. The last page may show
    // fewer than a full page of rows, and this will overstate it by up to
    // pageSize - 1 — which is exactly why `rangeLabelUnknown` does not print a
    // total it would be inventing.
    return total === null ? end : Math.min(end, total);
  });

  protected readonly onLastPage = computed(() =>
    this.countKnown() ? this.page() >= this.pageCount() : this.isLastPage(),
  );

  protected readonly hostClass = computed(() => {
    const classes = ['ds-pagination', `ds-pagination--${this.size()}`];

    if (this.disabled()) {
      classes.push('ds-pagination--disabled');
    }

    return classes.join(' ');
  });

  protected goTo(page: number): void {
    const floor = Math.max(page, 1);

    this.page.set(this.countKnown() ? Math.min(floor, this.pageCount()) : floor);
  }

  protected onPageChange(event: Event): void {
    this.goTo(Number((event.target as HTMLSelectElement).value));
  }

  protected onPageSizeChange(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));

    // Back to the first page. Staying put would land the user past the end of a
    // now-shorter list, on a page that renders empty.
    this.page.set(1);
  }
}
