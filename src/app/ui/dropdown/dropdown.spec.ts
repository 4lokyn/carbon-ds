import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dropdown, type DropdownOption } from './dropdown';

@Component({
  imports: [Dropdown],
  template: `
    <nine-am-dropdown
      label="Region"
      placeholder="Choose a region"
      [options]="options"
      [(selected)]="region"
      [invalid]="invalid()"
      invalidText="Pick a region."
      helperText="Where the cluster runs."
      (opened)="opens.set(opens() + 1)"
    />
  `,
})
class Host {
  readonly region = signal<string | null>(null);
  readonly invalid = signal(false);
  readonly opens = signal(0);

  readonly options: readonly DropdownOption<string>[] = [
    { value: 'eu', label: 'eu-central' },
    { value: 'us', label: 'us-east' },
    { value: 'ap', label: 'ap-south', disabled: true },
  ];
}

describe('Dropdown', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const doc = () => document.body;

    return {
      fixture,
      host: fixture.componentInstance,
      field: () =>
        (fixture.nativeElement as HTMLElement).querySelector(
          '.nine-am-dropdown__field',
        ) as HTMLButtonElement,
      value: () =>
        (fixture.nativeElement as HTMLElement)
          .querySelector('.nine-am-dropdown__value')
          ?.textContent?.trim(),
      // The list is portaled to the overlay container at body level.
      items: () => Array.from(doc().querySelectorAll<HTMLElement>('.nine-am-dropdown__item')),
      open() {
        this.field().click();
        fixture.detectChanges();
      },
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((node) => node.remove());
  });

  it('shows the placeholder until something is chosen', () => {
    const { value, field } = setup();

    expect(value()).toBe('Choose a region');
    expect(field().getAttribute('aria-expanded')).toBe('false');
    expect(field().getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('opens on the field and reports it', () => {
    const s = setup();

    s.open();

    expect(s.field().getAttribute('aria-expanded')).toBe('true');
    expect(s.items()).toHaveLength(3);
    expect(s.host.opens()).toBe(1);
  });

  it('chooses one value and closes, unlike the multi-select', () => {
    const s = setup();

    s.open();
    s.items()[1].click();
    s.fixture.detectChanges();

    // One value means the question is answered, and a list that stays open over
    // an answered question invites a second answer.
    expect(s.host.region()).toBe('us');
    expect(s.value()).toBe('us-east');
    expect(s.field().getAttribute('aria-expanded')).toBe('false');
  });

  it('refuses a disabled row', () => {
    const s = setup();

    s.open();
    s.items()[2].click();
    s.fixture.detectChanges();

    expect(s.host.region()).toBeNull();
    expect(s.field().getAttribute('aria-expanded')).toBe('true');
  });

  it('shows the label of whatever it is given, not the raw value', () => {
    const s = setup();

    s.apply(() => s.host.region.set('eu'));

    // The value is the caller's; the field is Carbon's. Setting one from outside
    // has to look the same as choosing it.
    expect(s.value()).toBe('eu-central');
  });

  it('points at its message rather than its helper text when invalid', () => {
    const s = setup();

    const describedBy = () => s.field().getAttribute('aria-describedby');
    const helper = describedBy();

    s.apply(() => s.host.invalid.set(true));

    expect(describedBy()).not.toBe(helper);
    expect(document.getElementById(describedBy() ?? '')?.textContent?.trim()).toBe(
      'Pick a region.',
    );
  });
});
