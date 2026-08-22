import {
  booleanAttribute,
  Component,
  computed,
  Directive,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { Menu, MenuItem, MenuTrigger } from '@angular/aria/menu';
import { Icon } from '../icon/icon';

/** Which side of the trigger the menu opens on. */
export type OverflowMenuAlign = 'bottom' | 'top';

/**
 * Carbon's overflow menu: the three-dot button that holds the actions there was
 * no room for. Row actions in a table, the second half of a toolbar.
 *
 * Behaviour is `@angular/aria/menu` — roving focus, arrow keys, Home/End,
 * type-ahead, Escape, and returning focus to the trigger. We supply the trigger,
 * the panel and every class name. Same split as `Tabs`, same containment rule:
 * the Aria import lives in this folder and nowhere else.
 *
 * Showing and hiding is ours, and that is the same split rather than an
 * exception to it — `Tabs` hides its panels with a class too, while Aria marks
 * them `inert`.
 *
 * It hangs off the *trigger's* `expanded`, not the menu's `visible`. Those read
 * like synonyms and are not: `visible` stayed true while `aria-expanded` was
 * false, because it answers "is this menu a hidden submenu", which for a
 * top-level menu is never. The trigger is what knows whether the popup is open.
 *
 * Aria can also defer content given as an `ngMenuContent` template, which would
 * keep the items out of the DOM entirely. That does not work here: the items
 * arrive by projection, and projected nodes are created by the parent whether or
 * not the template is stamped.
 *
 * **The panel is inline, not in an overlay**, because that is how Aria drives it
 * — it toggles the visibility of content that stays in the template. The cost is
 * the one the toggletip pays: no flip away from a viewport edge, and an ancestor
 * with `overflow: hidden` will clip it. Carbon has the same problem and answers
 * it with a `data-floating-menu-container` escape hatch; inside a table, give the
 * scrolling ancestor room or the menu will be cut off.
 */
@Component({
  selector: 'ds-overflow-menu',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon, Menu, MenuTrigger],
  styleUrl: './overflow-menu.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    <button
      type="button"
      class="ds-overflow-menu__trigger"
      ngMenuTrigger
      #trigger="ngMenuTrigger"
      [menu]="menu"
      [attr.aria-label]="label()"
    >
      <ds-icon name="overflow-menu" />
    </button>

    <div
      ngMenu
      #menu="ngMenu"
      [class.ds-overflow-menu__panel--open]="trigger.expanded()"
      class="ds-overflow-menu__panel"
      (itemSelected)="actionSelected.emit($any($event))"
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

  protected readonly hostClass = computed(
    () => `ds-overflow-menu ds-overflow-menu--${this.align()}`,
  );
}

/**
 * One action. A real `<button>`, so Enter and Space work without help and the
 * thing is a button to every assistive technology.
 *
 * `value` is required, which is Aria's requirement rather than ours — but it
 * earns its place: it is what `(actionSelected)` on the menu reports, so a
 * caller can handle every action in one place instead of binding a click to
 * each item.
 */
@Directive({
  selector: '[dsOverflowMenuItem]',
  hostDirectives: [{ directive: MenuItem, inputs: ['value', 'disabled'] }],
  host: {
    '[class]': 'hostClass()',
    '[attr.type]': '"button"',
  },
})
export class OverflowMenuItem {
  /** Carbon's destructive item: red, and last, under a divider. */
  readonly danger = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() =>
    this.danger()
      ? 'ds-overflow-menu__item ds-overflow-menu__item--danger'
      : 'ds-overflow-menu__item',
  );
}

/**
 * The rule above a destructive action. An `<hr>`, which is what it is, with
 * `aria-hidden` because the separation is visual — the danger item already says
 * what it is by its own label.
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
