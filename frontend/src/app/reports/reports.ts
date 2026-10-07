import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, DatePipe } from '@angular/common';
import { Api } from '../core/api';
import { ToastService } from '../core/toast';
import { downloadAuthenticated } from '../shared/download';

/**
 * Reports library. Metadata (row counts) comes from the backend, and exports are
 * fetched with the JWT attached so the download is authenticated and audited
 * (REPORT_DOWNLOADED) — the URL never carries credentials.
 */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, DatePipe],
  template: `
    <div class="card-title-row">
      <div>
        <h1>Reports</h1>
        <p class="card-sub">CSV exports assembled server-side from persisted records, each download audited.</p>
      </div>
      <span class="chip">Generated {{ generatedAt | date: 'mediumTime' }}</span>
    </div>

    <div class="grid cols-3">
      <div class="card enter" *ngFor="let r of reports; let i = index" [style.--i]="i">
        <div class="card-title-row">
          <h3>{{ r.name }}</h3>
          <span class="badge low">{{ counts[r.type] ?? '…' }} rows</span>
        </div>
        <p class="small muted">{{ r.desc }}</p>
        <div class="stat-list" style="margin-top:0.6rem">
          <div class="stat-row"><span class="sr-key">Type</span><span class="sr-val mono small">{{ r.type }}</span></div>
          <div class="stat-row"><span class="sr-key">Format</span><span class="sr-val">CSV (UTF-8, BOM)</span></div>
          <div class="stat-row"><span class="sr-key">Audit</span><span class="sr-val">REPORT_DOWNLOADED event</span></div>
        </div>
        <button class="btn block" style="margin-top:0.9rem" (click)="download(r)" [disabled]="busy === r.type">
          <span class="spinner" *ngIf="busy === r.type"></span>
          {{ busy === r.type ? 'Preparing…' : '⬇ Download CSV' }}
        </button>
        <p class="error-box" *ngIf="errorByType[r.type]" style="margin-top:0.6rem">{{ errorByType[r.type] }}</p>
      </div>
    </div>

    <div class="card" style="margin-top:1rem">
      <h3>Report notes</h3>
      <ul>
        <li>Row counts are read live from MongoDB for your role's data scope.</li>
        <li>Reports are generated on the server; downloads trigger a <code>REPORT_DOWNLOADED</code> audit entry.</li>
        <li>PDF generation is intentionally server-side in production — this prototype ships CSV exports plus the
          care-plan PDF produced in the browser from backend data.</li>
      </ul>
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  generatedAt = new Date();
  busy = '';
  errorByType: Record<string, string> = {};
  counts: Record<string, number> = {};
  private toast = inject(ToastService);

  reports = [
    { name: 'Patient Risk Report', desc: 'Risk distribution across the patient cohort, including average risk score.', type: 'patient-risk' },
    { name: 'Population Health Report', desc: 'Conditions, demographics and risk bands across the patient population.', type: 'population-health' },
    { name: 'Alert Report', desc: 'Alert volume by severity, status, threshold breach and clinical note.', type: 'alerts' },
    { name: 'Care Plan Report', desc: 'Plan status, adherence score, doctor and creation dates.', type: 'care-plans' },
    { name: 'Monitoring Report', desc: 'The 50 most recent vital readings with device identifiers.', type: 'monitoring' },
    { name: 'Audit Report', desc: 'Up to 1,000 audit events: user, role, action, resource, result.', type: 'audit' },
    { name: 'FHIR Sync Report', desc: 'FHIR resource types, patients, validation status and sync times.', type: 'fhir' },
  ];

  constructor(private api: Api) {}

  ngOnInit() {
    this.reports.forEach((r) => {
      this.api.get<any>(`/reports?type=${r.type}`).subscribe({
        next: (meta) => {
          this.counts[r.type] = meta.rowCount ?? 0;
          this.generatedAt = new Date(meta.generatedAt ?? Date.now());
        },
        error: () => (this.counts[r.type] = 0),
      });
    });
  }

  download(r: { type: string; name: string }) {
    this.busy = r.type;
    delete this.errorByType[r.type];
    downloadAuthenticated(`/reports/export?type=${r.type}&format=csv`, `medisphere-${r.type}.csv`)
      .then(() => {
        this.toast.success(`${r.name} downloaded (audited)`);
        this.generatedAt = new Date();
      })
      .catch((e) => {
        this.errorByType[r.type] = e?.message ?? 'Download failed';
        this.toast.error(`${r.name}: ${this.errorByType[r.type]}`);
      })
      .finally(() => (this.busy = ''));
  }
}
