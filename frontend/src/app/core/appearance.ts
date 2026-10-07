import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark' | 'system';

export interface AppearancePrefs {
  theme: Theme;
  accent: string; // hex
  compactSidebar: boolean;
  reduceMotion: boolean;
  denseTables: boolean;
  showTooltips: boolean;
  autoRefreshMonitoring: boolean;
  desktopNotifications: boolean;
  alertSounds: boolean;
  // --- dashboard (persisted) ---------------------------------------
  liveMonitoring: boolean;
  compactDashboard: boolean;
  showWearables: boolean;
  showAlerts: boolean;
  showHighRisk: boolean;
}

export interface AccentPreset {
  name: string;
  hex: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'Clinical Blue', hex: '#0e6fbd' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Slate', hex: '#475569' },
];

const DEFAULTS: AppearancePrefs = {
  theme: 'light',
  accent: '#0e6fbd',
  compactSidebar: false,
  reduceMotion: false,
  denseTables: false,
  showTooltips: true,
  autoRefreshMonitoring: true,
  desktopNotifications: false,
  alertSounds: false,
  liveMonitoring: true,
  compactDashboard: false,
  showWearables: true,
  showAlerts: true,
  showHighRisk: true,
};

const KEY = 'ms_appearance';

/**
 * Central design-token service.
 *
 * <p>Every colour used by the application shell (sidebar, header, buttons, links,
 * tabs, switches, progress bars, charts, cards, focus rings, digital-twin
 * highlights) resolves through CSS custom properties produced here, so a single
 * accent change repaints the whole product — not just the content area.</p>
 */
@Injectable({ providedIn: 'root' })
export class AppearanceService {
  private prefsSubject = new BehaviorSubject<AppearancePrefs>(load());
  prefs$ = this.prefsSubject.asObservable();

  constructor() {
    this.apply(this.prefsSubject.value);
    window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change', () => {
      if (this.prefsSubject.value.theme === 'system') this.apply(this.prefsSubject.value);
    });
    // React to OS reduced-motion preference even when the user toggle is off.
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.addEventListener?.('change', () => {
      this.apply(this.prefsSubject.value);
    });
  }

  get prefs(): AppearancePrefs {
    return this.prefsSubject.value;
  }

  get isDark(): boolean {
    const p = this.prefsSubject.value;
    return p.theme === 'dark' || (p.theme === 'system' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  }

  get motionReduced(): boolean {
    return this.prefsSubject.value.reduceMotion ||
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  update(patch: Partial<AppearancePrefs>) {
    const next = { ...this.prefsSubject.value, ...patch };
    this.prefsSubject.next(next);
    this.apply(next);
  }

  setTheme(theme: Theme) {
    this.update({ theme });
  }

  setAccent(hex: string) {
    this.update({ accent: normalizeHex(hex) });
  }

  reset() {
    localStorage.removeItem(KEY);
    this.prefsSubject.next(DEFAULTS);
    this.apply(DEFAULTS);
  }

  private apply(p: AppearancePrefs) {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore quota/private-mode errors */
    }
    const root = document.documentElement;
    const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const dark = p.theme === 'dark' || (p.theme === 'system' && systemDark);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');

    const accent = normalizeHex(p.accent);
    const rgb = hexToRgb(accent);
    const accentHover = shade(accent, -14);
    const accentDark = shade(accent, -30);
    const accentLight = shade(accent, 26);
    const accentContrast = contrastOn(accent);

    const set = (name: string, value: string) => root.style.setProperty(name, value);

    // --- core accent tokens -------------------------------------------
    set('--accent', accent);
    set('--accent-hover', accentHover);
    set('--accent-light', accentLight);
    set('--accent-dark', accentDark);
    set('--accent-contrast', accentContrast);
    set('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    set('--accent-soft', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${dark ? 0.2 : 0.12})`);
    set('--accent-softer', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${dark ? 0.12 : 0.07})`);
    set('--accent-ring', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);

    // legacy aliases — every existing rule resolves to the chosen accent
    set('--primary', accent);
    set('--primary-dark', accentDark);

    // --- sidebar tokens (accent-driven, never hard-coded blue) --------
    const sideTop = mixHex(accent, dark ? '#08111c' : '#0b2239', 0.28);
    const sideBottom = mixHex(accent, dark ? '#0a1520' : '#10304f', 0.44);
    set('--sidebar-bg', `linear-gradient(180deg, ${sideTop} 0%, ${sideBottom} 100%)`);
    set('--sidebar-ink', dark ? '#dce8f5' : '#dbe7f3');
    set('--sidebar-muted', '#8aa6c4');
    set('--sidebar-hover', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`);
    set('--sidebar-active-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.30)`);
    set('--sidebar-active-ink', shade(lighten(accent, 0.42), 0));
    set('--sidebar-indicator', lighten(accent, dark ? 0.3 : 0.25));
    set('--sidebar-border', `rgba(255,255,255,0.06)`);

    root.dataset['compactSidebar'] = p.compactSidebar ? 'true' : 'false';
    root.dataset['reduceMotion'] = p.reduceMotion ? 'true' : 'false';
    root.dataset['denseTables'] = p.denseTables ? 'true' : 'false';
    root.dataset['tooltips'] = p.showTooltips ? 'true' : 'false';
    root.dataset['accentName'] = presetName(accent);
    root.dataset['compactDashboard'] = p.compactDashboard ? 'true' : 'false';
  }
}

function load(): AppearancePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function presetName(hex: string): string {
  return ACCENT_PRESETS.find((p) => p.hex.toLowerCase() === hex.toLowerCase())?.name ?? 'Custom';
}

function normalizeHex(hex: string): string {
  if (!hex) return DEFAULTS.accent;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return DEFAULTS.accent;
  return '#' + h.toLowerCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Darken (percent < 0) or lighten (percent > 0) a hex colour. */
function shade(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amt = (255 * percent) / 100;
  return rgbToHex(r + amt, g + amt, b + amt);
}

/** Blend toward white by a 0..1 factor. */
function lighten(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
}

/** Blend two hex colours: t = 0 keeps a, t = 1 keeps b. */
function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.r + (y.r - x.r) * t, x.g + (y.g - x.g) * t, x.b + (y.b - x.b) * t);
}

/** White or near-black text colour with readable contrast on the accent. */
function contrastOn(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? '#0b1622' : '#ffffff';
}
