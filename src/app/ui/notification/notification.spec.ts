import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InlineNotification } from './inline-notification';
import { NotificationService } from './notification.service';
import type { NotificationStatus } from './notification-base';

@Component({
  imports: [InlineNotification],
  template: `
    <ds-inline-notification
      [status]="status()"
      [heading]="heading()"
      [subtitle]="subtitle()"
      [lowContrast]="lowContrast()"
      [hideCloseButton]="hideCloseButton()"
      (closed)="closes.set(closes() + 1)"
    />
  `,
})
class Host {
  readonly status = signal<NotificationStatus>('info');
  readonly heading = signal('Deployment failed');
  readonly subtitle = signal('');
  readonly lowContrast = signal(false);
  readonly hideCloseButton = signal(false);
  readonly closes = signal(0);
}

describe('InlineNotification', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      root: () => el.querySelector('ds-inline-notification') as HTMLElement,
      close: () => el.querySelector('.ds-notification__close'),
      iconPaths: () => Array.from(el.querySelectorAll('.ds-notification__icon path')),
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('pairs each status with its own icon and class', () => {
    const { root, apply, host } = setup();

    expect(root().classList).toContain('ds-notification--info');

    apply(() => host.status.set('error'));

    expect(root().classList).toContain('ds-notification--error');
    expect(root().classList).not.toContain('ds-notification--info');
  });

  it('keeps the warning exclamation as a paintable first path', () => {
    const { iconPaths, apply, host } = setup();

    apply(() => host.status.set('warning'));

    // The notification is the one place Carbon paints this exclamation black
    // instead of knocking it out, so it uses `warning-filled-solid` rather than
    // the single-path `warning-filled` every field uses. notification.scss
    // recolors path:first-of-type, which makes the order load-bearing.
    const paths = iconPaths();

    expect(paths).toHaveLength(2);
    expect(paths[0].getAttribute('d')).toContain('M17.5,23.5c0,0.8-0.7,1.5-1.5,1.5');
  });

  it('announces politely by default', () => {
    const { root } = setup();

    // Carbon's guidance stops at alert / log / status, and status is the polite
    // one — an inline notification is rarely worth interrupting a screen reader
    // mid-sentence for.
    expect(root().getAttribute('role')).toBe('status');
  });

  it('reports the close request without removing itself', () => {
    const { close, host } = setup();

    (close() as HTMLButtonElement).click();

    // The element stays. Whether a notification disappears is the caller's
    // decision — it is their element, and they may want to animate it out.
    expect(host.closes()).toBe(1);
    expect(close()).not.toBeNull();
  });

  it('drops the close button when the message must be read', () => {
    const { close, apply, host } = setup();

    apply(() => host.hideCloseButton.set(true));

    expect(close()).toBeNull();
  });

  it('switches to the low-contrast surface', () => {
    const { root, apply, host } = setup();

    expect(root().classList).not.toContain('ds-notification--low-contrast');

    apply(() => host.lowContrast.set(true));

    expect(root().classList).toContain('ds-notification--low-contrast');
  });
});

describe('NotificationService', () => {
  function service() {
    return TestBed.inject(NotificationService);
  }

  function toasts(): HTMLElement[] {
    return Array.from(document.querySelectorAll('ds-toast-notification'));
  }

  function headings(): string[] {
    return toasts().map(
      (toast) => toast.querySelector('.ds-notification__heading')?.textContent?.trim() ?? '',
    );
  }

  afterEach(() => {
    service().closeAll();
    vi.useRealTimers();
  });

  it('stacks the newest toast on top', () => {
    const notifications = service();

    notifications.show({ heading: 'First' });
    notifications.show({ heading: 'Second' });
    TestBed.tick();

    // Carbon pushes older notifications down rather than appending below, so
    // the one that just arrived is the one nearest the top edge.
    expect(headings()).toEqual(['Second', 'First']);
  });

  it('gives service-opened toasts no role of their own', () => {
    const notifications = service();

    notifications.show({ heading: 'Saved' });
    TestBed.tick();

    // The CDK's LiveAnnouncer does the announcing, from a region that was in
    // the document before the toast arrived. A role="status" here as well would
    // announce the same message twice — when it announced it at all, which a
    // live region inserted together with its text often does not.
    expect(toasts()[0].hasAttribute('role')).toBe(false);
  });

  it('closes a toast on request and takes the container with the last one', () => {
    const notifications = service();

    const first = notifications.show({ heading: 'First' });
    notifications.show({ heading: 'Second' });
    TestBed.tick();

    first.close();
    TestBed.tick();

    expect(headings()).toEqual(['Second']);

    notifications.closeAll();
    TestBed.tick();

    expect(toasts()).toHaveLength(0);
    expect(document.querySelector('.ds-toast-stack')).toBeNull();
  });

  it('dismisses itself only when given a timeout', () => {
    vi.useFakeTimers();

    const notifications = service();

    notifications.show({ heading: 'Waits' });
    notifications.show({ heading: 'Goes', timeout: 5000 });
    TestBed.tick();

    vi.advanceTimersByTime(5000);
    TestBed.tick();

    // Carbon's default is to persist. A toast that leaves on its own is opt-in,
    // per call, because five seconds is not long enough to read two lines and
    // decide what to do about them.
    expect(headings()).toEqual(['Waits']);
  });
});
