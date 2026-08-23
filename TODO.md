# After the components

The component queue lives in `README.md`. This is the other backlog: platform,
naming and packaging work that is not a component and does not belong in that
list.

Recorded 2026-08-22. Each item carries what it actually costs and what it
depends on, because two of them get several times more expensive the longer they
wait and one of them may be the wrong idea.

## Do these before building more components

Mechanical, touches every file, and gets worse with every component added. The
prefix rename that used to head this list is done — see below for what it
actually cost against what this file predicted.

### ~~4. Rename the `ds-` prefix to `nine-am-`~~ — done 2026-08-23

Kept here because the estimate is worth checking against the outcome. This file
predicted 581 occurrences in stylesheets and 1015 across templates and
TypeScript, measured on 2026-08-22. By the time it was done, two days and six
components later, it was **2003 `ds-`, 197 `dsCamel` and 56 `DS_` — 2285
replacements across 121 files.** The warning that it doubles if you wait was, if
anything, mild.

**Two escapes, not one, and the second is the instructive one.** The first was
`expect(tag.tagName).toBe('DS-TAG')` — uppercase because `tagName` is — and a
spec caught it within the hour, which is what this file predicted.

The second took a day and a user's question to surface: **64 occurrences of
`Ds` with a capital D and a lowercase s** — `DsColumn`, `DsSort`, `DsTab`,
`DsTabs`, `DsTabList`, `DsTabPanel`. The rules covered `ds-`, `dsCamel`, `DS_`
and `DS-` and simply had no case for that one.

Nothing was ever going to catch it. A type renamed consistently still compiles,
the tests still pass, stylelint has no opinion about TypeScript identifiers, and
the app renders exactly as before. It was only visible by reading the public API,
which is what the user did. The lesson for the next sweep of this kind is to
enumerate the case variants *first* — `foo-`, `fooBar`, `FooBar`, `FOO_`, `FOO-`,
bare `foo` — and grep each one to zero, rather than writing the rules that seem
obvious and trusting the build to find the rest.

What it did not mention, and what actually needed care: the replacement has to
be anchored on a word boundary. A bare `ds-` → `nine-am-` also rewrites Carbon's
own `--cds-*` custom properties and words like `fields--single`, and neither
would have failed loudly. The Sass facade needed three separate passes — the
file name, the `@use 'ds'` in thirty stylesheets, and prose naming "the `ds`
facade" — because none of those match a `ds-` pattern at all.

The package name went with it, later the same day: `package.json`, the Angular
project name in `angular.json` and the lockfile all read `carbon-nine-am`. The
repository, the remote and the local directory are still `carbon-ds` — those are
not in the repo's own files and have to be renamed on GitHub and on disk.

### 5. Add `.component.*` to filenames

**Check this against Angular's current style guide before doing it.** Angular's
own guidance moved *away* from type suffixes in v20 — `button.ts` rather than
`button.component.ts` — which is why the files are named the way they are now.
If the goal is familiarity for developers arriving from older Angular, that is a
real reason; if the goal is "the Angular convention", the convention changed.
Either way it is a decision rather than a cleanup.

## Blocked

### 1. Angular 22

**Blocked on Node, narrowly.** Angular 22's CLI requires
`^22.22.3 || ^24.15.0 || >=26.0.0`; this machine has **v22.16.0**. That is six
patch versions short — a small bump, not a major upgrade.

Nothing here depends on Angular 21 behaviour, so after the Node bump this should
be `ng update` and a test run. `@angular/aria` is the one thing to watch: it is
`@developerPreview` and its API can shift between minors. Exposure is confined
to `ui/tabs/tabs.ts`.

## Decisions, not tasks

### 6. Extract what we use from Carbon into local Sass

This one changes what the project *is*, so it deserves a real decision rather
than a ticket. The README's opening claim is that the design language comes from
`@carbon/styles` as Sass and that the only Carbon artifact in the build is
compiled CSS. Extracting the tokens locally ends that: we would own the values,
and a Carbon release would stop reaching us.

Arguments for: no dependency, no surprise changes, and the ability to diverge
deliberately. Arguments against: the audit on 2026-08-22 found three places where
values written from memory were wrong, and every one of them was caught by
reading `@carbon/styles`. Losing that reference makes the same mistake cheaper to
make and harder to catch.

If it happens, the facade at `src/styles/_ds.scss` is the seam — it already
exists so that "where tokens come from" is one file rather than forty. That was
built for exactly this.

### 7. A library project (`nine-am-design-system`)

**Depends on 5.** The prefix is settled — item 4 is done, every class, selector
and token reads `nine-am-`, and the package is `carbon-nine-am`. The file layout
is not settled, so that half still comes first or gets done twice. The published
name is a separate question again: `carbon-nine-am` describes where the design
language comes from, and a library on npm may want to say what it is instead.

Also needs decisions this repo has not had to make: what is public API versus
internal, whether the Sass facade ships or consumers bring their own Carbon, and
what happens to the demo app — it is currently the test bed and the
documentation, and a library has no obvious place for it.

## Features

### 2. Does the table's paginator match a real backend?

Half-answered already. `nine-am-pagination` now takes `total: number | null` plus
`isLastPage`, which covers a cursor-paged API that cannot count. `nine-am-table` has
`serverSide` so it stops re-sorting the one page it can see, and `sort` is a
two-way model.

What has never been tried end to end: wiring `page` / `pageSize` / `sort` to an
actual request and back. The pieces are shaped for it; nobody has proven the
shape. Worth doing against a real or mocked endpoint, and worth writing down what
the request contract looks like — Spring's `page,size,sort=field,dir` is the
common one and is not what our signals are named.

### 3. A configurable form builder

Careful here: it argues with two positions the repo holds deliberately.

- **Validation timing is the form's job, not the control's.** A builder that
  owns validation has to own that policy too, and the README documents it as one
  rule for the whole app.
- **There is no `nine-am-form-field` wrapper**, on purpose — the label belongs to the
  control, which is Carbon's own API shape.

A schema-driven builder can respect both, but only if it generates the controls
and leaves the timing to the form it renders into. Worth writing the intended
API by hand first, as one worked example, before building anything that
generates it.

### 8. A getting-started guide

`USAGE.md` is most of this already — importing, the one form-validation rule, a
worked example per area. What it lacks is the first fifteen minutes: install,
theme, a first screen, and the three mistakes people make. Best written by
watching someone actually do it.

### 9. Is the Carbon grid set up correctly?

Measured once, at 1915px: 16 tracks, `span 4` renders 220px, `span 8` 440px,
`span 16` 880px, 16px padding per column — half the 32px gutter, applied as
padding rather than `gap` so a column's background can run edge to edge.

So: yes, at that width. Never checked at `sm` or `md`, where the column count
drops to 4 and 8. That is the same hole the shell had until it was checked in a
narrowed window, and it is worth closing the same way.

### 10. Editable table cells

The largest feature on this list. Needs an editing mode per cell, keyboard entry
and escape, validation per column, and a decision about whether a change commits
on blur or on an explicit save — which is the same question the forms pattern
already answers for fields, and should be answered the same way.

Carbon has no editable-cell component; Carbon for IBM Products does. Check what
it specifies before designing one, the way `OverflowMenu` should be checked
before the table's row actions.