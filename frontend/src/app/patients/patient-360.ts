import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth';
import { Api } from '../core/api';
import { ToastService } from '../core/toast';

/**
 * Resolves the "Patient 360" navigation entry to a concrete record:
 * the signed-in patient's own record, the most recently viewed record,
 * or the most recently updated patient in the cohort.
 */
@Component({
  standalone: true,
  template: `
    <div class="card">
      <div class="loading">Opening patient record…</div>
      <p class="small muted">Resolving your Patient 360 view — own record → last opened record → most recently updated.</p>
    </div>
  `,
})
export class Patient360RedirectComponent implements OnInit {
  constructor(
    private auth: AuthService,
    private router: Router,
    private api: Api,
    private toast: ToastService
  ) {}

  ngOnInit() {
    const own = this.auth.currentUser?.patientId;
    if (own) {
      void this.router.navigate(['/patients', own]);
      return;
    }
    const cached = localStorage.getItem('ms_last_patient');
    if (cached) {
      void this.router.navigate(['/patients', cached]);
      return;
    }
    this.api.get<any>('/patients?size=1&sort=updatedAt').subscribe({
      next: (r) => {
        const first = r?.content?.[0];
        if (first?.id) void this.router.navigate(['/patients', first.id]);
        else {
          this.toast.info('No patient records available yet');
          void this.router.navigate(['/patients']);
        }
      },
      error: () => {
        this.toast.error('Could not open a patient record');
        void this.router.navigate(['/patients']);
      },
    });
  }
}
