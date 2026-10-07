import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe, LowerCasePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api';
import { AuthService } from '../core/auth';
import { ToastService } from '../core/toast';
import { ConfirmService } from '../core/confirm';
import { ProgressComponent } from '../shared/charts';
import { PdfSection, buildPdf, downloadCsv, saveBlob } from '../shared/download';

/* ==========================================================================
   List
   ========================================================================== */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, LowerCasePipe, DecimalPipe, RouterLink, FormsModule, ProgressComponent],
  template: `
    <div class="card-title-row">
      <div>
        <h1>Care Plans</h1>
        <p class="card-sub">AI-assisted care planning workflow — generate → doctor review → approval → active plan.</p>
      </div>
      <a class="btn" routerLink="/care-plans/generate" *ngIf="canGenerate">+ Generate with AI</a>
    </div>

    <div class="grid kpi-grid" style="margin-bottom:1rem">
      <div class="card kpi hoverable"><div class="kpi-icon">✚</div><div class="value">{{ plans.length }}</div><div class="label">Total plans</div></div>
      <div class="card kpi hoverable"><div class="kpi-icon">✓</div><div class="value">{{ count('ACTIVE') }}</div><div class="label">Active</div></div>
      <div class="card kpi hoverable"><div class="kpi-icon">◔</div><div class="value">{{ count('PENDING_REVIEW') + count('AI_GENERATED') + count('MODIFIED') }}</div><div class="label">Awaiting doctor review</div></div>
      <div class="card kpi hoverable"><div class="kpi-icon">%</div><div class="value">{{ avgAdherence }}%</div><div class="label">Average adherence</div></div>
    </div>

    <div class="toolbar">
      <div class="field-group">
        <label class="field" for="cp-search">Search</label>
        <input id="cp-search" class="input" placeholder="Patient or goal…" [(ngModel)]="query" (ngModelChange)="apply()" />
      </div>
      <div class="field-group">
        <label class="field" for="cp-patient">Patient</label>
        <select id="cp-patient" class="input" [(ngModel)]="patientFilter" (ngModelChange)="apply()">
          <option value="">All patients</option>
          <option *ngFor="let p of patientOptions" [value]="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="field-group">
        <label class="field" for="cp-status">Status</label>
        <select id="cp-status" class="input" [(ngModel)]="statusFilter" (ngModelChange)="apply()">
          <option value="">All statuses</option>
          <option value="AI_GENERATED">AI Generated</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="MODIFIED">Doctor Modified</option>
          <option value="APPROVED">Approved</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      <label class="switch">
        <input type="checkbox" [(ngModel)]="hideCompleted" (ngModelChange)="apply()" />
        <span class="track"></span> <span>Hide completed</span>
      </label>
      <button class="outline-btn" (click)="reset()">Reset</button>
    </div>

    <p class="small muted" *ngIf="patientFilter && selectedPatientName" style="margin:-0.4rem 0 0.9rem">
      Showing every care plan for <strong>{{ selectedPatientName }}</strong>
      <span class="mono">({{ patientFilter }})</span> — switching the patient above re-loads the whole view.
    </p>

    <div class="grid cols-3" *ngIf="loading">
      <div class="card skeleton" *ngFor="let s of [1,2,3]" style="min-height:150px"></div>
    </div>

    <div class="error-box" *ngIf="error">{{ error }} <button class="btn sm secondary" (click)="load()">Retry</button></div>

    <div class="card" *ngIf="!loading && !error">
      <table class="responsive" *ngIf="filtered.length; else emptyPlans">
        <thead>
          <tr><th>Patient</th><th>Priority</th><th>Goal</th><th>Status</th><th>Doctor</th><th>Progress</th><th>Created</th><th>Approval</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of filtered; let i = index" [style.--i]="i">
            <td data-label="Patient">
              <span class="cp-patient">
                <span class="avatar" aria-hidden="true">{{ initials(c.patientName) }}</span>
                <span>
                  <span class="cp-patient-name">{{ c.patientName }}</span>
                  <span class="small muted mono">{{ c.patientId }}</span>
                </span>
              </span>
            </td>
            <td data-label="Priority"><span class="badge" [ngClass]="priorityTone(c.priority)">{{ c.priority || 'Routine' }}</span></td>
            <td data-label="Goal">{{ c.goal }}</td>
            <td data-label="Status"><span class="badge" [class]="'badge ' + (c.status | lowercase)">{{ pretty(c.status) }}</span></td>
            <td data-label="Doctor">{{ c.providerName || 'Unassigned' }}</td>
            <td data-label="Progress" style="min-width:150px">
              <app-progress [value]="c.adherenceScore ?? 0" [tone]="(c.adherenceScore ?? 0) < 50 ? 'warn' : ''"></app-progress>
            </td>
            <td data-label="Created" class="small muted">{{ c.createdAt | date: 'mediumDate' }}</td>
            <td data-label="Approval" class="small muted">{{ approvalLabel(c) }}</td>
            <td data-label="Actions">
              <span class="grid-actions">
                <a class="btn sm secondary" [routerLink]="['/care-plans', c.id]">Open</a>
                <a class="btn sm ghost" [routerLink]="['/patients', c.patientId]">Patient</a>
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <ng-template #emptyPlans>
        <div class="empty">
          <span class="empty-icon">✚</span>
          <h3>No care plans match this view</h3>
          <p>Adjust the filters, or generate an AI-assisted plan for a patient — it will be routed for doctor review.</p>
          <a class="btn" routerLink="/care-plans/generate" *ngIf="canGenerate">Generate care plan</a>
        </div>
      </ng-template>
    </div>
  `,
})
export class CarePlansComponent implements OnInit {
  plans: any[] = [];
  filtered: any[] = [];
  query = '';
  statusFilter = '';
  patientFilter = '';
  hideCompleted = false;
  loading = true;
  error = '';
  canGenerate = false;
  private auth = inject(AuthService);
  constructor(private api: Api, private route: ActivatedRoute) {}

  ngOnInit() {
    this.canGenerate = this.auth.hasRole('ADMIN', 'PROVIDER', 'CARE_MANAGER', 'SUPER_ADMIN');
    // Dashboard KPI cards deep-link here (e.g. /care-plans?status=ACTIVE) and
    // Patient 360 / the patient list deep-link with ?patient=<patientId>.
    const status = (this.route.snapshot.queryParamMap.get('status') || '').toUpperCase();
    if (status) this.statusFilter = status;
    const patient = (this.route.snapshot.queryParamMap.get('patient') || '').trim();
    if (patient) this.patientFilter = patient;
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.get<any[]>('/care-plans').subscribe({
      next: (p) => {
        this.plans = p ?? [];
        this.apply();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load care plans from the backend.';
        this.loading = false;
      },
    });
  }

  /** Distinct patients that actually own a plan, for the "Patient" selector. */
  get patientOptions(): { id: string; name: string }[] {
    const seen = new Map<string, string>();
    for (const c of this.plans) {
      if (c?.patientId && !seen.has(c.patientId)) seen.set(c.patientId, c.patientName ?? c.patientId);
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get selectedPatientName(): string {
    return this.patientOptions.find((p) => p.id === this.patientFilter)?.name ?? '';
  }

  apply() {
    const q = this.query.trim().toLowerCase();
    this.filtered = this.plans.filter((c) => {
      if (this.hideCompleted && c.status === 'COMPLETED') return false;
      if (this.statusFilter && c.status !== this.statusFilter) return false;
      if (this.patientFilter && c.patientId !== this.patientFilter) return false;
      if (q && !`${c.patientName} ${c.patientId ?? ''} ${c.goal} ${c.providerName ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  reset() {
    this.query = '';
    this.statusFilter = '';
    this.patientFilter = '';
    this.hideCompleted = false;
    this.apply();
  }

  /** First initials of a display name — never an empty or "undefined" avatar. */
  initials(name: string): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

  count(status: string): number {
    return this.plans.filter((p) => p.status === status).length;
  }

  get avgAdherence(): number {
    const tracked = this.plans.filter((p) => (p.adherenceScore ?? 0) > 0);
    if (!tracked.length) return 0;
    return Math.round(tracked.reduce((a, p) => a + (p.adherenceScore ?? 0), 0) / tracked.length);
  }

  approvalLabel(c: any): string {
    const events = c.approvals ?? [];
    if (!events.length) return c.providerName ? `Assigned · ${c.providerName}` : 'Pending';
    const last = events[events.length - 1];
    const who = last.provider || c.providerName || 'Unassigned';
    return `${pretty(last.action)} · ${who}`;
  }

  pretty(status: string): string {
    return pretty(status);
  }
}

/* ==========================================================================
   Detail
   ========================================================================== */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, LowerCasePipe, DecimalPipe, RouterLink, FormsModule, ProgressComponent],
  template: `
    <div class="error-box" *ngIf="loadError">{{ loadError }} <a routerLink="/care-plans">Back to care plans</a></div>

    <div *ngIf="!loadError">
      <div class="card-title-row">
        <div>
          <span class="pill">AI-assisted care planning</span>
          <h1 style="margin-top:0.4rem">{{ plan ? plan.goal : 'Care Plan' }}</h1>
          <p class="card-sub" *ngIf="plan">
            {{ plan.patientName }} · created {{ plan.createdAt | date: 'mediumDate' }} ·
            <span class="badge" [class]="'badge ' + (plan.status | lowercase)">{{ pretty(plan.status) }}</span>
          </p>
        </div>
        <div class="grid-actions">
          <button class="btn secondary" (click)="openModify()" *ngIf="canModify">Modify</button>
          <button class="btn" (click)="askApprove()" *ngIf="canApprove">Approve</button>
          <button class="btn" (click)="askSign()" *ngIf="canSign">Sign &amp; Activate</button>
          <button class="btn danger" (click)="askReject()" *ngIf="canApprove">Reject</button>
          <button class="btn secondary" (click)="askComplete()" *ngIf="plan?.status === 'ACTIVE'">Complete</button>
          <button class="btn ghost" (click)="downloadPdf()" [disabled]="!plan">⬇ Download PDF</button>
          <button class="outline-btn" (click)="downloadCsvFile()" [disabled]="!plan">⬇ CSV</button>
        </div>
      </div>

      <!-- ================= patient identity strip ================= -->
      <div class="card cp-identity" *ngIf="plan">
        <span class="avatar avatar-lg" aria-hidden="true">{{ patientInitials }}</span>
        <div class="cp-id-main">
          <div class="cp-id-top">
            <strong>{{ plan.patientName }}</strong>
            <span class="small muted mono">{{ plan.patientId }}</span>
            <span class="badge" [class]="'badge ' + ((patient?.riskStatus || 'low') | lowercase)">{{ patient?.riskStatus || 'Unknown risk' }}</span>
            <span class="badge" [ngClass]="priorityTone(plan.priority)">{{ plan.priority || 'Routine' }} priority</span>
            <span class="badge" [class]="'badge ' + (plan.status | lowercase)">{{ pretty(plan.status) }}</span>
          </div>
          <div class="cp-id-meta">
            <span><span class="small muted">Risk score</span> <strong>{{ risk ? risk.overallScore : '—' }}</strong></span>
            <span><span class="small muted">Assigned doctor</span> <strong>{{ assignedDoctor }}</strong></span>
            <span *ngIf="patient?.medicalIdentifier"><span class="small muted">MRN</span> <strong class="mono">{{ patient.medicalIdentifier }}</strong></span>
            <span *ngIf="age"><span class="small muted">Age / sex</span> <strong>{{ age }} · {{ patient?.gender || '—' }}</strong></span>
          </div>
        </div>
        <a class="btn sm secondary" [routerLink]="['/patients', plan.patientId]">Open Patient 360</a>
      </div>

      <!-- workflow stepper -->
      <div class="card" *ngIf="plan">
        <div class="stepper" role="list" aria-label="Care plan workflow">
          <div class="step done" role="listitem"><div class="step-dot">✓</div><div class="step-label">Generated</div></div>
          <div class="step" [class.done]="stepIndex > 1" [class.current]="stepIndex === 1" role="listitem">
            <div class="step-dot">{{ stepIndex > 1 ? '✓' : '2' }}</div><div class="step-label">Doctor review</div>
          </div>
          <div class="step" [class.done]="stepIndex > 2" [class.current]="stepIndex === 2" role="listitem">
            <div class="step-dot">{{ stepIndex > 2 ? '✓' : '3' }}</div><div class="step-label">Approval</div>
          </div>
          <div class="step" [class.done]="stepIndex > 3" [class.current]="stepIndex === 3" role="listitem">
            <div class="step-dot">{{ stepIndex > 3 ? '✓' : '4' }}</div><div class="step-label">Active</div>
          </div>
        </div>
        <p class="small muted">{{ stepHint }}</p>
      </div>

      <!-- modify panel -->
      <div class="card" *ngIf="modifying" style="border-color:var(--accent); margin-top:1rem">
        <h3>Modify care plan</h3>
        <label class="field" for="mod-goal">Updated goal</label>
        <input id="mod-goal" class="input" [(ngModel)]="modifyGoal" />
        <label class="field" style="margin-top:0.7rem" for="mod-notes">Modification notes</label>
        <textarea id="mod-notes" class="input" rows="3" [(ngModel)]="modifyNotes"></textarea>
        <div class="row" style="margin-top:0.8rem">
          <button class="btn" (click)="saveModify()" [disabled]="!modifyGoal.trim()">Save &amp; send to review</button>
          <button class="outline-btn" (click)="modifying = false">Cancel</button>
        </div>
      </div>

      <!-- ================= assignment & notes ================= -->
      <div class="card" *ngIf="plan" style="margin-top:1rem">
        <div class="card-title-row">
          <div>
            <h3>Assignment &amp; notes</h3>
            <p class="card-sub" style="margin-top:0.3rem">Who owns this plan, when it was assigned and the latest note.</p>
          </div>
          <span class="chip">{{ plan.status | lowercase }}</span>
        </div>

        <div class="stat-list">
          <div class="stat-row">
            <span class="sr-key">Assigned</span>
            <span class="sr-val">
              <strong>{{ assignedDoctor }}</strong>
              <span class="small muted" *ngIf="plan.assignedAt"> · since {{ plan.assignedAt | date: 'mediumDate' }}</span>
            </span>
          </div>
          <div class="stat-row">
            <span class="sr-key">Assigned date</span>
            <span class="sr-val">{{ plan.assignedAt || plan.createdAt | date: 'mediumDate' }}</span>
          </div>
          <div class="stat-row" *ngIf="plan.careManagerName">
            <span class="sr-key">Care manager</span><span class="sr-val">{{ plan.careManagerName }}</span>
          </div>
          <div class="stat-row">
            <span class="sr-key">Patient</span>
            <span class="sr-val"><a [routerLink]="['/patients', plan.patientId]">{{ plan.patientName }}</a></span>
          </div>
          <div class="stat-row">
            <span class="sr-key">Priority</span><span class="sr-val">{{ priority }}</span>
          </div>
          <div class="stat-row">
            <span class="sr-key">Doctor review</span>
            <span class="sr-val">
              <span class="badge" [class]="'badge ' + (plan.status | lowercase)">{{ doctorReviewStatus }}</span>
            </span>
          </div>
          <div class="stat-row">
            <span class="sr-key">Status</span>
            <span class="sr-val"><span class="badge" [class]="'badge ' + (plan.status | lowercase)">{{ pretty(plan.status) }}</span></span>
          </div>
        </div>

        <div class="divider"></div>
        <h4>Note</h4>
        <p *ngIf="planNote; else noNote" class="notice">{{ planNote }}</p>
        <ng-template #noNote>
          <p class="small muted" style="margin:0">No additional note</p>
        </ng-template>
      </div>

      <div class="grid cols-2" *ngIf="plan" style="margin-top:1rem">
        <!-- patient + risk summary -->
        <div class="card">
          <div class="card-title-row"><h3>Patient summary</h3>
            <a class="btn sm secondary" [routerLink]="['/patients', plan.patientId]">Patient 360</a></div>
          <div class="stat-list" *ngIf="patient">
            <div class="stat-row"><span class="sr-key">Name</span><span class="sr-val">{{ patient.firstName }} {{ patient.lastName }}</span></div>
            <div class="stat-row"><span class="sr-key">Age / sex</span><span class="sr-val">{{ age }} · {{ patient.gender }}</span></div>
            <div class="stat-row"><span class="sr-key">MRN</span><span class="sr-val mono">{{ patient.medicalIdentifier }}</span></div>
            <div class="stat-row"><span class="sr-key">Assigned doctor</span><span class="sr-val">{{ assignedDoctor }}</span></div>
            <div class="stat-row"><span class="sr-key">Risk status</span>
              <span class="sr-val"><span class="badge" [class]="'badge ' + (patient.riskStatus | lowercase)">{{ patient.riskStatus }}</span></span></div>
          </div>
          <p class="small muted" *ngIf="!patient">Patient record unavailable.</p>

          <div class="divider"></div>
          <h4>Risk summary</h4>
          <div *ngIf="risk; else noRisk">
            <div class="row" style="gap:1.4rem">
              <div><div class="small muted">Overall score</div><div class="risk-score">{{ risk.overallScore ?? 0 }}</div></div>
              <div><div class="small muted">Cardiovascular 10y</div><strong>{{ risk.cardiovascularRisk10y }}%</strong></div>
              <div><div class="small muted">Diabetes complications</div><strong>{{ risk.diabetesComplicationRisk }}%</strong></div>
            </div>
            <p class="small muted" style="margin-top:0.5rem">
              Category {{ risk.riskCategory }} · confidence {{ risk.confidence }} · model {{ risk.modelVersion }}
            </p>
          </div>
          <ng-template #noRisk>
            <div class="empty" style="padding:1rem">
              <p>No risk prediction available for this patient.</p>
              <a class="btn sm" [routerLink]="['/risk-predictions', plan.patientId]">Generate prediction</a>
            </div>
          </ng-template>
        </div>

        <!-- goals + interventions -->
        <div class="card">
          <div class="card-title-row"><h3>Goals &amp; interventions</h3>
            <span class="chip">progress {{ plan.adherenceScore ?? 0 }}%</span></div>
          <app-progress [value]="plan.adherenceScore ?? 0" [tone]="(plan.adherenceScore ?? 0) < 50 ? 'warn' : ''"></app-progress>

          <h4>Goals</h4>
          <ul *ngIf="plan.goals?.length; else noGoals"><li *ngFor="let g of plan.goals">{{ g }}</li></ul>
          <ng-template #noGoals><p class="small muted" style="margin:0">No goals recorded for this plan yet.</p></ng-template>

          <h4>Interventions</h4>
          <ul *ngIf="plan.interventions?.length; else noInterventions"><li *ngFor="let i of plan.interventions">{{ i }}</li></ul>
          <ng-template #noInterventions><p class="small muted" style="margin:0">No clinical interventions recorded yet.</p></ng-template>

          <h4>Activities</h4>
          <ul *ngIf="plan.activities?.length; else noActivities"><li *ngFor="let a of plan.activities">{{ a }}</li></ul>
          <ng-template #noActivities>
            <p class="small muted" style="margin:0">No patient activities scheduled for this plan yet — interventions above are the clinical side of the plan.</p>
          </ng-template>

          <h4>Lifestyle</h4>
          <ul *ngIf="plan.lifestyle?.length; else noLifestyle"><li *ngFor="let l of plan.lifestyle">{{ l }}</li></ul>
          <ng-template #noLifestyle><p class="small muted" style="margin:0">No lifestyle guidance recorded yet.</p></ng-template>
        </div>

        <!-- monitoring / follow-up / medications -->
        <div class="card">
          <div class="card-title-row">
            <h3>Monitoring &amp; follow-up plan</h3>
            <span class="chip">{{ plan.priority || 'Routine' }} priority</span>
          </div>
          <p><strong>Monitoring:</strong> {{ plan.monitoringSchedule || 'No monitoring cadence recorded yet.' }}</p>
          <p><strong>Follow-up:</strong> {{ plan.followUpSchedule || 'No follow-up scheduled yet.' }}</p>
          <h4>Medications <span class="badge acknowledged">Requires doctor review</span></h4>
          <ul *ngIf="plan.medications?.length; else noMeds"><li *ngFor="let m of plan.medications">{{ m }}</li></ul>
          <ng-template #noMeds><p class="small muted" style="margin:0">No medication guidance on this plan.</p></ng-template>
          <p class="small muted">Medication records in the patient chart are never changed by plan generation.</p>
        </div>

        <!-- adherence + outcomes -->
        <div class="card">
          <div class="card-title-row"><h3>Adherence &amp; expected outcomes</h3>
            <button class="outline-btn" (click)="loadAdherence()">{{ adherence ? '↻ Refresh' : 'Load adherence' }}</button></div>
          <div *ngIf="adherence; else noAdh">
            <div class="row" style="gap:1.4rem">
              <div><div class="small muted">Current</div><div class="risk-score">{{ adherence.currentAdherence }}%</div></div>
              <div><div class="small muted">Target</div><strong>{{ adherence.targetAdherence }}%</strong></div>
              <div><div class="small muted">Trend</div><strong>{{ adherence.trend }}</strong></div>
            </div>
            <table class="rows-static" style="margin-top:0.8rem" *ngIf="adherence.history.length">
              <thead><tr><th>Week</th><th>Adherence</th></tr></thead>
              <tbody><tr *ngFor="let h of adherence.history"><td>{{ h.week }}</td><td>{{ h.adherence }}%</td></tr></tbody>
            </table>
            <div *ngIf="adherence.missedActivities.length">
              <h4>Missed activities</h4>
              <ul><li *ngFor="let m of adherence.missedActivities">{{ m }}</li></ul>
            </div>
          </div>
          <ng-template #noAdh>
            <div class="empty" style="padding:1rem">
              <span class="empty-icon">◔</span><h3>Adherence tracking not loaded</h3>
              <p>Open adherence tracking to see weekly adherence for this plan.</p>
            </div>
          </ng-template>
          <h4>Expected outcomes</h4>
          <ul>
            <li *ngFor="let g of plan.goals">Target: {{ g }}</li>
          </ul>
        </div>

        <!-- AI reasoning -->
        <div class="card">
          <div class="card-title-row"><h3>AI reasoning</h3></div>
          <p>{{ plan.aiReasoning }}</p>
          <p class="small muted"><strong>Guidelines (references):</strong> {{ plan.guidelineReferences }}</p>
          <p *ngIf="plan.modificationNotes" class="notice">Modification notes: {{ plan.modificationNotes }}</p>
        </div>

        <!-- approval history -->
        <div class="card">
          <div class="card-title-row"><h3>Doctor approval &amp; version history</h3></div>
          <table class="responsive rows-static" *ngIf="plan.approvals?.length; else noApprovals">
            <thead><tr><th>Doctor</th><th>Action</th><th>When</th><th>Notes</th></tr></thead>
            <tbody>
              <tr *ngFor="let a of plan.approvals">
                <td data-label="Doctor">{{ a.provider || assignedDoctor }}</td>
                <td data-label="Action"><span class="badge" [class]="'badge ' + (a.action | lowercase)">{{ pretty(a.action) }}</span></td>
                <td data-label="When" class="small muted">{{ a.timestamp | date: 'short' }}</td>
                <td data-label="Notes" class="small">{{ a.notes || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <ng-template #noApprovals>
            <div class="empty" style="padding:1rem"><p>No approval events yet — the plan is awaiting doctor review.</p></div>
          </ng-template>
          <p class="small muted" *ngIf="plan.previousVersion">Previous version snapshot: {{ plan.previousVersion }}</p>
        </div>
      </div>

      <div class="card" *ngIf="plan" style="margin-top:1rem">
        <div class="card-title-row">
          <h3>Download</h3>
          <div class="grid-actions">
            <button class="btn" (click)="downloadPdf()">⬇ Download Care Plan (PDF)</button>
            <button class="outline-btn" (click)="downloadCsvFile()">⬇ Download CSV</button>
          </div>
        </div>
        <p class="small muted">
          The PDF contains the patient summary, risk summary, goals, interventions, monitoring plan, follow-up plan,
          adherence, approval history and AI explanation. No authentication data is included.
        </p>
      </div>
    </div>
  `,
})
export class CarePlanDetailComponent implements OnInit {
  plan: any;
  patient: any;
  risk: any;
  adherence: any;
  loadError = '';
  modifying = false;
  modifyGoal = '';
  modifyNotes = '';
  private id = '';
  private auth = inject(AuthService);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: Api,
    private toast: ToastService,
    private confirm: ConfirmService
  ) {}

  ngOnInit() {
    // Re-load whenever the route id changes (e.g. patient switching between two
    // plans) — Angular re-uses this component, so ngOnInit alone would show the
    // previous patient's data.
    this.route.paramMap.subscribe((params) => {
      const next = params.get('id') ?? '';
      if (next === this.id) return;
      this.id = next;
      this.resetView();
      this.load();
    });
  }

  /** Clears everything derived from the previous plan so no stale patient data lingers. */
  private resetView() {
    this.plan = null;
    this.patient = null;
    this.risk = null;
    this.adherence = null;
    this.loadError = '';
    this.modifying = false;
  }

  load() {
    this.loadError = '';
    this.api.get<any>(`/care-plans/${this.id}`).subscribe({
      next: (p) => {
        this.plan = p;
        this.loadPatient(p.patientId);
        this.loadRisk(p.patientId);
        this.loadAdherence();
      },
      error: (e) => (this.loadError = e?.error?.message ?? 'Care plan not found.'),
    });
  }

  private loadPatient(patientId: string) {
    if (!patientId) {
      this.patient = null;
      return;
    }
    this.api.get<any>(`/patients/${patientId}`).subscribe({
      next: (p) => (this.patient = p),
      error: () => (this.patient = null),
    });
  }

  private loadRisk(patientId: string) {
    if (!patientId) {
      this.risk = null;
      return;
    }
    this.api.get<any>(`/risk-predictions/patient/${patientId}`).subscribe({
      next: (list) => (this.risk = Array.isArray(list) ? list[0] : list),
      error: () => (this.risk = null),
    });
  }

  loadAdherence() {
    this.api.get<any>(`/care-plans/${this.id}/adherence`).subscribe({
      next: (d) => (this.adherence = d),
      error: () => (this.adherence = null),
    });
  }

  get age(): number {
    const dob = this.patient?.dateOfBirth;
    if (!dob) return 0;
    const y = new Date(dob).getFullYear();
    return Number.isFinite(y) ? new Date().getFullYear() - y : 0;
  }

  /** Initials for the patient avatar — always renders something meaningful. */
  get patientInitials(): string {
    const name = (this.plan?.patientName ?? this.patient?.firstName ?? '').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

  /**
   * The doctor who owns this plan. Falls back through the plan's own assignment,
   * then the patient's attending — never renders blank/undefined/N/A.
   */
  get assignedDoctor(): string {
    return (
      this.plan?.providerName ||
      this.patient?.providerName ||
      this.plan?.approvals?.slice().reverse()?.find((a: any) => a?.provider)?.provider ||
      'Unassigned'
    );
  }

  /**
   * Clinical triage priority. The plan's own priority (written by the backend from
   * the patient's risk profile) wins; the patient's risk status is the fallback for
   * plans created before that field existed.
   */
  get priority(): string {
    const explicit = (this.plan?.priority ?? '').toUpperCase();
    if (explicit) return explicit.charAt(0) + explicit.slice(1).toLowerCase();
    const risk = (this.patient?.riskStatus ?? this.risk?.riskCategory ?? '').toUpperCase();
    if (risk === 'VERY_HIGH' || risk === 'HIGH') return 'High';
    if (risk === 'MEDIUM') return 'Medium';
    return 'Routine';
  }

  /** Explicit doctor-review wording so the status is never ambiguous in the UI. */
  get doctorReviewStatus(): string {
    switch (this.plan?.status) {
      case 'AI_GENERATED':
        return 'Awaiting review';
      case 'PENDING_REVIEW':
      case 'IN_REVIEW':
        return 'In review';
      case 'MODIFIED':
        return 'Modified — awaiting approval';
      case 'APPROVED':
        return 'Approved — not yet active';
      case 'ACTIVE':
        return 'Reviewed & signed';
      case 'REJECTED':
        return 'Rejected by doctor';
      case 'COMPLETED':
        return 'Completed';
      default:
        return 'Not reviewed yet';
    }
  }

  /** Latest meaningful note on the plan, with a real empty state. */
  get planNote(): string {
    if (this.plan?.modificationNotes?.trim()) return this.plan.modificationNotes.trim();
    const approvals = Array.isArray(this.plan?.approvals) ? this.plan.approvals : [];
    const withNotes = approvals.slice().reverse().find((a: any) => a?.notes?.trim());
    if (withNotes) return withNotes.notes.trim();
    return '';
  }

  get stepIndex(): number {
    switch (this.plan?.status) {
      case 'AI_GENERATED':
      case 'PENDING_REVIEW':
        return 1;
      case 'MODIFIED':
      case 'IN_REVIEW':
        return 2;
      case 'APPROVED':
      case 'REJECTED':
        return 3;
      case 'ACTIVE':
      case 'COMPLETED':
        return 4;
      default:
        return 1;
    }
  }

  get stepHint(): string {
    switch (this.plan?.status) {
      case 'AI_GENERATED':
        return 'Draft generated from the latest risk prediction — send it to a doctor for review.';
      case 'PENDING_REVIEW':
      case 'IN_REVIEW':
        return 'Awaiting doctor review. Modifications create a new audited version.';
      case 'MODIFIED':
        return 'Modified by the care team — ready for doctor approval.';
      case 'APPROVED':
        return 'Approved. Sign & Activate to make the plan active.';
      case 'REJECTED':
        return 'Rejected. Generate a new plan to restart the workflow.';
      case 'ACTIVE':
        return 'Active plan — adherence and outcomes are tracked.';
      case 'COMPLETED':
        return 'Plan completed successfully.';
      default:
        return '';
    }
  }

  get canModify(): boolean {
    return ['AI_GENERATED', 'PENDING_REVIEW', 'MODIFIED', 'IN_REVIEW'].includes(this.plan?.status);
  }
  get canApprove(): boolean {
    return ['AI_GENERATED', 'MODIFIED', 'PENDING_REVIEW', 'IN_REVIEW', 'APPROVED'].includes(this.plan?.status);
  }
  get canSign(): boolean {
    return ['APPROVED', 'MODIFIED', 'PENDING_REVIEW', 'IN_REVIEW'].includes(this.plan?.status);
  }

  askApprove() {
    this.confirm
      .confirm({ title: 'Approve care plan', message: 'Approve this care plan for activation?', confirmLabel: 'Approve' })
      .then((ok) => {
        if (ok) this.transition('/approve', 'APPROVED', 'Care plan approved');
      });
  }
  askReject() {
    this.confirm
      .confirm({
        title: 'Reject care plan',
        message: 'Reject this care plan? This will be recorded in the audit log.',
        confirmLabel: 'Reject',
        danger: true,
      })
      .then((ok) => {
        if (ok) this.transition('/reject', 'REJECTED', 'Care plan rejected');
      });
  }
  askSign() {
    this.confirm
      .confirm({
        title: 'Sign & activate',
        message: 'Doctor signature activates this care plan immediately.',
        confirmLabel: 'Sign & Activate',
      })
      .then((ok) => {
        if (ok) this.transition('/sign', 'ACTIVE', 'Care plan signed and activated');
      });
  }
  askComplete() {
    this.confirm
      .confirm({ title: 'Complete care plan', message: 'Mark this care plan as completed?', confirmLabel: 'Complete' })
      .then((ok) => {
        if (ok) this.transition('/complete', 'COMPLETED', 'Care plan completed');
      });
  }

  transition(path: string, label: string, toastMsg: string) {
    this.api.post(`/care-plans/${this.id}${path}`, { action: label, notes: '' }).subscribe({
      next: () => {
        this.toast.success(toastMsg);
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'Action failed'),
    });
  }

  openModify() {
    this.modifyGoal = this.plan.goal;
    this.modifyNotes = '';
    this.modifying = true;
  }

  saveModify() {
    this.api.put(`/care-plans/${this.id}`, { goal: this.modifyGoal, notes: this.modifyNotes }).subscribe({
      next: () => {
        this.modifying = false;
        this.toast.success('Care plan modified — pending doctor review');
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'Modify failed'),
    });
  }

  // ---------------------------------------------------------------- download
  private sections(): PdfSection[] {
    const p = this.plan;
    const pt = this.patient;
    const r = this.risk;
    return [
      {
        heading: 'Patient Summary',
        lines: [
          `Patient: ${p.patientName}`,
          pt ? `Age/Sex: ${this.age}/${pt.gender}` : 'Age/Sex: n/a',
          pt ? `MRN: ${pt.medicalIdentifier}` : 'MRN: n/a',
          `Assigned doctor: ${this.assignedDoctor}`,
          p.assignedAt ? `Assigned date: ${new Date(p.assignedAt).toISOString().slice(0, 10)}` : '',
          p.careManagerName ? `Care manager: ${p.careManagerName}` : '',
          `Priority: ${this.priority}`,
          pt ? `Risk status: ${pt.riskStatus}` : '',
          `Plan status: ${pretty(p.status)} · created ${new Date(p.createdAt).toISOString().slice(0, 10)}`,
          this.planNote ? `Note: ${this.planNote}` : 'Note: No additional note',
        ].filter((l) => l !== ''),
      },
      {
        heading: 'Risk Summary',
        lines: r
          ? [
              `Overall risk score: ${r.overallScore} (${r.riskCategory})`,
              `Cardiovascular 10-year risk: ${r.cardiovascularRisk10y}%`,
              `Diabetes complication risk: ${r.diabetesComplicationRisk}%`,
              `Confidence: ${r.confidence} · model version: ${r.modelVersion}`,
              `Trend: ${r.trend ?? 'n/a'} · predicted ${r.predictedAt ? new Date(r.predictedAt).toISOString().slice(0, 10) : 'n/a'}`,
            ]
          : ['No stored risk prediction for this patient.'],
      },
      { heading: 'Care Plan Goals', lines: p.goals ?? [] },
      { heading: 'Interventions', lines: p.interventions ?? [] },
      { heading: 'Patient Activities', lines: (p.activities ?? []).length ? p.activities : ['No scheduled activities recorded.'] },
      { heading: 'Monitoring Plan', lines: [p.monitoringSchedule ?? '—'] },
      { heading: 'Follow-up Plan', lines: [p.followUpSchedule ?? '—'] },
      {
        heading: 'Adherence',
        lines: [
          `Current adherence: ${p.adherenceScore ?? 0}%`,
          ...(this.adherence?.history ?? []).map((h: any) => `${h.week}: ${h.adherence}%`),
          `Trend: ${this.adherence?.trend ?? 'not tracked yet'}`,
        ],
      },
      {
        heading: 'Approval History',
        lines: (p.approvals ?? []).length
          ? (p.approvals as any[]).map(
              (a) => `${new Date(a.timestamp).toISOString().replace('T', ' ').slice(0, 16)} — ${a.action} by ${a.provider} ${a.notes ? `(${a.notes})` : ''}`
            )
          : ['No approval events yet.'],
      },
      {
        heading: 'AI Explanation',
        lines: [p.aiReasoning ?? '—', `Guidelines: ${p.guidelineReferences ?? '—'}`],
      },
      {
        heading: 'Document',
        lines: ['Generated by MediSphere Cognitive Twin.'],
      },
    ];
  }

  downloadPdf() {
    if (!this.plan) return;
    const blob = buildPdf(
      'MediSphere Cognitive Twin — Care Plan',
      `Patient: ${this.plan.patientName} · Goal: ${this.plan.goal}`,
      this.sections()
    );
    saveBlob(`medisphere-care-plan-${this.id}.pdf`, blob);
    this.toast.success('Care plan PDF downloaded');
  }

  downloadCsvFile() {
    if (!this.plan) return;
    const p = this.plan;
    const rows: unknown[][] = [
      ['care_plan_id', p.id],
      ['patient', p.patientName],
      ['patient_id', p.patientId],
      ['goal', p.goal],
      ['status', p.status],
      ['assigned_doctor', this.assignedDoctor],
      ['assigned_at', p.assignedAt ?? p.createdAt],
      ['care_manager', p.careManagerName ?? ''],
      ['priority', this.priority],
      ['note', this.planNote || 'No additional note'],
      ['adherence_percent', p.adherenceScore ?? 0],
      ['created_at', p.createdAt],
      ['monitoring_schedule', p.monitoringSchedule],
      ['follow_up_schedule', p.followUpSchedule],
      ['ai_reasoning', p.aiReasoning],
      ...(p.goals ?? []).map((g: string) => ['goal_item', g]),
      ...(p.interventions ?? []).map((g: string) => ['intervention', g]),
      ...(p.activities ?? []).map((g: string) => ['activity', g]),
      ...(p.medications ?? []).map((g: string) => ['medication_note', g]),
      ...(p.approvals ?? []).map((a: any) => ['approval', `${a.action} by ${a.provider} at ${a.timestamp}`]),
      ['document_source', 'MediSphere Cognitive Twin'],
    ];
    downloadCsv(`medisphere-care-plan-${this.id}.csv`, ['field', 'value'], rows);
    this.toast.success('Care plan CSV downloaded');
  }

  pretty(status: string): string {
    return pretty(status);
  }
}

/* ==========================================================================
   Generator
   ========================================================================== */
@Component({
  standalone: true,
  imports: [NgIf, NgFor, FormsModule],
  template: `
    <div class="card-title-row">
      <div>
        <span class="pill">AI-assisted workflow</span>
        <h1 style="margin-top:0.4rem">Care Plan Generator</h1>
        <p class="card-sub">Drafts a plan from the patient's risk prediction, vitals, labs, conditions and existing
          medications — then routes it for doctor review.</p>
      </div>
      <a class="outline-btn" routerLink="/care-plans">← All care plans</a>
    </div>

    <div class="grid cols-2">
      <form class="card" (ngSubmit)="generate()">
        <label class="field" for="gen-patient">Patient</label>
        <select id="gen-patient" class="input" [(ngModel)]="patientId" name="patientId">
          <option value="">Select a patient…</option>
          <option *ngFor="let p of patients" [value]="p.id">
            {{ p.lastName }}, {{ p.firstName }} — {{ p.medicalIdentifier || p.id }}
          </option>
        </select>

        <label class="field" style="margin-top:0.8rem" for="gen-goal">Primary goal (optional)</label>
        <input id="gen-goal" class="input" [(ngModel)]="goal" name="goal"
               placeholder="e.g. Improve cardiometabolic risk profile" />

        <button class="btn block" style="margin-top:1.1rem" type="submit" [disabled]="loading || !patientId">
          <span class="spinner" *ngIf="loading"></span>
          {{ loading ? 'Generating…' : 'Generate care plan' }}
        </button>

        <p class="notice" *ngIf="done">✓ Care plan generated (AI_GENERATED). Awaiting doctor review.</p>
        <p class="error-box" *ngIf="error">{{ error }}</p>
      </form>

      <div class="card">
        <h3>What happens next</h3>
        <div class="stepper">
          <div class="step done"><div class="step-dot">✓</div><div class="step-label">Generated</div></div>
          <div class="step current"><div class="step-dot">2</div><div class="step-label">Review</div></div>
          <div class="step"><div class="step-dot">3</div><div class="step-label">Approval</div></div>
          <div class="step"><div class="step-dot">4</div><div class="step-label">Active</div></div>
        </div>
        <div class="stat-list">
          <div class="stat-row"><span class="sr-key">Inputs</span><span class="sr-val">Risk prediction, vitals, labs, conditions, twin</span></div>
          <div class="stat-row"><span class="sr-key">Medication changes</span><span class="sr-val"><span class="badge acknowledged">Manual approval only</span></span></div>
          <div class="stat-row"><span class="sr-key">Audit</span><span class="sr-val">CARE_PLAN_GENERATED event written</span></div>
          <div class="stat-row"><span class="sr-key">Download</span><span class="sr-val">PDF &amp; CSV available on the plan page</span></div>
        </div>
      </div>
    </div>
  `,
})
export class CarePlanGenerateComponent implements OnInit {
  patientId = '';
  goal = '';
  loading = false;
  done = false;
  error = '';
  patients: any[] = [];
  constructor(private api: Api, private toast: ToastService, private router: Router) {}

  ngOnInit() {
    this.api.get<any>('/patients?size=100&sort=name').subscribe({
      next: (r) => (this.patients = r.content ?? []),
      error: () => (this.error = 'Could not load patients.'),
    });
  }

  generate() {
    this.error = '';
    if (!this.patientId) {
      this.error = 'Please select a patient.';
      return;
    }
    this.loading = true;
    this.api.post<any>('/care-plans/generate', { patientId: this.patientId, goal: this.goal }).subscribe({
      next: (plan) => {
        this.done = true;
        this.toast.success('Care plan generated — pending doctor review');
        this.router.navigate(['/care-plans', plan.id]);
      },
      error: (e) => (this.error = e?.error?.message ?? 'Generation failed'),
      complete: () => (this.loading = false),
    });
  }
}

/* ==========================================================================
   Adherence
   ========================================================================== */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, ProgressComponent],
  template: `
    <h1>Adherence Tracking</h1>
    <div class="card" *ngIf="data; else noData">
      <div class="card-title-row">
        <span class="badge" [class]="'badge ' + (data.trend === 'IMPROVING' ? 'active' : data.trend === 'DECLINING' ? 'critical' : 'acknowledged')">
          {{ data.trend }}
        </span>
        <a class="outline-btn" [routerLink]="['/care-plans', data.carePlanId]">Open care plan</a>
      </div>
      <div class="row" style="gap:1.6rem; margin-bottom:0.8rem">
        <div><div class="small muted">Current adherence</div><div class="risk-score">{{ data.currentAdherence }}%</div></div>
        <div><div class="small muted">Target</div><strong>{{ data.targetAdherence }}%</strong></div>
      </div>
      <app-progress [value]="data.currentAdherence" [tone]="data.currentAdherence < 50 ? 'danger' : data.currentAdherence < 85 ? 'warn' : ''"></app-progress>

      <table class="rows-static" *ngIf="data.history.length" style="margin-top:1rem">
        <thead><tr><th>Week</th><th>Adherence</th></tr></thead>
        <tbody><tr *ngFor="let h of data.history"><td>{{ h.week }}</td><td>{{ h.adherence }}%</td></tr></tbody>
      </table>

      <div *ngIf="data.missedActivities.length">
        <h4>Missed activities</h4>
        <ul><li *ngFor="let m of data.missedActivities">{{ m }}</li></ul>
      </div>
      <p class="small muted" *ngIf="data.missedActivities?.length">Review the missed activities above with the patient.</p>
    </div>
    <ng-template #noData>
      <div class="empty"><span class="empty-icon">◔</span><h3>Adherence data unavailable</h3><p>Open a care plan to load adherence.</p></div>
    </ng-template>
  `,
})
export class AdherenceComponent implements OnInit {
  data: any;
  constructor(private route: ActivatedRoute, private api: Api) {}
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.data = null;
      if (!id) return;
      this.api.get<any>(`/care-plans/${id}/adherence`).subscribe({
        next: (d) => (this.data = d),
        error: () => (this.data = null),
      });
    });
  }
}

/** Words that must stay upper-case when a snake_case token is humanised. */
const ACRONYMS: Record<string, string> = {
  ai: 'AI',
  fhir: 'FHIR',
  bp: 'BP',
  ecg: 'ECG',
  mrn: 'MRN',
  spo2: 'SpO2',
  id: 'ID',
  o2: 'O2',
};

function pretty(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w) => ACRONYMS[w] ?? w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
