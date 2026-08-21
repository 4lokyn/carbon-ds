# ui — the design system layer

Carbon supplies the design language. We supply the components.

## What comes from where

| Concern | Source |
|---|---|
| Colors, type scale, spacing, themes | `@carbon/styles` (Sass only — no Carbon JS/Angular code) |
| Keyboard navigation, ARIA patterns | `@angular/aria` |
| The calendar grid, and only that | `ng-primitives` — see the containment note below |
| Overlays, focus trap, portals, virtual scroll | `@angular/cdk` |
| Icon path data | `@carbon/icons`, a devDependency — paths are inlined in `icon/icons.ts` |
| Markup, class names, component API | us |

There is no `carbon-components-angular` dependency. That is the point: if IBM's
Angular library stalls, or its API changes under us, nothing here breaks.

## Conventions

**Never import `@carbon/*` from a component.** Component styles start with
`@use 'ds' as *;`. `src/styles/_ds.scss` is the single facade over Carbon, so
swapping the token source touches one file rather than forty.

**`ViewEncapsulation.None` everywhere, with a `ds-` prefix on every class.** The
class names are part of the public API — consumers need to be able to override
them, and multi-element components (tabs, table, modal) would otherwise duplicate
the same CSS once per child component in the bundle. The prefix is what keeps this
safe; do not add an unprefixed class.

`npm run lint:styles` enforces that rather than leaving it to whoever remembers
this file. The one legitimate exception is a class the CDK owns — we style
`.cdk-dialog-container` and `.cdk-overlay-backdrop`, and neither is ours to
rename — so each of those three sites carries its own
`stylelint-disable-next-line` with a reason. Keep them per-site: the bug that
prompted the rule was an *unscoped* `.cdk-dialog-container`, which a blanket
`cdk-` allowance would have waved straight through.

The demo (`app.scss`, `demo/`) is deliberately outside the lint globs. It is
application code and its classes are `demo-` / `services-`.

**A component that owns real markup keeps its template in a `.html` file.** Every
form control, plus `pagination` and `table`, is `templateUrl`. `shell`, `tabs`,
`button`, `icon`, `tag`, `checkbox`, `modal` and the two table headers stay
inline. The test is not a line count, it is whether the file holds one component
with a template or a family of small pieces: `shell.ts` is sixteen components and
eight of their templates are `<ng-content />`, so extracting there would be
sixteen files carrying one line each.

The form controls go as a group rather than by size, because they are meant to
read as variations of one thing — `input` at 60 lines does not need its own file
on merit, but `input` having one while `textarea` does not is the kind of seam
that makes people wonder what the difference is.

Two things that are *not* the reason, both checked rather than assumed: Prettier
formats an inline Angular template exactly as it formats a file, and the language
service works in both. The build inlines every template regardless — the bundle
is byte-identical before and after. What the split actually buys is a diff that
shows markup changes as markup, and a control whose three files line up with
every other control's.

The extracted files are a verbatim move — dedented, never reformatted. Prettier's
`angular` parser at `printWidth: 100` would reflow markup that was written to fit
inside a decorator's indentation, which is also why `table.html` does not pass
`prettier --check` today. Leave that alone unless you are reformatting every
template deliberately, in one commit.

**Wrap headless primitives with `hostDirectives`, don't reimplement them.** See
`tabs/tabs.ts`. The primitive owns behavior and exposes signals; we bind classes
off those signals and never keep a second copy of the state.

**Attribute selectors on native elements where a native element already works.**
`button[dsButton]`, not `<ds-button>`. Free form submission, `disabled`, and
`type="submit"` semantics.

**Check what the platform already does before reaching for a primitive.**
`RadioGroup` is the clearest case: radios sharing a `name` get single selection,
arrow-key navigation and a group that is *one* tab stop, all from the browser,
and a `<fieldset>` cascades `disabled` to every control inside while its
`<legend>` names the group. None of that is code we wrote, and `@angular/aria`
has no radio primitive because none is needed. The corollary is that native
behaviour has sharp edges worth knowing: a radio has no `readonly`, and by the
time `change` fires the browser has already moved the selection — see
`radio.ts` for where that has to be intercepted instead.

**Form controls expose their value as a `model()`, never a `ControlValueAccessor`.**
That signal *is* the Signal Forms contract — `FormValueControl<T>` requires
`value: ModelSignal<T>` and `FormCheckboxControl` requires
`checked: ModelSignal<boolean>`, and nothing else. `Checkbox` already satisfies the
second one without a line of adapter code, and `Search` and `Input` satisfy the
first. Add CVA only where interop with existing `ReactiveFormsModule` code demands
it, and then as a thin second adapter.

**Validation timing is the form's job, not the control's.** `invalid` is a plain
input. A control cannot see a submit it is not part of, so it cannot implement
"validate on blur, and on submit for untouched fields" — it only exposes
`(blurred)` and lets the form decide. The rule itself is in the root README.

**Icon-only controls take a label input.** `dismissLabel`, `closeLabel`,
`selectRowLabel`, `clearLabel`, `showPasswordLabel` — always an input, never a
hardcoded English string, so i18n has somewhere to go. Anything that pluralizes
takes a *function*, because a design system cannot know that Serbian needs three
plural forms where English needs two.

**Shared control chrome is a Sass mixin, never a wrapper component.** The label
belongs to the control, so there is nothing to hang shared markup on. Label,
helper text, the requirement line, the field surface and the 32/40/48 height scale
all live in `src/styles/_field.scss` and are reached through the `ds` facade like
anything else. Carbon factors the same pieces into `components/form/_form.scss`;
this mirrors it. A `ds-form-field` was considered and rejected — see the root
README.

## The shell

Composed, not configured. `ds-shell` holds the one piece of state its parts have
to agree on — whether the side nav is open — and every other piece is a separate
element the caller writes or omits. `dsShellAction` takes any icon and any
handler, so the right-hand cluster is whatever the app needs.

Two things could not follow Carbon's own markup, and both are worth knowing
before editing them.

**The nav is `role="list"` on divs, not `<ul>`/`<li>`.** HTML closes an `<li>`
as soon as another one opens, so a group containing items — which is exactly
what a nested side nav is — cannot be written as nested `<li>` in an Angular
template. Carbon gets away with it in JSX, where no HTML parser is involved; the
Angular template parser reparents them. Explicit roles give the same semantics
with no implied end tags. A test pins this.

**`ds-shell-content` is an element, not an attribute.** It was
`main[dsShellContent]` first and that was wrong: the offsets are margins, the
app puts its own layout class on the same element, and a `margin: 0 auto` there
silently wiped both — the content slid under the header and ignored the side
nav. Owning the element means nothing else can write to it.

The shell no longer needs a note here about focus. It used to be the one place
using `:focus` while everything else used `:focus-visible`; the whole system now
uses `:focus`, which is what Carbon does. See `focus-ring-state` in
`styles/_mixins.scss`.

## The toolbar above a table

Three pieces, and two of them are not table code at all.

`ds-table-header` is the title and description. Its own component, as in Carbon:
a table can have a heading with no toolbar, or a toolbar with no heading.

**Icon-only buttons are a `Button` variant, not a toolbar feature.** `iconOnly`
drops the `0 63px 0 15px` padding — the Carbon silhouette, which reserves the
icon slot beside a label — and squares the button off. Without it a lone icon
renders in a 100px box against the left edge. The declaration has to sit *after*
the kinds in `button.scss`: `ghost` sets its own `padding-right` at the same
specificity, so an earlier rule loses.

**Expandable search is a `Search` variant.** Collapsed it is a 40px magnifier
*button*, not a shrunken field — a square with no affordance is not something
anyone clicks. It sizes with `flex`, never `width: 100%`, so opening it takes the
row's free space instead of pushing the actions out; give the toolbar's children
`flex-shrink: 0` or a button label will wrap. It opens leftward, which is an auto
left margin while collapsed and no margin while open — auto margins absorb free
space before flex-grow sees it, so leaving one on gives the field nothing to
grow into.

## The table

`ds-table` is column-config driven rather than template driven — a text column is
one line. Four things about it are non-obvious and were each a bug first.

**`value` is display, `sortBy` is order.** A column that renders `"3 hours ago"`
or `"42%"` must give a `sortBy`, or it sorts the formatted string and
`"3 minutes ago"` lands before `"3 days ago"`. `sortBy` is also what decides
whether a cell is empty.

**Empty cells sort last in both directions.** A blank cell is missing data, not
the smallest value. This is why direction is baked into the comparator instead of
the caller flipping a symmetric one — and why a custom `compare` cannot express
it, so `compare` is only ever called with pairs where neither side is empty.

**A comparator must never return `NaN`.** `(a.x ?? NaN) - (b.x ?? NaN)` is the
natural way to write a nullable numeric comparator and it makes `Array.sort` emit
arbitrary order for the *whole* array — one bad pair corrupts everything.
`comparatorFor` clamps `NaN` to 0 rather than letting it through. Prefer `sortBy`
and the problem does not arise.

**Pagination lives outside the table.** The caller slices `rows`, so one component
serves a client-side array and a server-paged endpoint with no mode switch. The
consequence: when you paginate, the table only ever sees one page, so sorting has
to happen on the full list first. Use the exported `sortRows()` and put the table
in `serverSide` mode — `demo/services-table.ts` shows the shape.

**Don't combine `zebra` with `selectable`.** In all four Carbon themes
`$layer-accent-01` (the stripe) and `$layer-selected-01` are the *same color*, so
the two states are indistinguishable by background. Selected rows carry a leading
accent bar to keep that legible at all, but the striping is still noise in a table
people are picking rows out of.

## Known gaps

The full list, with a build order, is in the root `README.md`. The short version:
19 of Carbon's ~48 components exist, the forms are nearly complete, and the next
thing worth building is not a form control — it is `Loading`, `Link`, `Tooltip`,
`Breadcrumb` and `Tile`, which is what a real screen reaches for first.

One note belongs here rather than there, because it is about the act of adding
a component rather than about which one to add next:

- **More icons.** Added to `icon/icons.ts` by hand as needed — see the header
  comment there for how to extract one. Two traps, both already hit: Carbon ships
  some icons with an `inner-path` that must be *dropped* (copying it in fills a
  knockout and leaves a blank shape — `warning-filled`), and a couple that are
  genuinely two-tone and need the caller to recolor `path:first-of-type`
  (`warning-alt-filled`). Both are flagged in place, and `input.spec.ts` pins the
  path counts so neither can be "fixed" back.

  One glyph is in there twice, on purpose. `warning-filled` drops its inner path
  and `warning-filled-solid` keeps it, because Carbon knocks that exclamation out
  everywhere except inside a notification, where it is painted black. Same
  drawing, opposite treatment — so it is two entries rather than one entry with a
  flag, and `notification.spec.ts` pins the second one the same way.

## Third-party primitives are contained to one folder each

Two components are built on primitives whose APIs can move, and the containment
rule is the same for both: the import lives in one folder and nowhere else, so a
breaking change is one file rather than a sweep.

| primitive | used by | risk |
|---|---|---|
| `@angular/aria` | `tabs/` | `@developerPreview`, can shift between minors |
| `ng-primitives` | `date-picker/` | pre-1.0 (0.128.x), ships minors fast |

`ng-primitives` also peers on `@floating-ui/dom`. We do not use its popover — the
CDK Overlay already positions `Modal` — so floating-ui stays unimported and
tree-shakes out. Verified: it does not appear in the production bundle. Reaching
for an ng-primitives overlay anywhere would pull a second positioning engine in.

## Angular Aria is developer preview

`@angular/aria` is marked `@developerPreview` as of v21. The API can shift between
minor versions. Exposure is contained to `tabs/tabs.ts` — a breaking change means
editing that file, not every call site.

`@angular/aria/grid` (`ngGrid`, roving cell focus, range selection) is deliberately
*not* used by `ds-table`. Carbon data tables are tables, not grids: users tab
through the controls rather than arrowing between cells. Reach for `ngGrid` if an
editable, spreadsheet-style grid ever comes up.
