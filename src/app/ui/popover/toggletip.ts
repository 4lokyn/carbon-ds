import {
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  InjectionToken,
  input,
  model,
  ViewEncapsulation,
} from '@angular/core';
import { Popover } from './popover';
import { parseAlign, type PopoverAlign } from './popover-position';

export const DS_TOGGLETIP = new InjectionToken<Toggletip>('DS_TOGGLETIP');

/**
 * Carbon's toggletip: supplemental content opened by a click, which **may be
 * interactive** and stays open until it is dismissed.
 *
 * That is the whole difference from `Tooltip`, and Carbon states it plainly: a
 * tooltip is hover or focus and never interactive; a toggletip is click or Enter
 * and exists precisely so something inside it can be operated.
 *
 * **This one is not in an overlay, and the tooltip is.** The two made opposite
 * calls for a reason Carbon names: a toggletip must maintain *focus order*. The
 * CDK's overlay portals its panel to the end of `<body>`, so Tab would leave the
 * trigger and skip straight past the content it just opened. Keeping the panel
 * where it is in the DOM — immediately after the button, the way Carbon renders
 * it — makes Tab do the right thing with no focus management at all.
 *
 * The price is the one the CDK was buying off: no flipping away from a viewport
 * edge, and an ancestor with `overflow: hidden` will clip it. Carbon's own
 * toggletip has both limitations. A tooltip is never focusable, so it gave up
 * nothing by going into the overlay, and gained the flip.
 */
@Component({
  selector: 'ds-toggletip',
  encapsulation: ViewEncapsulation.None,
  imports: [Popover],
  styleUrl: './popover.scss',
  providers: [{ provide: DS_TOGGLETIP, useExisting: Toggletip }],
  host: {
    '[class]': 'hostClass()',
    '(keydown.escape)': 'close(true)',
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <ng-content select="[dsToggletipButton]" />

    @if (open()) {
      <ds-popover class="ds-toggletip__panel" highContrast [side]="side()">
        <div class="ds-toggletip__content"><ng-content /></div>
      </ds-popover>
    }
  `,
})
export class Toggletip {
  readonly align = input<PopoverAlign>('bottom');

  readonly open = model(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly side = computed(() => parseAlign(this.align()).side);

  protected readonly hostClass = computed(() => {
    const { side, alignment } = parseAlign(this.align());

    return `ds-toggletip ds-toggletip--${side} ds-toggletip--${alignment}`;
  });

  toggle(): void {
    this.open.update((open) => !open);
  }

  /**
   * `returnFocus` is true for Escape and false for a click elsewhere. Escape is
   * a keyboard user saying "put me back"; a click has already moved focus
   * somewhere deliberate, and dragging it back would fight them.
   */
  close(returnFocus = false): void {
    if (!this.open()) {
      return;
    }

    this.open.set(false);

    if (returnFocus) {
      this.host.nativeElement.querySelector<HTMLElement>('[dsToggletipButton]')?.focus();
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }

    // Anything inside stays open — including the interactive content, which is
    // the entire reason this component exists.
    if (this.host.nativeElement.contains(event.target as Node)) {
      return;
    }

    this.close();
  }
}

/**
 * The trigger. An attribute, so it can sit on whatever button the caller
 * already has — usually an icon-only one.
 */
@Directive({
  selector: '[dsToggletipButton]',
  host: {
    '[attr.aria-expanded]': 'toggletip.open()',
    '(click)': 'toggletip.toggle()',
  },
})
export class ToggletipButton {
  protected readonly toggletip = inject(DS_TOGGLETIP);
}

export const DS_TOGGLETIP_PARTS = [Toggletip, ToggletipButton] as const;
