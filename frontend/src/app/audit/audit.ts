import { Component, OnInit } from '@angular/core';
import { NgFor, DatePipe } from '@angular/common';
import { Api } from '../core/api';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [NgFor, DatePipe],
  template: `
    <h1>Audit Logs</h1>
    <div class="card">
      <table><tr><th>User</th><th>Role</th><th>Action</th><th>Resource</th><th>Result</th><th>Timestamp</th></tr>
        <tr *ngFor="let l of logs"><td>{{ l.user }}</td><td>{{ l.role }}</td><td>{{ l.action }}</td><td>{{ l.resource }}</td><td>{{ l.result }}</td><td>{{ l.timestamp | date: 'short' }}</td></tr></table>
    </div>
  `,
})
export class AuditComponent implements OnInit {
  logs: any[] = [];
  constructor(private api: Api) {}
  ngOnInit() { this.api.get<any>('/audit-logs').subscribe((r) => (this.logs = r.content)); }
}
