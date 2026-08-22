import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InteractiveTag, Tag } from './tag';

@Component({
  imports: [Tag, InteractiveTag],
  template: `
    <ds-tag color="blue">plain</ds-tag>

    <button dsTag selectable [(selected)]="picked">filter</button>

    <button dsTag color="teal" (click)="opens.set(opens() + 1)">open</button>
  `,
})
class Host {
  readonly picked = signal(false);
  readonly opens = signal(0);
}

describe('Tag', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      plain: () => el.querySelector('ds-tag') as HTMLElement,
      buttons: () => Array.from(el.querySelectorAll<HTMLButtonElement>('button')),
    };
  }

  it('renders a read-only tag as a span, not a button', () => {
    const { plain } = setup();

    // A tag that does nothing must not be focusable or announced as a control.
    expect(plain().tagName).toBe('DS-TAG');
    expect(plain().querySelector('button')).toBeNull();
  });

  it('reports the selectable tag as pressed, and the operational one not at all', () => {
    const { buttons, fixture, host } = setup();

    const [selectable, operational] = buttons();

    expect(selectable.getAttribute('aria-pressed')).toBe('false');

    selectable.click();
    fixture.detectChanges();

    expect(host.picked()).toBe(true);
    expect(selectable.getAttribute('aria-pressed')).toBe('true');

    // An operational tag has no state of its own, so claiming a pressed state
    // would describe something that does not exist.
    expect(operational.hasAttribute('aria-pressed')).toBe(false);
  });

  it('leaves an operational tag to its own click handler', () => {
    const { buttons, fixture, host } = setup();

    buttons()[1].click();
    fixture.detectChanges();

    expect(host.opens()).toBe(1);
    expect(host.picked()).toBe(false);
  });

  it('keeps the hue off the selectable tag', () => {
    const { buttons } = setup();

    // Carbon gives selectable one look on purpose: a chip that is both blue and
    // selected has two things saying "picked" and neither wins.
    const classes = buttons()[0].className;

    expect(classes).toContain('ds-tag--selectable');
    expect(classes).not.toContain('ds-tag--gray');
    expect(classes).not.toContain('ds-tag--blue');
  });
});
