import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe, LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { ToastService } from '../core/toast';
import { ConfirmService } from '../core/confirm';
import { humanize } from '../shared/text';

/**
 * Consent management: grants/updates/withdrawals are enforced server-side
 * before clinical data is exposed, and every change is audited.
 */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, LowerCasePipe, FormsModule, RouterLink],
  template: `
    <div class="card-title-row">
      <div>
        <h1>Consent Management</h1>
        <p class="card-sub">Consent is checked by the backend before clinical data is returned — changes are audited.</p>
      </div>
      <button class="outline-btn" (click)="load()" [disabled]="loading">↻ Refresh</button>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <h3>Grant or update consent</h3>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); align-items:end; margin-top:0.6rem">
        <div>
          <label class="field" for="cn-patient">Patient</label>
          <select id="cn-patient" class="input" [(ngModel)]="patientId">
            <option value="">Select a patient…</option>
            <option *ngFor="let p of patients" [value]="p.id">{{ p.lastName }}, {{ p.firstName }} — {{ p.medicalIdentifier }}</option>
          </select>
        </div>
        <div>
          <label class="field" for="cn-cat">Category</label>
          <select id="cn-cat" class="input" [(ngModel)]="category">
            <option>DATA_SHARING</option><option>AI_ANALYSIS</option><option>WEARABLE_STREAMING</option><option>RESEARCH</option>
          </select>
        </div>
        <div>
          <label class="field" for="cn-status">Status</label>
          <select id="cn-status" class="input" [(ngModel)]="status">
            <option>GRANTED</option><option>WITHDRAWN</option><option>PENDING</option>
          </select>
        </div>
        <div><button class="btn" (click)="save()" [disabled]="saving || !patientId">
          <span class="spinner" *ngIf="saving"></span> {{ saving ? 'Saving…' : 'Grant / Update' }}
        </button></div>
      </div>
      <p class="field-hint" *ngIf="!patientId">Select a patient first — consent is always tied to a patient record.</p>
    </div>

    <div class="grid cols-3">
      <div class="card kpi" *ngFor="let k of kpis">
        <div class="kpi-icon">{{ k.icon }}</div>
        <div class="value">{{ k.value }}</div>
        <div class="label">{{ k.label }}</div>
      </div>
    </div>

    <div class="card" style="margin-top:1rem">
      <div class="card-title-row"><h3>Consent records</h3><span class="chip">{{ consents.length }} records</span></div>

      <div *ngIf="loading" class="stack">
        <div class="skeleton" *ngFor="let r of [1,2,3,4]" style="height:36px"></div>
      </div>

      <p class="error-box" *ngIf="error">{{ error }} <button class="btn sm secondary" (click)="load()">Retry</button></p>

      <table class="responsive" *ngIf="!loading && !error && consents.length">
        <thead><tr><th>Patient</th><th>Category</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody>
          <tr *ngFor="let c of consents.slice(0, 30); let i = index" [style.--i]="i">
            <td data-label="Patient"><a *ngIf="c.patientId" [routerLink]="['/patients', c.patientId]">{{ c.patientName || c.patientId }}</a><span *ngIf="!c.patientId">—</span></td>
            <td data-label="Category">{{ c.category }}</td>
            <td data-label="Status"><span class="badge" [class]="'badge ' + (c.status | lowercase)">{{ pretty(c.status) }}</span></td>
            <td data-label="Updated" class="small muted">{{ c.updatedAt | date: 'short' }}</td>
            <td data-label="Actions"><button class="btn sm danger" (click)="withdraw(c)">Withdraw</button></td>
          </tr>
        </tbody>
      </table>

      <div class="empty" *ngIf="!loading && !error && !consents.length">
        <span class="empty-icon">🔒</span>
        <h3>No consent records</h3>
        <p>Grant consent above to allow clinical data access for a patient.</p>
      </div>

      <p class="small muted" *ngIf="consents.length > 30">Showing the first 30 of {{ consents.length }} records.</p>
    </div>

    <p class="small muted">
      Revoking consent hides the patient's clinical data from API responses until consent is granted again.
      Every change is written to the audit log with actor, timestamp and reason.
    </p>
  `,
})
export class ConsentComponent implements OnInit {
  consents: any[] = [];
  patients: any[] = [];
  patientId = '';
  category = 'DATA_SHARING';
  status = 'GRANTED';
  loading = true;
  saving = false;
  error = '';

  constructor(private api: Api, private toast: ToastService, private confirm: ConfirmService) {}

  /** Display text for a stored status token (GRANTED → "Granted"). */
  pretty(value: string): string {
    return humanize(value);
  }

  ngOnInit() {
    this.load();
    this.api.get<any>('/patients?size=200&sort=name').subscribe({
      next: (r) => (this.patients = r.content ?? []),
      error: () => (this.patients = []),
    });
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.get<any[]>('/consents').subscribe({
      next: (c) => {
        this.consents = c ?? [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load consent records.';
        this.loading = false;
      },
    });
  }

  get kpis() {
    const granted = this.consents.filter((c) => c.status === 'GRANTED').length;
    const pending = this.consents.filter((c) => c.status === 'PENDING').length;
    const withdrawn = this.consents.filter((c) => c.status === 'WITHDRAWN').length;
    return [
      { icon: '✅', value: granted, label: 'Granted' },
      { icon: '⏳', value: pending, label: 'Pending' },
      { icon: '🚫', value: withdrawn, label: 'Withdrawn' },
    ];
  }

  save() {
    if (!this.patientId) {
      this.toast.warning('Select a patient first');
      return;
    }
    this.saving = true;
    this.api.post('/consents', { patientId: this.patientId, category: this.category, status: this.status }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Consent updated and audited');
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.toast.error(e?.error?.message ?? 'Failed to save consent');
      },
    });
  }

  withdraw(c: any) {
    this.confirm
      .confirm({
        title: 'Withdraw consent',
        message: `Withdraw ${c.category} consent for ${c.patientName}? Clinical data will be hidden for this patient.`,
        confirmLabel: 'Withdraw',
        danger: true,
      })
      .then((ok) => {
        if (!ok) return;
        this.api.delete(`/consents/${c.id}`).subscribe({
          next: () => {
            this.toast.success('Consent withdrawn');
            this.load();
          },
          error: () => this.toast.error('Withdraw failed'),
        });
      });
  }
}
