import {
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';
import type { FieldSize } from '../field/field-types';

let nextId = 0;

/**
 * Carbon search field: a magnifier, the input, and a clear button that appears
 * once there is something to clear.
 *
 * `value` is a `model()`, which is the whole Signal Forms contract for
 * `FormValueControl<string>` — see ui/README.md. It updates on every keystroke,
 * because that is what a filter needs; debouncing is the caller's business and
 * belongs where the expensive work is, not in the control.
 */
@Component({
  selector: 'ds-search',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  host: { '[class]': 'hostClass()' },
})
export class Search {
  /**
   * The accessible name. Required, and rendered visually hidden — a search box
   * whose only label is its placeholder loses that label the moment anyone types.
   */
  readonly label = input.required<string>();

  readonly value = model('');
  readonly placeholder = input('');
  readonly size = input<FieldSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Icon-only control, so the name is an input. See ui/README.md. */
  readonly clearLabel = input('Clear search input');

  /** Names the collapsed magnifier button. Unused unless `expandable`. */
  readonly expandLabel = input('Expand search');

  /**
   * Collapses to a magnifier button until it is used.
   *
   * Carbon ships both this and the persistent search and — checked — states no
   * rule for choosing between them, so it is a layout call: expandable when the
   * toolbar is crowded, persistent when there is room. The collapsed state is a
   * real button, not a shrunken field, because a 40px input with no visible
   * affordance is not something anyone would click.
   */
  readonly expandable = input(false, { transform: booleanAttribute });

  /** Fires only for the clear button, not for a user selecting all and deleting. */
  readonly cleared = output<void>();

  /** Only meaningful while `expandable`. */
  protected readonly expanded = signal(false);

  protected readonly inputId = `ds-search-${nextId++}`;

  private readonly inputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly hostClass = computed(() => {
    const classes = ['ds-search', `ds-search--${this.size()}`];

    if (this.expandable()) {
      classes.push('ds-search--expandable');
    }

    // Stays open while there is something in it: collapsing over a live filter
    // would hide the reason the list is short.
    if (this.expandable() && (this.expanded() || this.value())) {
      classes.push('ds-search--expanded');
    }

    if (this.disabled()) {
      classes.push('ds-search--disabled');
    }

    return classes.join(' ');
  });

  protected readonly isExpanded = computed(
    () => this.expandable() && (this.expanded() || this.value() !== ''),
  );

  protected expand(): void {
    this.expanded.set(true);
    // The input is what the person wants; the magnifier was only the doorway.
    this.inputRef().nativeElement.focus();
  }

  /**
   * Collapse again on the way out, but only if nothing was typed. Leaving an
   * empty field expanded holds toolbar space for no reason; collapsing a full
   * one would hide the filter that is shortening the list.
   */
  protected onBlur(): void {
    if (this.expandable() && this.value() === '') {
      this.expanded.set(false);
    }
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected clear(): void {
    this.value.set('');
    this.cleared.emit();

    // The button removes itself the moment the value empties, and focus on a
    // removed element falls to <body> — which drops a keyboard user out of the
    // form entirely. Carbon moves focus to the input; so do we.
    this.inputRef().nativeElement.focus();
  }
}
