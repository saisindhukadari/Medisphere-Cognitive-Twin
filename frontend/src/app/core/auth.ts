import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: string;
  specialty?: string;
  patientId?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: UserDto;
}

const API = '/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<UserDto | null>(this.readUser());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  private readUser(): UserDto | null {
    try {
      const raw = sessionStorage.getItem('ms_user') ?? localStorage.getItem('ms_user');
      return raw ? (JSON.parse(raw) as UserDto) : null;
    } catch {
      return null;
    }
  }

  get token(): string | null {
    return sessionStorage.getItem('ms_token') ?? localStorage.getItem('ms_token');
  }

  get refreshToken(): string | null {
    return sessionStorage.getItem('ms_refresh') ?? localStorage.getItem('ms_refresh');
  }

  get currentUser(): UserDto | null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  hasRole(...roles: string[]): boolean {
    return this.currentUser != null && roles.includes(this.currentUser.role);
  }

  login(email: string, password: string, remember = true): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/login`, { email, password }).pipe(
      tap((r) => this.store(r, remember))
    );
  }

  register(body: unknown): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/register`, body).pipe(tap((r) => this.store(r, true)));
  }

  /**
   * Persists the session. With "remember me" the tokens live in localStorage and
   * survive a browser restart; without it they live in sessionStorage and are
   * dropped when the tab/session ends.
   */
  private store(r: AuthResponse, remember = true) {
    const target = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    ['ms_token', 'ms_refresh', 'ms_user'].forEach((k) => other.removeItem(k));
    target.setItem('ms_token', r.accessToken);
    target.setItem('ms_refresh', r.refreshToken);
    target.setItem('ms_user', JSON.stringify(r.user));
    this.userSubject.next(r.user);
  }

  logout() {
    try {
      this.http.post(`${API}/auth/logout`, {}).subscribe();
    } catch {
      /* ignore */
    }
    ['ms_token', 'ms_refresh', 'ms_user'].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    this.userSubject.next(null);
  }
}
