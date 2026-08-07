import {
  Component,
  computed,
  input,
  model,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';

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
  styleUrl: './pagination.scss',
  host: { class: 'ds-pagination' },
  template: `
    <div class="ds-pagination__group">
      <label class="ds-pagination__label" [for]="sizeId">{{ itemsPerPageLabel() }}</label>

      <div class="ds-pagination__select-wrap">
        <select
          class="ds-pagination__select"
          [id]="sizeId"
          (change)="onPageSizeChange($event)"
        >
          @for (size of pageSizes(); track size) {
            <option [value]="size" [selected]="size === pageSize()">{{ size }}</option>
          }
        </select>
        <ds-icon class="ds-pagination__select-icon" name="chevron-down" />
      </div>

      <span class="ds-pagination__range">{{ rangeLabel()(firstItem(), lastItem(), total()) }}</span>
    </div>

    <div class="ds-pagination__group">
      <div class="ds-pagination__select-wrap">
        <label class="ds-visually-hidden" [for]="pageId">{{ pageSelectLabel() }}</label>
        <select class="ds-pagination__select" [id]="pageId" (change)="onPageChange($event)">
          @for (candidate of pageNumbers(); track candidate) {
            <option [value]="candidate" [selected]="candidate === page()">{{ candidate }}</option>
          }
        </select>
        <ds-icon class="ds-pagination__select-icon" name="chevron-down" />
      </div>

      <span class="ds-pagination__range">{{ pageCountLabel()(pageCount()) }}</span>

      <button
        class="ds-pagination__nav"
        type="button"
        [attr.aria-label]="previousLabel()"
        [disabled]="page() <= 1"
        (click)="goTo(page() - 1)"
      >
        <ds-icon name="chevron-left" />
      </button>

      <button
        class="ds-pagination__nav"
        type="button"
        [attr.aria-label]="nextLabel()"
        [disabled]="page() >= pageCount()"
        (click)="goTo(page() + 1)"
      >
        <ds-icon name="chevron-right" />
      </button>
    </div>
  `,
})
export class Pagination {
  readonly total = input.required<number>();

  /** 1-based. */
  readonly page = model(1);
  readonly pageSize = model(10);

  readonly pageSizes = input<readonly number[]>([10, 20, 50]);

  readonly itemsPerPageLabel = input('Items per page:');
  readonly previousLabel = input('Previous page');
  readonly nextLabel = input('Next page');
  readonly pageSelectLabel = input('Page number');

  // Functions rather than strings so callers can localize and pluralize. A design
  // system cannot know that Serbian needs three plural forms.
  readonly rangeLabel = input<(first: number, last: number, total: number) => string>(
    (first, last, total) => `${first}–${last} of ${total} items`,
  );
  readonly pageCountLabel = input<(pages: number) => string>(
    (pages) => `of ${pages} ${pages === 1 ? 'page' : 'pages'}`,
  );

  protected readonly sizeId = `ds-pagination-size-${nextId}`;
  protected readonly pageId = `ds-pagination-page-${nextId++}`;

  // Never below 1, so an empty table still reads "1 of 1 page" rather than "of 0".
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.pageCount() }, (_, index) => index + 1),
  );

  protected readonly firstItem = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );

  protected readonly lastItem = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total()),
  );

  protected goTo(page: number): void {
    this.page.set(Math.min(Math.max(page, 1), this.pageCount()));
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
