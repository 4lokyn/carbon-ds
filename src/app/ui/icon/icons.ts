/**
 * Carbon icon path data, extracted verbatim from `@carbon/icons` on the 32×32 grid.
 *
 * We inline the handful we need rather than depending on `@carbon/icons-angular`:
 * that package ships one Angular component per icon and is large, and pulling it
 * in would put Carbon Angular code back in the build.
 *
 * `@carbon/icons` stays a devDependency purely as the provenance of these strings.
 * To add one:
 *
 *     cat node_modules/@carbon/icons/svg/32/<name>.svg
 *
 * and copy the `d` attributes in order. Icons with several paths are an array of
 * more than one entry — all of them render with `fill: currentColor`.
 */
export const ICON_PATHS = {
  'arrow-up': ['M16 4 6 14 7.41 15.41 15 7.83 15 28 17 28 17 7.83 24.59 15.41 26 14 16 4z'],
  'arrow-down': [
    'M24.59 16.59 17 24.17 17 4 15 4 15 24.17 7.41 16.59 6 18 16 28 26 18 24.59 16.59z',
  ],
  'arrows-vertical': [
    'M27.6 20.6 24 24.2 24 4 22 4 22 24.2 18.4 20.6 17 22 23 28 29 22z',
    'M9 4 3 10 4.4 11.4 8 7.8 8 28 10 28 10 7.8 13.6 11.4 15 10z',
  ],
  calendar: [
    'M26,4h-4V2h-2v2h-8V2h-2v2H6C4.9,4,4,4.9,4,6v20c0,1.1,0.9,2,2,2h20c1.1,0,2-0.9,2-2V6C28,4.9,27.1,4,26,4z M26,26H6V12h20V26z M26,10H6V6h4v2h2V6h8v2h2V6h4V10z',
  ],
  'chevron-right': ['M22 16 12 26 10.6 24.6 19.2 16 10.6 7.4 12 6z'],
  /** The 3x3 app switcher, which is what Carbon's shell puts in the last slot. */
  switcher: [
    'M14 4H18V8H14z',
    'M4 4H8V8H4z',
    'M24 4H28V8H24z',
    'M14 14H18V18H14z',
    'M4 14H8V18H4z',
    'M24 14H28V18H24z',
    'M14 24H18V28H14z',
    'M4 24H8V28H4z',
    'M24 24H28V28H24z',
  ],

  /**
   * Converted, not copied. `overflow-menu--vertical.svg` draws three
   * `<circle>` elements and our Icon renders `<path>` only — so each dot is the
   * same circle written as two arcs. Geometry is identical: r=2 at x=16, y=8/16/24.
   */
  'overflow-menu': [
    'M14,8a2,2 0 1,0 4,0a2,2 0 1,0 -4,0',
    'M14,16a2,2 0 1,0 4,0a2,2 0 1,0 -4,0',
    'M14,24a2,2 0 1,0 4,0a2,2 0 1,0 -4,0',
  ],
  menu: ['M4 6H28V8H4z', 'M4 24H28V26H4z', 'M4 12H28V14H4z', 'M4 18H28V20H4z'],
  'chevron-left': ['M10 16 20 6 21.4 7.4 12.8 16 21.4 24.6 20 26z'],
  'chevron-down': ['M16 22 6 12 7.4 10.6 16 19.2 24.6 10.6 26 12z'],
  close: [
    'M17.4141 16 24 9.4141 22.5859 8 16 14.5859 9.4143 8 8 9.4141 14.5859 16 8 22.5859 9.4143 24 16 17.4141 22.5859 24 24 22.5859 17.4141 16z',
  ],
  'trash-can': [
    'M12 12H14V24H12z',
    'M18 12H20V24H18z',
    'M4,6V8H6V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V8h2V6ZM8,28V8H24V28Z',
    'M12 2H20V4H12z',
  ],
  search: [
    'M29,27.5859l-7.5521-7.5521a11.0177,11.0177,0,1,0-1.4141,1.4141L27.5859,29ZM4,13a9,9,0,1,1,9,9A9.01,9.01,0,0,1,4,13Z',
  ],
  /**
   * The three remaining notification statuses. Each ships two paths and each
   * keeps only the second, for the same reason `warning-filled` below does: the
   * first is Carbon's `inner-path`, shipped `fill="none"`, and our `Icon` fills
   * every path with `currentColor`. The glyph is already knocked out of the
   * outer path by winding — the X in `error`, the tick in `checkmark`, the `i`
   * in `information` are all subpaths of the circle they sit in.
   */
  'error-filled': [
    'M16,2A13.914,13.914,0,0,0,2,16,13.914,13.914,0,0,0,16,30,13.914,13.914,0,0,0,30,16,13.914,13.914,0,0,0,16,2Zm5.4449,21L9,10.5557,10.5557,9,23,21.4448Z',
  ],
  /** The bare tick, for a chosen row. The filled one is a status, not a choice. */
  checkmark: ['M13 24 4 15 5.414 13.586 13 21.171 26.586 7.586 28 9 13 24z'],

  'checkmark-filled': [
    'M16,2A14,14,0,1,0,30,16,14,14,0,0,0,16,2ZM14,21.5908l-5-5L10.5906,15,14,18.4092,21.41,11l1.5957,1.5859Z',
  ],
  'information-filled': [
    'M16,2A14,14,0,1,0,30,16,14,14,0,0,0,16,2Zm0,6a1.5,1.5,0,1,1-1.5,1.5A1.5,1.5,0,0,1,16,8Zm4,16.125H12v-2.25h2.875v-5.75H13v-2.25h4.125v8H20Z',
  ],

  /**
   * The invalid state. One path, not the two `warning--filled.svg` ships: the
   * second is Carbon's `inner-path`, a duplicate of the bar and the dot that
   * renders at `opacity: 0` unless you want a solid exclamation instead of a
   * knocked-out one. Our `Icon` fills every path with `currentColor`, so
   * including it would plug the hole and leave a blank circle. The knockout
   * survives on its own because the bar and dot wind opposite to the circle.
   */
  'warning-filled': [
    'M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14C30,8.3,23.7,2,16,2z M14.9,8h2.2v11h-2.2V8z M16,25c-0.8,0-1.5-0.7-1.5-1.5S15.2,22,16,22c0.8,0,1.5,0.7,1.5,1.5S16.8,25,16,25z',
  ],

  /**
   * The warning state, and the one icon here that is NOT single-color — so it is
   * the one exception to the rule in this file's header.
   *
   * Carbon draws a `$support-warning` triangle with a black exclamation, and
   * black is right in every theme because `$support-warning` is the same yellow
   * in every theme. The first path is that exclamation (Carbon marks it
   * `data-icon-path="inner-path"` and ships it `fill="none"`); whoever renders
   * this icon has to recolor `path:first-of-type`, exactly as Carbon's own CSS
   * does. `input.scss` is the only caller and does. Left as `currentColor` it
   * fills solid and the exclamation disappears.
   */
  'warning-alt-filled': [
    'M16,26a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,16,26Zm-1.125-5h2.25V12h-2.25Z',
    'M16.002,6.1714h-.004L4.6487,27.9966,4.6506,28H27.3494l.0019-.0034ZM14.875,12h2.25v9h-2.25ZM16,26a1.5,1.5,0,1,1,1.5-1.5A1.5,1.5,0,0,1,16,26Z',
    'M29,30H3a1,1,0,0,1-.8872-1.4614l13-25a1,1,0,0,1,1.7744,0l13,25A1,1,0,0,1,29,30ZM4.6507,28H27.3493l.002-.0033L16.002,6.1714h-.004L4.6487,27.9967Z',
  ],

  /**
   * The same glyph as `warning-filled`, with the inner path kept rather than
   * dropped — so the exclamation is a shape that can be painted instead of a
   * hole. Carbon's own icon ships that path at `opacity: 0` and turns it on in
   * exactly one place: the notification, where the circle is yellow and the
   * exclamation has to be black rather than showing the surface behind it.
   *
   * The exclamation is first, matching `warning-alt-filled`, because the rule
   * that recolors it is positional — `path:first-of-type`. Two icons now depend
   * on that order and a test pins it.
   */
  'warning-filled-solid': [
    'M17.5,23.5c0,0.8-0.7,1.5-1.5,1.5c-0.8,0-1.5-0.7-1.5-1.5S15.2,22,16,22 C16.8,22,17.5,22.7,17.5,23.5z M17.1,8h-2.2v11h2.2V8z',
    'M16,2C8.3,2,2,8.3,2,16s6.3,14,14,14s14-6.3,14-14C30,8.3,23.7,2,16,2z M14.9,8h2.2v11h-2.2V8z M16,25c-0.8,0-1.5-0.7-1.5-1.5S15.2,22,16,22c0.8,0,1.5,0.7,1.5,1.5S16.8,25,16,25z',
  ],

  view: [
    'M30.94,15.66A16.69,16.69,0,0,0,16,5,16.69,16.69,0,0,0,1.06,15.66a1,1,0,0,0,0,.68A16.69,16.69,0,0,0,16,27,16.69,16.69,0,0,0,30.94,16.34,1,1,0,0,0,30.94,15.66ZM16,25c-5.3,0-10.9-3.93-12.93-9C5.1,10.93,10.7,7,16,7s10.9,3.93,12.93,9C26.9,21.07,21.3,25,16,25Z',
    'M16,10a6,6,0,1,0,6,6A6,6,0,0,0,16,10Zm0,10a4,4,0,1,1,4-4A4,4,0,0,1,16,20Z',
  ],

  'view-off': [
    'M5.24,22.51l1.43-1.42A14.06,14.06,0,0,1,3.07,16C5.1,10.93,10.7,7,16,7a12.38,12.38,0,0,1,4,.72l1.55-1.56A14.72,14.72,0,0,0,16,5,16.69,16.69,0,0,0,1.06,15.66a1,1,0,0,0,0,.68A16,16,0,0,0,5.24,22.51Z',
    'M12,15.73a4,4,0,0,1,3.7-3.7l1.81-1.82a6,6,0,0,0-7.33,7.33Z',
    'M30.94,15.66A16.4,16.4,0,0,0,25.2,8.22L30,3.41,28.59,2,2,28.59,3.41,30l5.1-5.1A15.29,15.29,0,0,0,16,27,16.69,16.69,0,0,0,30.94,16.34,1,1,0,0,0,30.94,15.66ZM20,16a4,4,0,0,1-6,3.44L19.44,14A4,4,0,0,1,20,16Zm-4,9a13.05,13.05,0,0,1-6-1.58l2.54-2.54a6,6,0,0,0,8.35-8.35l2.87-2.87A14.54,14.54,0,0,1,28.93,16C26.9,21.07,21.3,25,16,25Z',
  ],

  /**
   * Two paths, both kept: the outline of the front sheet and the corner of the
   * one behind it. Neither is a knockout — they are two shapes, and the icon is
   * only legible as a copy when both are drawn.
   */
  copy: [
    'M28,10V28H10V10H28m0-2H10a2,2,0,0,0-2,2V28a2,2,0,0,0,2,2H28a2,2,0,0,0,2-2V10a2,2,0,0,0-2-2Z',
    'M4,18H2V4A2,2,0,0,1,4,2H18V4H4Z',
  ],

  /**
   * The radio tile's two states. Unlike `checkmark-filled`, which is one glyph
   * recoloured, these are two drawings: an empty ring and a ring with a disc in
   * it. That is what a radio looks like everywhere, and it is legible without
   * colour — which matters, because the difference between chosen and not is the
   * only thing this icon is for.
   *
   * `radio-button--checked` ships two paths and keeps both: the inner disc is a
   * solid circle rather than one of Carbon's `inner-path` knockouts, so filling
   * it with `currentColor` is exactly right.
   */
  'radio-button': [
    'M16,2A14,14,0,1,0,30,16,14,14,0,0,0,16,2Zm0,26A12,12,0,1,1,28,16,12,12,0,0,1,16,28Z',
  ],
  'radio-button-checked': [
    'M16,2A14,14,0,1,0,30,16,14,14,0,0,0,16,2Zm0,26A12,12,0,1,1,28,16,12,12,0,0,1,16,28Z',
    'M16,10a6,6,0,1,0,6,6A6,6,0,0,0,16,10Z',
  ],

  settings: [
    'M27,16.76c0-.25,0-.5,0-.76s0-.51,0-.77l1.92-1.68A2,2,0,0,0,29.3,11L26.94,7a2,2,0,0,0-1.73-1,2,2,0,0,0-.64.1l-2.43.82a11.35,11.35,0,0,0-1.31-.75l-.51-2.52a2,2,0,0,0-2-1.61H13.64a2,2,0,0,0-2,1.61l-.51,2.52a11.48,11.48,0,0,0-1.32.75L7.43,6.06A2,2,0,0,0,6.79,6,2,2,0,0,0,5.06,7L2.7,11a2,2,0,0,0,.41,2.51L5,15.24c0,.25,0,.5,0,.76s0,.51,0,.77L3.11,18.45A2,2,0,0,0,2.7,21L5.06,25a2,2,0,0,0,1.73,1,2,2,0,0,0,.64-.1l2.43-.82a11.35,11.35,0,0,0,1.31.75l.51,2.52a2,2,0,0,0,2,1.61h4.72a2,2,0,0,0,2-1.61l.51-2.52a11.48,11.48,0,0,0,1.32-.75l2.42.82a2,2,0,0,0,.64.1,2,2,0,0,0,1.73-1L29.3,21a2,2,0,0,0-.41-2.51ZM25.21,24l-3.43-1.16a8.86,8.86,0,0,1-2.71,1.57L18.36,28H13.64l-.71-3.55a9.36,9.36,0,0,1-2.7-1.57L6.79,24,4.43,20l2.72-2.4a8.9,8.9,0,0,1,0-3.13L4.43,12,6.79,8l3.43,1.16a8.86,8.86,0,0,1,2.71-1.57L13.64,4h4.72l.71,3.55a9.36,9.36,0,0,1,2.7,1.57L25.21,8,27.57,12l-2.72,2.4a8.9,8.9,0,0,1,0,3.13L27.57,20Z',
    'M16,22a6,6,0,1,1,6-6A5.94,5.94,0,0,1,16,22Zm0-10a3.91,3.91,0,0,0-4,4,3.91,3.91,0,0,0,4,4,3.91,3.91,0,0,0,4-4A3.91,3.91,0,0,0,16,12Z',
  ],
} as const;

export type IconName = keyof typeof ICON_PATHS;
