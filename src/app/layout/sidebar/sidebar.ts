import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { PosService } from '../../features/pos/services/pos.service';
import { MenuItem } from '../../shared/models/menu-item';

const STORAGE_KEY = 'nurybase.sidebar.collapsed';

@Component({
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet],
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
    { label: 'Maestro de productos', icon: 'tag', route: '/product-master', allowedRoles: ['admin', 'bodeguero'] },
    { label: 'Inventario', icon: 'box', route: '/inventario', allowedRoles: ['admin', 'bodeguero'] },
    {
      label: 'Administrador',
      icon: 'settings',
      route: '',
      allowedRoles: ['admin'],
      children: [
        {
          label: 'Anulación de venta',
          icon: 'ban',
          route: '/administracion/anulacion-venta',
          allowedRoles: ['admin'],
        },
      ],
    },
  ];

  // Los ítems con submenú arrancan expandidos: la anulación de venta debe
  // ser obvia, no quedar escondida detrás de un clic extra.
  protected readonly expandedParents = signal<ReadonlySet<string>>(
    new Set(this.menuItems.filter((item) => item.children?.length).map((item) => item.label))
  );

  /**
   * El rol proviene de `public.login()` en PostgreSQL a través de PostgREST.
   * Los accesos no autorizados no se renderizan en el menú (ni sus hijos).
   */
  protected readonly visibleMenuItems = computed<MenuItem[]>(() => {
    const role = this.authService.currentUser()?.rol;
    if (!role) return [];

    return this.menuItems
      .filter((item) => item.allowedRoles.includes(role))
      .map((item) => ({
        ...item,
        children: item.children?.filter((child) => child.allowedRoles.includes(role)),
      }));
  });

  protected isExpanded(item: MenuItem): boolean {
    return this.expandedParents().has(item.label);
  }

  protected toggleParent(item: MenuItem): void {
    // Si la barra está colapsada (solo íconos), un submenú no se ve bien
    // encimado: primero se expande la barra completa para poder mostrarlo.
    if (this.collapsed()) {
      this.toggle();
    }

    const next = new Set(this.expandedParents());
    if (next.has(item.label)) {
      next.delete(item.label);
    } else {
      next.add(item.label);
    }
    this.expandedParents.set(next);
  }

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
