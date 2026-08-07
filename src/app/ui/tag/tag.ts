import {
  booleanAttribute,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

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

@Component({
  selector: 'ds-tag',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './tag.scss',
  host: {
    '[class]': 'hostClass()',
  },
  template: `
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

  /** Renders the close button. Emits `dismissed` — removal is the caller's job. */
  readonly dismissible = input(false, { transform: booleanAttribute });

  /**
   * Accessible name for the close button. Required when dismissible, because
   * the button contains only an icon. Pass the translated string.
   */
  readonly dismissLabel = input('Remove');

  readonly dismissed = output<void>();

  protected readonly hostClass = computed(
    () => `ds-tag ds-tag--${this.color()} ds-tag--${this.size()}`,
  );
}
