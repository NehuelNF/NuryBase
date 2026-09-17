import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoginCredentials, LoginResult, User } from '../models/auth.model';

const SESSION_STORAGE_KEY = 'nury_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas ~ un turno de caja

interface StoredSession {
  token: string;
  user: User;
  expiresAt: number;
}

/**
 * H1.1 — Autenticación de usuarios.
 *
 * TODO(backend): hoy no existe un endpoint real de login. Según
 * database/local/04_roles.sql y infra/docker-compose.yml, el backend es
 * PostgREST directo sobre PostgreSQL, pero todavía falta la función SQL de
 * login (validar password_hash) y la emisión de un JWT (PGRST_JWT_SECRET).
 * Mientras eso no exista, `mockUsers` es la única "base de datos" de
 * credenciales disponible. El resto del ciclo de vida de la sesión (token,
 * expiración, logout, guard) ya funciona de verdad y no depende de esto:
 * cuando exista POST /rpc/login, solo hay que reemplazar el cuerpo de
 * `login()` por una llamada HTTP real.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly mockUsers: ReadonlyArray<User & { contrasena: string }> = [
    {
      id: 1,
      nombre: 'Camila Rojas V.',
      identificadorAcceso: 'c.rojas@nurys.cl',
      contrasena: '1234',
      rol: 'cajero',
      sucursalId: 1,
      sucursalNombre: 'Nury Providencia',
      activo: true,
    },
    {
      id: 2,
      nombre: 'Patricio Menares H.',
      identificadorAcceso: 'pa.menares@duocuc.cl',
      contrasena: '1234',
      rol: 'admin',
      sucursalId: 1,
      sucursalNombre: 'Casa Central (Todas)',
      activo: true,
    },
    {
      id: 3,
      nombre: 'Sebastián Vera M.',
      identificadorAcceso: 's.vera@nurys.cl',
      contrasena: '1234',
      rol: 'bodeguero',
      sucursalId: 1,
      sucursalNombre: 'Bodega Central Santiago',
      activo: true,
    },
  ];

  /** Cuentas de demostración sin la contraseña, para mostrar en el login. */
  readonly demoAccounts: ReadonlyArray<User> = this.mockUsers.map(
    ({ contrasena: _contrasena, ...user }) => user,
  );

  private readonly tokenSignal = signal<string | null>(null);
  readonly currentUser = signal<User | null>(null);

  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);
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
  login(credentials: LoginCredentials): LoginResult {
    const identificadorAcceso = credentials.identificadorAcceso?.trim() ?? '';
    const contrasena = credentials.contrasena ?? '';

    if (!identificadorAcceso || !contrasena) {
      return {
        success: false,
        message: 'El usuario y la contraseña son obligatorios.',
      };
    }

    const match = this.mockUsers.find(
      (u) =>
        u.identificadorAcceso.toLowerCase() === identificadorAcceso.toLowerCase() &&
        u.contrasena === contrasena,
    );

    if (!match || !match.activo) {
      return {
        success: false,
        message: 'Usuario o contraseña incorrectos.',
      };
    }

    const { contrasena: _contrasena, ...user } = match;
    this.startSession(user);
    return { success: true, user };
  }

  /**
   * Cierra la sesión: limpia el token y el usuario en memoria y en
   * sessionStorage, de forma que cualquier intento posterior de entrar a
   * una ruta protegida (authGuard) vuelva a pedir login — el token
   * anterior queda inválido de inmediato para esta pestaña/navegador.
   */
  logout(): void {
    this.tokenSignal.set(null);
    this.currentUser.set(null);

    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // sessionStorage puede no estar disponible (modo privado, etc.);
      // igual ya se limpió el estado en memoria.
    }

    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  private startSession(user: User): void {
    const token = this.generateLocalToken();
    const expiresAt = Date.now() + SESSION_TTL_MS;

    this.tokenSignal.set(token);
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

      this.tokenSignal.set(stored.token);
      this.currentUser.set(stored.user);
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  /**
   * TODO(backend): identificador local, no un JWT firmado. Alcanza para
   * que el guard y el interceptor sepan si "hay sesión" en el navegador,
   * pero no reemplaza la validación real del servidor.
   */
  private generateLocalToken(): string {
    return `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  }
}
