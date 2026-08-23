import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ContainedList,
  ContainedListAction,
  ContainedListItem,
  ContainedListItemAction,
} from './contained-list';

@Component({
  imports: [ContainedList, ContainedListItem, ContainedListAction, ContainedListItemAction],
  template: `
    <nine-am-contained-list label="Namespaces" [size]="'md'">
      <button nineAmContainedListAction type="button">Add</button>

      <li nineAmContainedListItem>Plain row</li>

      <li nineAmContainedListItem interactive (selected)="picked.set(picked() + 1)">
        Clickable row
        <button nineAmContainedListItemAction type="button">Remove</button>
      </li>
    </nine-am-contained-list>
  `,
})
class Host {
  readonly picked = signal(0);
}

describe('ContainedList', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      list: () => el.querySelector('ul') as HTMLElement,
      items: () => Array.from(el.querySelectorAll('li')),
      contents: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.nine-am-contained-list-item__content')),
      rowAction: () =>
        el.querySelector('.nine-am-contained-list-item__action') as HTMLButtonElement,
    };
  }

  it('is a real list, titled', () => {
    const { list, items } = setup();

    expect(list().tagName).toBe('UL');
    expect(items()).toHaveLength(2);
    expect(
      (document.querySelector('.nine-am-contained-list__label') as HTMLElement).textContent?.trim(),
    ).toBe('Namespaces');
  });

  it('makes a row a button only when asked', () => {
    const { contents, host } = setup();

    expect(contents()[0].tagName).toBe('DIV');
    expect(contents()[1].tagName).toBe('BUTTON');

    contents()[1].click();

    expect(host.picked()).toBe(1);
  });

  it('keeps a row action outside the row button', () => {
    const { contents, rowAction } = setup();

    // The third time this rule has decided a layout here: a button may not
    // contain another button, and one that does is invalid and unreachable.
    expect(rowAction).not.toBeNull();
    expect(contents()[1].contains(rowAction())).toBe(false);
  });
});
