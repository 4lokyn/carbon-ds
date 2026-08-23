import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Toggle } from './toggle';
import type { ToggleSize } from './toggle';

@Component({
  imports: [Toggle],
  template: `
    <nine-am-toggle
      label="Auto-scaling"
      [size]="size()"
      [disabled]="disabled()"
      [readOnly]="readOnly()"
      [hideStateText]="hideStateText()"
      [onLabel]="onLabel()"
      [offLabel]="offLabel()"
      [(checked)]="checked"
      (toggled)="toggleCount.set(toggleCount() + 1)"
    />
  `,
})
class Host {
  readonly checked = signal(false);
  readonly size = signal<ToggleSize>('md');
  readonly disabled = signal(false);
  readonly readOnly = signal(false);
  readonly hideStateText = signal(false);
  readonly onLabel = signal('On');
  readonly offLabel = signal('Off');
  readonly toggleCount = signal(0);
}

describe('Toggle', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      el,
      button: () => el.querySelector('button') as HTMLButtonElement,
      stateText: () => el.querySelector('.nine-am-toggle__text'),
      check: () => el.querySelector('.nine-am-toggle__check'),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('is a switch, not a checkbox', () => {
    const { button } = setup();

    // A switch takes effect immediately; a checkbox is a value you submit later,
    // and screen readers announce the two differently.
    expect(button().getAttribute('role')).toBe('switch');
    expect(button().type).toBe('button');
  });

  it('reports its state through aria-checked', () => {
    const { button, host, apply } = setup();

    expect(button().getAttribute('aria-checked')).toBe('false');

    apply(() => host.checked.set(true));
    expect(button().getAttribute('aria-checked')).toBe('true');
  });

  it('takes its accessible name from the label alone, not the state text', () => {
    const { button, el } = setup();

    const labelText = el.querySelector('.nine-am-toggle__label-text') as HTMLElement;

    // Letting the whole <label> name the button would fold "Off" into the name,
    // and role=switch already announces that.
    expect(button().getAttribute('aria-labelledby')).toBe(labelText.id);
    expect(labelText.textContent?.trim()).toBe('Auto-scaling');
  });

  it('toggles on click and reports it once', () => {
    const { button, host, fixture } = setup();

    button().click();
    fixture.detectChanges();

    expect(host.checked()).toBe(true);
    expect(host.toggleCount()).toBe(1);
  });

  it('swaps the state text with the state', () => {
    const { stateText, button, fixture } = setup();

    expect(stateText()?.textContent?.trim()).toBe('Off');

    button().click();
    fixture.detectChanges();

    expect(stateText()?.textContent?.trim()).toBe('On');
  });

  it('takes custom state text', () => {
    const { stateText, apply, host } = setup();

    apply(() => {
      host.onLabel.set('Enabled');
      host.offLabel.set('Disabled');
    });

    expect(stateText()?.textContent?.trim()).toBe('Disabled');
  });

  it('drops the state text on request', () => {
    const { stateText, apply, host } = setup();

    apply(() => host.hideStateText.set(true));

    expect(stateText()).toBeNull();
  });

  it('draws the check on the small size only', () => {
    const { check, apply, host } = setup();

    // It is positioned for a 16px track, and at 24px the knob is big enough to
    // read on its own — which is why Carbon draws it in exactly one of the two.
    expect(check()).toBeNull();

    apply(() => host.size.set('sm'));
    expect(check()).not.toBeNull();
  });

  it('refuses to change while read-only, but stays focusable', () => {
    const { button, host, fixture } = setup();

    host.readOnly.set(true);
    fixture.detectChanges();

    button().click();
    fixture.detectChanges();

    expect(host.checked()).toBe(false);
    expect(host.toggleCount()).toBe(0);

    // Unlike disabled, it can still be reached and read.
    expect(button().disabled).toBe(false);
    expect(button().getAttribute('aria-readonly')).toBe('true');
  });

  it('cannot be clicked while disabled', () => {
    const { button, host, fixture } = setup();

    host.disabled.set(true);
    fixture.detectChanges();

    button().click();
    fixture.detectChanges();

    expect(button().disabled).toBe(true);
    expect(host.checked()).toBe(false);
    expect(host.toggleCount()).toBe(0);
  });
});
