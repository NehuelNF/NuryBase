import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';
import { authGuard, roleGuard } from './auth.guard';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('authGuard', () => {
  let router: Router;
  let authService: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'pos', component: DummyComponent },
          { path: 'login', component: DummyComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  function runGuard() {
    const route: any = {};
    const state: any = { url: '/pos' };
    return TestBed.runInInjectionContext(() => authGuard(route, state));
  }

  it('blocks access and redirects to /login when there is no session', () => {
    const result = runGuard();
    expect(authService.isAuthenticated()).toBe(false);
    expect(router.serializeUrl(result as any)).toBe('/login?returnUrl=%2Fpos');
  });

  it('allows access when there is a valid session', async () => {
    const login = firstValueFrom(authService.login({ identificadorAcceso: 'c.rojas@nurys.cl', contrasena: '1234' }));
    http.expectOne('http://localhost:3000/rpc/login').flush({
      token: 'signed.jwt.token',
      user: { id: 1, nombre: 'Camila Rojas V.', identificadorAcceso: 'c.rojas@nurys.cl', rol: 'cajero', sucursalId: 1, sucursalNombre: 'Nury Providencia', activo: true },
    });
    await login;

    const result = runGuard();

    expect(result).toBe(true);
  });

  it('blocks access again right after logout (H1.1 criterio 3)', async () => {
    const login = firstValueFrom(authService.login({ identificadorAcceso: 'c.rojas@nurys.cl', contrasena: '1234' }));
    http.expectOne('http://localhost:3000/rpc/login').flush({
      token: 'signed.jwt.token',
      user: { id: 1, nombre: 'Camila Rojas V.', identificadorAcceso: 'c.rojas@nurys.cl', rol: 'cajero', sucursalId: 1, sucursalNombre: 'Nury Providencia', activo: true },
    });
    await login;
    expect(runGuard()).toBe(true);

    authService.logout();

    expect(runGuard()).not.toBe(true);
  });

  it('blocks access when the stored session is expired', () => {
    sessionStorage.setItem('nury_session', JSON.stringify({
      token: 'expired.jwt.token',
      user: { id: 1, nombre: 'Camila', identificadorAcceso: 'c.rojas@nurys.cl', rol: 'cajero', sucursalId: 1, sucursalNombre: 'Nury Providencia', activo: true },
      expiresAt: Date.now() - 1,
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'pos', component: DummyComponent },
          { path: 'login', component: DummyComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);

    expect(runGuard()).not.toBe(true);
    expect(authService.getToken()).toBeNull();
    expect(sessionStorage.getItem('nury_session')).toBeNull();
  });

  it.each([
    ['cajero', '/pos', true],
    ['cajero', '/caja', true],
    ['cajero', '/product-master', false],
    ['bodeguero', '/pos', false],
    ['bodeguero', '/caja', false],
    ['bodeguero', '/product-master', false],
    ['admin', '/pos', true],
    ['admin', '/caja', true],
    ['admin', '/product-master', true],
  ] as const)('enforces %s access to %s', async (role, path, allowed) => {
    const login = firstValueFrom(authService.login({ identificadorAcceso: 'demo', contrasena: '1234' }));
    http.expectOne('http://localhost:3000/rpc/login').flush({
      token: 'signed.jwt.token',
      user: { id: 1, nombre: 'Demo', identificadorAcceso: 'demo', rol: role, sucursalId: 1, sucursalNombre: 'Nury', activo: true },
    });
    await login;

    const allowedRoles = path === '/product-master' ? ['admin'] : ['admin', 'cajero'];
    const result = TestBed.runInInjectionContext(() => roleGuard(
      { data: { allowedRoles } } as any,
      { url: path } as any,
    ));

    expect(allowed ? result : router.serializeUrl(result as any)).toBe(
      allowed ? true : role === 'bodeguero' ? '/sin-acceso' : '/caja',
    );
  });
});
