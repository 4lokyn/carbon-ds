import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActionableNotification } from './actionable-notification';
import { Callout } from './callout';
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

@Component({
  imports: [ActionableNotification],
  template: `
    <button type="button" id="opener">Open</button>

    @if (open()) {
      <ds-actionable-notification
        status="error"
        heading="Deployment failed"
        subtitle="The cluster rejected the manifest."
        [inline]="inline()"
        [actionLabel]="actionLabel()"
        [closeOnEscape]="closeOnEscape()"
        [hideCloseButton]="hideCloseButton()"
        (actionClicked)="actions.set(actions() + 1)"
        (closed)="closes.set(closes() + 1)"
      />
    }
  `,
})
class ActionableHost {
  readonly open = signal(false);
  readonly inline = signal(false);
  readonly actionLabel = signal('Retry');
  readonly closeOnEscape = signal(true);
  readonly hideCloseButton = signal(false);
  readonly actions = signal(0);
  readonly closes = signal(0);
}

describe('ActionableNotification', () => {
  function setup() {
    const fixture = TestBed.createComponent(ActionableHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      opener: () => el.querySelector('#opener') as HTMLButtonElement,
      root: () => el.querySelector('ds-actionable-notification') as HTMLElement,
      action: () => el.querySelector('.ds-notification__action') as HTMLButtonElement | null,
      close: () => el.querySelector('.ds-notification__close') as HTMLButtonElement | null,
      open(change: () => void = () => {}) {
        change();
        fixture.componentInstance.open.set(true);
        TestBed.tick();
      },
      apply(change: () => void) {
        change();
        TestBed.tick();
      },
    };
  }

  it('is a dialog that names itself from its own heading', () => {
    const { open, root } = setup();

    open();

    // Carbon asks for alertdialog on a notification that requires an action, and
    // a dialog role with no accessible name is worse than no role at all — a
    // screen reader announces "dialog" and then has nothing to say about it.
    const el = root();

    expect(el.getAttribute('role')).toBe('alertdialog');
    expect(el.querySelector(`#${el.getAttribute('aria-labelledby')}`)?.textContent?.trim()).toBe(
      'Deployment failed',
    );
    expect(el.querySelector(`#${el.getAttribute('aria-describedby')}`)?.textContent?.trim()).toBe(
      'The cluster rejected the manifest.',
    );
  });

  it('takes focus when it arrives and hands it back when it goes', () => {
    const { open, root, opener, apply, host } = setup();

    opener().focus();
    open();

    // The container rather than the first button: it is what carries the role
    // and the name, so focusing it is what gets the heading read before the
    // user is asked to choose between Retry and Close.
    const notification = root();

    expect(notification.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(notification);

    apply(() => host.open.set(false));

    // And back to whatever raised it. This is the half of a focus trap that is
    // easiest to leave out and most obvious when it is missing — without it
    // focus lands on <body> and the next Tab starts the page over.
    expect(document.activeElement).toBe(opener());
  });

  it('wears the toast layout unless asked for the inline one', () => {
    const { open, root, action, apply, host } = setup();

    open();

    // Carbon's default is the toast shape, and the button kinds follow the
    // layout rather than the caller: tertiary on a toast, ghost inline.
    expect(root().classList).toContain('ds-notification--toast');
    expect(action()?.classList).toContain('ds-btn--tertiary');

    apply(() => host.inline.set(true));

    expect(root().classList).toContain('ds-notification--inline');
    expect(action()?.classList).toContain('ds-btn--ghost');
  });

  it('has no action button without a label, and reports the press', () => {
    const { open, action, apply, host } = setup();

    open(() => host.actionLabel.set(''));

    expect(action()).toBeNull();

    apply(() => host.actionLabel.set('Retry'));
    action()?.click();

    expect(host.actions()).toBe(1);
  });

  it('says so on the host when the close button is gone', () => {
    const { open, root, close, apply, host } = setup();

    open(() => host.hideCloseButton.set(true));

    // The modifier is not decoration: with no 48px close button holding the
    // trailing edge, the action button sits flush against it — measured at 0px
    // before this class existed, 8px after.
    expect(close()).toBeNull();
    expect(root().classList).toContain('ds-notification--hide-close-button');

    apply(() => host.hideCloseButton.set(false));

    expect(root().classList).not.toContain('ds-notification--hide-close-button');
  });

  it('closes on Escape, and stops when told not to', () => {
    const { open, root, apply, host } = setup();

    open();
    root().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    TestBed.tick();

    // Focus is trapped, so Escape is the way out that does not require finding
    // the close button first.
    expect(host.closes()).toBe(1);

    apply(() => host.closeOnEscape.set(false));
    root().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    TestBed.tick();

    expect(host.closes()).toBe(1);
  });
});

@Component({
  imports: [Callout],
  template: `
    <ds-callout
      [status]="status()"
      [headingId]="headingId()"
      heading="Limited region"
      subtitle="Two zones only."
    />
  `,
})
class CalloutHost {
  readonly status = signal<NotificationStatus>('info');
  readonly headingId = signal<string | undefined>(undefined);
}

describe('Callout', () => {
  function setup() {
    const fixture = TestBed.createComponent(CalloutHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      host: fixture.componentInstance,
      root: () => el.querySelector('ds-callout') as HTMLElement,
      apply(change: () => void) {
        change();
        fixture.detectChanges();
      },
    };
  }

  it('cannot be dismissed and does not announce itself', () => {
    const { root } = setup();

    const el = root();

    // The three absences are the component. It loads with the page, so there is
    // nothing to announce and nothing to dismiss — a close button here would
    // offer to remove a condition the page is still in.
    expect(el.querySelector('.ds-notification__close')).toBeNull();
    expect(el.hasAttribute('role')).toBe(false);
    expect(el.hasAttribute('aria-live')).toBe(false);
  });

  it('puts an id on the heading only when asked for one', () => {
    const fixture = TestBed.createComponent(CalloutHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const heading = () => el.querySelector('.ds-notification__heading') as HTMLElement;

    // Carbon's `titleId`, and the reason it exists is a link in the body that
    // wants `aria-describedby` on the sentence explaining why it is there.
    expect(heading().hasAttribute('id')).toBe(false);

    fixture.componentInstance.headingId.set('region-note');
    fixture.detectChanges();

    expect(heading().getAttribute('id')).toBe('region-note');
  });

  it('takes the same statuses as every other variant', () => {
    const { root, apply, host } = setup();

    expect(root().classList).toContain('ds-notification--callout');
    expect(root().classList).toContain('ds-notification--info');

    apply(() => host.status.set('warning'));

    expect(root().classList).toContain('ds-notification--warning');
  });
});
