import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Link } from './link';

@Component({
  imports: [Link],
  template: `
    <a
      nineAmLink
      href="/docs"
      [inline]="inline()"
      [disabled]="disabled()"
      [visited]="visited()"
      (click)="clicks.set(clicks() + 1)"
      >Carbon docs</a
    >
  `,
})
class Host {
  readonly inline = signal(false);
  readonly disabled = signal(false);
  readonly visited = signal(false);
  readonly clicks = signal(0);
}

describe('Link', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      link: () => el.querySelector('a') as HTMLAnchorElement,
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('stays a real anchor', () => {
    const { link } = setup();

    // The whole reason this is an attribute and not <nine-am-link>: the href, the
    // middle-click, the status bar and the "link" role all come free.
    expect(link().tagName).toBe('A');
    expect(link().getAttribute('href')).toBe('/docs');
  });

  it('keeps the anchor when disabled, and says so', () => {
    const { link, apply, host } = setup();

    apply(() => host.disabled.set(true));

    // Carbon React swaps in a <p>, which drops the link out of the
    // accessibility tree entirely. This keeps it findable and focusable, and
    // reports it as unavailable.
    expect(link().tagName).toBe('A');
    expect(link().getAttribute('aria-disabled')).toBe('true');
    expect(link().getAttribute('href')).toBe('/docs');
  });

  it('swallows the click while disabled', () => {
    const { link, apply, host } = setup();

    apply(() => host.disabled.set(true));

    const event = new MouseEvent('click', { cancelable: true, bubbles: true });
    link().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('flows with the sentence when inline', () => {
    const { link, apply, host } = setup();

    expect(link().classList).not.toContain('nine-am-link--inline');

    apply(() => host.inline.set(true));

    expect(link().classList).toContain('nine-am-link--inline');
  });

  it('leaves the visited colour off unless asked', () => {
    const { link, apply, host } = setup();

    // In an application most links go somewhere you have already been, so
    // purple everywhere carries no information.
    expect(link().classList).not.toContain('nine-am-link--visited');

    apply(() => host.visited.set(true));

    expect(link().classList).toContain('nine-am-link--visited');
  });
});
