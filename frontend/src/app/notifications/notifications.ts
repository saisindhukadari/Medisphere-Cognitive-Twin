import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf, NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../core/api';
import { ToastService } from '../core/toast';
import { AuthService } from '../core/auth';
import { Router, RouterLink } from '@angular/router';

/**
 * Notification centre.
 *
 * <p>The backend scopes every row to the signed-in account, so the doctor, the nurse,
 * the care manager, the patient and operations each see their own feed — the list below
 * is never a shared, identical set of rows.</p>
 */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, NgClass, DatePipe, FormsModule, RouterLink],
  template: `
    <div class="card-title-row">
      <div>
        <h1>Notifications</h1>
        <p class="card-sub">
          <strong>{{ unread }}</strong> unread of {{ items.length }}
          <span *ngIf="userName"> for {{ userName }}</span>
          <span *ngIf="lastLoaded"> · refreshed {{ lastLoaded | date: 'shortTime' }}</span>
        </p>
      </div>
      <div class="grid-actions">
        <button class="outline-btn" (click)="load()">↻ Refresh</button>
        <button class="btn secondary" (click)="markAll()" [disabled]="unread === 0">Mark all read</button>
      </div>
    </div>

    <div class="toolbar" *ngIf="items.length || categories.length">
      <div class="field-group">
        <label class="field" for="nt-cat">Category</label>
        <select id="nt-cat" class="input" [(ngModel)]="categoryFilter" (ngModelChange)="apply()">
          <option value="">All categories</option>
          <option *ngFor="let c of categories" [value]="c">{{ c }}</option>
        </select>
      </div>
      <div class="field-group">
        <label class="field" for="nt-state">State</label>
        <select id="nt-state" class="input" [(ngModel)]="stateFilter" (ngModelChange)="apply()">
          <option value="">Read &amp; unread</option>
          <option value="unread">Unread only</option>
          <option value="read">Read only</option>
        </select>
      </div>
      <button class="outline-btn" (click)="reset()">Reset</button>
    </div>

    <p class="error-box" *ngIf="error">{{ error }} <button class="btn sm secondary" (click)="load()">Retry</button></p>
    <p class="small muted" *ngIf="loading">Loading notifications…</p>

    <div class="card" *ngIf="!loading && !error">
      <ul class="notif-list" *ngIf="filtered.length; else noNotif">
        <li class="notif-row" *ngFor="let n of filtered" [class.unread]="!n.read">
          <span class="notif-dot" [attr.aria-label]="n.read ? 'Read' : 'Unread'">{{ n.read ? '✓' : '●' }}</span>
          <div class="notif-body">
            <div class="notif-head">
              <strong>{{ n.title }}</strong>
              <span class="chip">{{ n.category || 'SYSTEM' }}</span>
              <span class="small muted">{{ n.createdAt | date: 'MMM d, y, h:mm a' }}</span>
            </div>
            <p class="small" style="margin:0.2rem 0 0">{{ n.message }}</p>
          </div>
          <div class="grid-actions">
            <button class="btn sm ghost" *ngIf="!n.read" (click)="markRead(n)">Mark read</button>
            <a class="btn sm secondary" *ngIf="linkFor(n)" [routerLink]="linkFor(n)">Open</a>
            <button class="btn sm ghost" (click)="archive(n)" aria-label="Archive this notification">Archive</button>
          </div>
        </li>
      </ul>

      <ng-template #noNotif>
        <div class="empty">
          <span class="empty-icon">🔔</span>
          <h3>{{ hasFilters ? 'No notifications match these filters' : 'You are all caught up' }}</h3>
          <p *ngIf="hasFilters">Clear the category or read-state filter to see the rest of your feed.</p>
          <p *ngIf="!hasFilters">Care-plan reviews, abnormal vitals, adherence issues and follow-up reminders appear here.</p>
          <button class="btn sm secondary" *ngIf="hasFilters" (click)="reset()">Clear filters</button>
        </div>
      </ng-template>
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  items: any[] = [];
  filtered: any[] = [];
  loading = true;
  error = '';
  unread = 0;
  categoryFilter = '';
  stateFilter = '';
  lastLoaded: string | null = null;
  private auth = inject(AuthService);
  private router = inject(Router);

  constructor(private api: Api, private toast: ToastService) {}

  ngOnInit() {
    this.load();
  }

  get userName(): string {
    return this.auth.currentUser?.name ?? '';
  }

  get categories(): string[] {
    return [...new Set(this.items.map((n) => (n.category || 'SYSTEM').toUpperCase()))].sort();
  }

  get hasFilters(): boolean {
    return !!this.categoryFilter || !!this.stateFilter;
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.get<any[]>('/notifications').subscribe({
      next: (list) => {
        this.items = Array.isArray(list) ? list : [];
        this.unread = this.items.filter((n) => !n.read).length;
        this.loading = false;
        this.lastLoaded = new Date().toISOString();
        this.apply();
      },
      error: () => {
        this.items = [];
        this.filtered = [];
        this.loading = false;
        this.error = 'Could not load notifications from the backend.';
        this.apply();
      },
    });
  }

  apply() {
    const cat = this.categoryFilter.toUpperCase();
    this.filtered = this.items.filter((n) => {
      if (cat && (n.category || 'SYSTEM').toUpperCase() !== cat) return false;
      if (this.stateFilter === 'unread' && n.read) return false;
      if (this.stateFilter === 'read' && !n.read) return false;
      return true;
    });
  }

  reset() {
    this.categoryFilter = '';
    this.stateFilter = '';
    this.apply();
  }

  markAll() {
    this.api.post('/notifications/mark-all-read', {}).subscribe({
      next: () => {
        this.items.forEach((n) => (n.read = true));
        this.unread = 0;
        this.apply();
        this.toast.success('All notifications marked read');
      },
      error: () => this.toast.error('Could not update notifications'),
    });
  }

  markRead(n: any) {
    this.api.post(`/notifications/${n.id}/read`, {}).subscribe({
      next: () => {
        n.read = true;
        this.unread = this.items.filter((x) => !x.read).length;
        this.apply();
      },
      error: () => this.toast.error('Could not mark the notification as read'),
    });
  }

  archive(n: any) {
    this.api.delete(`/notifications/${n.id}`).subscribe({
      next: () => {
        this.items = this.items.filter((x) => x.id !== n.id);
        this.unread = this.items.filter((x) => !x.read).length;
        this.apply();
        this.toast.success('Notification archived');
      },
      error: () => this.toast.error('Could not archive the notification'),
    });
  }

  /**
   * Route to the screen that owns the referenced record. Uses the explicit related ids
   * written by the backend first, then falls back to the category.
   */
  linkFor(n: any): any[] | null {
    if (n?.relatedCarePlanId) return ['/care-plans', n.relatedCarePlanId];
    if (n?.relatedAlertId) return ['/alerts'];
    if (n?.relatedPatientId) return ['/patients', n.relatedPatientId];
    switch (n?.category) {
      case 'ALERT':
        return ['/alerts'];
      case 'CARE_PLAN':
      case 'APPROVAL':
      case 'FOLLOW_UP':
        return n?.referenceId ? ['/care-plans', n.referenceId] : ['/care-plans'];
      case 'RISK':
        return ['/risk-predictions'];
      case 'MONITORING':
        return ['/monitoring'];
      default:
        return null;
    }
  }
}
