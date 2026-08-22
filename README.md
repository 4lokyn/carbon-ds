# carbon-ds

An Angular design system that uses IBM Carbon's **design language** without depending
on IBM's Angular **components**.

```
@carbon/styles     Sass only — tokens, themes, type scale, spacing
@angular/aria      headless ARIA patterns (keyboard, roles, focus)
@angular/cdk       overlays, focus trap, portals, virtual scroll
your components    markup, class names, public API
```

```
ng-primitives      the calendar only, contained to ui/date-picker/
```

There is no `carbon-components-angular` dependency. If IBM's Angular library
stalls or changes its API, nothing here breaks — the only Carbon artifact in the
build is compiled CSS plus some inlined icon paths.

New here? **`USAGE.md`** is the developer guide — how to import, the one rule for
form validation, and a worked example of each area. This file is the *why*.

## Running it

```bash
npm start          # dev server
npm run build      # production build
npm test           # vitest, via @angular/build:unit-test
```

## What's in place

| | |
|---|---|
| Sass facade over Carbon (`src/styles/_ds.scss`) | one import point, so the token source is swappable |
| 4 themes: white / g10 / g90 / g100 | runtime switch via `data-theme`, no recompile |
| IBM Plex, self-hosted | 3 weights + mono, no CDN |
| `Button` | 7 kinds × 6 sizes + icon-only, on a native `<button>` |
| `Tag` + `InteractiveTag` | 10 hues, dismissible, icon; selectable and operational on a real `<button>` |
| `CheckboxGroup` + `Checkbox` | legend, shared validation message, read-only; indeterminate is why it's a component |
| `Search` | magnifier, clear button, 3 sizes, expandable variant |
| `Input` | text / number / password, label + helper, invalid + warn, 3 sizes, fluid, inline |
| `Select` | native `<select>`, projected options, 3 sizes, fluid, inline |
| `Textarea` | `rows`, optional character counter, fluid |
| `RadioGroup` + `Radio` | native radios in a `<fieldset>`, horizontal / vertical |
| `Toggle` | `<button role="switch">`, 2 sizes, custom state text |
| `DatePicker` | calendar popover, typeable field, min/max, disabled days |
| `DateRangePicker` | one field, both ends, shared calendar |
| `MultiSelect` | count in the field, checkbox listbox, select-all, optional filter, Carbon's selection ordering |
| `InlineNotification` | 4 statuses × high / low contrast, optional close |
| `ToastNotification` + `NotificationService` | top-right stack, newest first, optional 5s timeout |
| `Icon` | Carbon paths inlined; no `@carbon/icons-angular` |
| `Tabs` | line and contained, 3 sizes, full width; `@angular/aria` for behavior |
| `Modal` | 4 widths; `@angular/cdk/dialog` for focus trap / Escape / restore focus |
| **`Table`** | config-driven columns, tri-state sort, keyed selection, expansion, skeleton, empty state |
| `TableHeader` | title + description above the toolbar |
| `TableToolbar` | switches to a batch action bar while rows are selected |
| `Pagination` | page size, range, page select, prev/next, unknown totals, 3 sizes |
| **UI Shell** | header, nav + dropdown, side nav with groups, right panel, content |
| **Grid** | Carbon's 2x grid, 16/8/4 columns, 3 modes, aspect ratios |
| `ThemeService` | signal-based, persisted to localStorage |

The demo page at `/` exercises all of it. Read `src/app/ui/README.md` before adding
a component — it has the conventions, and the four non-obvious things about the
table.

### Verified, not assumed

Checked in the browser and locked into tests, not inferred:

- Component tokens (`--cds-button-*`, `--cds-tag-*`) are emitted per theme and do
  change — `tag-background-blue` is `#d0e2ff` light, `#0043ce` dark.
- `role="tablist"` / `role="tab"` come from Aria through `hostDirectives`; arrow
  keys move between tabs and skip the disabled one.
- Escape closes the modal and focus returns to the trigger.
- Table sorting, measured on 23 rows with three null CPU readings:
  asc `4% 9% … 91% 94% — — —`, desc `94% 91% … 9% 4% — — —`. Empties stay last
  both ways. `Updated` orders by timestamp, not by the rendered `"3 hours ago"`.
- Selection survives sorting, paging, and a refetch that supplies new object
  identities for the same rows.
- The warn icon really is two-tone in all four themes: its first path computes to
  `rgb(0,0,0)` and the other two to `$support-warning` `#f1c21b`. The invalid icon
  renders exactly one path — the knockout, not the filled-in disc.
- On an invalid field, focus wins: `outline-color` is `--cds-focus` while the
  field has focus (white in g100, blue in g10) and `--cds-support-error` after
  blur. Measured with the window actually focused — `:focus` cannot match while
  `document.hasFocus()` is false, which makes a backgrounded browser report the
  wrong answer here.
- The validation rule below, driven end to end in the browser: typing a bad
  address shows nothing, Tab turns it red, correcting it clears the error without
  waiting for another blur, and submitting validates a field nobody touched.
- The fluid box really encloses all three of label, value and message, in every
  control and both light and dark. Measured as rectangles, not eyeballed — three
  separate bugs hid here, and each one still looked plausible in a screenshot.
- Two radio-group behaviours, measured in Chrome because jsdom disagrees with it
  on both. A `<fieldset disabled>` makes its inputs match `:disabled` while
  `input.disabled` stays `false` — the property only ever reflects the input's
  own attribute, so the CSS is right and the obvious assertion is not. And
  `preventDefault` on a radio's click restores the *whole* group, re-checking the
  previously selected option; jsdom only un-checks the clicked one, which is why
  the read-only test asserts the model and not the DOM.
- The date picker, driven end to end in a real browser: the panel anchors under
  the field (both left edges at the same x, measured), arrows move a day,
  PageDown moves a month, Enter picks, Escape closes *and* returns focus, a real
  wheel scroll closes it, and `min` + `dateDisabled` leave exactly the August
  2026 weekdays enabled. The range picker fills one field with
  `2026-08-13 – 2026-08-15` and stays open between the two picks.
- The pagination chevrons really are centred: 12px on both sides at `md`, and the
  gutter now follows the size — 8px at `sm`, 16px at `lg`, since the nav button is
  square. They were 13/12
  before — a real `border-inline-start` comes out of the 40px content box under
  `box-sizing: border-box`, so a 16px icon centres in 39px. Carbon has the same
  border and the same 1px drift; ours draws the divider as a pseudo-element
  instead, which is outside the box model.
- The table toolbar, measured rather than eyeballed: icon-only buttons centre
  their glyph 8px from every edge, and the expandable search opens *leftward* —
  its left edge travels 1150 → 496 while the right edge stays put, and the
  primary button beside it keeps its exact width instead of wrapping its label
  into two lines. Pagination's nav buttons sit flush, chevrons 12px from every
  edge; the ink of Carbon's own chevron glyph is 0.3px off its viewBox centre,
  which is below anything visible and is the end of that thread.
- Select-all really is scoped to the filter, measured in the browser and pinned
  by tests: with 7 owners and a filter leaving 1, select-all took that 1 and the
  other 6 stayed untouched when the filter cleared. Disabled rows are excluded,
  and a partial selection reports `indeterminate` with `checked` false — which
  matters, because `checked` wins in the DOM and leaving both on renders a dash
  where a tick belongs.
- The shell's active-route highlight is driven by the URL and nothing else:
  `routerLinkActive` with `ariaCurrentWhenActive` writes `aria-current="page"`
  and the styles key off that attribute, which is also what Carbon keys off. The
  demo has three real routes to prove it. A hand-set `current` on a fourth link
  was making two links claim to be current at once; that is gone.
- Notifications in all four themes, both contrasts: the high-contrast surface
  really does invert (light box on g100, dark box on white), the low-contrast
  one carries its 40%-opacity outline, and the warning circle keeps a black
  exclamation rather than a hole in every one of them. Toasts stack newest-first
  and sit below the shell header, which they did not until the offset became a
  custom property — the overlay is outside the shell and cannot see it.
- The grid's arithmetic, measured at 1915px: 16 tracks, `span 4` renders 220px,
  `span 8` 440px, `span 16` 880px, and each column carries 16px of padding —
  half the 32px gutter, applied as padding rather than `gap` so a column's
  background can run edge to edge.
- 130 unit tests, including regressions for the two bugs found while building the
  table — a `NaN` comparator scrambling the whole array, and emptiness being
  judged from the formatted value rather than the sort value — plus one guarding
  the invalid icon against being "completed" back into a blank disc, and two
  pinning the select that rendered blank whenever its options had no empty value.

### Bundle

Production: **786 kB raw / 150 kB transfer**. CSS is 139 kB raw but **5.8 kB
transferred** — it is almost entirely `--cds-*` custom property declarations across
four themes, which gzip extremely well. Some of the raw JS is the demo's 23-row
fixture, which a real app would fetch.

The six form controls together cost about 46 kB raw / 7 kB transferred, most of
it the demo exercising them rather than the components. The date picker is the
expensive one: **+115 kB raw / +20 kB transferred**, which is ng-primitives plus
the CDK Overlay machinery it needs. That is the price of the one component we did
not build from scratch, and it is worth knowing before adding a second
primitive-backed component.

The CSS has not moved at all through any of it — 139 kB before the first form
control and 139 kB after the date picker. Form styles are a rounding error next
to four themes' worth of custom properties, and `_field.scss` means the controls
share most of them rather than each shipping a copy.

The two default Angular budgets were raised deliberately, not to silence noise:

- `anyComponentStyle` 4 kB → 12 kB. That budget assumes encapsulated per-instance
  styles. Ours are global stylesheets by design (`ViewEncapsulation.None`), so a
  6 kB table stylesheet is one shared file, not a per-use cost.
- `initial` 500 kB → 900 kB warning, error 1.2 MB. Raised twice, and the second
  time because the prediction in this file came true: the multi-select crossed
  the old 700 kB line. Transfer size is the number worth watching and it is
  145 kB. Two primitive-backed components (date picker, multi-select) account
  for most of the growth.

## Form controls

All six planned controls are built, plus a date picker. The order is below.

### The binding contract is already settled

Angular 21 ships Signal Forms at `@angular/forms/signals` (`form()`, `schema()`,
`apply()`, plus `required` / `min` / `pattern` / `validateAsync` validators). The
part that matters for us is how a custom component joins in — and it is not
`ControlValueAccessor`. The contracts are plain signals:

```ts
interface FormValueControl<TValue>  { readonly value:   ModelSignal<TValue> }
interface FormCheckboxControl       { readonly checked: ModelSignal<boolean> }
```

That is it. Our existing `Checkbox` already satisfies `FormCheckboxControl`,
because it exposes `readonly checked = model(false)` — no adapter, no
`NG_VALUE_ACCESSOR` provider, nothing to add.

**So: build every control with `model()` and the Signal Forms integration is
free.** No CVA-versus-signals decision to make.

Two caveats, both real:

- `@angular/forms/signals` is `@experimental` as of 21.2 — a weaker guarantee than
  `@developerPreview`. Shaping the *components* to the contract costs nothing and
  is the right bet, but keep `form()` / `schema()` out of application code until it
  stabilizes.
- If interop with existing `ReactiveFormsModule` code is needed, add
  `ControlValueAccessor` as a thin second adapter per control, never as the primary
  API. `@angular/forms/signals/compat` (`compatForm`, `SignalFormControl`) bridges
  the other direction.

### Build order

1. ~~**`Search`**~~ — done. It deleted the only cheat in the repo:
   `demo/services-table.scss` no longer styles its own filter input.
2. ~~**`Input`**~~ (text / number / password) — done. Label, helper text,
   `invalid` + `invalidText`, `warn` + `warnText`, sizes sm/md/lg, Carbon's fluid
   variant. Everything after this copies its state machinery, which now lives in
   `src/styles/_field.scss` rather than in the component.
3. ~~**`Select`**~~ — done. A native `<select>` with the arrow drawn over it, and
   options projected rather than configured, which is what keeps `<optgroup>` and
   disabled options working for free.
4. ~~**`Textarea`**~~ — done, plus the optional character counter.
5. ~~**`RadioGroup` + `Radio`**~~ — done. Native radios inside a `<fieldset>`;
   the group owns the `name` and the legend, and the browser owns almost
   everything else.
6. ~~**`Toggle`**~~ — done. A `<button role="switch">`, two sizes.

All six are built, and so is the date picker. Next: **combobox** — see
"Also not built" below.

### The date picker, and the one third-party dependency

`ng-primitives` (Apache-2.0) supplies the calendar: the month grid, roving
focus, and the arrow / Home / End / PageUp / PageDown keys. We supply the
markup, the class names and every pixel. Same split as `Tabs` has with
`@angular/aria`, different vendor — and the same containment rule, which matters
more here because ng-primitives is pre-1.0 and ships minors fast: **the import
lives in `ui/date-picker/` and nowhere else.**

Three decisions worth knowing:

- **The popover is CDK Overlay, not the primitive's.** ng-primitives peers on
  `@floating-ui/dom`; we already use the CDK for `Modal`, and taking theirs would
  put a second positioning engine in the bundle. Verified: `@floating-ui` does
  not appear in the production bundle at all.
- **Close on scroll, not reposition.** The CDK's default keeps the panel glued to
  the field, which sounds right and looks wrong — scroll the field off the top
  and the calendar rides up with it, clipped and floating over other content.
- **The default format is ISO, not a locale format.** `formatDate` and
  `parseDate` are a *pair*: whatever the field shows has to be something it can
  read back. `03/04` is two different days depending on the reader. Override both
  or neither.

The calendar is a fixed 288px because the grid is 7 × 40px + 2 × 4px of padding.
It does not stretch to the field, and widening the padding would break the grid.

### The two decisions, settled

The rule is that Carbon decides. Both answers below come from Carbon rather than
from taste, and both hold for the whole app rather than per form.

**When does the invalid state appear?** An earlier draft of this file claimed
Carbon specifies the look and says nothing about the timing. That was wrong —
the forms pattern is explicit, and it is what we do:

- Validate **on blur**, as soon as the field loses focus.
- **Clear the error the moment the value becomes valid**, without waiting for
  another blur.
- **Validate before submission**, which covers fields nobody ever touched.

All three fall out of one expression, and `app.ts` has the reference version:

```ts
readonly emailInvalid = computed(
  () => (this.emailTouched() || this.submitted()) && !this.emailValid(),
);
```

Note what is *not* in it: any code to reset `emailTouched` when the value turns
good. Clearing is automatic, because `!emailValid()` going false is enough — which
is exactly why correcting a bad value updates as you type. The nuance the earlier
draft got backwards: "never while typing" applies to *raising* an error, not to
clearing one.

The control has no part in this. `invalid` is a plain input on `ds-input`, the way
it is a plain prop in Carbon React, and `(blurred)` is the hook the policy hangs
off — a control cannot see a submit it is not part of.

**Server-side errors get an inline notification as well.** Carbon is explicit:
"use an inline notification as well as inline error messaging wherever possible".
The two are not alternatives. The field says *which* input is wrong; the
notification says the submission failed at all, which is the part a user who has
scrolled past the field cannot otherwise see. Put it at the top of the form, and
keep the per-field errors.

**The submit button has its own rules, and they split by form length:**

- **Short forms** that only find out on the server: disable the primary action
  until the form's requirements are met.
- **Long forms:** do *not*. The error and the button may not be on screen at the
  same time, and a button that is disabled for a reason you cannot see is
  indistinguishable from one that is broken.
- **Always** disable on submit, to stop a second one going out.

**Does the label belong to the control or to a wrapper?** To the control:
`<ds-input label="…" helperText="…">`. This is Carbon's own API shape
(`labelText` / `helperText` / `invalidText` all live on the component), and it
keeps every field one element deep instead of two. The cost is that each control
repeats the markup, and it is paid in Sass: `src/styles/_field.scss` holds the
label, helper, requirement and field-surface mixins, mirroring the way Carbon
factors the same three into `components/form/_form.scss`. There is no
`ds-form-field`, and there should not be one.

### Where we deviate from Carbon, and why

Carbon decides by default. These four are the places it does not, each one a
deliberate call rather than an oversight:

**A textarea reserves a gutter for its status icon.** Carbon reserves none — the
first line of text runs underneath the warning triangle. An icon that hides the
value it is complaining about is worse than a field 40px narrower.

**The fluid ring is on the host, not on the field wrapper.** Same rectangle,
reached differently. Carbon nests the message *inside* the wrapper so the wrapper
can carry the ring — its fluid selectors are descendant selectors
(`__wrapper[data-invalid] .cds--form-requirement`) where the non-fluid ones are
siblings. Putting the ring on the host gets the identical box out of one template
instead of two.

**Native `<option>` colors use `$layer-01`, not `$layer-hover`.** Carbon's value
is vestigial; the comment next to it says it exists so options show in IE11, and
it makes every resting row look hovered. macOS ignores option colors entirely, so
this only shows on Windows and Linux — where the point is that a dark theme should
not open a white list.

**`invalid` with no `invalidText` keeps the helper text.** Carbon renders an empty
message box and hides the helper. Neither explains the error, so we keep the one
that at least still explains the field.

**The range picker is one field, not two.** Carbon renders a range as two
separate fields. This is one, holding `2026-08-13 – 2026-08-15`, by request. The
trade is real and paid in the parser: a single field has to read its own
separator back, so `rangeSeparator` is part of the format/parse contract. The
parser accepts an en dash, an em dash, a spaced hyphen or the word "to" — all of
them requiring surrounding whitespace, which is what stops them colliding with
the hyphens inside an ISO date. `2026-08-13-2026-08-15` has no unambiguous split
point and is rejected rather than guessed at.

**The expandable search opens instantly, not on a transition.** Known, and the
reason is worth writing down. The field takes the row's leftover space through
`flex-grow`, and `flex` does not animate. The width-based version that *would*
animate does not size: with `flex-basis: auto` and no grow, a flex row's free
space goes to the auto margin rather than to the item, so the field stays 32px
however wide you declare it — `width: 600px !important` rendered 32px; adding
`flex-grow` rendered 686px. Animating it properly means right-anchoring the
field inside a permanently full-width host so its own width can be transitioned,
which is a markup change rather than a CSS one.

**The expandable search drops its clear button's fill.** Carbon does the same
inside a toolbar (`--toolbar-search-container-active .cds--search-close:hover`):
the expanded field spans a row of its own, and a grey square appearing inside it
reads as a separate control. The standalone search keeps the fill.

**Pagination draws its divider, rather than bordering it.** Carbon uses a real
`border-inline-start`, which under `box-sizing: border-box` eats 1px out of the
40px button and pushes the chevron off-centre. A pseudo-element does not.

**The grid is generated, not included.** `@include grid.css-grid()` would emit
the whole thing in one line, but it brings `.cds--css-grid` and
`.cds--col-span-4` with it, and app templates are the one place this repo has
been strict: markup and class names are ours. Every number comes from Carbon's
`$grid-breakpoints` and `$grid-gutter`, so the geometry is theirs even though
the selectors are not. Aspect ratios use the native `aspect-ratio` property
rather than Carbon's padding-top trick, which predates browser support.

**The shell's colour is a theme zone, not a token.** Carbon's header is
`$background` like everything else — it looks black in every Carbon screenshot
because the shell is wrapped in a g100 zone. Ours uses the `ds-theme-inverse`
class that already existed, so a light shell is one class away.

**The week starts on Monday.** Carbon inherits Sunday from flatpickr's US
locale. That is a locale default rather than a design decision, so ours is ISO
8601 and `firstDayOfWeek` is one input away either way.

### Three bugs the fluid variant hid

Worth knowing about, because all three looked fine in a screenshot and only turned
up when the boxes were measured:

- A ring on the field *and* the host drew two nested rectangles. The inner one's
  top edge reads as a stray rule under the inset label. The invalid selector
  outranked the fluid reset; it now carries an explicit `:not(--fluid)`.
- `display: block` on a fluid textarea's wrapper let the field's 32px top margin
  collapse out of it, dragging the wrapper's top edge below the label. Flex
  column, which does not collapse margins, instead.
- An opaque field background **clips its own host's inset outline** in Chrome: the
  ring survives top and bottom and vanishes down both sides, because a form
  control paints over an ancestor's outline. In fluid the host owns the fill, so
  the field is now transparent.

## Also not built

- ~~**Date picker.**~~ Built. The notes below are kept because they are the
  reasoning behind the dependency, not a plan. The plan was `ng-primitives` (`ng-primitives/date-picker`),
  Apache-2.0, headless, and the peer range is `@angular/core ^21 || ^22` — ours
  exactly. It exposes `NgpDatePicker` / `NgpDateRangePicker` plus grid, row and
  cell directives, a pluggable date adapter, and the WAI-ARIA keyboard pattern;
  we supply markup and class names, which is the same deal we have with
  `@angular/aria` for `Tabs`. Two things to know going in. It peers on
  `@floating-ui/dom`, a second positioning engine next to the CDK Overlay we
  already use — take only the calendar grid and keep the popover on CDK, so
  floating-ui stays unused and tree-shakes. And **Carbon's calendar CSS is not
  reusable**: `_date-picker.scss` (264 lines) styles the input, but the calendar
  is `_flatpickr.scss` (556 lines) written against flatpickr's DOM, because
  Carbon does not build its own date picker either. That port is the real cost,
  and it is the same for any non-flatpickr option. `ng-primitives` is pre-1.0
  (0.128.x, fast minors), so the same containment rule applies as for
  `@angular/aria`: the import lives in `date-picker/` and nowhere else.
  *An earlier version of this file said no good headless option existed. That is
  no longer true.*
- ~~**Combobox / MultiSelect.**~~ Built as `ds-multi-select`, with the
  select-all row and an optional filter (which is Carbon's combo box shape).
  Select-all applies to the *filtered* rows and nothing else — the part
  implementations usually get wrong.
- ~~**Notification.**~~ Built, in two of Carbon's four variants: `InlineNotification`
  waits in the flow, `ToastNotification` arrives over it, and `NotificationService`
  owns the stack, the placement and the optional timeout. Carbon's other two are
  deliberately not in it. **Actionable** is not "a notification with a button" —
  it grabs and traps focus until the user acts, which makes it an `alertdialog`
  and a different component; building the button without the trap would look
  right and behave wrong. **Callout** is the inverse case: it loads with the page,
  never dismisses, and has no `aria-live` at all, so it shares the styling and
  none of the behavior.
- ~~**UI Shell.**~~ Built, and composed rather than configured — every piece is
  a separate element, so an app with no side nav simply does not write one. See
  ui/README.md for the two things that had to differ from Carbon's own markup.
- ~~**The grid system.**~~ Built on our own class names rather than by including
  Carbon's — see the deviations below.

### Narrower than Carbon on purpose

Audited against Carbon's own MCP server on 2026-08-22, component by component.
Most of what it found has since been built; what follows is what was left out
*deliberately*, written down for the reason the audit existed — so the next
person can tell a decision from an oversight.

| | why not |
|---|---|
| `Notification` — `info-square`, `warning-alt` | Alternate icon treatments, not statuses. Carbon documents four statuses and we have four. |
| `Notification` — Actionable, Callout | Actionable traps focus and is an `alertdialog`; Callout loads with the page and has no live region. Both are different components wearing the same paint. On the queue below. |
| `Tabs` — `dismissable` | Carbon puts a close button *inside* the tab. Aria owns the keyboard here, and a second focusable control inside a roving-focus item needs its own answer for how it is reached. Worth doing properly or not at all. |
| `Modal` — `danger`, `passiveModal` | Neither has any CSS in `@carbon/styles`; both are React markup switches. Our footer is projected, so they are `kind="danger"` and "do not write a footer". |
| `Search`, `MultiSelect` | Carbon splits each into two components (`ExpandableSearch`, `FilterableMultiSelect`). One component with a flag here — a composition choice, not a missing feature. |
| `Button` — `isExpressive`, `badgeCount` | Not needed yet, and `badgeCount` wants the notification badge that does not exist. |
| `Tabs`, `Table` — vertical tabs, column resize/reorder | Real gaps rather than decisions. Below. |

Names that differ from Carbon's, all for a stated reason, none of them silent:
`heading` for `title` (a static `title` leaves a native tooltip), `status` for
`kind`, `showCounter`/`maxLength` for `enableCounter`/`maxCount`,
`offLabel`/`onLabel` for `labelA`/`labelB`, and `total: number | null` for
`totalItems` + `pagesUnknown`.

### What is left, in the order worth building it

19 of Carbon's ~48 components exist. The forms are nearly complete; the system
around them is not, and the gap that bites first is not a form control.

**Build these before any remaining input.** Four of the five turn up on the first
real screen anyone writes:

| | why it comes first |
|---|---|
| `Loading` / `InlineLoading` | a spinner beside every async call |
| `Link` | a styled `<a>`; small, and used everywhere |
| `Tooltip` | `Toggletip` and `Popover` share its mechanics, so one job opens three |
| `Breadcrumb` | sits above the page title in Carbon's own shell reference |
| `Tile` | Carbon's card |
| `OverflowMenu` | row actions in the table, already listed as a table gap below |

**The remaining form controls**, none of them urgent: `NumberInput` (the one
with steppers — our `type="number"` is a passthrough and says so), `Slider`,
`FileUploader`, `TimePicker`, `ContentSwitcher`, and Carbon's non-filterable
`Dropdown` (a styled listbox, where `ds-select` is the native one). `TimePicker`
and `Slider` may never be needed.

**The two notification variants left**, both behavioral rather than visual:
`ActionableNotification` (focus trap, `role="alertdialog"`) and `Callout` (loads
with the page, never dismisses, no live region). See the note above.

**Everything else**, roughly by how often it comes up: `Accordion`,
`ProgressIndicator`, `ProgressBar`, `PageHeader`, `Menu` / `MenuButton` /
`ComboButton`, `CopyButton`, `CodeSnippet`, `StructuredList`, `ContainedList`,
`List`, `TreeView`, `PaginationNav`.

- **Table extras:** column resize/reorder, row overflow menu, CSV export, and
  virtual scroll for very large pages (`@angular/cdk/scrolling`).

## Picking this up cold

Read `USAGE.md` if you are going to build with it, and `src/app/ui/README.md` if
you are going to add to it — the latter has the conventions plus the four
non-obvious things about the table that were each a bug before they were a rule.
Then `npm start` and open the demo page; it exercises every component in all four
themes.

### On a different machine

```bash
git clone https://github.com/4lokyn/carbon-ds.git
cd carbon-ds && npm install && npm start
```

The branch is `main`. It started as `master` and was renamed, so a clone made
before that will be on the wrong branch.

### Checking the responsive shell

There is still no test for it, and there should not be a fake one: the hamburger
below `lg`, the header nav from `lg` up, and the side nav collapsing to an
overlay are all media queries, and jsdom does not evaluate those. A unit test
here would assert nothing while looking like it asserted something.

It is checked by hand instead, and the way to do it is to **narrow a real window
past 1056px** (`lg` is 66rem) and walk the four states:

1. the hamburger appears and the header nav disappears,
2. the side nav collapses to nothing and the content runs full width,
3. the hamburger swings the nav out *over* the content, with a scrim behind it,
4. clicking the scrim closes it again.

Verified that way on 2026-08-22, all four. Above `lg`, measured: header nav
shown, hamburger hidden, side nav 256px, content inset by the same 256px.

**Do not try to fake the viewport.** Driving this from an injected iframe
produced confident, wrong numbers — the nav reporting 0px wide while a
screenshot of the same moment showed it open. Resize the window.

## Version notes

Built on **Angular 21**, not 22, because Angular 22's CLI requires Node
`^22.22.3 || ^24.15.0 || >=26` and this machine has 24.11.0. Bump Node, then
`ng update` — nothing here depends on 21-specific behavior.

`@angular/aria` is marked `@developerPreview`. Its API can shift between minors.
Exposure is confined to `src/app/ui/tabs/tabs.ts`.
