import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Select } from './select';

@Component({
  imports: [Select],
  template: `
    <ds-select
      label="Region"
      [helperText]="helperText()"
      [invalid]="invalid()"
      [invalidText]="invalidText()"
      [warn]="warn()"
      [warnText]="warnText()"
      [disabled]="disabled()"
      [readOnly]="readOnly()"
      [(value)]="value"
      (blurred)="blurCount.set(blurCount() + 1)"
    >
      <option value="">Choose</option>
      @for (region of regions(); track region) {
        <option [value]="region">{{ region }}</option>
      }
    </ds-select>
  `,
})
class Host {
  readonly value = signal('');
  readonly regions = signal<readonly string[]>(['eu-west', 'us-east']);
  readonly helperText = signal('Where the cluster runs.');
  readonly invalid = signal(false);
  readonly invalidText = signal('No longer offered.');
  readonly warn = signal(false);
  readonly warnText = signal('Slower than the default.');
  readonly disabled = signal(false);
  readonly readOnly = signal(false);
  readonly blurCount = signal(0);
}

/** No empty option, and no initial value — the shape that used to render blank. */
@Component({
  imports: [Select],
  template: `
    <ds-select label="Tier" [(value)]="value">
      <option value="dev">Development</option>
      <option value="prod">Production</option>
    </ds-select>
  `,
})
class NoEmptyOption {
  readonly value = signal('');
}

describe('Select', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      el,
      select: () => el.querySelector('select') as HTMLSelectElement,
      helper: () => el.querySelector('.ds-select__helper'),
      requirement: () => el.querySelector('.ds-select__requirement'),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('projects options, optgroups and all, into the native select', () => {
    const { select } = setup();

    // Projection rather than an options config is what keeps <optgroup> and a
    // disabled option working without the component re-exposing either.
    expect(select().options).toHaveLength(3);
    expect(select().options[1].value).toBe('eu-west');
  });

  it('reports the chosen value', () => {
    const { select, host, fixture } = setup();

    select().value = 'us-east';
    select().dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(host.value()).toBe('us-east');
  });

  it('re-asserts the value once late-arriving options exist', () => {
    const { select, host, apply } = setup();

    // The realistic order, and the one the component documents: options land
    // from a fetch, then the caller selects one.
    apply(() => host.regions.set([]));
    apply(() => host.regions.set(['eu-west', 'ap-south']));
    apply(() => host.value.set('ap-south'));

    // Without the effect the value would still be sitting on the empty option
    // the select fell back to while the list was loading.
    expect(select().value).toBe('ap-south');
  });

  it('leaves the field showing its first option when nothing matches the model', async () => {
    // The regression this exists for: writing `.value` a string no option
    // carries sets selectedIndex to -1 and the select renders blank. Every
    // field without an empty option — which is most of them — went invisible.
    const fixture = TestBed.createComponent(NoEmptyOption);
    fixture.detectChanges();
    await fixture.whenStable();

    const select = fixture.nativeElement.querySelector(
      'select',
    ) as HTMLSelectElement;

    expect(select.selectedIndex).toBe(0);
    expect(select.value).toBe('dev');
  });

  it('adopts the option the browser settled on, so the model is not lying', async () => {
    const fixture = TestBed.createComponent(NoEmptyOption);
    fixture.detectChanges();
    await fixture.whenStable();

    // Otherwise a form submitted without touching this field sends '' while the
    // user was looking at "Development".
    expect(fixture.componentInstance.value()).toBe('dev');
  });

  it('replaces the helper text with the error, like every other field', () => {
    const { helper, requirement, apply, host } = setup();

    expect(helper()?.textContent?.trim()).toBe('Where the cluster runs.');

    apply(() => host.invalid.set(true));

    expect(helper()).toBeNull();
    expect(requirement()?.textContent?.trim()).toBe('No longer offered.');
  });

  it('lets invalid outrank warn', () => {
    const { el, requirement, apply, host } = setup();

    apply(() => {
      host.invalid.set(true);
      host.warn.set(true);
    });

    const wrapper = el.querySelector('ds-select') as HTMLElement;

    expect(wrapper.classList).toContain('ds-select--invalid');
    expect(wrapper.classList).not.toContain('ds-select--warn');
    expect(requirement()?.textContent?.trim()).toBe('No longer offered.');
  });

  it('disables the element for read-only, because select has no readonly', () => {
    const { select, el, apply, host } = setup();

    apply(() => host.readOnly.set(true));

    const wrapper = el.querySelector('ds-select') as HTMLElement;

    // `readonly` on a <select> does nothing at all, so the only way to make one
    // uneditable is `disabled`. The class is what puts the enabled look back.
    expect(select().disabled).toBe(true);
    expect(wrapper.classList).toContain('ds-select--readonly');
    expect(wrapper.classList).not.toContain('ds-select--disabled');
  });

  it('marks aria-invalid only for invalid, never for warn', () => {
    const { select, apply, host } = setup();

    apply(() => host.warn.set(true));
    expect(select().getAttribute('aria-invalid')).toBeNull();

    apply(() => host.invalid.set(true));
    expect(select().getAttribute('aria-invalid')).toBe('true');
  });

  it('describes the field with whichever line is on screen', () => {
    const { select, helper, requirement, apply, host } = setup();

    expect(select().getAttribute('aria-describedby')).toBe(helper()!.id);

    apply(() => host.invalid.set(true));
    expect(select().getAttribute('aria-describedby')).toBe(requirement()!.id);

    apply(() => {
      host.invalid.set(false);
      host.helperText.set('');
    });
    expect(select().getAttribute('aria-describedby')).toBeNull();
  });

  it('reports blur, which is what the validation policy hangs off', () => {
    const { select, host, fixture } = setup();

    select().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.blurCount()).toBe(1);
  });
});
