import { booleanAttribute, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { Icon } from '../icon/icon';
import type { IconName } from '../icon/icons';

let nextId = 0;

/**
 * Where an inline loader is in its life.
 *
 * - `active` — working. The spinner turns.
 * - `inactive` — not working, and not reporting a result either. The spinner is
 *   drawn but stopped, which is how a paused or queued job looks.
 * - `finished` — done, and it worked.
 * - `error` — done, and it did not.
 */
export type InlineLoadingStatus = 'active' | 'inactive' | 'finished' | 'error';

const STATUS_ICON: Record<'finished' | 'error', IconName> = {
  finished: 'checkmark-filled',
  error: 'error-filled',
};

/**
 * Carbon's loading spinner: an 88px ring, or 16px with `small`.
 *
 * The ring is two circles, not one. The faint one is the track and the bright
 * one is the arc that travels around it — an arc alone on an empty background
 * reads as a broken circle rather than as progress.
 *
 * `withOverlay` is on by default, and that is Carbon's default rather than a
 * choice made here. Know what it does before reaching for it: a bare
 * `<nine-am-loading />` covers the entire viewport and blocks the page.
 *
 * Carbon's own guidance is to reach for it rarely. Two rules from the usage
 * page, neither obvious from the API:
 *
 * - **Only past three seconds.** Below that the indicator is more disruptive
 *   than the wait.
 * - **For a full-screen load, prefer a skeleton.** `nine-am-table` already has one,
 *   and a skeleton shows the shape of what is coming where a spinner shows
 *   nothing. The overlay is for a section that is genuinely blocked — a form
 *   mid-submit — rather than for a page that is merely still arriving.
 *
 * And never more than one at a time on a screen.
 */
@Component({
  selector: 'nine-am-loading',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './loading.html',
  styleUrl: './loading.scss',
  host: {
    '[class]': 'hostClass()',
    '[attr.role]': 'announce() ? "status" : null',
    '[attr.aria-live]': 'announce() ? "polite" : null',
    '[attr.aria-label]': 'announce() ? description() : null',
  },
})
export class Loading {
  /**
   * Whether this spinner announces itself.
   *
   * Off when something around it already does — `nine-am-inline-loading` is itself
   * the live region, and a live region nested inside another is a reliable way
   * to get a message read twice or not at all.
   */
  readonly announce = input(true, { transform: booleanAttribute });

  /**
   * False runs Carbon's stop animation — the ring completes its turn and the
   * arc closes — rather than vanishing mid-spin. It is still in the DOM
   * afterwards; remove it yourself when the space should close up.
   */
  readonly active = input(true, { transform: booleanAttribute });

  /** Carbon's default. See the note on the class. */
  readonly withOverlay = input(true, { transform: booleanAttribute });

  /** 16px instead of 88px. */
  readonly small = input(false, { transform: booleanAttribute });

  /** The accessible name. There is no visible text, so this is the only one. */
  readonly description = input('Loading');

  protected readonly hostClass = computed(() => {
    const classes = ['nine-am-loading-host'];

    if (this.withOverlay()) {
      classes.push('nine-am-loading-host--overlay');
    }

    if (!this.active()) {
      classes.push('nine-am-loading-host--stopped');
    }

    return classes.join(' ');
  });

  protected readonly spinnerClass = computed(() => {
    const classes = ['nine-am-loading', 'nine-am-loading__svg'];

    if (this.small()) {
      classes.push('nine-am-loading--small');
    }

    if (!this.active()) {
      classes.push('nine-am-loading--stop');
    }

    return classes.join(' ');
  });
}

/**
 * Carbon's inline loader: a 16px spinner with a line of text beside it, for the
 * button row or the field it belongs to rather than over the whole page.
 *
 * It reports the end of the job as well as the middle, which is the reason it is
 * not just a small spinner: `finished` and `error` swap the spinner for an icon
 * and leave the text saying what happened. A spinner that simply disappears
 * tells the user nothing about whether it worked.
 *
 * Carbon draws its checkmark with a stroke animation. This uses the same
 * `checkmark-filled` glyph the rest of the system uses, without the draw-on —
 * `Icon` fills paths with `currentColor` and has no concept of stroke, and a
 * second icon mechanism for one flourish is a bad trade.
 *
 * Carbon also has `successDelay` and `onSuccess`: it holds `finished` for 1.5s
 * and then calls back, so the caller can tear the loader down. That is a timer
 * the caller already owns — it is the same code that set `finished` in the first
 * place — and putting it in here would mean a component that changes its own
 * status behind the caller's back. Left out on purpose.
 */
@Component({
  selector: 'nine-am-inline-loading',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon, Loading],
  templateUrl: './inline-loading.html',
  styleUrl: './loading.scss',
  host: {
    '[class]': 'hostClass()',
    role: 'status',
    // Assertive on failure only. A job finishing is worth saying; a job failing
    // is worth interrupting for.
    '[attr.aria-live]': 'status() === "error" ? "assertive" : "polite"',
  },
})
export class InlineLoading {
  readonly status = input<InlineLoadingStatus>('active');

  /** The visible line beside the spinner. Change it as the status changes. */
  readonly description = input('');

  protected readonly labelId = `nine-am-inline-loading-${nextId++}`;

  protected readonly icon = computed<IconName | null>(() => {
    const status = this.status();

    return status === 'finished' || status === 'error' ? STATUS_ICON[status] : null;
  });

  protected readonly hostClass = computed(
    () => `nine-am-inline-loading nine-am-inline-loading--${this.status()}`,
  );
}

export const NINE_AM_LOADING = [Loading, InlineLoading] as const;
