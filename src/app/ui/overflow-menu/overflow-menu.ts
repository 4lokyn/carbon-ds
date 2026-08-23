import {
  computed,
  Component,
  contentChildren,
  ElementRef,
  forwardRef,
  input,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { MenuDivider, MenuItem, MenuSurface } from '../menu/menu-surface';

/** Which side of the trigger the menu opens on. */
export type OverflowMenuAlign = 'bottom' | 'top';

let nextId = 0;

/**
 * Carbon's overflow menu: the three-dot button that holds the actions there was
 * no room for. Row actions in a table, the second half of a toolbar.
 *
 * One of Carbon's three "menu buttons", and the only thing separating it from
 * the other two is the trigger — three dots that name nothing, where a menu
 * button names its subject and a combo button performs one action itself. All
 * the behaviour lives in `MenuSurface`: roving focus, arrows, Home and End,
 * type-ahead, Escape, the focus return.
 *
 * **The keyboard is ours, and it was not always.** This was built on
 * `@angular/aria/menu`, which is the obvious choice and does not work here:
 * Aria collects its items with `contentChildren(MenuItem)` on the panel, and
 * items reach that panel through `<ng-content>`. Projected nodes belong to the
 * template that declared them, so a content query on this component's panel
 * never sees them — measured at zero items against five in the DOM. Nothing
 * errored, and the menu was mouse-only: no key opened it, and every item sat at
 * `tabindex="-1"`. That is why `MenuSurface` leaves the item query to whoever
 * the caller writes items into.
 *
 * **The panel is inline, not in an overlay.** The cost is the one the toggletip
 * pays: no flip away from a viewport edge, and an ancestor with
 * `overflow: hidden` will clip it. Carbon has the same limitation and answers it
 * with a `data-floating-menu-container` escape hatch; inside a table, give the
 * scrolling ancestor room or the menu will be cut off.
 */
@Component({
  selector: 'nine-am-overflow-menu',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrls: ['../menu/menu.scss', './overflow-menu.scss'],
  providers: [{ provide: MenuSurface, useExisting: forwardRef(() => OverflowMenu) }],
  host: {
    '[class]': 'hostClass()',
    '(document:click)': 'onDocumentClick($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <button
      #trigger
      type="button"
      class="nine-am-overflow-menu__trigger"
      [id]="triggerId"
      [attr.aria-label]="label()"
      aria-haspopup="menu"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="panelId"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
    >
      <nine-am-icon name="overflow-menu" />
    </button>

    <div
      role="menu"
      [id]="panelId"
      [attr.aria-labelledby]="triggerId"
      class="nine-am-menu__panel nine-am-overflow-menu__panel"
      [class.nine-am-menu__panel--open]="expanded()"
      (keydown)="onPanelKeydown($event)"
    >
      <ng-content />
    </div>
  `,
})
export class OverflowMenu extends MenuSurface {
  /**
   * The accessible name. Required in practice: the trigger is three dots and
   * nothing else, so without this a screen reader announces "button" and stops.
   */
  readonly label = input('Open menu');

  readonly align = input<OverflowMenuAlign>('bottom');

  protected readonly triggerId = `nine-am-overflow-menu-trigger-${nextId}`;
  protected readonly panelId = `nine-am-overflow-menu-panel-${nextId++}`;

  protected readonly items = contentChildren(MenuItem);

  private readonly triggerRef = viewChild.required<ElementRef<HTMLElement>>('trigger');

  protected readonly hostClass = computed(() =>
    [
      'nine-am-menu',
      'nine-am-overflow-menu',
      `nine-am-overflow-menu--${this.align()}`,
      this.expanded() ? 'nine-am-menu--open' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  protected trigger(): HTMLElement | null {
    return this.triggerRef().nativeElement;
  }
}

/** Import this instead of the pieces one by one. */
export const NINE_AM_OVERFLOW_MENU = [OverflowMenu, MenuItem, MenuDivider] as const;
