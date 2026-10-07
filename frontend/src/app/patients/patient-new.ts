import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { Api } from '../core/api';

@Component({
  standalone: true,
  imports: [FormsModule, NgIf],
  template: `
    <h1>Create Patient</h1>
    <div class="card" style="max-width:720px">
      <div class="grid cols-2">
        <div><label class="field">First name</label><input class="input" [(ngModel)]="p.firstName" /></div>
        <div><label class="field">Last name</label><input class="input" [(ngModel)]="p.lastName" /></div>
        <div><label class="field">Date of birth</label><input class="input" type="date" [(ngModel)]="p.dateOfBirth" /></div>
        <div><label class="field">Gender</label>
          <select class="input" [(ngModel)]="p.gender"><option>MALE</option><option>FEMALE</option><option>OTHER</option></select></div>
        <div><label class="field">Email</label><input class="input" [(ngModel)]="p.email" /></div>
        <div><label class="field">Phone</label><input class="input" [(ngModel)]="p.phone" /></div>
        <div style="grid-column: span 2"><label class="field">Address</label><input class="input" [(ngModel)]="p.address" /></div>
        <div><label class="field">Medical identifier</label><input class="input" [(ngModel)]="p.medicalIdentifier" placeholder="MRN-DEMO-..." /></div>
        <div><label class="field">Consent status</label>
          <select class="input" [(ngModel)]="p.consentStatus"><option>GRANTED</option><option>PENDING</option><option>WITHDRAWN</option></select></div>
      </div>
      <div class="error-box" *ngIf="error">{{ error }}</div>
      <button class="btn" style="margin-top:1rem" (click)="save()">Create Patient</button>
    </div>
  `,
})
export class PatientNewComponent {
  p: any = { gender: 'MALE', consentStatus: 'GRANTED', riskStatus: 'LOW' };
  error = '';
  constructor(private api: Api, private router: Router) {}
  save() {
    if (!this.p.firstName || !this.p.lastName || !this.p.dateOfBirth) {
      this.error = 'First name, last name, and date of birth are required.';
      return;
    }
    this.api.post('/patients', this.p).subscribe({
      next: (created: any) => this.router.navigate(['/patients', created.id]),
      error: (e) => (this.error = e?.error?.message ?? 'Failed to create patient'),
    });
  }
}
