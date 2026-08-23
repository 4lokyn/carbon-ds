import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  Component,
  computed,
  Directive,
  inject,
  input,
  model,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';

let nextId = 0;

/**
 * Carbon's tile: a rectangle of `$layer-01` holding a piece of content.
 *
 * **It has no border, and that is Carbon's default rather than an omission.**
 * In `@carbon/styles` the tile border sits behind the `enable-tile-contrast`
 * feature flag; without it a tile is told apart from the page by its surface
 * alone — `$layer-01` against `$background`. The catch is that this only works
 * while the tile sits *on* the page. Drop one inside a modal or another tile,
 * where the ground is already `$layer-01`, and it disappears. Carbon has the
 * same problem, which is what the flag is for; put the tile on the page.
 */
@Component({
  selector: 'nine-am-tile',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './tile.scss',
  host: { class: 'nine-am-tile' },
  template: '<ng-content />',
})
export class Tile {}

/**
 * A tile that navigates. An attribute on a real `<a>`, the same trade `Link`
 * and `Button` make: an `<a href>` already opens in a new tab on middle-click,
 * shows its target in the status bar and is announced as a link, and none of
 * that survives being rebuilt on a `<div (click)>`.
 *
 * `disabled` is not a thing an anchor has, so it is done the way it has to be
 * done — the `href` is dropped, which is what actually takes the element out of
 * the tab order, and `aria-disabled` says so out loud.
 */
@Component({
  selector: 'a[nineAmClickableTile]',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './tile.scss',
  host: {
    '[class]': 'hostClass()',
    '[attr.href]': 'disabled() ? null : href()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
  },
  template: '<ng-content />',
})
export class ClickableTile {
  readonly href = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() => {
    const classes = ['nine-am-tile', 'nine-am-tile--clickable'];

    if (this.disabled()) {
      classes.push('nine-am-tile--disabled');
    }

    return classes.join(' ');
  });
}

/**
 * A tile that is a checkbox.
 *
 * The markup is Carbon's, and the reason is worth keeping: a visually hidden
 * real `<input type="checkbox">` paired with a `<label>` that carries the tile
 * styling. The input is what makes this a checkbox to a screen reader, what
 * gives Space its meaning for free, and what a `<form>` collects on submit — a
 * `<div role="checkbox">` gets none of the three without work, and gets the
 * third not at all.
 *
 * **The checkmark is always visible here, and Carbon's is not.** In
 * `@carbon/styles` it sits at `opacity: 0` until the tile is selected, which
 * leaves a selectable tile looking exactly like a plain one — nothing on screen
 * says it can be chosen. Carbon treats that as the defect it is and fixes it
 * behind `enable-v12-tile-radio-icons`, on its way to being the v12 default.
 * Matching a default its own authors have already replaced is not fidelity, so
 * this follows where Carbon is going rather than where it stands.
 */
@Component({
  selector: 'nine-am-selectable-tile',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './tile.scss',
  host: { class: 'nine-am-selectable-tile-host' },
  template: `
    <input
      type="checkbox"
      class="nine-am-tile-input"
      [id]="inputId"
      [attr.name]="name()"
      [attr.value]="value()"
      [checked]="selected()"
      [disabled]="disabled()"
      (change)="onChange($event)"
    />

    <label [attr.for]="inputId" [class]="tileClass()">
      <span class="nine-am-tile-content"><ng-content /></span>
      <span class="nine-am-tile__checkmark"><nine-am-icon name="checkmark-filled" /></span>
    </label>
  `,
})
export class SelectableTile {
  readonly selected = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Both are passed through to the input, for a tile inside a real `<form>`. */
  readonly name = input<string>();
  readonly value = input<string>();

  protected readonly inputId = `nine-am-selectable-tile-${nextId++}`;

  protected readonly tileClass = computed(() => {
    const classes = ['nine-am-tile', 'nine-am-tile--selectable'];

    if (this.selected()) {
      classes.push('nine-am-tile--is-selected');
    }

    if (this.disabled()) {
      classes.push('nine-am-tile--disabled');
    }

    return classes.join(' ');
  });

  protected onChange(event: Event): void {
    this.selected.set((event.target as HTMLInputElement).checked);
  }
}

/** The part that is always on screen. */
@Directive({
  selector: '[nineAmTileAboveFold]',
  host: { class: 'nine-am-tile-content__above-the-fold' },
})
export class TileAboveFold {}

/** The part the chevron reveals. */
@Directive({
  selector: '[nineAmTileBelowFold]',
  host: { class: 'nine-am-tile-content__below-the-fold' },
})
export class TileBelowFold {}

/**
 * A tile that opens to show more.
 *
 * **`interactive` is the input to get right.** By default the whole tile is one
 * big `<button>`, which is what Carbon does and is genuinely the nicer target —
 * but a `<button>` may not contain another button or a link. The moment the
 * tile holds anything clickable, that markup is invalid and the inner control
 * becomes unreachable by keyboard. Set `interactive` and only the chevron is a
 * button; the tile itself stops being one.
 *
 * Collapsed content stays in the DOM and is hidden with `visibility`, which is
 * what keeps it out of the tab order — `overflow: hidden` alone would leave a
 * keyboard user tabbing into content nobody can see. That part is Carbon's.
 *
 * The tile also keeps a gutter clear on its trailing edge, which Carbon does
 * not. Carbon's chevron simply sits over whatever is in the bottom-right
 * corner, and its examples stay clear of it by keeping the content short; put
 * an ordinary sentence in one and the last line runs underneath. The gutter is
 * the width Carbon's *selectable* tile already reserves for its checkmark.
 *
 * The open/close animation is not. Carbon measures the above-the-fold content
 * in JavaScript and writes a `max-height` in pixels; this animates
 * `grid-template-rows` from `0fr` to `1fr` instead, which lands the same
 * result out of CSS alone — no measuring, no re-measuring when the content
 * reflows, and nothing to go stale when a font loads late.
 */
@Component({
  selector: 'nine-am-expandable-tile',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon, NgTemplateOutlet],
  styleUrl: './tile.scss',
  host: { class: 'nine-am-expandable-tile-host' },
  template: `
    @if (interactive()) {
      <div [class]="tileClass()">
        <ng-container [ngTemplateOutlet]="body" />

        <button
          type="button"
          class="nine-am-tile__chevron nine-am-tile__chevron--interactive"
          [attr.aria-expanded]="expanded()"
          [attr.aria-label]="chevronLabel()"
          (click)="expanded.set(!expanded())"
        >
          <nine-am-icon name="chevron-down" />
        </button>
      </div>
    } @else {
      <button
        type="button"
        [class]="tileClass()"
        [attr.aria-expanded]="expanded()"
        (click)="expanded.set(!expanded())"
      >
        <ng-container [ngTemplateOutlet]="body" />

        <span class="nine-am-tile__chevron">
          <nine-am-icon name="chevron-down" />
        </span>
      </button>
    }

    <!--
      Projected once and stamped into whichever branch is live. Two copies of
      the ng-content would not work: projected nodes are created by the parent
      and can only land in one place.
    -->
    <ng-template #body>
      <ng-content select="[nineAmTileAboveFold]" />

      <div class="nine-am-tile__below">
        <ng-content select="[nineAmTileBelowFold]" />
      </div>
    </ng-template>
  `,
})
export class ExpandableTile {
  readonly expanded = model(false);

  /** Set this whenever the tile contains a link or a button. See the class note. */
  readonly interactive = input(false, { transform: booleanAttribute });

  /**
   * Names the chevron in the `interactive` case, where it is the only control
   * and "button" is all a screen reader would otherwise have to announce. The
   * default tile needs no equivalent: it is labelled by its own content.
   */
  readonly collapsedLabel = input('Expand');
  readonly expandedLabel = input('Collapse');

  protected readonly chevronLabel = computed(() =>
    this.expanded() ? this.expandedLabel() : this.collapsedLabel(),
  );

  protected readonly tileClass = computed(() => {
    const classes = ['nine-am-tile', 'nine-am-tile--expandable'];

    if (this.interactive()) {
      classes.push('nine-am-tile--expandable--interactive');
    }

    if (this.expanded()) {
      classes.push('nine-am-tile--is-expanded');
    }

    return classes.join(' ');
  });
}

/**
 * The single-select tile: a group of tiles where exactly one is chosen.
 *
 * A `<fieldset>` with a `<legend>`, and the same trade `RadioGroup` makes for
 * the same return. Native radios sharing a `name` give single selection, arrow
 * keys, wrapping, and a group that is *one* tab stop — none of it code we wrote
 * — and the `<fieldset>` cascades `disabled` to every tile inside while the
 * `<legend>` names the group to a screen reader.
 *
 * Use it where `SelectableTile` would be wrong: that one is a checkbox, so it
 * answers "which of these", and this one answers "which one of these". The
 * markup is what carries the difference, not the styling.
 */
@Component({
  selector: 'nine-am-tile-group',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './tile.scss',
  host: { '[class]': 'hostClass()' },
  template: `
    <fieldset class="nine-am-tile-group__fieldset" [disabled]="disabled()">
      <legend class="nine-am-tile-group__legend" [class.nine-am-visually-hidden]="hideLegend()">
        {{ legend() }}
      </legend>

      <div class="nine-am-tile-group__tiles"><ng-content /></div>
    </fieldset>
  `,
})
export class TileGroup {
  /**
   * Names the group. Required, because a set of radios without one is a set of
   * options nobody has said what they are options *for* — `hideLegend` covers
   * the case where the page already says it visually.
   */
  readonly legend = input.required<string>();

  /** The `value` of the chosen tile. Carbon splits this into `defaultSelected` and `valueSelected`. */
  readonly value = model('');

  /** Disables every tile in the group. The `<fieldset>` does the work. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly hideLegend = input(false, { transform: booleanAttribute });

  /** Fires only on user interaction, unlike writes to the `value` model. */
  readonly selected = output<string>();

  /** Shared by every radio in the group. One `name` is what makes them one group. */
  readonly name = `nine-am-tile-group-${nextId++}`;

  protected readonly hostClass = computed(() =>
    this.disabled() ? 'nine-am-tile-group nine-am-tile-group--disabled' : 'nine-am-tile-group',
  );

  /** Called by a tile when it is chosen. */
  select(next: string): void {
    this.value.set(next);
    this.selected.emit(next);
  }
}

/**
 * One tile in a `nine-am-tile-group`.
 *
 * Built the way `SelectableTile` is and for the same reasons — a visually
 * hidden real `<input>`, here a radio, paired with a `<label>` that carries the
 * tile styling. The input is what a form submits, what a screen reader
 * announces, and what makes the arrow keys work without a line of code.
 *
 * It has to be inside a group: the `name`, the chosen value and `disabled` all
 * live there, and a lone radio tile has nothing to be single-select *against*.
 *
 * The icon is always visible here too, and Carbon's own `enable-v12-tile-radio-icons`
 * is where that comes from — see `SelectableTile` for the argument. Two drawings
 * rather than one recoloured: an empty ring, and a ring with a disc in it.
 */
@Component({
  selector: 'nine-am-radio-tile',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './tile.scss',
  host: { class: 'nine-am-radio-tile-host' },
  template: `
    <input
      type="radio"
      class="nine-am-tile-input"
      [id]="inputId"
      [name]="group.name"
      [value]="value()"
      [checked]="group.value() === value()"
      [disabled]="disabled()"
      (change)="group.select(value())"
    />

    <label [attr.for]="inputId" [class]="tileClass()">
      <span class="nine-am-tile-content"><ng-content /></span>
      <span class="nine-am-tile__checkmark">
        <nine-am-icon
          [name]="group.value() === value() ? 'radio-button-checked' : 'radio-button'"
        />
      </span>
    </label>
  `,
})
export class RadioTile {
  readonly value = input.required<string>();

  /** Disables this tile alone. The group's own `disabled` covers all of them. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly group = inject(TileGroup);
  protected readonly inputId = `nine-am-radio-tile-${nextId++}`;

  protected readonly tileClass = computed(() => {
    const classes = ['nine-am-tile', 'nine-am-tile--selectable'];

    if (this.group.value() === this.value()) {
      classes.push('nine-am-tile--is-selected');
    }

    if (this.disabled()) {
      classes.push('nine-am-tile--disabled');
    }

    return classes.join(' ');
  });
}

export const NINE_AM_TILE = [
  Tile,
  ClickableTile,
  SelectableTile,
  ExpandableTile,
  TileGroup,
  RadioTile,
  TileAboveFold,
  TileBelowFold,
] as const;
