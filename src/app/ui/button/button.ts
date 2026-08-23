import { booleanAttribute, Component, computed, input, ViewEncapsulation } from '@angular/core';

/**
 * Carbon button kinds. `tertiary` is the outlined one, `ghost` the lowest emphasis.
 * Carbon's guidance: exactly one primary per view.
 */
export type ButtonKind =
  'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'danger-tertiary' | 'danger-ghost';

/**
 * Carbon's size scale: 24 / 32 / 40 / 48 / 64 / 80 px.
 *
 * `sm` through `xl` are the field heights, shared with inputs so a form row
 * lines up. `xs` and `2xl` are button-only — a 24px button for a dense table
 * row, an 80px one for the single call to action on a page.
 */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Applied as an attribute on a native `<button>` rather than wrapping it in a
 * custom element. That keeps the real button semantics — form submission, the
 * `disabled` property, implicit `type=submit` — instead of us reimplementing them.
 * No headless primitive needed here: a button is already a button.
 *
 * Encapsulation is None across the whole system. See ui/README.md for why.
 */
@Component({
  selector: 'button[nineAmButton]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  styleUrl: './button.scss',
  host: {
    '[class]': 'hostClass()',
    '[disabled]': 'disabled()',
  },
})
export class Button {
  readonly kind = input<ButtonKind>('primary');
  readonly size = input<ButtonSize>('lg');
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Stretches to the container width. Carbon calls this a fluid button. */
  readonly fullWidth = input(false, { transform: booleanAttribute });

  /**
   * A square button holding nothing but an icon.
   *
   * Not a nicety: the default padding is `0 63px 0 15px`, a wide right gutter
   * that is the Carbon silhouette and reserves the icon slot beside a label.
   * Put an icon in on its own and you get a 100px-wide button with the glyph
   * jammed against the left edge. Any toolbar of icon actions needs this.
   *
   * Supply an accessible name yourself — `aria-label` on the button — because
   * there is no text left to name it.
   */
  readonly iconOnly = input(false, { transform: booleanAttribute });

  // One computed string rather than several [class.x] bindings — a single source
  // of truth for the host class list, and easier to read in devtools.
  protected readonly hostClass = computed(() => {
    const classes = ['nine-am-btn', `nine-am-btn--${this.kind()}`, `nine-am-btn--${this.size()}`];

    if (this.fullWidth()) {
      classes.push('nine-am-btn--full');
    }

    if (this.iconOnly()) {
      classes.push('nine-am-btn--icon-only');
    }

    return classes.join(' ');
  });
}
