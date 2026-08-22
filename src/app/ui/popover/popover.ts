import { booleanAttribute, Component, computed, input, ViewEncapsulation } from '@angular/core';
import type { PopoverSide } from './popover-position';

/**
 * The popover surface: a panel, and optionally a caret pointing at whatever
 * opened it.
 *
 * Deliberately presentational. It does no positioning, owns no open state and
 * has no timers — those belong to whatever is using it, because a tooltip and a
 * toggletip open for completely different reasons. What they share is this
 * surface, and sharing it is the point: three components, one set of pixels.
 *
 * `side` is the side of the *trigger* the panel sits on, and it is what the
 * caret points back along. It has to be told, not chosen, because after the CDK
 * flips a panel away from a viewport edge the trigger is on the other side.
 */
@Component({
  selector: 'ds-popover',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './popover.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    @if (caret()) {
      <span class="ds-popover__caret"></span>
    }

    <div class="ds-popover__content"><ng-content /></div>
  `,
})
export class Popover {
  readonly side = input<PopoverSide>('bottom');

  readonly caret = input(true, { transform: booleanAttribute });

  /**
   * Carbon's high-contrast popover: the inverse surface, which is what a tooltip
   * uses. A toggletip stays on the layer colour, because its content is read
   * rather than glanced at.
   */
  readonly highContrast = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() => {
    const classes = ['ds-popover', `ds-popover--${this.side()}`];

    if (this.highContrast()) {
      classes.push('ds-popover--high-contrast');
    }

    return classes.join(' ');
  });
}
