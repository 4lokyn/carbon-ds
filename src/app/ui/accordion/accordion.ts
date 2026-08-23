import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  Component,
  computed,
  contentChild,
  Directive,
  inject,
  input,
  model,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** Which side the chevron sits on. Carbon's default is `end`. */
export type AccordionAlign = 'start' | 'end';

/** Heading heights: 32 / 40 / 48px, the same scale as fields and buttons. */
export type AccordionSize = 'sm' | 'md' | 'lg';

let nextId = 0;

/**
 * Carbon's accordion: a stack of headings that reveal the content under them.
 *
 * A real `<ul>` — or `<ol>` with `ordered` — holding real `<li>` elements, the
 * same trade `Breadcrumb` makes: a screen reader announces "list, 4 items" and
 * a user can jump through it, and none of that survives being rebuilt on divs.
 * That is why the caller writes the `<li>`.
 *
 * **Several items can be open at once, and there is no input to prevent it.**
 * That is Carbon's behaviour and it is the accessible one — an accordion that
 * closes what you were reading because you opened something else is a tab list
 * wearing the wrong component. If only one should be open, that decision belongs
 * to the caller, who owns every item's `open`.
 *
 * Which is also what makes this usable over a collection. Nothing here queries
 * its children or holds a selected index, so `@for` over rows works, and the
 * open state can be keyed by whatever identifies a row — the way the table keys
 * selection by row id so it survives sorting, filtering and paging.
 */
@Component({
  selector: 'nine-am-accordion',
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  styleUrl: './accordion.scss',
  host: { class: 'nine-am-accordion-host' },
  template: `
    @if (ordered()) {
      <ol [class]="listClass()">
        <ng-container [ngTemplateOutlet]="items" />
      </ol>
    } @else {
      <ul [class]="listClass()">
        <ng-container [ngTemplateOutlet]="items" />
      </ul>
    }

    <!--
      Projected once and stamped into whichever list is live. Two ng-content
      elements would not do: projected nodes are created by the caller and can
      only land in one place.
    -->
    <ng-template #items><ng-content /></ng-template>
  `,
})
export class Accordion {
  /**
   * Which side the chevron sits on. `end` is Carbon's default and reads as a
   * disclosure control; `start` puts it before the title, which suits a nested
   * or tree-ish list where the indent is doing work.
   */
  readonly align = input<AccordionAlign>('end');

  readonly size = input<AccordionSize>('md');

  /**
   * Carbon's `isFlush`: drops the side padding and the rules between items.
   * For an accordion that is already inside something with its own edges — a
   * side panel, a tile — where the borders would double up.
   *
   * Only meaningful at `align="start"` in Carbon's own guidance, because a
   * flush accordion with the chevron at the far end leaves it floating away
   * from everything.
   */
  readonly flush = input(false, { transform: booleanAttribute });

  /** A numbered list rather than a bulletless one. Carbon's `ordered`. */
  readonly ordered = input(false, { transform: booleanAttribute });

  /** Disables every item. An item's own `disabled` covers one. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly listClass = computed(() => {
    const classes = [
      'nine-am-accordion',
      `nine-am-accordion--${this.align()}`,
      `nine-am-accordion--${this.size()}`,
    ];

    if (this.flush()) {
      classes.push('nine-am-accordion--flush');
    }

    return classes.join(' ');
  });
}

/**
 * A rich heading, for when the title is more than a string.
 *
 * Carbon allows the same — its own example passes markup as `title` — and it is
 * what a row of data needs: a name and a status tag read as one heading, not as
 * a heading with something stuck after it.
 *
 *     <li nineAmAccordionItem>
 *       <span nineAmAccordionTitle>
 *         {{ row.name }} <nine-am-tag [color]="hue(row)">{{ row.status }}</nine-am-tag>
 *       </span>
 *       …
 *     </li>
 */
@Directive({
  selector: '[nineAmAccordionTitle]',
  host: { class: 'nine-am-accordion__title-content' },
})
export class AccordionTitle {}

/**
 * A control that sits beside the heading rather than inside it — a checkbox
 * selecting the row, a status dot, an avatar.
 *
 * It exists because the heading is a real `<button>`, and a button may not
 * contain a checkbox or a link: the markup is invalid and the inner control
 * becomes unreachable by keyboard. Anything interactive that belongs to the
 * item as a whole goes here, outside the button, in its own tab stop.
 *
 * Carbon has no equivalent because Carbon's accordion holds prose. A row of
 * data is what asks for it.
 */
@Directive({
  selector: '[nineAmAccordionLead]',
  host: { class: 'nine-am-accordion__lead' },
})
export class AccordionLead {}

/**
 * One heading and the content it reveals.
 *
 * `title` covers the common case; project `[nineAmAccordionTitle]` instead when
 * the heading needs markup. The heading is a real `<button>`, so Enter and Space
 * come free, and `aria-expanded` and `aria-controls` tie it to the region below.
 *
 * The reveal is CSS — a grid row going `0fr` to `1fr`, with `visibility` doing
 * the part that matters, which is keeping collapsed content out of the tab
 * order. Carbon measures nothing here either but reaches for `max-block-size`
 * and `@starting-style`; this is the same technique `ExpandableTile` uses, and
 * one reveal in the system is better than two.
 */
@Component({
  selector: 'li[nineAmAccordionItem]',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './accordion.scss',
  host: { '[class]': 'itemClass()' },
  template: `
    <ng-content select="[nineAmAccordionLead]" />

    <button
      type="button"
      class="nine-am-accordion__heading"
      [id]="headingId"
      [disabled]="isDisabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="contentId"
      (click)="toggle()"
    >
      <nine-am-icon class="nine-am-accordion__arrow" name="chevron-down" [size]="16" />

      <span class="nine-am-accordion__title">
        <ng-content select="[nineAmAccordionTitle]">{{ title() }}</ng-content>
      </span>
    </button>

    <div
      class="nine-am-accordion__wrapper"
      [id]="contentId"
      role="region"
      [attr.aria-labelledby]="headingId"
    >
      <div class="nine-am-accordion__content"><ng-content /></div>
    </div>
  `,
})
export class AccordionItem {
  /** The heading text. Ignored when `[nineAmAccordionTitle]` is projected. */
  readonly title = input('');

  /**
   * Two-way, and deliberately owned by the caller rather than by the accordion.
   * That is what lets open state be keyed by row id across a collection, and
   * what makes "open all" and "close all" a loop over the caller's own data
   * instead of a method on this.
   */
  readonly open = model(false);

  /** Disables this item alone. The accordion's own `disabled` covers all of them. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The heading was pressed. Fires only on interaction, unlike writes to `open`
   * — so a caller can load the section's content the first time it is asked for
   * without the request firing again on every re-render.
   */
  readonly toggled = output<boolean>();

  private readonly accordion = inject(Accordion);

  /**
   * Whether anything was projected into the lead slot. The item only becomes a
   * two-column grid when something is there — otherwise the heading would be
   * squeezed into a column it does not need.
   */
  private readonly lead = contentChild(AccordionLead);

  protected readonly headingId = `nine-am-accordion-heading-${nextId}`;
  protected readonly contentId = `nine-am-accordion-content-${nextId++}`;

  protected readonly isDisabled = computed(() => this.disabled() || this.accordion.disabled());

  protected readonly itemClass = computed(() => {
    const classes = ['nine-am-accordion__item'];

    if (this.open()) {
      classes.push('nine-am-accordion__item--open');
    }

    if (this.isDisabled()) {
      classes.push('nine-am-accordion__item--disabled');
    }

    if (this.lead()) {
      classes.push('nine-am-accordion__item--with-lead');
    }

    return classes.join(' ');
  });

  protected toggle(): void {
    const next = !this.open();

    this.open.set(next);
    this.toggled.emit(next);
  }
}

export const NINE_AM_ACCORDION = [Accordion, AccordionItem, AccordionLead, AccordionTitle] as const;
