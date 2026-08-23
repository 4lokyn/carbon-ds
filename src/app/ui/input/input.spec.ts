import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Input } from './input';
import type { InputType } from './input';

@Component({
  imports: [Input],
  template: `
    <nine-am-input
      label="Namespace"
      [type]="type()"
      [helperText]="helperText()"
      [invalid]="invalid()"
      [invalidText]="invalidText()"
      [warn]="warn()"
      [warnText]="warnText()"
      [fluid]="fluid()"
      [(value)]="value"
      (blurred)="blurCount.set(blurCount() + 1)"
    />
  `,
})
class Host {
  readonly value = signal('');
  readonly type = signal<InputType>('text');
  readonly helperText = signal('Lowercase letters only.');
  readonly invalid = signal(false);
  readonly invalidText = signal('That namespace already exists.');
  readonly warn = signal(false);
  readonly warnText = signal('Close to the quota.');
  readonly fluid = signal(false);
  readonly blurCount = signal(0);
}

describe('Input', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      el,
      input: () => el.querySelector('input') as HTMLInputElement,
      helper: () => el.querySelector('.nine-am-input__helper'),
      requirement: () => el.querySelector('.nine-am-input__requirement'),
      statusPaths: () =>
        Array.from(el.querySelectorAll('.nine-am-input__status path')),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('replaces the helper text with the error rather than stacking them', () => {
    const { helper, requirement, apply, host } = setup();

    expect(helper()?.textContent?.trim()).toBe('Lowercase letters only.');
    expect(requirement()).toBeNull();

    apply(() => host.invalid.set(true));

    // Stacking the two would push every field below this one down the instant
    // one goes invalid, which is why Carbon gives them a single slot.
    expect(helper()).toBeNull();
    expect(requirement()?.textContent?.trim()).toBe(
      'That namespace already exists.',
    );
  });

  it('describes the field with whichever line is actually on screen', () => {
    const { input, helper, requirement, apply, host } = setup();

    expect(input().getAttribute('aria-describedby')).toBe(helper()!.id);

    apply(() => host.invalid.set(true));
    expect(input().getAttribute('aria-describedby')).toBe(requirement()!.id);

    apply(() => {
      host.invalid.set(false);
      host.helperText.set('');
    });

    // Never a dangling id: pointing at an element that is not rendered makes a
    // screen reader announce nothing at all, which is worse than no description.
    expect(input().getAttribute('aria-describedby')).toBeNull();
  });

  it('falls back to the helper text when invalid arrives without a message', () => {
    const { helper, requirement, apply, host } = setup();

    apply(() => {
      host.invalid.set(true);
      host.invalidText.set('');
    });

    // Carbon would render an empty message box and hide the helper. Keeping the
    // helper is the same amount of explanation for the error and strictly more
    // guidance about the field.
    expect(requirement()).toBeNull();
    expect(helper()?.textContent?.trim()).toBe('Lowercase letters only.');
  });

  it('lets invalid outrank warn', () => {
    const { requirement, el, apply, host } = setup();

    apply(() => {
      host.invalid.set(true);
      host.warn.set(true);
    });

    const wrapper = el.querySelector('nine-am-input') as HTMLElement;

    expect(requirement()?.textContent?.trim()).toBe(
      'That namespace already exists.',
    );
    expect(wrapper.classList).toContain('nine-am-input--invalid');
    expect(wrapper.classList).not.toContain('nine-am-input--warn');
  });

  it('marks aria-invalid only for invalid, never for warn', () => {
    const { input, apply, host } = setup();

    expect(input().getAttribute('aria-invalid')).toBeNull();

    apply(() => host.warn.set(true));

    // A warning is not an error. Announcing it as one makes every soft nudge
    // sound like a blocker.
    expect(input().getAttribute('aria-invalid')).toBeNull();

    apply(() => host.invalid.set(true));
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('draws the invalid icon as a single knocked-out path', () => {
    const { statusPaths, apply, host } = setup();

    apply(() => host.invalid.set(true));

    // warning--filled.svg ships two paths. The second is Carbon's `inner-path`,
    // a duplicate of the bar and dot that Carbon renders invisible. Our Icon
    // fills every path with currentColor, so adding it back plugs the knockout
    // and leaves a blank disc. This is the guard against someone "completing"
    // the icon data in icons.ts.
    expect(statusPaths()).toHaveLength(1);
  });

  it('keeps the warn icon two-tone, with the exclamation recolorable first', () => {
    const { statusPaths, apply, host } = setup();

    apply(() => host.warn.set(true));

    const paths = statusPaths();

    // The triangle takes $support-warning; input.scss recolors
    // path:first-of-type to black. That selector is positional, so the order
    // here is load-bearing — the exclamation has to stay first.
    expect(paths).toHaveLength(3);
    expect(paths[0].getAttribute('d')).toContain('M16,26a1.5,1.5,0,1,1,1.5-1.5');
  });

  it('reveals a password without losing the value', () => {
    const { el, input, apply, host, fixture } = setup();

    apply(() => {
      host.type.set('password');
      host.value.set('hunter2');
    });

    expect(input().type).toBe('password');

    const reveal = el.querySelector('.nine-am-input__reveal') as HTMLButtonElement;
    expect(reveal.getAttribute('aria-label')).toBe('Show password');

    reveal.click();
    fixture.detectChanges();

    expect(input().type).toBe('text');
    expect(input().value).toBe('hunter2');
    expect(reveal.getAttribute('aria-label')).toBe('Hide password');
  });

  it('offers no reveal button on a field that is not a password', () => {
    const { el } = setup();

    expect(el.querySelector('.nine-am-input__reveal')).toBeNull();
  });

  it('reports blur, which is what the validation policy hangs off', () => {
    const { input, host, fixture } = setup();

    input().dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(host.blurCount()).toBe(1);
  });

  it('adds the fluid divider only when there is a message to separate', () => {
    const { el, apply, host } = setup();

    apply(() => host.fluid.set(true));

    // No message, no divider: in fluid the field keeps its own bottom border and
    // a divider would draw a second rule right on top of it.
    expect(el.querySelector('.nine-am-input__divider')).toBeNull();

    apply(() => host.invalid.set(true));
    expect(el.querySelector('.nine-am-input__divider')).not.toBeNull();
  });

  it('reports every keystroke through the value model', () => {
    const { input, host, fixture } = setup();

    input().value = 'production';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.value()).toBe('production');
  });
});
