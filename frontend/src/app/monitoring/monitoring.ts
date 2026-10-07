import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../core/api';
import { AppearanceService } from '../core/appearance';
import { ToastService } from '../core/toast';

/**
 * Real-time monitoring (synthetic simulation mode): online patients, devices,
 * live vital stream, abnormal readings and active alerts — all read from the
 * backend data layer, never generated in the browser.
 */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, FormsModule, RouterLink],
  template: `
    <div class="card-title-row">
      <div>
        <span class="pill"><span class="live-dot"></span> Streaming</span>
        <h1 style="margin-top:0.4rem">Real-Time Monitoring</h1>
        <p class="card-sub">Continuous vital monitoring · last refresh {{ lastRefresh | date: 'mediumTime' }}</p>
      </div>
      <div class="row">
        <label class="switch">
          <input type="checkbox" [ngModel]="appearance.prefs.autoRefreshMonitoring"
                 (ngModelChange)="setAutoRefresh($event)" />
          <span class="track"></span> <span>Auto refresh (5s)</span>
        </label>
        <button class="outline-btn" (click)="refresh()">↻ Refresh</button>
      </div>
    </div>

    <div class="grid kpi-grid" *ngIf="!error">
      <div class="card kpi hoverable" *ngFor="let k of kpis">
        <div class="kpi-icon">{{ k.icon }}</div>
        <div class="value">{{ k.value ?? '—' }}</div>
        <div class="label">{{ k.label }}</div>
        <div class="trend" [class.neutral]="true">{{ k.hint }}</div>
      </div>
    </div>

    <div class="error-box" *ngIf="error">
      {{ error }} <button class="btn sm secondary" (click)="refresh()">Retry</button>
    </div>

    <div class="grid cols-2" style="margin-top:1rem">
      <div class="card">
        <div class="card-title-row">
          <h3>Live vital stream</h3>
          <span class="chip"><span class="live-dot"></span> {{ latest.length }} readings</span>
        </div>
        <div *ngIf="!latest.length && !error" class="empty">
          <span class="empty-icon">📡</span><h3>No recent readings</h3>
          <p>Readings arrive on the vitals stream every few seconds.</p>
        </div>
        <table class="responsive rows-static" *ngIf="latest.length">
          <thead><tr><th>Patient</th><th>Type</th><th>Value</th><th>Flag</th><th>Time</th></tr></thead>
          <tbody>
            <tr *ngFor="let v of latest; let i = index" [style.--i]="i">
              <td data-label="Patient"><a [routerLink]="['/patients', v.patientId]">{{ v.patientName || v.patientId }}</a></td>
              <td data-label="Type">{{ v.type }}</td>
              <td data-label="Value" class="number"><strong>{{ v.value }}</strong> <span class="small muted">{{ v.unit }}</span></td>
              <td data-label="Flag">
                <span class="badge" [ngClass]="abnormal(v) ? 'critical' : 'low'">{{ abnormal(v) ? 'ABNORMAL' : 'Normal' }}</span>
              </td>
              <td data-label="Time" class="small muted">{{ v.timestamp | date: 'HH:mm:ss' }}</td>
            </tr>
          </tbody>
        </table>
        <p class="disclaimer">Thresholds are configurable in Settings → Clinical alert thresholds.</p>
      </div>

      <div class="card">
        <div class="card-title-row">
          <h3>Connected devices</h3>
          <span class="chip">{{ devices.length }} registered</span>
        </div>
        <div *ngIf="!devices.length && !error" class="empty">
          <span class="empty-icon">⌚</span><h3>No devices registered</h3>
          <p>Devices are paired to patients during seeding.</p>
        </div>
        <table class="responsive rows-static" *ngIf="devices.length">
          <thead><tr><th>Device</th><th>Type</th><th>Patient</th><th>Status</th></tr></thead>
          <tbody>
            <tr *ngFor="let d of devices.slice(0, 12); let i = index" [style.--i]="i">
              <td data-label="Device" class="mono small">{{ d.deviceId || d.id }}</td>
              <td data-label="Type">{{ d.type }}</td>
              <td data-label="Patient">{{ d.patientName || d.patientId }}</td>
              <td data-label="Status"><span class="badge" [ngClass]="(d.status || 'OFFLINE') === 'ACTIVE' ? 'active' : 'acknowledged'">{{ d.status || 'OFFLINE' }}</span></td>
            </tr>
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="stat-list">
          <div class="stat-row"><span class="sr-key">Kafka</span>
            <span class="sr-val"><span class="badge acknowledged">disabled locally</span></span></div>
          <div class="stat-row"><span class="sr-key">Pipeline</span>
            <span class="sr-val">Vitals ingest → Rule engine → Alerts → Audit</span></div>
        </div>
      </div>
    </div>
  `,
})
export class MonitoringComponent implements OnInit, OnDestroy {
  summary: any = null;
  latest: any[] = [];
  devices: any[] = [];
  error = '';
  lastRefresh = new Date();
  appearance = inject(AppearanceService);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private api: Api, private toast: ToastService) {}

  ngOnInit() {
    this.refresh();
    this.timer = setInterval(() => {
      if (this.appearance.prefs.autoRefreshMonitoring) this.refresh();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  setAutoRefresh(value: boolean) {
    this.appearance.update({ autoRefreshMonitoring: value });
    this.toast.info(value ? 'Auto refresh enabled' : 'Auto refresh paused');
  }

  refresh() {
    this.error = '';
    this.api.get<any>('/monitoring/summary').subscribe({
      next: (s) => {
        this.summary = s;
        this.lastRefresh = new Date();
      },
      error: () => (this.error = 'Monitoring summary unavailable — is the backend running?'),
    });
    this.api.get<any[]>('/vitals/latest').subscribe({ next: (v) => (this.latest = (v ?? []).slice(0, 15)), error: () => {} });
    this.api.get<any[]>('/monitoring/devices').subscribe({ next: (d) => (this.devices = d ?? []), error: () => {} });
  }

  get kpis() {
    const s = this.summary ?? {};
    return [
      { icon: '👥', value: s.onlinePatients, label: 'Online patients', hint: 'vitals in the last 24h' },
      { icon: '⌚', value: s.connectedDevices, label: 'Connected devices', hint: 'paired wearables' },
      { icon: '📈', value: s.recentVitals, label: 'Current vitals', hint: 'readings in the last 24h' },
      { icon: '⚠', value: s.abnormalReadings, label: 'Abnormal readings', hint: 'breaching configured rules' },
      { icon: '🔔', value: s.activeAlerts, label: 'Active alerts', hint: 'open in the triage queue' },
      { icon: '🏥', value: s.totalPatients, label: 'Cohort size', hint: 'patients under management' },
    ];
  }

  abnormal(v: any) {
    if (v.type === 'SPO2') return v.value < 94;
    if (v.type === 'HEART_RATE') return v.value > 100 || v.value < 45;
    if (v.type === 'GLUCOSE') return v.value > 180 || v.value < 70;
    if (v.type === 'BLOOD_PRESSURE') return v.value > 140;
    if (v.type === 'TEMPERATURE') return v.value > 38.3;
    return false;
  }
}
