import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ComboButton, MenuButton } from './menu-button';
import { MenuDivider, MenuItem } from './menu-surface';

@Component({
  imports: [MenuButton, MenuItem, MenuDivider],
  template: `
    <nine-am-menu-button label="Export" (actionSelected)="picked.set($event)">
      <button nineAmMenuItem value="csv">CSV</button>
      <button nineAmMenuItem value="json" [disabled]="jsonDisabled()">JSON</button>
      <hr nineAmMenuDivider />
      <button nineAmMenuItem value="purge" danger (selected)="perItem.set(perItem() + 1)">
        Purge
      </button>
    </nine-am-menu-button>
  `,
})
class MenuButtonHost {
  readonly picked = signal('');
  readonly perItem = signal(0);
  readonly jsonDisabled = signal(false);
}

@Component({
  imports: [ComboButton, MenuItem],
  template: `
    <nine-am-combo-button
      label="Deploy"
      menuLabel="Other deploy actions"
      (primaryAction)="deploys.set(deploys() + 1)"
      (actionSelected)="picked.set($event)"
    >
      <button nineAmMenuItem value="dry-run">Dry run</button>
      <button nineAmMenuItem value="rollback">Roll back</button>
    </nine-am-combo-button>
  `,
})
class ComboButtonHost {
  readonly deploys = signal(0);
  readonly picked = signal('');
}

describe('MenuButton', () => {
  function setup() {
    const fixture = TestBed.createComponent(MenuButtonHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector('.nine-am-menu__trigger') as HTMLButtonElement;

    return {
      host: fixture.componentInstance,
      trigger,
      items: () => Array.from(el.querySelectorAll<HTMLElement>('.nine-am-menu__item')),
      expanded: () => trigger.getAttribute('aria-expanded'),
      focused: () => (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? '',
      press(key: string, on: HTMLElement = trigger) {
        on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        TestBed.tick();
      },
    };
  }

  it('names itself, unlike the three dots it is a sibling of', () => {
    const { trigger } = setup();

    // The whole difference from the overflow menu: a word that says what the
    // actions are about, so no `aria-label` is needed to rescue it.
    expect(trigger.textContent?.trim()).toContain('Export');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('shares the surface keyboard with every other menu', () => {
    const { press, expanded, focused, items } = setup();

    press('ArrowDown');

    expect(expanded()).toBe('true');
    expect(focused()).toBe('CSV');
    expect(items()[0].getAttribute('tabindex')).toBe('0');
  });

  it('reports the chosen value, and the item reports itself', () => {
    const { items, host, expanded } = setup();

    items()[2].click();
    TestBed.tick();

    // Both idioms, because both are wanted: one handler on the menu for the
    // common case, and a handler per item where an action stands alone.
    expect(host.picked()).toBe('purge');
    expect(host.perItem()).toBe(1);
    expect(expanded()).toBe('false');
  });
});

describe('ComboButton', () => {
  function setup() {
    const fixture = TestBed.createComponent(ComboButtonHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      primary: el.querySelector('.nine-am-menu__primary') as HTMLButtonElement,
      trigger: el.querySelector('.nine-am-menu__trigger') as HTMLButtonElement,
      items: () => Array.from(el.querySelectorAll<HTMLElement>('.nine-am-menu__item')),
    };
  }

  it('is two controls and two tab stops, which is Carbons spec for it', () => {
    const { primary, trigger, host } = setup();

    // "The first tab brings focus on the primary button and the second tab
    // brings focus on the icon button that contains the menu." A single control
    // cannot both do a thing and offer a list of other things.
    expect(primary).not.toBeNull();
    expect(trigger).not.toBeNull();
    expect(primary.contains(trigger)).toBe(false);
    expect(trigger.getAttribute('aria-label')).toBe('Other deploy actions');

    primary.click();

    expect(host.deploys()).toBe(1);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens its own menu without touching the primary action', () => {
    const { trigger, items, host } = setup();

    trigger.click();
    TestBed.tick();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(host.deploys()).toBe(0);

    items()[1].click();
    TestBed.tick();

    expect(host.picked()).toBe('rollback');
  });
});
