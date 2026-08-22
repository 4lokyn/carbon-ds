import {
  booleanAttribute,
  Component,
  computed,
  Directive,
  input,
  ViewEncapsulation,
} from '@angular/core';

/** 14px body text, or 12px label text. Carbon has no large breadcrumb. */
export type BreadcrumbSize = 'sm' | 'md';

/**
 * Carbon's breadcrumb: where this page sits, and the way back up.
 *
 * Renders `<nav><ol>` and projects `<li>` children into the list. That markup is
 * not decoration — a screen reader announces "navigation, list, 4 items" and can
 * jump straight to it, none of which a row of divs offers. The `/` between items
 * is a CSS `::after`, so it is never read out; the list does that job.
 *
 * Consumers write real `<li>` elements, so the `ol > li` relationship survives
 * projection. A `<ds-breadcrumb-item>` element between them would break it.
 */
@Component({
  selector: 'ds-breadcrumb',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './breadcrumb.scss',
  host: { class: 'ds-breadcrumb-host' },
  template: `
    <nav [attr.aria-label]="label()">
      <ol [class]="listClass()">
        <ng-content />
      </ol>
    </nav>
  `,
})
export class Breadcrumb {
  readonly size = input<BreadcrumbSize>('md');

  /**
   * Names the landmark. Translated, and worth changing only if the page has
   * more than one — two landmarks both called "Breadcrumb" are worse than one.
   */
  readonly label = input('Breadcrumb');

  /**
   * Drops the separator after the last crumb.
   *
   * Carbon's default leaves it on, and Carbon's own examples then switch it off
   * — a slash after the current page points at a level that does not exist. The
   * default here matches Carbon rather than the examples, so a port behaves the
   * same; set it on almost everywhere.
   */
  readonly noTrailingSlash = input(false, { transform: booleanAttribute });

  protected readonly listClass = computed(() => {
    const classes = ['ds-breadcrumb', `ds-breadcrumb--${this.size()}`];

    if (this.noTrailingSlash()) {
      classes.push('ds-breadcrumb--no-trailing-slash');
    }

    return classes.join(' ');
  });
}

/**
 * One crumb. An attribute on a real `<li>`, so the list keeps its structure.
 *
 * `current` marks the page you are on. It carries `aria-current="page"` — the
 * attribute Carbon styles against too — and the crumb stops looking like a link,
 * because it does not go anywhere.
 */
@Directive({
  selector: '[dsBreadcrumbItem]',
  host: {
    '[class]': 'hostClass()',
    '[attr.aria-current]': 'current() ? "page" : null',
  },
})
export class BreadcrumbItem {
  readonly current = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() =>
    this.current() ? 'ds-breadcrumb-item ds-breadcrumb-item--current' : 'ds-breadcrumb-item',
  );
}

export const DS_BREADCRUMB = [Breadcrumb, BreadcrumbItem] as const;
