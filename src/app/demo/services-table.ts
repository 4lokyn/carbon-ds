import {
  Component,
  computed,
  signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  Button,
  type NineAmColumn,
  type NineAmSort,
  Icon,
  Pagination,
  Search,
  sortRows,
  Table,
  TableHeader,
  TableToolbar,
  Tag,
  type TagColor,
} from '../ui';

type ServiceStatus = 'running' | 'degraded' | 'stopped';

interface Service {
  readonly id: string;
  readonly name: string;
  readonly namespace: string;
  readonly status: ServiceStatus;
  readonly replicas: number;
  /** Nullable on purpose — a stopped service reports no CPU, and the sort has to
   *  put those last in both directions rather than treating null as zero. */
  readonly cpu: number | null;
  readonly updatedAt: string;
  readonly image: string;
  readonly owner: string;
}

const NOW = Date.now();
const minutesAgo = (minutes: number): string => new Date(NOW - minutes * 60_000).toISOString();

const SERVICES: readonly Service[] = [
  {
    id: 'svc-01',
    name: 'api-gateway',
    namespace: 'edge',
    status: 'running',
    replicas: 6,
    cpu: 42,
    updatedAt: minutesAgo(8),
    image: 'ghcr.io/acme/gateway:2.14.1',
    owner: 'platform',
  },
  {
    id: 'svc-02',
    name: 'auth-service',
    namespace: 'identity',
    status: 'running',
    replicas: 4,
    cpu: 18,
    updatedAt: minutesAgo(35),
    image: 'ghcr.io/acme/auth:5.2.0',
    owner: 'identity',
  },
  {
    id: 'svc-03',
    name: 'billing-worker',
    namespace: 'payments',
    status: 'degraded',
    replicas: 2,
    cpu: 91,
    updatedAt: minutesAgo(3),
    image: 'ghcr.io/acme/billing:1.8.7',
    owner: 'payments',
  },
  {
    id: 'svc-04',
    name: 'catalog-api',
    namespace: 'commerce',
    status: 'running',
    replicas: 8,
    cpu: 55,
    updatedAt: minutesAgo(120),
    image: 'ghcr.io/acme/catalog:4.0.3',
    owner: 'commerce',
  },
  {
    id: 'svc-05',
    name: 'cdn-purge',
    namespace: 'edge',
    status: 'stopped',
    replicas: 0,
    cpu: null,
    updatedAt: minutesAgo(2880),
    image: 'ghcr.io/acme/purge:0.9.2',
    owner: 'platform',
  },
  {
    id: 'svc-06',
    name: 'email-dispatch',
    namespace: 'comms',
    status: 'running',
    replicas: 3,
    cpu: 12,
    updatedAt: minutesAgo(48),
    image: 'ghcr.io/acme/email:3.1.0',
    owner: 'growth',
  },
  {
    id: 'svc-07',
    name: 'event-bus',
    namespace: 'core',
    status: 'running',
    replicas: 5,
    cpu: 67,
    updatedAt: minutesAgo(15),
    image: 'ghcr.io/acme/bus:7.4.1',
    owner: 'platform',
  },
  {
    id: 'svc-08',
    name: 'export-runner',
    namespace: 'reporting',
    status: 'degraded',
    replicas: 1,
    cpu: 88,
    updatedAt: minutesAgo(6),
    image: 'ghcr.io/acme/export:2.0.0',
    owner: 'data',
  },
  {
    id: 'svc-09',
    name: 'feature-flags',
    namespace: 'core',
    status: 'running',
    replicas: 2,
    cpu: 4,
    updatedAt: minutesAgo(600),
    image: 'ghcr.io/acme/flags:1.2.4',
    owner: 'platform',
  },
  {
    id: 'svc-10',
    name: 'image-resize',
    namespace: 'media',
    status: 'running',
    replicas: 12,
    cpu: 74,
    updatedAt: minutesAgo(22),
    image: 'ghcr.io/acme/resize:6.3.0',
    owner: 'media',
  },
  {
    id: 'svc-11',
    name: 'invoice-pdf',
    namespace: 'payments',
    status: 'stopped',
    replicas: 0,
    cpu: null,
    updatedAt: minutesAgo(4320),
    image: 'ghcr.io/acme/pdf:1.0.9',
    owner: 'payments',
  },
  {
    id: 'svc-12',
    name: 'ledger-sync',
    namespace: 'payments',
    status: 'running',
    replicas: 3,
    cpu: 31,
    updatedAt: minutesAgo(75),
    image: 'ghcr.io/acme/ledger:9.1.2',
    owner: 'payments',
  },
  {
    id: 'svc-13',
    name: 'notification-hub',
    namespace: 'comms',
    status: 'running',
    replicas: 4,
    cpu: 26,
    updatedAt: minutesAgo(11),
    image: 'ghcr.io/acme/notify:4.5.1',
    owner: 'growth',
  },
  {
    id: 'svc-14',
    name: 'oauth-bridge',
    namespace: 'identity',
    status: 'degraded',
    replicas: 2,
    cpu: 79,
    updatedAt: minutesAgo(1),
    image: 'ghcr.io/acme/oauth:2.2.2',
    owner: 'identity',
  },
  {
    id: 'svc-15',
    name: 'order-intake',
    namespace: 'commerce',
    status: 'running',
    replicas: 7,
    cpu: 61,
    updatedAt: minutesAgo(30),
    image: 'ghcr.io/acme/intake:5.0.0',
    owner: 'commerce',
  },
  {
    id: 'svc-16',
    name: 'price-engine',
    namespace: 'commerce',
    status: 'running',
    replicas: 5,
    cpu: 48,
    updatedAt: minutesAgo(180),
    image: 'ghcr.io/acme/pricing:3.7.0',
    owner: 'commerce',
  },
  {
    id: 'svc-17',
    name: 'search-indexer',
    namespace: 'search',
    status: 'running',
    replicas: 6,
    cpu: 83,
    updatedAt: minutesAgo(5),
    image: 'ghcr.io/acme/indexer:8.2.1',
    owner: 'data',
  },
  {
    id: 'svc-18',
    name: 'session-store',
    namespace: 'identity',
    status: 'running',
    replicas: 3,
    cpu: 22,
    updatedAt: minutesAgo(240),
    image: 'ghcr.io/acme/session:2.9.0',
    owner: 'identity',
  },
  {
    id: 'svc-19',
    name: 'sms-relay',
    namespace: 'comms',
    status: 'stopped',
    replicas: 0,
    cpu: null,
    updatedAt: minutesAgo(10080),
    image: 'ghcr.io/acme/sms:0.4.1',
    owner: 'growth',
  },
  {
    id: 'svc-20',
    name: 'telemetry-agent',
    namespace: 'observability',
    status: 'running',
    replicas: 24,
    cpu: 37,
    updatedAt: minutesAgo(18),
    image: 'ghcr.io/acme/telemetry:11.0.2',
    owner: 'platform',
  },
  {
    id: 'svc-21',
    name: 'trace-collector',
    namespace: 'observability',
    status: 'degraded',
    replicas: 4,
    cpu: 94,
    updatedAt: minutesAgo(2),
    image: 'ghcr.io/acme/traces:5.5.5',
    owner: 'platform',
  },
  {
    id: 'svc-22',
    name: 'webhook-fanout',
    namespace: 'edge',
    status: 'running',
    replicas: 9,
    cpu: 58,
    updatedAt: minutesAgo(64),
    image: 'ghcr.io/acme/fanout:1.6.3',
    owner: 'platform',
  },
  {
    id: 'svc-23',
    name: 'zone-resolver',
    namespace: 'edge',
    status: 'running',
    replicas: 2,
    cpu: 9,
    updatedAt: minutesAgo(900),
    image: 'ghcr.io/acme/zones:0.8.0',
    owner: 'platform',
  },
];

// `cool-gray` rather than `gray` for stopped: $tag-background-gray is the exact
// same value as $layer-selected-01 in three of the four themes, so a gray tag
// vanishes the moment its row is selected.
const STATUS_COLORS: Readonly<Record<ServiceStatus, TagColor>> = {
  running: 'green',
  degraded: 'magenta',
  stopped: 'cool-gray',
};

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function formatUpdated(iso: string): string {
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000);

  if (Math.abs(minutes) < 60) {
    return relativeTime.format(minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);

  if (Math.abs(hours) < 24) {
    return relativeTime.format(hours, 'hour');
  }

  return relativeTime.format(Math.round(hours / 24), 'day');
}

/**
 * Realistic exercise of nine-am-table: filter, sort, page, select, expand, all at once.
 *
 * Note the sort/page composition. The table is in `serverSide` mode even though
 * the data is local — because pagination lives outside the table, the table only
 * ever sees one page, so letting it sort would sort just that page. Sorting has to
 * happen on the full list first, which is what the exported `sortRows()` helper is
 * for. Same shape as a real server-paged table, minus the fetch.
 */
@Component({
  selector: 'app-services-table',
  encapsulation: ViewEncapsulation.None,
  imports: [Table, TableHeader, TableToolbar, Pagination, Search, Tag, Button, Icon],
  styleUrl: './services-table.scss',
  template: `
    <!-- The escape hatch: config covers text columns, a template covers markup. -->
    <ng-template #statusCell let-row>
      <nine-am-tag size="sm" [color]="statusColor(row.status)">{{ row.status }}</nine-am-tag>
    </ng-template>

    <ng-template #expandedRow let-row>
      <dl class="services__detail">
        <dt>Image</dt>
        <dd>
          <code>{{ row.image }}</code>
        </dd>
        <dt>Owner</dt>
        <dd>{{ row.owner }}</dd>
        <dt>Namespace</dt>
        <dd>{{ row.namespace }}</dd>
      </dl>
    </ng-template>

    <div class="services">
      <nine-am-table-header
        heading="Services"
        description="Everything running in this cluster. Search, sort and page through it."
      />

      <nine-am-table-toolbar
        [selectedCount]="selected().length"
        [countLabel]="countLabel"
        (cancelled)="selected.set([])"
      >
        <div nineAmToolbarActions class="services__tools">
          <!-- Not [(value)]: narrowing the list has to reset the page too, and a
               two-way bind would leave you on page 4 of 1. -->
          <nine-am-search
            class="services__filter"
            size="sm"
            expandable
            label="Filter services"
            placeholder="Filter by name or namespace"
            [value]="filter()"
            (valueChange)="onFilter($event)"
          />

          <button
            nineAmButton
            kind="ghost"
            size="sm"
            iconOnly
            aria-label="Download as CSV"
            (click)="reload()"
          >
            <nine-am-icon name="arrow-down" />
          </button>

          <button
            nineAmButton
            kind="ghost"
            size="sm"
            iconOnly
            aria-label="Table settings"
            (click)="reload()"
          >
            <nine-am-icon name="settings" />
          </button>

          <button nineAmButton size="sm" (click)="reload()">Add new</button>
        </div>

        <div nineAmBatchActions>
          <button nineAmButton kind="ghost" size="sm" (click)="deleteSelected()">Delete</button>
        </div>
      </nine-am-table-toolbar>

      <!-- No zebra here: this table is selectable, and the stripe and the
           selected background are the same token color in every Carbon theme. -->
      <nine-am-table
        serverSide
        selectable
        foldBelow="md"
        foldTitle="name"
        caption="Services"
        [columns]="columns()"
        [rows]="pageRows()"
        [rowKey]="rowKey"
        [(sort)]="sort"
        [(selection)]="selected"
        [expandedContent]="expandedRow"
        [loading]="loading()"
        [selectRowLabel]="selectRowLabel"
        [expandRowLabel]="expandRowLabel"
      >
        @if (filter()) {
          No services match “{{ filter() }}”.
        } @else {
          Everything here has been deleted.
        }
      </nine-am-table>

      <nine-am-pagination [total]="filtered().length" [(page)]="page" [(pageSize)]="pageSize" />
    </div>
  `,
})
export class ServicesTable {
  private readonly all = signal<readonly Service[]>(SERVICES);

  protected readonly filter = signal('');
  protected readonly sort = signal<NineAmSort | null>({
    column: 'name',
    direction: 'asc',
  });
  protected readonly selected = signal<readonly Service[]>([]);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly loading = signal(false);

  // Not `required`: view queries resolve after the first render pass, so on that
  // pass this is undefined and the status column falls back to plain text. The
  // computed re-runs once the query lands.
  private readonly statusCell = viewChild<TemplateRef<{ $implicit: Service }>>('statusCell');

  // Stable field references, not inline arrows in the template — a new function
  // identity on every change detection pass would defeat the table's memoization.
  protected readonly rowKey = (row: Service): string => row.id;
  protected readonly selectRowLabel = (row: Service): string => `Select ${row.name}`;
  protected readonly expandRowLabel = (row: Service): string => `Show details for ${row.name}`;
  protected readonly countLabel = (count: number): string =>
    `${count} ${count === 1 ? 'service' : 'services'} selected`;

  protected readonly columns = computed<readonly NineAmColumn<Service>[]>(() => [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'namespace', header: 'Namespace', sortable: true },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: this.statusCell(),
    },
    {
      key: 'replicas',
      header: 'Replicas',
      sortable: true,
      align: 'end',
      width: '7rem',
    },
    {
      key: 'cpu',
      header: 'CPU',
      sortable: true,
      align: 'end',
      width: '6rem',
      // Displays a dash, sorts on the raw number. Because `sortBy` returns null
      // for a stopped service, the table treats those cells as empty and keeps
      // them last in both directions — no comparator needed.
      value: (row) => (row.cpu === null ? '—' : `${row.cpu}%`),
      sortBy: (row) => row.cpu,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      sortable: true,
      width: '10rem',
      value: (row) => formatUpdated(row.updatedAt),
      // Sorting the rendered string would put "3 minutes ago" before
      // "3 days ago" alphabetically. Sort the timestamp instead.
      sortBy: (row) => Date.parse(row.updatedAt),
    },
  ]);

  protected readonly filtered = computed(() => {
    const query = this.filter().trim().toLowerCase();

    if (query === '') {
      return this.all();
    }

    return this.all().filter(
      (service) =>
        service.name.toLowerCase().includes(query) ||
        service.namespace.toLowerCase().includes(query),
    );
  });

  private readonly sorted = computed(() => sortRows(this.filtered(), this.columns(), this.sort()));

  protected readonly pageRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();

    return this.sorted().slice(start, start + this.pageSize());
  });

  protected statusColor(status: ServiceStatus): TagColor {
    return STATUS_COLORS[status];
  }

  protected onFilter(value: string): void {
    this.filter.set(value);

    // A narrowed list is usually shorter than the current page number.
    this.page.set(1);
  }

  protected deleteSelected(): void {
    const doomed = new Set(this.selected().map((service) => service.id));

    this.all.update((services) => services.filter((service) => !doomed.has(service.id)));
    this.selected.set([]);
  }

  protected reload(): void {
    this.loading.set(true);
    this.all.set(SERVICES);
    this.selected.set([]);
    this.filter.set('');
    this.page.set(1);

    setTimeout(() => this.loading.set(false), 700);
  }
}
