import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DatePicker } from './date-picker';
import { DateRangePicker } from './date-range-picker';

@Component({
  imports: [DatePicker],
  template: `
    <ds-date-picker
      label="Start date"
      [helperText]="helperText()"
      [invalid]="invalid()"
      [invalidText]="invalidText()"
      [warn]="warn()"
      [warnText]="warnText()"
      [disabled]="disabled()"
      [readOnly]="readOnly()"
      [(value)]="value"
    />
  `,
})
class Host {
  readonly value = signal<Date | null>(null);
  readonly helperText = signal('Pick a day.');
  readonly invalid = signal(false);
  readonly invalidText = signal('That date is in the past.');
  readonly warn = signal(false);
  readonly warnText = signal('Public holiday.');
  readonly disabled = signal(false);
  readonly readOnly = signal(false);
}

@Component({
  imports: [DateRangePicker],
  template: `
    <ds-date-range-picker
      label="Reporting period"
      [(start)]="start"
      [(end)]="end"
    />
  `,
})
class RangeHost {
  readonly start = signal<Date | null>(null);
  readonly end = signal<Date | null>(null);
}

describe('DatePicker', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      el,
      field: () => el.querySelector('input') as HTMLInputElement,
      trigger: () =>
        el.querySelector('.ds-date-picker__trigger') as HTMLButtonElement,
      helper: () => el.querySelector('.ds-date-picker__helper'),
      requirement: () => el.querySelector('.ds-date-picker__requirement'),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
      type(text: string) {
        const field = el.querySelector('input') as HTMLInputElement;
        field.value = text;
        field.dispatchEvent(new Event('input'));
        fixture.detectChanges();
      },
      blur() {
        (el.querySelector('input') as HTMLInputElement).dispatchEvent(
          new Event('blur'),
        );
        fixture.detectChanges();
      },
    };
  }

  it('shows the value in ISO, which is what it can read back', () => {
    const { field, apply, host } = setup();

    apply(() => host.value.set(new Date(2026, 7, 14)));

    // The default formatter and parser are a pair. ISO is the only format that
    // round-trips in every locale — 03/04 is two different days depending on
    // who is reading it.
    expect(field().value).toBe('2026-08-14');
  });

  it('reads a typed date back on blur', () => {
    const { host, type, blur } = setup();

    type('2026-09-01');
    // Nothing until blur — same timing rule as every other field here.
    expect(host.value()).toBeNull();

    blur();
    expect(host.value()?.toDateString()).toBe(new Date(2026, 8, 1).toDateString());
  });

  it('refuses a date that does not exist', () => {
    const { host, type, blur } = setup();

    type('2026-02-31');
    blur();

    // `new Date(2026, 1, 31)` silently rolls over to 3 March. The parser checks
    // the result still matches what was asked for, so it does not.
    expect(host.value()).toBeNull();
  });

  it('leaves unparseable text exactly as typed', () => {
    const { field, host, type, blur } = setup();

    type('next tuesday');
    blur();

    // Deciding that is an error is the form's job, via `invalid` — the control
    // does not silently discard what someone wrote.
    expect(host.value()).toBeNull();
    expect(field().value).toBe('next tuesday');
  });

  it('re-formats text that parses to the value it already had', () => {
    const { field, host, apply, type, blur } = setup();

    apply(() => host.value.set(new Date(2026, 7, 14)));

    type('2026-08-14');
    blur();

    // The model does not change, so nothing recomputes on its own; without an
    // explicit re-assert the field would keep whatever was typed.
    expect(field().value).toBe('2026-08-14');
  });

  it('clears the value when the field is emptied', () => {
    const { host, apply, type, blur } = setup();

    apply(() => host.value.set(new Date(2026, 7, 14)));

    type('');
    blur();

    expect(host.value()).toBeNull();
  });

  it('opens the calendar from the trigger and closes on a pick', () => {
    const { trigger, fixture, host } = setup();

    trigger().click();
    fixture.detectChanges();

    const day = document.querySelector(
      '.ds-date-picker__day:not([data-outside-month])',
    ) as HTMLButtonElement;

    expect(day).not.toBeNull();

    day.click();
    fixture.detectChanges();

    expect(host.value()).not.toBeNull();
    expect(document.querySelector('.ds-date-picker__day')).toBeNull();
  });

  it('starts the week on Monday, not Sunday', () => {
    const { trigger, fixture } = setup();

    trigger().click();
    fixture.detectChanges();

    const headers = Array.from(
      document.querySelectorAll('.ds-date-picker__weekday'),
    ).map((th) => th.getAttribute('abbr'));

    // Carbon inherits Sunday from flatpickr's US locale. ISO 8601 — and most of
    // the world — starts on Monday, and this is one input away either way.
    expect(headers).toHaveLength(7);
    expect(headers[0]).toBe('Monday');
  });

  it('shuts the calendar button while read-only', () => {
    const { trigger, apply, host } = setup();

    apply(() => host.readOnly.set(true));

    expect(trigger().disabled).toBe(true);
  });

  it('replaces the helper text with the error, like every other field', () => {
    const { helper, requirement, apply, host } = setup();

    expect(helper()?.textContent?.trim()).toBe('Pick a day.');

    apply(() => host.invalid.set(true));

    expect(helper()).toBeNull();
    expect(requirement()?.textContent?.trim()).toBe('That date is in the past.');
  });

  it('marks aria-invalid only for invalid, never for warn', () => {
    const { field, apply, host } = setup();

    apply(() => host.warn.set(true));
    expect(field().getAttribute('aria-invalid')).toBeNull();

    apply(() => host.invalid.set(true));
    expect(field().getAttribute('aria-invalid')).toBe('true');
  });
});

describe('DateRangePicker', () => {
  function setup() {
    const fixture = TestBed.createComponent(RangeHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      field: () => el.querySelector('input') as HTMLInputElement,
      trigger: () =>
        el.querySelector('.ds-date-picker__trigger') as HTMLButtonElement,
      blur() {
        (el.querySelector('input') as HTMLInputElement).dispatchEvent(
          new Event('blur'),
        );
        fixture.detectChanges();
      },
      type(text: string) {
        const input = el.querySelector('input') as HTMLInputElement;
        input.value = text;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
      },
    };
  }

  it('holds both ends in one field', () => {
    const { field, host, fixture } = setup();

    host.start.set(new Date(2026, 7, 13));
    host.end.set(new Date(2026, 7, 15));
    fixture.detectChanges();

    expect(field().value).toBe('2026-08-13 – 2026-08-15');
  });

  it('shows a lone start on its own, without a dangling separator', () => {
    const { field, host, fixture } = setup();

    host.start.set(new Date(2026, 7, 13));
    fixture.detectChanges();

    // Mid-range a trailing "2026-08-13 – " reads as a rendering bug, and the
    // calendar is open at that moment anyway.
    expect(field().value).toBe('2026-08-13');
  });

  it('reads its own separator back', () => {
    const { host, type, blur } = setup();

    type('2026-08-13 – 2026-08-15');
    blur();

    expect(host.start()?.toDateString()).toBe(new Date(2026, 7, 13).toDateString());
    expect(host.end()?.toDateString()).toBe(new Date(2026, 7, 15).toDateString());
  });

  it('accepts a spaced hyphen and the word "to" as well', () => {
    const { host, type, blur } = setup();

    type('2026-08-13 - 2026-08-15');
    blur();
    expect(host.end()?.toDateString()).toBe(new Date(2026, 7, 15).toDateString());

    type('2026-09-01 to 2026-09-04');
    blur();
    expect(host.start()?.toDateString()).toBe(new Date(2026, 8, 1).toDateString());
    expect(host.end()?.toDateString()).toBe(new Date(2026, 8, 4).toDateString());
  });

  it('will not split on the hyphens inside an ISO date', () => {
    const { host, type, blur } = setup();

    // No whitespace, so there is no unambiguous split point — and guessing one
    // would silently invent a range nobody typed.
    type('2026-08-13-2026-08-15');
    blur();

    expect(host.start()).toBeNull();
    expect(host.end()).toBeNull();
  });

  it('commits a half-read range as nothing at all', () => {
    const { field, host, type, blur } = setup();

    type('2026-08-13 – nonsense');
    blur();

    // All or nothing: committing just the start would leave the field showing
    // two dates while the model held one.
    expect(host.start()).toBeNull();
    expect(host.end()).toBeNull();
    expect(field().value).toBe('2026-08-13 – nonsense');
  });

  it('stays open after the first pick and closes after the second', () => {
    const { trigger, fixture, host, field } = setup();

    trigger().click();
    fixture.detectChanges();

    const days = () =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '.ds-date-picker__day:not([data-outside-month]):not([data-disabled])',
        ),
      );

    days()[9].click();
    fixture.detectChanges();

    // Closing on the first would make the second pick impossible — the
    // primitive reports the two ends as separate events.
    expect(host.start()).not.toBeNull();
    expect(days().length).toBeGreaterThan(0);

    days()[17].click();
    fixture.detectChanges();

    expect(host.end()).not.toBeNull();
    expect(document.querySelector('.ds-date-picker__day')).toBeNull();
    expect(field().value).toContain('–');
  });
});
