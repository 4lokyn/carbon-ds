import {
  computed,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  signal,
} from '@angular/core';

/**
 * Carbon's four official themes. white/g10 are light, g90/g100 are dark.
 * Most applications ship one light and one dark — g10 and g100 is the usual pair.
 */
export type CarbonTheme = 'white' | 'g10' | 'g90' | 'g100';

const STORAGE_KEY = 'nine-am-theme';
const DEFAULT_THEME: CarbonTheme = 'g10';
const THEMES: readonly CarbonTheme[] = ['white', 'g10', 'g90', 'g100'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<CarbonTheme>(this.readStored());

  readonly theme = this.current.asReadonly();
  readonly available = THEMES;
  readonly isDark = computed(
    () => this.current() === 'g90' || this.current() === 'g100',
  );

  constructor() {
    effect(() => {
      const theme = this.current();

      // Nothing recompiles and no stylesheet reloads. Flipping data-theme changes
      // which block of --cds-* custom properties wins, and the tree repaints.
      // See src/styles/_themes.scss.
      this.document.documentElement.dataset['theme'] = theme;
      this.persist(theme);
    });
  }

  set(theme: CarbonTheme): void {
    this.current.set(theme);
  }

  /** Light <-> dark across the pair we ship. */
  toggle(): void {
    this.current.set(this.isDark() ? 'g10' : 'g100');
  }

  private readStored(): CarbonTheme {
    // localStorage throws in Safari private mode and is absent under SSR.
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return THEMES.includes(stored as CarbonTheme)
        ? (stored as CarbonTheme)
        : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  }

  private persist(theme: CarbonTheme): void {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Not worth surfacing — the theme still applies for this session.
    }
  }
}
