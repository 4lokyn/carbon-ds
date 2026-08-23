# Using carbon-ds

How to build with it. The *why* behind the decisions is in `README.md`; the
conventions for *adding* a component are in `src/app/ui/README.md`.

## Importing

Everything comes from one place. Never reach into a component folder — the file
layout is free to change, the barrel is not.

```ts
import { Button, Input, Table, type DsColumn } from './ui';
```

Components are standalone. Put them in a component's `imports`:

```ts
@Component({
  imports: [Button, Input],
  // …
})
```

Multi-part components ship an array so you do not list the pieces one by one:

```ts
imports: [...DS_SHELL, ...DS_TABS, ...DS_RADIO_GROUP]
```

## Forms

### The one rule

**`invalid` is a plain input. The form decides when it turns on, not the
control.** The rule for this codebase, which is Carbon's:

- on blur
- on submit, for fields nobody touched
- and it clears the moment the value becomes valid — without waiting for another
  blur

All three fall out of one expression:

```ts
readonly email = signal('');
readonly emailTouched = signal(false);
readonly submitted = signal(false);

private readonly emailValid = computed(() => /* … */);

readonly emailInvalid = computed(
  () => (this.emailTouched() || this.submitted()) && !this.emailValid(),
);
```

```html
<ds-input
  label="Email"
  [value]="email()"
  (valueChange)="email.set($event)"
  (blurred)="emailTouched.set(true)"
  [invalid]="emailInvalid()"
  invalidText="Enter a valid email address."
/>
```

Note what is *not* there: nothing resets `emailTouched` when the value turns
good. It is unnecessary — `!emailValid()` going false clears the error on its
own, which is why correcting a bad value updates as you type.

### Every control shares the same shape

`label` (required), `helperText`, `invalid` + `invalidText`, `warn` + `warnText`,
`disabled`, `readOnly`, `hideLabel`, `size` (`sm` | `md` | `lg`), and a
`(blurred)` output. Learn one, you know all of them.

Helper text and the error share one slot — the error *replaces* the helper
rather than stacking under it, so nothing below shifts when a field goes
invalid.

### Binding

Values are `model()` signals, so `[(value)]` works:

```html
<ds-input label="Cluster name" [(value)]="clusterName" />
<ds-textarea label="Description" [(value)]="description" [rows]="4" />
<ds-toggle label="Auto-scaling" [(checked)]="autoScaling" />
```

That signal *is* the Signal Forms contract (`FormValueControl<T>` /
`FormCheckboxControl`) — no `ControlValueAccessor`, no adapter.

### Select takes projected options, MultiSelect takes configured ones

Not an inconsistency. A `<select>` keeps `<optgroup>` and disabled options for
free; a multi-select's select-all has to know the whole set and its filter has
to know each row's text, and projected elements expose neither.

```html
<ds-select label="Region" [(value)]="region">
  <option value="">Choose a region</option>
  <optgroup label="Europe">
    <option value="eu-west">eu-west</option>
  </optgroup>
</ds-select>

<ds-multi-select
  label="Owners"
  selectAll
  filterable
  [options]="ownerOptions"
  [(selected)]="owners"
/>
```

Select-all applies to the *filtered* rows only, and skips disabled ones.

### Dates: format and parse are a pair

`formatDate` and `parseDate` are both inputs and must be overridden **together**.
Whatever the field shows has to be something it can read back. The default is ISO
because `03/04` is two different days depending on who is reading it.

```html
<ds-date-picker label="Start date" [(value)]="startDate" />

<ds-date-range-picker
  label="Reporting period"
  [(start)]="rangeStart"
  [(end)]="rangeEnd"
/>
```

The range picker holds both ends in one field (`2026-08-13 – 2026-08-15`) and
reads a spaced en dash, em dash, hyphen or "to" back.

## Table

Columns are data, not templates — a text column is one line.

```ts
readonly columns: DsColumn<Service>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'cpu', header: 'CPU', sortable: true,
    value: (r) => r.cpu === null ? '' : `${r.cpu}%`,
    sortBy: (r) => r.cpu },
];
```

**`value` is display, `sortBy` is order.** A column rendering `"3 hours ago"` or
`"42%"` must give a `sortBy`, or it sorts the formatted string.

Pagination lives outside the table, so the caller slices the rows — which means
sorting has to happen on the full list first:

```ts
readonly sorted = computed(() => sortRows(this.filtered(), this.columns(), this.sort()));
readonly pageRows = computed(() => this.sorted().slice(start, start + size));
```

…and the table goes in `serverSide` mode so it does not re-sort the one page it
can see. `demo/services-table.ts` is the worked example.

Do not combine `zebra` with `selectable`: the stripe and the selected background
are the same token in every Carbon theme.

### The form's own errors

Field-level messages cover *which* input is wrong. They do not cover the
submission failing, which is why Carbon asks for both:

```html
@if (submitFailed()) {
  <ds-inline-notification
    status="error"
    lowContrast
    heading="Could not create the cluster"
    subtitle="The region rejected the request. Check the quota and try again."
  />
}
```

At the top of the form, above the fields, and the per-field errors stay. A user
who has scrolled past the offending field has nothing else to tell them the
submit did not go through.

**Submit buttons.** Short forms that only validate on the server should disable
the primary action until the requirements are met. Long forms should not — the
error and the button may not be on screen together, and a button disabled for an
invisible reason looks broken. Always disable it on submit, to stop a duplicate.

## Loading

```html
<!-- blocks the page: overlay is on by default -->
<ds-loading description="Loading the dashboard" />

<!-- in a button row, and it reports the end as well as the middle -->
<ds-inline-loading [status]="status()" [description]="text()" />
```

**Three rules, all Carbon's, none of them visible in the API:**

- **Only past three seconds.** Below that the indicator is more disruptive than
  the wait.
- **For a full-screen load, prefer a skeleton.** `ds-table` has one. A skeleton
  shows the shape of what is arriving; a spinner shows nothing. Keep the overlay
  for a section that is genuinely blocked — a form mid-submit — not for a page
  that is merely still coming.
- **One at a time.** Several spinners on one screen read as a broken page.

`ds-inline-loading` is the one you will reach for most, and it is not a small
spinner: `finished` and `error` swap the ring for an icon and leave the text
saying what happened. A spinner that just disappears says nothing about whether
the thing worked.

Carbon's `successDelay` / `onSuccess` are deliberately absent — that timer
belongs to the code that set `finished` in the first place.

## Link

```html
<a dsLink href="/docs">Carbon docs</a>
<a dsLink inline href="/docs">inside a sentence</a>
<a dsLink href="/docs" icon="arrow-up" size="lg">With an icon</a>
```

**Standalone or inline is the decision.** Standalone sits on its own and is
underlined on hover. Inline sits in a sentence and is underlined always, because
colour alone does not say "clickable" — and to a colour-blind reader it says
nothing at all.

`disabled` keeps the `<a>` and marks it `aria-disabled`, rather than swapping the
element the way Carbon React does. `visited` is opt-in; leave it off unless
"have I read this?" is a question worth answering on that screen.

## Tile

Four things share one surface. Pick by what the tile *does*.

```html
<ds-tile>Holds content, does nothing else.</ds-tile>

<a dsClickableTile href="/clusters/prod-01">A whole tile that navigates</a>

<ds-selectable-tile [(selected)]="pro" name="plan" value="pro">Pro plan</ds-selectable-tile>

<ds-expandable-tile [(expanded)]="open">
  <div dsTileAboveFold>carbon-prod-01 — 3 services</div>
  <div dsTileBelowFold>Region eu-central-1, last deploy 4 hours ago.</div>
</ds-expandable-tile>
```

**A tile has no border.** That is Carbon's default, not an omission — the border
lives behind Carbon's `enable-tile-contrast` flag, and what separates a tile from
the page is its surface, `$layer-01` against `$background`. The consequence to
plan around: a tile on ground that is already `$layer-01` — inside a modal, or
inside another tile — is invisible. Keep tiles on the page.

**`interactive` on the expandable tile is the one to get right.** By default the
whole tile is a single `<button>`, which is the better target. But a `<button>`
may not contain a link or another button, and if you put one in anyway it becomes
unreachable by keyboard. The moment the tile holds anything clickable, set
`interactive` — then only the chevron is a button:

```html
<ds-expandable-tile [(expanded)]="open" interactive>
  <div dsTileAboveFold>carbon-staging-02</div>
  <div dsTileBelowFold><a dsLink href="/clusters/staging-02">Open the cluster</a></div>
</ds-expandable-tile>
```

`collapsedLabel` / `expandedLabel` name that chevron; they only matter in the
`interactive` case, where the chevron is the only control and has no text of its
own. The default tile is labelled by its own content.

The selectable tile is a real `<input type="checkbox">` under the surface, so
`name` and `value` are collected by a surrounding `<form>` on submit and Space
toggles it with no help from us.

## Notification

Two variants of the same four statuses (`error`, `success`, `warning`, `info`).
Pick by whether the message waits or arrives: an inline notification sits in the
flow it concerns and stays until dismissed; a toast comes in over the page.

```html
<ds-inline-notification
  status="error"
  lowContrast
  heading="Deployment failed"
  subtitle="The cluster rejected the manifest. Check the image tag and retry."
  (closed)="dismissed.set(true)"
/>
```

**`(closed)` does not remove anything.** It is your element — hide it, animate it
out, or mark it read. The one exception is a toast opened through the service,
which owns its own.

Toasts go through `NotificationService` rather than into a template. It owns the
stack (top right, newest first) and the announcing:

```ts
private readonly notifications = inject(NotificationService);

this.notifications.show({
  status: 'success',
  heading: 'Cluster created',
  subtitle: 'carbon-prod-01 is ready and accepting traffic.',
  timeout: TOAST_TIMEOUT,          // omit to make it wait
});
```

**If your app has a shell, move the stack below the header.** The overlay is
appended to `<body>`, outside the shell, so the service cannot tell there is a
header to avoid — left alone it puts toasts over the header's own controls. One
line in your global stylesheet, not per call:

```scss
:root {
  --ds-toast-inset-block-start: 4rem;   // 48px header + $spacing-05
}
```

**Toasts persist unless you pass a `timeout`**, which is Carbon's default and
almost always the right one: `TOAST_TIMEOUT` is five seconds, and five seconds is
not long enough to read two lines and decide what to do about them. Never put one
on something the user has to act on.

**`heading`, not `title`.** A static `title="…"` would set the input *and* leave a
native browser tooltip on the element.

Two Carbon rules that are not enforced in code and should be:

- **Pick one contrast and keep it.** `lowContrast` is off by default because that
  is Carbon React's default, but Carbon's guidance is to prefer it and reserve the
  high-contrast style for critical messaging. Never mix the two.
- **Two lines, no more.** Longer than that and the message belongs somewhere you
  can link to.

### When the user has to do something about it

`ds-actionable-notification` is the inline or toast notification with one button
in it. Because there is something to do, it is a `role="alertdialog"`: it takes
focus when it appears, keeps it until the action is taken or the notification is
dismissed, and hands focus back to whatever raised it. Escape closes it.

```html
@if (deployFailed()) {
  <ds-actionable-notification
    status="error"
    heading="Deployment failed"
    subtitle="The cluster rejected the manifest."
    actionLabel="Retry"
    (actionClicked)="retry()"
    (closed)="deployFailed.set(false)"
  />
}
```

**Raise it, do not render it.** The `@if` is the point: it takes focus on
arrival, so an actionable notification that is in the template from page load
steals focus from the page. If it belongs to the page rather than to an event,
you want a callout.

**One button.** Two means the user is being asked to choose, and that is a modal.

`[inline]="true"` swaps the toast shape for the inline one; the button kind
follows the layout (ghost inline, tertiary on a toast) rather than the caller.

`[trapFocus]="false"` turns the trap off, and if you reach for it, set `[role]`
as well — without the trap this is a `status`, not an `alertdialog`, and saying
otherwise misleads a screen reader.

### When it is a condition rather than an event

`ds-callout` is the fourth variant and the quiet one: it loads with the page and
cannot be dismissed. No close button, no timeout, no live region — announcing it
would interrupt a screen reader that is already reading the page it is part of.

```html
<ds-callout
  status="info"
  heading="This region is read-only"
  subtitle="Resources here can be viewed but not changed."
>
  <a routerLink="/access">Request write access</a>
</ds-callout>
```

Put it next to what it is about — above the form whose fields it constrains,
inside the panel whose limits it states. Its width comes from the container
rather than from a breakpoint cap, and it is the one variant that expects links
in its body: they are reached with Tab like any other content.

**Give the link something to be described by.** "Request write access" on its own
tells a screen reader nothing about which access or why, so set `headingId` and
point at it — this is what Carbon's `titleId` is for:

```html
<ds-callout headingId="read-only" heading="This region is read-only" …>
  <a routerLink="/access" aria-describedby="read-only">Request write access</a>
</ds-callout>
```

## Shell

Composed, not configured. Every piece is optional — an app with no side nav
simply does not write one.

```html
<ds-shell>
  <ds-shell-header class="ds-theme-inverse">
    <button dsShellMenuButton aria-label="Open navigation"></button>
    <a dsShellName href="/" prefix="Acme">Console</a>

    <nav dsShellNav aria-label="Sections">
      <a dsShellLink routerLink="/overview" routerLinkActive
         ariaCurrentWhenActive="page">Overview</a>

      <ds-shell-nav-menu label="More">
        <a dsShellLink routerLink="/changelog">Changelog</a>
      </ds-shell-nav-menu>
    </nav>

    <div dsShellActions>
      <button dsShellAction icon="search" label="Search"></button>
      <button dsShellAction icon="switcher" activeIcon="close"
              label="Switch sites" [active]="panelOpen()"
              (click)="panelOpen.set(!panelOpen())"></button>
    </div>
  </ds-shell-header>

  <ds-shell-side-nav>
    <div dsShellSideNavItem>
      <a dsShellLink routerLink="/overview" routerLinkActive
         ariaCurrentWhenActive="page">Overview</a>
    </div>

    <ds-shell-side-nav-menu label="Settings">
      <div dsShellSideNavItem><a dsShellLink routerLink="/settings/team">Team</a></div>
    </ds-shell-side-nav-menu>
  </ds-shell-side-nav>

  <ds-shell-overlay />

  <ds-shell-panel class="ds-theme-inverse" [(expanded)]="panelOpen">
    <ds-shell-panel-section label="Foundations">
      <a dsShellLink href="#">Brand</a>
    </ds-shell-panel-section>
  </ds-shell-panel>

  <ds-shell-content withSideNav>
    <router-outlet />
  </ds-shell-content>
</ds-shell>
```

Three things to know:

**Active route needs no binding.** `routerLinkActive` with
`ariaCurrentWhenActive="page"` writes the attribute the shell styles against.
Nested links inside a group get the same highlight.

**`ds-theme-inverse` is what makes the shell dark.** Carbon's header is
`$background` like everything else; it looks black in their screenshots because
the shell sits in a g100 theme zone. Drop the class for a light shell.

**`withSideNav` on the content** is what offsets it. Leave it off and the
content runs full width.

## Grid

Carbon's 2x grid: 16 columns from `lg`, 8 on `md`, 4 on `sm`. The count changing
is the point — one class, three sensible layouts.

```html
<div class="ds-grid ds-grid--row-gap">
  <div class="ds-col-span-8">Half on a laptop, all of a tablet</div>
  <div class="ds-col-span-8">…</div>
</div>
```

Breakpoint-scoped spans read "from here up":

```html
<div class="ds-col-span-4 ds-col-md-2 ds-col-lg-8">…</div>
```

Modifiers: `--full-width` (ignore the max width), `--condensed` (1px gutters),
`--narrow` (no gutters), `--row-gap`. Nest with `ds-grid__subgrid` so a column's
children line up with the page rather than re-dividing their own space.

Aspect ratios size a box from its column width: `ds-aspect-16x9`, `2x1`, `4x3`,
`3x2`, `1x1` and their portrait flips.

## Icons

`ds-icon` takes a name from an inlined set, and is always `aria-hidden` — the
thing around it supplies the name.

```html
<button dsButton iconOnly aria-label="Settings">
  <ds-icon name="settings" />
</button>
```

`iconOnly` is not cosmetic: the default button padding reserves an icon slot
beside a label, and without it a lone icon renders in a 100px box against the
left edge.

To add an icon, see the header comment in `ui/icon/icons.ts` — there are two
traps in there and both have bitten already.

## Theming

Four themes, switched at runtime by an attribute on `<html>`; nothing
recompiles.

```ts
private readonly theme = inject(ThemeService);
this.theme.set('g100');
```

Any region can run a different theme with `ds-theme-inverse`, because Carbon
emits its custom properties on any selector rather than only on `:root`.

## Two things that will bite

**Never `@use '@carbon/*'` from a component.** Component styles start with
`@use 'ds' as *;`. One facade means swapping the token source touches one file.

And specifically never `@use '@carbon/styles/scss/grid'` — it ends with a bare
`@include`, so merely using it emits Carbon's entire grid. Reaching it through
the facade once took the bundle from 786 kB to 1.3 MB.

**Class names are the public API.** `ViewEncapsulation.None` everywhere with a
`ds-` prefix, so consumers can override. Do not add an unprefixed class.
