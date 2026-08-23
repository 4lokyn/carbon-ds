import {
  booleanAttribute,
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';

/**
 * One entry. A real `<li>`, which is the only thing that makes the list around
 * it a list to a screen reader.
 */
@Directive({
  selector: 'li[nineAmListItem]',
  host: { class: 'nine-am-list__item' },
})
export class ListItem {}

/**
 * Carbon's list, applied to a real `<ul>` or `<ol>`.
 *
 * **Two of Carbon's props are read from the markup instead of being asked for.**
 * Carbon ships `OrderedList` and `UnorderedList` as separate components and a
 * `nested` flag, because in JSX the element is an implementation detail. Here
 * the caller writes the element, so the element is the answer: an `<ol>` is
 * ordered, and a list inside a list item is nested. A flag that can contradict
 * the markup it sits on is a flag that will.
 *
 * The marks are Carbon's rather than the browser's — an en dash for a bullet, a
 * counter for a number — which is why `native` exists to give them back. Use it
 * when the list has to match text the browser rendered elsewhere.
 */
@Component({
  selector: 'ul[nineAmList], ol[nineAmList]',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './list.scss',
  host: { '[class]': 'hostClass()' },

  // A component rather than a directive purely so the stylesheet has somewhere
  // to live: a directive cannot carry `styleUrl`, and the first version of this
  // was one — the classes were all correct and not a single rule ever loaded.
  template: '<ng-content />',
})
export class List {
  /** Carbon's `isExpressive`: `body-02` instead of `body-01`. */
  readonly expressive = input(false, { transform: booleanAttribute });

  /**
   * Give the marks back to the browser. Carbon draws its own — an en dash for
   * an unordered item, a counter for an ordered one — so a list styled by the
   * platform is opt-in.
   */
  readonly native = input(false, { transform: booleanAttribute });

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  /** A list inside a list item is nested. Nothing else needs to be said about it. */
  private readonly parentItem = inject(ListItem, { optional: true, skipSelf: true });

  protected readonly hostClass = computed(() => {
    const ordered = this.element.nativeElement.tagName === 'OL';
    const classes = ['nine-am-list', `nine-am-list--${ordered ? 'ordered' : 'unordered'}`];

    if (this.parentItem) {
      classes.push('nine-am-list--nested');
    }

    if (this.expressive()) {
      classes.push('nine-am-list--expressive');
    }

    if (this.native()) {
      classes.push('nine-am-list--native');
    }

    return classes.join(' ');
  });
}

/** Import this instead of the two directives one by one. */
export const NINE_AM_LIST = [List, ListItem] as const;
