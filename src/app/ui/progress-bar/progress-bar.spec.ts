import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProgressBar, type ProgressStatus } from './progress-bar';

@Component({
  imports: [ProgressBar],
  template: `
    <nine-am-progress-bar
      label="Export data"
      helperText="3 of 12 files"
      [value]="value()"
      [max]="max()"
      [status]="status()"
    />
  `,
})
class Host {
  readonly value = signal<number | null>(null);
  readonly max = signal(100);
  readonly status = signal<ProgressStatus>('active');
}

describe('ProgressBar', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      root: () => el.querySelector('nine-am-progress-bar') as HTMLElement,
      track: () => el.querySelector('[role="progressbar"]') as HTMLElement,
      bar: () => el.querySelector('.nine-am-progress-bar__bar') as HTMLElement,
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('is indeterminate until a value arrives, and says nothing it cannot know', () => {
    const { root, track } = setup();

    // A bar reporting a percentage it does not have is worse than one admitting
    // it is still working — so there is no `aria-valuenow` to be wrong.
    expect(root().classList).toContain('nine-am-progress-bar--indeterminate');
    expect(track().hasAttribute('aria-valuenow')).toBe(false);
  });

  it('reports the value once it has one', () => {
    const { apply, host, root, track, bar } = setup();

    apply(() => host.value.set(25));

    expect(root().classList).not.toContain('nine-am-progress-bar--indeterminate');
    expect(track().getAttribute('aria-valuenow')).toBe('25');
    expect(track().getAttribute('aria-valuemax')).toBe('100');
    expect(bar().style.transform).toBe('scaleX(0.25)');
  });

  it('keeps the value inside its own bounds', () => {
    const { apply, host, track, bar } = setup();

    apply(() => host.value.set(140));

    // A caller counting bytes overshoots more often than not, and a bar drawn
    // past its track is a rendering bug rather than information.
    expect(track().getAttribute('aria-valuenow')).toBe('100');
    expect(bar().style.transform).toBe('scaleX(1)');
  });

  it('fills on either ending, whatever the number says', () => {
    const { apply, host, root, bar } = setup();

    apply(() => {
      host.value.set(40);
      host.status.set('error');
    });

    // The ending is what it is reporting now, not the arithmetic that got there.
    expect(bar().style.transform).toBe('scaleX(1)');
    expect(root().classList).toContain('nine-am-progress-bar--error');
    expect(root().classList).not.toContain('nine-am-progress-bar--indeterminate');
  });

  it('is never indeterminate once it has finished', () => {
    const { apply, host, root } = setup();

    apply(() => host.status.set('finished'));

    expect(root().classList).not.toContain('nine-am-progress-bar--indeterminate');
  });
});
