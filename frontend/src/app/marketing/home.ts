import { Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth';

/**
 * Public home page. Content is descriptive product information about the
 * MediSphere prototype — the charts/numbers shown in the hero preview are
 * explicitly labelled as an interface illustration, never as live data.
 * When a session is active the calls to action switch to dashboard shortcuts.
 */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <!-- ================================ nav ================================ -->
    <nav class="marketing-nav">
      <span class="brand"><span class="dot"></span> MediSphere</span>
      <span class="nav-links">
        <a href="/about">About</a>
        <a href="/features">Features</a>
        <a href="/how-it-works">How it works</a>
        <a href="/security">Security</a>
        <a href="/contact">Contact</a>
      </span>
      <span style="flex: 1"></span>
      <ng-container *ngIf="!signedIn">
        <a href="/login" class="btn ghost sm" style="color:#c3d4e8">Sign In</a>
        <a href="/register" class="btn sm">Get Started</a>
      </ng-container>
      <ng-container *ngIf="signedIn">
        <a routerLink="/dashboard" class="btn ghost sm" style="color:#c3d4e8">Open Dashboard</a>
        <button class="btn sm" type="button" (click)="signOut()">Sign out</button>
      </ng-container>
    </nav>

    <!-- ================================ hero =============================== -->
    <section class="hero">
      <div class="hero-glow"></div>
      <div class="hero-particles" aria-hidden="true">
        <span *ngFor="let p of particles" [style.left.px]="p.x" [style.top.px]="p.y"
              [style.width.px]="p.s" [style.height.px]="p.s"
              [style.animation-delay.ms]="p.d" [style.animation-duration.s]="p.dur"></span>
      </div>

      <div style="position:relative; z-index:2">
        <span class="eyebrow">● Cognitive Twin platform for connected care teams</span>
        <h1>Intelligent Healthcare.<br />Connected Patient Insights.</h1>
        <p class="hero-sub">MediSphere Cognitive Twin brings patient records, digital twins, risk intelligence,
          wearable monitoring and doctor-led care plans into one clinical workspace.</p>

        <div class="hero-ctas" *ngIf="!signedIn">
          <a class="btn" routerLink="/register">Get Started</a>
          <a class="btn secondary-light" routerLink="/login">Sign In</a>
        </div>
        <div class="hero-ctas" *ngIf="signedIn">
          <a class="btn" routerLink="/dashboard">Open Dashboard</a>
          <a class="btn secondary-light" routerLink="/patients">Browse patients</a>
        </div>

        <!-- interface preview (illustrative, not live data) -->
        <div class="hero-preview">
          <div class="row between" style="margin-bottom:0.75rem">
            <span class="small" style="color:#9fbdd9">📊 Clinical Intelligence Overview — dashboard preview</span>
            <span class="small" style="color:#6f8db0">sample layout</span>
          </div>
          <div class="preview-grid">
            <div class="preview-card" *ngFor="let c of previewCards; let i = index"
                 [style.animation-delay.ms]="i * 420">
              <div class="pc-label">{{ c.label }}</div>
              <div class="pc-value">{{ c.value }}</div>
              <div class="spark">
                <i *ngFor="let h of c.spark; let j = index" [style.height.%]="h"
                   [style.animation-delay.ms]="i * 200 + j * 70"></i>
              </div>
            </div>
          </div>

          <div class="grid cols-2" style="margin-top:0.7rem; gap:0.7rem">
            <div class="preview-card" style="animation:none">
              <div class="pc-label">Risk trend</div>
              <svg viewBox="0 0 300 70" width="100%" height="70" role="img" aria-label="Illustrative risk trend line">
                <polyline class="line-path" fill="none" stroke="var(--sidebar-indicator, #7ef0e0)" stroke-width="2.5"
                          stroke-linecap="round" points="6,54 46,46 86,50 126,34 166,38 206,24 246,28 294,14" />
                <circle *ngFor="let pt of trendDots" [attr.cx]="pt[0]" [attr.cy]="pt[1]" r="3.2"
                        fill="var(--sidebar-indicator, #7ef0e0)" style="animation: pop-in .4s var(--ease) both" />
              </svg>
              <div class="small" style="color:#8fadd0">Explainable SHAP contributions per factor</div>
            </div>
            <div class="preview-card" style="animation:none">
              <div class="pc-label">Digital Twin — body region view</div>
              <svg viewBox="0 0 60 74" width="60" height="74" role="img" aria-label="Illustrative digital twin silhouette" style="float:left; margin-right:0.8rem">
                <circle cx="30" cy="11" r="8" fill="rgba(255,255,255,0.18)" stroke="var(--sidebar-indicator, #7ef0e0)" stroke-width="1.4" />
                <rect x="20" y="21" width="20" height="26" rx="7" fill="rgba(255,255,255,0.14)" stroke="var(--sidebar-indicator, #7ef0e0)" stroke-width="1.4" />
                <rect x="13" y="23" width="6" height="20" rx="3" fill="rgba(255,255,255,0.12)" />
                <rect x="41" y="23" width="6" height="20" rx="3" fill="rgba(255,255,255,0.12)" />
                <rect x="22" y="49" width="7" height="22" rx="3" fill="rgba(255,255,255,0.12)" />
                <rect x="31" y="49" width="7" height="22" rx="3" fill="rgba(255,255,255,0.12)" />
                <circle cx="30" cy="30" r="3.4" fill="#ff7a90" class="twin-heart" />
              </svg>
              <div class="small" style="color:#8fadd0; overflow:hidden">
                Heart · Lungs · Liver · Kidneys · Brain<br />
                Click a region to inspect organ status, vitals and lab indicators.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================= platform overview ========================= -->
    <section class="section">
      <h2>One coherent clinical intelligence platform</h2>
      <p class="lead">MediSphere follows a single, auditable journey from raw patient data to tracked outcomes — every
        step is persisted, permissioned and reviewable.</p>
      <div class="workflow">
        <ng-container *ngFor="let step of workflow; let i = index; let last = last">
          <div class="wf-step">
            <div class="wf-num">STEP {{ i + 1 }}</div>
            <div class="wf-label">{{ step.label }}</div>
            <div class="small muted">{{ step.desc }}</div>
          </div>
          <span class="wf-arrow" *ngIf="!last" aria-hidden="true">→</span>
        </ng-container>
      </div>
    </section>

    <!-- ============================== care team ============================ -->
    <section class="section tinted">
      <div class="inner">
        <h2>One workspace, a different view for each role</h2>
        <p class="lead">The sidebar, the dashboard and every API call adapt to the signed-in role — and the backend
          enforces the same rules, so hiding a button is never the security boundary.</p>
        <div class="feature-grid">
          <div class="feature" *ngFor="let r of careTeamRoles">
            <div class="f-icon">{{ r.icon }}</div>
            <h3>{{ r.title }}</h3>
            <p>{{ r.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================== features ============================= -->
    <section class="section">
      <div class="inner">
        <h2>Product overview</h2>
        <p class="lead">Six connected modules share one cohort, so insight flows straight from one screen to the next.</p>
        <div class="feature-grid">
          <div class="feature" *ngFor="let f of features">
            <div class="f-icon">{{ f.icon }}</div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================== wearables =========================== -->
    <section class="section tinted">
      <div class="inner">
        <h2>Wearable &amp; device monitoring</h2>
        <p class="lead">Every patient can be paired with the device classes a modern remote-monitoring programme uses.
          Readings arrive on the vitals stream, feed the digital twin and trigger threshold alerts.</p>
        <div class="feature-grid">
          <div class="feature" *ngFor="let d of devices">
            <div class="f-icon">{{ d.icon }}</div>
            <h3>{{ d.title }}</h3>
            <p>{{ d.body }}</p>
            <div class="row" style="flex-wrap:wrap; gap:0.35rem; margin-top:0.7rem">
              <span class="chip" *ngFor="let m of d.metrics">{{ m }}</span>
            </div>
          </div>
        </div>
        <div class="metric-strip" style="margin-top:1.6rem">
          <div class="metric-tile" *ngFor="let m of deviceMetrics; let i = index" [style.animation-delay.ms]="i * 420">
            <div class="mt-value">{{ m.value }}</div>
            <div class="mt-label">{{ m.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================= doctor experience ======================== -->
    <section class="section">
      <div class="inner">
        <div class="grid cols-2" style="align-items:center">
          <div class="enter">
            <span class="pill">🩺 Doctor-first workflow</span>
            <h2 style="text-align:left; margin-top:0.7rem">Built for the reviewing physician</h2>
            <p class="muted" style="text-align:left">MediSphere is designed around the doctor who signs off: risk is
              explained before it is acted on, alerts arrive with an owner, and every care plan carries an approval
              history.</p>
            <ul style="padding-left:1.1rem; color:var(--ink-soft); line-height:1.9; text-align:left">
              <li *ngFor="let c of doctorCapabilities">{{ c }}</li>
            </ul>
          </div>

          <div class="card doctor-card enter" style="position:relative; overflow:hidden">
            <div class="doctor-head">
              <span class="avatar-lg photo-wrap">
                <img [src]="doctorPhoto" alt="Professional profile photo of Dr. Sarah Khan" width="88" height="88" />
                <span class="status-dot" aria-hidden="true"></span>
              </span>
              <div>
                <h3 style="margin:0">Dr. Sarah Khan</h3>
                <p class="small muted" style="margin:0.2rem 0 0">Consultant Physician · Cardiology</p>
                <div class="row" style="gap:0.4rem; margin-top:0.5rem; flex-wrap:wrap">
                  <span class="badge low">Doctor</span>
                  <span class="chip"><span class="live-dot"></span> Available</span>
                </div>
              </div>
            </div>

            <div class="stat-list" style="margin-top:1rem">
              <div class="stat-row" *ngFor="let r of doctorStats">
                <span class="sr-key">{{ r.key }}</span><span class="sr-val">{{ r.value }}</span>
              </div>
            </div>

            <div class="grid-actions" style="margin-top:1rem">
              <a class="btn" routerLink="/register">Get Started</a>
              <a class="btn secondary-light" routerLink="/login">Sign In</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================== dashboard preview ======================= -->
    <section class="section tinted">
      <div class="inner">
        <h2>Inside the MediSphere dashboard</h2>
        <p class="lead">The authenticated dashboard is a clinical command center — the same design system you are
          looking at now, driven entirely by the backend.</p>
        <div class="feature-grid">
          <div class="feature" *ngFor="let c of dashboardCards">
            <div class="f-icon">{{ c.icon }}</div>
            <h3>{{ c.title }}</h3>
            <p>{{ c.body }}</p>
          </div>
        </div>
        <div style="text-align:center; margin-top:1.6rem">
          <a class="btn" routerLink="/register">Experience the dashboard</a>
        </div>
      </div>
    </section>

    <!-- ============================ digital twin =========================== -->
    <section class="section">
      <div class="grid cols-2" style="align-items:center">
        <div class="enter">
          <span class="pill">🧬 Cognitive Twin</span>
          <h2 style="text-align:left; margin-top:0.7rem">Patient health state visualization</h2>
          <p class="muted">Each patient receives a living digital twin assembled from demographics, conditions,
            medications, vitals, labs, connected devices and FHIR resources. Selecting a body region — heart, lungs,
            liver, kidneys or brain — surfaces the relevant indicators, risk flags and recent readings.</p>
          <ul style="padding-left:1.1rem; color:var(--ink-soft); line-height:1.9">
            <li>Completeness scoring shows how rich the record is</li>
            <li>Risk map summarizes cardiovascular, metabolic and renal status</li>
            <li>Every value is read from the patient's persisted record</li>
          </ul>
          <a class="btn" href="/register">Explore the twin</a>
        </div>
        <div class="card enter" style="position:relative; overflow:hidden">
          <span class="pill twin-badge">Cognitive Twin overview</span>
          <div class="metric-strip" style="margin-bottom:1rem">
            <div class="metric-tile" *ngFor="let m of twinMetrics; let i = index" [style.animation-delay.ms]="i * 700">
              <div class="mt-value">{{ m.value }}</div>
              <div class="mt-label">{{ m.label }}</div>
            </div>
          </div>
          <div class="stat-list">
            <div class="stat-row" *ngFor="let r of twinRegions">
              <span class="sr-key">{{ r.icon }} {{ r.name }}</span>
              <span class="sr-val"><span class="badge" [class]="'badge ' + r.tone">{{ r.status }}</span></span>
            </div>
          </div>
          <p class="small muted">Region statuses are computed live from the patient's persisted vitals and labs.</p>
        </div>
      </div>
    </section>

    <!-- ======================== predictive intelligence ==================== -->
    <section class="section tinted">
      <div class="inner">
        <h2>Predictive intelligence, explained</h2>
        <p class="lead">The platform's model scores every patient and shows exactly why.</p>
        <div class="feature-grid">
          <div class="feature">
            <div class="f-icon">❤️</div>
            <h3>Cardiovascular 10-year risk</h3>
            <p>Combines age, blood pressure, cholesterol, BMI, activity and smoking status into a calibrated demo score
              with a risk band from Low to Very High.</p>
          </div>
          <div class="feature">
            <div class="f-icon">🩸</div>
            <h3>Diabetes complication risk</h3>
            <p>Uses HbA1c, fasting glucose, blood pressure and BMI to estimate complication risk, with trend direction
              across prediction history.</p>
          </div>
          <div class="feature">
            <div class="f-icon">◔</div>
            <h3>Explainability &amp; confidence</h3>
            <p>Every prediction ships SHAP-style feature contributions (raises / reduces risk), an evidence summary, a
              model version and a confidence value.</p>
          </div>
          <div class="feature">
            <div class="f-icon">⟲</div>
            <h3>Persistent history</h3>
            <p>Predictions are stored in MongoDB, so history tables and trend graphs read real records — regenerating a
              score never discards the previous one.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- =========================== monitoring + plans ====================== -->
    <section class="section">
      <div class="grid cols-2">
        <div class="enter">
          <span class="pill">📡 Real-time monitoring</span>
          <h2 style="text-align:left; margin-top:0.7rem">Continuous vital monitoring</h2>
          <p class="muted">The platform streams heart rate, blood pressure, SpO₂, glucose and temperature
            readings; the rule engine raises configurable alerts when thresholds are crossed.</p>
          <div class="vital-strip" style="margin-top:1rem">
            <div class="vital-tile" *ngFor="let v of vitalTiles">
              <div class="vt-label">{{ v.label }}</div>
              <div class="vt-value">{{ v.value }} <span class="vt-unit">{{ v.unit }}</span></div>
              <svg class="vt-ecg" viewBox="0 0 120 26" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0,18 L14,18 L18,8 L22,24 L26,18 L40,18 L44,8 L48,24 L52,18 L66,18 L70,8 L74,24 L78,18 L92,18 L96,8 L100,24 L104,18 L120,18" />
              </svg>
            </div>
          </div>
          <p class="small muted" style="margin-top:0.7rem">Streaming continues on the platform's own event transport —
            monitoring, alerts and trend history stay current either way.</p>
        </div>

        <div class="enter">
          <span class="pill">✚ AI-assisted care planning</span>
          <h2 style="text-align:left; margin-top:0.7rem">From generation to adherence</h2>
          <p class="muted">Care plans are drafted by the backend from the patient's risk prediction, vitals, labs and
            conditions, then routed through a clinical approval workflow.</p>
          <div class="workflow" style="justify-content:flex-start; margin-top:1rem">
            <div class="wf-step"><div class="wf-num">1</div><div class="wf-label">AI-assisted generation</div></div>
            <span class="wf-arrow">→</span>
            <div class="wf-step"><div class="wf-num">2</div><div class="wf-label">Doctor review</div></div>
            <span class="wf-arrow">→</span>
            <div class="wf-step"><div class="wf-num">3</div><div class="wf-label">Approval &amp; signature</div></div>
            <span class="wf-arrow">→</span>
            <div class="wf-step"><div class="wf-num">4</div><div class="wf-label">Active plan</div></div>
            <span class="wf-arrow">→</span>
            <div class="wf-step"><div class="wf-num">5</div><div class="wf-label">Adherence &amp; outcomes</div></div>
          </div>
          <div class="notice" style="margin-top:1rem">Every medication-related suggestion routes through
            <strong>doctor review</strong> before it can reach a plan, and every transition is audited.</div>
          <a class="outline-btn" href="/how-it-works">See the full workflow</a>
        </div>
      </div>
    </section>

    <!-- =============================== security =========================== -->
    <section class="section tinted">
      <div class="inner">
        <h2>Trust &amp; security architecture</h2>
        <p class="lead">Enterprise-shaped controls that a healthcare platform needs, applied on every request — and
          described here exactly as the prototype implements them, with no external certification claims.</p>
        <div class="feature-grid">
          <div class="feature" *ngFor="let s of security">
            <div class="f-icon">{{ s.icon }}</div>
            <h3>{{ s.title }}</h3>
            <p>{{ s.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ================================ CTA =============================== -->
    <section class="hero" style="padding:3.6rem 2rem; border-radius:0">
      <div class="hero-glow" style="left:-120px; right:auto; top:-180px"></div>
      <div style="position:relative; z-index:2">
        <h2 style="color:#fff; font-size:clamp(1.5rem,3vw,2.1rem)">Experience the MediSphere Cognitive Twin</h2>
        <p class="hero-sub">Start on the public home page, create an account and walk the full journey — patient data →
          cognitive twin → risk intelligence → monitoring → alerts → care plan → approval → reports.</p>
        <div class="hero-ctas" *ngIf="!signedIn">
          <a class="btn" routerLink="/register">Get Started</a>
          <a class="btn secondary-light" routerLink="/login">Sign In</a>
        </div>
        <div class="hero-ctas" *ngIf="signedIn">
          <a class="btn" routerLink="/dashboard">Get Started — open Dashboard</a>
          <a class="btn secondary-light" routerLink="/login">Sign In</a>
        </div>
        <p class="small" style="color:#9fbdd9; margin-top:1rem">
          {{ signedIn ? 'You are signed in — the dashboard opens your live records.' : 'Demo credentials are listed on the sign-in page.' }}
        </p>
      </div>
    </section>

    <footer class="site-footer">
      <div><strong>MediSphere Cognitive Twin</strong> — AI-powered digital health intelligence for proactive, personalized care.</div>
      <div style="margin-top:0.4rem">
        <a href="/about">About</a> · <a href="/features">Features</a> · <a href="/how-it-works">How it works</a> ·
        <a href="/security">Security</a> · <a href="/contact">Contact</a>
      </div>
      <div style="margin-top:0.5rem">© {{ year }} MediSphere Cognitive Twin</div>
    </footer>
  `,
  styles: [
    `
      .twin-heart { animation: pulse-ring 1.8s ease-out infinite; }
      .hero-preview .preview-grid { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
      .wf-step .wf-num { font-size: 0.66rem; color: var(--accent); font-weight: 700; letter-spacing: 0.1em; }
      .section.tinted { padding-block: 4rem; }
      .metric-tile .mt-value { font-size: 1.6rem; }
      h1 br { display: block; }
      .doctor-head { display: flex; align-items: center; gap: 1rem; }
      .photo-wrap {
        display: inline-flex; position: relative; padding: 0; overflow: visible;
        background: var(--surface-alt); border-radius: 50%; flex: 0 0 auto;
      }
      .photo-wrap img {
        display: block; width: 88px; height: 88px; border-radius: 50%;
        object-fit: cover; border: 2px solid var(--surface);
      }
      .photo-wrap .status-dot {
        position: absolute; right: 3px; bottom: 3px; width: 14px; height: 14px;
        border-radius: 50%; background: #23b57f; border: 2.5px solid var(--surface);
        animation: pulse-ring 2.4s ease-out infinite;
      }
      .feature { transition: transform 0.25s var(--ease, ease), box-shadow 0.25s var(--ease, ease); }
      .feature:hover { transform: translateY(-4px); }
    `,
  ],
})
export class HomeComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  year = new Date().getFullYear();

  /** True when a session is active — swaps the marketing CTAs for app shortcuts. */
  get signedIn(): boolean {
    return this.auth.isLoggedIn;
  }

  signOut() {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  /** Decorative hero particles (layout only — no data implied). */
  particles = Array.from({ length: 16 }, (_, i) => ({
    x: (i * 61) % 960,
    y: (i * 97) % 420,
    s: 4 + ((i * 3) % 7),
    d: i * 340,
    dur: 7 + ((i * 5) % 8),
  }));

  previewCards = [
    { label: 'Patients monitored', value: '50', spark: [30, 55, 42, 70, 60, 85, 74] },
    { label: 'High-risk cohort', value: '12', spark: [45, 40, 58, 52, 66, 61, 72] },
    { label: 'Open alerts', value: '17', spark: [20, 44, 36, 62, 48, 70, 55] },
    { label: 'Active care plans', value: '18', spark: [25, 35, 48, 44, 60, 68, 80] },
  ];

  trendDots: [number, number][] = [
    [6, 54], [46, 46], [86, 50], [126, 34], [166, 38], [206, 24], [246, 28], [294, 14],
  ];

  workflow = [
    { label: 'Patient Data', desc: 'Records, vitals, labs, wearables, FHIR' },
    { label: 'Cognitive Twin', desc: 'Per-patient health state assembled' },
    { label: 'Risk Intelligence', desc: 'Scored, explained, trended' },
    { label: 'Doctor Review', desc: 'A physician reviews and annotates' },
    { label: 'Personalized Care Plan', desc: 'Drafted, approved, signed' },
    { label: 'Continuous Monitoring', desc: 'Devices, alerts, adherence' },
    { label: 'Patient Outcomes', desc: 'Tracked against every goal' },
  ];

  /** Who the workspace adapts to — mirrored by the backend role guard. */
  careTeamRoles = [
    { icon: '🩺', title: 'Doctor', body: 'Reviews risk, signs care plans, triages alerts and owns the approval history.', tone: 'low' },
    { icon: '🤝', title: 'Nurse', body: 'Views assigned patients, records observations, acknowledges alerts and updates permitted plan activities.', tone: 'medium' },
    { icon: '📋', title: 'Care Manager', body: 'Coordinates follow-ups, monitors adherence and keeps the plan moving between visits.', tone: 'low' },
    { icon: '🧍', title: 'Patient', body: 'Sees their own record, cognitive twin, alerts and care plan — nothing else.', tone: 'low' },
    { icon: '⚙', title: 'Operations Lead', body: 'Manages the cohort, consents and reporting without touching clinical sign-off.', tone: 'low' },
  ];

  features = [
    {
      icon: '⚕',
      title: 'Patient 360',
      body: 'Unified patient information and clinical context — overview, vitals, labs, conditions, medications, predictions, alerts, care plans, timeline and audit history on one screen.',
    },
    {
      icon: '🧬',
      title: 'Cognitive Twin',
      body: 'A dynamic representation of patient health information and trends that unifies conditions, medications, vitals, labs and devices into an interactive body view.',
    },
    {
      icon: '◔',
      title: 'Risk Intelligence',
      body: 'Visual risk scoring with contributing factors — cardiovascular and diabetes risk computed by the backend model with confidence, model version and SHAP-style explanations.',
    },
    {
      icon: '📡',
      title: 'Wearable Monitoring',
      body: 'Connected health data and vital monitoring — heart rate, blood pressure, SpO₂, temperature, respiration and glucose streamed continuously with configurable thresholds.',
    },
    {
      icon: '✚',
      title: 'Smart Care Plans',
      body: 'Care-plan creation, tracking and doctor workflows: generation → review → modification → signature → active, with adherence tracking and full approval history.',
    },
    {
      icon: '⚠',
      title: 'Clinical Alerts',
      body: 'Actionable monitoring and patient alerts across Critical → Low severity, with New, Acknowledged, Investigating, Resolved and False-positive states, assignment and notes.',
    },
    {
      icon: '🗎',
      title: 'Audit & Reports',
      body: 'Login, patient access, prediction, approval, consent and export events are recorded, filterable and exportable as CSV.',
    },
    {
      icon: '✎',
      title: 'Consent Management',
      body: 'Consent is checked before clinical data is exposed, with a visible record of grants, revocations and expiry.',
    },
  ];

  devices = [
    { icon: '⌚', title: 'Smartwatch', body: 'Continuous wrist-worn monitoring that keeps the vitals stream warm between clinic visits.', metrics: ['Heart rate', 'Temperature', 'Activity'] },
    { icon: '📿', title: 'Fitness tracker', body: 'Activity and recovery signals that feed adherence and lifestyle goals on the care plan.', metrics: ['Activity', 'Steps', 'Sleep'] },
    { icon: '🩺', title: 'Blood pressure monitor', body: 'Home cuff readings that drive the hypertension range rule and the 7-day BP average.', metrics: ['Systolic', 'Diastolic', 'Pulse'] },
    { icon: '🫁', title: 'Pulse oximeter', body: 'Spot-check oxygen saturation with an immediate low-oxygen escalation path.', metrics: ['SpO₂', 'Pulse rate'] },
    { icon: '🩸', title: 'Glucose monitor', body: 'Fasting and post-meal glucose captured against the meal and medication timeline.', metrics: ['Glucose', 'Trend', 'Time in range'] },
  ];

  deviceMetrics = [
    { value: '5', label: 'Device classes per patient' },
    { value: '6', label: 'Vital types charted' },
    { value: '24h', label: 'Trend window' },
    { value: 'Live', label: 'Streaming panel' },
  ];

  doctorCapabilities = [
    'Review patient risk with the contributing factors in plain sight',
    'Monitor live vitals and configure the thresholds that matter',
    'Triage alerts with ownership, clinical notes and status transitions',
    'Create, modify and sign care plans with a full approval history',
    'Track adherence against goals, interventions and follow-ups',
    'Compare patient trends across 24-hour, 7-day and 30-day windows',
  ];

  doctorStats = [
    { key: 'Care plans signed', value: 'Approval history on every plan' },
    { key: 'Alerts triaged', value: 'Owner + note on each alert' },
    { key: 'Risk reviews', value: 'Explainable score breakdown' },
    { key: 'Availability', value: 'Online · accepting reviews' },
  ];

  dashboardCards = [
    { icon: '▦', title: 'Patient risk', body: 'Interactive risk rings with a full breakdown, the high-risk watchlist and SHAP top contributors.' },
    { icon: '✚', title: 'Care-plan progress', body: 'Adherence, active plans and awaiting-review counts with a direct link into the workflow.' },
    { icon: '⌚', title: 'Wearable status', body: 'Per-device battery, signal, last sync and online / idle / offline state for the whole panel.' },
    { icon: '📈', title: 'Vital trends', body: 'Heart rate, blood pressure, SpO₂, temperature, respiration and glucose across three time windows.' },
    { icon: '⚠', title: 'Alerts', body: 'Severity, measured value versus threshold, acknowledgement and one-click navigation to the patient.' },
    { icon: '📡', title: 'Patient monitoring', body: 'Streaming vitals panel with an on/off toggle, auto-refresh and a live "last updated" readout.' },
  ];

  doctorPhoto = 'assets/dr-sarah-khan.svg';

  twinMetrics = [
    { value: '100%', label: 'Record completeness' },
    { value: '8', label: 'Monitored indicators' },
  ];

  twinRegions = [
    { icon: '❤️', name: 'Heart', status: 'Stable', tone: 'low' },
    { icon: '🫁', name: 'Lungs', status: 'Normal', tone: 'low' },
    { icon: '🫘', name: 'Liver', status: 'Monitor', tone: 'medium' },
    { icon: '🩸', name: 'Kidneys', status: 'Normal', tone: 'low' },
    { icon: '🧠', name: 'Brain', status: 'Normal', tone: 'low' },
  ];

  vitalTiles = [
    { label: 'Heart rate', value: '78', unit: 'bpm' },
    { label: 'Systolic BP', value: '128', unit: 'mmHg' },
    { label: 'SpO₂', value: '97', unit: '%' },
    { label: 'Glucose', value: '112', unit: 'mg/dL' },
  ];

  security = [
    { icon: '🔑', title: 'JWT authentication', body: 'Short-lived access tokens with refresh-token rotation; invalid or expired tokens are rejected with explicit 401 responses.' },
    { icon: '🛡', title: 'Role-based access control', body: 'PATIENT users are limited to their own record by the backend, while admin, audit, monitoring and model endpoints are staff-only.' },
    { icon: '✎', title: 'Consent enforcement', body: 'Clinical reads check the consent record first; consent changes are audited with actor, timestamp and reason.' },
    { icon: '🗎', title: 'Audit logging', body: 'Sign-in, patient views, predictions, plan approvals, alert transitions, exports and settings changes are recorded — credentials and tokens are never logged.' },
    { icon: '📦', title: 'Data minimization', body: 'Tokens are the only credential in transit; responses expose only the fields each role needs, and exports are scoped to the caller.' },
    { icon: '⚙', title: 'Configurable CORS', body: 'Allowed origins are environment-driven (default localhost:4300 / 4200) rather than hard-coded, keeping dev and container setups separate.' },
  ];
}
