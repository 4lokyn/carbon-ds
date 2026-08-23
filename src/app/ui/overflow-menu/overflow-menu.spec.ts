import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MenuDivider, MenuItem } from '../menu/menu-surface';
import { OverflowMenu } from './overflow-menu';

@Component({
  imports: [OverflowMenu, MenuItem, MenuDivider],
  template: `
    <nine-am-overflow-menu label="Row actions" (actionSelected)="picked.set($event)">
      <button nineAmMenuItem value="stop">Stop app</button>
      <button nineAmMenuItem value="clone" [disabled]="true">Clone</button>
      <hr nineAmMenuDivider />
      <button nineAmMenuItem value="delete" danger>Delete app</button>
    </nine-am-overflow-menu>
  `,
})
class Host {
  readonly picked = signal('');
}

describe('OverflowMenu', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const root = el.querySelector('nine-am-overflow-menu') as HTMLElement;
    const trigger = root.querySelector('.nine-am-overflow-menu__trigger') as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      root,
      trigger,
      panel: root.querySelector('.nine-am-overflow-menu__panel') as HTMLElement,
      items: () => Array.from(root.querySelectorAll<HTMLElement>('.nine-am-menu__item')),
      expanded: () => trigger.getAttribute('aria-expanded'),
      focused: () => (document.activeElement as HTMLElement | null)?.textContent?.trim() ?? '',
      click(target: EventTarget) {
        (target as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();
      },
      press(key: string, on: HTMLElement = trigger) {
        on.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

        // The menu focuses an item only after the panel has stopped being
        // `display: none`, so the assertion has to wait for the same render.
        TestBed.tick();
      },
    };
  }

  it('names the trigger, which is otherwise three dots and nothing else', () => {
    const { trigger, panel } = setup();

    expect(trigger.getAttribute('aria-label')).toBe('Row actions');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
    expect(panel.getAttribute('role')).toBe('menu');
  });

  it('opens from the keyboard, which it once could not do at all', () => {
    const { press, expanded, focused, items } = setup();

    // The whole reason this component stopped using @angular/aria: its item
    // query could not see nodes that arrive by projection, so no key opened the
    // menu and every item sat at tabindex -1, unreachable even by Tab.
    press('ArrowDown');

    expect(expanded()).toBe('true');
    expect(focused()).toBe('Stop app');
    expect(items()[0].getAttribute('tabindex')).toBe('0');
    expect(items()[1].getAttribute('tabindex')).toBe('-1');
  });

  it('opens upward onto the last item', () => {
    const { press, focused } = setup();

    press('ArrowUp');

    expect(focused()).toBe('Delete app');
  });

  it('roves with the arrows, wraps, and steps over the disabled item', () => {
    const { press, panel, focused } = setup();

    press('ArrowDown');
    press('ArrowDown', panel);

    // Straight past Clone, which is disabled — it keeps its place in the menu
    // and is still announced, it simply cannot be landed on.
    expect(focused()).toBe('Delete app');

    press('ArrowDown', panel);

    expect(focused()).toBe('Stop app');

    press('ArrowUp', panel);

    expect(focused()).toBe('Delete app');
  });

  it('jumps to the ends with Home and End', () => {
    const { press, panel, focused } = setup();

    press('ArrowDown');
    press('End', panel);

    expect(focused()).toBe('Delete app');

    press('Home', panel);

    expect(focused()).toBe('Stop app');
  });

  it('jumps to a label when you type', () => {
    const { press, panel, focused } = setup();

    press('ArrowDown');
    press('d', panel);

    // The demo page has always told the reader to open the menu and type "d".
    // Until the keyboard was ours, that instruction was fiction.
    expect(focused()).toBe('Delete app');
  });

  it('closes on Escape and gives focus back to the trigger', () => {
    const { press, panel, expanded, trigger } = setup();

    press('ArrowDown');
    press('Escape', panel);

    expect(expanded()).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('reports the chosen action and closes', () => {
    const { trigger, items, host, click, expanded } = setup();

    click(trigger);
    expect(expanded()).toBe('true');

    click(items()[0]);

    expect(host.picked()).toBe('stop');
    expect(expanded()).toBe('false');
  });

  it('ignores a disabled item', () => {
    const { trigger, items, host, click, expanded } = setup();

    click(trigger);
    click(items()[1]);

    expect(host.picked()).toBe('');
    expect(expanded()).toBe('true');
    expect(items()[1].getAttribute('aria-disabled')).toBe('true');
  });

  it('closes on a click elsewhere', () => {
    const { trigger, click, expanded } = setup();

    click(trigger);
    expect(expanded()).toBe('true');

    click(document.body);

    expect(expanded()).toBe('false');
  });
});
