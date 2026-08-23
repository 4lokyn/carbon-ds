import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ClickableTile,
  ExpandableTile,
  SelectableTile,
  Tile,
  TileAboveFold,
  TileBelowFold,
} from './tile';

@Component({
  imports: [Tile, ClickableTile, SelectableTile, ExpandableTile, TileAboveFold, TileBelowFold],
  template: `
    <nine-am-tile>Plain</nine-am-tile>

    <a nineAmClickableTile href="/clusters" [disabled]="linkDisabled()">Clusters</a>

    <nine-am-selectable-tile
      [(selected)]="selected"
      name="plan"
      value="pro"
      [disabled]="tileDisabled()"
    >
      Pro plan
    </nine-am-selectable-tile>

    <nine-am-expandable-tile [(expanded)]="expanded" [interactive]="interactive()">
      <div nineAmTileAboveFold>Summary</div>
      <div nineAmTileBelowFold><a href="/detail">Detail</a></div>
    </nine-am-expandable-tile>
  `,
})
class Host {
  readonly linkDisabled = signal(false);
  readonly tileDisabled = signal(false);
  readonly selected = signal(false);
  readonly expanded = signal(false);
  readonly interactive = signal(false);
}

describe('Tile', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      anchor: () => el.querySelector('a[nineAmClickableTile]') as HTMLAnchorElement,
      checkbox: () => el.querySelector('.nine-am-tile-input') as HTMLInputElement,
      selectableLabel: () => el.querySelector('label.nine-am-tile--selectable') as HTMLLabelElement,
      expandable: () => el.querySelector('.nine-am-tile--expandable') as HTMLElement,
      chevronButton: () => el.querySelector('.nine-am-tile__chevron--interactive') as HTMLElement,
      belowFold: () => el.querySelector('.nine-am-tile-content__below-the-fold') as HTMLElement,
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('drops the href when the clickable tile is disabled', () => {
    const { anchor, apply, host } = setup();

    expect(anchor().getAttribute('href')).toBe('/clusters');
    expect(anchor().getAttribute('aria-disabled')).toBeNull();

    apply(() => host.linkDisabled.set(true));

    // Removing the href is what actually takes an anchor out of the tab order.
    // There is no `disabled` on an <a> to lean on.
    expect(anchor().getAttribute('href')).toBeNull();
    expect(anchor().getAttribute('aria-disabled')).toBe('true');
    expect(anchor().classList).toContain('nine-am-tile--disabled');
  });

  it('makes the selectable tile a real checkbox, and reports through it', () => {
    const { checkbox, selectableLabel, host, fixture } = setup();

    // The point of the hidden input: this is a checkbox to a screen reader and
    // to a <form>, neither of which a div with a role would satisfy.
    expect(checkbox().type).toBe('checkbox');
    expect(checkbox().name).toBe('plan');
    expect(checkbox().value).toBe('pro');
    expect(selectableLabel().getAttribute('for')).toBe(checkbox().id);

    checkbox().checked = true;
    checkbox().dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(host.selected()).toBe(true);
    expect(selectableLabel().classList).toContain('nine-am-tile--is-selected');
  });

  it('follows selected in the other direction too', () => {
    const { checkbox, apply, host } = setup();

    apply(() => host.selected.set(true));

    expect(checkbox().checked).toBe(true);
  });

  it('disables the checkbox itself, not just its looks', () => {
    const { checkbox, selectableLabel, apply, host } = setup();

    apply(() => host.tileDisabled.set(true));

    expect(checkbox().disabled).toBe(true);
    expect(selectableLabel().classList).toContain('nine-am-tile--disabled');
  });

  it('expands and collapses from the tile itself by default', () => {
    const { expandable, host, fixture } = setup();

    const tile = expandable();
    expect(tile.tagName).toBe('BUTTON');
    expect(tile.getAttribute('aria-expanded')).toBe('false');

    tile.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(host.expanded()).toBe(true);
    expect(expandable().getAttribute('aria-expanded')).toBe('true');
    expect(expandable().classList).toContain('nine-am-tile--is-expanded');
  });

  it('hands the button role to the chevron when the tile is interactive', () => {
    const { expandable, chevronButton, belowFold, apply, host, fixture } = setup();

    // The below-the-fold content holds a link. A <button> may not contain one,
    // and the inner control would be unreachable — which is the whole reason
    // this input exists.
    expect(belowFold().querySelector('a')).not.toBeNull();

    apply(() => host.interactive.set(true));

    expect(expandable().tagName).toBe('DIV');
    expect(expandable().getAttribute('aria-expanded')).toBeNull();

    const chevron = chevronButton();
    expect(chevron.tagName).toBe('BUTTON');
    expect(chevron.getAttribute('aria-expanded')).toBe('false');
    expect(chevron.getAttribute('aria-label')).toBe('Expand');

    chevron.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(host.expanded()).toBe(true);
    expect(chevronButton().getAttribute('aria-label')).toBe('Collapse');
  });

  it('keeps the projected content across a switch of branch', () => {
    const { belowFold, apply, host } = setup();

    // Both branches share one <ng-content> through an ng-template. If that ever
    // regresses to a copy per branch, the content lands in neither.
    expect(belowFold().textContent).toContain('Detail');

    apply(() => host.interactive.set(true));

    expect(belowFold()).not.toBeNull();
    expect(belowFold().textContent).toContain('Detail');
  });
});
