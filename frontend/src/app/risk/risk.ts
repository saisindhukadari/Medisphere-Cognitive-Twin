import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, DatePipe, LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { ShapChartComponent, LineChartComponent } from '../shared/charts';
import { ToastService } from '../core/toast';

@Component({
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, RouterLink, DatePipe, LowerCasePipe],
  template: `
    <div class="card-title-row">
      <div>
        <h1>AI Risk Predictions</h1>
        <p class="card-sub">{{ list.length }} stored prediction{{ list.length === 1 ? '' : 's' }} · newest first</p>
      </div>
      <button class="outline-btn" (click)="load()" [disabled]="loading">↻ Refresh</button>
    </div>
    <div class="toolbar">
      <div class="field-group">
        <label class="field" for="rl-search">Search</label>
        <input id="rl-search" class="input" placeholder="Patient name…" [(ngModel)]="query" />
      </div>
      <div class="field-group">
        <label class="field" for="rl-cat">Category</label>
        <select id="rl-cat" class="input" [(ngModel)]="category">
          <option value="">All categories</option>
          <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>VERY_HIGH</option>
        </select>
      </div>
      <span class="chip">{{ filtered.length }} matching</span>
    </div>

    <div class="card">
      <div *ngIf="loading" style="display:flex; flex-direction:column; gap:0.6rem">
        <div class="skeleton" *ngFor="let r of [1,2,3,4]" style="height:36px"></div>
      </div>

      <div class="error-box" *ngIf="error">{{ error }} <button class="btn sm secondary" (click)="load()">Retry</button></div>

      <table class="responsive" *ngIf="!loading && !error && filtered.length">
        <thead><tr><th>Patient</th><th>Score</th><th>CV 10y</th><th>Diabetes</th><th>Category</th><th>Trend</th><th>Confidence</th><th>Model</th><th></th></tr></thead>
        <tbody>
          <tr *ngFor="let p of filtered; let i = index" [style.--i]="i">
            <td data-label="Patient"><a [routerLink]="['/risk-predictions', p.patientId]">{{ p.patientName }}</a></td>
            <td data-label="Score"><span class="risk-score" style="font-size:1.15rem">{{ p.overallScore ?? 0 }}</span></td>
            <td data-label="CV 10y">{{ p.cardiovascularRisk10y }}%</td>
            <td data-label="Diabetes">{{ p.diabetesComplicationRisk }}%</td>
            <td data-label="Category"><span class="badge" [class]="'badge ' + (p.riskCategory | lowercase)">{{ p.riskCategory }}</span></td>
            <td data-label="Trend">{{ p.trend }}</td>
            <td data-label="Confidence">{{ p.confidence }}</td>
            <td data-label="Model" class="mono small">{{ p.modelVersion }}</td>
            <td data-label="Actions"><a class="btn sm secondary" [routerLink]="['/risk-predictions', p.patientId]">Explain</a></td>
          </tr>
        </tbody>
      </table>

      <div class="empty" *ngIf="!list.length && !loading && !error">
        <span class="empty-icon">◔</span>
        <h3>No predictions yet</h3>
        <p>Open a patient's risk detail page to generate a prediction.</p>
      </div>
      <div class="empty" *ngIf="list.length && !filtered.length && !loading">
        <span class="empty-icon">🔍</span>
        <h3>No predictions match these filters</h3>
        <button class="outline-btn" (click)="query = ''; category = ''">Clear filters</button>
      </div>
    </div>
  `,
})
export class RiskListComponent implements OnInit {
  list: any[] = [];
  filtered: any[] = [];
  query = '';
  category = '';
  loading = true;
  error = '';
  constructor(private api: Api) {}
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading = true;
    this.error = '';
    this.api.get<any[]>('/risk-predictions').subscribe({
      next: (r) => {
        this.list = r ?? [];
        this.apply();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load predictions from the backend.';
        this.loading = false;
      },
    });
  }
  apply() {
    const q = this.query.trim().toLowerCase();
    this.filtered = this.list.filter(
      (p) =>
        (!q || (p.patientName ?? '').toLowerCase().includes(q)) &&
        (!this.category || p.riskCategory === this.category)
    );
  }
}

@Component({
  standalone: true,
  imports: [NgIf, NgFor, ShapChartComponent, LineChartComponent, DatePipe, RouterLink, LowerCasePipe],
  template: `
    <div class="card-title-row">
      <div>
        <span class="pill">Explainable risk model</span>
        <h1 style="margin-top:0.4rem">Risk Prediction Detail</h1>
        <p class="card-sub" *ngIf="preds.length">{{ preds[0].patientName }} · {{ preds.length }} stored prediction{{ preds.length === 1 ? '' : 's' }}</p>
      </div>
      <button class="btn" (click)="generate()" [disabled]="generating">{{ generating ? 'Generating…' : 'Generate Prediction' }}</button>
    </div>
    <div *ngIf="loading" class="grid cols-2">
      <div class="card skeleton" style="min-height:200px"></div>
      <div class="card skeleton" style="min-height:200px"></div>
    </div>

    <div *ngIf="!loading && preds.length; else emptyState">
      <div class="grid kpi-grid" style="margin-bottom:1rem">
        <div class="card kpi hoverable">
          <div class="kpi-icon">◔</div>
          <div class="value">{{ preds[0].overallScore ?? 0 }}</div>
          <div class="label">Latest score</div>
          <div class="trend neutral">model {{ preds[0].modelVersion }}</div>
        </div>
        <div class="card kpi hoverable">
          <div class="kpi-icon">❤</div>
          <div class="value">{{ preds[0].cardiovascularRisk10y }}%</div>
          <div class="label">Cardiovascular 10-year</div>
          <div class="trend neutral">model {{ preds[0].modelVersion }}</div>
        </div>
        <div class="card kpi hoverable">
          <div class="kpi-icon">🩸</div>
          <div class="value">{{ preds[0].diabetesComplicationRisk }}%</div>
          <div class="label">Diabetes complications</div>
          <div class="trend neutral">model {{ preds[0].modelVersion }}</div>
        </div>
        <div class="card kpi hoverable">
          <div class="kpi-icon">⌁</div>
          <div class="value">{{ preds.length }}</div>
          <div class="label">Stored predictions</div>
          <div class="trend neutral">used for trend history</div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <div class="card-title-row">
            <h3>Latest — {{ preds[0].patientName }}</h3>
            <span class="badge" [class]="'badge ' + (preds[0].riskCategory | lowercase)">{{ preds[0].riskCategory }}</span>
          </div>
          <div class="risk-score">{{ preds[0].overallScore ?? 0 }}<span style="font-size:1rem; color:var(--muted)"> / 100</span></div>
          <div class="stat-list">
            <div class="stat-row"><span class="sr-key">Trend</span><span class="sr-val">{{ preds[0].trend }}</span></div>
            <div class="stat-row"><span class="sr-key">Confidence</span><span class="sr-val">{{ preds[0].confidence }}</span></div>
            <div class="stat-row"><span class="sr-key">Model</span><span class="sr-val mono small">{{ preds[0].modelVersion }}</span></div>
            <div class="stat-row"><span class="sr-key">Generated</span><span class="sr-val">{{ preds[0].predictedAt | date: 'medium' }}</span></div>
          </div>
          <div class="grid-actions" style="margin-top:0.9rem">
            <a class="btn sm secondary" [routerLink]="['/patients', patientId]">Patient 360</a>
            <a class="btn sm ghost" [routerLink]="['/patients', patientId, 'digital-twin']">Digital twin</a>
          </div>
        </div>
        <div class="card">
          <h3>SHAP-style feature contributions</h3>
          <app-shap [features]="preds[0].contributions"></app-shap>
          <p class="small muted">Positive contributions increase the predicted risk; negative contributions
            decrease it.</p>
        </div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="card-title-row">
          <h3>Risk score trend</h3>
          <span class="chip">{{ trendLabels.length }} points</span>
        </div>
        <app-line-chart *ngIf="trendValues.length" [values]="trendValues" [labels]="trendLabels"
                        hint="Overall risk score over stored predictions (oldest → newest)"></app-line-chart>
        <p class="small muted" *ngIf="!trendValues.length">Trend appears once at least one prediction is stored.</p>
      </div>

      <div class="card" style="margin-top:1rem">
        <h3>Methodology</h3>
        <p>{{ preds[0].methodology }}</p>
        <p class="small muted">{{ preds[0].evidenceSummary }}</p>
      </div>
      <div class="card" style="margin-top:1rem">
        <h3>Prediction history</h3>
        <table class="responsive rows-static" *ngIf="preds.length > 1">
          <thead><tr><th>Time</th><th>Score</th><th>Category</th><th>Trend</th><th>Confidence</th><th>Model</th></tr></thead>
          <tbody>
            <tr *ngFor="let p of preds; let i = index" [style.--i]="i">
              <td data-label="Time">{{ p.predictedAt | date: 'short' }}</td>
              <td data-label="Score" class="number"><strong>{{ p.overallScore }}</strong></td>
              <td data-label="Category"><span class="badge" [class]="'badge ' + (p.riskCategory | lowercase)">{{ p.riskCategory }}</span></td>
              <td data-label="Trend">{{ p.trend }}</td>
              <td data-label="Confidence">{{ p.confidence }}</td>
              <td data-label="Model" class="mono small">{{ p.modelVersion }}</td>
            </tr>
          </tbody>
        </table>
        <div class="empty" *ngIf="preds.length === 1">
          <p>This is the first prediction — generate another later to build a trend.</p>
        </div>
      </div>
      <div class="grid cols-2" style="margin-top:1rem">
        <div class="card">
          <h3>Patient Vitals (context)</h3>
          <table *ngIf="vitals.length">
            <tr *ngFor="let v of vitals.slice(0, 8)"><td>{{ v.type }}</td><td>{{ v.value }} {{ v.unit }}</td></tr>
          </table>
          <div class="empty" *ngIf="!vitals.length">No vitals.</div>
        </div>
        <div class="card">
          <h3>Relevant Labs</h3>
          <table *ngIf="labs.length">
            <tr *ngFor="let l of labs.slice(0, 6)"><td>{{ l.testName }}</td><td>{{ l.value }} {{ l.unit }}</td></tr>
          </table>
          <div class="empty" *ngIf="!labs.length">No labs.</div>
        </div>
      </div>
    </div>

    <ng-template #emptyState>
      <div class="card empty" *ngIf="!loading">
        <h3>No risk prediction available yet</h3>
        <p>Generate a prediction from the patient's current clinical data.</p>
        <button class="btn" (click)="generate()" [disabled]="generating">{{ generating ? 'Generating…' : 'Generate Prediction' }}</button>
      </div>
    </ng-template>
  `,
})
export class RiskDetailComponent implements OnInit {
  preds: any[] = [];
  vitals: any[] = [];
  labs: any[] = [];
  loading = true;
  generating = false;
  patientId = '';

  /** Prediction history reversed to oldest → newest for the trend chart. */
  get trendValues(): number[] {
    return [...this.preds].reverse().map((p) => Number(p.overallScore ?? 0));
  }
  get trendLabels(): string[] {
    return [...this.preds].reverse().map((p) => (p.predictedAt ? new Date(p.predictedAt).toLocaleDateString() : ''));
  }

  constructor(private route: ActivatedRoute, private api: Api, private toast: ToastService) {}
  ngOnInit() {
    this.patientId = this.route.snapshot.paramMap.get('patientId') ?? '';
    this.load();
    this.api.get<any[]>(`/vitals/patient/${this.patientId}`).subscribe({ next: (v) => (this.vitals = v), error: () => {} });
    this.api.get<any[]>(`/labs/patient/${this.patientId}`).subscribe({ next: (l) => (this.labs = l), error: () => {} });
  }
  load() {
    this.loading = true;
    this.api.get<any[]>(`/risk-predictions/patient/${this.patientId}`).subscribe({
      next: (p) => (this.preds = p),
      error: () => this.toast.error('Failed to load predictions'),
      complete: () => (this.loading = false),
    });
  }
  generate() {
    this.generating = true;
    this.api.post(`/risk-predictions/predict/${this.patientId}`, {}).subscribe({
      next: (p: any) => {
        this.toast.success(`Prediction generated — score ${p.overallScore} (${p.riskCategory})`);
        this.load();
      },
      error: (e) => this.toast.error(e?.error?.message ?? 'Prediction failed'),
      complete: () => (this.generating = false),
    });
  }
}
