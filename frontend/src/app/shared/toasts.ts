import { Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ToastService } from '../core/toast';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="toast-container" role="status" aria-live="polite">
      <div *ngFor="let t of toasts" class="toast" [class]="'toast toast-' + t.type">
        <span class="toast-icon">{{ icon(t.type) }}</span>
        <span>{{ t.message }}</span>
        <button class="toast-close" (click)="svc.dismiss(t.id)" aria-label="Dismiss">×</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-container { position: fixed; right: 1rem; bottom: 1rem; z-index: 1000; display: flex; flex-direction: column; gap: 0.5rem; }
    .toast { display: flex; align-items: center; gap: 0.6rem; min-width: 260px; max-width: 380px;
      background: var(--surface); color: var(--ink); border: 1px solid var(--border);
      border-left: 4px solid var(--primary); border-radius: 12px; padding: 0.7rem 0.9rem;
      box-shadow: 0 12px 32px rgba(10,30,50,0.18); animation: toast-in 0.25s ease; }
    .toast-success { border-left-color: var(--success); }
    .toast-error { border-left-color: var(--danger); }
    .toast-warning { border-left-color: var(--warning); }
    .toast-info { border-left-color: var(--primary); }
    .toast-icon { font-size: 1rem; }
    .toast-close { border: none; background: transparent; font-size: 1.1rem; color: var(--muted); cursor: pointer; }
    @keyframes toast-in { from { transform: translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
  `],
})
export class ToastsComponent {
  svc = inject(ToastService);
  toasts: any[] = [];

  constructor() {
    this.svc.toasts$.subscribe((t) => (this.toasts = t));
  }

  icon(type: string) {
    return { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[type] ?? 'ℹ';
  }
}
