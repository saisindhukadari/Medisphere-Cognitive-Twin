import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Api } from './core/api';
import { humanize } from './shared/text';

/**
 * Global search across the four record types the backend indexes. Every card has a
 * real empty state, and matched rows deep-link to the owning screen.
 */
@Component({
  standalone: true,
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <div class="card-title-row">
      <div>
        <h1>Search results</h1>
        <p class="card-sub">Matches for <strong>“{{ q }}”</strong> across patients, alerts, care plans and FHIR resources.</p>
      </div>
      <button class="outline-btn" (click)="back()">← Back</button>
    </div>

    <div class="grid cols-2">
      <div class="card"><h3>Patients</h3>
        <div *ngFor="let p of results?.patients">
          <a [routerLink]="['/patients', p.id]">{{ p.name }}</a> — {{ p.risk }}
        </div>
        <div class="empty" *ngIf="!results?.patients?.length">
          <span class="empty-icon">⚕</span>
          <p>No patient matches “{{ q }}”.</p>
        </div>
      </div>

      <div class="card"><h3>Alerts</h3>
        <div *ngFor="let a of results?.alerts">{{ a.type }} — {{ pretty(a.status) }}</div>
        <div class="empty" *ngIf="!results?.alerts?.length">
          <span class="empty-icon">⚠</span>
          <p>No alert matches “{{ q }}”.</p>
        </div>
      </div>

      <div class="card"><h3>Care Plans</h3>
        <div *ngFor="let c of results?.carePlans">
          <a [routerLink]="['/care-plans', c.id]">{{ c.goal }}</a> — {{ pretty(c.status) }}
        </div>
        <div class="empty" *ngIf="!results?.carePlans?.length">
          <span class="empty-icon">✚</span>
          <p>No care plan matches “{{ q }}”.</p>
        </div>
      </div>

      <div class="card"><h3>FHIR Resources</h3>
        <div *ngFor="let f of results?.fhirResources">{{ f.resourceType }}</div>
        <div class="empty" *ngIf="!results?.fhirResources?.length">
          <span class="empty-icon">🔗</span>
          <p>No FHIR resource matches “{{ q }}”.</p>
        </div>
      </div>
    </div>
  `,
})
export class SearchComponent implements OnInit {
  q = '';
  results: any;
  constructor(private route: ActivatedRoute, private api: Api, private router: Router) {}

  /** Display text for a stored status token (AI_GENERATED → "AI Generated"). */
  pretty(value: string): string {
    return humanize(value);
  }

  back() {
    if (history.length > 1) history.back();
    else this.router.navigateByUrl('/dashboard');
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((qp) => {
      this.q = qp.get('q') ?? '';
      if (this.q) {
        this.api.get<any>(`/search?q=${encodeURIComponent(this.q)}`).subscribe({
          next: (r) => (this.results = r),
          error: () => (this.results = null),
        });
      }
    });
  }
}
