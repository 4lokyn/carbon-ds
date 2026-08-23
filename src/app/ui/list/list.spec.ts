import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { List, ListItem } from './list';

@Component({
  imports: [List, ListItem],
  template: `
    <ul nineAmList>
      <li nineAmListItem>
        Top
        <ul nineAmList>
          <li nineAmListItem>Inner</li>
        </ul>
      </li>
    </ul>

    <ol nineAmList expressive>
      <li nineAmListItem>First</li>
    </ol>

    <ul nineAmList native>
      <li nineAmListItem>Platform</li>
    </ul>
  `,
})
class Host {}

describe('List', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      lists: () => Array.from(el.querySelectorAll('ul[nineAmList], ol[nineAmList]')),
    };
  }

  it('reads ordered from the element rather than from a flag', () => {
    const [outer, inner, ordered] = setup().lists();

    // Carbon ships two components because in JSX the element is an
    // implementation detail. Here the caller writes it, so it is the answer —
    // and a flag that can contradict the markup it sits on is one that will.
    expect(outer.classList).toContain('nine-am-list--unordered');
    expect(inner.classList).toContain('nine-am-list--unordered');
    expect(ordered.classList).toContain('nine-am-list--ordered');
  });

  it('reads nested from where the list is, for the same reason', () => {
    const [outer, inner] = setup().lists();

    expect(outer.classList).not.toContain('nine-am-list--nested');
    expect(inner.classList).toContain('nine-am-list--nested');
  });

  it('takes the marks back from the browser only when asked', () => {
    const lists = setup().lists();

    expect(lists[0].classList).not.toContain('nine-am-list--native');
    expect(lists[3].classList).toContain('nine-am-list--native');
    expect(lists[2].classList).toContain('nine-am-list--expressive');
  });
});
