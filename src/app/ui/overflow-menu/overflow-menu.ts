import {
  afterNextRender,
  booleanAttribute,
  Component,
  computed,
  contentChildren,
  Directive,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** Which side of the trigger the menu opens on. */
export type OverflowMenuAlign = 'bottom' | 'top';

/** Carbon's number: the type-ahead buffer clears this long after the last key. */
const TYPE_AHEAD_TIMEOUT = 500;

let nextId = 0;

/**
 * Carbon's overflow menu: the three-dot button that holds the actions there was
 * no room for. Row actions in a table, the second half of a toolbar.
 *
 * **The keyboard is ours, and it was not always.** This was built on
 * `@angular/aria/menu`, which is the obvious choice and does not work here: Aria
 * collects its items with `contentChildren(MenuItem)` on the panel, and our
 * items reach that panel through `<ng-content>`. Projected nodes belong to the
 * template that declared them, so a content query on this component's panel
 * never sees them — measured at zero items against five in the DOM. Nothing
 * errored. The roles and `aria-expanded` were all correct, and the menu was
 * mouse-only: no key opened it, and every item sat at `tabindex="-1"`, so a
 * keyboard could not reach a single action.
 *
 * That is a trap for any headless primitive wrapped this way, not a bug in Aria.
 * `Tabs` is unaffected because it attaches Aria through `hostDirectives`, which
 * puts the query on an element in the caller's own template.
 *
 * What is implemented here is the WAI-ARIA menu button pattern: the trigger
 * opens on Enter, Space, ArrowDown and ArrowUp; the menu roves focus with the
 * arrows and wraps; Home and End jump; Escape closes and gives focus back to the
 * trigger; Tab closes and moves on; typing jumps to a label. Disabled items are
 * skipped rather than removed, so they can still be found and read.
 *
 * **The panel is inline, not in an overlay.** The cost is the one the toggletip
 * pays: no flip away from a viewport edge, and an ancestor with `overflow:
 * hidden` will clip it. Carbon has the same limitation and answers it with a
 * `data-floating-menu-container` escape hatch; inside a table, give the
 * scrolling ancestor room or the menu will be cut off.
 */
@Component({
  selector: 'ds-overflow-menu',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './overflow-menu.scss',
  host: {
    '[class]': 'hostClass()',
    '(document:click)': 'onDocumentClick($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <button
      type="button"
      class="ds-overflow-menu__trigger"
      [id]="triggerId"
      [attr.aria-label]="label()"
      aria-haspopup="menu"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="panelId"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
    >
      <ds-icon name="overflow-menu" />
    </button>

    <div
      role="menu"
      [id]="panelId"
      [attr.aria-labelledby]="triggerId"
      class="ds-overflow-menu__panel"
      [class.ds-overflow-menu__panel--open]="expanded()"
      (keydown)="onPanelKeydown($event)"
    >
      <ng-content />
    </div>
  `,
})
export class OverflowMenu {
  /**
   * The accessible name. Required in practice: the trigger is three dots and
   * nothing else, so without this a screen reader announces "button" and stops.
   */
  readonly label = input('Open menu');

  readonly align = input<OverflowMenuAlign>('bottom');

  /** The `value` of whichever item was chosen. */
  readonly actionSelected = output<string>();

  /** Which item currently holds focus. The items read it for their tab index. */
  readonly activeItem = signal<OverflowMenuItem | null>(null);

  protected readonly expanded = signal(false);

  protected readonly triggerId = `ds-overflow-menu-trigger-${nextId}`;
  protected readonly panelId = `ds-overflow-menu-panel-${nextId++}`;

  protected readonly hostClass = computed(
    () => `ds-overflow-menu ds-overflow-menu--${this.align()}`,
  );

  private readonly items = contentChildren(OverflowMenuItem);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  private search = '';
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Called by an item when it is chosen. Choosing an action closes the menu,
   * because every menu on every platform does, and one that stays open over the
   * thing it just changed invites a second click on it.
   */
  select(value: string): void {
    this.actionSelected.emit(value);
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
        // that is on its way to `display: none`. Measured, and it stranded
        // focus on a hidden element. Dropping the item out of the tab order by
        // hand is what lets focus carry on past the menu; the binding settles
        // on the same -1 a moment later.
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

  private open(edge: 'first' | 'last'): void {
    this.expanded.set(true);

    // The panel is `display: none` until the open class lands, and there is no
    // focusing what is not displayed. This waits for the render rather than
    // racing it — the same mistake, made inside Aria, is what left every item
    // unfocusable when the menu was opened by pointer.
    afterNextRender(
      () => {
        const items = this.enabledItems();
        this.focusItem(edge === 'first' ? items.at(0) : items.at(-1));
      },
      { injector: this.injector },
    );
  }

  private close(refocus = true): void {
    this.expanded.set(false);
    this.activeItem.set(null);
    this.search = '';

    if (refocus) {
      this.host.nativeElement.querySelector<HTMLElement>('.ds-overflow-menu__trigger')?.focus();
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
   * Carbon's own demo asks the reader to type "d" and land on Delete.
   *
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

  private focusItem(item: OverflowMenuItem | undefined): void {
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
  private enabledItems(): OverflowMenuItem[] {
    return this.items().filter((item) => !item.disabled());
  }
}

/**
 * One action. A real `<button>`, so Enter and Space activate it without help and
 * the thing is a button to every assistive technology.
 *
 * `value` is what `(actionSelected)` on the menu reports, so a caller can handle
 * every action in one place instead of binding a click to each item.
 */
@Directive({
  selector: '[dsOverflowMenuItem]',
  host: {
    '[class]': 'hostClass()',
    '[attr.type]': '"button"',
    role: 'menuitem',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '(click)': 'onClick()',
  },
})
export class OverflowMenuItem {
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

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly menu = inject(OverflowMenu);

  /** Roving focus: the active item is the only one in the tab order. */
  protected readonly tabIndex = computed(() => (this.menu.activeItem() === this ? 0 : -1));

  protected readonly hostClass = computed(() =>
    this.danger()
      ? 'ds-overflow-menu__item ds-overflow-menu__item--danger'
      : 'ds-overflow-menu__item',
  );

  focus(): void {
    this.element.nativeElement.focus();
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

  /** The label, for type-ahead. Lower-cased once here rather than at every keystroke. */
  text(): string {
    return (this.element.nativeElement.textContent ?? '').trim().toLowerCase();
  }

  protected onClick(): void {
    if (this.disabled()) {
      return;
    }

    this.menu.select(this.value());
  }
}

/**
 * The rule above a destructive action. An `<hr>`, which is what it is, with
 * `aria-hidden` because the separation is visual — the danger item already says
 * what it is by its own label, and a separator inside a `role="menu"` that is
 * not announced is one less thing between the user and the action.
 */
@Directive({
  selector: '[dsOverflowMenuDivider]',
  host: {
    class: 'ds-overflow-menu__divider',
    'aria-hidden': 'true',
  },
})
export class OverflowMenuDivider {}

export const DS_OVERFLOW_MENU = [OverflowMenu, OverflowMenuItem, OverflowMenuDivider] as const;
