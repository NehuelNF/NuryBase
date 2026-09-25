import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { PosService } from '../../features/pos/services/pos.service';
import { MenuItem } from '../../shared/models/menu-item';

const STORAGE_KEY = 'nurybase.sidebar.collapsed';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  private readonly authService = inject(AuthService);
  private readonly posService = inject(PosService);
  private readonly router = inject(Router);
  protected readonly collapsed = signal(this.readStoredState());
  protected readonly mobileOpen = signal(false);
  protected readonly showLogoutWarning = signal(false);

  protected readonly menuItems: MenuItem[] = [
    { label: 'Punto de venta', icon: 'cart', route: '/pos', allowedRoles: ['admin', 'cajero'] },
    { label: 'Caja', icon: 'cash', route: '/caja', allowedRoles: ['admin', 'cajero'] },
    { label: 'Maestro de productos', icon: 'tag', route: '/product-master', allowedRoles: ['admin'] },
    { label: 'Inventario', icon: 'box', route: '/inventario', allowedRoles: ['admin', 'bodeguero'] },
    { label: 'Administración', icon: 'settings', route: '/administracion', allowedRoles: ['admin'] },
  ];

  /**
   * El rol proviene de `public.login()` en PostgreSQL a través de PostgREST.
   * Los accesos no autorizados no se renderizan en el menú.
   */
  protected readonly visibleMenuItems = computed(() => {
    const role = this.authService.currentUser()?.rol;
    return role ? this.menuItems.filter((item) => item.allowedRoles.includes(role)) : [];
  });

  protected toggle(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // localStorage no disponible (modo privado, etc.); no es crítico.
    }
  }

  protected logout(): void {
    this.closeMobile();

    const isCashier = this.authService.currentUser()?.rol === 'cajero';
    if (isCashier && this.posService.isRegisterOpen()) {
      this.showLogoutWarning.set(true);
      return;
    }

    this.authService.logout();
  }

  protected cancelLogout(): void {
    this.showLogoutWarning.set(false);
  }

  protected goToCierreCaja(): void {
    this.showLogoutWarning.set(false);
    this.router.navigate(['/caja']);
  }

  protected toggleMobile(): void {
    this.mobileOpen.update((open) => !open);
  }

  protected closeMobile(): void {
    this.mobileOpen.set(false);
  }

  private readStoredState(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  }
}
