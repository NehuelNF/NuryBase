import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('LoginComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([
          { path: 'pos', component: DummyComponent },
          { path: 'login', component: DummyComponent },
        ]),
      ],
    }).compileComponents();
  });

  it('should create the login component', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should validate empty credentials', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    component.identificador.set('');
    component.contrasena.set('');
    component.onLogin();

    expect(component.errorMessage()).toContain('ingresa tu identificador');
  });

  it('should quick-select a user profile', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    const adminUser = component.mockUsers.find((u) => u.rol === 'admin')!;

    component.selectQuickUser(adminUser);
    expect(component.identificador()).toBe(adminUser.identificadorAcceso);
  });
});
