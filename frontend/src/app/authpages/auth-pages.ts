import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { AuthService } from '../core/auth';

/** Decorative hero graphic shared by the auth screens. */
@Component({
  standalone: true,
  selector: 'app-auth-aside',
  template: `
    <aside class="auth-aside">
      <div class="brand"><span class="dot"></span> MediSphere Cognitive Twin</div>
      <h2>AI-powered digital health intelligence for proactive, personalized care.</h2>
      <p>Follow the full clinical journey — patient records → cognitive twin → risk intelligence →
        monitoring → alerts → AI-assisted care plan → doctor approval → outcomes.</p>
      <ul>
        <li>Role-based access enforced by the backend, not just the UI</li>
        <li>Explainable risk predictions with SHAP-style contributions</li>
        <li>Care plans always require doctor review before activation</li>
        <li>Every privileged action is written to an immutable audit trail</li>
      </ul>

      <div class="twin-art" aria-hidden="true">
        <svg viewBox="0 0 240 150" width="100%" height="150">
          <rect x="6" y="6" width="228" height="138" rx="14" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.16)" />
          <text x="20" y="30" font-size="10" fill="#9fbdd9" letter-spacing="1.4">DIGITAL TWIN · SYNTHETIC</text>

          <!-- silhouette -->
          <circle cx="56" cy="62" r="12" fill="rgba(255,255,255,0.16)" stroke="var(--sidebar-indicator,#7ef0e0)" stroke-width="1.4" />
          <rect x="40" y="78" width="32" height="40" rx="10" fill="rgba(255,255,255,0.12)" stroke="var(--sidebar-indicator,#7ef0e0)" stroke-width="1.4" />
          <rect x="27" y="80" width="8" height="30" rx="4" fill="rgba(255,255,255,0.1)" />
          <rect x="77" y="80" width="8" height="30" rx="4" fill="rgba(255,255,255,0.1)" />
          <rect x="43" y="120" width="11" height="22" rx="5" fill="rgba(255,255,255,0.1)" />
          <rect x="58" y="120" width="11" height="22" rx="5" fill="rgba(255,255,255,0.1)" />
          <circle cx="56" cy="90" r="5" fill="#ff7a90" class="heart" />

          <!-- vitals -->
          <g font-size="9" fill="#cfe2f5">
            <text x="104" y="52">HR 78 bpm</text>
            <text x="104" y="70">BP 128/82</text>
            <text x="104" y="88">SpO₂ 97%</text>
            <text x="104" y="106">Glucose 112</text>
          </g>
          <path class="ecg" d="M100,120 L118,120 L123,108 L128,132 L133,120 L150,120 L155,108 L160,132 L165,120 L182,120 L187,108 L192,132 L197,120 L226,120"
                fill="none" stroke="var(--sidebar-indicator,#7ef0e0)" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>
    </aside>
  `,
  styles: [
    `
      .heart { animation: pulse-ring 1.7s ease-out infinite; }
      .ecg { stroke-dasharray: 260; animation: draw-line 2.6s linear infinite; }
    `,
  ],
})
export class AuthAsideComponent {}

/* -------------------------------------------------------------------------- */

@Component({
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, AuthAsideComponent],
  template: `
    <div class="auth-page">
      <app-auth-aside />

      <div class="auth-panel">
        <form class="auth-card" (ngSubmit)="submit()" novalidate>
          <div class="steps-dots" aria-hidden="true"><i class="on"></i><i></i><i></i></div>
          <h1>Sign in</h1>
          <p class="sub">Welcome back to MediSphere.</p>

          <div class="error-box" role="alert" *ngIf="error">{{ error }}</div>
          <div class="notice" role="status" *ngIf="success">✓ Signed in — taking you to your dashboard…</div>

          <div class="field-group" style="--i: 0">
            <label class="field" for="email">Email</label>
            <input id="email" class="input" type="email" name="email" autocomplete="email"
                   placeholder="you@example.com" [(ngModel)]="email" required [attr.aria-invalid]="!!error" />
          </div>

          <div class="field-group" style="--i: 1">
            <label class="field" for="password">Password</label>
            <div class="pw-toggle">
              <input id="password" class="input" [type]="show ? 'text' : 'password'" name="password"
                     autocomplete="current-password" placeholder="••••••••" [(ngModel)]="password" required />
              <button type="button" (click)="show = !show" [attr.aria-label]="show ? 'Hide password' : 'Show password'">
                {{ show ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <div class="row between" style="margin:0.9rem 0 1.1rem">
            <label class="switch">
              <input type="checkbox" [(ngModel)]="remember" name="remember" />
              <span class="track"></span> <span>Remember me</span>
            </label>
            <a href="/forgot-password" class="small">Forgot password?</a>
          </div>

          <button class="btn block" type="submit" [disabled]="loading" [attr.aria-busy]="loading">
            <span class="spinner" *ngIf="loading"></span>
            {{ loading ? 'Signing in…' : 'Sign In' }}
          </button>

          <p style="margin-top:1rem; font-size:0.85rem; text-align:center">
            New here? <a href="/register">Create an account</a>
          </p>

          <div class="divider"></div>
          <p class="small muted" style="margin-bottom:0.5rem">Demo accounts — click to fill:</p>
          <div class="stack" style="gap:0.35rem">
            <button type="button" class="outline-btn" style="justify-content:flex-start; font-size:0.78rem"
                    *ngFor="let d of demo" (click)="fill(d.email, d.password)">
              <span>{{ d.email }}</span><span class="muted" style="margin-left:auto">{{ d.role }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  remember = false;
  show = false;
  loading = false;
  error = '';
  success = false;

  demo = [
    { email: 'admin@medisphere.demo', password: 'Admin@12345', role: 'Clinical Director' },
    { email: 'provider@medisphere.demo', password: 'Provider@123', role: 'Doctor' },
    { email: 'nurse@medisphere.demo', password: 'Nurse@12345', role: 'Nurse' },
    { email: 'caremanager@medisphere.demo', password: 'Care@12345', role: 'Care Manager' },
    { email: 'patient@medisphere.demo', password: 'Patient@123', role: 'Patient' },
  ];

  constructor(private auth: AuthService, private router: Router) {}

  fill(email: string, password: string) {
    this.email = email;
    this.password = password;
    this.error = '';
  }

  submit() {
    this.error = '';
    if (!this.email || !this.password) {
      this.error = 'Email and password are required.';
      return;
    }
    this.loading = true;
    this.auth.login(this.email, this.password, this.remember).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/dashboard']), 350);
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.message ?? 'Login failed. Check your credentials.';
      },
    });
  }
}

/* -------------------------------------------------------------------------- */

@Component({
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, NgClass, AuthAsideComponent],
  template: `
    <div class="auth-page">
      <app-auth-aside />

      <div class="auth-panel">
        <form class="auth-card" (ngSubmit)="submit()" novalidate>
          <div class="steps-dots" aria-hidden="true">
            <i [class.on]="step >= 1"></i><i [class.on]="step >= 2"></i>
          </div>

          <div *ngIf="step === 1" class="fade-in">
            <h1>Create account</h1>
            <p class="sub">Step 1 of 2 — tell us who you are.</p>

            <div class="error-box" role="alert" *ngIf="error">{{ error }}</div>

            <div class="field-group" style="--i: 0">
              <label class="field" for="name">Full name</label>
              <input id="name" class="input" name="name" placeholder="e.g. Dr. Jordan Ellis" [(ngModel)]="name"
                     autocomplete="name" required />
            </div>

            <div class="field-group" style="--i: 1">
              <label class="field" for="remail">Email</label>
              <input id="remail" class="input" type="email" name="email" placeholder="you@example.com"
                     [(ngModel)]="email" autocomplete="email" required />
            </div>

            <button class="btn block" type="button" style="margin-top:1.1rem" (click)="next()">
              Continue →
            </button>
            <p style="margin-top:1rem; font-size:0.85rem; text-align:center">
              Already registered? <a href="/login">Sign in</a>
            </p>
          </div>

          <div *ngIf="step === 2" class="fade-in">
            <h1>Security</h1>
            <p class="sub">Step 2 of 2 — choose a password and your workspace role.</p>

            <div class="error-box" role="alert" *ngIf="error">{{ error }}</div>
            <div class="notice" role="status" *ngIf="success">✓ Account created — signing you in…</div>

            <div class="field-group" style="--i: 0">
              <label class="field" for="rpassword">Password (min 8 characters)</label>
              <div class="pw-toggle">
                <input id="rpassword" class="input" [type]="show ? 'text' : 'password'" name="password"
                       autocomplete="new-password" [(ngModel)]="password" required (ngModelChange)="touchStrength()" />
                <button type="button" (click)="show = !show" [attr.aria-label]="show ? 'Hide password' : 'Show password'">
                  {{ show ? 'Hide' : 'Show' }}
                </button>
              </div>
              <div class="strength" [ngClass]="'s-' + strength.key" *ngIf="password.length > 0" aria-hidden="true">
                <i></i><i></i><i></i><i></i>
              </div>
              <div class="strength-label" *ngIf="password.length > 0">Password strength: <strong>{{ strength.label }}</strong></div>
            </div>

            <div class="field-group" style="--i: 1">
              <label class="field" for="role">Role</label>
              <select id="role" class="input" name="role" [(ngModel)]="role">
                <option value="PATIENT">Patient</option>
                <option value="PROVIDER">Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="CARE_MANAGER">Care Manager</option>
                <option value="ADMIN">Operations Lead</option>
              </select>
              <p class="field-hint">The role controls what you can see. Backend authorization enforces the same rules.</p>
            </div>

            <div class="row" style="margin-top:1.1rem; gap:0.6rem">
              <button class="outline-btn" type="button" (click)="back()">← Back</button>
              <button class="btn" style="flex:1" type="submit" [disabled]="loading || success" [attr.aria-busy]="loading">
                <span class="spinner" *ngIf="loading"></span>
                {{ loading ? 'Creating account…' : 'Create account' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  step = 1;
  name = '';
  email = '';
  password = '';
  role = 'PATIENT';
  show = false;
  loading = false;
  success = false;
  error = '';
  strengthTouched = false;

  constructor(private auth: AuthService, private router: Router) {}

  get strength(): { key: string; label: string } {
    const p = this.password ?? '';
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (p.length < 8) return { key: 'weak', label: 'Weak' };
    if (score <= 2) return { key: 'weak', label: 'Weak' };
    if (score === 3) return { key: 'fair', label: 'Fair' };
    if (score === 4) return { key: 'good', label: 'Good' };
    return { key: 'strong', label: 'Strong' };
  }

  touchStrength() {
    this.strengthTouched = true;
    this.error = '';
  }

  next() {
    this.error = '';
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
    if (!this.name.trim()) {
      this.error = 'Please enter your full name.';
      return;
    }
    if (!emailOk) {
      this.error = 'Please enter a valid email address.';
      return;
    }
    this.step = 2;
  }

  back() {
    this.error = '';
    this.step = 1;
  }

  submit() {
    this.error = '';
    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters.';
      return;
    }
    this.loading = true;
    this.auth.register({ name: this.name, email: this.email, password: this.password, role: this.role }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/dashboard']), 500);
      },
      error: (e) => {
        this.loading = false;
        this.error = e?.error?.message ?? 'Registration failed.';
      },
    });
  }
}

/* -------------------------------------------------------------------------- */

@Component({
  standalone: true,
  imports: [FormsModule, NgIf, AuthAsideComponent],
  template: `
    <div class="auth-page">
      <app-auth-aside />

      <div class="auth-panel">
        <form class="auth-card" (ngSubmit)="send()" novalidate>
          <div class="steps-dots" aria-hidden="true"><i class="on"></i><i class="on" [class.on]="sent"></i><i [class.on]="sent"></i></div>
          <h1>Reset password</h1>
          <p class="sub">Enter your email and we will send reset instructions.</p>

          <div class="notice" role="status" *ngIf="sent">
            ✓ If an account exists for that address, reset instructions have been sent.
          </div>

          <div class="field-group" style="--i: 0">
            <label class="field" for="femail">Email</label>
            <input id="femail" class="input" type="email" name="email" [(ngModel)]="email" autocomplete="email"
                   placeholder="you@example.com" />
          </div>

          <button class="btn block" type="submit" style="margin-top:1rem" [disabled]="sent">
            {{ sent ? 'Link sent' : 'Send reset link' }}
          </button>

          <p style="margin-top:1rem; text-align:center; font-size:0.85rem"><a href="/login">← Back to sign in</a></p>
          <p class="small muted" style="text-align:center">Demo environment — no real email is dispatched.</p>
        </form>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  email = '';
  sent = false;

  send() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) return;
    this.sent = true;
  }
}
