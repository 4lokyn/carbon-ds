import { Component, computed, inject, signal } from '@angular/core';
import {
  Button,
  type ButtonKind,
  type ButtonSize,
  DS_TABS,
  type FieldSize,
  Input,
  ModalService,
  MultiSelect,
  type MultiSelectOption,
  DatePicker,
  DateRangePicker,
  DS_RADIO_GROUP,
  DS_SHELL,
  Search,
  Select,
  Tag,
  type TagColor,
  Textarea,
  ThemeService,
  Toggle,
} from './ui';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConfirmModal, type ConfirmResult } from './demo/confirm-modal';
import { ServicesTable } from './demo/services-table';

const INITIAL_TAGS: readonly TagColor[] = ['blue', 'green', 'red', 'purple'];

@Component({
  selector: 'app-root',
  imports: [
    Button,
    DatePicker,
    DateRangePicker,
    Input,
    MultiSelect,
    Search,
    Select,
    Tag,
    Textarea,
    Toggle,
    ServicesTable,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ...DS_RADIO_GROUP,
    ...DS_SHELL,
    ...DS_TABS,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly theme = inject(ThemeService);
  private readonly modal = inject(ModalService);

  protected readonly kinds: readonly ButtonKind[] = [
    'primary',
    'secondary',
    'tertiary',
    'ghost',
    'danger',
  ];

  protected readonly sizes: readonly ButtonSize[] = ['sm', 'md', 'lg', 'xl'];

  protected readonly colors: readonly TagColor[] = [
    'gray',
    'cool-gray',
    'warm-gray',
    'red',
    'magenta',
    'purple',
    'blue',
    'cyan',
    'teal',
    'green',
  ];

  protected readonly routedNav = [
    { path: '/tokens', label: 'Tokens' },
    { path: '/patterns', label: 'Patterns' },
    { path: '/guidelines', label: 'Guidelines' },
  ];

  protected readonly formControls = [
    'Input',
    'Select',
    'Textarea',
    'Date picker',
    'Multi-select',
  ];

  protected readonly formsOpen = signal(true);
  protected readonly shellPanel = signal<string | null>(null);
  protected readonly panelOpen = signal(false);

  protected readonly fieldSizes: readonly FieldSize[] = ['sm', 'md', 'lg'];

  protected readonly selectedTab = signal('behavior');
  protected readonly modalResult = signal<string | null>(null);
  protected readonly removable = signal<readonly TagColor[]>(INITIAL_TAGS);

  protected readonly searchValue = signal('');
  protected readonly clusterName = signal('');
  protected readonly replicas = signal('3');
  protected readonly region = signal('eu-west');
  protected readonly tier = signal('staging');
  protected readonly description = signal('');
  protected readonly notes = signal('');

  protected readonly strategy = signal('rolling');
  protected readonly logLevel = signal('info');

  protected readonly autoScaling = signal(true);
  protected readonly publicEndpoint = signal(false);
  protected readonly smallToggle = signal(true);
  protected readonly terseToggle = signal(false);
  protected readonly customToggle = signal(true);

  protected readonly namespaceOptions: readonly MultiSelectOption<string>[] = [
    { value: 'edge', label: 'edge' },
    { value: 'identity', label: 'identity' },
    { value: 'payments', label: 'payments' },
    { value: 'commerce', label: 'commerce' },
    { value: 'observability', label: 'observability' },
    { value: 'legacy', label: 'legacy (read-only)', disabled: true },
  ];

  protected readonly ownerOptions: readonly MultiSelectOption<string>[] = [
    { value: 'platform', label: 'platform' },
    { value: 'identity', label: 'identity' },
    { value: 'payments', label: 'payments' },
    { value: 'commerce', label: 'commerce' },
    { value: 'growth', label: 'growth' },
    { value: 'data', label: 'data' },
    { value: 'media', label: 'media' },
  ];

  protected readonly regionOptions: readonly MultiSelectOption<string>[] = [
    { value: 'eu-central', label: 'eu-central' },
    { value: 'eu-west', label: 'eu-west' },
    { value: 'us-east', label: 'us-east' },
  ];

  protected readonly namespaces = signal<string[]>(['edge']);
  protected readonly owners = signal<string[]>([]);

  protected readonly rangeStart = signal<Date | null>(null);
  protected readonly rangeEnd = signal<Date | null>(null);

  protected readonly rangeSummary = computed(() => {
    const from = this.rangeStart();
    const to = this.rangeEnd();

    if (!from) {
      return 'nothing';
    }

    return to ? `${from.toDateString()} to ${to.toDateString()}` : `${from.toDateString()} to …`;
  });

  protected readonly startDate = signal<Date | null>(null);
  protected readonly cutoff = signal<Date | null>(null);
  protected readonly localeDate = signal<Date | null>(null);

  // Stable references, not inline expressions — a new Date identity on every
  // change detection pass would make the picker think its bounds moved.
  protected readonly monthStart = new Date(2026, 7, 1);
  protected readonly monthEnd = new Date(2026, 7, 31);

  protected readonly noWeekends = (date: Date): boolean => {
    const day = date.getDay();

    return day === 0 || day === 6;
  };

  // The pair that has to be overridden together: dd.mm.yyyy. in, dd.mm.yyyy. out.
  protected readonly formatLocale = (date: Date): string =>
    `${`${date.getDate()}`.padStart(2, '0')}.${`${date.getMonth() + 1}`.padStart(2, '0')}.${date.getFullYear()}.`;

  protected readonly parseLocale = (text: string): Date | null => {
    const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/.exec(text.trim());

    if (!match) {
      return null;
    }

    const [, day, month, year] = match.map(Number);
    const date = new Date(year, month - 1, day);

    return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  };

  // ── Carbon's validation timing, in one place ──────────────────────────────
  //
  // Carbon specifies when the invalid state appears, not only what it looks
  // like: on blur, on submit for fields nobody touched, and it clears again the
  // moment the value becomes valid. All three fall out of this one expression.
  //
  // Note what is NOT here: any reset of `emailTouched` when the value turns
  // good. It is unnecessary — `!emailValid()` going false clears the error on
  // its own, which is why correcting a bad address updates as you type instead
  // of waiting for another blur.
  protected readonly email = signal('');
  protected readonly emailTouched = signal(false);
  protected readonly submitted = signal(false);

  private readonly emailValid = computed(() =>
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email().trim()),
  );

  protected readonly emailInvalid = computed(
    () => (this.emailTouched() || this.submitted()) && !this.emailValid(),
  );

  protected openConfirm(): void {
    this.modal
      .open<ConfirmResult>(ConfirmModal)
      .closed.subscribe((result) => this.modalResult.set(result ?? 'dismissed'));
  }

  protected remove(color: TagColor): void {
    this.removable.update((tags) => tags.filter((tag) => tag !== color));
  }

  protected resetTags(): void {
    this.removable.set(INITIAL_TAGS);
  }

  protected submitForm(): void {
    this.submitted.set(true);
  }

  protected resetForm(): void {
    this.email.set('');
    this.emailTouched.set(false);
    this.submitted.set(false);
  }
}
