# Using carbon-nine-am

How to build with it. The *why* behind the decisions is in `README.md`; the
conventions for *adding* a component are in `src/app/ui/README.md`.

## Importing

Everything comes from one place. Never reach into a component folder — the file
layout is free to change, the barrel is not.

```ts
import { Button, Input, Table, type NineAmColumn } from './ui';
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
imports: [...NINE_AM_SHELL, ...NINE_AM_TABS, ...NINE_AM_RADIO_GROUP]
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
<nine-am-input
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
<nine-am-input label="Cluster name" [(value)]="clusterName" />
<nine-am-textarea label="Description" [(value)]="description" [rows]="4" />
<nine-am-toggle label="Auto-scaling" [(checked)]="autoScaling" />
```

That signal *is* the Signal Forms contract (`FormValueControl<T>` /
`FormCheckboxControl`) — no `ControlValueAccessor`, no adapter.

### Select takes projected options, MultiSelect takes configured ones

Not an inconsistency. A `<select>` keeps `<optgroup>` and disabled options for
free; a multi-select's select-all has to know the whole set and its filter has
to know each row's text, and projected elements expose neither.

```html
<nine-am-select label="Region" [(value)]="region">
  <option value="">Choose a region</option>
  <optgroup label="Europe">
    <option value="eu-west">eu-west</option>
  </optgroup>
</nine-am-select>

<nine-am-multi-select
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
<nine-am-date-picker label="Start date" [(value)]="startDate" />

<nine-am-date-range-picker
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
readonly columns: NineAmColumn<Service>[] = [
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

### Long text

**Cells truncate with an ellipsis by default**, which is a deviation from Carbon
— Carbon ellipsises only the header label and lets body cells wrap. One line per
row is what makes a dense table scannable, so it is kept, and `wrapCells` turns
Carbon's behaviour back on:

```html
<nine-am-table wrapCells … />
```

Use it where the content matters more than the grid — a description, a path, an
image reference: anything a reader takes in whole rather than recognises at a
glance. Words with nowhere to break on a space break anyway rather than deciding
the column's width.

**The folded view wraps either way**, because a folded row has no column widths
to protect, and the values that end up there are exactly the ones without spaces.

### Folding it into accordions on a narrow screen

Off unless asked for. `foldBelow` names a Carbon breakpoint, and under it the
table becomes a list of accordions — one item per row, the title column as the
heading, every other column as a label/value pair beneath it.

```html
<nine-am-table
  foldBelow="md"
  foldTitle="name"
  selectable
  caption="Services"
  [columns]="columns()"
  [rows]="rows()"
  [rowKey]="rowKey"
  [(selection)]="selected"
/>
```

**Opt in per table, because it is a question about the data.** Six short columns
fold into a readable card; twenty numeric ones do not, and sideways scrolling
serves those better. `foldTitle` defaults to the first column.

What carries over and what does not:

- **Selection carries over**, select-all included. The row checkbox moves beside
  the heading rather than inside it, because the heading is a `<button>` and a
  button may not contain a checkbox. Select-all moves above the list, where the
  header row would have been, and shows its label — nothing else on a folded row
  explains what a lone checkbox at the top would select.
- **Expansion carries over**, and it is the same open state — a row expanded in
  the table is open when it folds. `expandedContent` renders under the fields.
- **Sorting does not.** The header row is where sorting lives and it is gone, so
  put a sort control in the toolbar if a narrow screen needs one.
- **Pagination is unaffected**, because it was never inside the table.

Measured against the viewport, not the table's own width. A container query
would be the more precise answer and needs a `ResizeObserver`; the viewport is
what a caller can reason about from a stylesheet. Where `matchMedia` does not
exist — a server render — the table stays a table, which is the safe way to be
wrong: every column is still there, just wide.

### The form's own errors

Field-level messages cover *which* input is wrong. They do not cover the
submission failing, which is why Carbon asks for both:

```html
@if (submitFailed()) {
  <nine-am-inline-notification
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
<nine-am-loading description="Loading the dashboard" />

<!-- in a button row, and it reports the end as well as the middle -->
<nine-am-inline-loading [status]="status()" [description]="text()" />
```

**Three rules, all Carbon's, none of them visible in the API:**

- **Only past three seconds.** Below that the indicator is more disruptive than
  the wait.
- **For a full-screen load, prefer a skeleton.** `nine-am-table` has one. A skeleton
  shows the shape of what is arriving; a spinner shows nothing. Keep the overlay
  for a section that is genuinely blocked — a form mid-submit — not for a page
  that is merely still coming.
- **One at a time.** Several spinners on one screen read as a broken page.

`nine-am-inline-loading` is the one you will reach for most, and it is not a small
spinner: `finished` and `error` swap the ring for an icon and leave the text
saying what happened. A spinner that just disappears says nothing about whether
the thing worked.

Carbon's `successDelay` / `onSuccess` are deliberately absent — that timer
belongs to the code that set `finished` in the first place.

## Progress bar

For something with a duration the user is waiting through — a download, an
install, a transfer. For "the page is doing something", that is `Loading`.

```html
<!-- Indeterminate: no value yet. -->
<nine-am-progress-bar label="Waiting for the server" helperText="No estimate yet" />

<!-- Determinate, once the process can say. -->
<nine-am-progress-bar
  label="Export data"
  [value]="done()"
  [max]="total()"
  [status]="failed() ? 'error' : done() === total() ? 'finished' : 'active'"
  [helperText]="done() + ' of ' + total() + ' records'"
/>
```

**Leaving `value` unset is the indeterminate switch**, and it is the honest one:
a bar reporting a percentage it cannot know is worse than one admitting it is
still working. `null` counts as unset for the same reason — a value that has not
arrived is not zero.

`status` carries the ending. A finished or failed bar draws full whatever the
number says, because the ending is what it is reporting, not the arithmetic that
got there. `helperText` is announced politely when it changes, so "Upload
failed" reaches a screen reader without a second live region.

`size="small"` halves the track to 4px. `type="inline"` puts the label beside
the track and takes the helper text off the screen while keeping it for a screen
reader, because an inline bar is one row.

## Copy button

```html
<nine-am-copy-button [value]="image" (copyFailed)="offerManually()" />
```

**The feedback is the component.** Copying changes nothing on screen and opens
no dialog, so without it a user cannot tell a successful copy from a dead
button. It is announced as well as shown.

**It never claims a copy it did not make.** `navigator.clipboard` is absent on
insecure origins and its write can be refused, so the bubble waits for the
promise rather than appearing on the click, and a refusal emits `(copyFailed)`
with the reason instead of pretending. Handle it if the value matters — offering
the text in a field the user can select is the usual answer.

`feedback` and `feedbackTimeout` change what it says and for how long; the
default is Carbon's two seconds.

## Link

```html
<a nineAmLink href="/docs">Carbon docs</a>
<a nineAmLink inline href="/docs">inside a sentence</a>
<a nineAmLink href="/docs" icon="arrow-up" size="lg">With an icon</a>
```

**Standalone or inline is the decision.** Standalone sits on its own and is
underlined on hover. Inline sits in a sentence and is underlined always, because
colour alone does not say "clickable" — and to a colour-blind reader it says
nothing at all.

`disabled` keeps the `<a>` and marks it `aria-disabled`, rather than swapping the
element the way Carbon React does. `visited` is opt-in; leave it off unless
"have I read this?" is a question worth answering on that screen.

## Tile

Five things share one surface. Pick by what the tile *does*.

```html
<nine-am-tile>Holds content, does nothing else.</nine-am-tile>

<a nineAmClickableTile href="/clusters/prod-01">A whole tile that navigates</a>

<nine-am-selectable-tile [(selected)]="pro" name="plan" value="pro">Pro plan</nine-am-selectable-tile>

<nine-am-expandable-tile [(expanded)]="open">
  <div nineAmTileAboveFold>carbon-prod-01 — 3 services</div>
  <div nineAmTileBelowFold>Region eu-central-1, last deploy 4 hours ago.</div>
</nine-am-expandable-tile>
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
<nine-am-expandable-tile [(expanded)]="open" interactive>
  <div nineAmTileAboveFold>carbon-staging-02</div>
  <div nineAmTileBelowFold><a nineAmLink href="/clusters/staging-02">Open the cluster</a></div>
</nine-am-expandable-tile>
```

`collapsedLabel` / `expandedLabel` name that chevron; they only matter in the
`interactive` case, where the chevron is the only control and has no text of its
own. The default tile is labelled by its own content.

The selectable tile is a real `<input type="checkbox">` under the surface, so
`name` and `value` are collected by a surrounding `<form>` on submit and Space
toggles it with no help from us.

### Which of these, or which one of these

Those are different questions and they take different components. The selectable
tile is a checkbox, so a row of them answers *which of these*. For *which one of
these*, group radio tiles instead:

```html
<nine-am-tile-group legend="Cluster size" [(value)]="size" (selected)="price($event)">
  <nine-am-radio-tile value="small">Small — 2 vCPU, 8 GB</nine-am-radio-tile>
  <nine-am-radio-tile value="medium">Medium — 8 vCPU, 32 GB</nine-am-radio-tile>
  <nine-am-radio-tile value="dedicated" disabled>Dedicated — contact sales</nine-am-radio-tile>
</nine-am-tile-group>
```

`legend` is required, and it is the thing a screen reader reads before the
options — set `hideLegend` if the page already says it in a heading, but say it
somewhere. The group's `disabled` goes through the `<fieldset>` and covers every
tile; a tile's own `disabled` covers one.

**None of the keyboard is ours.** One `name` across the group gives single
selection, arrow keys that move *and* select, wrapping, skipping the disabled
one, and a group that is a single tab stop. Same trade `RadioGroup` makes, and
the reason both are built on native inputs rather than on `div`s with a role.

**`(selected)` fires only on user interaction.** Writing to `[(value)]` from your
own code does not echo back through it, which is what makes it safe to use for
things like recalculating a price.

## Notification

Two variants of the same four statuses (`error`, `success`, `warning`, `info`).
Pick by whether the message waits or arrives: an inline notification sits in the
flow it concerns and stays until dismissed; a toast comes in over the page.

```html
<nine-am-inline-notification
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
  --nine-am-toast-inset-block-start: 4rem;   // 48px header + $spacing-05
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

`nine-am-actionable-notification` is the inline or toast notification with one button
in it. Because there is something to do, it is a `role="alertdialog"`: it takes
focus when it appears, keeps it until the action is taken or the notification is
dismissed, and hands focus back to whatever raised it. Escape closes it.

```html
@if (deployFailed()) {
  <nine-am-actionable-notification
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

`nine-am-callout` is the fourth variant and the quiet one: it loads with the page and
cannot be dismissed. No close button, no timeout, no live region — announcing it
would interrupt a screen reader that is already reading the page it is part of.

```html
<nine-am-callout
  status="info"
  heading="This region is read-only"
  subtitle="Resources here can be viewed but not changed."
>
  <a routerLink="/access">Request write access</a>
</nine-am-callout>
```

Put it next to what it is about — above the form whose fields it constrains,
inside the panel whose limits it states. Its width comes from the container
rather than from a breakpoint cap, and it is the one variant that expects links
in its body: they are reached with Tab like any other content.

**Give the link something to be described by.** "Request write access" on its own
tells a screen reader nothing about which access or why, so set `headingId` and
point at it — this is what Carbon's `titleId` is for:

```html
<nine-am-callout headingId="read-only" heading="This region is read-only" …>
  <a routerLink="/access" aria-describedby="read-only">Request write access</a>
</nine-am-callout>
```

## Accordion

A real `<ul>` of real `<li>` elements — the caller writes the `<li>`, which is
what keeps "list, 3 items" in what a screen reader announces.

```html
<nine-am-accordion>
  <li nineAmAccordionItem title="Choose your plan">
    <p>Compare plan features and pick the one matching your usage.</p>
  </li>
  <li nineAmAccordionItem title="Add team members" [(open)]="membersOpen">
    <p>Invite collaborators by email.</p>
  </li>
</nine-am-accordion>
```

`align="start"` moves the chevron before the title, `size` is `sm` / `md` / `lg`
against the same 32/40/48 scale as the fields, and `flush` drops the side padding
and the rules between items for an accordion that already sits inside something
with its own edges.

**Several items can be open at once and there is no input to prevent it.** That
is Carbon's behaviour and the accessible one — closing what someone is reading
because they opened something else is a tab list wearing the wrong component. If
your case really needs one-at-a-time, you own every item's `open`, so it is a
few lines in your own component.

**`(toggled)` fires only on interaction.** Writing to `[(open)]` does not echo
back through it, which is what makes it safe for "load this section the first
time it is asked for".

### Folding a table row into one

The accordion takes no data of its own, which is the point: a row folded into a
list item is the same `NineAmColumn` model the table takes, read with the table's own
`displayAccessorFor`.

```html
<nine-am-accordion align="start">
  @for (row of rows(); track row.id) {
    <li nineAmAccordionItem [open]="isOpen(row.id)" (openChange)="setOpen(row.id, $event)">
      <span nineAmAccordionTitle>
        {{ row.name }} <nine-am-tag [color]="hue(row)">{{ row.status }}</nine-am-tag>
      </span>

      <dl>
        @for (column of columns(); track column.key) {
          <dt>{{ column.header }}</dt>
          <dd>{{ displayAccessorFor(column)(row) }}</dd>
        }
      </dl>
    </li>
  }
</nine-am-accordion>
```

Three things make that work, and each is deliberate. The title takes markup
(`[nineAmAccordionTitle]`), because a name and a status tag are one heading
rather than a heading with something after it — Carbon allows the same. Nothing
queries the items or holds a selected index, so `@for` behaves. And `open` is the
caller's, so it can be keyed by row id and survive sorting, filtering and paging
the way the table's selection does.

**Use `flush`, or expect the reading measure.** Carbon caps content width past
640px — `padding-inline-end: 25%` — because it is written for prose. A grid of
fields wants that room back.

## Menu buttons

Three components, one behaviour. Carbon documents the menu button, the combo
button and the overflow menu as a single component, and here they are one too:
all three extend `MenuSurface`, which owns the roving focus, the arrows, Home and
End, type-ahead, Escape and the focus return. Pick by the trigger.

```html
<!-- A word that names what the actions are about. -->
<nine-am-menu-button label="Export" kind="tertiary" (actionSelected)="run($event)">
  <button nineAmMenuItem value="csv">Export as CSV</button>
  <button nineAmMenuItem value="json">Export as JSON</button>
  <hr nineAmMenuDivider />
  <button nineAmMenuItem value="purge" danger>Delete export history</button>
</nine-am-menu-button>

<!-- One action performed directly, the rest behind the chevron. -->
<nine-am-combo-button label="Deploy" (primaryAction)="deploy()" (actionSelected)="run($event)">
  <button nineAmMenuItem value="dry-run">Dry run</button>
</nine-am-combo-button>

<!-- Three dots, for a row or a toolbar with no room for a word. -->
<nine-am-overflow-menu label="Row actions" (actionSelected)="run($event)">
  <button nineAmMenuItem value="stop">Stop app</button>
</nine-am-overflow-menu>
```

**Items are the caller's own `<button>` elements**, so Enter and Space work with
no help from us and the thing is a button to every assistive technology. Two
handler idioms, because both are wanted: `(actionSelected)` on the menu reports
the chosen `value` in one place, and `(selected)` on an item handles that action
alone.

**A combo button is two tab stops.** That is Carbon's accessibility spec, not a
shortcut: the primary action has to be reachable without opening anything, and
one control cannot both perform an action and offer a list of others. It is also
primary-only — Carbon allows any kind on a menu button and only a primary on a
combo button, so there is no `kind` to get wrong.

**Item labels are one line and cut with an ellipsis**, which is Carbon's design
— its `.cds--menu-item__label` is `nowrap` with `text-overflow: ellipsis`, and
the item's fixed height follows from that. The panel grows from 10rem to 18rem to
fit the longest action before anything is cut, and every item carries its own
text as a `title` so a truncated action is still readable.

**The panel is inline, not in an overlay.** No flip away from a viewport edge,
and an ancestor with `overflow: hidden` will clip it — the same limitation Carbon
has, which it answers with a `data-floating-menu-container` escape hatch. Inside
a table, give the scrolling ancestor room.

## Shell

Composed, not configured. Every piece is optional — an app with no side nav
simply does not write one.

```html
<nine-am-shell>
  <nine-am-shell-header class="nine-am-theme-inverse">
    <button nineAmShellMenuButton aria-label="Open navigation"></button>
    <a nineAmShellName href="/" prefix="Acme">Console</a>

    <nav nineAmShellNav aria-label="Sections">
      <a nineAmShellLink routerLink="/overview" routerLinkActive
         ariaCurrentWhenActive="page">Overview</a>

      <nine-am-shell-nav-menu label="More">
        <a nineAmShellLink routerLink="/changelog">Changelog</a>
      </nine-am-shell-nav-menu>
    </nav>

    <div nineAmShellActions>
      <button nineAmShellAction icon="search" label="Search"></button>
      <button nineAmShellAction icon="switcher" activeIcon="close"
              label="Switch sites" [active]="panelOpen()"
              (click)="panelOpen.set(!panelOpen())"></button>
    </div>
  </nine-am-shell-header>

  <nine-am-shell-side-nav>
    <div nineAmShellSideNavItem>
      <a nineAmShellLink routerLink="/overview" routerLinkActive
         ariaCurrentWhenActive="page">Overview</a>
    </div>

    <nine-am-shell-side-nav-menu label="Settings">
      <div nineAmShellSideNavItem><a nineAmShellLink routerLink="/settings/team">Team</a></div>
    </nine-am-shell-side-nav-menu>
  </nine-am-shell-side-nav>

  <nine-am-shell-overlay />

  <nine-am-shell-panel class="nine-am-theme-inverse" [(expanded)]="panelOpen">
    <nine-am-shell-panel-section label="Foundations">
      <a nineAmShellLink href="#">Brand</a>
    </nine-am-shell-panel-section>
  </nine-am-shell-panel>

  <nine-am-shell-content withSideNav>
    <router-outlet />
  </nine-am-shell-content>
</nine-am-shell>
```

Three things to know:

**Active route needs no binding.** `routerLinkActive` with
`ariaCurrentWhenActive="page"` writes the attribute the shell styles against.
Nested links inside a group get the same highlight.

**`nine-am-theme-inverse` is what makes the shell dark.** Carbon's header is
`$background` like everything else; it looks black in their screenshots because
the shell sits in a g100 theme zone. Drop the class for a light shell.

**`withSideNav` on the content** is what offsets it. Leave it off and the
content runs full width.

## Grid

Carbon's 2x grid: 16 columns from `lg`, 8 on `md`, 4 on `sm`. The count changing
is the point — one class, three sensible layouts.

```html
<div class="nine-am-grid nine-am-grid--row-gap">
  <div class="nine-am-col-span-8">Half on a laptop, all of a tablet</div>
  <div class="nine-am-col-span-8">…</div>
</div>
```

Breakpoint-scoped spans read "from here up":

```html
<div class="nine-am-col-span-4 nine-am-col-md-2 nine-am-col-lg-8">…</div>
```

Modifiers: `--full-width` (ignore the max width), `--condensed` (1px gutters),
`--narrow` (no gutters), `--row-gap`. Nest with `nine-am-grid__subgrid` so a column's
children line up with the page rather than re-dividing their own space.

Aspect ratios size a box from its column width: `nine-am-aspect-16x9`, `2x1`, `4x3`,
`3x2`, `1x1` and their portrait flips.

## Icons

`nine-am-icon` takes a name from an inlined set, and is always `aria-hidden` — the
thing around it supplies the name.

```html
<button nineAmButton iconOnly aria-label="Settings">
  <nine-am-icon name="settings" />
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

Any region can run a different theme with `nine-am-theme-inverse`, because Carbon
emits its custom properties on any selector rather than only on `:root`.

## Two things that will bite

**Never `@use '@carbon/*'` from a component.** Component styles start with
`@use 'nine-am' as *;`. One facade means swapping the token source touches one file.

And specifically never `@use '@carbon/styles/scss/grid'` — it ends with a bare
`@include`, so merely using it emits Carbon's entire grid. Reaching it through
the facade once took the bundle from 786 kB to 1.3 MB.

**Class names are the public API.** `ViewEncapsulation.None` everywhere with a
`nine-am-` prefix, so consumers can override. Do not add an unprefixed class.
