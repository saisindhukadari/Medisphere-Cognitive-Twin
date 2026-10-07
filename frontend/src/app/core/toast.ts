import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();
  private id = 0;

  show(type: ToastType, message: string, durationMs = 3600) {
    const toast: Toast = { id: ++this.id, type, message };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    setTimeout(() => this.dismiss(toast.id), durationMs);
  }

  success(message: string) { this.show('success', message); }
  error(message: string) { this.show('error', message, 5000); }
  warning(message: string) { this.show('warning', message); }
  info(message: string) { this.show('info', message); }

  dismiss(id: number) {
    this.toastsSubject.next(this.toastsSubject.value.filter((t) => t.id !== id));
  }
}
