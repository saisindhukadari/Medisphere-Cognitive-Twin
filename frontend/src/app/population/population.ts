import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { Api } from '../core/api';
import { LineChartComponent, BarChartComponent } from '../shared/charts';

@Component({
  standalone: true,
  imports: [NgFor, NgIf, LineChartComponent, BarChartComponent],
  template: `
    <h1>Population Health</h1>
    <div class="grid kpi-grid">
      <div class="card kpi"><div class="value">{{ data?.totalPopulation }}</div><div class="label">Total</div></div>
      <div class="card kpi"><div class="value">{{ data?.highRisk }}</div><div class="label">High Risk</div></div>
      <div class="card kpi"><div class="value">{{ data?.mediumRisk }}</div><div class="label">Medium Risk</div></div>
      <div class="card kpi"><div class="value">{{ data?.lowRisk }}</div><div class="label">Low Risk</div></div>
    </div>
    <div class="grid cols-2" style="margin-top:1rem">
      <div class="card"><h3>Outcome trends (demo)</h3><app-line-chart [values]="[320,318,310,305,299,292]"></app-line-chart></div>
      <div class="card"><h3>Adherence trend</h3><app-line-chart [values]="data?.adherenceTrend || []"></app-line-chart></div>
    </div>
  `,
})
export class PopulationComponent implements OnInit {
  data: any;
  constructor(private api: Api) {}
  ngOnInit() { this.api.get<any>('/population-health').subscribe((d) => (this.data = d)); }
}
