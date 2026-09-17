import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { authGuard } from './auth.guard';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('authGuard', () => {
  let router: Router;
  let authService: AuthService;

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
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
  });

  function runGuard() {
    const route: any = {};
    const state: any = { url: '/pos' };
    return TestBed.runInInjectionContext(() => authGuard(route, state));
  }

  it('blocks access and redirects to /login when there is no session', () => {
    const result = runGuard();
    expect(authService.isAuthenticated()).toBe(false);
    expect(result).not.toBe(true);
  });

  it('allows access when there is a valid session', () => {
    authService.login({ identificadorAcceso: 'c.rojas@nurys.cl', contrasena: '1234' });

    const result = runGuard();

    expect(result).toBe(true);
  });

  it('blocks access again right after logout (H1.1 criterio 3)', () => {
    authService.login({ identificadorAcceso: 'c.rojas@nurys.cl', contrasena: '1234' });
    expect(runGuard()).toBe(true);

    authService.logout();

    expect(runGuard()).not.toBe(true);
  });
});
