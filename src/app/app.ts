import { Component, computed, inject, signal } from '@angular/core';
import {
  Button,
  type ButtonKind,
  type ButtonSize,
  DS_BREADCRUMB,
  DS_OVERFLOW_MENU,
  DS_CHECKBOX,
  DS_TABS,
  type FieldSize,
  InlineLoading,
  type InlineLoadingStatus,
  InlineNotification,
  Input,
  Link,
  Loading,
  ModalService,
  MultiSelect,
  type MultiSelectOption,
  NotificationService,
  type NotificationStatus,
  TOAST_TIMEOUT,
  DatePicker,
  DateRangePicker,
  DS_RADIO_GROUP,
  DS_SHELL,
  Search,
  Select,
  DS_TAG,
  type TagColor,
  Textarea,
  DS_TOGGLETIP_PARTS,
  Tooltip,
  type CarbonTheme,
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
    InlineLoading,
    InlineNotification,
    Input,
    Link,
    Loading,
    MultiSelect,
    Search,
    Select,
    Textarea,
    ...DS_TOGGLETIP_PARTS,
    Tooltip,
    ...DS_TAG,
    Toggle,
    ServicesTable,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ...DS_BREADCRUMB,
    ...DS_OVERFLOW_MENU,
    ...DS_CHECKBOX,
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
  private readonly notifications = inject(NotificationService);

  protected readonly kinds: readonly ButtonKind[] = [
    'primary',
    'secondary',
    'tertiary',
    'ghost',
    'danger',
    'danger-tertiary',
    'danger-ghost',
  ];

  protected readonly sizes: readonly ButtonSize[] = [
    'xs',
    'sm',
    'md',
    'lg',
    'xl',
    '2xl',
  ];

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

  protected readonly gridCells = [1, 2, 3, 4];

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

  /** Which content the one right-hand panel is showing, or `null` for closed. */
  protected readonly shellPanel = signal<'switcher' | 'settings' | null>(null);

  protected togglePanel(which: 'switcher' | 'settings'): void {
    this.shellPanel.update((open) => (open === which ? null : which));
  }

  // Token names are not labels. `g10` says nothing to anyone who has not read
  // Carbon's theme docs, which is everyone using the product.
  protected readonly themeOptions: readonly {
    value: CarbonTheme;
    label: string;
  }[] = [
    { value: 'white', label: 'White' },
    { value: 'g10', label: 'Gray 10' },
    { value: 'g90', label: 'Gray 90' },
    { value: 'g100', label: 'Gray 100' },
  ];

  protected readonly fieldSizes: readonly FieldSize[] = ['sm', 'md', 'lg'];

  protected readonly selectedTab = signal('behavior');
  protected readonly containedTab = signal('stage');
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

  protected readonly lastAction = signal('');

  protected readonly filterFailing = signal(true);
  protected readonly filterRecent = signal(false);

  protected readonly deployStatus = signal<InlineLoadingStatus | null>(null);
  protected readonly deploying = computed(() => this.deployStatus() === 'active');

  protected readonly deployText = computed(() =>
    this.deployStatus() === 'finished' ? 'Deployed to eu-west' : 'Deploying…',
  );

  protected deploy(): void {
    this.deployStatus.set('active');

    // Stands in for the request. The point of the demo is the transition, which
    // is the part a spinner alone cannot show.
    setTimeout(() => this.deployStatus.set('finished'), 1500);
  }

  protected readonly regions: readonly string[] = [
    'us-south',
    'eu-de',
    'jp-tok',
  ];

  protected readonly selectedRegions = signal<readonly string[]>([]);

  protected isRegionOn(region: string): boolean {
    return this.selectedRegions().includes(region);
  }

  protected toggleRegion(region: string): void {
    this.selectedRegions.update((current) =>
      current.includes(region)
        ? current.filter((r) => r !== region)
        : [...current, region],
    );
  }

  protected readonly notifyDeploys = signal(true);
  protected readonly notifyIncidents = signal(false);
  protected readonly notifyDigest = signal(false);

  // The set is the control here, so the rule is about the set: none ticked is
  // the invalid state, and no single box can know that on its own.
  protected readonly notifyInvalid = computed(
    () =>
      !this.notifyDeploys() && !this.notifyIncidents() && !this.notifyDigest(),
  );

  protected readonly accepted = signal(false);
  protected readonly termsSubmitted = signal(false);

  protected resetTerms(): void {
    this.accepted.set(false);
    this.termsSubmitted.set(false);
  }

  protected readonly notificationStatuses: readonly NotificationStatus[] = [
    'error',
    'success',
    'warning',
    'info',
  ];

  protected readonly notificationLowContrast = signal(false);

  // Written the way Carbon asks for: the title says what happened with no full
  // stop, the body says what to do about it and does not repeat the title.
  protected readonly notificationCopy: Record<
    NotificationStatus,
    { heading: string; subtitle: string }
  > = {
    error: {
      heading: 'Deployment failed',
      subtitle: 'The cluster rejected the manifest. Check the image tag and retry.',
    },
    success: {
      heading: 'Cluster created',
      subtitle: 'carbon-prod-01 is ready and accepting traffic.',
    },
    warning: {
      heading: 'Quota almost reached',
      subtitle: 'You have used 92% of this account’s vCPU allowance.',
    },
    info: {
      heading: 'Maintenance scheduled',
      subtitle: 'This region is read-only on Sunday between 02:00 and 04:00 UTC.',
    },
  };

  protected openToast(status: NotificationStatus): void {
    this.notifications.show({
      status,
      lowContrast: this.notificationLowContrast(),
      ...this.notificationCopy[status],
    });
  }

  protected openTimedToast(): void {
    this.notifications.show({
      status: 'success',
      lowContrast: this.notificationLowContrast(),
      heading: 'Saved',
      subtitle: 'Gone in five seconds, which is Carbon’s number for a timed toast.',
      timeout: TOAST_TIMEOUT,
    });
  }

  protected openConfirm(): void {
    this.modal
      // A one-line confirmation is what Carbon's smallest width is for.
      .open<ConfirmResult>(ConfirmModal, { size: 'xs' })
      .closed.subscribe((result) => this.modalResult.set(result ?? 'dismissed'));
  }

  protected remove(color: TagColor): void {
    this.removable.update((tags) => tags.filter((tag) => tag !== color));
  }

  protected resetTags(): void {
    this.removable.set(INITIAL_TAGS);
  }

  // Stands in for a server that rejects the second attempt, so the demo can show
  // the pairing Carbon asks for: the field's own error, and an inline
  // notification saying the submission itself failed.
  protected readonly submitFailed = signal(false);
  private attempts = 0;

  protected submitForm(): void {
    this.submitted.set(true);

    if (this.emailInvalid()) {
      return;
    }

    this.attempts += 1;
    this.submitFailed.set(this.attempts > 1);
  }

  protected resetForm(): void {
    this.email.set('');
    this.emailTouched.set(false);
    this.submitted.set(false);
    this.submitFailed.set(false);
    this.attempts = 0;
  }
}
