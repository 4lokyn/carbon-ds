import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Accordion, AccordionItem, AccordionTitle } from './accordion';

@Component({
  imports: [Accordion, AccordionItem, AccordionTitle],
  template: `
    <nine-am-accordion [ordered]="ordered()" [disabled]="allDisabled()">
      <li
        nineAmAccordionItem
        title="Plan"
        [(open)]="planOpen"
        (toggled)="toggles.set(toggles() + 1)"
      >
        <p>Compare plans.</p>
      </li>

      <li nineAmAccordionItem title="Members" [disabled]="oneDisabled()">
        <p>Invite people.</p>
      </li>

      <li nineAmAccordionItem>
        <span nineAmAccordionTitle>Payment <em>details</em></span>
        <p>Card on file.</p>
      </li>
    </nine-am-accordion>
  `,
})
class Host {
  readonly planOpen = signal(false);
  readonly ordered = signal(false);
  readonly allDisabled = signal(false);
  readonly oneDisabled = signal(false);
  readonly toggles = signal(0);
}

describe('Accordion', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      list: () => el.querySelector('ul, ol') as HTMLElement,
      items: () => Array.from(el.querySelectorAll('li')),
      headings: () =>
        Array.from(el.querySelectorAll<HTMLButtonElement>('.nine-am-accordion__heading')),
      regions: () => Array.from(el.querySelectorAll('[role="region"]')),
      press(index: number) {
        el.querySelectorAll<HTMLButtonElement>('.nine-am-accordion__heading')[index].click();
        fixture.detectChanges();
      },
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('is a real list of real list items', () => {
    const { list, items } = setup();

    // A screen reader announces "list, 3 items" and can jump through it. None of
    // that survives being rebuilt on divs, which is why the caller writes the li.
    expect(list().tagName).toBe('UL');
    expect(items()).toHaveLength(3);
  });

  it('switches to an ordered list without losing the items', () => {
    const { apply, host, list, items } = setup();

    apply(() => host.ordered.set(true));

    // The projection is stamped into whichever list is live — the items are
    // created by the caller and cannot be in two places.
    expect(list().tagName).toBe('OL');
    expect(items()).toHaveLength(3);
  });

  it('ties each heading to the region it opens', () => {
    const { headings, regions } = setup();

    const heading = headings()[0];
    const region = regions()[0];

    expect(heading.getAttribute('aria-expanded')).toBe('false');
    expect(heading.getAttribute('aria-controls')).toBe(region.getAttribute('id'));
    expect(region.getAttribute('aria-labelledby')).toBe(heading.getAttribute('id'));
  });

  it('opens on the heading, and says so both ways', () => {
    const { press, headings, host } = setup();

    press(0);

    expect(headings()[0].getAttribute('aria-expanded')).toBe('true');
    expect(host.planOpen()).toBe(true);
    expect(host.toggles()).toBe(1);
  });

  it('lets more than one be open at once', () => {
    const { press, headings } = setup();

    press(0);
    press(2);

    // Carbon's behaviour and the accessible one: opening a section does not
    // close the one someone was reading.
    expect(headings().map((h) => h.getAttribute('aria-expanded'))).toEqual([
      'true',
      'false',
      'true',
    ]);
  });

  it('does not fire the output when open is set from outside', () => {
    const { apply, host, headings } = setup();

    apply(() => host.planOpen.set(true));

    expect(headings()[0].getAttribute('aria-expanded')).toBe('true');
    expect(host.toggles()).toBe(0);
  });

  it('disables one item, or all of them from the accordion', () => {
    const { apply, headings, host } = setup();

    apply(() => host.oneDisabled.set(true));

    expect(headings().map((h) => h.disabled)).toEqual([false, true, false]);

    apply(() => host.allDisabled.set(true));

    expect(headings().every((h) => h.disabled)).toBe(true);
  });

  it('takes a projected title when the heading needs markup', () => {
    const { headings } = setup();

    // Carbon allows markup for `title` too — its own example passes a node. A
    // row of data needs it: a name and a status tag are one heading.
    expect(headings()[2].querySelector('em')?.textContent).toBe('details');
  });
});
