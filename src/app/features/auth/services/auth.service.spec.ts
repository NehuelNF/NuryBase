import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'pos', component: DummyComponent },
          { path: 'login', component: DummyComponent },
        ]),
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should NOT be authenticated by default (no login automático)', () => {
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should reject empty credentials without touching the mock list', () => {
    const result = service.login({ identificadorAcceso: '', contrasena: '' });
    expect(result.success).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should reject invalid credentials with a clear error message', () => {
    const result = service.login({
      identificadorAcceso: 'c.rojas@nurys.cl',
      contrasena: 'incorrecta',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain('incorrectos');
    }
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should login and open a session with valid mock credentials', () => {
    const result = service.login({
      identificadorAcceso: 'c.rojas@nurys.cl',
      contrasena: '1234',
    });

    expect(result.success).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.identificadorAcceso).toBe('c.rojas@nurys.cl');
    expect(service.isCajero()).toBe(true);
  });

  it('should logout and invalidate the session', () => {
    service.login({ identificadorAcceso: 'c.rojas@nurys.cl', contrasena: '1234' });
    expect(service.isAuthenticated()).toBe(true);

    service.logout();

    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(sessionStorage.getItem('nury_session')).toBeNull();
  });
});
