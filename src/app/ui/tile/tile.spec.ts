import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ClickableTile,
  ExpandableTile,
  RadioTile,
  SelectableTile,
  Tile,
  TileAboveFold,
  TileBelowFold,
  TileGroup,
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

@Component({
  imports: [TileGroup, RadioTile],
  template: `
    <nine-am-tile-group
      legend="Plan"
      [(value)]="plan"
      [disabled]="groupDisabled()"
      (selected)="chosen.set($event)"
    >
      <nine-am-radio-tile value="starter">Starter</nine-am-radio-tile>
      <nine-am-radio-tile value="pro">Pro</nine-am-radio-tile>
      <nine-am-radio-tile value="enterprise" [disabled]="lastDisabled()"
        >Enterprise</nine-am-radio-tile
      >
    </nine-am-tile-group>
  `,
})
class GroupHost {
  readonly plan = signal('');
  readonly groupDisabled = signal(false);
  readonly lastDisabled = signal(false);
  readonly chosen = signal('');
}

describe('TileGroup', () => {
  function setup() {
    const fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const radios = () => Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]'));

    return {
      host: fixture.componentInstance,
      radios,
      legend: () => el.querySelector('legend'),
      iconPathCount: (index: number) =>
        el.querySelectorAll('.nine-am-tile__checkmark')[index].querySelectorAll('path').length,

      /** What the browser does when a radio is clicked, minus the click. */
      pick(index: number) {
        const radio = radios()[index];
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        fixture.detectChanges();
      },
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('is a fieldset with a legend, and one name across the group', () => {
    const { legend, radios } = setup();

    // The legend is what names the set to a screen reader, and the shared name
    // is what makes three inputs one group rather than three questions.
    expect(legend()?.textContent?.trim()).toBe('Plan');

    const names = new Set(radios().map((r) => r.name));

    expect(names.size).toBe(1);
  });

  it('lets exactly one tile be chosen, and reports it', () => {
    const { pick, radios, host } = setup();

    pick(1);

    expect(host.plan()).toBe('pro');
    expect(host.chosen()).toBe('pro');

    pick(0);

    // Single selection is the browser's, not ours: one name, one choice, and
    // the previous radio is unchecked before our handler ever runs.
    expect(host.plan()).toBe('starter');
    expect(radios()[1].checked).toBe(false);
  });

  it('does not fire the output when the value is set from outside', () => {
    const { apply, host, radios } = setup();

    apply(() => host.plan.set('enterprise'));

    expect(radios()[2].checked).toBe(true);
    expect(host.chosen()).toBe('');
  });

  it('shows a filled radio only on the chosen tile', () => {
    const { pick, iconPathCount } = setup();

    // Two drawings rather than one recoloured: the ring alone is one path, the
    // ring with a disc in it is two. Legible without colour, which is the point.
    expect(iconPathCount(0)).toBe(1);

    pick(0);

    expect(iconPathCount(0)).toBe(2);
    expect(iconPathCount(1)).toBe(1);
  });

  it('disables every tile from the fieldset, and one from the tile', () => {
    const { apply, radios, host } = setup();

    apply(() => host.lastDisabled.set(true));

    expect(radios().map((r) => r.disabled)).toEqual([false, false, true]);

    apply(() => host.groupDisabled.set(true));

    // `:disabled`, not `.disabled`. A `<fieldset disabled>` makes its
    // descendants *actually* disabled — unfocusable, unclickable, skipped by the
    // arrow keys — but their own `disabled` property still reflects only their
    // own attribute, and stays false. Nothing here walks the children to do it.
    expect(radios().every((r) => r.matches(':disabled'))).toBe(true);
    expect(radios().every((r) => r.disabled)).toBe(false);
  });
});
