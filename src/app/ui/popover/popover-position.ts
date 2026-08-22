import type { ConnectedPosition } from '@angular/cdk/overlay';

/** Which side of the trigger the popover sits on. */
export type PopoverSide = 'top' | 'bottom' | 'left' | 'right';

/** Where it sits along that side. `center` is Carbon's unsuffixed default. */
export type PopoverAlignment = 'start' | 'center' | 'end';

/** The two together, as Carbon writes them: `bottom`, `bottom-start`, … */
export type PopoverAlign = PopoverSide | `${PopoverSide}-${Exclude<PopoverAlignment, 'center'>}`;

/**
 * How far the popover sits from its trigger. Carbon's caret is 12x6, and the
 * panel has to clear it.
 */
export const POPOVER_OFFSET = 10;

interface Resolved {
  readonly side: PopoverSide;
  readonly alignment: PopoverAlignment;
}

/** Splits `bottom-start` into its two halves. */
export function parseAlign(align: PopoverAlign): Resolved {
  const [side, alignment] = align.split('-') as [
    PopoverSide,
    Exclude<PopoverAlignment, 'center'> | undefined,
  ];

  return { side, alignment: alignment ?? 'center' };
}

const OPPOSITE: Record<PopoverSide, PopoverSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/**
 * The CDK's two axes do not use the same words, and mixing them up is silent:
 * `originX` takes `start | center | end`, `originY` takes `top | center |
 * bottom`. Passing a side name like `left` to `originX` throws at runtime, not
 * at compile time — and only when the overlay is actually opened.
 *
 * No casts anywhere below, on purpose. The first version of this file cast its
 * way past the mismatch and shipped a tooltip that threw the moment it was
 * hovered.
 */
function alignmentToX(alignment: PopoverAlignment): 'start' | 'center' | 'end' {
  if (alignment === 'start') return 'start';
  if (alignment === 'end') return 'end';

  return 'center';
}

function alignmentToY(alignment: PopoverAlignment): 'top' | 'center' | 'bottom' {
  if (alignment === 'start') return 'top';
  if (alignment === 'end') return 'bottom';

  return 'center';
}

function positionFor({ side, alignment }: Resolved): ConnectedPosition {
  // Above or below: the popover slides along x, and its bottom edge meets the
  // trigger's top edge (or the reverse).
  if (side === 'top' || side === 'bottom') {
    return {
      originX: alignmentToX(alignment),
      originY: side,
      overlayX: alignmentToX(alignment),
      overlayY: OPPOSITE[side] === 'bottom' ? 'bottom' : 'top',
      offsetY: side === 'top' ? -POPOVER_OFFSET : POPOVER_OFFSET,
      panelClass: `ds-popover--${side}`,
    };
  }

  // Beside: it slides along y, and the x edges are the ones that meet.
  return {
    originX: side === 'left' ? 'start' : 'end',
    originY: alignmentToY(alignment),
    overlayX: side === 'left' ? 'end' : 'start',
    overlayY: alignmentToY(alignment),
    offsetX: side === 'left' ? -POPOVER_OFFSET : POPOVER_OFFSET,
    panelClass: `ds-popover--${side}`,
  };
}

/**
 * The preferred position followed by its fallbacks, in the order the CDK should
 * try them.
 *
 * The first fallback is the opposite side, which is the flip everyone expects
 * near a viewport edge. The rest are the remaining two sides, so a popover
 * squeezed both vertically and horizontally still lands somewhere visible
 * rather than being pushed half off-screen.
 *
 * Carbon has no equivalent: its popover is positioned in pure CSS and simply
 * overflows at the edge, which is why Carbon added an `autoAlign` prop backed by
 * `@floating-ui`. We already refused that dependency for the date picker — the
 * CDK does the same job and is already here.
 */
export function popoverPositions(align: PopoverAlign): ConnectedPosition[] {
  const preferred = parseAlign(align);

  const order: PopoverSide[] = [
    preferred.side,
    OPPOSITE[preferred.side],
    ...(['top', 'bottom', 'left', 'right'] as PopoverSide[]).filter(
      (side) => side !== preferred.side && side !== OPPOSITE[preferred.side],
    ),
  ];

  return order.map((side) => positionFor({ side, alignment: preferred.alignment }));
}

/**
 * Which side the popover actually landed on, read back off the position the CDK
 * chose.
 *
 * This is the whole reason the caret needs code rather than a class the caller
 * writes: the caret has to point at the trigger, and after a flip the trigger is
 * on the other side. A statically-classed caret points at nothing.
 */
export function sideFromPosition(position: ConnectedPosition): PopoverSide {
  const panelClass = position.panelClass;
  const name = Array.isArray(panelClass) ? panelClass[0] : panelClass;

  return ((name ?? '').replace('ds-popover--', '') || 'bottom') as PopoverSide;
}
