import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppearanceService } from './core/appearance';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('medisphere');

  /**
   * The root component is constructed before the router activates any route, so
   * instantiating the appearance service here guarantees the persisted
   * theme/accent tokens are written to `:root` before the public pages
   * (`/`, `/login`, `/register`) paint — no per-page theme bootstrap needed.
   */
  private readonly appearance = inject(AppearanceService);
}
