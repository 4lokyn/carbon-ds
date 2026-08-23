import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NINE_AM_RADIO_GROUP } from './radio';

@Component({
  imports: [...NINE_AM_RADIO_GROUP],
  template: `
    <nine-am-radio-group
      legend="Deployment strategy"
      [helperText]="helperText()"
      [disabled]="disabled()"
      [readOnly]="readOnly()"
      [invalid]="invalid()"
      [invalidText]="invalidText()"
      [warn]="warn()"
      [warnText]="warnText()"
      [(value)]="value"
      (selected)="selectedCount.set(selectedCount() + 1)"
    >
      <nine-am-radio label="Rolling" value="rolling" />
      <nine-am-radio label="Blue-green" value="blue-green" />
      <nine-am-radio label="Canary" value="canary" [disabled]="canaryDisabled()" />
    </nine-am-radio-group>
  `,
})
class Host {
  readonly value = signal('rolling');
  readonly helperText = signal('Pick one.');
  readonly disabled = signal(false);
  readonly readOnly = signal(false);
  readonly canaryDisabled = signal(false);
  readonly invalid = signal(false);
  readonly invalidText = signal('Not available on your plan.');
  readonly warn = signal(false);
  readonly warnText = signal('Slower rollout.');
  readonly selectedCount = signal(0);
}

describe('RadioGroup', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      el,
      radios: () =>
        Array.from(el.querySelectorAll<HTMLInputElement>('input[type="radio"]')),
      legend: () => el.querySelector('legend'),
      fieldset: () => el.querySelector('fieldset') as HTMLFieldSetElement,
      helper: () => el.querySelector('.nine-am-radio-group__helper'),
      requirement: () => el.querySelector('.nine-am-radio-group__requirement'),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('gives every radio the same name, which is what makes it a group', () => {
    const { radios } = setup();

    // The shared name is not cosmetic — single selection, arrow-key navigation
    // and the one-tab-stop behaviour are all the browser reacting to it.
    const names = new Set(radios().map((r) => r.name));

    expect(names.size).toBe(1);
    expect([...names][0]).toMatch(/^nine-am-radio-group-\d+$/);
  });

  it('names the group with a real legend inside a real fieldset', () => {
    const { legend, fieldset } = setup();

    expect(legend()?.textContent?.trim()).toBe('Deployment strategy');
    expect(legend()?.parentElement).toBe(fieldset());
    // First child, or it does not name the group.
    expect(fieldset().firstElementChild).toBe(legend());
  });

  it('checks whichever radio matches the value', () => {
    const { radios, apply, host } = setup();

    expect(radios().map((r) => r.checked)).toEqual([true, false, false]);

    apply(() => host.value.set('canary'));
    expect(radios().map((r) => r.checked)).toEqual([false, false, true]);
  });

  it('reports a selection once, through both the model and the output', () => {
    const { radios, host, fixture } = setup();

    radios()[1].click();
    fixture.detectChanges();

    expect(host.value()).toBe('blue-green');
    expect(host.selectedCount()).toBe(1);
  });

  it('lets the fieldset disable every radio at once', () => {
    const { radios, fieldset, apply, host } = setup();

    apply(() => host.disabled.set(true));

    // We set `disabled` on the fieldset only and let the browser cascade it. If
    // this fails, someone replaced the fieldset with a div.
    //
    // The cascade shows up in `:disabled`, NOT in the `.disabled` property —
    // that one only ever reflects the input's own attribute, so it stays false
    // here. Verified in Chrome: `.disabled` false, `matches(':disabled')` true.
    expect(fieldset().disabled).toBe(true);
    expect(radios().every((r) => r.matches(':disabled'))).toBe(true);
    expect(radios().every((r) => r.disabled)).toBe(false);
  });

  it('disables one option without touching the others', () => {
    const { radios, apply, host } = setup();

    apply(() => host.canaryDisabled.set(true));

    expect(radios().map((r) => r.disabled)).toEqual([false, false, true]);
  });

  it('refuses a change while read-only', () => {
    const { radios, host, fixture } = setup();

    host.readOnly.set(true);
    fixture.detectChanges();

    radios()[2].click();
    fixture.detectChanges();

    // Cancelled on the click, before the browser can check one and uncheck
    // another — by `change` time that is no longer undoable from one input.
    expect(host.value()).toBe('rolling');
    expect(host.selectedCount()).toBe(0);

    // The DOM half of this is deliberately not asserted here. Restoring the
    // whole group is the engine's legacy-canceled-activation behaviour, and
    // jsdom only does half of it — it un-checks the clicked radio but never
    // re-checks the previous one, so this reads [false, false, false] under the
    // test runner and [true, false, false] in a browser. Measured in Chrome
    // rather than assumed; asserting jsdom's version here would pin the bug
    // instead of the behaviour.
  });

  it('stays focusable while read-only, unlike a disabled group', () => {
    const { radios, fieldset, apply, host } = setup();

    apply(() => host.readOnly.set(true));

    // Disabling would drop the group out of the tab order entirely, so a
    // keyboard user could not even read the choice.
    expect(fieldset().disabled).toBe(false);
    expect(radios().every((r) => !r.disabled)).toBe(true);
  });

  it('replaces the helper text with the error, like every other control', () => {
    const { helper, requirement, apply, host } = setup();

    expect(helper()?.textContent?.trim()).toBe('Pick one.');

    apply(() => host.invalid.set(true));

    expect(helper()).toBeNull();
    expect(requirement()?.textContent?.trim()).toContain(
      'Not available on your plan.',
    );
  });

  it('points every radio at the one shared description', () => {
    const { radios, helper, requirement, apply, host } = setup();

    const helperId = helper()!.id;
    expect(radios().every((r) => r.getAttribute('aria-describedby') === helperId))
      .toBe(true);

    apply(() => host.invalid.set(true));

    const messageId = requirement()!.id;
    expect(
      radios().every((r) => r.getAttribute('aria-describedby') === messageId),
    ).toBe(true);
  });

  it('lets invalid outrank warn', () => {
    const { el, apply, host } = setup();

    apply(() => {
      host.invalid.set(true);
      host.warn.set(true);
    });

    const group = el.querySelector('nine-am-radio-group') as HTMLElement;

    expect(group.classList).toContain('nine-am-radio-group--invalid');
    expect(group.classList).not.toContain('nine-am-radio-group--warn');
  });
});
