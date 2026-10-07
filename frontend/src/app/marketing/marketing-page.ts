import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-marketing-page',
  standalone: true,
  imports: [NgFor],
  template: `
    <nav class="marketing-nav">
      <span class="brand">● MediSphere</span>
      <a href="/">Home</a><a href="/about">About</a><a href="/features">Features</a>
      <a href="/how-it-works">How it works</a><a href="/security">Security</a><a href="/contact">Contact</a>
      <span style="flex:1"></span>
      <a href="/login" class="btn ghost sm">Sign In</a>
      <a href="/register" class="btn sm">Get Started</a>
    </nav>
    <section class="section">
      <h2>{{ title }}</h2>
      <div class="feature-grid">
        <div class="feature" *ngFor="let p of paragraphs">{{ p }}</div>
      </div>
    </section>
  `,
})
export class MarketingPageComponent {
  @Input() title = '';
  @Input() paragraphs: string[] = [];
}
