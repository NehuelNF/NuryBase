import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
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

  it('should have a default cajero user for pos demo', () => {
    expect(service.currentUser()).not.toBeNull();
    expect(service.isCajero()).toBe(true);
  });

  it('should login with valid mock credentials', () => {
    const success = service.login('c.rojas@nurys.cl', '1234');
    expect(success).toBe(true);
    expect(service.currentUser()?.identificadorAcceso).toBe('c.rojas@nurys.cl');
  });

  it('should logout and clear current user', () => {
    service.logout();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
