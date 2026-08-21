import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Overlay, type OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  Component,
  DestroyRef,
  inject,
  Injectable,
  Injector,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ToastNotification } from './toast-notification';
import type { NotificationStatus } from './notification-base';

/** Carbon's number for a toast that dismisses itself. Nothing here defaults to it — see `timeout`. */
export const TOAST_TIMEOUT = 5000;

export interface ToastOptions {
  readonly heading: string;
  readonly status?: NotificationStatus;
  readonly subtitle?: string;

  /** A formatted time stamp. All of the product's toasts carry one, or none does. */
  readonly caption?: string;

  readonly lowContrast?: boolean;
  readonly hideCloseButton?: boolean;
  readonly closeLabel?: string;

  /**
   * Milliseconds until the toast removes itself. `0`, the default, means it
   * stays until closed — which is Carbon's default too.
   *
   * `TOAST_TIMEOUT` is the five seconds Carbon specifies when you do want one.
   * Do not set it on anything the user has to act on, and give them somewhere
   * else to read the message afterwards: five seconds is not long enough to
   * read two lines and decide what to do about them.
   */
  readonly timeout?: number;
}

/** Handle on a toast that is on screen. */
export interface ToastRef {
  close(): void;
}

interface ToastItem extends ToastOptions {
  readonly id: number;
}

let nextId = 0;

/**
 * The stack itself. Internal — it exists because toasts have to share one
 * container to stack, and it is created by the service rather than placed in an
 * application template.
 */
@Component({
  selector: 'ds-toast-outlet',
  encapsulation: ViewEncapsulation.None,
  imports: [ToastNotification],
  template: `
    <div class="ds-toast-stack">
      @for (toast of toasts(); track toast.id) {
        <ds-toast-notification
          [status]="toast.status ?? 'info'"
          [heading]="toast.heading"
          [subtitle]="toast.subtitle ?? ''"
          [caption]="toast.caption ?? ''"
          [lowContrast]="toast.lowContrast ?? false"
          [hideCloseButton]="toast.hideCloseButton ?? false"
          [closeLabel]="toast.closeLabel ?? 'Close notification'"
          [role]="null"
          (closed)="notifications.close(toast.id)"
        />
      }
    </div>
  `,

  // No styleUrl of its own on purpose. `.ds-toast-stack` is in notification.scss
  // and gets there with the toasts, which are the only thing this ever renders —
  // a third component naming the same stylesheet would put a third copy of it in
  // the bundle for one flex column.
})
export class ToastOutlet {
  protected readonly notifications = inject(NotificationService);
  protected readonly toasts = this.notifications.toasts;
}

/**
 * Opens Carbon toast notifications: top right of the screen, newest first,
 * $spacing-03 apart.
 *
 * Announcing is deliberately not left to the toasts. A `role="status"` element
 * that is inserted into the page *along with* its text is the classic way to
 * end up with a live region no screen reader reads, because the region was not
 * there to be watched when the text arrived. The CDK's `LiveAnnouncer` keeps one
 * region in the document from the start, so the announcement happens whether or
 * not this is the first toast — which is why the toasts it renders are given no
 * role of their own. A `ds-toast-notification` placed by hand keeps its
 * `role="status"`; it is part of the page from the beginning, so it works.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);
  private readonly announcer = inject(LiveAnnouncer);

  private readonly items = signal<readonly ToastItem[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  private overlayRef: OverlayRef | null = null;

  /** Read by `ToastOutlet`. Not part of the public surface. */
  readonly toasts = this.items.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.closeAll());
  }

  show(options: ToastOptions): ToastRef {
    const id = nextId++;

    this.attach();

    // Newest first: Carbon pushes older notifications down rather than adding
    // to the bottom, so the one that just arrived is nearest the top edge.
    this.items.update((toasts) => [{ ...options, id }, ...toasts]);

    this.announcer.announce(
      [options.heading, options.subtitle].filter(Boolean).join('. '),
      options.status === 'error' ? 'assertive' : 'polite',
    );

    const timeout = options.timeout ?? 0;

    if (timeout > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.close(id), timeout),
      );
    }

    return { close: () => this.close(id) };
  }

  close(id: number): void {
    const timer = this.timers.get(id);

    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.items.update((toasts) => toasts.filter((toast) => toast.id !== id));

    // The overlay stays attached while any toast is left; emptying it out is
    // what releases the container.
    if (this.items().length === 0) {
      this.detach();
    }
  }

  closeAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.items.set([]);
    this.detach();
  }

  private attach(): void {
    if (this.overlayRef) {
      return;
    }

    this.overlayRef = this.overlay.create({
      // $spacing-05 from each edge, written as a CSS length because a position
      // strategy takes one — it assigns straight to element.style.
      //
      // The top is a custom property because the right answer depends on what is
      // up there. On its own a toast belongs 1rem from the top of the screen; in
      // an app with a shell that puts it over the header, covering the search and
      // account controls at the moment it most wants attention. The overlay lives
      // in <body>, outside the shell, so it cannot work this out for itself —
      // an app with a header sets the property on :root and moves the stack below
      // it. See USAGE.md.
      positionStrategy: this.overlay
        .position()
        .global()
        .top('var(--ds-toast-inset-block-start, 1rem)')
        .right('1rem'),

      // A toast does not block the page, so it must not follow it either: the
      // reposition strategy would keep the stack glued to a scrolling document.
      scrollStrategy: this.overlay.scrollStrategies.noop(),
    });

    this.overlayRef.attach(new ComponentPortal(ToastOutlet, null, this.injector));
  }

  private detach(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
