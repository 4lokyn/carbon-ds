import { Component, input, ViewEncapsulation } from '@angular/core';

/**
 * The title and one-line description above a table.
 *
 * Its own component rather than inputs on `nine-am-table-toolbar`, which is how
 * Carbon splits it too: a table can carry a heading with no toolbar under it,
 * and a toolbar with no heading over it. Folding the two together would make
 * every toolbar carry title markup it usually does not want.
 *
 * `heading` rather than `title` — `title` is a global HTML attribute, and an
 * input by that name lands on the host element as a browser tooltip as well.
 */
@Component({
  selector: 'nine-am-table-header',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './table-header.scss',
  host: { class: 'nine-am-table-header' },
  template: `
    <h2 class="nine-am-table-header__title">{{ heading() }}</h2>

    @if (description()) {
      <p class="nine-am-table-header__description">{{ description() }}</p>
    }
  `,
})
export class TableHeader {
  readonly heading = input.required<string>();
  readonly description = input('');
}
