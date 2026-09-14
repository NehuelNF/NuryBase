import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from '../../shared/models/menu-item';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  styleUrl: './sidebar.css',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  protected readonly menuItems: MenuItem[] = [
    { label: 'Home', icon: '🏠', route: '/' },
    { label: 'Punto de venta', icon: '🛒', route: '/punto-de-venta' },
    { label: 'Inventario', icon: '📦', route: '/inventario' },
    { label: 'Administración', icon: '🗂️', route: '/administracion' },
  ];
}
