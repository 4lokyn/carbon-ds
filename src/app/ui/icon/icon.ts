import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import { ICON_PATHS, type IconName } from './icons';

/**
 * Renders a Carbon icon from inlined path data.
 *
 * Always `aria-hidden` — an icon never carries the accessible name. Whatever the
 * icon sits inside supplies that: `aria-label` on an icon-only button, visible
 * text next to it otherwise. There is deliberately no `label` input, so there is
 * no way to accidentally rely on the icon for semantics.
 */
@Component({
  selector: 'nine-am-icon',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nine-am-icon' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      @for (path of paths(); track $index) {
        <path [attr.d]="path" fill="currentColor" />
      }
    </svg>
  `,
  styles: `
    .nine-am-icon {
      display: inline-flex;
      flex: 0 0 auto;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();

  /** Carbon ships icons at 16 / 20 / 24 / 32. 16 is the UI default. */
  readonly size = input(16);

  protected readonly paths = computed(() => ICON_PATHS[this.name()]);
}
