import {
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { Button } from '../button/button';

/**
 * The bar above a table. Holds search / filter / settings normally, and switches
 * to a batch action bar while rows are selected.
 *
 * The two content slots are both explicitly selected rather than one being a
 * catch-all `<ng-content>`. A bare `<ng-content>` claims every projected node, so
 * any selective slot declared after it would silently receive nothing.
 */
@Component({
  selector: 'nine-am-table-toolbar',
  encapsulation: ViewEncapsulation.None,
  imports: [Button],
  styleUrl: './table-toolbar.scss',
  host: { class: 'nine-am-toolbar' },
  template: `
    <div class="nine-am-toolbar__default" [class.nine-am-toolbar__default--dimmed]="active()">
      <ng-content select="[nineAmToolbarActions]" />
    </div>

    <!-- Slides over the default row rather than pushing it aside, so the table
         below never shifts when a row is selected. -->
    <div
      class="nine-am-toolbar__batch"
      [class.nine-am-toolbar__batch--active]="active()"
      [attr.aria-hidden]="!active()"
    >
      <p class="nine-am-toolbar__count">{{ countLabel()(selectedCount()) }}</p>

      <div class="nine-am-toolbar__batch-actions">
        <ng-content select="[nineAmBatchActions]" />
      </div>

      <button
        nineAmButton
        kind="ghost"
        size="sm"
        class="nine-am-toolbar__cancel"
        [disabled]="!active()"
        (click)="cancelled.emit()"
      >
        {{ cancelLabel() }}
      </button>
    </div>
  `,
})
export class TableToolbar {
  readonly selectedCount = input(0);

  /**
   * A function, not a string, because pluralization is not something a design
   * system can guess — and Serbian needs three forms where English needs two.
   */
  readonly countLabel = input<(count: number) => string>(
    (count) => `${count} ${count === 1 ? 'item' : 'items'} selected`,
  );

  readonly cancelLabel = input('Cancel');

  readonly cancelled = output<void>();

  protected readonly active = computed(() => this.selectedCount() > 0);
}
