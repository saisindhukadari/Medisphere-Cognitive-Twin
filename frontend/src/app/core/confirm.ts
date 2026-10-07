import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private subject = new BehaviorSubject<ConfirmRequest | null>(null);
  request$ = this.subject.asObservable();
  private resolver: ((confirmed: boolean) => void) | null = null;

  confirm(req: ConfirmRequest): Promise<boolean> {
    this.resolver = null;
    this.subject.next(req);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolve(confirmed: boolean) {
    this.subject.next(null);
    this.resolver?.(confirmed);
    this.resolver = null;
  }
}
