import { booleanAttribute, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';

/** 12 / 14 / 16px, matching Carbon's helper-text-01, body-compact-01, body-compact-02. */
export type LinkSize = 'sm' | 'md' | 'lg';

/**
 * Carbon's link, as an attribute on a native `<a>`.
 *
 * The same trade the button makes: an `<a href>` already navigates, opens in a
 * new tab on middle-click, shows its target in the status bar and is announced
 * as a link. None of that survives being reimplemented on a `<span>`.
 *
 * **Standalone vs inline** is the decision worth making. A standalone link sits
 * on its own — in a card footer, at the end of a section — and is underlined
 * only on hover, because nothing around it competes. An `inline` link sits
 * inside a sentence and is underlined always: in running text, color alone is
 * not a reliable signal that something is clickable, and for a colour-blind
 * reader it is no signal at all.
 */
@Component({
  selector: 'a[nineAmLink]',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './link.scss',
  host: {
    '[class]': 'hostClass()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '(click)': 'onClick($event)',
  },
  template: `
    <ng-content />

    @if (icon(); as name) {
      <span class="nine-am-link__icon"><nine-am-icon [name]="name" /></span>
    }
  `,
})
export class Link {
  readonly size = input<LinkSize>('md');

  /** Underlined always, and flows with the text it sits in. See the class note. */
  readonly inline = input(false, { transform: booleanAttribute });

  /**
   * Greys the link out and swallows the click.
   *
   * Carbon React renders a `<p>` instead of an `<a>` for this, which takes the
   * link out of the accessibility tree entirely — a screen reader user is not
   * told the thing exists, let alone that it is unavailable. This keeps the
   * anchor, keeps it focusable, and marks it `aria-disabled`, which is the
   * pattern ARIA actually specifies for a link that must look unavailable.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Opt in to the visited colour.
   *
   * Off is Carbon's default — its base rule paints `:visited` the same as
   * unvisited, and the purple only arrives with the modifier class. The reason
   * to leave it off is ours rather than Carbon's, and it is that in an
   * application most links go to places you have already been, so purple
   * everywhere carries no information. Turn it on where "have I read this?" is
   * a real question: a docs index, a list of articles.
   */
  readonly visited = input(false, { transform: booleanAttribute });

  /**
   * A glyph after the text. Decorative: `Icon` is always `aria-hidden`, and the
   * link text is the accessible name.
   */
  readonly icon = input<IconName>();

  protected readonly hostClass = computed(() => {
    const classes = ['nine-am-link', `nine-am-link--${this.size()}`];

    if (this.inline()) {
      classes.push('nine-am-link--inline');
    }

    if (this.disabled()) {
      classes.push('nine-am-link--disabled');
    }

    if (this.visited()) {
      classes.push('nine-am-link--visited');
    }

    if (this.icon()) {
      classes.push('nine-am-link--icon');
    }

    return classes.join(' ');
  });

  protected onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
    }
  }
}
