import { Overlay, type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  Component,
  type ComponentRef,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Injector,
  input,
  numberAttribute,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Popover } from './popover';
import {
  popoverPositions,
  sideFromPosition,
  type PopoverAlign,
  type PopoverSide,
} from './popover-position';

let nextId = 0;

/** Internal. The thing the overlay actually renders. */
@Component({
  selector: 'nine-am-tooltip-panel',
  encapsulation: ViewEncapsulation.None,
  imports: [Popover],
  template: `
    <nine-am-popover highContrast [side]="side()">
      <p class="nine-am-tooltip__text" [id]="panelId()" role="tooltip">{{ label() }}</p>
    </nine-am-popover>
  `,
  styleUrl: './popover.scss',
})
export class TooltipPanel {
  readonly label = input('');
  readonly side = input<PopoverSide>('bottom');
  readonly panelId = input('');
}

/**
 * Carbon's tooltip: a label that appears beside a control on hover or focus.
 *
 * An attribute, because a tooltip is something a control *has* rather than
 * something that wraps it — and because the trigger has to keep being whatever
 * it already was, usually an icon-only button.
 *
 * Two rules it enforces rather than offering:
 *
 * - **It is never the only label.** The tooltip is wired as `aria-describedby`,
 *   not `aria-labelledby`. An icon-only button still needs its own `aria-label`;
 *   this describes, it does not name. A tooltip that is the only name disappears
 *   for anyone who cannot hover.
 * - **The content is not interactive.** No links, no buttons, nothing to reach —
 *   there is no way to move a pointer into it without crossing dead space, and
 *   nothing puts focus inside. Interactive content is what `Toggletip` is for.
 */
@Directive({
  selector: '[nineAmTooltip]',
  host: {
    '[attr.aria-describedby]': 'open() ? panelId : null',
    '(mouseenter)': 'scheduleOpen()',
    '(mouseleave)': 'scheduleClose()',
    '(focus)': 'show()',
    '(blur)': 'hide()',
    '(click)': 'onActivate()',
    '(keydown.escape)': 'hide()',
  },
})
export class Tooltip {
  /** The text. An empty string turns the tooltip off entirely. */
  readonly label = input.required<string>({ alias: 'nineAmTooltip' });

  readonly align = input<PopoverAlign>('bottom', { alias: 'tooltipAlign' });

  /**
   * Carbon's defaults: a short wait before showing so a pointer crossing the
   * control does not flash a tooltip, and a longer one before hiding so moving
   * between two adjacent controls does not strobe.
   */
  readonly enterDelay = input(100, {
    alias: 'tooltipEnterDelay',
    transform: numberAttribute,
  });

  readonly leaveDelay = input(300, {
    alias: 'tooltipLeaveDelay',
    transform: numberAttribute,
  });

  protected readonly panelId = `nine-am-tooltip-${nextId++}`;
  protected readonly open = signal(false);

  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private overlayRef: OverlayRef | null = null;
  private panel: ComponentRef<TooltipPanel> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.hide());
  }

  protected scheduleOpen(): void {
    this.after(this.enterDelay(), () => this.show());
  }

  protected scheduleClose(): void {
    this.after(this.leaveDelay(), () => this.hide());
  }

  /**
   * Carbon closes the tooltip when its trigger is activated. The click has done
   * something — a menu opened, a row expanded — and a label still hanging over
   * the result describes the moment before it.
   */
  protected onActivate(): void {
    this.hide();
  }

  protected show(): void {
    clearTimeout(this.timer);

    if (this.open() || !this.label()) {
      return;
    }

    const positions = popoverPositions(this.align());

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.host)
      .withPositions(positions)
      .withPush(false);

    this.overlayRef = this.overlay.create({
      positionStrategy,

      // A tooltip must not survive the thing it points at scrolling away.
      scrollStrategy: this.overlay.scrollStrategies.close(),
    });

    this.panel = this.overlayRef.attach(new ComponentPortal(TooltipPanel, null, this.injector));

    // `setInput` rather than writing to the instance: it marks the view dirty,
    // which a bare property assignment does not. Without it the panel attaches
    // and renders empty — the bug this replaced.
    this.panel.setInput('panelId', this.panelId);
    this.panel.setInput('label', this.label());
    this.panel.setInput('side', sideFromPosition(positions[0]));

    // Rendered by hand. A component the CDK creates through a portal is outside
    // any template, so nothing schedules its first pass — it attaches with an
    // empty view and a host class that never applies.
    this.panel.changeDetectorRef.detectChanges();

    // The caret has to point back at the trigger, so it follows whichever
    // position the CDK settled on after flipping away from a viewport edge —
    // not the one that was asked for.
    positionStrategy.positionChanges.subscribe((change) => {
      this.panel?.setInput('side', sideFromPosition(change.connectionPair));
      this.panel?.changeDetectorRef.detectChanges();
    });

    this.open.set(true);
  }

  protected hide(): void {
    clearTimeout(this.timer);

    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.panel = null;
    this.open.set(false);
  }

  private after(delay: number, run: () => void): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(run, delay);
  }
}
