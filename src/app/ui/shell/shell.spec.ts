import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DS_SHELL } from './shell';

@Component({
  imports: [...DS_SHELL],
  template: `
    <ds-shell>
      <ds-shell-header>
        <button dsShellMenuButton aria-label="Open navigation"></button>

        <a dsShellName href="#" [prefix]="prefix()">Platform</a>

        <nav dsShellNav aria-label="Sections">
          <a dsShellLink href="#" [current]="true">Link 1</a>
          <a dsShellLink href="#">Link 2</a>

          <ds-shell-nav-menu label="Sub-menu" [(expanded)]="subMenuOpen">
            <a dsShellLink href="#">Overview</a>
          </ds-shell-nav-menu>
        </nav>

        <div dsShellActions>
          <button
            dsShellAction
            icon="switcher"
            activeIcon="close"
            label="Switch sites"
            [active]="panelOpen()"
            (click)="panelOpen.set(!panelOpen())"
          ></button>
        </div>
      </ds-shell-header>

      <ds-shell-side-nav>
        <div dsShellSideNavItem>
          <a dsShellLink href="#">Components</a>
        </div>

        <ds-shell-side-nav-menu label="Form controls" [(expanded)]="groupOpen">
          <div dsShellSideNavItem><a dsShellLink href="#">Input</a></div>
        </ds-shell-side-nav-menu>
      </ds-shell-side-nav>

      <ds-shell-overlay />

      <ds-shell-panel [(expanded)]="panelOpen">
        <ds-shell-panel-section label="Foundations">
          <a dsShellLink href="#">Brand</a>
        </ds-shell-panel-section>
      </ds-shell-panel>

      <ds-shell-content withSideNav>content</ds-shell-content>
    </ds-shell>
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
      burger: () => q<HTMLButtonElement>('.ds-shell-header__menu'),
      sideNav: () => q<HTMLElement>('.ds-shell-side-nav'),
      overlay: () => q<HTMLElement>('.ds-shell-overlay'),
      panel: () => q<HTMLElement>('.ds-shell-panel'),
      action: () => q<HTMLButtonElement>('[dsShellAction]'),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('opens and closes the side nav from the menu button', () => {
    const { burger, sideNav, fixture } = setup();

    expect(burger().getAttribute('aria-expanded')).toBe('false');
    expect(sideNav().classList).not.toContain('ds-shell-side-nav--expanded');

    burger().click();
    fixture.detectChanges();

    expect(burger().getAttribute('aria-expanded')).toBe('true');
    expect(sideNav().classList).toContain('ds-shell-side-nav--expanded');
  });

  it('closes the side nav when the scrim is clicked', () => {
    const { burger, overlay, sideNav, fixture } = setup();

    burger().click();
    fixture.detectChanges();
    expect(overlay().classList).toContain('ds-shell-overlay--visible');

    overlay().click();
    fixture.detectChanges();

    // Closing is the overlay's own default rather than something the caller
    // wires up — a scrim that darkens the page and ignores the click is a trap.
    expect(sideNav().classList).not.toContain('ds-shell-side-nav--expanded');
    expect(overlay().classList).not.toContain('ds-shell-overlay--visible');
  });

  it('renders the name prefix separately, so it can be lighter', () => {
    const { q, apply, host } = setup();

    expect(q('.ds-shell-header__name-prefix')?.textContent?.trim()).toBe('IBM');

    apply(() => host.prefix.set(''));
    expect(q('.ds-shell-header__name-prefix')).toBeNull();
  });

  it('marks a current link with aria-current, not only a class', () => {
    const { el } = setup();

    const links = Array.from(
      el.querySelectorAll('.ds-shell-header__nav .ds-shell-link'),
    );

    // The attribute is what a screen reader announces, and it is also what
    // Angular's router writes — which is why the styles key off it.
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(links[0].classList).toContain('ds-shell-link--current');
    expect(links[1].getAttribute('aria-current')).toBeNull();
  });

  it('expands a side nav group and reports it', () => {
    const { q, host, fixture } = setup();

    const trigger = q<HTMLButtonElement>('.ds-shell-side-nav__submenu');
    const panel = q<HTMLElement>('.ds-shell-side-nav__menu');

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

    const menu = q<HTMLElement>('ds-shell-nav-menu');
    q<HTMLButtonElement>('.ds-shell-header__submenu-title').click();
    fixture.detectChanges();
    expect(host.subMenuOpen()).toBe(true);

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(host.subMenuOpen()).toBe(false);
  });

  it('closes the header dropdown on the way out, but not on the way in', () => {
    const { q, host, fixture } = setup();

    const menu = q<HTMLElement>('ds-shell-nav-menu');
    const trigger = q<HTMLButtonElement>('.ds-shell-header__submenu-title');
    const item = q<HTMLAnchorElement>(
      '.ds-shell-header__submenu-list .ds-shell-link',
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
    expect(action().classList).toContain('ds-shell-header__action--active');
    expect(panel().classList).toContain('ds-shell-panel--expanded');
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
    expect(q('.ds-shell-side-nav__items').getAttribute('role')).toBe('list');
    expect(el.querySelectorAll('.ds-shell-side-nav li')).toHaveLength(0);
    expect(
      q('[dsShellSideNavItem]').getAttribute('role'),
    ).toBe('listitem');
  });

  it('offsets the content only when told there is a side nav', () => {
    const { q } = setup();

    // Its own element rather than an attribute on the app's <main>: the offsets
    // are margins, and an app class on the same element wiped them.
    const content = q<HTMLElement>('ds-shell-content');

    expect(content.classList).toContain('ds-shell-content--with-side-nav');
    expect(content.getAttribute('role')).toBe('main');
  });
});