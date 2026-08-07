import { Routes } from '@angular/router';
import { DemoRoutePage } from './demo/demo-route-page';

/**
 * Three routes that render the same placeholder. They exist so the shell's
 * active-route highlighting is driven by a real URL rather than by a hand-set
 * flag — see the side nav in `app.html`.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tokens' },
  { path: 'tokens', component: DemoRoutePage, title: 'Tokens' },
  { path: 'patterns', component: DemoRoutePage, title: 'Patterns' },
  { path: 'guidelines', component: DemoRoutePage, title: 'Guidelines' },
];
