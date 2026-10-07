import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

/* --------------------------------------------------------------------------
   Bar chart — animated, accent-driven, accessible
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  template: `
    <div class="chart-wrap">
      <svg *ngIf="data.length" [attr.viewBox]="'0 0 ' + (data.length * 48 + 24) + ' 172'" width="100%" height="172"
           preserveAspectRatio="none" role="img" [attr.aria-label]="'Bar chart: ' + summary">
        <line *ngFor="let g of [0, 1, 2]" x1="8" [attr.x2]="data.length * 48 + 16" [attr.y1]="20 + g * 36" [attr.y2]="20 + g * 36"
              stroke="var(--border)" stroke-dasharray="3 4" />
        <g *ngFor="let d of data; let i = index" [style.--i]="i">
          <rect class="bar-rect" [attr.x]="i * 48 + 14" [attr.y]="138 - barH(d.value)" width="30"
                [attr.height]="barH(d.value)" rx="5" [attr.fill]="d.color || 'var(--accent)'"
                [style.animation-delay.ms]="i * 70" [style.opacity]="d.value === 0 ? 0.35 : 1">
            <title>{{ d.label }}: {{ d.value }}</title>
          </rect>
          <text [attr.x]="i * 48 + 29" [attr.y]="134 - barH(d.value)" text-anchor="middle" font-size="10"
                font-weight="700" fill="var(--ink-soft)">{{ d.value }}</text>
          <text [attr.x]="i * 48 + 29" y="156" text-anchor="middle" font-size="9.5" fill="var(--muted)">{{ d.label }}</text>
        </g>
      </svg>
      <div class="empty" *ngIf="!data.length">No data available for this chart.</div>
      <div class="chart-legend" *ngIf="hint"><span class="lg muted">{{ hint }}</span></div>
    </div>
  `,
  imports: [NgFor, NgIf],
})
export class BarChartComponent {
  @Input() data: { label: string; value: number; color?: string }[] = [];
  @Input() hint = '';

  get summary(): string {
    return this.data.map((d) => `${d.label} ${d.value}`).join(', ');
  }

  barH(v: number) {
    const m = Math.max(...this.data.map((d) => d.value), 1);
    return Math.max((v / m) * 118, v > 0 ? 3 : 1.5);
  }
}

/* --------------------------------------------------------------------------
   Line chart — animated stroke, hoverable points, optional labels
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  template: `
    <div class="chart-wrap">
      <svg *ngIf="values.length" viewBox="0 0 340 160" width="100%" height="160" role="img"
           [attr.aria-label]="'Line chart: ' + summary" style="overflow: visible">
        <line *ngFor="let g of [0, 1, 2, 3]" x1="6" x2="336" [attr.y1]="18 + g * 30" [attr.y2]="18 + g * 30"
              stroke="var(--border)" stroke-dasharray="3 4" />
        <text x="336" y="14" text-anchor="end" font-size="9" fill="var(--muted)">max {{ max }}</text>
        <text x="336" y="146" text-anchor="end" font-size="9" fill="var(--muted)">min {{ min }}</text>
        <path class="line-path" [attr.d]="areaPath()" fill="url(#lg)" opacity="0.35" />
        <path class="line-path" [attr.d]="linePath()" fill="none" [attr.stroke]="color || 'var(--accent)'"
              stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
        <g *ngFor="let p of coords(); let i = index">
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" [attr.fill]="color || 'var(--accent)'"
                  stroke="var(--surface)" stroke-width="2" style="animation: pop-in .4s var(--ease) both"
                  [style.animation-delay.ms]="300 + i * 60">
            <title>{{ labels && labels.length ? (labels[i] ?? '') + ': ' : '' }}{{ values[i] }}</title>
          </circle>
          <text *ngIf="labels && labels.length === values.length" [attr.x]="p.x" y="156" text-anchor="middle"
                font-size="8.5" fill="var(--muted)">{{ labels[i] }}</text>
        </g>
        <defs>
          <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.55" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02" />
          </linearGradient>
        </defs>
      </svg>
      <div class="empty" *ngIf="!values.length">No trend data available yet.</div>
      <div class="chart-legend" *ngIf="hint"><span class="lg muted">{{ hint }}</span></div>
    </div>
  `,
  imports: [NgFor, NgIf],
})
export class LineChartComponent implements OnChanges {
  @Input() values: number[] = [];
  @Input() labels: string[] | null = null;
  @Input() color = '';
  @Input() hint = '';

  private _coords: { x: number; y: number }[] | null = null;

  ngOnChanges() {
    this._coords = null;
  }

  get max(): string {
    return this.values.length ? String(Math.max(...this.values)) : '—';
  }
  get min(): string {
    return this.values.length ? String(Math.min(...this.values)) : '—';
  }
  get summary(): string {
    return this.values.map((v, i) => `${this.labels?.[i] ?? i}: ${v}`).join(', ');
  }

  private bounds() {
    const vals = this.values.length ? this.values : [0];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    return { min, span };
  }

  coords() {
    if (this._coords) return this._coords;
    const { min, span } = this.bounds();
    this._coords = this.values.map((v, i) => ({
      x: 14 + (i / Math.max(this.values.length - 1, 1)) * 312,
      y: 132 - ((v - min) / span) * 108,
    }));
    return this._coords;
  }

  linePath() {
    return this.coords()
      .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(' ');
  }

  areaPath() {
    const c = this.coords();
    if (!c.length) return '';
    const base = 142;
    return `M${c[0].x.toFixed(1)},${base} ` + c.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L${c[c.length - 1].x.toFixed(1)},${base} Z`;
  }
}

/* --------------------------------------------------------------------------
   Donut — single animated ring
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-donut',
  standalone: true,
  template: `
    <div class="chart-wrap" style="display:flex; flex-direction:column; align-items:center; gap:0.4rem">
      <svg viewBox="0 0 120 120" [attr.width]="size" [attr.height]="size" role="img"
           [attr.aria-label]="label + ': ' + value + '%'">
        <circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface-alt)" stroke-width="15" />
        <circle class="donut-arc" cx="60" cy="60" r="46" fill="none" [attr.stroke]="color || 'var(--accent)'"
                stroke-width="15" stroke-linecap="round" [attr.stroke-dasharray]="dash()"
                stroke-dashoffset="0" transform="rotate(-90 60 60)" [style.--circ]="circ" />
        <text x="60" y="59" text-anchor="middle" font-size="19" font-weight="750" fill="var(--ink)">{{ displayValue }}</text>
        <text x="60" y="74" text-anchor="middle" font-size="8.5" fill="var(--muted)">{{ label }}</text>
      </svg>
      <div class="chart-legend" *ngIf="caption"><span class="lg muted">{{ caption }}</span></div>
    </div>
  `,
  imports: [NgIf],
})
export class DonutComponent implements OnChanges {
  @Input() value = 0;
  @Input() color = '';
  @Input() label = 'percent';
  @Input() caption = '';
  @Input() size = 140;
  @Input() suffix = '%';
  displayValue = '0%';

  readonly circ = 2 * Math.PI * 46;

  ngOnChanges(_c: SimpleChanges) {
    this.animateTo(Math.min(Math.max(this.value, 0), 100));
  }

  dash() {
    return `${(Math.min(this.value, 100) / 100) * this.circ} ${this.circ}`;
  }

  private animateTo(target: number) {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset['reduceMotion'] === 'true';
    if (reduced) {
      this.displayValue = Math.round(target) + this.suffix;
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / 850, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.displayValue = Math.round(target * eased) + this.suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

/* --------------------------------------------------------------------------
   Multi-segment donut (risk distribution, care plan status…)
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-donut-multi',
  standalone: true,
  template: `
    <div class="chart-wrap" style="display:flex; align-items:center; gap:1.1rem; flex-wrap:wrap">
      <svg viewBox="0 0 120 120" [attr.width]="size" [attr.height]="size" role="img" [attr.aria-label]="aria">
        <circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface-alt)" stroke-width="15" />
        <circle *ngFor="let s of arcSegments; let i = index" class="donut-arc" cx="60" cy="60" r="46" fill="none"
                [attr.stroke]="s.color" stroke-width="15" [attr.stroke-dasharray]="s.dash"
                [attr.stroke-dashoffset]="s.offset" transform="rotate(-90 60 60)"
                [style.--circ]="289" [style.animation-delay.ms]="i * 160">
          <title>{{ s.label }}: {{ s.value }}</title>
        </circle>
        <text x="60" y="57" text-anchor="middle" font-size="17" font-weight="750" fill="var(--ink)">{{ total }}</text>
        <text x="60" y="72" text-anchor="middle" font-size="8" fill="var(--muted)">total</text>
      </svg>
      <div class="stat-list" style="flex:1; min-width:150px">
        <div class="stat-row" *ngFor="let s of legend">
          <span class="sr-key"><span class="sw" [style.background]="s.color"></span>{{ s.label }}</span>
          <span class="sr-val number">{{ s.value }}<span class="muted" *ngIf="total > 0"> · {{ pct(s.value) }}%</span></span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sw { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
  `],
  imports: [NgFor, NgIf],
})
export class DonutMultiComponent implements OnChanges {
  @Input() segments: { label: string; value: number; color: string }[] = [];
  @Input() size = 140;

  arcSegments: { label: string; value: number; color: string; dash: string; offset: number }[] = [];

  ngOnChanges() {
    const circ = 2 * Math.PI * 46;
    const total = this.total || 1;
    let acc = 0;
    this.arcSegments = this.segments
      .filter((s) => Number(s.value) > 0)
      .map((s) => {
        const len = (Number(s.value) / total) * circ;
        const arc = { label: s.label, value: s.value, color: s.color, dash: `${len} ${circ}`, offset: -acc };
        acc += len;
        return arc;
      });
  }

  get total(): number {
    return this.segments.reduce((a, s) => a + (Number(s.value) || 0), 0);
  }
  get legend() {
    return this.segments;
  }
  get aria(): string {
    return this.segments.map((s) => `${s.label} ${s.value}`).join(', ');
  }

  pct(v: number): number {
    return this.total ? Math.round((v / this.total) * 100) : 0;
  }

}

/* --------------------------------------------------------------------------
   Animated number (KPI cards)
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-count',
  standalone: true,
  template: `<span class="number">{{ display }}</span>`,
})
export class CountComponent implements OnInit, OnChanges, OnDestroy {
  @Input() value = 0;
  @Input() suffix = '';
  @Input() decimals = 0;
  display = '0';
  private frame = 0;

  ngOnInit() {
    this.animate();
  }

  ngOnChanges() {
    this.animate();
  }

  ngOnDestroy() {
    if (this.frame) cancelAnimationFrame(this.frame);
  }

  private animate() {
    const target = Number(this.value) || 0;
    const reduced = typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.dataset['reduceMotion'] === 'true');
    if (reduced) {
      this.display = target.toFixed(this.decimals) + this.suffix;
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / 900, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      this.display = v.toFixed(this.decimals) + this.suffix;
      if (t < 1) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
}

/* --------------------------------------------------------------------------
   Animated progress bar
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-progress',
  standalone: true,
  template: `
    <div class="progress-row" *ngIf="label">
      <span class="pr-label">{{ label }}</span>
      <div class="progress" [ngClass]="tone" role="progressbar" [attr.aria-valuenow]="value" aria-valuemin="0" aria-valuemax="100"
           [attr.aria-label]="label">
        <div [style.width.%]="width"></div>
      </div>
      <span class="pr-value number">{{ value }}%</span>
    </div>
    <div class="progress" *ngIf="!label" [ngClass]="tone" role="progressbar" [attr.aria-valuenow]="value"
         aria-valuemin="0" aria-valuemax="100">
      <div [style.width.%]="width"></div>
    </div>
  `,
  imports: [NgIf, NgClass],
})
export class ProgressComponent implements OnInit {
  @Input() value = 0;
  @Input() label = '';
  @Input() tone = '';
  width = 0;

  ngOnInit() {
    // trigger the CSS width transition on the next tick
    setTimeout(() => (this.width = Math.min(Math.max(this.value, 0), 100)), 40);
  }
}

/* --------------------------------------------------------------------------
   SHAP-style explainability bars
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-shap',
  standalone: true,
  template: `
    <div *ngIf="features?.length; else noFeat">
      <div *ngFor="let f of features; let i = index" style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.5rem; animation: rise-in .4s var(--ease) both"
           [style.animation-delay.ms]="i * 55">
        <div style="width:190px; font-size:0.83rem">{{ f.feature }}</div>
        <div style="flex:1; background:var(--surface-alt); border-radius:6px; height:15px; position:relative; overflow:hidden">
          <div [style.width.%]="barWidth(f)" [style.background]="f.direction === 'DECREASES_RISK' ? 'var(--success)' : 'var(--danger)'"
               style="height:100%; border-radius:6px; transition: width .7s var(--ease)"></div>
        </div>
        <div style="width:96px; font-size:0.73rem; color:var(--muted)">
          {{ f.direction === 'DECREASES_RISK' ? '↓ reduces' : '↑ raises' }} · {{ f.contribution | number: '1.2-2' }}
        </div>
      </div>
      <p style="font-size:0.76rem; color:var(--muted); margin-top:0.6rem">
        Feature contributions from the risk model. Positive values raise the predicted score, negative values lower it.
      </p>
    </div>
    <ng-template #noFeat><div class="empty">No feature contributions stored for this prediction.</div></ng-template>
  `,
  imports: [NgFor, NgIf, DecimalPipe],
})
export class ShapChartComponent {
  @Input() features: { feature: string; contribution: number; direction: string }[] = [];

  barWidth(f: { contribution: number }): number {
    const max = Math.max(...(this.features ?? []).map((x) => Math.abs(x.contribution)), 0.01);
    return Math.max(3, (Math.abs(f.contribution) / max) * 100);
  }
}

/* --------------------------------------------------------------------------
   Sparkline — tiny inline trend used by the live-vitals panel
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-spark',
  standalone: true,
  template: `
    <svg *ngIf="points.length > 1" [attr.viewBox]="'0 0 ' + W + ' ' + H" width="100%" height="44"
         preserveAspectRatio="none" role="img" [attr.aria-label]="'Sparkline: ' + summary">
      <path [attr.d]="area()" fill="var(--accent-softer)" />
      <path class="spark-path" [attr.d]="line()" fill="none" [attr.stroke]="color || 'var(--accent)'"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      <circle *ngIf="last" [attr.cx]="last.x" [attr.cy]="last.y" r="3.2"
              [attr.fill]="color || 'var(--accent)'" />
    </svg>
    <div class="empty" *ngIf="points.length < 2" style="padding:0.6rem 0; font-size:0.78rem">
      Not enough readings yet
    </div>
  `,
  imports: [NgFor, NgIf],
})
export class SparkComponent {
  @Input() points: number[] = [];
  @Input() color = '';
  @Input() label = '';
  readonly W = 220;
  readonly H = 44;

  get summary(): string {
    if (!this.points.length) return 'no data';
    return `${this.label ? this.label + ': ' : ''}min ${Math.min(...this.points)}, max ${Math.max(...this.points)}`;
  }

  private bounds() {
    const vals = this.points.length ? this.points : [0];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { min, span: max - min || 1 };
  }

  private coords() {
    const { min, span } = this.bounds();
    const n = this.points.length;
    return this.points.map((v, i) => ({
      x: 4 + (i / Math.max(n - 1, 1)) * (this.W - 8),
      y: this.H - 6 - ((v - min) / span) * (this.H - 14),
    }));
  }

  get last() {
    const c = this.coords();
    return c.length ? c[c.length - 1] : null;
  }

  line(): string {
    return this.coords().map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  }

  area(): string {
    const c = this.coords();
    if (!c.length) return '';
    return `M${c[0].x.toFixed(1)},${this.H} ` +
      c.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L${c[c.length - 1].x.toFixed(1)},${this.H} Z`;
  }
}

/* --------------------------------------------------------------------------
   Clickable circular progress ring (dashboard)
   A real <button>, so Enter/Space, focus order and tooltips all work for free.
   -------------------------------------------------------------------------- */
@Component({
  selector: 'app-ring-card',
  standalone: true,
  template: `
    <button type="button" class="ring-card" [attr.aria-label]="aria" [title]="hint || aria"
            (click)="open.emit()">
      <span class="ring-card-head">
        <span class="ring-card-title">{{ title }}</span>
        <span class="ring-card-go" aria-hidden="true">›</span>
      </span>

      <span class="ring-card-body">
        <svg [attr.viewBox]="'0 0 ' + SIZE + ' ' + SIZE" [attr.width]="size" [attr.height]="size"
             role="img" [attr.aria-label]="aria">
          <circle [attr.cx]="C" [attr.cy]="C" r="46" fill="none" stroke="var(--surface-alt)"
                  stroke-width="14" />
          <g *ngIf="segments.length; else singleArc">
            <circle *ngFor="let s of arcSegments; let i = index" class="donut-arc" [attr.cx]="C" [attr.cy]="C" r="46"
                    fill="none" [attr.stroke]="s.color" stroke-width="14" [attr.stroke-dasharray]="s.dash"
                    [attr.stroke-dashoffset]="s.offset" transform="rotate(-90 60 60)"
                    [style.--circ]="CIRC" [style.animation-delay.ms]="i * 160">
              <title>{{ s.label }}: {{ s.value }}</title>
            </circle>
          </g>
          <ng-template #singleArc>
            <circle class="donut-arc" [attr.cx]="C" [attr.cy]="C" r="46" fill="none"
                    [attr.stroke]="tone || 'var(--accent)'" stroke-width="14" stroke-linecap="round"
                    [attr.stroke-dasharray]="dash()" transform="rotate(-90 60 60)"
                    [style.--circ]="CIRC" />
          </ng-template>
          <text x="60" y="58" text-anchor="middle" font-size="17" font-weight="750" fill="var(--ink)">
            {{ displayValue }}
          </text>
          <text x="60" y="74" text-anchor="middle" font-size="8.5" fill="var(--muted)">{{ centerLabel }}</text>
        </svg>
      </span>

      <span class="ring-card-caption">{{ caption }}</span>

      <span class="ring-card-legend" *ngIf="segments.length">
        <span class="rl" *ngFor="let s of segments">
          <span class="sw" [style.background]="s.color"></span>{{ s.label }}
          <b class="number">{{ s.value }}</b>
        </span>
      </span>
    </button>
  `,
  styles: [
    `
      .sw { width: 9px; height: 9px; border-radius: 3px; display: inline-block; margin-right: 4px; }
      .rl { display: inline-flex; align-items: center; gap: 2px; font-size: 0.72rem; color: var(--muted); }
      .rl b { color: var(--ink-soft); font-weight: 700; margin-left: 2px; }
    `,
  ],
  imports: [NgFor, NgIf],
})
export class RingCardComponent implements OnChanges {
  @Input() title = '';
  @Input() value = 0;
  @Input() suffix = '%';
  /** Literal centre text (e.g. "8/50") — when set it wins over the animated value. */
  @Input() centerValue = '';
  @Input() centerLabel = '';
  @Input() caption = '';
  @Input() hint = '';
  @Input() tone = '';
  @Input() size = 112;
  @Input() segments: { label: string; value: number; color: string }[] = [];
  @Output() open = new EventEmitter<void>();

  readonly SIZE = 120;
  readonly C = 60;
  readonly CIRC = 2 * Math.PI * 46;
  displayValue = '0%';

  ngOnChanges(_c: SimpleChanges) {
    const circ = this.CIRC;
    const total = this.segments.reduce((a, s) => a + (Number(s.value) || 0), 0) || 1;
    let acc = 0;
    this.arcSegments = this.segments
      .filter((s) => Number(s.value) > 0)
      .map((s) => {
        const len = (Number(s.value) / total) * circ;
        const arc = { label: s.label, value: s.value, color: s.color, dash: `${len} ${circ}`, offset: -acc };
        acc += len;
        return arc;
      });
    if (this.centerValue) {
      this.displayValue = this.centerValue;
      return;
    }
    if (this.segments.length) {
      this.displayValue = String(this.segments.reduce((a, s) => a + (Number(s.value) || 0), 0));
      return;
    }
    this.animateTo(Math.min(Math.max(Number(this.value) || 0, 0), 100));
  }

  arcSegments: { label: string; value: number; color: string; dash: string; offset: number }[] = [];

  get aria(): string {
    const detail = this.segments.length
      ? this.segments.map((s) => `${s.label} ${s.value}`).join(', ')
      : `${Math.round(Number(this.value) || 0)}${this.suffix}`;
    return `${this.title}: ${detail}. Open details.`;
  }

  dash(): string {
    const pct = Math.min(Math.max(Number(this.value) || 0, 0), 100);
    return `${(pct / 100) * this.CIRC} ${this.CIRC}`;
  }

  private animateTo(target: number) {
    if (typeof window === 'undefined') {
      this.displayValue = Math.round(target) + this.suffix;
      return;
    }
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset['reduceMotion'] === 'true';
    if (reduced) {
      this.displayValue = Math.round(target) + this.suffix;
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / 850, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.displayValue = Math.round(target * eased) + this.suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

/* --------------------------------------------------------------------------
   Accessible detail sheet (right-hand drawer used by the dashboard rings,
   wearable cards and alert rows). Escape closes, focus is trapped and
   restored to the trigger.
   -------------------------------------------------------------------------- */
export interface SheetRow {
  label: string;
  value?: string;
  tone?: string;
  hint?: string;
}
export interface SheetItem {
  title: string;
  sub?: string;
  badge?: string;
  badgeTone?: string;
  right?: string;
}
export interface SheetBlock {
  heading?: string;
  rows?: SheetRow[];
  items?: SheetItem[];
  note?: string;
}
export interface SheetAction {
  label: string;
  link?: string;
  primary?: boolean;
}

@Component({
  selector: 'app-detail-sheet',
  standalone: true,
  template: `
    <div class="sheet-backdrop" *ngIf="open" (click)="requestClose()"></div>
    <div class="sheet" *ngIf="open" role="dialog" aria-modal="true" [attr.aria-label]="title" tabindex="-1"
         #panel (keydown.tab)="trapTab($event)">
      <div class="sheet-head">
        <div>
          <span class="sheet-badge" *ngIf="badge" [ngClass]="badgeTone">{{ badge }}</span>
          <h3>{{ title }}</h3>
          <p class="small muted" *ngIf="subtitle">{{ subtitle }}</p>
        </div>
        <button type="button" class="icon-btn" aria-label="Close details" (click)="requestClose()">✕</button>
      </div>

      <div class="sheet-body">
        <div class="sheet-block" *ngFor="let b of blocks">
          <h4 *ngIf="b.heading" class="sheet-h">{{ b.heading }}</h4>

          <div class="stat-list" *ngIf="b.rows?.length">
            <div class="stat-row" *ngFor="let r of b.rows">
              <span class="sr-key">{{ r.label }}</span>
              <span class="sr-val number" [ngClass]="r.tone || ''">{{ r.value }}</span>
            </div>
          </div>

          <div class="sheet-items" *ngIf="b.items?.length">
            <div class="sheet-item" *ngFor="let it of b.items">
              <div class="si-main">
                <span class="si-title">{{ it.title }}</span>
                <span class="si-sub small muted" *ngIf="it.sub">{{ it.sub }}</span>
              </div>
              <span class="badge" *ngIf="it.badge" [ngClass]="it.badgeTone || ''">{{ it.badge }}</span>
              <span class="si-right number" *ngIf="it.right">{{ it.right }}</span>
            </div>
          </div>

          <p class="disclaimer" *ngIf="b.note">{{ b.note }}</p>
        </div>

        <p class="disclaimer" *ngIf="disclaimer">{{ disclaimer }}</p>
      </div>

      <div class="sheet-actions" *ngIf="actions?.length">
        <ng-container *ngFor="let a of actions; let first = index">
          <a class="btn" *ngIf="a.link" [class.secondary]="!first" [routerLink]="a.link"
             (click)="requestClose()">{{ a.label }}</a>
          <button type="button" class="btn secondary" *ngIf="!a.link" (click)="requestClose()">{{ a.label }}</button>
        </ng-container>
      </div>
    </div>
  `,
  imports: [NgFor, NgIf, NgClass, RouterLink],
})
export class DetailSheetComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() badge = '';
  @Input() badgeTone = '';
  @Input() blocks: SheetBlock[] = [];
  @Input() actions: SheetAction[] = [];
  @Input() disclaimer = '';
  @Output() close = new EventEmitter<void>();

  private lastFocused: HTMLElement | null = null;
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) {
      e.preventDefault();
      this.requestClose();
    }
  };

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['open']) return;
    if (this.open) {
      this.lastFocused = (document.activeElement as HTMLElement) ?? null;
      document.addEventListener('keydown', this.onKey);
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.querySelector<HTMLElement>('.sheet')?.focus(), 30);
    } else {
      this.teardown();
    }
  }

  ngOnDestroy() {
    this.teardown();
  }

  requestClose() {
    this.close.emit();
  }

  trapTab(e: Event) {
    const key = (e as KeyboardEvent).key;
    if (key !== 'Tab') return;
    const shift = (e as KeyboardEvent).shiftKey;
    const panel = (e.currentTarget as HTMLElement) ?? null;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (shift && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!shift && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  private teardown() {
    document.removeEventListener('keydown', this.onKey);
    document.body.style.overflow = '';
    this.lastFocused?.focus?.();
    this.lastFocused = null;
  }
}
