import { Component, inject, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** Placeholder behind each demo route. Its only job is to name itself. */
@Component({
  selector: 'app-demo-route-page',
  encapsulation: ViewEncapsulation.None,
  template: `
    <p class="demo__note">
      This is the <strong>{{ path() }}</strong> route. The matching link in the
      side nav is highlighted, and nothing in the demo told it to be — the
      router set <code>aria-current="page"</code> and the shell styles against
      that attribute.
    </p>
  `,
})
export class DemoRoutePage {
  private readonly route = inject(ActivatedRoute);

  protected readonly path = toSignal(
    this.route.url.pipe(map((segments) => segments[0]?.path ?? '')),
    { initialValue: '' },
  );
}
