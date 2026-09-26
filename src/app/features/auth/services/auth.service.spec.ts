import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from './auth.service';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('AuthService', () => {
  let service: AuthService;
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
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should be created and start without a session', () => {
    expect(service).toBeTruthy();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should reject empty credentials without calling the API', async () => {
    const result = await firstValueFrom(service.login({ identificadorAcceso: '', contrasena: '' }));
    expect(result.success).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should reject invalid credentials with a clear error message', async () => {
    const resultPromise = firstValueFrom(service.login({
      identificadorAcceso: 'c.rojas@nurys.cl',
      contrasena: 'incorrecta',
    }));
    const request = http.expectOne(`${environment.apiUrl}/rpc/login`);
    request.flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    const result = await resultPromise;

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain('incorrectos');
    }
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should login and open a session with valid credentials', async () => {
    const resultPromise = firstValueFrom(service.login({
      identificadorAcceso: 'c.rojas@nurys.cl',
      contrasena: '1234',
    }));
    const request = http.expectOne(`${environment.apiUrl}/rpc/login`);
    request.flush({
      token: 'signed.jwt.token',
      user: {
        id: 1,
        nombre: 'Camila Rojas V.',
        identificadorAcceso: 'c.rojas@nurys.cl',
        rol: 'cajero',
        sucursalId: 1,
        sucursalNombre: 'Nury Providencia',
        activo: true,
      },
    });
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.identificadorAcceso).toBe('c.rojas@nurys.cl');
    expect(service.isCajero()).toBe(true);
  });

  it('should logout and invalidate the session', async () => {
    const resultPromise = firstValueFrom(service.login({ identificadorAcceso: 'c.rojas@nurys.cl', contrasena: '1234' }));
    const request = http.expectOne(`${environment.apiUrl}/rpc/login`);
    request.flush({
      token: 'signed.jwt.token',
      user: {
        id: 1,
        nombre: 'Camila Rojas V.',
        identificadorAcceso: 'c.rojas@nurys.cl',
        rol: 'cajero',
        sucursalId: 1,
        sucursalNombre: 'Nury Providencia',
        activo: true,
      },
    });
    await resultPromise;
    expect(service.isAuthenticated()).toBe(true);

    service.logout();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(sessionStorage.getItem('nury_session')).toBeNull();
  });

  it('should restore a valid session after recreating the service', () => {
    sessionStorage.setItem('nury_session', JSON.stringify({
      token: 'persisted.jwt.token',
      user: {
        id: 2,
        nombre: 'Patricio Menares H.',
        identificadorAcceso: 'pa.menares@duocuc.cl',
        rol: 'admin',
        sucursalId: 1,
        sucursalNombre: 'Casa Central (Todas)',
        activo: true,
      },
      expiresAt: Date.now() + 60_000,
    }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    const restoredService = TestBed.inject(AuthService);

    expect(restoredService.isAuthenticated()).toBe(true);
    expect(restoredService.isAdmin()).toBe(true);
    expect(restoredService.getToken()).toBe('persisted.jwt.token');
  });

  it('should invalidate an active session as soon as its local TTL expires', async () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const resultPromise = firstValueFrom(service.login({
      identificadorAcceso: 'c.rojas@nurys.cl',
      contrasena: '1234',
    }));
    http.expectOne(`${environment.apiUrl}/rpc/login`).flush({
      token: 'signed.jwt.token',
      user: {
        id: 1,
        nombre: 'Camila Rojas V.',
        identificadorAcceso: 'c.rojas@nurys.cl',
        rol: 'cajero',
        sucursalId: 1,
        sucursalNombre: 'Nury Providencia',
        activo: true,
      },
    });
    await resultPromise;

    vi.spyOn(Date, 'now').mockReturnValue(now + (8 * 60 * 60 * 1000));

    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(sessionStorage.getItem('nury_session')).toBeNull();
  });
});
