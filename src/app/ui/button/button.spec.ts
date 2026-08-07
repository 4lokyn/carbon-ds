import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';

@Component({
  imports: [Button],
  template: `
    <button dsButton kind="ghost" size="sm">Labelled</button>
    <button dsButton kind="ghost" size="sm" iconOnly aria-label="Settings">
      <span>i</span>
    </button>
  `,
})
class Host {}

describe('Button', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    );

    return { labelled: buttons[0], iconOnly: buttons[1] };
  }

  it('marks an icon-only button so it can shed the label padding', () => {
    const { labelled, iconOnly } = setup();

    expect(labelled.classList).not.toContain('ds-btn--icon-only');
    expect(iconOnly.classList).toContain('ds-btn--icon-only');
  });

  it('drops the padding that reserves the icon slot beside a label', () => {
    const { labelled, iconOnly } = setup();

    // The default is `0 63px 0 15px` — the Carbon silhouette. Left on an
    // icon-only button it renders a 100px box with the glyph against the left
    // edge, which is what this class exists to prevent. The class has to be
    // declared after the kinds, or `ghost` wins with its own padding-right.
    expect(getComputedStyle(labelled).paddingRight).not.toBe('0px');
    expect(getComputedStyle(iconOnly).paddingRight).toBe('0px');
    expect(getComputedStyle(iconOnly).paddingLeft).toBe('0px');
    expect(getComputedStyle(iconOnly).justifyContent).toBe('center');
  });
});
