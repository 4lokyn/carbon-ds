import {
  afterNextRender,
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  type Signal,
} from '@angular/core';

/** Carbon's number: the type-ahead buffer clears this long after the last key. */
const TYPE_AHEAD_TIMEOUT = 500;

/**
 * The behaviour every menu in the system shares, with no opinion about what
 * opens it.
 *
 * Carbon groups menu button, combo button and overflow menu on one page as
 * "menu buttons", and its accessibility notes for them are the same paragraph
 * three times: the first item takes focus when the menu opens, the arrows move
 * between items, Space or Enter activates and closes, Escape closes and returns
 * focus to the trigger. So it is written once here and the three components
 * differ only in what the user presses to get there.
 *
 * **The item query stays in the subclass**, and that is not an accident. Items
 * arrive by projection into the concrete component, so a `contentChildren` on
 * anything further in would see nothing — which is exactly what left this
 * menu's keyboard dead when it was built on `@angular/aria`. Whoever the caller
 * writes items into is who has to count them.
 */
@Directive()
export abstract class MenuSurface {
  /** The `value` of whichever item was chosen. */
  readonly actionSelected = output<string>();

  /** Which item currently holds focus. The items read it for their tab index. */
  readonly activeItem = signal<MenuItem | null>(null);

  protected readonly expanded = signal(false);

  /** Every item the caller projected, in DOM order. Queried by the subclass. */
  protected abstract readonly items: Signal<readonly MenuItem[]>;

  /** Where focus goes when the menu closes. */
  protected abstract trigger(): HTMLElement | null;

  protected readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly injector = inject(Injector);

  private search = '';
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Called by an item when it is chosen. Choosing closes the menu, because
   * every menu on every platform does, and one that stays open over the thing
   * it just changed invites a second click on it.
   */
  choose(item: MenuItem): void {
    this.actionSelected.emit(item.value());
    this.close();
  }

  protected toggle(): void {
    if (this.expanded()) {
      this.close();
    } else {
      this.open('first');
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        // `preventDefault` is load-bearing rather than tidy: a `<button>` turns
        // Enter and Space into a click, and that click would reach `toggle()`
        // and close what this just opened. Space would also scroll the page.
        event.preventDefault();
        this.open('first');
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.open('last');
        break;

      case 'Escape':
        this.close();
        break;
    }
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    const items = this.enabledItems();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.step(1);
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.step(-1);
        break;

      case 'Home':
        event.preventDefault();
        this.focusItem(items.at(0));
        break;

      case 'End':
        event.preventDefault();
        this.focusItem(items.at(-1));
        break;

      case 'Escape':
        event.preventDefault();
        this.close();
        break;

      case 'Tab':
        // Deliberately not prevented: Tab should leave. The catch is timing —
        // the browser works out where to go *after* this handler and *before*
        // Angular re-renders, so the active item is still carrying `tabindex=0`
        // at that moment and focus lands straight back on it, inside a panel
        // on its way to `display: none`. Measured, and it stranded focus on a
        // hidden element. Dropping the item out of the tab order by hand is
        // what lets focus carry on past the menu.
        this.activeItem()?.dropFromTabOrder();
        this.close(false);
        break;

      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          this.typeAhead(event.key);
        }
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.expanded() || this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.close(false);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!this.expanded()) {
      return;
    }

    // Focus left the component entirely — the user tabbed away or clicked into
    // something else. Do not drag it back; they went somewhere on purpose.
    if (!this.host.nativeElement.contains(event.relatedTarget as Node | null)) {
      this.close(false);
    }
  }

  protected open(edge: 'first' | 'last'): void {
    this.expanded.set(true);

    // The panel is `display: none` until the open class lands, and there is no
    // focusing what is not displayed. This waits for the render rather than
    // racing it.
    afterNextRender(
      () => {
        const items = this.enabledItems();
        this.focusItem(edge === 'first' ? items.at(0) : items.at(-1));
      },
      { injector: this.injector },
    );
  }

  protected close(refocus = true): void {
    this.expanded.set(false);
    this.activeItem.set(null);
    this.search = '';

    if (refocus) {
      this.trigger()?.focus();
    }
  }

  private step(delta: number): void {
    const items = this.enabledItems();

    if (!items.length) {
      return;
    }

    const current = this.activeItem();
    const index = current ? items.indexOf(current) : -1;

    if (index === -1) {
      this.focusItem(delta > 0 ? items.at(0) : items.at(-1));
      return;
    }

    this.focusItem(items[(index + delta + items.length) % items.length]);
  }

  /**
   * One character searches from *after* the active item, so pressing the same
   * key again cycles through everything starting with it. More than one starts
   * from the active item instead, so "de" still matches the item "d" just found
   * rather than skipping past it.
   */
  private typeAhead(key: string): void {
    clearTimeout(this.searchTimer);
    this.search += key.toLowerCase();
    this.searchTimer = setTimeout(() => (this.search = ''), TYPE_AHEAD_TIMEOUT);

    const items = this.enabledItems();

    if (!items.length) {
      return;
    }

    const current = this.activeItem();
    const at = current ? items.indexOf(current) : -1;
    const from = this.search.length === 1 ? at + 1 : Math.max(at, 0);
    const ordered = [...items.slice(from), ...items.slice(0, from)];

    this.focusItem(ordered.find((item) => item.text().startsWith(this.search)));
  }

  private focusItem(item: MenuItem | undefined): void {
    if (!item) {
      return;
    }

    this.activeItem.set(item);
    item.focus();
  }

  /**
   * Disabled items are skipped by the arrows but kept in the menu and in the
   * accessibility tree, which is Carbon's behaviour and the guidance's: an
   * action that is unavailable right now is information, and removing it from
   * the keyboard's reach hides that information from exactly the people who
   * cannot see it greyed out.
   */
  private enabledItems(): MenuItem[] {
    return this.items().filter((item) => !item.disabled());
  }
}

/**
 * One action, in any of the three menus.
 *
 * A real `<button>`, so Enter and Space activate it without help and the thing
 * is a button to every assistive technology.
 */
@Directive({
  selector: '[nineAmMenuItem]',
  host: {
    '[class]': 'hostClass()',
    '[attr.type]': '"button"',
    role: 'menuitem',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.title]': 'fullText()',
    '(click)': 'onClick()',
  },
})
export class MenuItem {
  /**
   * What the menu reports through `(actionSelected)`, so a caller can handle
   * every action in one place instead of binding a click to each item.
   */
  readonly value = input.required<string>();

  /**
   * `aria-disabled` rather than the native `disabled` attribute. A natively
   * disabled button is gone from the accessibility tree; this one is still
   * announced, still read, and simply does nothing — which is what a menu item
   * that is unavailable *for now* should be.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Carbon's destructive item: red, and last, under a divider. */
  readonly danger = input(false, { transform: booleanAttribute });

  /** This item alone was chosen, for callers who prefer a handler per action. */
  readonly selected = output<void>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly menu = inject(MenuSurface);

  /** Roving focus: the active item is the only one in the tab order. */
  protected readonly tabIndex = computed(() => (this.menu.activeItem() === this ? 0 : -1));

  protected readonly hostClass = computed(() =>
    this.danger() ? 'nine-am-menu__item nine-am-menu__item--danger' : 'nine-am-menu__item',
  );

  /**
   * The label again, as a `title`, because the label itself is cut with an
   * ellipsis when it does not fit. Carbon does the same — without it a
   * truncated action is unrecoverable, and the one place a user needs the whole
   * words is the moment they cannot see them.
   */
  protected readonly fullText = signal('');

  constructor() {
    afterNextRender(() => this.fullText.set(this.element.nativeElement.textContent?.trim() ?? ''));
  }

  focus(): void {
    this.element.nativeElement.focus();
  }

  /** The label, for type-ahead. Lower-cased once here rather than at every keystroke. */
  text(): string {
    return (this.element.nativeElement.textContent ?? '').trim().toLowerCase();
  }

  /**
   * Take this item out of the tab order right now, without waiting for the
   * binding. Only the Tab handler needs it, and only because the browser's own
   * Tab beats Angular's next render. The value written is the one the binding
   * arrives at anyway.
   */
  dropFromTabOrder(): void {
    this.element.nativeElement.setAttribute('tabindex', '-1');
  }

  protected onClick(): void {
    if (this.disabled()) {
      return;
    }

    this.selected.emit();
    this.menu.choose(this);
  }
}

/**
 * The rule above a destructive action. An `<hr>`, which is what it is, with
 * `aria-hidden` because the separation is visual — the danger item already says
 * what it is by its own label, and a separator inside a `role="menu"` that is
 * not announced is one less thing between the user and the action.
 */
@Directive({
  selector: '[nineAmMenuDivider]',
  host: {
    class: 'nine-am-menu__divider',
    'aria-hidden': 'true',
  },
})
export class MenuDivider {}
