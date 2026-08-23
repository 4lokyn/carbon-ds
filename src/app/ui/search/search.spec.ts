import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Search } from './search';

@Component({
  imports: [Search],
  template: `
    <nine-am-search
      class="host-supplied"
      label="Filter services"
      placeholder="Filter"
      [disabled]="disabled()"
      [(value)]="value"
      (cleared)="clearCount.set(clearCount() + 1)"
    />
  `,
})
class Host {
  readonly value = signal('');
  readonly disabled = signal(false);
  readonly clearCount = signal(0);
}

@Component({
  imports: [Search],
  template: `<nine-am-search expandable label="Filter" [(value)]="value" />`,
})
class ExpandableHost {
  readonly value = signal('');
}

describe('Search', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      el,
      input: () => el.querySelector('input') as HTMLInputElement,
      clear: () => el.querySelector('.nine-am-search__clear') as HTMLButtonElement | null,
      type(text: string) {
        const input = el.querySelector('input') as HTMLInputElement;
        input.value = text;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
      },
    };
  }

  it('names the field with a hidden label rather than the placeholder', () => {
    const { el, input } = setup();

    const label = el.querySelector('label') as HTMLLabelElement;

    // A placeholder stops being a label the moment someone types into the field,
    // so the real label has to exist — just not visibly.
    expect(label.textContent?.trim()).toBe('Filter services');
    expect(label.classList).toContain('nine-am-visually-hidden');
    expect(label.htmlFor).toBe(input().id);
  });

  it('keeps a class the caller put on the host', () => {
    const { el } = setup();

    // The host binds [class] for its size and state modifiers. If that binding
    // ever replaces rather than merges, every caller that positions a search
    // from the outside — the services toolbar does — silently loses its layout.
    const search = el.querySelector('nine-am-search') as HTMLElement;

    expect(search.classList).toContain('host-supplied');
    expect(search.classList).toContain('nine-am-search');
    expect(search.classList).toContain('nine-am-search--md');
  });

  it('shows the clear button only once there is something to clear', () => {
    const { clear, type } = setup();

    expect(clear()).toBeNull();

    type('nginx');
    expect(clear()).not.toBeNull();
  });

  it('clears the value, reports it, and keeps focus in the field', () => {
    const { host, clear, input, type, fixture } = setup();

    type('nginx');
    clear()!.click();
    fixture.detectChanges();

    expect(host.value()).toBe('');
    expect(host.clearCount()).toBe(1);

    // The button removes itself as the value empties. Without the explicit
    // refocus, focus falls to <body> and a keyboard user is dropped out of the
    // form entirely.
    expect(document.activeElement).toBe(input());
  });

  it('does not offer a clear button while disabled', () => {
    const { host, clear, fixture } = setup();

    host.value.set('nginx');
    host.disabled.set(true);
    fixture.detectChanges();

    // A disabled field whose contents can still be wiped is a bug, not a state.
    expect(clear()).toBeNull();
  });

  it('collapses to a square until it is used, then grows', () => {
    const fixture = TestBed.createComponent(ExpandableHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const search = el.querySelector('nine-am-search') as HTMLElement;
    const magnifier = el.querySelector(
      '.nine-am-search__magnifier--button',
    ) as HTMLButtonElement;

    // Collapsed the magnifier is the only thing on screen, so it has to be a
    // real button rather than the decorative icon the persistent variant uses.
    expect(magnifier).not.toBeNull();
    expect(search.classList).not.toContain('nine-am-search--expanded');

    magnifier.click();
    fixture.detectChanges();

    expect(search.classList).toContain('nine-am-search--expanded');
    expect(document.activeElement).toBe(el.querySelector('input'));
  });

  it('stays open while it holds a filter, and collapses when empty', () => {
    const fixture = TestBed.createComponent(ExpandableHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const search = el.querySelector('nine-am-search') as HTMLElement;
    const input = el.querySelector('input') as HTMLInputElement;

    (el.querySelector('.nine-am-search__magnifier--button') as HTMLButtonElement).click();
    input.value = 'edge';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    // Collapsing over a live filter would hide the reason the list is short.
    expect(search.classList).toContain('nine-am-search--expanded');

    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(search.classList).not.toContain('nine-am-search--expanded');
  });

  it('reports every keystroke, because a filter cannot wait for blur', () => {
    const { host, type } = setup();

    type('ngi');
    expect(host.value()).toBe('ngi');

    type('nginx');
    expect(host.value()).toBe('nginx');
  });
});
