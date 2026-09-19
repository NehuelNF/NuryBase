import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoginCredentials, LoginResult, User } from '../models/auth.model';

const SESSION_STORAGE_KEY = 'nury_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas ~ un turno de caja

interface StoredSession {
  token: string;
  user: User;
  expiresAt: number;
}

interface LoginApiResponse {
  token: string;
  user: User;
}

/**
 * H1.1 — Autenticación de usuarios.
 *
 * Autenticación contra el RPC `public.login` expuesto por PostgREST. La
 * contraseña se valida dentro de PostgreSQL y el backend devuelve un JWT.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly loginUrl = `${environment.apiUrl}/rpc/login`;

  /** Perfiles de acceso rápido de desarrollo; las credenciales se validan en la API. */
  readonly demoAccounts: ReadonlyArray<User> = [
    {
      id: 1,
      nombre: 'Camila Rojas V.',
      identificadorAcceso: 'c.rojas@nurys.cl',
      rol: 'cajero',
      sucursalId: 1,
      sucursalNombre: 'Nury Providencia',
      activo: true,
    },
    {
      id: 2,
      nombre: 'Patricio Menares H.',
      identificadorAcceso: 'pa.menares@duocuc.cl',
      rol: 'admin',
      sucursalId: 1,
      sucursalNombre: 'Casa Central (Todas)',
      activo: true,
    },
    {
      id: 3,
      nombre: 'Sebastián Vera M.',
      identificadorAcceso: 's.vera@nurys.cl',
      rol: 'bodeguero',
      sucursalId: 1,
      sucursalNombre: 'Bodega Central Santiago',
      activo: true,
    },
  ];

  private readonly tokenSignal = signal<string | null>(null);
  private sessionExpiresAt: number | null = null;
  readonly currentUser = signal<User | null>(null);

  readonly isCajero = computed(() => this.currentUser()?.rol === 'cajero');
  readonly isAdmin = computed(() => this.currentUser()?.rol === 'admin');
  readonly isBodeguero = computed(() => this.currentUser()?.rol === 'bodeguero');

  constructor(private readonly router: Router) {
    this.restoreSession();
  }

  /**
   * Valida credenciales y, si son correctas, abre una sesión.
   * Cumple H1.1: rechaza campos vacíos/nulos, rechaza credenciales
   * incorrectas con un mensaje claro, y solo deja pasar con datos válidos.
   */
  login(credentials: LoginCredentials): Observable<LoginResult> {
    const identificadorAcceso = credentials.identificadorAcceso?.trim() ?? '';
    const contrasena = credentials.contrasena ?? '';

    if (!identificadorAcceso || !contrasena) {
      return of({
        success: false,
        message: 'El usuario y la contraseña son obligatorios.',
      });
    }

    return this.http
      .post<LoginApiResponse>(this.loginUrl, {
        p_identificador: identificadorAcceso,
        p_contrasena: contrasena,
      })
      .pipe(
        map(({ token, user }) => {
          this.startSession(token, user);
          return { success: true, user } as LoginResult;
        }),
        catchError(() =>
          of({
            success: false,
            message: 'Usuario o contraseña incorrectos.',
          } as LoginResult),
        ),
      );
  }

  /**
   * Cierra la sesión: limpia el token y el usuario en memoria y en
   * sessionStorage, de forma que cualquier intento posterior de entrar a
   * una ruta protegida (authGuard) vuelva a pedir login — el token
   * anterior queda inválido de inmediato para esta pestaña/navegador.
   */
  logout(): void {
    this.clearSession();

    this.router.navigate(['/login']);
  }

  /** Comprueba la sesión en cada acceso para que expire sin requerir recargar. */
  isAuthenticated(): boolean {
    const expired = !this.sessionExpiresAt || Date.now() >= this.sessionExpiresAt;
    const incomplete = !this.tokenSignal() || !this.currentUser();

    if (expired || incomplete) {
      this.clearSession();
      return false;
    }

    return true;
  }

  getToken(): string | null {
    return this.isAuthenticated() ? this.tokenSignal() : null;
  }

  private startSession(token: string, user: User): void {
    token = this.normalizeToken(token);
    const expiresAt = Date.now() + SESSION_TTL_MS;

    this.tokenSignal.set(token);
    this.sessionExpiresAt = expiresAt;
    this.currentUser.set(user);

    const stored: StoredSession = { token, user, expiresAt };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Si no se puede persistir, la sesión sigue viva en memoria para
      // esta misma carga de página; simplemente no sobrevive a un refresh.
    }
  }

  /** Restaura la sesión al recargar la página, si sigue vigente. */
  private restoreSession(): void {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return;
    }

    if (!raw) {
      return;
    }

    try {
      const stored = JSON.parse(raw) as StoredSession;
      const expired = !stored.expiresAt || Date.now() >= stored.expiresAt;

      if (!stored.token || !stored.user || expired) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }

      const token = this.normalizeToken(stored.token);
      this.tokenSignal.set(token);
      this.sessionExpiresAt = stored.expiresAt;
      this.currentUser.set(stored.user);
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  private clearSession(): void {
    this.tokenSignal.set(null);
    this.sessionExpiresAt = null;
    this.currentUser.set(null);

    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // sessionStorage puede no estar disponible (modo privado, etc.);
      // igual ya se limpió el estado en memoria.
    }
  }

  /** JWT sin saltos de línea, necesarios para poder enviarlo como header HTTP. */
  private normalizeToken(token: string): string {
    return token.replace(/\s+/g, '');
  }

}
