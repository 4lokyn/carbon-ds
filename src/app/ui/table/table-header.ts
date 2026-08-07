import { Component, input, ViewEncapsulation } from '@angular/core';

/**
 * The title and one-line description above a table.
 *
 * Its own component rather than inputs on `ds-table-toolbar`, which is how
 * Carbon splits it too: a table can carry a heading with no toolbar under it,
 * and a toolbar with no heading over it. Folding the two together would make
 * every toolbar carry title markup it usually does not want.
 *
 * `heading` rather than `title` — `title` is a global HTML attribute, and an
 * input by that name lands on the host element as a browser tooltip as well.
 */
@Component({
  selector: 'ds-table-header',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './table-header.scss',
  host: { class: 'ds-table-header' },
  template: `
    <h2 class="ds-table-header__title">{{ heading() }}</h2>

    @if (description()) {
      <p class="ds-table-header__description">{{ description() }}</p>
    }
  `,
})
export class TableHeader {
  readonly heading = input.required<string>();
  readonly description = input('');
}
