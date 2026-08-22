import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OverflowMenu, OverflowMenuDivider, OverflowMenuItem } from './overflow-menu';

@Component({
  imports: [OverflowMenu, OverflowMenuItem, OverflowMenuDivider],
  template: `
    <ds-overflow-menu label="Row actions" (actionSelected)="picked.set($event)">
      <button dsOverflowMenuItem value="stop">Stop app</button>
      <button dsOverflowMenuItem value="clone" [disabled]="true">Clone</button>
      <hr dsOverflowMenuDivider />
      <button dsOverflowMenuItem value="delete" danger>Delete app</button>
    </ds-overflow-menu>
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
    const root = el.querySelector('ds-overflow-menu') as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      root,
      trigger: root.querySelector('.ds-overflow-menu__trigger') as HTMLElement,
      panel: root.querySelector('.ds-overflow-menu__panel') as HTMLElement,
      items: () => Array.from(root.querySelectorAll<HTMLElement>('.ds-overflow-menu__item')),
      click(target: EventTarget) {
        (target as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();
      },
    };
  }

  it('names the trigger, which is otherwise three dots and nothing else', () => {
    const { trigger } = setup();

    expect(trigger.getAttribute('aria-label')).toBe('Row actions');
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
  });

  it('reports the chosen action and closes', () => {
    const { trigger, items, host, click } = setup();

    click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    click(items()[0]);

    // Aria's own itemSelected does not fire for a pointer, and nothing in it
    // closes the menu on a click — both were stuck open until this was ours.
    expect(host.picked()).toBe('stop');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('ignores a disabled item', () => {
    const { trigger, items, host, click } = setup();

    click(trigger);
    click(items()[1]);

    expect(host.picked()).toBe('');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes on a click elsewhere', () => {
    const { trigger, click } = setup();

    click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    click(document.body);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('gives Aria the roles and the roving tab order', () => {
    const { trigger, panel, items, click } = setup();

    click(trigger);

    // All of this comes from @angular/aria/menu, not from us. If it stops being
    // true, the hostDirective wiring is broken.
    expect(panel.getAttribute('role')).toBe('menu');
    expect(items().every((i) => i.getAttribute('role') === 'menuitem')).toBe(true);
    expect(items().every((i) => i.getAttribute('tabindex') === '-1')).toBe(true);
  });
});
