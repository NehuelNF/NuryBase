import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { User } from '../../features/auth/models/auth.model';
import { AuthService } from '../../features/auth/services/auth.service';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;
  const currentUser = signal<User | null>(null);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser } },
      ],
    }).compileComponents();

    currentUser.set(null);
    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show POS and Caja only to the cashier role returned by the API', () => {
    currentUser.set(createUser('cajero'));
    fixture.detectChanges();

    expect(visibleMenuRoutes()).toEqual(['/pos', '/caja']);
  });

  it('should show inventory functions and hide POS from a warehouse user', () => {
    currentUser.set(createUser('bodeguero'));
    fixture.detectChanges();

    expect(visibleMenuRoutes()).toEqual(['/product-master', '/inventario']);
  });

  it('should show every available function to an administrator', () => {
    currentUser.set(createUser('admin'));
    fixture.detectChanges();

    expect(visibleMenuRoutes()).toEqual([
      '/pos',
      '/caja',
      '/product-master',
      '/inventario',
      '/administracion',
    ]);
  });

  it('should not render role-specific links without a database-authenticated user', () => {
    fixture.detectChanges();

    expect(visibleMenuRoutes()).toEqual([]);
  });

  function visibleMenuRoutes(): string[] {
    const host = fixture.nativeElement as HTMLElement;
    const links = host.querySelectorAll<HTMLAnchorElement>('.sidebar-nav a');
    return Array.from(links).map((element) => element.getAttribute('href') ?? '');
  }

  function createUser(rol: User['rol']): User {
    return {
      id: 1,
      nombre: 'Usuario de prueba',
      identificadorAcceso: 'usuario@nurys.cl',
      rol,
      sucursalId: 1,
      sucursalNombre: 'Nury Providencia',
      activo: true,
    };
  }
});
