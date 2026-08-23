import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Textarea } from './textarea';

@Component({
  imports: [Textarea],
  template: `
    <nine-am-textarea
      label="Description"
      [helperText]="helperText()"
      [maxLength]="maxLength()"
      [showCounter]="showCounter()"
      [invalid]="invalid()"
      [invalidText]="invalidText()"
      [warn]="warn()"
      [warnText]="warnText()"
      [disabled]="disabled()"
      [readOnly]="readOnly()"
      [(value)]="value"
      (blurred)="blurCount.set(blurCount() + 1)"
    />
  `,
})
class Host {
  readonly value = signal('');
  readonly helperText = signal('Shown on the detail page.');
  readonly maxLength = signal<number | undefined>(undefined);
  readonly showCounter = signal(false);
  readonly invalid = signal(false);
  readonly invalidText = signal('Needs more context.');
  readonly warn = signal(false);
  readonly warnText = signal('Linking out is fragile.');
  readonly disabled = signal(false);
  readonly readOnly = signal(false);
  readonly blurCount = signal(0);
}

describe('Textarea', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      el,
      field: () => el.querySelector('textarea') as HTMLTextAreaElement,
      counter: () => el.querySelector('.nine-am-textarea__counter'),
      helper: () => el.querySelector('.nine-am-textarea__helper'),
      requirement: () => el.querySelector('.nine-am-textarea__requirement'),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
      type(text: string) {
        const field = el.querySelector('textarea') as HTMLTextAreaElement;
        field.value = text;
        field.dispatchEvent(new Event('input'));
        fixture.detectChanges();
      },
    };
  }

  it('defaults to four rows, which is Carbon default', () => {
    const { field } = setup();

    expect(field().rows).toBe(4);
  });

  it('counts against maxLength and sets the native limit', () => {
    const { field, counter, apply, host, type } = setup();

    expect(counter()).toBeNull();

    apply(() => {
      host.maxLength.set(120);
      host.showCounter.set(true);
    });

    expect(counter()?.textContent?.trim()).toBe('0/120');
    expect(field().maxLength).toBe(120);

    type('hello');
    expect(counter()?.textContent?.trim()).toBe('5/120');
  });

  it('hides the counter from screen readers', () => {
    const { counter, apply, host } = setup();

    apply(() => {
      host.maxLength.set(50);
      host.showCounter.set(true);
    });

    // maxlength already stops input, and a count re-announced on every keystroke
    // makes the field unusable with a screen reader on.
    expect(counter()?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders no counter when there is nothing to count against', () => {
    const { counter, apply, host } = setup();

    // showCounter with no maxLength has no denominator; a bare number would
    // imply a limit that does not exist.
    apply(() => host.showCounter.set(true));

    expect(counter()).toBeNull();
  });

  it('replaces the helper text with the error, like every other field', () => {
    const { helper, requirement, apply, host } = setup();

    expect(helper()?.textContent?.trim()).toBe('Shown on the detail page.');

    apply(() => host.invalid.set(true));

    expect(helper()).toBeNull();
    expect(requirement()?.textContent?.trim()).toBe('Needs more context.');
  });

  it('lets invalid outrank warn', () => {
    const { el, requirement, apply, host } = setup();

    apply(() => {
      host.invalid.set(true);
      host.warn.set(true);
    });

    const wrapper = el.querySelector('nine-am-textarea') as HTMLElement;

    expect(wrapper.classList).toContain('nine-am-textarea--invalid');
    expect(wrapper.classList).not.toContain('nine-am-textarea--warn');
    expect(requirement()?.textContent?.trim()).toBe('Needs more context.');
  });

  it('marks aria-invalid only for invalid, never for warn', () => {
    const { field, apply, host } = setup();

    apply(() => host.warn.set(true));
    expect(field().getAttribute('aria-invalid')).toBeNull();

    apply(() => host.invalid.set(true));
    expect(field().getAttribute('aria-invalid')).toBe('true');
  });

  it('describes the field with whichever line is on screen', () => {
    const { field, helper, requirement, apply, host } = setup();

    expect(field().getAttribute('aria-describedby')).toBe(helper()!.id);

    apply(() => host.invalid.set(true));
    expect(field().getAttribute('aria-describedby')).toBe(requirement()!.id);

    apply(() => {
      host.invalid.set(false);
      host.helperText.set('');
    });
    expect(field().getAttribute('aria-describedby')).toBeNull();
  });

  it('honours disabled and read-only on the native element', () => {
    const { field, apply, host } = setup();

    apply(() => host.disabled.set(true));
    expect(field().disabled).toBe(true);

    apply(() => {
      host.disabled.set(false);
      host.readOnly.set(true);
    });

    // Unlike select, a textarea has a real readonly — so it stays focusable and
    // still submits with the form.
    expect(field().disabled).toBe(false);
    expect(field().readOnly).toBe(true);
  });

  it('reports blur, which is what the validation policy hangs off', () => {
    const { field, host, fixture } = setup();

    field().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.blurCount()).toBe(1);
  });

  it('reports every keystroke through the value model', () => {
    const { host, type } = setup();

    type('a description');
    expect(host.value()).toBe('a description');
  });
});
