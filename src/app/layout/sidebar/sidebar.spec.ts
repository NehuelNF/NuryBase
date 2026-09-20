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
  const logout = vi.fn();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser, logout } },
      ],
    }).compileComponents();

    currentUser.set(null);
    logout.mockClear();
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

  it('should show the logout button independently of the user role', () => {
    currentUser.set(createUser('bodeguero'));
    fixture.detectChanges();

    const logoutButton = (fixture.nativeElement as HTMLElement).querySelector('.logout-btn') as
      | HTMLButtonElement
      | null;
    expect(logoutButton).toBeTruthy();
    expect(logoutButton?.textContent).toContain('Cerrar sesión');

    logoutButton?.click();
    expect(logout).toHaveBeenCalledOnce();
  });

  it('should open and close the mobile menu', () => {
    fixture.detectChanges();
    const menuButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.mobile-menu-toggle',
    ) as HTMLButtonElement;
    const sidebar = (fixture.nativeElement as HTMLElement).querySelector('.sidebar') as HTMLElement;

    menuButton.click();
    fixture.detectChanges();
    expect(sidebar.classList.contains('mobile-open')).toBe(true);

    const closeButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.mobile-close-btn',
    ) as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();
    expect(sidebar.classList.contains('mobile-open')).toBe(false);
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
