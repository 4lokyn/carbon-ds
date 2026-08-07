import {
  booleanAttribute,
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  model,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';

/**
 * Carbon UI Shell.
 *
 * Composed rather than configured: `ds-shell` holds the one piece of state the
 * parts have to agree on — whether the side nav is open — and everything else
 * is a separate element the caller arranges. A single component with twenty
 * inputs would have to guess every layout; this way an app with no side nav
 * simply does not write one.
 *
 * The responsive rule is Carbon's and it is the thing to understand about the
 * shell: below `lg` the header nav is hidden and the hamburger appears, and the
 * side nav collapses to nothing until that hamburger opens it over the content.
 * At `lg` and up the side nav is part of the page and the hamburger goes away.
 */
@Component({
  selector: 'ds-shell',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './shell.scss',
  host: { class: 'ds-shell' },
  template: '<ng-content />',
})
export class Shell {
  /**
   * Open state of the side nav. Only meaningful below `lg`, where the nav is an
   * overlay — above it the nav is always there and this does nothing.
   */
  readonly sideNavOpen = model(false);

  toggleSideNav(): void {
    this.sideNavOpen.update((open) => !open);
  }
}

/** The fixed 48px bar. */
@Component({
  selector: 'ds-shell-header',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  host: { class: 'ds-shell-header', role: 'banner' },
})
export class ShellHeader {}

/**
 * The hamburger. Hidden from `lg` up, where the side nav is permanent and a
 * control that opens it would have nothing to do.
 */
@Component({
  selector: 'button[dsShellMenuButton]',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  host: {
    class: 'ds-shell-header__action ds-shell-header__menu',
    type: 'button',
    '[attr.aria-label]': 'label()',
    '[attr.aria-expanded]': 'shell.sideNavOpen()',
    '(click)': 'shell.toggleSideNav()',
  },
  template: `<ds-icon [name]="shell.sideNavOpen() ? 'close' : 'menu'" [size]="20" />`,
})
export class ShellMenuButton {
  readonly label = input('Open menu');

  protected readonly shell = inject(Shell);
}

/**
 * The product name. An `<a>` because it goes home — Carbon's own is a link, and
 * a heading here would put a second h1 on every page.
 */
@Component({
  selector: 'a[dsShellName]',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ds-shell-header__name' },
  template: `
    @if (prefix()) {
      <span class="ds-shell-header__name-prefix">{{ prefix() }}</span>
    }
    <ng-content />
  `,
})
export class ShellName {
  /** Rendered lighter, before the name. Carbon uses it for the company. */
  readonly prefix = input('');
}

/** Header nav. Hidden below `lg`, where the side nav takes over. */
@Component({
  selector: 'nav[dsShellNav]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  host: { class: 'ds-shell-header__nav' },
})
export class ShellNav {}

/**
 * A dropdown inside the header nav — Carbon's "Sub-menu".
 *
 * Closes on Escape and on losing focus, not on outside click: the panel is
 * inside the header, so a document listener would also catch the click that
 * opened it. `focusout` with a `relatedTarget` check is the same guarantee
 * without the race, and it covers tabbing away as well as clicking away.
 */
@Component({
  selector: 'ds-shell-nav-menu',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  host: {
    class: 'ds-shell-header__submenu',
    '(keydown.escape)': 'expanded.set(false)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    <button
      type="button"
      class="ds-shell-header__submenu-title"
      [attr.aria-expanded]="expanded()"
      (click)="expanded.set(!expanded())"
    >
      {{ label() }}
      <span class="ds-shell-header__submenu-arrow">
        <ds-icon name="chevron-down" />
      </span>
    </button>

    <div class="ds-shell-header__submenu-list" role="list">
      <ng-content />
    </div>
  `,
})
export class ShellNavMenu {
  readonly label = input.required<string>();
  readonly expanded = model(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;

    // Moving between the trigger and its own items is not leaving.
    if (next && this.host.nativeElement.contains(next)) {
      return;
    }

    this.expanded.set(false);
  }
}

/** Right-hand cluster of icon actions. */
@Component({
  selector: 'div[dsShellActions]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  host: { class: 'ds-shell-header__global' },
})
export class ShellActions {}

/**
 * One nav link, in either nav. Marked current with `current`, which sets
 * `aria-current="page"` — the attribute screen readers actually announce, where
 * a class only changes the colour.
 */
@Directive({
  selector: 'a[dsShellLink]',
  host: {
    '[class]': 'hostClass()',
    '[attr.aria-current]': 'current() ? "page" : null',
  },
})
export class ShellLink {
  readonly current = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() =>
    this.current() ? 'ds-shell-link ds-shell-link--current' : 'ds-shell-link',
  );
}

/**
 * The side nav.
 *
 * Two variants, and the difference is layout rather than looks. The default is
 * Carbon's "ux" nav: 256px, permanent from `lg` up, an overlay below it. A
 * `rail` nav is 48px of icons that widens on hover, and it is permanent at every
 * width — which is why it does not participate in the hamburger at all.
 */
@Component({
  selector: 'ds-shell-side-nav',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './shell-side-nav.scss',
  host: {
    '[class]': 'hostClass()',
    role: 'navigation',
    '[attr.aria-label]': 'label()',
  },
  template: `
    <!-- role=list on a div rather than a real <ul>. HTML closes an <li> as soon
         as another one opens, so a group containing items cannot be written as
         nested <li> in an Angular template the way Carbon writes it in JSX —
         the parser reparents them. Explicit roles give the same semantics with
         no implied end tags. -->
    <div class="ds-shell-side-nav__items" role="list">
      <ng-content />
    </div>
  `,
})
export class ShellSideNav {
  readonly label = input('Side navigation');

  /** 48px of icons that widens on hover, instead of a permanent 256px. */
  readonly rail = input(false, { transform: booleanAttribute });

  private readonly shell = inject(Shell);

  protected readonly hostClass = computed(() => {
    const classes = ['ds-shell-side-nav'];

    classes.push(
      this.rail() ? 'ds-shell-side-nav--rail' : 'ds-shell-side-nav--ux',
    );

    if (this.shell.sideNavOpen()) {
      classes.push('ds-shell-side-nav--expanded');
    }

    return classes.join(' ');
  });
}

/**
 * An expandable group inside the side nav.
 *
 * The submenu is kept in the DOM and collapsed with `max-height`, not removed:
 * a height transition needs something to transition, and rebuilding the list on
 * every toggle would drop focus out of it. `visibility: hidden` is what keeps
 * the collapsed links out of the tab order and the a11y tree while they are
 * still rendered.
 */
@Component({
  selector: 'ds-shell-side-nav-menu',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  host: { class: 'ds-shell-side-nav__item', role: 'listitem' },
  template: `
    <button
      type="button"
      class="ds-shell-side-nav__submenu"
      [attr.aria-expanded]="expanded()"
      (click)="expanded.set(!expanded())"
    >
      <span class="ds-shell-side-nav__submenu-text">{{ label() }}</span>
      <span class="ds-shell-side-nav__submenu-chevron">
        <ds-icon name="chevron-down" />
      </span>
    </button>

    <div class="ds-shell-side-nav__menu" role="list">
      <ng-content />
    </div>
  `,
})
export class ShellSideNavMenu {
  readonly label = input.required<string>();

  /** Two-way, so a route can open the group its page lives in. */
  readonly expanded = model(false);
}

/**
 * An icon button in the header's right-hand cluster.
 *
 * Icon-only, so the name is an input rather than text — same rule as every other
 * icon-only control here.
 */
@Component({
  selector: 'button[dsShellAction]',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  host: {
    class: 'ds-shell-header__action',
    type: 'button',
    '[attr.aria-label]': 'label()',
    '[class.ds-shell-header__action--active]': 'active()',
    '[attr.aria-pressed]': 'active() ? true : null',
  },
  template: `<ds-icon [name]="shown()" [size]="20" />`,
})
export class ShellAction {
  readonly icon = input.required<IconName>();
  readonly label = input.required<string>();

  /**
   * Swapped in while active. Carbon turns a panel trigger into a close button
   * rather than leaving the original glyph, so the same control visibly reverses
   * itself instead of looking merely highlighted.
   */
  readonly activeIcon = input<IconName | null>(null);

  /** For an action that opens a panel — Carbon inverts it while open. */
  readonly active = input(false, { transform: booleanAttribute });

  protected readonly shown = computed(
    () => (this.active() && this.activeIcon()) || this.icon(),
  );
}

/**
 * A titled group inside the panel. The rule under the title is a real element
 * rather than a border, because Carbon insets it from both edges — a border on
 * the heading would run the full width.
 */
@Component({
  selector: 'ds-shell-panel-section',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ds-shell-panel__section' },
  template: `
    @if (label()) {
      <p class="ds-shell-panel__section-title">{{ label() }}</p>
      <hr class="ds-shell-panel__divider" />
    }
    <ng-content />
  `,
})
export class ShellPanelSection {
  readonly label = input('');
}

/** A row in the side nav. Any element — see the note on the list container. */
@Component({
  selector: '[dsShellSideNavItem]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  host: { class: 'ds-shell-side-nav__item', role: 'listitem' },
})
export class ShellSideNavItem {}

/**
 * The scrim behind an open side nav, below `lg`.
 *
 * Its own element rather than a pseudo-element on the nav: it has to sit *under*
 * the nav and over the page, and a pseudo-element of the nav cannot be painted
 * below its own host.
 */
@Component({
  selector: 'ds-shell-overlay',
  encapsulation: ViewEncapsulation.None,
  template: '',
  host: {
    '[class]': 'hostClass()',
    '(click)': 'dismiss()',
  },
})
export class ShellOverlay {
  /** Fires after the nav is closed, for anything else that needs to know. */
  readonly dismissed = output<void>();

  private readonly shell = inject(Shell);

  protected dismiss(): void {
    // Closing is the default rather than something the caller wires up. An
    // overlay that darkens the page and then ignores the click is a trap.
    this.shell.sideNavOpen.set(false);
    this.dismissed.emit();
  }

  protected readonly hostClass = computed(() =>
    this.shell.sideNavOpen()
      ? 'ds-shell-overlay ds-shell-overlay--visible'
      : 'ds-shell-overlay',
  );
}

/**
 * The panel that slides in from the right — Carbon's header panel, the one an
 * overflow action opens.
 *
 * Width, not translate: Carbon animates `inline-size` from 0, so the panel
 * pushes nothing and the page behind it does not reflow. `overflow: hidden`
 * while collapsed is what keeps its contents from spilling across the page at
 * zero width.
 */
@Component({
  selector: 'ds-shell-panel',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  host: {
    '[class]': 'hostClass()',
    '[attr.aria-hidden]': '!expanded() ? true : null',
  },
})
export class ShellPanel {
  readonly expanded = model(false);

  protected readonly hostClass = computed(() =>
    this.expanded()
      ? 'ds-shell-panel ds-shell-panel--expanded'
      : 'ds-shell-panel',
  );
}

/**
 * The page body. Offsets itself from the header, and from the side nav at the
 * widths where the nav is permanent.
 *
 * An element of its own, not an attribute on the app's `<main>`. It was the
 * attribute form first and that was wrong: the offsets are margins, the app puts
 * its own layout class on the same element, and `margin: 0 auto` on that class
 * silently wiped both of them — the content slid under the header and ignored
 * the side nav. Owning the element means nothing else can write to it.
 */
@Component({
  selector: 'ds-shell-content',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  host: { '[class]': 'hostClass()', role: 'main' },
})
export class ShellContent {
  /** Set this when there is a side nav, so the content clears it. */
  readonly withSideNav = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() =>
    this.withSideNav()
      ? 'ds-shell-content ds-shell-content--with-side-nav'
      : 'ds-shell-content',
  );
}

/** Import this instead of the nine pieces one by one. */
export const DS_SHELL = [
  Shell,
  ShellHeader,
  ShellMenuButton,
  ShellName,
  ShellNav,
  ShellNavMenu,
  ShellActions,
  ShellLink,
  ShellAction,
  ShellSideNav,
  ShellSideNavItem,
  ShellSideNavMenu,
  ShellOverlay,
  ShellPanel,
  ShellPanelSection,
  ShellContent,
] as const;
