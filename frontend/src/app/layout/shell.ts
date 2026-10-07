import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { AuthService } from '../core/auth';
import { AppearanceService } from '../core/appearance';
import { ToastService } from '../core/toast';
import { ConfirmService } from '../core/confirm';
import { Api } from '../core/api';
import { profilePhotoSrc, profilePortrait } from '../core/profile-photo';
import { ToastsComponent } from '../shared/toasts';
import { ConfirmDialogComponent } from '../shared/confirm-dialog';

type NavGroup = 'workflow' | 'governance';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  group: NavGroup;
  roles?: string[];
}

/**
 * Application shell: role-aware, collapsible, animated sidebar + top bar.
 *
 * <p>The header always renders the authenticated user's own name/e-mail/role
 * (never a hard-coded label) and every navigation entry is mirrored by backend
 * authorisation rules.</p>
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf, AsyncPipe, ToastsComponent, ConfirmDialogComponent],
  template: `
    <div class="app-shell">
      <div class="scrim" *ngIf="mobileOpen" (click)="mobileOpen = false"></div>

      <aside class="sidebar" [class.open]="mobileOpen" aria-label="Main navigation">
        <div class="brand">
          <span class="dot"></span>
          <span class="brand-text">MediSphere<span class="brand-sub">Cognitive Twin</span></span>
        </div>

        <ng-container *ngFor="let g of groups">
          <div class="nav-section" *ngIf="visibleIn(g)">{{ groupLabel(g) }}</div>
          <a class="nav-item" *ngFor="let item of visibleNav(g); let i = index"
             [attr.data-tip]="item.label" [style.--i]="i"
             [routerLink]="item.path" routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
             [attr.aria-label]="item.label" [attr.aria-current]="isActive(item.path) ? 'page' : null"
             (click)="onNavClick()">
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
            <span *ngIf="badge(item)" class="badge new">{{ badge(item) }}</span>
          </a>
        </ng-container>

        <div class="sidebar-foot">
          Clinical intelligence workspace<br />
          v1.0 · {{ roleLabel }}
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <button class="outline-btn menu-toggle" (click)="mobileOpen = !mobileOpen" aria-label="Toggle navigation">☰</button>
          <button class="outline-btn" (click)="toggleCollapse()" [attr.aria-label]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
                  [attr.title]="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">{{ collapsed ? '»' : '«' }}</button>

          <input class="input search" placeholder="Search patients, alerts, care plans…"
                 (keyup.enter)="onSearch($event)" aria-label="Global search" />

          <span style="flex: 1"></span>

          <button class="outline-btn has-tip" data-tip="Toggle theme" (click)="cycleTheme()" aria-label="Toggle theme">
            {{ themeIcon() }}
          </button>

          <a routerLink="/notifications" class="outline-btn has-tip" data-tip="Notifications" aria-label="Notifications">
            🔔 <span *ngIf="unreadCount > 0" class="badge critical">{{ unreadCount }}</span>
          </a>

          <div class="topbar-divider"></div>

          <button class="user-chip" (click)="menuOpen = !menuOpen" [attr.aria-expanded]="menuOpen" aria-label="Account menu">
            <span class="avatar" *ngIf="photoSrc; else initialsAvatar">
              <img [src]="photoSrc" [alt]="photoAlt" width="30" height="30" />
            </span>
            <ng-template #initialsAvatar><span class="avatar" aria-hidden="true">{{ initials }}</span></ng-template>
            <span class="user-meta" *ngIf="auth.user$ | async as u">
              <span class="user-name">{{ u.name }}</span>
              <span class="user-role">{{ roleLabel }}<ng-container *ngIf="portraitTitle"> · {{ portraitTitle }}</ng-container></span>
            </span>
            <span aria-hidden="true" class="small muted">▾</span>
          </button>

          <div class="popover" *ngIf="menuOpen" (click)="$event.stopPropagation()">
            <div class="pop-head" *ngIf="auth.user$ | async as u">
              <span class="avatar pop-avatar" *ngIf="photoSrc">
                <img [src]="photoSrc" [alt]="photoAlt" width="44" height="44" />
              </span>
              <strong>{{ u.name }}</strong>
              <span>{{ u.email }}</span>
              <span class="chip" style="margin-top:0.35rem">{{ roleLabel }}<ng-container *ngIf="u.specialty"> · {{ u.specialty }}</ng-container></span>
              <span class="chip available" *ngIf="photoSrc"><span class="live-dot"></span> Available</span>
            </div>
            <a routerLink="/profile" (click)="menuOpen = false">My profile</a>
            <a routerLink="/settings" (click)="menuOpen = false">Settings</a>
            <a routerLink="/notifications" (click)="menuOpen = false">Notifications</a>
            <button class="btn danger sm block" style="margin-top:0.4rem" (click)="logout()">Sign out</button>
          </div>
        </header>

        <div class="content">
          <router-outlet></router-outlet>
        </div>
      </div>

      <app-toasts />
      <app-confirm-dialog />
    </div>
  `,
  styles: [`
    .popover { right: 1rem; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block; }
    .pop-avatar { width: 44px; height: 44px; margin-bottom: 0.5rem; padding: 0; overflow: hidden; }
    .pop-avatar img { border: 2px solid var(--surface); }
    .chip.available { color: var(--success); }
  `],
})
export class ShellComponent implements OnInit, OnDestroy {
  menuOpen = false;
  mobileOpen = false;
  unreadCount = 0;
  activeAlerts = 0;

  auth = inject(AuthService);
  appearance = inject(AppearanceService);
  toastSvc = inject(ToastService);
  private confirmSvc = inject(ConfirmService);
  private api = inject(Api);
  private router = inject(Router);
  private timer: ReturnType<typeof setInterval> | null = null;

  groups: NavGroup[] = ['workflow', 'governance'];

  /** Sidebar section heading (never a raw group key). */
  groupLabel(g: NavGroup): string {
    return g === 'workflow' ? 'Care workflow' : 'Governance';
  }

  nav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '▦', group: 'workflow' },
    { label: 'My Health Record', path: '/patients/SELF', icon: '🩺', group: 'workflow', roles: ['PATIENT'] },
    { label: 'Patients', path: '/patients', icon: '⚕', group: 'workflow', roles: ['ADMIN', 'PROVIDER', 'NURSE', 'CARE_MANAGER'] },
    { label: 'Patient 360', path: '/patients/360', icon: '🏥', group: 'workflow', roles: ['ADMIN', 'PROVIDER', 'NURSE', 'CARE_MANAGER'] },
    { label: 'Digital Twins', path: '/digital-twins', icon: '🧬', group: 'workflow', roles: ['ADMIN', 'PROVIDER', 'NURSE', 'CARE_MANAGER'] },
    { label: 'Risk Predictions', path: '/risk-predictions', icon: '◔', group: 'workflow', roles: ['ADMIN', 'PROVIDER', 'CARE_MANAGER', 'PATIENT'] },
    { label: 'Real-Time Monitoring', path: '/monitoring', icon: '📡', group: 'workflow', roles: ['ADMIN', 'PROVIDER', 'NURSE', 'CARE_MANAGER'] },
    { label: 'Alerts', path: '/alerts', icon: '⚠', group: 'workflow' },
    { label: 'Care Plans', path: '/care-plans', icon: '✚', group: 'workflow' },
    { label: 'Reports', path: '/reports', icon: '📄', group: 'governance', roles: ['ADMIN', 'PROVIDER', 'CARE_MANAGER'] },
    { label: 'Audit Logs', path: '/audit-logs', icon: '🗎', group: 'governance', roles: ['ADMIN', 'PROVIDER', 'CARE_MANAGER'] },
    { label: 'Consent Management', path: '/consent', icon: '✎', group: 'governance', roles: ['ADMIN', 'PROVIDER', 'CARE_MANAGER', 'PATIENT'] },
    { label: 'Settings', path: '/settings', icon: '⚙', group: 'governance' },
  ];

  ngOnInit() {
    this.refreshBadges();
    this.timer = setInterval(() => this.refreshBadges(), 30000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  get collapsed(): boolean {
    return this.appearance.prefs.compactSidebar;
  }

  get roleLabel(): string {
    return ShellComponent.roleLabel(this.auth.currentUser?.role);
  }

  get initials(): string {
    const name = this.auth.currentUser?.name ?? 'U';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  static roleLabel(role?: string | null): string {
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
        return role ?? 'User';
    }
  }

  /** Portrait asset for the signed-in user, or null when the initials avatar is used. */
  get photoSrc(): string | null {
    return profilePhotoSrc(this.auth.currentUser?.name);
  }

  get photoAlt(): string {
    const p = profilePortrait(this.auth.currentUser?.name);
    return p?.alt ?? '';
  }

  /** Professional job title (e.g. "Doctor") when a portrait profile exists. */
  get portraitTitle(): string {
    const title = profilePortrait(this.auth.currentUser?.name)?.title ?? '';
    // Never render the title twice — the role label above already says "Doctor"/"Nurse".
    return title && title !== this.roleLabel ? title : '';
  }

  refreshBadges() {
    this.loadUnread();
    if (this.auth.hasRole('ADMIN', 'PROVIDER', 'NURSE', 'CARE_MANAGER', 'SUPER_ADMIN')) {
      this.api.get<{ totalElements: number }>('/alerts?status=NEW&size=1').subscribe({
        next: (r) => (this.activeAlerts = r.totalElements ?? 0),
        error: () => (this.activeAlerts = 0),
      });
    }
  }

  loadUnread() {
    this.api.get<{ count: number }>('/notifications/unread-count').subscribe({
      next: (r) => (this.unreadCount = r.count),
      error: () => (this.unreadCount = 0),
    });
  }

  visibleIn(group: NavGroup): boolean {
    return this.visibleNav(group).length > 0;
  }

  visibleNav(group: NavGroup): NavItem[] {
    const role = this.auth.currentUser?.role;
    const ownPatientId = this.auth.currentUser?.patientId;
    return this.nav
      .filter((n) => n.group === group)
      .filter((n) => {
        if (role === 'SUPER_ADMIN') {
          // The clinical director sees every staff surface, but never entries that are
          // restricted to patients only (e.g. "My Health Record"). Entries that list
          // PATIENT *alongside* clinical roles — Risk Predictions, Consent — stay visible.
          return !n.roles || n.roles.some((r) => r !== 'PATIENT');
        }
        return !n.roles || (role != null && n.roles.includes(role));
      })
      .map((n) => (n.path === '/patients/SELF' && ownPatientId ? { ...n, path: '/patients/' + ownPatientId } : n));
  }

  badge(item: NavItem): number | null {
    if (item.path === '/alerts' && this.activeAlerts > 0) return this.activeAlerts;
    return null;
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  /** "Patient 360" opens the most recently viewed record, else the most recently updated patient. */
  onPatient360(event: Event) {
    event.preventDefault();
    this.openPatient360();
  }

  openPatient360() {
    const own = this.auth.currentUser?.patientId;
    if (own) {
      this.router.navigate(['/patients', own]);
      this.mobileOpen = false;
      return;
    }
    const cached = localStorage.getItem('ms_last_patient');
    if (cached) {
      this.router.navigate(['/patients', cached]);
      this.mobileOpen = false;
      return;
    }
    this.api.get<any>('/patients?size=1&sort=updatedAt').subscribe({
      next: (r) => {
        const first = r?.content?.[0];
        if (first?.id) this.router.navigate(['/patients', first.id]);
        else this.toastSvc.info('No patient records available yet');
      },
      error: () => this.toastSvc.error('Could not load a patient record'),
    });
    this.mobileOpen = false;
  }

  onNavClick() {
    this.mobileOpen = false;
  }

  toggleCollapse() {
    this.appearance.update({ compactSidebar: !this.appearance.prefs.compactSidebar });
  }

  onSearch(event: Event) {
    const q = (event.target as HTMLInputElement).value.trim();
    if (q) this.router.navigate(['/search'], { queryParams: { q } });
  }

  themeIcon() {
    return this.appearance.prefs.theme === 'dark' ? '🌙' : '☀️';
  }

  cycleTheme() {
    const next = this.appearance.prefs.theme === 'light' ? 'dark' : 'light';
    this.appearance.setTheme(next);
    this.toastSvc.info('Theme set to ' + next);
  }

  async logout() {
    const ok = await this.confirmSvc.confirm({
      title: 'Sign out',
      message: 'You will be signed out and redirected to the login page.',
      confirmLabel: 'Sign out',
      danger: true,
    });
    if (!ok) return;
    this.auth.logout();
    this.menuOpen = false;
    this.toastSvc.success('Signed out successfully');
    this.router.navigate(['/login']);
  }
}
