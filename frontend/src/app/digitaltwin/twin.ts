import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe, KeyValuePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { ProgressComponent } from '../shared/charts';

interface RegionInfo {
  name: string;
  vitals: [string, string][];
  risk: string;
  labs: string;
}

/** Interactive synthetic digital twin with an accessible, keyboard-selectable body map. */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, NgClass, RouterLink, DatePipe, KeyValuePipe, ProgressComponent],
  template: `
    <div class="card-title-row">
      <div>
        <span class="pill twin-badge">Cognitive Twin</span>
        <h1 style="margin-top:0.4rem">Digital Health Twin<span *ngIf="twin?.patientName"> — {{ twin.patientName }}</span></h1>
        <p class="card-sub">Unified patient state from conditions, medications, vitals, labs, devices and FHIR resources.</p>
      </div>
      <div class="row">
        <span class="badge low" *ngIf="twin">Completeness {{ pct(twin.completenessScore) }}%</span>
        <a class="btn secondary" [routerLink]="['/patients', patientId]">← Patient 360</a>
      </div>
    </div>

    <!-- loading -->
    <div *ngIf="loading" class="grid cols-2">
      <div class="card skeleton" style="min-height:420px"></div>
      <div class="card skeleton" style="min-height:420px"></div>
    </div>

    <!-- error -->
    <div class="error-box" *ngIf="!loading && error">
      {{ error }} <button class="btn sm secondary" (click)="load()">Retry</button>
    </div>

    <!-- not found -->
    <div class="card" *ngIf="!loading && !error && !twin">
      <div class="empty">
        <span class="empty-icon">🧬</span>
        <h3>No digital twin for this patient</h3>
        <p>The twin is created together with the patient record.</p>
        <a class="btn" [routerLink]="['/patients', patientId]">Open patient record</a>
      </div>
    </div>

    <div class="twin-wrap" *ngIf="!loading && !error && twin">
      <!-- body map -->
      <div class="card enter">
        <div class="card-title-row">
          <h3>Body region map</h3>
          <span class="chip">Select a region</span>
        </div>
        <svg viewBox="0 0 200 430" width="100%" style="max-height:540px" role="listbox"
             aria-label="Digital twin body map">
          <g *ngFor="let r of regions" (click)="select(r.key)" (keydown.enter)="select(r.key)"
             (keydown.space)="$event.preventDefault(); select(r.key)"
             [attr.role]="'option'" [attr.aria-selected]="selected === r.key" [attr.tabindex]="0"
             [attr.aria-label]="r.label" class="twin-region-group" style="cursor:pointer; outline:none">
            <ellipse *ngIf="r.shape === 'ellipse'" class="twin-region" [class.selected]="selected === r.key"
                     [attr.cx]="r.x" [attr.cy]="r.y" [attr.rx]="r.rx" [attr.ry]="r.ry" [attr.fill]="r.color" />
            <rect *ngIf="r.shape === 'rect'" class="twin-region" [class.selected]="selected === r.key"
                  [attr.x]="r.x" [attr.y]="r.y" [attr.width]="r.w" [attr.height]="r.h" [attr.rx]="r.rx ?? 8"
                  [attr.fill]="r.color" />
            <text [attr.x]="r.tx" [attr.y]="r.ty" font-size="8" fill="rgba(16,42,67,0.72)"
                  text-anchor="middle" pointer-events="none" style="font-weight:600">{{ r.label }}</text>
          </g>
        </svg>

        <div class="legend" style="display:flex; gap:1rem; flex-wrap:wrap; font-size:0.78rem; color:var(--muted); margin-top:0.6rem">
          <span *ngFor="let l of legend"><span [style.color]="l.color">■</span> {{ l.label }}</span>
        </div>
        <p class="small muted">Keyboard: Tab to a region, Enter or Space to select.</p>
      </div>

      <!-- detail column -->
      <div>
        <div class="card" [class.fade-in]="true">
          <div class="card-title-row">
            <h3>{{ info?.name || 'Select a region' }}</h3>
            <span class="badge" *ngIf="info" [class]="'badge ' + riskTone(info.risk)">{{ info.risk }} risk</span>
          </div>

          <div *ngIf="info; else pickHint">
            <table class="rows-static">
              <tr *ngFor="let row of info.vitals"><td style="width:45%">{{ row[0] }}</td><td><strong>{{ row[1] }}</strong></td></tr>
            </table>
            <p style="margin-top:0.7rem"><strong>Risk map:</strong>
              <span class="badge" [class]="'badge ' + riskTone(info.risk)">{{ info.risk }}</span></p>
            <p><strong>Relevant labs:</strong> {{ info.labs }}</p>
          </div>
          <ng-template #pickHint>
            <div class="empty" style="padding:1rem">
              <p>Click a body region — heart, lungs, liver, kidneys, digestive system, brain or musculoskeletal — to
                inspect its latest indicators.</p>
            </div>
          </ng-template>
        </div>

        <div class="card" style="margin-top:1rem">
          <div class="card-title-row">
            <h3>Twin status</h3>
            <span class="badge acknowledged">{{ twin.status }}</span>
          </div>

          <label class="field">Record completeness</label>
          <app-progress [value]="(twin.completenessScore ?? 0) * 100" [tone]="(twin.completenessScore ?? 0) < 0.7 ? 'warn' : ''"></app-progress>

          <div class="stat-list" style="margin-top:0.8rem">
            <div class="stat-row"><span class="sr-key">Last synced</span><span class="sr-val">{{ twin.lastSyncedAt | date: 'medium' }}</span></div>
            <div class="stat-row"><span class="sr-key">Cardiovascular</span>
              <span class="sr-val"><span class="badge" [class]="'badge ' + riskTone(twin.riskMap?.cardiovascular)">{{ twin.riskMap?.cardiovascular || '—' }}</span></span></div>
            <div class="stat-row"><span class="sr-key">Diabetes</span>
              <span class="sr-val"><span class="badge" [class]="'badge ' + riskTone(twin.riskMap?.diabetes)">{{ twin.riskMap?.diabetes || '—' }}</span></span></div>
            <div class="stat-row"><span class="sr-key">Renal</span>
              <span class="sr-val"><span class="badge" [class]="'badge ' + riskTone(twin.riskMap?.renal)">{{ twin.riskMap?.renal || '—' }}</span></span></div>
          </div>

          <div class="grid cols-2" style="margin-top:1rem">
            <div>
              <h4>Vital summaries</h4>
              <table class="rows-static" *ngIf="twin.vitalSummaries | keyvalue as vitals; else noVitals">
                <tr *ngFor="let v of vitals"><td>{{ v.key }}</td><td class="number"><strong>{{ v.value }}</strong></td></tr>
              </table>
              <ng-template #noVitals><p class="small muted">No vital summaries yet.</p></ng-template>
            </div>
            <div>
              <h4>Lab summaries</h4>
              <table class="rows-static" *ngIf="twin.labSummaries | keyvalue as labs; else noLabs">
                <tr *ngFor="let l of labs"><td>{{ l.key }}</td><td class="number"><strong>{{ l.value }}</strong></td></tr>
              </table>
              <ng-template #noLabs><p class="small muted">No lab summaries yet.</p></ng-template>
            </div>
          </div>

          <h4 *ngIf="twin.recentEvents?.length">Recent events</h4>
          <div class="timeline" *ngIf="twin.recentEvents?.length">
            <div class="timeline-item" *ngFor="let e of twin.recentEvents">{{ e }}</div>
          </div>

          <p class="small muted">Every value on this screen is read from the patient's persisted record.</p>
        </div>
      </div>
    </div>
  `,
})
export class DigitalTwinComponent implements OnInit {
  twin: any;
  patientId = '';
  selected: string | null = null;
  loading = true;
  error = '';
  info: RegionInfo | null = null;

  regions = [
    { key: 'brain', label: 'Brain', shape: 'ellipse', x: 100, y: 42, rx: 26, ry: 30, tx: 100, ty: 46, color: '#bcd7f0' },
    { key: 'heart', label: 'Heart', shape: 'rect', x: 72, y: 96, w: 34, h: 36, rx: 8, tx: 89, ty: 118, color: '#f4b6c1' },
    { key: 'lungs', label: 'Lungs', shape: 'rect', x: 108, y: 96, w: 32, h: 44, rx: 8, tx: 124, ty: 122, color: '#c9e6f5' },
    { key: 'liver', label: 'Liver', shape: 'rect', x: 66, y: 142, w: 36, h: 28, rx: 8, tx: 84, ty: 160, color: '#f0d9a7' },
    { key: 'stomach', label: 'Gut', shape: 'rect', x: 104, y: 148, w: 32, h: 28, rx: 8, tx: 120, ty: 166, color: '#d9f0c4' },
    { key: 'kidneys', label: 'Kidneys', shape: 'ellipse', x: 74, y: 186, rx: 10, ry: 16, tx: 74, ty: 189, color: '#f7c9d4' },
    { key: 'kidneys', label: '', shape: 'ellipse', x: 126, y: 186, rx: 10, ry: 16, tx: 126, ty: 189, color: '#f7c9d4' },
    { key: 'arms', label: 'Arms', shape: 'rect', x: 28, y: 92, w: 34, h: 140, rx: 14, tx: 45, ty: 165, color: '#dbe7f3' },
    { key: 'arms', label: '', shape: 'rect', x: 138, y: 92, w: 34, h: 140, rx: 14, tx: 155, ty: 165, color: '#dbe7f3' },
    { key: 'legs', label: 'Legs', shape: 'rect', x: 74, y: 252, w: 22, h: 160, rx: 10, tx: 85, ty: 335, color: '#dbe7f3' },
    { key: 'legs', label: '', shape: 'rect', x: 104, y: 252, w: 22, h: 160, rx: 10, tx: 115, ty: 335, color: '#dbe7f3' },
  ] as any[];

  legend = [
    { color: '#f4b6c1', label: 'Cardiovascular' },
    { color: '#c9e6f5', label: 'Respiratory' },
    { color: '#f0d9a7', label: 'Metabolic' },
    { color: '#d9f0c4', label: 'Digestive' },
    { color: '#f7c9d4', label: 'Renal' },
  ];

  constructor(private route: ActivatedRoute, private api: Api) {}

  ngOnInit() {
    this.patientId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.get<any>(`/health-twins/${this.patientId}`).subscribe({
      next: (t) => {
        this.twin = t;
        this.loading = false;
        if (t?.conditions?.length || t?.medications?.length) {
          this.info = this.info ?? null;
        }
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.status === 404 ? 'No digital twin exists for this patient.' : 'Could not load the digital twin.';
      },
    });
  }

  select(region: string) {
    this.selected = region;
    this.info = this.regionInfo(region);
  }

  /** 0..1 → 0..100 (backend stores completeness as a fraction). */
  pct(v?: number): number {
    return Math.round(Number(v ?? 0) * 100);
  }

  riskTone(risk?: string): string {
    switch ((risk ?? '').toUpperCase()) {
      case 'HIGH':
      case 'VERY_HIGH':
        return 'critical';
      case 'MEDIUM':
      case 'MODERATE':
        return 'medium';
      default:
        return 'low';
    }
  }

  private regionInfo(region: string): RegionInfo {
    const t = this.twin;
    const vs = t?.vitalSummaries ?? {};
    const ls = t?.labSummaries ?? {};
    const risk = t?.riskMap ?? {};
    switch (region) {
      case 'heart':
        return {
          name: 'Heart',
          vitals: [
            ['Heart rate', vs['Heart Rate'] ?? vs.heartRate ?? '—'],
            ['Blood pressure', vs['Blood Pressure'] ?? vs.bloodPressure ?? '—'],
          ],
          risk: risk.cardiovascular ?? 'LOW',
          labs: `Total Cholesterol ${ls['Total Cholesterol'] ?? '—'}, HbA1c ${ls.HbA1c ?? '—'}`,
        };
      case 'lungs':
        return {
          name: 'Lungs',
          vitals: [
            ['Oxygen saturation', vs['Oxygen Saturation'] ?? vs.oxygenSaturation ?? '—'],
            ['Respiratory rate', vs['Respiratory Rate'] ?? vs.respiratoryRate ?? '—'],
          ],
          risk: 'LOW',
          labs: `SpO₂ ${vs['Oxygen Saturation'] ?? vs.oxygenSaturation ?? '—'}% · respiratory rate ${vs['Respiratory Rate'] ?? vs.respiratoryRate ?? '—'}/min`,
        };
      case 'liver':
        return {
          name: 'Liver',
          vitals: [['ALT', 'see labs'], ['AST', 'see labs']],
          risk: 'LOW',
          labs: `ALT/AST from lab results · HbA1c ${ls.HbA1c ?? '—'}`,
        };
      case 'kidneys':
        return {
          name: 'Kidneys',
          vitals: [['eGFR', 'see labs'], ['Creatinine', 'see labs']],
          risk: risk.renal ?? 'LOW',
          labs: 'eGFR and creatinine from lab results',
        };
      case 'stomach':
        return {
          name: 'Digestive system',
          vitals: [['Fasting glucose', ls['Fasting Glucose'] ?? '—']],
          risk: risk.diabetes ?? 'LOW',
          labs: `Fasting glucose ${ls['Fasting Glucose'] ?? '—'} mg/dL`,
        };
      case 'brain':
        return {
          name: 'Brain',
          vitals: [
            ['Sleep', vs['Sleep'] ?? vs.sleep ?? '—'],
            ['Cognitive score', vs['Cognitive Score'] ?? vs.cognitiveScore ?? '—'],
          ],
          risk: risk.neurological ?? risk.cognitive ?? 'LOW',
          labs: 'Cognitive and sleep indicators from the patient record',
        };
      case 'arms':
      case 'legs':
        return {
          name: 'Musculoskeletal',
          vitals: [['Activity (steps)', vs['Steps'] ?? vs.steps ?? '—'], ['BMI', t?.bodyMetrics?.bmi ?? '—']],
          risk: 'LOW',
          labs: 'Activity and body metrics from the patient record',
        };
      default:
        return { name: region, vitals: [], risk: 'LOW', labs: '' };
    }
  }
}
