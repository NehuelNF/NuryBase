import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from '../../shared/models/menu-item';

const STORAGE_KEY = 'nurybase.sidebar.collapsed';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  protected readonly collapsed = signal(this.readStoredState());

  protected readonly menuItems: MenuItem[] = [
    { label: 'Home', icon: 'home', route: '/' },
    { label: 'Punto de venta', icon: 'cart', route: '/punto-de-venta' },
    { label: 'Inventario', icon: 'box', route: '/inventario' },
    { label: 'Administración', icon: 'settings', route: '/administracion' },
  ];

  protected toggle(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // localStorage no disponible (modo privado, etc.); no es crítico.
    }
  }

  private readStoredState(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
