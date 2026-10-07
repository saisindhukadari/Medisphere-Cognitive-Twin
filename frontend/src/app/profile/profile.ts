import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor, NgClass, AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, UserDto } from '../core/auth';
import { profilePortrait } from '../core/profile-photo';
import { Api } from '../core/api';
import { ToastService } from '../core/toast';

/** Friendly, patient-facing labels for backend roles (backend keeps PROVIDER). */
export function roleLabel(role: string): string {
  switch (role) {
    case 'PROVIDER':
      return 'Doctor';
    case 'NURSE':
      return 'Nurse';
    case 'CARE_MANAGER':
      return 'Care Manager';
    case 'ADMIN':
      return 'Operations Lead';
    case 'SUPER_ADMIN':
      return 'Clinical Director';
    case 'PATIENT':
      return 'Patient';
    default:
      return role ?? '';
  }
}

@Component({
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, NgClass, AsyncPipe, DatePipe, TitleCasePipe],
  template: `
    <h1>My Profile</h1>

    <div class="grid cols-2">
      <div class="card enter profile-card" *ngIf="auth.user$ | async as u">
        <div class="profile-cover"></div>
        <div class="row" style="gap:1rem; align-items:center">
          <span class="avatar-lg" *ngIf="portrait(u); else initialsAvatar">
            <img [src]="portrait(u)!.src" [alt]="portrait(u)!.alt" width="88" height="88" />
          </span>
          <ng-template #initialsAvatar>
            <span class="avatar-lg">{{ initials(u) }}</span>
          </ng-template>
          <div>
            <h2 style="margin:0">{{ u.name }}</h2>
            <p class="muted" style="margin:0.2rem 0 0">
              {{ portrait(u)?.title || roleLabel(u.role) }}<ng-container *ngIf="portrait(u)?.specialty || u.specialty">
                · {{ portrait(u)?.specialty || u.specialty }}</ng-container>
            </p>
            <div class="row" style="gap:0.4rem; margin-top:0.5rem; flex-wrap:wrap">
              <span class="badge" [ngClass]="badgeClass(u.role)">{{ roleLabel(u.role) }}</span>
              <span class="chip available" *ngIf="portrait(u)"><span class="live-dot"></span> Available</span>
              <span class="chip mono small">{{ u.email }}</span>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="stat-list">
          <div class="stat-row"><span class="sr-key">Title</span><span class="sr-val">{{ portrait(u)?.title || roleLabel(u.role) }}</span></div>
          <div class="stat-row"><span class="sr-key">Specialty</span><span class="sr-val">{{ portrait(u)?.specialty || u.specialty || 'General practice' }}</span></div>
          <div class="stat-row"><span class="sr-key">Role (UI)</span><span class="sr-val">{{ roleLabel(u.role) }}</span></div>
          <div class="stat-row"><span class="sr-key">Role (backend)</span><span class="sr-val mono small">{{ u.role }}</span></div>
          <div class="stat-row"><span class="sr-key">Session storage</span><span class="sr-val">{{ storageMode }}</span></div>
        </div>

        <p class="small muted" style="margin-top:0.8rem">
          Your name, role and specialty are read from the signed-in session returned by the backend — nothing on this
          page is hard-coded.
        </p>
      </div>

      <div class="card enter">
        <h3>Change password</h3>
        <label class="field" for="cur-pw">Current password</label>
        <input id="cur-pw" class="input" type="password" [(ngModel)]="oldPw" autocomplete="current-password" />
        <label class="field" style="margin-top:0.6rem" for="new-pw">New password (8+ characters)</label>
        <input id="new-pw" class="input" type="password" [(ngModel)]="newPw" autocomplete="new-password" />
        <button class="btn" style="margin-top:0.9rem" (click)="change()" [disabled]="busy">
          <span class="spinner" *ngIf="busy"></span> {{ busy ? 'Updating…' : 'Update password' }}
        </button>
        <p class="notice" role="status" *ngIf="msg">{{ msg }}</p>
        <p class="error-box" role="alert" *ngIf="err">{{ err }}</p>
        <p class="small muted">Password changes are audited; the value itself is never logged.</p>
      </div>
    </div>

    <!-- ===================== notifications ===================== -->
    <div class="card enter" style="margin-top:1rem">
      <div class="card-title-row">
        <div>
          <h3>Notifications</h3>
          <p class="card-sub" style="margin-top:0.3rem">
            <strong>{{ unread }}</strong> unread of {{ notifications.length }} for
            {{ (auth.user$ | async)?.name || 'your account' }}
            <ng-container *ngIf="lastLoaded"> · refreshed {{ lastLoaded | date: 'shortTime' }}</ng-container>
          </p>
        </div>
        <div class="grid-actions">
          <button class="outline-btn" (click)="loadNotifications()">↻ Refresh</button>
          <button class="btn secondary" (click)="markAllRead()" [disabled]="unread === 0">Mark all read</button>
        </div>
      </div>

      <div class="row" style="gap:0.45rem; flex-wrap:wrap; margin-bottom:0.8rem" *ngIf="categoryBreakdown.length">
        <span class="chip" *ngFor="let c of categoryBreakdown" [attr.title]="c.count + ' notification(s)'">
          {{ c.name }} · {{ c.count }}
        </span>
      </div>

      <p class="error-box" role="alert" *ngIf="notifError">{{ notifError }}</p>
      <p class="small muted" *ngIf="notifLoading">Loading notifications…</p>

      <ul class="notif-list" *ngIf="!notifLoading && notifications.length; else noNotif">
        <li class="notif-row" *ngFor="let n of notifications" [class.unread]="!n.read">
          <span class="notif-dot" [attr.aria-label]="n.read ? 'Read' : 'Unread'">{{ n.read ? '✓' : '●' }}</span>
          <div class="notif-body">
            <div class="notif-head">
              <strong>{{ n.title }}</strong>
              <span class="chip">{{ n.category || 'SYSTEM' }}</span>
              <span class="small muted">{{ n.createdAt | date: 'short' }}</span>
            </div>
            <p class="small" style="margin:0.15rem 0 0">{{ n.message }}</p>
          </div>
          <div class="grid-actions">
            <button class="btn sm ghost" *ngIf="!n.read" (click)="markRead(n)">Mark read</button>
            <button class="btn sm secondary" *ngIf="linkFor(n)" (click)="open(n)">Open</button>
            <button class="btn sm ghost" (click)="archive(n)" aria-label="Archive notification">Archive</button>
          </div>
        </li>
      </ul>

      <ng-template #noNotif>
        <div class="empty">
          <span class="empty-icon">🔔</span>
          <h3>You're all caught up</h3>
          <p>Care-plan reviews, abnormal vitals, adherence issues and follow-up reminders appear here.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .profile-card { position: relative; overflow: hidden; }
    .profile-cover {
      position: absolute; inset: 0 0 auto 0; height: 74px;
      background: linear-gradient(120deg, var(--accent), var(--accent-dark, #0b4f86));
      opacity: 0.16;
    }
    .profile-card > * { position: relative; }
    .avatar-lg {
      width: 88px; height: 88px; border-radius: 24px; display: grid; place-items: center;
      background: linear-gradient(135deg, var(--accent), var(--accent-dark, #0b4f86));
      color: #fff; font-weight: 700; font-size: 1.7rem; letter-spacing: 0.04em;
      box-shadow: 0 8px 20px var(--accent-soft);
      overflow: hidden; flex: none; position: relative;
    }
    .avatar-lg img { width: 88px; height: 88px; object-fit: cover; display: block; }
    .chip.available { color: var(--success); }
    .notif-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.55rem; }
    .notif-row {
      display: grid; grid-template-columns: auto 1fr auto; gap: 0.75rem; align-items: start;
      padding: 0.7rem 0.8rem; border: 1px solid var(--border); border-radius: 12px;
      background: var(--surface-alt);
      animation: fade-in 0.25s ease both;
    }
    .notif-row.unread { border-color: var(--accent); box-shadow: inset 3px 0 0 var(--accent); }
    .notif-dot { color: var(--accent); line-height: 1.4; }
    .notif-head { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; }
    @media (max-width: 720px) {
      .notif-row { grid-template-columns: auto 1fr; }
      .notif-row .grid-actions { grid-column: 1 / -1; justify-content: flex-start; }
    }
  `],
})
export class ProfileComponent {
  oldPw = '';
  newPw = '';
  msg = '';
  err = '';
  busy = false;
  private toast = inject(ToastService);

  constructor(public auth: AuthService, private api: Api) {}

  get storageMode(): string {
    if (sessionStorage.getItem('ms_token')) return 'Session only (tab closed = signed out)';
    if (localStorage.getItem('ms_token')) return 'This device (remember me)';
    return 'Not signed in';
  }

  roleLabel = roleLabel;

  /** Portrait registry lookup for the profile card (null → initials avatar). */
  portrait(u: UserDto) {
    return profilePortrait(u?.name);
  }

  initials(u: UserDto): string {
    return (u?.name ?? 'U')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  badgeClass(role: string): string {
    switch (role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 'critical';
      case 'PROVIDER':
        return 'acknowledged';
      case 'NURSE':
        return 'medium';
      case 'CARE_MANAGER':
        return 'medium';
      case 'PATIENT':
        return 'active';
      default:
        return 'low';
    }
  }

  /* ------------------------------------------------------- notifications */

  notifications: any[] = [];
  unread = 0;
  notifLoading = false;
  notifError = '';
  lastLoaded: string | null = null;
  private router = inject(Router);

  ngOnInit() {
    this.loadNotifications();
  }

  get categoryBreakdown(): { name: string; count: number }[] {
    const map = new Map<string, number>();
    for (const n of this.notifications) {
      const key = (n?.category || 'SYSTEM').toUpperCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  }

  loadNotifications() {
    this.notifLoading = true;
    this.notifError = '';
    this.api.get<any[]>('/notifications').subscribe({
      next: (list) => {
        this.notifications = Array.isArray(list) ? list : [];
        this.unread = this.notifications.filter((n) => !n.read).length;
        this.notifLoading = false;
        this.lastLoaded = new Date().toISOString();
      },
      error: () => {
        this.notifLoading = false;
        this.notifError = 'Could not load notifications from the backend.';
      },
    });
  }

  markRead(n: any) {
    this.api.post(`/notifications/${n.id}/read`, {}).subscribe({
      next: () => {
        n.read = true;
        this.unread = this.notifications.filter((x) => !x.read).length;
      },
      error: () => this.toast.error('Could not mark the notification as read'),
    });
  }

  markAllRead() {
    this.api.post('/notifications/mark-all-read', {}).subscribe({
      next: () => {
        this.notifications.forEach((n) => (n.read = true));
        this.unread = 0;
        this.toast.success('All notifications marked read');
      },
      error: () => this.toast.error('Could not update notifications'),
    });
  }

  archive(n: any) {
    this.api.delete(`/notifications/${n.id}`).subscribe({
      next: () => {
        this.notifications = this.notifications.filter((x) => x.id !== n.id);
        this.unread = this.notifications.filter((x) => !x.read).length;
        this.toast.success('Notification archived');
      },
      error: () => this.toast.error('Could not archive the notification'),
    });
  }

  /** Route a notification to the screen that owns it, or null when there is none. */
  linkFor(n: any): any[] | null {
    if (n?.relatedCarePlanId) return ['/care-plans', n.relatedCarePlanId];
    if (n?.relatedAlertId) return ['/alerts'];
    if (n?.relatedPatientId) return ['/patients', n.relatedPatientId];
    switch (n?.category) {
      case 'ALERT':
        return ['/alerts'];
      case 'CARE_PLAN':
      case 'APPROVAL':
        return ['/care-plans'];
      case 'RISK':
        return ['/risk-predictions'];
      case 'MONITORING':
        return ['/monitoring'];
      case 'FOLLOW_UP':
        return ['/care-plans'];
      default:
        return null;
    }
  }

  open(n: any) {
    const link = this.linkFor(n);
    if (link) this.router.navigate(link);
  }

  change() {
    this.msg = '';
    this.err = '';
    if (!this.oldPw || !this.newPw) {
      this.err = 'Both fields are required.';
      return;
    }
    if (this.newPw.length < 8) {
      this.err = 'New password must be at least 8 characters.';
      return;
    }
    this.busy = true;
    this.api.post('/auth/change-password', { oldPassword: this.oldPw, newPassword: this.newPw }).subscribe({
      next: () => {
        this.busy = false;
        this.msg = 'Password updated successfully.';
        this.oldPw = '';
        this.newPw = '';
        this.toast.success('Password updated');
      },
      error: (e) => {
        this.busy = false;
        this.err = e?.error?.message ?? 'Failed to update password.';
        this.toast.error(this.err);
      },
    });
  }
}
