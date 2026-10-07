import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Api } from '../core/api';

@Component({
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <h1>Federated Learning</h1>
    <p style="color:var(--muted)">{{ status?.disclaimer }}</p>
    <div class="grid cols-2">
      <div class="card">
        <h3>Global Model</h3>
        <p>Version: <strong>{{ status?.globalModelVersion }}</strong> · Round: {{ status?.federatedRound }}</p>
        <p>Accuracy: {{ status?.globalAccuracy }} · Loss: {{ status?.globalLoss }} · Convergence: {{ status?.convergence }}</p>
        <p>Data leaves participating institution: <strong>{{ status?.dataLeavesInstitution ? 'Yes' : 'No (concept)' }}</strong></p>
      </div>
      <div class="card">
        <h3>Hospital Nodes</h3>
        <table><tr><th>Node</th><th>Status</th><th>Local accuracy</th><th>Local loss</th></tr>
          <tr *ngFor="let n of status?.nodes"><td>{{ n.name }}</td><td>{{ n.status }}</td><td>{{ n.localAccuracy }}</td><td>{{ n.localLoss }}</td></tr></table>
        <div style="margin-top:1rem; color:var(--muted)">Hospital A, B, C, D → Federated aggregation → Global model</div>
      </div>
    </div>
  `,
})
export class FederatedComponent implements OnInit {
  status: any;
  constructor(private api: Api) {}
  ngOnInit() { this.api.get<any>('/federated-learning').subscribe((s) => (this.status = s)); }
}
