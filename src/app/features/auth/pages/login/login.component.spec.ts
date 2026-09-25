import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('LoginComponent', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([
          { path: 'pos', component: DummyComponent },
          { path: 'caja', component: DummyComponent },
          { path: 'product-master', component: DummyComponent },
          { path: 'login', component: DummyComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should create the login component', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should mark the form invalid when fields are empty', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    component.form.setValue({ identificadorAcceso: '', contrasena: '' });

    expect(component.form.invalid).toBe(true);
  });

  it('should not call the auth service when the form is invalid', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    component.form.setValue({ identificadorAcceso: '', contrasena: '' });
    component.submit();

    expect(component.errorMessage()).toBeNull();
    expect(component.form.controls.identificadorAcceso.touched).toBe(true);
  });

  it('should quick-select a demo profile and fill the form', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    const adminUser = component.demoAccounts.find((u) => u.rol === 'admin')!;

    component.selectQuickUser(adminUser);

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:3000/rpc/login').flush({
      token: 'signed.jwt.token',
      user: adminUser,
    });

    expect(component.form.controls.identificadorAcceso.value).toBe(
      adminUser.identificadorAcceso,
    );
  });

  it('should return to the protected internal URL after a successful login', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login?returnUrl=%2Fcaja');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    component.form.setValue({
      identificadorAcceso: 'c.rojas@nurys.cl',
      contrasena: '1234',
    });
    component.submit();
    TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/rpc/login').flush({
      token: 'signed.jwt.token',
      user: component.demoAccounts[0],
    });

    expect(navigateSpy).toHaveBeenCalledWith('/caja');
  });

  it('should reject an external returnUrl and use /caja after login', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login?returnUrl=https%3A%2F%2Fevil.example');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    component.form.setValue({
      identificadorAcceso: 'c.rojas@nurys.cl',
      contrasena: '1234',
    });
    component.submit();
    TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/rpc/login').flush({
      token: 'signed.jwt.token',
      user: component.demoAccounts[0],
    });

    expect(navigateSpy).toHaveBeenCalledWith('/caja');
  });

  it('should send a warehouse user to the restricted-access page by default', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    const warehouseUser = component.demoAccounts.find((user) => user.rol === 'bodeguero')!;

    component.form.setValue({
      identificadorAcceso: warehouseUser.identificadorAcceso,
      contrasena: '1234',
    });
    component.submit();
    TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/rpc/login').flush({
      token: 'signed.jwt.token',
      user: warehouseUser,
    });

    expect(navigateSpy).toHaveBeenCalledWith('/sin-acceso');
  });

  it('should reject a POS returnUrl for a warehouse user', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login?returnUrl=%2Fpos');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    const warehouseUser = component.demoAccounts.find((user) => user.rol === 'bodeguero')!;

    component.form.setValue({
      identificadorAcceso: warehouseUser.identificadorAcceso,
      contrasena: '1234',
    });
    component.submit();
    TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/rpc/login').flush({
      token: 'signed.jwt.token',
      user: warehouseUser,
    });

    expect(navigateSpy).toHaveBeenCalledWith('/sin-acceso');
  });

  it('should reject a product-master returnUrl for a warehouse user', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login?returnUrl=%2Fproduct-master');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    const warehouseUser = component.demoAccounts.find((user) => user.rol === 'bodeguero')!;

    component.form.setValue({
      identificadorAcceso: warehouseUser.identificadorAcceso,
      contrasena: '1234',
    });
    component.submit();
    TestBed.inject(HttpTestingController).expectOne('http://localhost:3000/rpc/login').flush({
      token: 'signed.jwt.token',
      user: warehouseUser,
    });

    expect(navigateSpy).toHaveBeenCalledWith('/sin-acceso');
  });
});
