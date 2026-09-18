import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should NOT be authenticated by default (no login automático)', () => {
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
    const request = http.expectOne('http://localhost:3000/rpc/login');
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
    const request = http.expectOne('http://localhost:3000/rpc/login');
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
    const request = http.expectOne('http://localhost:3000/rpc/login');
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
});
