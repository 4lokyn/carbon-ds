import {
  booleanAttribute,
  Component,
  computed,
  input,
  model,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';

/**
 * Carbon's tag palette. These are not arbitrary colors — Carbon assigns them
 * meaning per product, and the token set guarantees the text/background pair
 * meets contrast in all four themes.
 */
export type TagColor =
  | 'gray'
  | 'cool-gray'
  | 'warm-gray'
  | 'red'
  | 'magenta'
  | 'purple'
  | 'blue'
  | 'cyan'
  | 'teal'
  | 'green';

export type TagSize = 'sm' | 'md' | 'lg';

/**
 * A read-only tag: a piece of data about the thing it sits on.
 *
 * If it is clickable it is not this component — see `button[dsTag]` below. That
 * split is the same one the button makes: a control that responds to a click is
 * a `<button>`, and no amount of `role` and `tabindex` on a `<span>` is as good
 * as the element that already means it.
 */
@Component({
  selector: 'ds-tag',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './tag.scss',
  host: {
    '[class]': 'hostClass()',
  },
  template: `
    @if (icon(); as name) {
      <ds-icon class="ds-tag__icon" [name]="name" />
    }

    <span class="ds-tag__label">
      <ng-content />
    </span>

    @if (dismissible()) {
      <button
        class="ds-tag__close"
        type="button"
        [attr.aria-label]="dismissLabel()"
        (click)="dismissed.emit()"
      >
        <!-- Carbon Close/16. Inlined rather than pulling in @carbon/icons-angular
             for a single glyph — that package is large and we only need a few. -->
        <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
          <path
            fill="currentColor"
            d="M17.4141 16L24 9.4141 22.5859 8 16 14.5859 9.4143 8 8 9.4141 14.5859 16 8 22.5859 9.4143 24 16 17.4141 22.5859 24 24 22.5859z"
          />
        </svg>
      </button>
    }
  `,
})
export class Tag {
  readonly color = input<TagColor>('gray');
  readonly size = input<TagSize>('md');

  /**
   * A glyph before the label. Decorative — it never carries meaning the text
   * does not, because `Icon` is always `aria-hidden` and a tag is often the only
   * label a row has.
   */
  readonly icon = input<IconName>();

  readonly disabled = input(false, { transform: booleanAttribute });

  /** Renders the close button. Emits `dismissed` — removal is the caller's job. */
  readonly dismissible = input(false, { transform: booleanAttribute });

  /**
   * Accessible name for the close button. Required when dismissible, because
   * the button contains only an icon. Pass the translated string.
   */
  readonly dismissLabel = input('Remove');

  readonly dismissed = output<void>();

  protected readonly hostClass = computed(() => {
    const classes = ['ds-tag', `ds-tag--${this.color()}`, `ds-tag--${this.size()}`];

    if (this.disabled()) {
      classes.push('ds-tag--disabled');
    }

    return classes.join(' ');
  });
}

/**
 * Carbon's two interactive tags, on a native `<button>`.
 *
 * Carbon ships them as `SelectableTag` and `OperationalTag`. They are one
 * component here because they differ in exactly one thing — whether the tag
 * carries a pressed state — and that is `selectable`:
 *
 * - **selectable** — a filter chip. Toggles, and reports it with `aria-pressed`.
 * - **operational** (the default) — a tag that opens something: a popover of the
 *   other twelve tags, a menu. It has no state of its own, so it has no
 *   `aria-pressed`; if it opens an overlay, put `aria-expanded` on it yourself.
 *
 * Selectable takes no `color`. Carbon gives it one look — layer, inverted when
 * selected — because a chip that is both blue and selected has two things
 * saying "picked" and neither wins.
 */
@Component({
  selector: 'button[dsTag]',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './tag.scss',
  host: {
    '[class]': 'hostClass()',
    '[disabled]': 'disabled()',
    '[attr.type]': '"button"',
    '[attr.aria-pressed]': 'selectable() ? selected() : null',
    '(click)': 'onClick()',
  },
  template: `
    @if (icon(); as name) {
      <ds-icon class="ds-tag__icon" [name]="name" />
    }

    <span class="ds-tag__label">
      <ng-content />
    </span>
  `,
})
export class InteractiveTag {
  /** Operational tags take the palette; selectable ones deliberately do not. */
  readonly color = input<TagColor>('gray');
  readonly size = input<TagSize>('md');
  readonly icon = input<IconName>();

  readonly disabled = input(false, { transform: booleanAttribute });

  /** Turns this into Carbon's selectable tag: a toggle with a pressed state. */
  readonly selectable = input(false, { transform: booleanAttribute });

  readonly selected = model(false);

  /** Fires only on user interaction, unlike writes to the `selected` model. */
  readonly toggled = output<boolean>();

  protected readonly hostClass = computed(() => {
    const classes = ['ds-tag', 'ds-tag--interactive', `ds-tag--${this.size()}`];

    if (this.selectable()) {
      classes.push('ds-tag--selectable');

      if (this.selected()) {
        classes.push('ds-tag--selected');
      }
    } else {
      classes.push('ds-tag--operational', `ds-tag--${this.color()}`);
    }

    if (this.disabled()) {
      classes.push('ds-tag--disabled');
    }

    return classes.join(' ');
  });

  protected onClick(): void {
    if (!this.selectable()) {
      return;
    }

    const next = !this.selected();

    this.selected.set(next);
    this.toggled.emit(next);
  }
}

export const DS_TAG = [Tag, InteractiveTag] as const;
