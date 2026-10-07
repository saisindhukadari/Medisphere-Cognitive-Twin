import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, DatePipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { AuthService } from '../core/auth';

/**
 * Digital Twins directory — every row is a persisted synthetic health twin
 * (completeness, risk map, conditions) joined with its patient record.
 */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, DecimalPipe, LowerCasePipe, FormsModule, RouterLink],
  template: `
    <div class="card-title-row">
      <div>
        <h1>Digital Twins</h1>
        <p class="card-sub">Patient health-state visualization built from vitals, labs, conditions, devices and FHIR data.</p>
      </div>
      <span class="pill">Cognitive Twins</span>
    </div>

    <div class="toolbar">
      <div class="field-group">
        <label class="field" for="twin-search">Search patient</label>
        <input id="twin-search" class="input" placeholder="Name or risk…" [(ngModel)]="query" />
      </div>
      <div class="field-group">
        <label class="field" for="twin-status">Completeness</label>
        <select id="twin-status" class="input" [(ngModel)]="band" (ngModelChange)="apply()">
          <option value="">All twins</option>
          <option value="high">80% and above</option>
          <option value="mid">60–79%</option>
          <option value="low">Below 60%</option>
        </select>
      </div>
      <button class="outline-btn" (click)="reset()">Reset</button>
    </div>

    <div class="grid cols-3" *ngIf="loading">
      <div class="card skeleton" *ngFor="let s of [1,2,3,4,5,6]" style="min-height:180px"></div>
    </div>

    <div class="grid cols-3" *ngIf="!loading">
      <div class="card hoverable enter" *ngFor="let t of filtered; let i = index" [style.--i]="i">
        <div class="card-title-row" style="margin-bottom:0.4rem">
          <h3 style="margin:0">{{ t.patientName }}</h3>
          <span class="badge" [class]="'badge ' + (t.riskStatus || 'low').toLowerCase()">{{ t.riskStatus }} RISK</span>
        </div>
        <p class="small muted">Completeness {{ (t.completenessScore * 100) | number:'1.0-0' }}% · {{ t.status }} · sync {{ t.lastSyncedAt | date: 'short' }}</p>
        <div class="progress" style="margin:0.5rem 0 0.7rem"><div [style.width.%]="t.completenessScore * 100"></div></div>
        <div class="stat-list">
          <div class="stat-row">
            <span class="sr-key">❤️ Cardiovascular</span>
            <span class="sr-val"><span class="badge" [class]="'badge ' + (t.cardiovascularRisk | lowercase)">{{ t.cardiovascularRisk }}</span></span>
          </div>
          <div class="stat-row">
            <span class="sr-key">🩸 Diabetes</span>
            <span class="sr-val"><span class="badge" [class]="'badge ' + (t.diabetesRisk | lowercase)">{{ t.diabetesRisk }}</span></span>
          </div>
          <div class="stat-row">
            <span class="sr-key">Assigned doctor</span>
            <span class="sr-val">{{ t.doctor || 'Not yet assigned' }}</span>
          </div>
        </div>
        <p class="small muted" style="margin-top:0.6rem" *ngIf="t.conditions?.length">{{ t.conditions.join(' · ') }}</p>
        <div class="grid-actions" style="margin-top:0.8rem">
          <a class="btn sm" [routerLink]="['/patients', t.patientId, 'digital-twin']">Open twin</a>
          <a class="btn sm secondary" [routerLink]="['/patients', t.patientId]">Patient 360</a>
          <a class="btn sm ghost" [routerLink]="['/risk-predictions', t.patientId]">Risk</a>
        </div>
      </div>
    </div>

    <div class="card empty" *ngIf="!loading && !filtered.length">
      <span class="empty-icon">🧬</span>
      <h3>No digital twins match this view</h3>
      <p>No twins match the current filters. Adjust them or reset to see the full directory.</p>
      <button class="btn secondary" (click)="reset()">Reset filters</button>
    </div>

    <div class="error-box" *ngIf="error">{{ error }} <button class="btn sm secondary" (click)="load()">Retry</button></div>
  `,
})
export class TwinListComponent implements OnInit {
  twins: any[] = [];
  filtered: any[] = [];
  query = '';
  band = '';
  loading = true;
  error = '';
  private auth = inject(AuthService);
  constructor(private api: Api) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.get<any[]>('/health-twins').subscribe({
      next: (rows) => {
        this.twins = rows ?? [];
        this.apply();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load digital twins.';
        this.loading = false;
      },
    });
  }

  apply() {
    const q = this.query.trim().toLowerCase();
    this.filtered = this.twins.filter((t) => {
      const pct = (t.completenessScore ?? 0) * 100;
      const bandOk =
        !this.band ||
        (this.band === 'high' && pct >= 80) ||
        (this.band === 'mid' && pct >= 60 && pct < 80) ||
        (this.band === 'low' && pct < 60);
      const text = `${t.patientName ?? ''} ${t.riskStatus ?? ''} ${(t.conditions ?? []).join(' ')}`.toLowerCase();
      return bandOk && (!q || text.includes(q));
    });
  }

  reset() {
    this.query = '';
    this.band = '';
    this.apply();
  }
}
