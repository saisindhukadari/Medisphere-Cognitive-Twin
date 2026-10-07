import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Api } from '../core/api';
import { AppearanceService, ACCENT_PRESETS, Theme } from '../core/appearance';
import { ToastService } from '../core/toast';

/**
 * Settings: appearance (theme / accent / UI preferences), clinical thresholds
 * persisted by the backend, notification preferences and storage controls.
 * Every toggle here changes real application behaviour — none are decorative.
 */
@Component({
  standalone: true,
  imports: [FormsModule, NgFor, NgIf, TitleCasePipe],
  template: `
    <div class="card-title-row">
      <div>
        <h1>Settings</h1>
        <p class="card-sub">Appearance, monitoring behaviour, alert thresholds and preferences.</p>
      </div>
      <button class="outline-btn" (click)="loadThresholds()">↻ Reload thresholds</button>
    </div>

    <!-- ============================== appearance ============================== -->
    <div class="grid cols-2">
      <div class="card enter">
        <div class="card-title-row">
          <h3>Appearance</h3>
          <span class="chip">{{ accentName }}</span>
        </div>
        <p class="card-sub">Theme applies instantly across the whole application and is remembered on this device.</p>

        <label class="field" style="margin-top:1rem">Theme</label>
        <div class="segmented" role="radiogroup" aria-label="Theme">
          <button *ngFor="let t of themeOptions" role="radio" [class.active]="appearance.prefs.theme === t"
                  [attr.aria-checked]="appearance.prefs.theme === t" (click)="setTheme(t)">
            {{ themeIcon(t) }} {{ t | titlecase }}
          </button>
        </div>

        <label class="field" style="margin-top:1.1rem">Accent color</label>
        <div class="row" style="gap:0.6rem">
          <button *ngFor="let p of presets" class="swatch" [style.background]="p.hex"
                  [class.selected]="appearance.prefs.accent.toLowerCase() === p.hex.toLowerCase()"
                  [attr.aria-label]="'Use ' + p.name + ' accent'" [attr.title]="p.name"
                  (click)="setAccent(p.hex)">
            <span *ngIf="isSelected(p.hex)" aria-hidden="true">✓</span>
          </button>
          <label class="swatch custom" [title]="'Custom accent'">
            <input type="color" [ngModel]="appearance.prefs.accent" (ngModelChange)="setAccent($event)"
                   aria-label="Custom accent color" />
            <span aria-hidden="true">＋</span>
          </label>
        </div>
        <p class="field-hint">Selected: {{ appearance.prefs.accent }} — updates sidebar, header, buttons, links, tabs,
          switches, progress bars, charts, cards, focus rings and digital-twin highlights.</p>

        <div class="divider"></div>

        <label class="switch" style="margin-bottom:0.7rem">
          <input type="checkbox" [ngModel]="appearance.isDark" (ngModelChange)="setDark($event)" />
          <span class="track"></span> <span>Dark mode</span>
        </label>
        <label class="switch" style="margin-bottom:0.7rem">
          <input type="checkbox" [ngModel]="appearance.prefs.compactSidebar" (ngModelChange)="setPref('compactSidebar', $event)" />
          <span class="track"></span> <span>Compact sidebar (icon-only navigation with tooltips)</span>
        </label>
        <label class="switch" style="margin-bottom:0.7rem">
          <input type="checkbox" [ngModel]="appearance.prefs.reduceMotion" (ngModelChange)="setPref('reduceMotion', $event)" />
          <span class="track"></span> <span>Reduce animations</span>
        </label>
        <label class="switch" style="margin-bottom:0.7rem">
          <input type="checkbox" [ngModel]="appearance.prefs.denseTables" (ngModelChange)="setPref('denseTables', $event)" />
          <span class="track"></span> <span>Dense tables</span>
        </label>
        <label class="switch">
          <input type="checkbox" [ngModel]="appearance.prefs.showTooltips" (ngModelChange)="setPref('showTooltips', $event)" />
          <span class="track"></span> <span>Show tooltips</span>
        </label>

        <div class="divider"></div>
        <button class="outline-btn" (click)="resetAppearance()">Reset appearance to defaults</button>
      </div>

      <!-- ============================ behaviour ============================ -->
      <div class="card enter">
        <h3>Monitoring &amp; notifications</h3>
        <p class="card-sub">Behaviour of live pages and alerting inside the prototype.</p>

        <div class="stack" style="margin-top:1rem">
          <label class="switch">
            <input type="checkbox" [ngModel]="appearance.prefs.autoRefreshMonitoring"
                   (ngModelChange)="setPref('autoRefreshMonitoring', $event)" />
            <span class="track"></span>
            <span>Auto refresh monitoring &amp; dashboard <span class="muted small">(60s)</span></span>
          </label>
          <label class="switch">
            <input type="checkbox" [ngModel]="appearance.prefs.alertSounds"
                   (ngModelChange)="setPref('alertSounds', $event)" />
            <span class="track"></span>
            <span>Alert sound on new critical alerts</span>
          </label>
          <label class="switch">
            <input type="checkbox" [ngModel]="appearance.prefs.desktopNotifications"
                   (ngModelChange)="setPref('desktopNotifications', $event)" />
            <span class="track"></span>
            <span>Desktop notifications <span class="muted small">({{ notifPermission }})</span></span>
          </label>
        </div>

        <div class="divider"></div>

        <h3>Dashboard</h3>
        <p class="card-sub">Control which command-centre sections are shown and how often they poll.</p>
        <div class="stack" style="margin-top:1rem">
          <label class="switch">
            <input type="checkbox" [ngModel]="appearance.prefs.liveMonitoring"
                   (ngModelChange)="setPref('liveMonitoring', $event)" />
            <span class="track"></span>
            <span>Live vitals panel <span class="muted small">(15s polling)</span></span>
          </label>
          <label class="switch">
            <input type="checkbox" [ngModel]="appearance.prefs.compactDashboard"
                   (ngModelChange)="setPref('compactDashboard', $event)" />
            <span class="track"></span>
            <span>Compact dashboard (tighter cards &amp; spacing)</span>
          </label>
          <label class="switch">
            <input type="checkbox" [ngModel]="appearance.prefs.showWearables"
                   (ngModelChange)="setPref('showWearables', $event)" />
            <span class="track"></span>
            <span>Show wearable devices section</span>
          </label>
          <label class="switch">
            <input type="checkbox" [ngModel]="appearance.prefs.showAlerts"
                   (ngModelChange)="setPref('showAlerts', $event)" />
            <span class="track"></span>
            <span>Show alerts panel</span>
          </label>
          <label class="switch">
            <input type="checkbox" [ngModel]="appearance.prefs.showHighRisk"
                   (ngModelChange)="setPref('showHighRisk', $event)" />
            <span class="track"></span>
            <span>Show high-risk patients table</span>
          </label>
        </div>

        <div class="divider"></div>

        <h3>Clinical alert thresholds</h3>
        <p class="card-sub">Configurable demonstration rules — not universal medical guidance.</p>
        <div class="grid cols-3" style="margin-top:0.7rem">
          <div><label class="field">Systolic BP ≥</label><input class="input" type="number" [(ngModel)]="t.systolicUpper" /></div>
          <div><label class="field">Heart rate ≥</label><input class="input" type="number" [(ngModel)]="t.heartRateUpper" /></div>
          <div><label class="field">SpO₂ ≤</label><input class="input" type="number" step="0.1" [(ngModel)]="t.spo2Lower" /></div>
          <div><label class="field">Glucose ≥</label><input class="input" type="number" [(ngModel)]="t.glucoseUpper" /></div>
          <div><label class="field">Temperature ≥</label><input class="input" type="number" step="0.1" [(ngModel)]="t.temperatureFever" /></div>
        </div>
        <div class="row" style="margin-top:0.8rem">
          <button class="btn" (click)="saveThresholds()" [disabled]="savingThresholds">
            <span class="spinner" *ngIf="savingThresholds"></span> Save thresholds
          </button>
          <button class="outline-btn" (click)="resetThresholds()">Restore defaults</button>
        </div>

        <div class="divider"></div>

        <h3>Storage &amp; local preferences</h3>
        <p class="card-sub">Appearance preferences are stored in this browser only. Clinical records live in MongoDB —
          clearing local state never touches the backend.</p>
        <div class="row" style="margin-top:0.6rem">
          <button class="outline-btn" (click)="clearLocal()">Clear local preferences</button>
          <span class="small muted" *ngIf="storageNote">{{ storageNote }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .swatch {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        border: 2px solid transparent;
        cursor: pointer;
        display: grid;
        place-items: center;
        color: #fff;
        font-weight: 700;
        transition: transform 0.15s var(--ease), box-shadow 0.15s ease, border-color 0.15s ease;
        box-shadow: 0 3px 8px rgba(16, 42, 67, 0.18);
      }
      .swatch:hover { transform: translateY(-3px) scale(1.05); }
      .swatch.selected {
        border-color: var(--ink);
        box-shadow: 0 0 0 3px var(--accent-softer), 0 6px 14px rgba(16, 42, 67, 0.22);
      }
      .swatch.custom {
        background: linear-gradient(135deg, #ef7a53, #7c3aed, #0e6fbd, #059669);
        position: relative;
        overflow: hidden;
        font-size: 1.1rem;
      }
      .swatch.custom input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
    `,
  ],
})
export class SettingsComponent implements OnInit {
  themeOptions: Theme[] = ['light', 'dark', 'system'];
  presets = ACCENT_PRESETS;
  appearance = inject(AppearanceService);
  private toast = inject(ToastService);

  t = { systolicUpper: 140, heartRateUpper: 110, spo2Lower: 92, glucoseUpper: 180, temperatureFever: 38.0 };
  defaults = { ...this.t };
  savingThresholds = false;
  storageNote = '';

  constructor(private api: Api) {}

  ngOnInit() {
    this.loadThresholds();
  }

  get accentName(): string {
    const hex = this.appearance.prefs.accent.toLowerCase();
    return this.presets.find((p) => p.hex.toLowerCase() === hex)?.name ?? `Custom ${hex}`;
  }

  get notifPermission(): string {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  }

  themeIcon(t: Theme): string {
    return t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻';
  }

  isSelected(hex: string): boolean {
    return this.appearance.prefs.accent.toLowerCase() === hex.toLowerCase();
  }

  setTheme(theme: Theme) {
    this.appearance.setTheme(theme);
    this.toast.info(`Theme set to ${theme}`);
  }

  setDark(isDark: boolean) {
    this.appearance.setTheme(isDark ? 'dark' : 'light');
    this.toast.info(isDark ? 'Dark mode on' : 'Light mode on');
  }

  setAccent(hex: string) {
    this.appearance.setAccent(hex);
    this.toast.info(`Accent color set to ${this.accentName}`);
  }

  setPref(
    key:
      | 'compactSidebar'
      | 'reduceMotion'
      | 'denseTables'
      | 'showTooltips'
      | 'autoRefreshMonitoring'
      | 'alertSounds'
      | 'desktopNotifications'
      | 'liveMonitoring'
      | 'compactDashboard'
      | 'showWearables'
      | 'showAlerts'
      | 'showHighRisk',
    value: boolean,
  ) {
    this.appearance.update({ [key]: value } as any);
    if (key === 'desktopNotifications' && value && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(() => this.toast.info('Desktop notification permission: ' + this.notifPermission));
      return;
    }
    this.toast.success(`${labelFor(key)} ${value ? 'enabled' : 'disabled'}`);
  }

  resetAppearance() {
    this.appearance.reset();
    this.toast.success('Appearance reset to defaults');
  }

  clearLocal() {
    localStorage.removeItem('ms_appearance');
    localStorage.removeItem('ms_last_patient');
    this.storageNote = 'Local preferences cleared. Reloading…';
    this.toast.success('Local preferences cleared');
    setTimeout(() => location.reload(), 600);
  }

  // ------------------------------------------------------------- thresholds
  loadThresholds() {
    this.api.get<any>('/settings/thresholds').subscribe({
      next: (s) => {
        this.t = {
          systolicUpper: s.systolicUpper,
          heartRateUpper: s.heartRateUpper,
          spo2Lower: s.spo2Lower,
          glucoseUpper: s.glucoseUpper,
          temperatureFever: s.temperatureFever,
        };
        this.defaults = { ...this.t };
      },
      error: () => this.toast.error('Could not load alert thresholds'),
    });
  }

  saveThresholds() {
    this.savingThresholds = true;
    this.api.post<any>('/settings/thresholds', this.t).subscribe({
      next: () => {
        this.savingThresholds = false;
        this.defaults = { ...this.t };
        this.toast.success('Alert thresholds saved and audited');
      },
      error: (e) => {
        this.savingThresholds = false;
        this.toast.error('Failed to save thresholds: ' + (e?.error?.message ?? e?.message ?? 'unknown error'));
      },
    });
  }

  resetThresholds() {
    this.t = { ...this.defaults };
    this.toast.info('Thresholds restored to last saved values');
  }
}

function labelFor(key: string): string {
  switch (key) {
    case 'compactSidebar':
      return 'Compact sidebar';
    case 'reduceMotion':
      return 'Reduced motion';
    case 'denseTables':
      return 'Dense tables';
    case 'showTooltips':
      return 'Tooltips';
    case 'autoRefreshMonitoring':
      return 'Auto refresh';
    case 'alertSounds':
      return 'Alert sounds';
    case 'desktopNotifications':
      return 'Desktop notifications';
    case 'liveMonitoring':
      return 'Live vitals panel';
    case 'compactDashboard':
      return 'Compact dashboard';
    case 'showWearables':
      return 'Wearable section';
    case 'showAlerts':
      return 'Alerts panel';
    case 'showHighRisk':
      return 'High-risk table';
    default:
      return key;
  }
}
