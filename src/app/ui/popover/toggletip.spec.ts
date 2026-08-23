import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Toggletip, ToggletipButton } from './toggletip';

@Component({
  imports: [Toggletip, ToggletipButton],
  template: `
    <nine-am-toggletip>
      <button nineAmToggletipButton>Filter</button>
      <a href="/clear">Clear all</a>
    </nine-am-toggletip>
  `,
})
class Host {}

describe('Toggletip', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const root = el.querySelector('nine-am-toggletip') as HTMLElement;

    return {
      fixture,
      root,
      trigger: root.querySelector('[nineAmToggletipButton]') as HTMLButtonElement,
      panel: () => root.querySelector('.nine-am-toggletip__panel'),
      click(target: EventTarget) {
        (target as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();
      },
    };
  }

  it('opens on click and reports it', () => {
    const { trigger, panel, click } = setup();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel()).toBeNull();

    click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel()).not.toBeNull();
  });

  it('keeps the panel in the DOM right after its trigger', () => {
    const { trigger, panel, click } = setup();

    click(trigger);

    // The reason this is not in a CDK overlay. Carbon requires a toggletip to
    // maintain focus order; an overlay portals the panel to the end of <body>,
    // and Tab would skip straight past the content the click just opened.
    const following =
      trigger.compareDocumentPosition(panel() as Node) & Node.DOCUMENT_POSITION_FOLLOWING;

    expect(following).not.toBe(0);
    expect(panel()?.closest('nine-am-toggletip')).not.toBeNull();
  });

  it('stays open when something inside it is clicked', () => {
    const { root, trigger, panel, click } = setup();

    click(trigger);

    const link = root.querySelector('a') as HTMLAnchorElement;
    click(link);

    // Interactive content is the entire reason this component exists; closing
    // on the first click inside would make it useless.
    expect(panel()).not.toBeNull();
  });

  it('closes on an outside click, without dragging focus back', () => {
    const { trigger, panel, click } = setup();

    click(trigger);
    click(document.body);

    expect(panel()).toBeNull();

    // A click has already put focus somewhere deliberate. Escape is the one
    // that means "put me back".
    expect(document.activeElement).not.toBe(trigger);
  });

  it('returns focus to the trigger on Escape', () => {
    const { root, trigger, panel, click, fixture } = setup();

    click(trigger);
    trigger.focus();

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
