import {
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { Tab, TabList, TabPanel, Tabs } from '@angular/aria/tabs';

/** Carbon's two tab styles. See `variant` on `NineAmTabs`. */
export type TabsVariant = 'line' | 'contained';

/** 32 / 40 / 48px. `line` defaults to md, `contained` to lg. */
export type TabsSize = 'sm' | 'md' | 'lg';

/**
 * Carbon-styled tabs on top of @angular/aria.
 *
 * The split we're proving with this component:
 *   - @angular/aria owns behavior — roving tabindex, arrow/Home/End keys,
 *     aria-selected, aria-controls, the `inert` attribute on hidden panels.
 *   - we own markup and looks.
 *
 * Each wrapper attaches the matching Aria directive via `hostDirectives` and
 * re-exposes only the inputs we want in our public API. Aria communicates
 * parent-to-child through ancestor injection and an explicit register call, not
 * through content queries — which is exactly why wrapping it like this works.
 *
 * NOTE: Aria is @developerPreview as of v21. The API can still shift between
 * minors. It is contained to these four classes on purpose.
 */
@Component({
  selector: '[nineAmTabs]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  styleUrl: './tabs.scss',
  hostDirectives: [Tabs],
  host: { '[class]': 'hostClass()' },
})
export class NineAmTabs {
  /**
   * `line` — labels with a rule under the selected one. The default, and right
   * for tabs that switch a view inside a page.
   *
   * `contained` — filled boxes sharing a strip, where the selected tab is the
   * one that matches the panel behind it. Reads as a stronger division, which
   * suits tabs that switch what the page *is* rather than what it shows.
   */
  readonly variant = input<TabsVariant>('line');

  /**
   * Height. Left unset it follows the variant — md for line, lg for contained,
   * which is Carbon's pairing and not an arbitrary default: a contained tab is
   * a filled box, and 40px of fill reads cramped where 40px of label does not.
   */
  readonly size = input<TabsSize>();

  /**
   * Every tab takes an equal share of the width instead of sizing to its label.
   * Only sensible with a handful of tabs; Carbon pairs it with `contained`.
   */
  readonly fullWidth = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() => {
    const variant = this.variant();
    const classes = ['nine-am-tabs', `nine-am-tabs--${variant}`];

    classes.push(`nine-am-tabs--${this.size() ?? (variant === 'contained' ? 'lg' : 'md')}`);

    if (this.fullWidth()) {
      classes.push('nine-am-tabs--full-width');
    }

    return classes.join(' ');
  });
}

@Component({
  selector: '[nineAmTabList]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  hostDirectives: [
    {
      directive: TabList,
      inputs: ['selectedTab', 'orientation', 'wrap', 'selectionMode', 'focusMode', 'disabled'],
      outputs: ['selectedTabChange'],
    },
  ],
  host: { class: 'nine-am-tab-list' },
})
export class NineAmTabList {}

@Component({
  selector: '[nineAmTab]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  hostDirectives: [{ directive: Tab, inputs: ['value', 'disabled'] }],
  host: {
    class: 'nine-am-tab',
    // Read straight off Aria's signals — it already knows what is selected, so
    // we never keep a second copy of that state.
    '[class.nine-am-tab--selected]': 'tab.selected()',
    '[class.nine-am-tab--disabled]': 'tab.disabled()',
  },
})
export class NineAmTab {
  protected readonly tab = inject(Tab);
}

@Component({
  selector: '[nineAmTabPanel]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  hostDirectives: [{ directive: TabPanel, inputs: ['value'] }],
  host: {
    class: 'nine-am-tab-panel',
    '[class.nine-am-tab-panel--hidden]': '!panel.visible()',
  },
})
export class NineAmTabPanel {
  protected readonly panel = inject(TabPanel);
}

/** Import this in a consumer instead of the four classes one by one. */
export const NINE_AM_TABS = [NineAmTabs, NineAmTabList, NineAmTab, NineAmTabPanel] as const;
