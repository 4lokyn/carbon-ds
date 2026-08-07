import { Component, inject, ViewEncapsulation } from '@angular/core';
import { Tab, TabList, TabPanel, Tabs } from '@angular/aria/tabs';

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
  selector: '[dsTabs]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  styleUrl: './tabs.scss',
  hostDirectives: [Tabs],
  host: { class: 'ds-tabs' },
})
export class DsTabs {}

@Component({
  selector: '[dsTabList]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  hostDirectives: [
    {
      directive: TabList,
      inputs: [
        'selectedTab',
        'orientation',
        'wrap',
        'selectionMode',
        'focusMode',
        'disabled',
      ],
      outputs: ['selectedTabChange'],
    },
  ],
  host: { class: 'ds-tab-list' },
})
export class DsTabList {}

@Component({
  selector: '[dsTab]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  hostDirectives: [{ directive: Tab, inputs: ['value', 'disabled'] }],
  host: {
    class: 'ds-tab',
    // Read straight off Aria's signals — it already knows what is selected, so
    // we never keep a second copy of that state.
    '[class.ds-tab--selected]': 'tab.selected()',
    '[class.ds-tab--disabled]': 'tab.disabled()',
  },
})
export class DsTab {
  protected readonly tab = inject(Tab);
}

@Component({
  selector: '[dsTabPanel]',
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  hostDirectives: [{ directive: TabPanel, inputs: ['value'] }],
  host: {
    class: 'ds-tab-panel',
    '[class.ds-tab-panel--hidden]': '!panel.visible()',
  },
})
export class DsTabPanel {
  protected readonly panel = inject(TabPanel);
}

/** Import this in a consumer instead of the four classes one by one. */
export const DS_TABS = [DsTabs, DsTabList, DsTab, DsTabPanel] as const;
