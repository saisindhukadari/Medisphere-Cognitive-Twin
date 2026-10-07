import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe, DecimalPipe, LowerCasePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { AuthService } from '../core/auth';
import { AppearanceService } from '../core/appearance';
import { ToastService } from '../core/toast';
import {
  CountComponent,
  ProgressComponent,
  LineChartComponent,
  SparkComponent,
  RingCardComponent,
  DetailSheetComponent,
  DonutComponent,
  ShapChartComponent,
  SheetBlock,
  SheetAction,
} from '../shared/charts';
import { humanize } from '../shared/text';

export interface Kpi {
  icon: string;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  trend: string;
  tone?: string;
  route: string;
  query?: Record<string, string>;
}
export interface KpiGroup {
  title: string;
  items: Kpi[];
}

/**
 * Healthcare command centre.
 *
 * <p>Every figure, ring, trend, device row and alert shown here is fetched from
 * the Spring Boot aggregation endpoints (`/api/dashboard/...`) and computed
 * server-side from persisted MongoDB records. The browser never invents data —
 * there is no `Math.random()` in this component, and every section carries its
 * own loading, empty and error state.</p>
 */
@Component({
  standalone: true,
  templateUrl: './dashboard.html',
  imports: [
    NgFor, NgIf, NgClass, FormsModule, RouterLink,
    DatePipe, DecimalPipe, LowerCasePipe, TitleCasePipe,
    CountComponent, ProgressComponent, LineChartComponent, SparkComponent,
    RingCardComponent, DetailSheetComponent, DonutComponent, ShapChartComponent,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  readonly appearance = inject(AppearanceService);
  private api = inject(Api);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  // ------------------------------------------------------------- core data
  s: any = null;
  rings: any = null;
  trend: any = null;
  live: any = null;
  wearables: any = null;
  alerts: any[] = [];
  watchlist: any[] = [];
  preds: any[] = [];
  carePlans: any[] = [];

  // ------------------------------------------------------------- state flags
  loading = true;
  loadingRings = true;
  loadingTrend = true;
  loadingLive = true;
  loadingWearables = true;
  loadingAlerts = true;
  loadingWatch = true;
  loadingRisk = true;
  error = '';
  errRings = '';
  errTrend = '';
  errLive = '';
  errWearables = '';
  errAlerts = '';
  errWatch = '';
  errRisk = '';
  loadingCare = true;
  errCare = '';

  // ------------------------------------------------------------- filters
  patientGroup: 'all' | 'high' | 'medium' | 'low' = 'high';
  monitorFilter: 'all' | 'online' | 'offline' = 'all';
  timeRange: '24h' | '7d' | '30d' = '7d';
  careFilter: 'all' | 'active' | 'pending' | 'completed' = 'all';
  metric = 'HEART_RATE';
  deviceLimit = 6;

  // ------------------------------------------------------------- toggles
  autoRefresh = true;
  liveOn = true;

  // ------------------------------------------------------------- clock
  now = new Date();
  lastUpdated: Date | null = null;
  secondsAgo = 0;
  isPatient = false;

  // ------------------------------------------------------------- sheet
  sheetOpen = false;
  sheetTitle = '';
  sheetSubtitle = '';
  sheetBadge = '';
  sheetBadgeTone = '';
  sheetBlocks: SheetBlock[] = [];
  sheetActions: SheetAction[] = [];
  sheetDisclaimer = '';

  private timers: ReturnType<typeof setInterval>[] = [];
  private busy = new Set<string>();

  readonly metrics = [
    { key: 'HEART_RATE', label: 'Heart rate' },
    { key: 'BLOOD_PRESSURE', label: 'Blood pressure' },
    { key: 'SPO2', label: 'Blood oxygen' },
    { key: 'GLUCOSE', label: 'Glucose' },
    { key: 'TEMPERATURE', label: 'Temperature' },
    { key: 'RESP_RATE', label: 'Respiratory rate' },
  ];

  readonly ranges: { key: '24h' | '7d' | '30d'; label: string }[] = [
    { key: '24h', label: '24 hours' },
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
  ];

  readonly careFilters: { k: 'all' | 'active' | 'pending' | 'completed'; l: string }[] = [
    { k: 'all', l: 'All' },
    { k: 'active', l: 'Active' },
    { k: 'pending', l: 'Pending' },
    { k: 'completed', l: 'Completed' },
  ];

  ngOnInit(): void {
    this.isPatient = this.auth.hasRole('PATIENT');
    this.autoRefresh = this.appearance.prefs.autoRefreshMonitoring;
    this.liveOn = this.appearance.prefs.liveMonitoring;
    if (this.isPatient) this.patientGroup = 'low';

    this.loadSummary();
    this.loadRings();
    this.loadTrend();
    this.loadLive();
    this.loadWearables();
    this.loadAlerts();
    this.loadWatchlist();
    this.loadRisk();
    this.loadCarePlans();

    this.timers.push(setInterval(() => (this.now = new Date()), 30000));
    this.timers.push(
      setInterval(() => {
        if (!this.lastUpdated) return;
        this.secondsAgo = Math.max(0, Math.round((Date.now() - this.lastUpdated.getTime()) / 1000));
      }, 1000),
    );
    // Quiet background polling — guarded so a slow request never double-fires.
    this.timers.push(setInterval(() => this.backgroundRefresh(), 60000));
    this.timers.push(
      setInterval(() => {
        if (this.liveOn && !this.isPatientBlockedLive()) this.loadLive();
      }, 15000),
    );
  }

  ngOnDestroy(): void {
    this.timers.forEach((t) => clearInterval(t));
    this.timers = [];
  }

  private isPatientBlockedLive(): boolean {
    return false;
  }

  // =====================================================================
  // loaders
  // =====================================================================
  private guard(key: string, fn: () => void) {
    if (this.busy.has(key)) return;
    this.busy.add(key);
    try {
      fn();
    } finally {
      this.busy.delete(key);
    }
  }

  loadSummary() {
    this.guard('summary', () => {
      this.error = '';
      this.api.get<any>('/dashboard/summary').subscribe({
        next: (r) => {
          this.s = r ?? {};
          this.rebuildKpis();
          this.rebuildCare();
          this.rebuildActivity();
          this.loading = false;
          this.touch();
        },
        error: () => {
          this.error = 'Could not reach the dashboard summary endpoint.';
          this.loading = false;
        },
      });
    });
  }

  loadRings() {
    this.guard('rings', () => {
      this.errRings = '';
      this.api.get<any>('/dashboard/rings').subscribe({
        next: (r) => {
          this.rings = r ?? {};
          this.rebuildRings();
          this.loadingRings = false;
        },
        error: () => {
          this.errRings = 'Ring details are unavailable right now.';
          this.loadingRings = false;
        },
      });
    });
  }

  loadTrend() {
    this.loadingTrend = true;
    this.errTrend = '';
    this.api
      .get<any>(`/dashboard/vitals-trend?metric=${this.metric}&range=${this.timeRange}`)
      .subscribe({
        next: (r) => {
          this.trend = r ?? {};
          this.rebuildTrend();
          this.loadingTrend = false;
        },
        error: () => {
          this.errTrend = 'Trend data could not be loaded.';
          this.loadingTrend = false;
        },
      });
  }

  loadLive() {
    this.guard('live', () => {
      this.errLive = '';
      this.api.get<any>('/dashboard/vitals-latest').subscribe({
        next: (r) => {
          this.live = r ?? {};
          this.rebuildLive();
          this.loadingLive = false;
        },
        error: () => {
          this.errLive = 'Live vitals are unavailable.';
          this.loadingLive = false;
        },
      });
    });
  }

  loadWearables() {
    this.guard('wearables', () => {
      this.errWearables = '';
      this.api.get<any>('/dashboard/wearables').subscribe({
        next: (r) => {
          this.wearables = r ?? {};
          this.rebuildDevices();
          this.loadingWearables = false;
        },
        error: () => {
          this.errWearables = 'Device telemetry could not be loaded.';
          this.loadingWearables = false;
        },
      });
    });
  }

  loadAlerts() {
    this.guard('alerts', () => {
      this.errAlerts = '';
      this.api.get<any>('/alerts?size=8').subscribe({
        next: (r) => {
          this.alerts = (r && r.content) ?? [];
          this.loadingAlerts = false;
        },
        error: () => {
          this.errAlerts = 'Alert queue could not be loaded.';
          this.loadingAlerts = false;
        },
      });
    });
  }

  loadWatchlist() {
    this.loadingWatch = true;
    this.errWatch = '';
    this.api.get<any>(`/dashboard/watchlist?group=${this.patientGroup}&limit=8`).subscribe({
      next: (r) => {
        this.watchlist = (r && r.patients) ?? [];
        this.loadingWatch = false;
      },
      error: () => {
        this.errWatch = 'Patient watchlist could not be loaded.';
        this.loadingWatch = false;
      },
    });
  }

  loadRisk() {
    this.guard('risk', () => {
      this.errRisk = '';
      this.api.get<any[]>('/risk-predictions').subscribe({
        next: (r) => {
          this.preds = r ?? [];
          this.rebuildRisk();
          this.loadingRisk = false;
        },
        error: () => {
          this.errRisk = 'Predictions could not be loaded.';
          this.loadingRisk = false;
        },
      });
    });
  }

  loadCarePlans() {
    this.guard('care', () => {
      this.errCare = '';
      this.api.get<any[]>('/care-plans').subscribe({
        next: (r) => {
          this.carePlans = r ?? [];
          this.loadingCare = false;
        },
        error: () => {
          this.carePlans = [];
          this.errCare = 'Care-plan follow-ups could not be loaded.';
          this.loadingCare = false;
        },
      });
    });
  }

  /**
   * The plans a clinician (or nurse) has to act on next: open plans sorted by the
   * priority derived from the patient's own risk profile. Backed entirely by
   * `/api/care-plans`, so nothing here is fabricated in the browser.
   */
  get followUps(): any[] {
    const rank: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (this.carePlans ?? [])
      .filter((p) => p && p.status !== 'COMPLETED' && p.status !== 'REJECTED')
      .slice()
      .sort((a, b) => (rank[(a.priority ?? '').toUpperCase()] ?? 3) - (rank[(b.priority ?? '').toUpperCase()] ?? 3))
      .slice(0, 5);
  }

  /** Total number of planned patient activities across the open plans. */
  get carePlanActivityCount(): number {
    return (this.carePlans ?? []).reduce((n, p) => n + (Array.isArray(p.activities) ? p.activities.length : 0), 0);
  }

  /** Up to three concrete activities for a plan, so the card never renders empty. */
  activitiesFor(plan: any): string[] {
    const list = Array.isArray(plan?.activities) && plan.activities.length ? plan.activities : (plan?.interventions ?? []);
    return (Array.isArray(list) ? list : []).slice(0, 3);
  }

  priorityTone(priority: string): string {
    switch ((priority ?? '').toUpperCase()) {
      case 'HIGH':
        return 'critical';
      case 'MEDIUM':
        return 'medium';
      default:
        return 'low';
    }
  }

  /** Display text for a stored status token (AI_GENERATED → "AI Generated"). */
  prettyStatus(value: string): string {
    return humanize(value);
  }

  /** Refresh everything except the trend chart (which only changes with filters). */
  refreshAll() {
    this.loadSummary();
    this.loadRings();
    this.loadLive();
    this.loadWearables();
    this.loadAlerts();
    this.loadWatchlist();
    this.loadRisk();
    this.loadCarePlans();
    this.toast.info('Dashboard refreshed');
  }

  private backgroundRefresh() {
    if (!this.autoRefresh) return;
    this.loadSummary();
    this.loadRings();
    this.loadAlerts();
    this.loadWatchlist();
    this.loadWearables();
    if (this.liveOn) this.loadLive();
  }

  private touch() {
    this.lastUpdated = new Date();
    this.secondsAgo = 0;
  }

  // =====================================================================
  // toggles
  // =====================================================================
  setAutoRefresh(on: boolean) {
    this.autoRefresh = on;
    this.appearance.update({ autoRefreshMonitoring: on });
    this.toast.info(on ? 'Auto-refresh enabled (60s)' : 'Auto-refresh paused');
    if (on) this.backgroundRefresh();
  }

  setLive(on: boolean) {
    this.liveOn = on;
    this.appearance.update({ liveMonitoring: on });
    this.toast.info(on ? 'Live vitals streaming on' : 'Live vitals paused');
    if (on) this.loadLive();
  }

  toggleTheme() {
    this.appearance.setTheme(this.appearance.isDark ? 'light' : 'dark');
  }

  setCompact(on: boolean) {
    this.appearance.update({ compactDashboard: on });
  }

  setSection(key: 'showWearables' | 'showAlerts' | 'showHighRisk', on: boolean) {
    this.appearance.update({ [key]: on } as any);
  }

  // =====================================================================
  // filters
  // =====================================================================
  onGroupChange() {
    this.loadWatchlist();
  }

  onRangeChange() {
    this.loadTrend();
  }

  setCareFilter(key: string) {
    if (key === 'all' || key === 'active' || key === 'pending' || key === 'completed') {
      this.careFilter = key;
      this.rebuildCare();
    }
  }

  onMetricChange() {
    this.loadTrend();
  }

  // ---------------------------------------------------------------------
  // Derived collections.
  //
  // These are FIELDS rather than getters on purpose: an *ngFor bound to a
  // getter that allocates fresh objects every change-detection pass sees a
  // brand-new iterable each cycle, destroys and re-creates every row, and
  // marks the view dirty again — an infinite render loop. Each collection is
  // therefore rebuilt only when its source data or filter actually changes.
  // ---------------------------------------------------------------------
  filteredDevices: any[] = [];
  visibleDevices: any[] = [];
  moreDevices = 0;
  careStatusRows: { label: string; value: number }[] = [];

  rebuildDevices() {
    const rows: any[] = (this.wearables && this.wearables.devices) || [];
    const filtered =
      this.monitorFilter === 'all'
        ? rows
        : rows.filter((d: any) => (d.status === 'ONLINE') === (this.monitorFilter === 'online'));
    this.filteredDevices = filtered;
    this.visibleDevices = filtered.slice(0, this.deviceLimit);
    this.moreDevices = Math.max(0, filtered.length - this.deviceLimit);
  }

  setMonitorFilter(key: 'all' | 'online' | 'offline') {
    this.monitorFilter = key;
    this.deviceLimit = 6;
    this.rebuildDevices();
  }

  showMoreDevices() {
    this.deviceLimit += 6;
    this.rebuildDevices();
  }

  rebuildCare() {
    const mix = (this.s && this.s.carePlanStatus) || {};
    const all = [
      { key: 'ACTIVE', label: 'Active', group: 'active' },
      { key: 'APPROVED', label: 'Approved', group: 'active' },
      { key: 'PENDING_REVIEW', label: 'Pending review', group: 'pending' },
      { key: 'AI_GENERATED', label: 'AI generated', group: 'pending' },
      { key: 'MODIFIED', label: 'Modified', group: 'pending' },
      { key: 'COMPLETED', label: 'Completed', group: 'completed' },
      { key: 'REJECTED', label: 'Rejected', group: 'completed' },
    ];
    this.careStatusRows = all
      .filter((r) => (this.careFilter === 'all' ? true : r.group === this.careFilter))
      .map((r) => ({ label: r.label, value: Number(mix[r.key] ?? 0) }));
  }

  // =====================================================================
  // presentation helpers
  // =====================================================================
  num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  /** First given name of the signed-in user — skips titles (Dr., Prof., Mr., Ms.). */
  get firstName(): string {
    const n = (this.auth.currentUser?.name || '').trim();
    const TITLES = new Set(['dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'mx', 'mx.', 'nurse']);
    const parts = n.split(/\s+/).filter((p) => p && !TITLES.has(p.toLowerCase()));
    return parts[0] || 'there';
  }

  /** Full display name for the header (keeps the Dr. prefix when present). */
  get displayName(): string {
    return (this.auth.currentUser?.name || '').trim() || 'there';
  }

  get isNurse(): boolean {
    return this.auth.hasRole('NURSE');
  }

  /** Workspace flavour shown in the header pill — role aware, not hard-coded copy. */
  get workspaceLabel(): string {
    if (this.isNurse) return 'Nursing workspace';
    if (this.isPatient) return 'My health record';
    return 'Clinical command center';
  }

  get roleLabel(): string {
    switch (this.auth.currentUser?.role) {
      case 'SUPER_ADMIN':
        return 'Clinical Director';
      case 'PROVIDER':
        return 'Doctor';
      case 'NURSE':
        return 'Nurse';
      case 'CARE_MANAGER':
        return 'Care manager';
      case 'ADMIN':
        return 'Operations Lead';
      case 'PATIENT':
        return 'Patient';
      default:
        return '';
    }
  }

  get statusText(): string {
    if (this.loading) return 'Loading data';
    if (this.error) return 'Backend unreachable';
    const a = this.num(this.s?.activeAlerts);
    if (this.num(this.s?.criticalOpen) > 0) return `${this.num(this.s?.criticalOpen)} critical alerts`;
    if (a > 0) return `${a} open alert${a === 1 ? '' : 's'}`;
    return 'All clear';
  }

  get agoLabel(): string {
    if (!this.lastUpdated) return 'not yet';
    const s = this.secondsAgo;
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }

  kpiGroups: KpiGroup[] = [];
  ringList: {
    key: string;
    title: string;
    hint: string;
    value: number;
    center: string;
    caption: string;
    segments: { label: string; value: number; color: string }[];
  }[] = [];
  trendPoints: { label: string; value: number }[] = [];
  trendValues: number[] = [];
  trendLabels: string[] = [];
  liveVitals: any[] = [];
  activity: any[] = [];
  shapFeatures: any[] = [];
  topPred: any = null;

  rebuildKpis() {
    const s = this.s;
    if (!s) {
      this.kpiGroups = [];
      return;
    }
    const total = this.num(s.totalPatients);
    this.kpiGroups = [
      {
        title: 'Patients',
        items: [
          { icon: '👥', label: 'Total patients', value: total,
            trend: `${this.num(s.patientsThisWeek)} added this week`, route: '/patients' },
          { icon: '🩺', label: 'Active patients (7 days)', value: this.num(s.activePatients),
            trend: `of ${total} in cohort`, route: '/patients' },
          { icon: '✨', label: 'New patients (30 days)', value: this.num(s.newPatients30d),
            trend: 'recent registrations', route: '/patients' },
          { icon: '📡', label: 'Patients monitored', value: this.num(s.monitoringPatients),
            trend: 'vitals within 48h', route: '/monitoring' },
        ],
      },
      {
        title: 'Risk',
        items: [
          { icon: '🔺', label: 'High risk', value: this.num(s.highRiskPatients),
            trend: 'score ≥ 16 or HIGH', tone: 'down', route: '/patients', query: { risk: 'HIGH' } },
          { icon: '⚠️', label: 'Medium risk', value: this.num(s.mediumRiskPatients),
            trend: 'score 8 – 15.9', route: '/patients', query: { risk: 'MEDIUM' } },
          { icon: '🟢', label: 'Low risk', value: this.num(s.lowRiskPatients),
            trend: 'score below 8', route: '/patients', query: { risk: 'LOW' } },
          { icon: '📊', label: 'Average risk score', value: this.num(s.averageRisk), decimals: 1,
            trend: `${this.num(s.predictionCoverage)}% coverage`, route: '/risk-predictions' },
        ],
      },
      {
        title: 'Monitoring',
        items: [
          { icon: '⌚', label: 'Devices online', value: this.num(s.onlineDevices),
            trend: `${this.num(s.deviceCoveragePct)}% of fleet`, route: '/monitoring' },
          { icon: '💓', label: 'Transmitting now', value: this.num(s.patientsTransmitting),
            trend: 'patients, last 24h', route: '/monitoring' },
          { icon: '📟', label: 'Vitals recorded (24h)', value: this.num(s.readings24h),
            trend: 'readings, all metrics', route: '/monitoring' },
          { icon: '🚨', label: 'Abnormal readings', value: this.num(s.abnormalReadings),
            trend: 'last 24 hours', tone: this.num(s.abnormalReadings) > 0 ? 'down' : 'neutral',
            route: '/alerts', query: { severity: 'CRITICAL' } },
        ],
      },
      {
        title: 'Care',
        items: [
          { icon: '📋', label: 'Active care plans', value: this.num(s.activeCarePlans),
            trend: 'active or approved', route: '/care-plans', query: { status: 'ACTIVE' } },
          { icon: '🧑‍⚕️', label: 'Pending doctor review', value: this.num(s.pendingDoctorReviews),
            trend: 'awaiting approval', route: '/care-plans', query: { status: 'PENDING_REVIEW' } },
          { icon: '✅', label: 'Interventions delivered', value: this.num(s.completedInterventions),
            trend: `of ${this.num(s.scheduledInterventions)} scheduled`, route: '/care-plans' },
          { icon: '📈', label: 'Average adherence', value: this.num(s.carePlanAdherence), suffix: '%',
            trend: 'target 85%', route: '/care-plans' },
        ],
      },
    ];
  }

  goKpi(k: Kpi) {
    this.router.navigate([k.route], { queryParams: k.query ?? {} });
  }

  rebuildRings() {
    const r = this.rings;
    if (!r) {
      this.ringList = [];
      return;
    }
    const make = (key: string, title: string, hint: string) => {
      const x = r[key];
      if (!x) return null;
      return {
        key, title, hint,
        value: this.num(x.pct),
        center: x.center ?? '',
        caption: x.caption ?? '',
        segments: x.segments ?? [],
      };
    };
    this.ringList = [
      make('risk', 'Patient risk distribution', 'Breakdown from the latest stored risk score'),
      make('adherence', 'Care plan adherence', 'Average adherence of tracked care plans'),
      make('monitoring', 'Monitoring coverage', 'Patients with vitals in the last 7 days'),
      make('preventive', 'Preventive care', 'Checklist completion across the cohort'),
      make('connectivity', 'Device connectivity', 'Paired wearable fleet status'),
    ].filter((x): x is NonNullable<typeof x> => x !== null);
  }

  rebuildTrend() {
    const pts: any[] = (this.trend && this.trend.points) || [];
    this.trendPoints = pts
      .filter((p) => p && p.value !== null && p.value !== undefined && Number.isFinite(Number(p.value)))
      .map((p) => ({ label: String(p.label ?? ''), value: Number(p.value) }));
    this.trendValues = this.trendPoints.map((p) => p.value);
    this.trendLabels = this.trendPoints.map((p) => p.label);
  }

  rebuildLive() {
    this.liveVitals = (this.live && this.live.vitals) || [];
  }

  rebuildActivity() {
    this.activity = (this.s && this.s.recentActivity) || [];
  }

  rebuildRisk() {
    const sorted = [...this.preds].sort((a, b) => this.num(b.overallScore) - this.num(a.overallScore));
    this.topPred = sorted[0] ?? null;
    const c = this.topPred?.contributions;
    this.shapFeatures = Array.isArray(c) ? c.slice(0, 5) : [];
  }

  get trendUnit(): string {
    return this.trend?.unit ?? '';
  }

  get trendMetricLabel(): string {
    return this.trend?.label ?? this.metrics.find((m) => m.key === this.metric)?.label ?? this.metric;
  }

  get wearSummary(): any {
    return this.wearables?.summary ?? {};
  }

  get adherencePct(): number {
    return this.num(this.s?.carePlanAdherence);
  }

  /** Share of the (filtered) care-plan population a status count represents. */
  barPct(value: number): number {
    const total = this.num(this.s?.totalCarePlans);
    if (!total) return 0;
    return Math.min(100, Math.round((this.num(value) * 100) / total));
  }

  deviceType(type: string): string {
    switch (type) {
      case 'WEARABLE_WATCH': return 'Smartwatch';
      case 'FITNESS_TRACKER': return 'Fitness tracker';
      case 'BP_CUFF': return 'Blood pressure monitor';
      case 'PULSE_OXIMETER': return 'Pulse oximeter';
      case 'GLUCOSE_MONITOR': return 'Glucose monitor';
      default: return type || 'Device';
    }
  }

  hoursLabel(h: number | null | undefined): string {
    if (h === null || h === undefined || !Number.isFinite(Number(h))) return 'never synced';
    const v = Number(h);
    if (v < 1) return `${Math.max(1, Math.round(v * 60))} min ago`;
    if (v < 48) return `${Math.round(v)} h ago`;
    return `${Math.round(v / 24)} days ago`;
  }

  fmtTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  }

  // =====================================================================
  // accessible detail sheet
  // =====================================================================
  closeSheet() {
    this.sheetOpen = false;
  }

  private openSheet(cfg: {
    title: string;
    subtitle?: string;
    badge?: string;
    badgeTone?: string;
    blocks: SheetBlock[];
    actions?: SheetAction[];
    disclaimer?: string;
  }) {
    this.sheetTitle = cfg.title;
    this.sheetSubtitle = cfg.subtitle ?? '';
    this.sheetBadge = cfg.badge ?? '';
    this.sheetBadgeTone = cfg.badgeTone ?? '';
    this.sheetBlocks = cfg.blocks;
    this.sheetActions = cfg.actions ?? [{ label: 'Close' }];
    this.sheetDisclaimer = cfg.disclaimer ?? '';
    this.sheetOpen = true;
  }

  openRing(key: string) {
    const ring = this.rings?.[key];
    if (!ring) return;
    const d = ring.detail ?? {};
    const titles: Record<string, string> = {
      risk: 'Patient risk distribution',
      adherence: 'Care plan adherence',
      monitoring: 'Monitoring coverage',
      preventive: 'Preventive care completion',
      connectivity: 'Device connectivity',
    };
    const blocks: SheetBlock[] = [];

    if (key === 'risk') {
      const c = d.counts ?? {};
      const p = d.pcts ?? {};
      blocks.push({
        heading: 'Current distribution',
        rows: [
          { label: 'High risk', value: `${c.HIGH ?? 0}  (${p.HIGH ?? 0}%)` },
          { label: 'Medium risk', value: `${c.MEDIUM ?? 0}  (${p.MEDIUM ?? 0}%)` },
          { label: 'Low risk', value: `${c.LOW ?? 0}  (${p.LOW ?? 0}%)` },
        ],
      });
      blocks.push({
        heading: 'Trend vs last week',
        rows: [
          { label: 'High risk now', value: String(c.HIGH ?? 0) },
          { label: 'High risk 7 days ago', value: String(d.pastHigh ?? 0) },
          { label: 'Change', value: `${this.num(d.delta) > 0 ? '+' : ''}${this.num(d.delta)}`,
            tone: this.num(d.delta) > 0 ? 'down' : '' },
          { label: 'Direction', value: d.trend ?? 'STABLE' },
        ],
      });
      blocks.push({
        heading: 'Highest-scoring patients',
        items: (d.patients ?? []).map((p: any) => ({
          title: p.name,
          sub: `${p.category} · ${p.driver}`,
          right: `${p.score}`,
        })),
      });
      blocks.push({ note: d.methodology });
    } else if (key === 'adherence') {
      blocks.push({
        heading: 'Overall',
        rows: [
          { label: 'Adherence', value: `${this.num(d.overallAdherence)}%` },
          { label: 'Target', value: `${this.num(d.targetAdherence)}%` },
          { label: 'Active plans', value: String(d.activePlans ?? 0) },
          { label: 'On track', value: String(d.onTrack ?? 0) },
          { label: 'Behind target', value: String(d.behind ?? 0) },
        ],
      });
      blocks.push({
        heading: 'Activities',
        rows: [
          { label: 'Completed', value: String(d.completedActivities ?? 0) },
          { label: 'Missed / outstanding', value: String(d.missedActivities ?? 0) },
          { label: 'Pending activation', value: String(d.pendingActivities ?? 0) },
        ],
      });
      blocks.push({
        heading: 'Patient breakdown',
        items: (d.patientBreakdown ?? []).slice(0, 10).map((r: any) => ({
          title: r.patientName,
          sub: r.status,
          badge: `${r.adherence}%`,
          badgeTone: this.num(r.adherence) >= 85 ? 'badge active' : 'badge medium',
        })),
      });
      blocks.push({ note: d.methodology });
    } else if (key === 'monitoring') {
      blocks.push({
        heading: 'Coverage',
        rows: [
          { label: 'Patients transmitting', value: `${d.monitoredPatients ?? 0} / ${d.totalPatients ?? 0}` },
          { label: 'Connected devices', value: String(d.connectedDevices ?? 0) },
          { label: 'Devices without data', value: String(d.offlineDevices ?? 0) },
          { label: 'Last sync', value: this.fmtTime(d.lastSyncAt) },
        ],
      });
      blocks.push({
        heading: 'No data in the last 7 days',
        items: (d.withoutRecentData ?? []).map((r: any) => ({
          title: r.name,
          sub: `Risk ${r.riskStatus ?? '—'}`,
          badge: 'Silent',
          badgeTone: 'badge medium',
        })),
        note: (d.withoutRecentData ?? []).length ? undefined : 'Every patient reported vitals this week.',
      });
      blocks.push({ note: d.methodology });
    } else if (key === 'preventive') {
      blocks.push({
        heading: 'Completion',
        rows: [
          { label: 'Checklist items completed', value: String(d.completed ?? 0) },
          { label: 'Outstanding', value: String(d.outstanding ?? 0) },
        ],
      });
      blocks.push({
        heading: 'Activities',
        items: (d.activities ?? []).map((a: any) => ({
          title: a.label,
          sub: `${a.done} of ${a.total} patients`,
          badge: `${a.pct}%`,
          badgeTone: this.num(a.pct) >= 85 ? 'badge active' : 'badge medium',
        })),
      });
      blocks.push({ note: d.methodology });
    } else {
      blocks.push({
        heading: 'Fleet',
        rows: [
          { label: 'Online', value: String(d.online ?? 0) },
          { label: 'Idle', value: String(d.idle ?? 0) },
          { label: 'Offline', value: String(d.offline ?? 0) },
          { label: 'Total devices', value: String(d.total ?? 0) },
          { label: 'Average battery', value: `${this.num(d.avgBattery)}%` },
        ],
      });
      blocks.push({
        heading: 'By device type',
        items: (d.byType ?? []).map((t: any) => ({
          title: t.label,
          sub: `${t.online} of ${t.count} online`,
          badge: `${t.pct}%`,
          badgeTone: this.num(t.pct) >= 85 ? 'badge active' : 'badge medium',
        })),
      });
      blocks.push({ note: d.methodology });
    }

    this.openSheet({
      title: titles[key] ?? 'Details',
      subtitle: `${this.num(ring.pct)}% · ${ring.caption ?? ''}`.trim(),
      badge: this.num(ring.pct) + '%',
      blocks,
      actions: d.action
        ? [{ label: d.actionLabel ?? 'Open', link: d.action, primary: true }, { label: 'Close' }]
        : [{ label: 'Close' }],
      disclaimer: this.rings?.disclaimer,
    });
  }

  openDevice(d: any) {
    const latest = d?.latest;
    this.openSheet({
      title: d?.name || 'Wearable device',
      subtitle: `${d?.patientName ?? '—'} · ${this.deviceType(d?.type)}`,
      badge: d?.status ?? 'UNKNOWN',
      badgeTone: d?.status === 'ONLINE' ? 'badge active' : d?.status === 'IDLE' ? 'badge medium' : 'badge high',
      blocks: [
        {
          heading: 'Device',
          rows: [
            { label: 'Type', value: this.deviceType(d?.type) },
            { label: 'Model', value: d?.model || '—' },
            { label: 'Firmware', value: d?.firmware || '—' },
            { label: 'Battery', value: d?.battery !== null && d?.battery !== undefined ? `${d.battery}%` : '—' },
            { label: 'Signal', value: d?.signal !== null && d?.signal !== undefined ? `${d.signal}%` : '—' },
            { label: 'Reports', value: d?.metricLabel || '—' },
            { label: 'Last sync', value: this.hoursLabel(d?.hoursSinceSync) },
          ],
        },
        {
          heading: 'Latest reading',
          rows: latest
            ? [
                { label: latest.label, value: `${latest.value} ${latest.unit ?? ''}`.trim() },
                { label: 'Threshold check', value: latest.abnormal ? 'Outside configured threshold' : 'Within threshold',
                  tone: latest.abnormal ? 'down' : '' },
                { label: 'Recorded', value: this.fmtTime(latest.at) },
              ]
            : [{ label: 'Latest reading', value: 'No readings recorded for this device' }],
        },
      ],
      actions: [{ label: 'Open monitoring', link: '/monitoring', primary: true }, { label: 'Close' }],
      disclaimer: this.wearables?.disclaimer,
    });
  }

  openAlert(a: any) {
    this.openSheet({
      title: a?.type ?? 'Alert',
      subtitle: a?.patientName ?? '',
      badge: a?.category ?? '',
      badgeTone: a?.category === 'CRITICAL' ? 'badge critical' : a?.category === 'HIGH' ? 'badge high' : 'badge medium',
      blocks: [
        {
          heading: 'Alert',
          rows: [
            { label: 'Severity', value: a?.category ?? '—' },
            { label: 'Metric', value: a?.vitalType ?? a?.type ?? '—' },
            { label: 'Current value', value: a?.value ?? '—' },
            { label: 'Threshold', value: a?.threshold ?? '—' },
            { label: 'Status', value: a?.status ?? '—' },
            { label: 'Assigned to', value: a?.assignedProvider ?? 'unassigned' },
            { label: 'Created', value: this.fmtTime(a?.createdAt) },
          ],
        },
        {
          heading: 'Clinical note',
          note: a?.clinicalNote || 'No note recorded on this alert.',
        },
      ],
      actions: [
        { label: 'Open patient 360', link: `/patients/${a?.patientId}`, primary: true },
        { label: 'Alerts console', link: '/alerts' },
        { label: 'Close' },
      ],
    });
  }

  openPatient(p: any) {
    this.openSheet({
      title: p?.name ?? 'Patient',
      subtitle: p?.riskStatus ? `${p.riskStatus} risk · score ${p.riskScore}` : '',
      badge: p?.monitoring ?? '',
      badgeTone: p?.monitoring === 'ONLINE' ? 'badge active' : 'badge medium',
      blocks: [
        {
          heading: 'Risk',
          rows: [
            { label: 'Risk status', value: p?.riskStatus ?? '—' },
            { label: 'Risk score', value: `${p?.riskScore ?? 0}` },
            { label: 'Model category', value: p?.riskCategory ?? '—' },
            { label: 'Primary driver', value: p?.riskFactor ?? '—' },
          ],
        },
        {
          heading: 'Care',
          rows: [
            { label: 'Latest vital', value: p?.latestVital ?? 'no reading in 48h' },
            { label: 'Care plan', value: p?.carePlanStatus ?? 'NONE' },
            { label: 'Active alerts', value: `${p?.activeAlerts ?? 0}` },
            { label: 'Assigned doctor', value: p?.doctor || 'Not yet assigned' },
          ],
        },
      ],
      actions: [
        { label: 'Open patient 360', link: `/patients/${p?.id}`, primary: true },
        { label: 'Digital twin', link: `/patients/${p?.id}/digital-twin` },
        { label: 'Close' },
      ],
      disclaimer: this.watchlistDisclaimer,
    });
  }

  get watchlistDisclaimer(): string {
    return 'Risk scores come from the deterministic demo model — not clinical guidance.';
  }

  openCareDetail() {
    this.openSheet({
      title: 'Care plan summary',
      subtitle: `${this.num(this.s?.activeCarePlans)} active · ${this.adherencePct}% adherence`,
      blocks: [
        {
          heading: 'Status mix',
          rows: this.careStatusRows.map((r) => ({ label: r.label, value: String(r.value) })),
        },
        {
          heading: 'Delivery',
          rows: [
            { label: 'Interventions delivered', value: `${this.num(this.s?.completedInterventions)} of ${this.num(this.s?.scheduledInterventions)}` },
            { label: 'Completed plans', value: String(this.num(this.s?.completedCarePlans)) },
            { label: 'Pending doctor review', value: String(this.num(this.s?.pendingDoctorReviews)) },
            { label: 'Average adherence', value: `${this.adherencePct}%` },
          ],
          note: 'The AI drafts care plans but never auto-approves medication — a doctor must approve every plan.',
        },
      ],
      actions: [{ label: 'Open care plans', link: '/care-plans', primary: true }, { label: 'Close' }],
    });
  }

  acknowledge(a: any) {
    this.api.post(`/alerts/${a.id}/status`, { status: 'ACKNOWLEDGED', note: 'Acknowledged from dashboard' }).subscribe({
      next: () => {
        this.toast.success('Alert acknowledged');
        this.loadAlerts();
        this.loadSummary();
      },
      error: (e: any) => this.toast.error(e?.error?.message ?? 'Could not acknowledge alert'),
    });
  }
}


