import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DatePipe, LowerCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { AuthService } from '../core/auth';
import { ProgressComponent } from '../shared/charts';
import { humanize } from '../shared/text';

@Component({
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, DatePipe, LowerCasePipe, ProgressComponent],
  template: `
    <div *ngIf="loading" class="grid kpi-grid">
      <div class="card skeleton" *ngFor="let k of [1,2,3]" style="min-height:140px"></div>
    </div>

    <div *ngIf="error" class="error-box">{{ error }} <button class="btn sm secondary" (click)="load()">Retry</button></div>

    <div *ngIf="!loading && patient">
      <div class="card">
        <div class="card-title-row">
          <h1>{{ patient.firstName }} {{ patient.lastName }}</h1>
          <span class="badge" [class]="'badge ' + (patient.riskStatus || 'low').toLowerCase()">{{ patient.riskStatus }} RISK</span>
        </div>
        <div style="display:flex; gap:1.5rem; flex-wrap:wrap; color:var(--ink-soft)">
          <span>ID: {{ patient.id }}</span>
          <span>DOB: {{ patient.dateOfBirth }}</span>
          <span>Gender: {{ patient.gender }}</span>
          <span>Assigned doctor: {{ patient.providerName || 'Not yet assigned' }}</span>
          <span>Consent: {{ patient.consentStatus }}</span>
          <span>MRN: {{ patient.medicalIdentifier }}</span>
        </div>
      </div>

      <div class="tabs" style="margin-top:1rem">
        <button class="tab" *ngFor="let t of tabs" [class.active]="tab === t" (click)="tab = t">{{ t }}</button>
      </div>

      <div class="card" *ngIf="tab === 'Overview'">
        <h3>Overview</h3>
        <div class="grid cols-2">
          <div>
            <p>Contact: {{ patient.email }} · {{ patient.phone }}</p>
            <p>Address: {{ patient.address }}</p>
            <p>Medical identifier: {{ patient.medicalIdentifier }}</p>
            <p *ngIf="twin">Twin status: {{ twin.status }} · Completeness: {{ pct(twin.completenessScore) }}%</p>
            <p *ngIf="twin && twin.conditions.length">Conditions: {{ twin.conditions.join(', ') }}</p>
            <p *ngIf="twin && twin.medications.length">Medications: {{ twin.medications.join(', ') }}</p>
          </div>
          <div>
            <p *ngIf="latestVitals.length"><strong>Latest vitals</strong></p>
            <ul>
              <li *ngFor="let v of latestVitals">{{ v.type }}: {{ v.value }} {{ v.unit }}</li>
            </ul>
          </div>
        </div>
        <a class="btn" [routerLink]="['/patients', patient.id, 'digital-twin']">Open Digital Twin</a>
      </div>

      <div class="card" *ngIf="tab === 'Vitals'">
        <h3>Vitals History</h3>
        <table *ngIf="vitals.length">
          <tr><th>Type</th><th>Value</th><th>Unit</th><th>Time</th></tr>
          <tr *ngFor="let v of vitals.slice(0, 20)"><td>{{ v.type }}</td><td>{{ v.value }}</td><td>{{ v.unit }}</td><td>{{ v.timestamp | date: 'short' }}</td></tr>
        </table>
        <div class="empty" *ngIf="!vitals.length">No vitals recorded yet.</div>
      </div>

      <div class="card" *ngIf="tab === 'Labs'">
        <h3>Lab Results</h3>
        <table *ngIf="labs.length">
          <tr><th>Test</th><th>Value</th><th>Unit</th><th>Reference</th><th>Status</th></tr>
          <tr *ngFor="let l of labs"><td>{{ l.testName }}</td><td>{{ l.value }}</td><td>{{ l.unit }}</td><td>{{ l.referenceRange }}</td><td>{{ l.status }}</td></tr>
        </table>
        <div class="empty" *ngIf="!labs.length">No lab results yet.</div>
      </div>

      <div class="card" *ngIf="tab === 'Risk Predictions'">
        <div class="card-title-row">
          <h3>Risk Predictions</h3>
          <a class="btn sm secondary" [routerLink]="['/risk-predictions', patient.id]">Open risk detail →</a>
        </div>
        <table class="responsive rows-static" *ngIf="risks.length">
          <thead><tr><th>Score</th><th>CV 10y</th><th>Diabetes</th><th>Category</th><th>Trend</th><th>Confidence</th><th>Model</th></tr></thead>
          <tbody>
            <tr *ngFor="let r of risks">
              <td data-label="Score"><span class="risk-score" style="font-size:1.2rem">{{ r.overallScore ?? 0 }}</span></td>
              <td data-label="CV 10y">{{ r.cardiovascularRisk10y }}%</td>
              <td data-label="Diabetes">{{ r.diabetesComplicationRisk }}%</td>
              <td data-label="Category"><span class="badge" [class]="'badge ' + (r.riskCategory | lowercase)">{{ r.riskCategory }}</span></td>
              <td data-label="Trend">{{ r.trend }}</td>
              <td data-label="Confidence">{{ r.confidence }}</td>
              <td data-label="Model" class="mono small">{{ r.modelVersion }}</td>
            </tr>
          </tbody>
        </table>
        <div class="empty" *ngIf="!risks.length">
          <span class="empty-icon">◔</span>
          <h3>No risk prediction available</h3>
          <p>This patient does not have a current risk prediction.</p>
          <a class="btn" [routerLink]="['/risk-predictions', patient.id]">Generate Prediction</a>
        </div>
      </div>

      <div class="card" *ngIf="tab === 'Care Plans'">
        <div class="card-title-row">
          <h3>Care Plans</h3>
          <a class="btn sm" routerLink="/care-plans/generate">+ Generate with AI</a>
        </div>
        <table class="responsive rows-static" *ngIf="plans.length; else noPlansForPatient">
          <thead><tr><th>Goal</th><th>Status</th><th>Doctor</th><th>Adherence</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let c of plans">
              <td data-label="Goal">{{ c.goal }}</td>
              <td data-label="Status"><span class="badge" [class]="'badge ' + c.status.toLowerCase()">{{ pretty(c.status) }}</span></td>
              <td data-label="Doctor">{{ c.providerName || 'Unassigned' }}</td>
              <td data-label="Adherence" style="min-width:130px">
                <app-progress [value]="c.adherenceScore ?? 0" [tone]="(c.adherenceScore ?? 0) < 50 ? 'warn' : ''"></app-progress>
              </td>
              <td data-label="Actions"><a class="btn sm secondary" [routerLink]="['/care-plans', c.id]">Open</a></td>
            </tr>
          </tbody>
        </table>
        <ng-template #noPlansForPatient>
          <div class="empty"><span class="empty-icon">✚</span><h3>No care plan</h3>
            <p>This patient does not have a current care plan.</p>
            <a class="btn" routerLink="/care-plans/generate">Generate care plan</a></div>
        </ng-template>
      </div>

      <div class="card" *ngIf="tab === 'FHIR Resources'">
        <h3>FHIR Resources</h3>
        <table *ngIf="fhir.length">
          <tr><th>Type</th><th>Resource ID</th><th>Validation</th></tr>
          <tr *ngFor="let f of fhir"><td>{{ f.resourceType }}</td><td>{{ f.resourceId }}</td><td>{{ f.validationStatus }}</td></tr>
        </table>
        <div class="empty" *ngIf="!fhir.length">No FHIR resources synced.</div>
      </div>

      <div class="card" *ngIf="tab === 'Timeline'">
        <h3>Timeline</h3>
        <div class="timeline">
          <div class="timeline-item" *ngFor="let e of timeline">
            <strong>{{ e.label }}</strong>
            <span style="color:var(--ink-soft)">{{ e.detail }}</span>
            <span style="color:var(--muted)"> · {{ e.time | date: 'short' }}</span>
          </div>
        </div>
        <div class="empty" *ngIf="!timeline.length">No timeline events yet.</div>
      </div>

      <div class="card" *ngIf="tab === 'Audit History'">
        <h3>Audit History</h3>
        <table *ngIf="audit.length">
          <tr><th>User</th><th>Action</th><th>Resource</th><th>Result</th><th>Time</th></tr>
          <tr *ngFor="let a of audit"><td>{{ a.user }}</td><td>{{ a.action }}</td><td>{{ a.resource }}</td><td>{{ a.result }}</td><td>{{ a.timestamp | date: 'short' }}</td></tr>
        </table>
        <div class="empty" *ngIf="!audit.length">No audit events for this patient yet.</div>
      </div>

      <div class="card" *ngIf="tab === 'Digital Twin'">
        <a class="btn" [routerLink]="['/patients', patient.id, 'digital-twin']">Open interactive Digital Twin →</a>
      </div>
      <div class="card" *ngIf="tab === 'Conditions'">
        <h3>Conditions</h3>
        <ul><li *ngFor="let c of twin?.conditions || []">{{ c }}</li></ul>
        <div class="empty" *ngIf="!twin?.conditions?.length">No conditions recorded.</div>
      </div>
      <div class="card" *ngIf="tab === 'Medications'">
        <h3>Medications</h3>
        <ul><li *ngFor="let m of twin?.medications || []">{{ m }}</li></ul>
        <div class="empty" *ngIf="!twin?.medications?.length">No medications recorded.</div>
      </div>
      <div class="card" *ngIf="tab === 'Alerts'">
        <div class="card-title-row">
          <h3>Alerts</h3>
          <a class="outline-btn" [routerLink]="['/alerts']">Open alerts console →</a>
        </div>
        <table class="responsive rows-static" *ngIf="alerts.length; else noPatientAlerts">
          <thead><tr><th>Severity</th><th>Alert</th><th>Value</th><th>Status</th><th>Note</th><th>Time</th></tr></thead>
          <tbody>
            <tr *ngFor="let a of alerts; let i = index" [style.--i]="i">
              <td data-label="Severity"><span class="sev-dot" [class]="(a.category || '').toLowerCase()"></span>{{ a.category }}</td>
              <td data-label="Alert">{{ a.type }}</td>
              <td data-label="Value" class="number">{{ a.value }}</td>
              <td data-label="Status"><span class="badge" [class]="'badge ' + a.status.toLowerCase()">{{ pretty(a.status) }}</span></td>
              <td data-label="Note" class="small">{{ a.clinicalNote || 'No additional note' }}</td>
              <td data-label="Time" class="small muted">{{ a.createdAt | date: 'short' }}</td>
            </tr>
          </tbody>
        </table>
        <ng-template #noPatientAlerts>
          <div class="empty"><span class="empty-icon">✓</span><h3>No alerts for this patient</h3>
            <p>Threshold rules are evaluated on every incoming vital reading.</p></div>
        </ng-template>
      </div>
    </div>
  `,
})
export class PatientDetailComponent implements OnInit {
  patient: any;
  twin: any;
  vitals: any[] = [];
  labs: any[] = [];
  risks: any[] = [];
  plans: any[] = [];
  alerts: any[] = [];
  fhir: any[] = [];
  audit: any[] = [];
  timeline: { label: string; detail: string; time: any }[] = [];
  tab = 'Overview';
  tabs = ['Overview', 'Digital Twin', 'Vitals', 'Labs', 'Conditions', 'Medications', 'Risk Predictions', 'Alerts', 'Care Plans', 'FHIR Resources', 'Timeline', 'Audit History'];
  loading = true;
  error = '';
  private id = '';
  constructor(private route: ActivatedRoute, private api: Api, private router: Router, private auth: AuthService) {}

  /** Display text for a stored status token (AI_GENERATED → "AI Generated"). */
  pretty(value: string): string {
    return humanize(value);
  }

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    // "/patients/SELF" is the placeholder link for the signed-in patient's own record
    if (this.id === 'SELF') {
      const own = this.auth.currentUser?.patientId;
      if (own) {
        void this.router.navigate(['/patients', own], { replaceUrl: true });
      } else {
        void this.router.navigate(['/patients/360'], { replaceUrl: true });
      }
      return;
    }
    this.load();
  }

  get latestVitals() { return this.vitals.slice(0, 5); }

  /** 0..1 completeness fraction → whole percent. */
  pct(v?: number): number { return Math.round(Number(v ?? 0) * 100); }

  load() {
    this.loading = true;
    this.error = '';
    this.api.get<any>(`/patients/${this.id}`).subscribe({
      next: (p) => {
        this.patient = p;
        // remember the most recent record for the "Patient 360" navigation entry
        try {
          localStorage.setItem('ms_last_patient', this.id);
        } catch {
          /* ignore */
        }
      },
      error: () => (this.error = 'Patient not found.'),
      complete: () => (this.loading = false),
    });
    this.api.get<any>(`/health-twins/${this.id}`).subscribe({ next: (t) => (this.twin = t), error: () => {} });
    this.api.get<any[]>(`/vitals/${this.id}`).subscribe({ next: (v) => { this.vitals = v; this.buildTimeline(); }, error: () => {} });
    this.api.get<any[]>(`/labs/${this.id}`).subscribe({ next: (l) => (this.labs = l), error: () => {} });
    this.api.get<any[]>(`/risk-predictions/patient/${this.id}`).subscribe({ next: (r) => { this.risks = r; this.buildTimeline(); }, error: () => {} });
    this.api.get<any[]>(`/care-plans/patient/${this.id}`).subscribe({ next: (c) => { this.plans = c; this.buildTimeline(); }, error: () => {} });
    this.api.get<any>(`/alerts?patientId=${this.id}&size=50`).subscribe({ next: (r) => (this.alerts = r.content ?? []), error: () => (this.alerts = []) });
    this.api.get<any[]>(`/fhir/resources?patientId=${this.id}`).subscribe({ next: (f) => { this.fhir = f; this.buildTimeline(); }, error: () => {} });
    this.api.get<any>(`/audit-logs?size=50`).subscribe({
      next: (r) => {
        this.audit = (r.content ?? []).filter((a: any) => a.resourceId === this.id);
        this.buildTimeline();
      },
      error: () => this.buildTimeline(),
    });
  }

  private buildTimeline() {
    const events: { label: string; detail: string; time: any }[] = [];
    for (const v of this.vitals.slice(0, 5)) {
      events.push({ label: 'Vital received', detail: `${v.type} ${v.value} ${v.unit}`, time: v.timestamp });
    }
    for (const r of this.risks.slice(0, 3)) {
      events.push({ label: 'Risk prediction', detail: `Score ${r.overallScore} (${r.riskCategory})`, time: r.predictedAt });
    }
    for (const c of this.plans.slice(0, 3)) {
      events.push({ label: 'Care plan', detail: `${c.goal} — ${c.status}`, time: c.createdAt });
    }
    for (const f of this.fhir.slice(0, 3)) {
      events.push({ label: 'FHIR sync', detail: `${f.resourceType} ${f.validationStatus}`, time: f.syncedAt });
    }
    for (const a of this.audit.slice(0, 5)) {
      events.push({ label: 'Audit', detail: `${a.action} by ${a.user}`, time: a.timestamp });
    }
    this.timeline = events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);
  }
}
