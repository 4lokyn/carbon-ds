import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Tooltip } from './tooltip';
import { popoverPositions, sideFromPosition } from './popover-position';

@Component({
  imports: [Tooltip],
  template: `
    <button [nineAmTooltip]="label()" [tooltipEnterDelay]="0" [tooltipLeaveDelay]="0">
      Settings
    </button>
  `,
})
class Host {
  readonly label = signal('Open settings');
}

describe('popover positions', () => {
  it('uses the axis words the CDK expects, not side names', () => {
    // `originX` takes start | center | end and `originY` takes top | center |
    // bottom. Handing a side name to the wrong axis throws at runtime and only
    // when the overlay opens — which is exactly what shipped once.
    const xs = new Set(['start', 'center', 'end']);
    const ys = new Set(['top', 'center', 'bottom']);

    for (const align of ['top', 'bottom', 'left', 'right'] as const) {
      for (const position of popoverPositions(align)) {
        expect(xs.has(position.originX)).toBe(true);
        expect(xs.has(position.overlayX)).toBe(true);
        expect(ys.has(position.originY)).toBe(true);
        expect(ys.has(position.overlayY)).toBe(true);
      }
    }
  });

  it('falls back to the opposite side first', () => {
    const [preferred, firstFallback] = popoverPositions('bottom');

    expect(sideFromPosition(preferred)).toBe('bottom');
    expect(sideFromPosition(firstFallback)).toBe('top');
  });
});

describe('Tooltip', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;

    return {
      fixture,
      host: fixture.componentInstance,
      trigger,
      panel: () => document.querySelector('nine-am-tooltip-panel'),
      text: () =>
        document.querySelector('nine-am-tooltip-panel [role="tooltip"]')?.textContent?.trim(),
    };
  }

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => (el.innerHTML = ''));
  });

  it('opens on focus and describes rather than names', () => {
    const { trigger, fixture, panel, text } = setup();

    trigger.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    expect(panel()).not.toBeNull();
    expect(text()).toBe('Open settings');

    // aria-describedby, never aria-labelledby: an icon-only trigger still needs
    // its own name, because a name that only exists on hover is not a name.
    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(trigger.getAttribute('aria-labelledby')).toBeNull();
    expect(document.getElementById(describedBy as string)).not.toBeNull();
  });

  it('closes when the trigger is activated', () => {
    const { trigger, fixture, panel } = setup();

    trigger.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(panel()).not.toBeNull();

    trigger.click();
    fixture.detectChanges();

    // The click has done something; a label describing the moment before it is
    // worse than no label.
    expect(panel()).toBeNull();
  });

  it('stays shut with nothing to say', () => {
    const { trigger, fixture, host, panel } = setup();

    host.label.set('');
    fixture.detectChanges();

    trigger.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });
});
