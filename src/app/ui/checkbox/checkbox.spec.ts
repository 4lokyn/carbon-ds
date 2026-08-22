import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Checkbox, CheckboxGroup } from './checkbox';

@Component({
  imports: [Checkbox, CheckboxGroup],
  template: `
    <ds-checkbox-group
      legend="Notify me about"
      [invalid]="invalid()"
      invalidText="Pick at least one."
      helperText="You can change this later."
      [readOnly]="readOnly()"
    >
      <ds-checkbox label="Deploys" [(checked)]="deploys" />
      <ds-checkbox label="Incidents" />
    </ds-checkbox-group>
  `,
})
class GroupHost {
  readonly invalid = signal(false);
  readonly readOnly = signal(false);
  readonly deploys = signal(false);
}

@Component({
  imports: [Checkbox],
  template: `
    <ds-checkbox
      label="I accept the terms"
      [invalid]="invalid()"
      invalidText="You must accept to continue."
    />
  `,
})
class LoneHost {
  readonly invalid = signal(false);
}

describe('CheckboxGroup', () => {
  function setup() {
    const fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      el,
      inputs: () => Array.from(el.querySelectorAll<HTMLInputElement>('.ds-checkbox__input')),
      groupMessage: () => el.querySelector('.ds-checkbox-group__requirement'),
      boxMessages: () => Array.from(el.querySelectorAll('.ds-checkbox__requirement')),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('names the set with a legend inside a real fieldset', () => {
    const { el } = setup();

    const fieldset = el.querySelector('fieldset');
    expect(fieldset).not.toBeNull();

    // First child, or it does not name the group.
    expect(fieldset?.firstElementChild?.tagName).toBe('LEGEND');
    expect(fieldset?.querySelector('legend')?.textContent?.trim()).toBe('Notify me about');
  });

  it('prints one message for the whole set, not one per box', () => {
    const { groupMessage, boxMessages, apply, host } = setup();

    apply(() => host.invalid.set(true));

    expect(groupMessage()?.textContent).toContain('Pick at least one.');

    // The reason the checkbox defers: twelve options in an invalid group would
    // otherwise print the same sentence twelve times.
    expect(boxMessages()).toHaveLength(0);
  });

  it('points every box at the one shared description', () => {
    const { inputs, apply, host } = setup();

    apply(() => host.invalid.set(true));

    const described = inputs().map((input) => input.getAttribute('aria-describedby'));

    expect(described[0]).not.toBeNull();
    expect(described[0]).toBe(described[1]);
  });

  it('refuses the toggle when read-only, and puts the box back', () => {
    const { inputs, apply, host } = setup();

    apply(() => host.readOnly.set(true));

    const box = inputs()[0];
    box.click();

    // A native checkbox flips itself before `change` fires, so refusing the
    // write is not enough — the DOM property has to be restored or the box
    // shows a tick the model does not have.
    expect(host.deploys()).toBe(false);
    expect(box.checked).toBe(false);
  });

  it('keeps the set focusable while read-only', () => {
    const { inputs, apply, host } = setup();

    apply(() => host.readOnly.set(true));

    // `disabled` would drop the whole set out of the tab order, so a keyboard
    // user could not even read the choices.
    expect(inputs().every((input) => !input.disabled)).toBe(true);
  });
});

describe('Checkbox on its own', () => {
  it('carries its own message when there is no group', () => {
    const fixture = TestBed.createComponent(LoneHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.invalid.set(true);
    fixture.detectChanges();

    expect(el.querySelector('.ds-checkbox__requirement')?.textContent).toContain(
      'You must accept to continue.',
    );
    expect(el.querySelector('.ds-checkbox__input')?.getAttribute('aria-invalid')).toBe('true');
  });
});
