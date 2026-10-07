import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api';
import { AppearanceService } from '../core/appearance';

@Component({
  standalone: true,
  imports: [NgFor, NgIf, NgClass, RouterLink, FormsModule, DatePipe],
  template: `
    <div class="card-title-row">
      <div>
        <h1>Patients</h1>
        <p class="card-sub">{{ total }} patient{{ total === 1 ? '' : 's' }} in view · full cohort</p>
      </div>
      <div class="row">
        <label class="switch">
          <input type="checkbox" [ngModel]="appearance.prefs.denseTables"
                 (ngModelChange)="appearance.update({ denseTables: $event })" />
          <span class="track"></span> <span>Dense rows</span>
        </label>
        <button class="outline-btn" (click)="load()" [disabled]="loading">↻ Refresh</button>
        <a class="btn" routerLink="/patients/new">+ New Patient</a>
      </div>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div class="grid" style="grid-template-columns: 2fr repeat(4, minmax(140px, 1fr)); align-items:end">
        <div><label class="field" for="p-search">Search</label><input id="p-search" class="input" placeholder="Name or MRN..." [(ngModel)]="search" (input)="load()" /></div>
        <div><label class="field" for="p-risk">Risk</label>
          <select id="p-risk" class="input" [(ngModel)]="riskFilter" (change)="load()">
            <option value="">All risks</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
          </select></div>
        <div><label class="field" for="p-consent">Consent</label>
          <select id="p-consent" class="input" [(ngModel)]="consentFilter" (change)="load()">
            <option value="">All</option><option>GRANTED</option><option>PENDING</option><option>WITHDRAWN</option>
          </select></div>
        <div><label class="field" for="p-doc">Assigned doctor</label>
          <select id="p-doc" class="input" [(ngModel)]="providerFilter" (change)="load()">
            <option value="">All doctors</option>
            <option *ngFor="let pr of providers" [value]="pr.id">{{ pr.name }}</option>
          </select></div>
        <div><label class="field" for="p-sort">Sort</label>
          <select id="p-sort" class="input" [(ngModel)]="sort" (change)="load()">
            <option value="updatedAt">Last updated</option><option value="name">Name</option><option value="risk">Risk</option>
          </select></div>
        <div><label class="field">&nbsp;</label><button class="outline-btn" (click)="reset()">Reset</button></div>
      </div>
      <div class="row" style="gap:0.6rem; margin-top:0.8rem; align-items:center" *ngIf="deepLinked">
        <span class="pill" style="background:var(--accent-softer); color:var(--accent)">Filtered from dashboard</span>
        <span class="small muted">Risk {{ riskFilter || 'any' }} · Consent {{ consentFilter || 'any' }}{{ search ? ' · “' + search + '”' : '' }}</span>
        <button class="outline-btn" (click)="deepLinked = false; reset()">Show all</button>
      </div>
    </div>

    <div class="card">
      <div *ngIf="loading" style="display:flex; flex-direction:column; gap:0.6rem">
        <div class="skeleton" *ngFor="let r of [1,2,3,4,5,6]" style="height:38px"></div>
      </div>
      <table class="responsive" *ngIf="!loading && patients.length">
        <thead><tr><th>Name</th><th>MRN</th><th>DOB</th><th>Gender</th><th>Risk</th><th>Consent</th><th>Assigned doctor</th><th>Updated</th><th>Actions</th></tr></thead>
        <tbody>
        <tr *ngFor="let p of patients; let i = index" [style.--i]="i">
          <td data-label="Name"><a [routerLink]="['/patients', p.id]">{{ p.lastName }}, {{ p.firstName }}</a></td>
          <td data-label="MRN" class="mono small">{{ p.medicalIdentifier }}</td>
          <td data-label="DOB" class="small">{{ p.dateOfBirth }}</td>
          <td data-label="Gender">{{ p.gender }}</td>
          <td data-label="Risk"><span class="badge" [class]="'badge ' + (p.riskStatus || 'low').toLowerCase()">{{ p.riskStatus }}</span></td>
          <td data-label="Consent"><span class="badge" [ngClass]="(p.consentStatus || '').toLowerCase()">{{ p.consentStatus }}</span></td>
          <td data-label="Assigned doctor">{{ p.providerName || 'Not yet assigned' }}</td>
          <td data-label="Updated" class="small muted">{{ p.updatedAt | date: 'shortDate' }}</td>
          <td data-label="Actions" style="white-space:nowrap">
            <span class="grid-actions">
              <a class="btn sm secondary" [routerLink]="['/patients', p.id]">360</a>
              <a class="btn sm ghost" [routerLink]="['/patients', p.id, 'digital-twin']">Twin</a>
              <a class="btn sm ghost" [routerLink]="['/risk-predictions', p.id]">Risk</a>
              <a class="btn sm ghost" [routerLink]="['/alerts']">Alerts</a>
              <a class="btn sm ghost" [routerLink]="['/care-plans']" [queryParams]="{ patient: p.id }">Plan</a>
            </span>
          </td>
        </tr>
        </tbody>
      </table>
      <div class="empty" *ngIf="!loading && !patients.length && !error">
        <span class="empty-icon">🩺</span>
        <h3>No patients match these filters</h3>
        <p>Clear the filters to see every patient.</p>
        <button class="outline-btn" (click)="reset()">Clear filters</button>
      </div>
      <div *ngIf="error" class="error-box">{{ error }} <button class="btn sm secondary" (click)="load()">Retry</button></div>
      <div class="row" style="gap:0.8rem; margin-top:1rem; align-items:center" *ngIf="patients.length">
        <button class="outline-btn" (click)="page = page - 1; load()" [disabled]="page === 0">Prev</button>
        <span class="small muted">Page {{ page + 1 }} of {{ totalPages }} · {{ total }} rows</span>
        <button class="outline-btn" (click)="page = page + 1; load()" [disabled]="page + 1 >= totalPages">Next</button>
      </div>
    </div>
  `,
})
export class PatientsComponent implements OnInit {
  patients: any[] = [];
  providers: any[] = [];
  search = '';
  riskFilter = '';
  consentFilter = '';
  providerFilter = '';
  sort = 'updatedAt';
  page = 0;
  total = 0;
  totalPages = 1;
  loading = true;
  error = '';
  appearance = inject(AppearanceService);
  /** Set when the page was opened with dashboard deep-link filters. */
  deepLinked = false;
  constructor(private api: Api, private route: ActivatedRoute) {}
  ngOnInit() {
    // Dashboard KPI cards deep-link here (e.g. /patients?risk=HIGH) — apply the
    // filters the URL asks for before the first request goes out.
    const qp = this.route.snapshot.queryParamMap;
    const risk = (qp.get('risk') || '').toUpperCase();
    const consent = (qp.get('consent') || '').toUpperCase();
    const q = qp.get('q') || '';
    if (['HIGH', 'MEDIUM', 'LOW'].includes(risk)) this.riskFilter = risk;
    if (['GRANTED', 'PENDING', 'WITHDRAWN'].includes(consent)) this.consentFilter = consent;
    if (q) this.search = q;
    this.deepLinked = !!this.riskFilter || !!this.consentFilter || !!this.search;
    this.load();
    this.api.get<any[]>('/providers').subscribe({ next: (p) => (this.providers = p), error: () => {} });
  }
  load() {
    this.loading = true;
    this.error = '';
    const q = `search=${encodeURIComponent(this.search)}` +
      `&risk=${encodeURIComponent(this.riskFilter)}` +
      `&consent=${encodeURIComponent(this.consentFilter)}` +
      `&providerId=${encodeURIComponent(this.providerFilter)}` +
      `&sort=${this.sort}&page=${this.page}&size=10`;
    this.api.get<any>(`/patients?${q}`)
      .subscribe({
        next: (r) => {
          this.patients = r.content ?? [];
          this.total = r.totalElements ?? this.patients.length;
          this.totalPages = Math.max(r.totalPages, 1);
          this.loading = false;
        },
        error: () => { this.error = 'Failed to load patients from the backend.'; this.loading = false; },
      });
  }
  reset() {
    this.search = ''; this.riskFilter = ''; this.consentFilter = ''; this.providerFilter = ''; this.sort = 'updatedAt'; this.page = 0;
    this.deepLinked = false;
    this.load();
  }
}
