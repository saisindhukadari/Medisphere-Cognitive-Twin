import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { Api } from '../core/api';

@Component({
  standalone: true,
  imports: [NgFor],
  template: `
    <h1>Model Management</h1>
    <div class="card">
      <table><tr><th>Name</th><th>Version</th><th>Type</th><th>Accuracy</th><th>Status</th><th>Round</th><th>Actions</th></tr>
        <tr *ngFor="let m of models">
          <td>{{ m.name }}</td><td>{{ m.version }}</td><td>{{ m.type }}</td><td>{{ m.accuracy }}</td><td>{{ m.status }}</td><td>{{ m.federatedRound }}</td>
          <td>
            <button class="btn sm secondary" (click)="toggle(m)">{{ m.status === 'ACTIVE' ? 'Deactivate' : 'Activate' }}</button>
          </td>
        </tr></table>
    </div>
  `,
})
export class ModelsComponent implements OnInit {
  models: any[] = [];
  constructor(private api: Api) {}
  ngOnInit() { this.load(); }
  load() { this.api.get<any[]>('/models').subscribe((m) => (this.models = m)); }
  toggle(m: any) {
    const url = m.status === 'ACTIVE' ? `/models/${m.id}/deactivate` : `/models/${m.id}/activate`;
    this.api.post(url, {}).subscribe(() => this.load());
  }
}
