# After the components

The component queue lives in `README.md`. This is the other backlog: platform,
naming and packaging work that is not a component and does not belong in that
list.

Recorded 2026-08-22. Each item carries what it actually costs and what it
depends on, because two of them get several times more expensive the longer they
wait and one of them may be the wrong idea.

## Do these before building more components

Both are mechanical, both touch every file, and both get worse with every
component added. There are 22 components now and ~26 still to build — doing
these at the end means doing them at roughly twice the size.

### 4. Rename the `ds-` prefix to `nine-am-`

**Measured cost today:** 581 occurrences across the stylesheets, 1015 across
templates and TypeScript, 24 component folders. Plus the stylelint rule in
`.stylelintrc.json` that enforces the prefix, the `ds` Sass facade name, and
every test that asserts a class name.

Mostly a careful find-and-replace, but not entirely: `ds-` also appears inside
words in comments and prose, and `dsButton`-style attribute selectors need the
camel-case form (`nineAmButton`). The class-name assertions in specs are what
will catch a miss.

Worth deciding the exact spelling first — `nine-am-button` and `nineAmButton` are
both a little awkward to type a hundred times. `na-` / `naButton` is shorter but
collides with nothing readable.

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

**Depends on 4 and 5.** Publishing under a name means committing to the prefix
and the file layout, so do those first or do them twice.

Also needs decisions this repo has not had to make: what is public API versus
internal, whether the Sass facade ships or consumers bring their own Carbon, and
what happens to the demo app — it is currently the test bed and the
documentation, and a library has no obvious place for it.

## Features

### 2. Does the table's paginator match a real backend?

Half-answered already. `ds-pagination` now takes `total: number | null` plus
`isLastPage`, which covers a cursor-paged API that cannot count. `ds-table` has
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
- **There is no `ds-form-field` wrapper**, on purpose — the label belongs to the
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