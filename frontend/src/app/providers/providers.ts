import { Component, OnInit } from '@angular/core';
import { NgFor } from '@angular/common';
import { Api } from '../core/api';

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [NgFor],
  template: `
    <h1>Doctors</h1>
    <div class="card">
      <table><tr><th>Name</th><th>Specialty</th><th>Patients</th><th>Active alerts</th><th>Care plans</th><th>Score</th></tr>
        <tr *ngFor="let p of providers"><td>{{ p.name }}</td><td>{{ p.specialty }}</td><td>{{ p.assignedPatients }}</td><td>{{ p.activeAlerts }}</td><td>{{ p.carePlans }}</td><td>{{ p.performanceScore }}</td></tr></table>
    </div>
  `,
})
export class ProvidersComponent implements OnInit {
  providers: any[] = [];
  constructor(private api: Api) {}
  ngOnInit() { this.api.get<any[]>('/providers').subscribe((p) => (this.providers = p)); }
}
