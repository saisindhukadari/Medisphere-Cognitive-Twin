import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api';
import { ToastService } from '../core/toast';

@Component({
  standalone: true,
  imports: [NgFor, NgIf, JsonPipe, FormsModule],
  template: `
    <h1>FHIR Integration</h1>
    <p style="color:var(--muted)">FHIR R4 resource ingestion with validation.</p>
    <div class="grid cols-2">
      <div class="card">
        <h3>Import & Validate</h3>
        <textarea class="input" rows="10" [(ngModel)]="json" aria-label="FHIR resource JSON"></textarea>
        <div style="display:flex; gap:0.5rem; margin-top:0.6rem">
          <button class="btn" (click)="validate()">Validate</button>
          <button class="btn secondary" (click)="import()">Import</button>
          <button class="btn ghost" (click)="loadSample()">Load sample</button>
        </div>
        <p class="notice" *ngIf="message">{{ message }}</p>
        <p class="error-box" *ngIf="error">{{ error }}</p>
      </div>
      <div class="card">
        <h3>Resources ({{ resources.length }})</h3>
        <table *ngIf="resources.length">
          <tr><th>Type</th><th>ID</th><th>Validation</th></tr>
          <tr *ngFor="let r of resources.slice(0, 30)">
            <td>{{ r.resourceType }}</td><td>{{ r.resourceId }}</td>
            <td><span class="badge" [class]="'badge ' + (r.validationStatus === 'VALID' ? 'low' : 'high')">{{ r.validationStatus }}</span></td>
          </tr>
        </table>
        <div class="empty" *ngIf="!resources.length">No FHIR resources yet.</div>
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <h3>Interoperability</h3>
      <p>Supported resource types: Patient, Observation, Condition, MedicationRequest, DiagnosticReport, Encounter, CarePlan.
      The prototype ships with a mock FHIR source; a production deployment would connect a real FHIR R4 server with SMART on FHIR OAuth2.</p>
    </div>
  `,
})
export class FhirComponent implements OnInit {
  resources: any[] = [];
  json = '';
  message = '';
  error = '';
  constructor(private api: Api, private toast: ToastService) {}
  ngOnInit() { this.load(); this.loadSample(); }
  load() { this.api.get<any[]>('/fhir/resources').subscribe((r) => (this.resources = r)); }
  loadSample() {
    this.json = JSON.stringify({
      resourceType: 'Observation',
      id: 'demo-obs-' + Date.now(),
      code: { text: 'Heart rate' },
      status: 'final',
      valueQuantity: { value: 72, unit: 'bpm' },
    }, null, 2);
  }
  validate() {
    this.message = ''; this.error = '';
    try {
      this.api.post<any>('/fhir/validate', JSON.parse(this.json)).subscribe((r) => {
        this.message = r.valid ? 'Resource is valid (demo validation).' : 'Invalid: ' + (r.errors || []).join(', ');
        if (r.valid) this.toast.success('FHIR resource valid'); else this.toast.warning('FHIR validation failed');
      });
    } catch { this.error = 'Invalid JSON'; }
  }
  import() {
    this.message = ''; this.error = '';
    try {
      this.api.post<any>('/fhir/import', JSON.parse(this.json)).subscribe({
        next: () => { this.message = 'Imported successfully.'; this.toast.success('FHIR resource imported'); this.load(); },
        error: (e) => { this.error = e?.error?.message ?? 'Import failed'; this.toast.error(this.error); },
      });
    } catch { this.error = 'Invalid JSON'; }
  }
}
