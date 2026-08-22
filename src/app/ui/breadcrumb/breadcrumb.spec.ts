import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Breadcrumb, BreadcrumbItem } from './breadcrumb';

@Component({
  imports: [Breadcrumb, BreadcrumbItem],
  template: `
    <ds-breadcrumb [noTrailingSlash]="noTrailingSlash()">
      <li dsBreadcrumbItem><a href="/">Home</a></li>
      <li dsBreadcrumbItem><a href="/clusters">Clusters</a></li>
      <li dsBreadcrumbItem [current]="true">carbon-prod-01</li>
    </ds-breadcrumb>
  `,
})
class Host {
  readonly noTrailingSlash = signal(true);
}

describe('Breadcrumb', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      nav: () => el.querySelector('nav') as HTMLElement,
      list: () => el.querySelector('ol') as HTMLOListElement,
      items: () => Array.from(el.querySelectorAll('.ds-breadcrumb-item')),
    };
  }

  it('is a navigation landmark wrapping an ordered list', () => {
    const { nav, list } = setup();

    // A screen reader announces "navigation, list, 3 items" off this markup and
    // can jump straight to it. A row of divs offers none of that.
    expect(nav()).not.toBeNull();
    expect(nav().getAttribute('aria-label')).toBe('Breadcrumb');
    expect(list().tagName).toBe('OL');
  });

  it('keeps ol > li through content projection', () => {
    const { list } = setup();

    // The reason the item is an attribute on a real <li> rather than its own
    // element: a <ds-breadcrumb-item> in between would break the relationship
    // the list semantics depend on.
    const children = Array.from(list().children);

    expect(children).toHaveLength(3);
    expect(children.every((child) => child.tagName === 'LI')).toBe(true);
  });

  it('marks the current page with aria-current', () => {
    const { items } = setup();

    const [first, , last] = items();

    expect(first.getAttribute('aria-current')).toBeNull();
    expect(last.getAttribute('aria-current')).toBe('page');
    expect(last.classList).toContain('ds-breadcrumb-item--current');
  });

  it('drops the trailing separator only when asked', () => {
    const { list, apply, host, fixture } = {
      ...setup(),
      apply(change: () => void) {
        change();
      },
    };

    expect(list().classList).toContain('ds-breadcrumb--no-trailing-slash');

    apply(() => host.noTrailingSlash.set(false));
    fixture.detectChanges();

    // Carbon's default keeps it, even though a slash after the current page
    // points at a level that does not exist. Matching the default means a port
    // behaves the same.
    expect(list().classList).not.toContain('ds-breadcrumb--no-trailing-slash');
  });
});
