import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { ConfirmService } from '../core/confirm';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgIf],
  template: `
    <div *ngIf="req" class="dialog-overlay" (click)="close(false)">
      <div class="dialog" role="alertdialog" [attr.aria-label]="req.title" (click)="$event.stopPropagation()">
        <h3>{{ req.title }}</h3>
        <p>{{ req.message }}</p>
        <div class="dialog-actions">
          <button class="btn secondary" (click)="close(false)">{{ req.cancelLabel || 'Cancel' }}</button>
          <button class="btn" [class.danger]="req.danger" (click)="close(true)">{{ req.confirmLabel || 'Confirm' }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay { position: fixed; inset: 0; background: rgba(8,20,35,0.45); display: flex;
      align-items: center; justify-content: center; z-index: 900; animation: fade-in 0.18s ease; }
    .dialog { background: var(--surface); border-radius: 16px; padding: 1.5rem; max-width: 420px; width: 90%;
      box-shadow: 0 24px 64px rgba(0,0,0,0.25); animation: scale-in 0.2s ease; }
    .dialog h3 { margin-bottom: 0.5rem; }
    .dialog p { color: var(--ink-soft); margin-bottom: 1.2rem; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 0.6rem; }
    @keyframes fade-in { from { opacity: 0; } }
    @keyframes scale-in { from { transform: scale(0.96); opacity: 0; } }
  `],
})
export class ConfirmDialogComponent {
  svc = inject(ConfirmService);
  req: any = null;

  constructor() {
    this.svc.request$.subscribe((r) => (this.req = r));
  }

  close(confirmed: boolean) {
    this.svc.resolve(confirmed);
  }
}
