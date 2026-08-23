import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NINE_AM_SHELL } from './shell';

@Component({
  imports: [...NINE_AM_SHELL],
  template: `
    <nine-am-shell>
      <nine-am-shell-header>
        <button nineAmShellMenuButton aria-label="Open navigation"></button>

        <a nineAmShellName href="#" [prefix]="prefix()">Platform</a>

        <nav nineAmShellNav aria-label="Sections">
          <a nineAmShellLink href="#" [current]="true">Link 1</a>
          <a nineAmShellLink href="#">Link 2</a>

          <nine-am-shell-nav-menu label="Sub-menu" [(expanded)]="subMenuOpen">
            <a nineAmShellLink href="#">Overview</a>
          </nine-am-shell-nav-menu>
        </nav>

        <div nineAmShellActions>
          <button
            nineAmShellAction
            icon="switcher"
            activeIcon="close"
            label="Switch sites"
            [active]="panelOpen()"
            (click)="panelOpen.set(!panelOpen())"
          ></button>
        </div>
      </nine-am-shell-header>

      <nine-am-shell-side-nav>
        <div nineAmShellSideNavItem>
          <a nineAmShellLink href="#">Components</a>
        </div>

        <nine-am-shell-side-nav-menu label="Form controls" [(expanded)]="groupOpen">
          <div nineAmShellSideNavItem><a nineAmShellLink href="#">Input</a></div>
        </nine-am-shell-side-nav-menu>
      </nine-am-shell-side-nav>

      <nine-am-shell-overlay />

      <nine-am-shell-panel [(expanded)]="panelOpen">
        <nine-am-shell-panel-section label="Foundations">
          <a nineAmShellLink href="#">Brand</a>
        </nine-am-shell-panel-section>
      </nine-am-shell-panel>

      <nine-am-shell-content withSideNav>content</nine-am-shell-content>
    </nine-am-shell>
  `,
})
class Host {
  readonly prefix = signal('IBM');
  readonly subMenuOpen = signal(false);
  readonly groupOpen = signal(false);
  readonly panelOpen = signal(false);
}

describe('Shell', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const q = <T extends Element>(sel: string) => el.querySelector(sel) as T;

    return {
      fixture,
      host: fixture.componentInstance,
      el,
      q,
      burger: () => q<HTMLButtonElement>('.nine-am-shell-header__menu'),
      sideNav: () => q<HTMLElement>('.nine-am-shell-side-nav'),
      overlay: () => q<HTMLElement>('.nine-am-shell-overlay'),
      panel: () => q<HTMLElement>('.nine-am-shell-panel'),
      action: () => q<HTMLButtonElement>('[nineAmShellAction]'),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('opens and closes the side nav from the menu button', () => {
    const { burger, sideNav, fixture } = setup();

    expect(burger().getAttribute('aria-expanded')).toBe('false');
    expect(sideNav().classList).not.toContain('nine-am-shell-side-nav--expanded');

    burger().click();
    fixture.detectChanges();

    expect(burger().getAttribute('aria-expanded')).toBe('true');
    expect(sideNav().classList).toContain('nine-am-shell-side-nav--expanded');
  });

  it('closes the side nav when the scrim is clicked', () => {
    const { burger, overlay, sideNav, fixture } = setup();

    burger().click();
    fixture.detectChanges();
    expect(overlay().classList).toContain('nine-am-shell-overlay--visible');

    overlay().click();
    fixture.detectChanges();

    // Closing is the overlay's own default rather than something the caller
    // wires up — a scrim that darkens the page and ignores the click is a trap.
    expect(sideNav().classList).not.toContain('nine-am-shell-side-nav--expanded');
    expect(overlay().classList).not.toContain('nine-am-shell-overlay--visible');
  });

  it('renders the name prefix separately, so it can be lighter', () => {
    const { q, apply, host } = setup();

    expect(q('.nine-am-shell-header__name-prefix')?.textContent?.trim()).toBe('IBM');

    apply(() => host.prefix.set(''));
    expect(q('.nine-am-shell-header__name-prefix')).toBeNull();
  });

  it('marks a current link with aria-current, not only a class', () => {
    const { el } = setup();

    const links = Array.from(
      el.querySelectorAll('.nine-am-shell-header__nav .nine-am-shell-link'),
    );

    // The attribute is what a screen reader announces, and it is also what
    // Angular's router writes — which is why the styles key off it.
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(links[0].classList).toContain('nine-am-shell-link--current');
    expect(links[1].getAttribute('aria-current')).toBeNull();
  });

  it('expands a side nav group and reports it', () => {
    const { q, host, fixture } = setup();

    const trigger = q<HTMLButtonElement>('.nine-am-shell-side-nav__submenu');
    const panel = q<HTMLElement>('.nine-am-shell-side-nav__menu');

    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(host.groupOpen()).toBe(true);

    // Collapsed by max-height rather than removed, so the panel is always in
    // the DOM — the height is what animates and there is nothing to animate to
    // if the list is rebuilt on every toggle.
    expect(panel).not.toBeNull();
  });

  it('closes the header dropdown on Escape', () => {
    const { q, host, fixture } = setup();

    const menu = q<HTMLElement>('nine-am-shell-nav-menu');
    q<HTMLButtonElement>('.nine-am-shell-header__submenu-title').click();
    fixture.detectChanges();
    expect(host.subMenuOpen()).toBe(true);

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(host.subMenuOpen()).toBe(false);
  });

  it('closes the header dropdown on the way out, but not on the way in', () => {
    const { q, host, fixture } = setup();

    const menu = q<HTMLElement>('nine-am-shell-nav-menu');
    const trigger = q<HTMLButtonElement>('.nine-am-shell-header__submenu-title');
    const item = q<HTMLAnchorElement>(
      '.nine-am-shell-header__submenu-list .nine-am-shell-link',
    );

    trigger.click();
    fixture.detectChanges();

    // Moving from the trigger to one of its own items is not leaving. Closing
    // here would make the menu unusable.
    menu.dispatchEvent(new FocusEvent('focusout', { relatedTarget: item }));
    fixture.detectChanges();
    expect(host.subMenuOpen()).toBe(true);

    menu.dispatchEvent(
      new FocusEvent('focusout', { relatedTarget: document.body }),
    );
    fixture.detectChanges();
    expect(host.subMenuOpen()).toBe(false);
  });

  it('swaps a panel trigger to its close icon while the panel is open', () => {
    const { action, panel, fixture } = setup();

    const paths = () => action().querySelectorAll('path').length;

    // The switcher is a 3x3 grid — nine paths. Close is one.
    expect(paths()).toBe(9);
    expect(panel().getAttribute('aria-hidden')).toBe('true');

    action().click();
    fixture.detectChanges();

    expect(paths()).toBe(1);
    expect(action().classList).toContain('nine-am-shell-header__action--active');
    expect(panel().classList).toContain('nine-am-shell-panel--expanded');
    expect(panel().getAttribute('aria-hidden')).toBeNull();
  });

  it('names icon-only actions, because there is no text left to do it', () => {
    const { action } = setup();

    expect(action().getAttribute('aria-label')).toBe('Switch sites');
  });

  it('builds the nav as roles rather than as ul/li', () => {
    const { q, el } = setup();

    // HTML closes an <li> as soon as another opens, so a group containing items
    // cannot be written as nested <li> in an Angular template — the parser
    // reparents them. Explicit roles give the same semantics with no implied
    // end tags. If this ever goes back to <ul>, the nested group breaks.
    expect(q('.nine-am-shell-side-nav__items').getAttribute('role')).toBe('list');
    expect(el.querySelectorAll('.nine-am-shell-side-nav li')).toHaveLength(0);
    expect(
      q('[nineAmShellSideNavItem]').getAttribute('role'),
    ).toBe('listitem');
  });

  it('offsets the content only when told there is a side nav', () => {
    const { q } = setup();

    // Its own element rather than an attribute on the app's <main>: the offsets
    // are margins, and an app class on the same element wiped them.
    const content = q<HTMLElement>('nine-am-shell-content');

    expect(content.classList).toContain('nine-am-shell-content--with-side-nav');
    expect(content.getAttribute('role')).toBe('main');
  });
});