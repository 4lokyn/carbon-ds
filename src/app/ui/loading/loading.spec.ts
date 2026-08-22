import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InlineLoading, Loading, type InlineLoadingStatus } from './loading';

@Component({
  imports: [Loading],
  template: `
    <ds-loading
      [active]="active()"
      [withOverlay]="withOverlay()"
      [small]="small()"
      description="Loading the page"
    />
  `,
})
class LoadingHost {
  readonly active = signal(true);
  readonly withOverlay = signal(true);
  readonly small = signal(false);
}

@Component({
  imports: [InlineLoading],
  template: `<ds-inline-loading [status]="status()" [description]="text()" />`,
})
class InlineHost {
  readonly status = signal<InlineLoadingStatus>('active');
  readonly text = signal('Creating cluster…');
}

describe('Loading', () => {
  function setup() {
    const fixture = TestBed.createComponent(LoadingHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      root: () => el.querySelector('ds-loading') as HTMLElement,
      svg: () => el.querySelector('svg') as SVGElement,
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('names itself, since there is no visible text to do it', () => {
    const { root } = setup();

    expect(root().getAttribute('role')).toBe('status');
    expect(root().getAttribute('aria-label')).toBe('Loading the page');
  });

  it('covers the page by default, which is Carbon and worth knowing', () => {
    const { root, apply, host } = setup();

    expect(root().classList).toContain('ds-loading-host--overlay');

    apply(() => host.withOverlay.set(false));

    expect(root().classList).not.toContain('ds-loading-host--overlay');
  });

  it('draws a track as well as an arc', () => {
    const { svg } = setup();

    // An arc alone on an empty background reads as a broken circle rather than
    // as progress, so both circles are always there.
    expect(svg().querySelector('.ds-loading__background')).not.toBeNull();
    expect(svg().querySelector('.ds-loading__stroke')).not.toBeNull();
  });

  it('stops rather than vanishing', () => {
    const { svg, apply, host } = setup();

    expect(svg().classList).not.toContain('ds-loading--stop');

    apply(() => host.active.set(false));

    // Still rendered — the stop animation needs something to run on, and
    // removing it is the caller's call.
    expect(svg().classList).toContain('ds-loading--stop');
  });
});

describe('InlineLoading', () => {
  function setup() {
    const fixture = TestBed.createComponent(InlineHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      root: () => el.querySelector('ds-inline-loading') as HTMLElement,
      spinner: () => el.querySelector('.ds-loading'),
      icon: () => el.querySelector('.ds-inline-loading__icon'),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('swaps the spinner for an icon once the job is over', () => {
    const { spinner, icon, apply, host } = setup();

    expect(spinner()).not.toBeNull();
    expect(icon()).toBeNull();

    apply(() => host.status.set('finished'));

    // The reason this is not just a small spinner: a spinner that disappears
    // says nothing about whether the thing worked.
    expect(spinner()).toBeNull();
    expect(icon()).not.toBeNull();
  });

  it('keeps the stopped ring for a job that has not started', () => {
    const { spinner, apply, host } = setup();

    apply(() => host.status.set('inactive'));

    expect(spinner()).not.toBeNull();
    expect(spinner()?.classList).toContain('ds-loading--stop');
  });

  it('interrupts for a failure and not for a success', () => {
    const { root, apply, host } = setup();

    expect(root().getAttribute('aria-live')).toBe('polite');

    apply(() => host.status.set('finished'));
    expect(root().getAttribute('aria-live')).toBe('polite');

    apply(() => host.status.set('error'));
    expect(root().getAttribute('aria-live')).toBe('assertive');
  });

  it('does not nest a live region inside its own', () => {
    const { root } = setup();

    // The inner spinner is told not to announce. Two nested live regions get a
    // message read twice, or not at all.
    expect(root().querySelectorAll('[aria-live]')).toHaveLength(0);
    expect(root().querySelectorAll('[role="status"]')).toHaveLength(0);
  });
});
