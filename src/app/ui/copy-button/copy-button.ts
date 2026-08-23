import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** Carbon's default: long enough to read, short enough not to linger. */
export const COPY_FEEDBACK_TIMEOUT = 2000;

/**
 * Carbon's copy button: an icon button that puts something on the clipboard and
 * says so.
 *
 * The saying-so is the component. Copying is invisible — nothing on screen
 * changes, no dialog appears, and without feedback a user cannot tell a
 * successful copy from a dead button. So the feedback is not decoration, and it
 * is announced as well as shown: it is the only evidence the action happened.
 *
 * **It never claims a copy it did not make.** `navigator.clipboard` is missing
 * on insecure origins and its write can be refused, so the bubble appears after
 * the promise resolves rather than on the click, and a refusal emits
 * `(copyFailed)` instead of pretending.
 */
@Component({
  selector: 'nine-am-copy-button',
  encapsulation: ViewEncapsulation.None,
  imports: [Icon],
  styleUrl: './copy-button.scss',
  host: { class: 'nine-am-copy-button-host' },
  template: `
    <button
      type="button"
      [class]="buttonClass()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="copy()"
    >
      <nine-am-icon name="copy" [size]="16" />

      <span class="nine-am-copy-button__feedback" aria-hidden="true">{{ feedback() }}</span>
    </button>

    <!--
      The announcement, separate from the bubble above. The bubble is
      aria-hidden because it appears and vanishes on its own schedule, and a
      live region that is inserted along with its text is the classic way to end
      up with one no screen reader reads. This one is in the document from the
      start and only its contents change.
    -->
    <span class="nine-am-visually-hidden" role="status" aria-live="polite">
      @if (showing()) {
        {{ feedback() }}
      }
    </span>
  `,
})
export class CopyButton {
  /** The text to put on the clipboard. */
  readonly value = input.required<string>();

  /** The accessible name. The button is an icon and nothing else. */
  readonly label = input('Copy to clipboard');

  /** What the bubble says, and what is announced, once the copy has happened. */
  readonly feedback = input('Copied!');

  /** How long the bubble stays. Carbon's default is two seconds. */
  readonly feedbackTimeout = input(COPY_FEEDBACK_TIMEOUT);

  readonly disabled = input(false);

  /** The text reached the clipboard. */
  readonly copied = output<void>();

  /**
   * It did not. No clipboard on an insecure origin, or the browser refused —
   * either way the caller may want to offer the text some other way, and
   * nothing on screen will have claimed success.
   */
  readonly copyFailed = output<unknown>();

  protected readonly showing = signal(false);

  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly buttonClass = computed(() =>
    this.showing() ? 'nine-am-copy-button nine-am-copy-button--showing' : 'nine-am-copy-button',
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected async copy(): Promise<void> {
    try {
      // Optional chaining rather than a feature test that reads better: on an
      // insecure origin `navigator.clipboard` is simply absent, and calling it
      // is the only way to learn the write itself was refused.
      await navigator.clipboard?.writeText(this.value());

      if (!navigator.clipboard) {
        throw new Error('The clipboard is unavailable on this origin.');
      }
    } catch (reason) {
      this.copyFailed.emit(reason);
      return;
    }

    this.copied.emit();
    this.showing.set(true);

    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.showing.set(false), this.feedbackTimeout());
  }
}
