import {
  booleanAttribute,
  Component,
  computed,
  contentChildren,
  ElementRef,
  forwardRef,
  input,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Button, type ButtonKind, type ButtonSize } from '../button/button';
import { Icon } from '../icon/icon';
import { MenuDivider, MenuItem, MenuSurface } from './menu-surface';

/** Which side of the trigger the menu opens on. */
export type MenuAlign = 'bottom' | 'top';

let nextId = 0;

/**
 * Carbon's menu button: a labelled button that opens a list of actions.
 *
 * The difference from `OverflowMenu` is only the trigger — three dots that say
 * nothing versus a word that says what the actions are about — and Carbon
 * documents both on one page for that reason. The keyboard, the roving focus,
 * the type-ahead and the focus return all come from `MenuSurface`, written once.
 *
 * Use it when the actions share a subject the label can name ("Export", "Add").
 * When they do not, or when there is no room for a word, that is the overflow
 * menu.
 */
@Component({
  selector: 'nine-am-menu-button',
  encapsulation: ViewEncapsulation.None,
  imports: [Button, Icon],
  styleUrl: './menu.scss',
  providers: [{ provide: MenuSurface, useExisting: forwardRef(() => MenuButton) }],
  host: {
    '[class]': 'hostClass()',
    '(document:click)': 'onDocumentClick($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <button
      #trigger
      nineAmButton
      type="button"
      class="nine-am-menu__trigger"
      [kind]="kind()"
      [size]="size()"
      [disabled]="disabled()"
      [id]="triggerId"
      aria-haspopup="menu"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="panelId"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
    >
      {{ label() }}
      <nine-am-icon class="nine-am-menu__chevron" name="chevron-down" [size]="16" />
    </button>

    <div
      role="menu"
      [id]="panelId"
      [attr.aria-labelledby]="triggerId"
      class="nine-am-menu__panel"
      [class.nine-am-menu__panel--open]="expanded()"
      (keydown)="onPanelKeydown($event)"
    >
      <ng-content />
    </div>
  `,
})
export class MenuButton extends MenuSurface {
  readonly label = input.required<string>();

  /** Carbon allows any button kind here, unlike the combo button. */
  readonly kind = input<ButtonKind>('primary');

  readonly size = input<ButtonSize>('lg');

  readonly align = input<MenuAlign>('bottom');

  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly triggerId = `nine-am-menu-trigger-${nextId}`;
  protected readonly panelId = `nine-am-menu-panel-${nextId++}`;

  protected readonly items = contentChildren(MenuItem);

  private readonly triggerRef = viewChild.required<ElementRef<HTMLElement>>('trigger');

  protected readonly hostClass = computed(() =>
    ['nine-am-menu', `nine-am-menu--${this.align()}`, this.expanded() ? 'nine-am-menu--open' : '']
      .filter(Boolean)
      .join(' '),
  );

  protected trigger(): HTMLElement | null {
    return this.triggerRef().nativeElement;
  }
}

/**
 * Carbon's combo button: one primary action, plus a menu of the others beside
 * it.
 *
 * Two buttons and two tab stops, which is Carbon's accessibility spec for it
 * rather than a shortcut — the primary action has to be reachable without
 * opening anything, and a single control cannot both do a thing and offer a
 * list of other things.
 *
 * **Primary only.** Carbon's style guidance is explicit that a combo button
 * uses a primary button, where the menu button may use any kind, so there is no
 * `kind` here to get it wrong with.
 */
@Component({
  selector: 'nine-am-combo-button',
  encapsulation: ViewEncapsulation.None,
  imports: [Button, Icon],
  styleUrl: './menu.scss',
  providers: [{ provide: MenuSurface, useExisting: forwardRef(() => ComboButton) }],
  host: {
    '[class]': 'hostClass()',
    '(document:click)': 'onDocumentClick($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <button
      nineAmButton
      type="button"
      class="nine-am-menu__primary"
      [size]="size()"
      [disabled]="disabled()"
      (click)="primaryAction.emit()"
    >
      {{ label() }}
    </button>

    <button
      #trigger
      nineAmButton
      type="button"
      class="nine-am-menu__trigger nine-am-menu__trigger--split"
      iconOnly
      [size]="size()"
      [disabled]="disabled()"
      [id]="triggerId"
      [attr.aria-label]="menuLabel()"
      aria-haspopup="menu"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="panelId"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)"
    >
      <nine-am-icon class="nine-am-menu__chevron" name="chevron-down" [size]="16" />
    </button>

    <div
      role="menu"
      [id]="panelId"
      [attr.aria-labelledby]="triggerId"
      class="nine-am-menu__panel"
      [class.nine-am-menu__panel--open]="expanded()"
      (keydown)="onPanelKeydown($event)"
    >
      <ng-content />
    </div>
  `,
})
export class ComboButton extends MenuSurface {
  /** The primary action's label, and the button that performs it. */
  readonly label = input.required<string>();

  /**
   * Names the chevron, which has no text of its own. Without it a screen reader
   * announces the second tab stop as "button" and stops.
   */
  readonly menuLabel = input('More actions');

  readonly size = input<ButtonSize>('lg');

  readonly align = input<MenuAlign>('bottom');

  readonly disabled = input(false, { transform: booleanAttribute });

  /** The primary button was pressed. The menu's own actions come through `actionSelected`. */
  readonly primaryAction = output<void>();

  protected readonly triggerId = `nine-am-menu-trigger-${nextId}`;
  protected readonly panelId = `nine-am-menu-panel-${nextId++}`;

  protected readonly items = contentChildren(MenuItem);

  private readonly triggerRef = viewChild.required<ElementRef<HTMLElement>>('trigger');

  protected readonly hostClass = computed(() =>
    [
      'nine-am-menu',
      'nine-am-menu--combo',
      `nine-am-menu--${this.align()}`,
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
export const NINE_AM_MENU = [MenuButton, ComboButton, MenuItem, MenuDivider] as const;
