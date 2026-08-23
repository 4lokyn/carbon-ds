import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CopyButton } from './copy-button';

@Component({
  imports: [CopyButton],
  template: `
    <nine-am-copy-button
      value="ghcr.io/acme/gateway:2.14.1"
      (copied)="copies = copies + 1"
      (copyFailed)="failures = failures + 1"
    />
  `,
})
class Host {
  copies = 0;
  failures = 0;
}

/** jsdom has no clipboard, so it is stood in for — this is the whole stub. */
function stubClipboard(writeText: (() => Promise<void>) | null): void {
  Object.defineProperty(navigator, 'clipboard', {
    writable: true,
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

describe('CopyButton', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      button: el.querySelector('.nine-am-copy-button') as HTMLButtonElement,
      bubble: () => el.querySelector('.nine-am-copy-button__feedback') as HTMLElement,
      status: () => el.querySelector('[role="status"]')?.textContent?.trim() ?? '',
      showing: () => el.querySelector('.nine-am-copy-button--showing') !== null,
    };
  }

  it('copies the value and only then says so', async () => {
    let written = '';
    stubClipboard(async () => {
      written = 'called';
    });

    const { button, fixture, host, showing, status } = setup();

    expect(showing()).toBe(false);

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(written).toBe('called');
    expect(host.copies).toBe(1);
    expect(showing()).toBe(true);

    // Announced as well as shown. Copying changes nothing on screen, so the
    // feedback is the only evidence the action happened.
    expect(status()).toBe('Copied!');
  });

  it('claims nothing when the clipboard refuses', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));

    const { button, fixture, host, showing, status } = setup();

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.failures).toBe(1);
    expect(host.copies).toBe(0);
    expect(showing()).toBe(false);
    expect(status()).toBe('');
  });

  it('treats a missing clipboard as a refusal, not a success', async () => {
    // No `navigator.clipboard` at all is what an insecure origin looks like.
    stubClipboard(null);

    const { button, fixture, host, showing } = setup();

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.failures).toBe(1);
    expect(showing()).toBe(false);
  });
});
