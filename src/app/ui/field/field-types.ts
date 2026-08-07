/**
 * Types shared by every form control.
 *
 * There is no `Field` component to hang these on, and there deliberately never
 * will be — the label belongs to the control rather than to a wrapper (see the
 * root README). This folder is the TypeScript half of that decision; the Sass
 * half is `src/styles/_field.scss`.
 */

/**
 * Carbon field heights: 32 / 40 / 48 px, `md` by default.
 *
 * Narrower than `ButtonSize`, and not by oversight — Carbon has a 64px button
 * but no 64px field. A `xl` field is the fluid variant, which is a different
 * layout rather than a taller one, so it is a flag and not a size.
 */
export type FieldSize = 'sm' | 'md' | 'lg';
