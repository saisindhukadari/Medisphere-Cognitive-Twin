import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Api } from '../core/api';
import { AuthService } from '../core/auth';
import { AppearanceService } from '../core/appearance';
import { ToastService } from '../core/toast';
import { ConfirmService } from '../core/confirm';
import { humanize } from '../shared/text';

/**
 * Alert console: severity/status triage with assignment, notes, resolution and
 * patient navigation. Every transition is persisted by the backend and audited.
 */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, FormsModule, RouterLink],
  template: `
    <div class="card-title-row">
      <div>
        <span class="pill"><span class="live-dot"></span> Live triage queue</span>
        <h1 style="margin-top:0.4rem">Alerts</h1>
        <p class="card-sub">Configurable clinical demonstration rules — not universal medical guidance.</p>
      </div>
      <div class="row">
        <span class="chip" *ngIf="autoRefresh">Auto-refresh on</span>
        <button class="outline-btn" (click)="load()" [disabled]="loading">↻ Refresh</button>
      </div>
    </div>

    <div class="grid kpi-grid" style="margin-bottom:1rem">
      <div class="card kpi hoverable"><div class="kpi-icon">🔔</div><div class="value">{{ openCount }}</div><div class="label">Open alerts</div><div class="trend neutral">new / acknowledged / investigating</div></div>
      <div class="card kpi hoverable"><div class="kpi-icon">⚠</div><div class="value">{{ criticalCount }}</div><div class="label">Critical open</div><div class="trend" [class.down]="criticalCount > 0">{{ criticalCount > 0 ? 'needs immediate triage' : 'queue clear' }}</div></div>
      <div class="card kpi hoverable"><div class="kpi-icon">✓</div><div class="value">{{ resolvedCount }}</div><div class="label">Resolved / FP</div><div class="trend neutral">closed on this page</div></div>
      <div class="card kpi hoverable"><div class="kpi-icon">◔</div><div class="value">{{ view.length }}</div><div class="label">Rows in view</div><div class="trend neutral">of {{ alerts.length }} loaded · page size 50</div></div>
    </div>

    <div class="toolbar">
      <div class="field-group">
        <label class="field" for="al-status">Status</label>
        <select id="al-status" class="input" [(ngModel)]="statusFilter" (ngModelChange)="load()">
          <option value="">All statuses</option>
          <option>NEW</option><option>ACKNOWLEDGED</option><option>INVESTIGATING</option>
          <option>RESOLVED</option><option>FALSE_POSITIVE</option>
        </select>
      </div>
      <div class="field-group">
        <label class="field" for="al-sev">Severity</label>
        <select id="al-sev" class="input" [(ngModel)]="severityFilter" (ngModelChange)="load()">
          <option value="">All severities</option>
          <option>CRITICAL</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
        </select>
      </div>
      <div class="field-group" *ngIf="!isPatient">
        <label class="field" for="al-patient">Patient</label>
        <select id="al-patient" class="input" [(ngModel)]="patientFilter" (ngModelChange)="load()">
          <option value="">All patients</option>
          <option *ngFor="let p of patients" [value]="p.id">{{ p.firstName }} {{ p.lastName }}</option>
        </select>
      </div>
      <label class="switch">
        <input type="checkbox" [(ngModel)]="onlyActive" (ngModelChange)="apply()" />
        <span class="track"></span> <span>Show only active</span>
      </label>
      <label class="switch">
        <input type="checkbox" [(ngModel)]="criticalOnly" (ngModelChange)="apply()" />
        <span class="track"></span> <span>Critical only</span>
      </label>
      <button class="outline-btn" (click)="reset()">Reset</button>
      <span class="pill" *ngIf="deepLinked"
            style="background:var(--accent-softer); color:var(--accent)">
        Dashboard filter: {{ severityFilter || 'any severity' }}{{ statusFilter ? ' · ' + statusFilter : '' }}
      </span>
    </div>

    <div class="card">
      <div *ngIf="loading" class="stack">
        <div class="skeleton" *ngFor="let r of [1,2,3,4,5]" style="height:38px"></div>
      </div>

      <div class="error-box" *ngIf="error">{{ error }} <button class="btn sm secondary" (click)="load()">Retry</button></div>

      <table class="responsive" *ngIf="!loading && !error && view.length">
        <thead>
          <tr><th>Severity</th><th>Patient</th><th>Alert</th><th>Value</th><th>Status</th><th>Note</th><th>Assigned</th><th>Created</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let a of view; let i = index" [style.--i]="i">
            <td data-label="Severity">
              <span class="sev-dot" [ngClass]="(a.category || '').toLowerCase()"></span>{{ a.category }}
            </td>
            <td data-label="Patient">
              <a [routerLink]="['/patients', a.patientId]">{{ a.patientName }}</a>
            </td>
            <td data-label="Alert">{{ a.type }}</td>
            <td data-label="Value" class="number">{{ a.value }}<span class="muted small" *ngIf="a.threshold"> / {{ a.threshold }}</span></td>
            <td data-label="Status"><span class="badge" [class]="'badge ' + a.status.toLowerCase()">{{ pretty(a.status) }}</span></td>
            <td data-label="Note" class="small">{{ a.clinicalNote || 'No additional note' }}</td>
            <td data-label="Assigned" class="small">{{ a.assignedProvider || 'Unassigned' }}</td>
            <td data-label="Created" class="small muted">{{ a.createdAt | date: 'short' }}</td>
            <td data-label="Actions" style="white-space:nowrap">
              <span class="grid-actions" *ngIf="canAct">
                <button class="btn sm secondary" (click)="setStatus(a, 'ACKNOWLEDGED')" title="Acknowledge">Ack</button>
                <button class="btn sm secondary" (click)="askInvestigate(a)">Investigate</button>
                <button class="btn sm" (click)="askResolve(a)">Resolve</button>
                <button class="btn sm ghost" (click)="askFalsePositive(a)">FP</button>
                <button class="btn sm ghost" (click)="openAssign(a)">Assign</button>
                <button class="btn sm ghost" (click)="openNote(a)">Note</button>
                <a class="btn sm ghost" [routerLink]="['/patients', a.patientId]">Patient</a>
              </span>
              <span *ngIf="!canAct" class="small muted">View only</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="empty" *ngIf="!loading && !error && !view.length">
        <span class="empty-icon">✓</span>
        <h3>No alerts in this view</h3>
        <p>The alert engine deduplicates identical alerts within a 1-hour cooldown, and thresholds are configurable in Settings.</p>
        <button class="outline-btn" (click)="reset()">Clear filters</button>
      </div>
    </div>

    <!-- assign panel -->
    <div class="card" *ngIf="assigning" style="margin-top:1rem; border-color:var(--accent)">
      <h3>Assign alert</h3>
      <p class="small muted">{{ assigning.type }} · {{ assigning.patientName }}</p>
      <label class="field" for="assign-provider">Doctor / care team member</label>
      <select id="assign-provider" class="input" [(ngModel)]="assignProvider">
        <option value="">Select…</option>
        <option *ngFor="let p of providers" [value]="p.name">{{ p.name }} — {{ p.specialty || 'Care team' }}</option>
      </select>
      <div class="row" style="margin-top:0.8rem">
        <button class="btn" (click)="saveAssign()" [disabled]="!assignProvider">Assign</button>
        <button class="outline-btn" (click)="assigning = null">Cancel</button>
      </div>
    </div>

    <!-- note panel -->
    <div class="card" *ngIf="noting" style="margin-top:1rem; border-color:var(--accent)">
      <h3>Add clinical note</h3>
      <p class="small muted">{{ noting.type }} · {{ noting.patientName }}</p>
      <label class="field" for="note-text">Note</label>
      <textarea id="note-text" class="input" rows="3" [(ngModel)]="noteText"></textarea>
      <div class="row" style="margin-top:0.8rem">
        <button class="btn" (click)="saveNote()" [disabled]="!noteText.trim()">Save note</button>
        <button class="outline-btn" (click)="noting = null">Cancel</button>
      </div>
    </div>
  `,
})
export class AlertsComponent implements OnInit, OnDestroy {
  alerts: any[] = [];
  view: any[] = [];
  patients: any[] = [];
  providers: any[] = [];
  statusFilter = '';
  severityFilter = '';
  patientFilter = '';
  onlyActive = true;
  criticalOnly = false;
  loading = true;
  error = '';
  canAct = true;
  isPatient = false;
  autoRefresh = false;
  assigning: any = null;
  assignProvider = '';
  noting: any = null;
  noteText = '';
  deepLinked = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private appearance = inject(AppearanceService);
  private auth = inject(AuthService);

  constructor(private api: Api, private toast: ToastService, private confirm: ConfirmService, private route: ActivatedRoute) {}

  /** Display text for a stored status token (ACKNOWLEDGED → "Acknowledged"). */
  pretty(value: string): string {
    return humanize(value);
  }

  ngOnInit() {
    this.isPatient = this.auth.hasRole('PATIENT');
    this.canAct = !this.isPatient;
    this.autoRefresh = this.appearance.prefs.autoRefreshMonitoring;
    // Deep links from dashboard KPI cards: /alerts?severity=CRITICAL&status=NEW
    const qp = this.route.snapshot.queryParamMap;
    const sev = (qp.get('severity') || '').toUpperCase();
    const st = (qp.get('status') || '').toUpperCase();
    if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(sev)) this.severityFilter = sev;
    if (['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'].includes(st)) this.statusFilter = st;
    this.deepLinked = !!this.severityFilter || !!this.statusFilter;
    this.load();
    if (!this.isPatient) {
      this.api.get<any>('/patients?size=200&sort=name').subscribe({ next: (r) => (this.patients = r.content ?? []), error: () => {} });
      this.api.get<any[]>('/providers').subscribe({ next: (p) => (this.providers = p ?? []), error: () => {} });
    }
    this.timer = setInterval(() => {
      if (this.appearance.prefs.autoRefreshMonitoring) this.load();
    }, 45000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  load() {
    this.loading = true;
    this.error = '';
    const params = new URLSearchParams();
    if (this.statusFilter) params.set('status', this.statusFilter);
    if (this.severityFilter) params.set('severity', this.severityFilter);
    if (this.patientFilter) params.set('patientId', this.patientFilter);
    params.set('size', '50');
    this.api.get<any>(`/alerts?${params}`).subscribe({
      next: (r) => {
        this.alerts = r.content ?? [];
        this.apply();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load alerts from the backend.';
        this.loading = false;
      },
    });
  }

  apply() {
    this.view = this.alerts.filter((a) => {
      if (this.onlyActive && (a.status === 'RESOLVED' || a.status === 'FALSE_POSITIVE')) return false;
      if (this.criticalOnly && a.category !== 'CRITICAL') return false;
      return true;
    });
  }

  reset() {
    this.statusFilter = '';
    this.severityFilter = '';
    this.patientFilter = '';
    this.onlyActive = true;
    this.criticalOnly = false;
    this.deepLinked = false;
    this.load();
  }

  get openCount(): number {
    return this.alerts.filter((a) => ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING'].includes(a.status)).length;
  }
  get criticalCount(): number {
    return this.alerts.filter((a) => a.category === 'CRITICAL' && ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING'].includes(a.status)).length;
  }
  get resolvedCount(): number {
    return this.alerts.filter((a) => a.status === 'RESOLVED' || a.status === 'FALSE_POSITIVE').length;
  }

  setStatus(a: any, status: string, note = '') {
    this.api.post(`/alerts/${a.id}/status`, { status, note }).subscribe({
      next: () => {
        this.toast.success(`Alert ${status.toLowerCase().replace('_', ' ')}`);
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'Action failed'),
    });
  }

  askInvestigate(a: any) {
    this.confirm
      .confirm({
        title: 'Investigate alert',
        message: `Start investigation of ${a.type} for ${a.patientName}?`,
        confirmLabel: 'Investigate',
      })
      .then((ok) => {
        if (ok) this.setStatus(a, 'INVESTIGATING');
      });
  }

  askResolve(a: any) {
    const critical = a.category === 'CRITICAL';
    this.confirm
      .confirm({
        title: 'Resolve alert',
        message: critical
          ? `This is a CRITICAL alert for ${a.patientName}. Confirm resolution?`
          : `Resolve ${a.type} for ${a.patientName}?`,
        confirmLabel: 'Resolve',
        danger: critical,
      })
      .then((ok) => {
        if (ok) this.setStatus(a, 'RESOLVED');
      });
  }

  askFalsePositive(a: any) {
    this.confirm
      .confirm({
        title: 'Mark false positive',
        message: `Mark ${a.type} for ${a.patientName} as a false positive?`,
        confirmLabel: 'Mark FP',
      })
      .then((ok) => {
        if (ok) this.setStatus(a, 'FALSE_POSITIVE');
      });
  }

  openAssign(a: any) {
    this.noting = null;
    this.assigning = a;
    this.assignProvider = a.assignedProvider ?? '';
  }

  saveAssign() {
    const a = this.assigning;
    this.api.post(`/alerts/${a.id}/assign`, { provider: this.assignProvider }).subscribe({
      next: () => {
        this.toast.success(`Alert assigned to ${this.assignProvider}`);
        this.assigning = null;
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'Assign failed'),
    });
  }

  openNote(a: any) {
    this.assigning = null;
    this.noting = a;
    this.noteText = a.clinicalNote ?? '';
  }

  saveNote() {
    const a = this.noting;
    this.api.post(`/alerts/${a.id}/note`, { note: this.noteText }).subscribe({
      next: () => {
        this.toast.success('Note saved and audited');
        this.noting = null;
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'Note failed'),
    });
  }
}
