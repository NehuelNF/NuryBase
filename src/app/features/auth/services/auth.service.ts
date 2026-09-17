import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Usuarios de prueba preconfigurados para demostración rápida en Mockup
  readonly mockUsers: User[] = [
    {
      id: 1,
      nombre: 'Camila Rojas V.',
      identificadorAcceso: 'c.rojas@nurys.cl',
      rol: 'cajero',
      sucursalId: 1,
      sucursalNombre: 'Nury Providencia',
      activo: true,
    },
    {
      id: 2,
      nombre: 'Patricio Menares H.',
      identificadorAcceso: 'pa.menares@duocuc.cl',
      rol: 'admin',
      sucursalId: 1,
      sucursalNombre: 'Casa Central (Todas)',
      activo: true,
    },
    {
      id: 3,
      nombre: 'Sebastián Vera M.',
      identificadorAcceso: 's.vera@nurys.cl',
      rol: 'bodeguero',
      sucursalId: 1,
      sucursalNombre: 'Bodega Central Santiago',
      activo: true,
    },
  ];

  // Usuario autenticado actual (por defecto Camila Rojas como cajero para el POS)
  readonly currentUser = signal<User | null>(this.mockUsers[0]);

  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isCajero = computed(() => this.currentUser()?.rol === 'cajero');
  readonly isAdmin = computed(() => this.currentUser()?.rol === 'admin');
  readonly isBodeguero = computed(() => this.currentUser()?.rol === 'bodeguero');

  constructor(private readonly router: Router) {}

  login(identificador: string, contrasena: string): boolean {
    const user = this.mockUsers.find(
      (u) => u.identificadorAcceso.toLowerCase() === identificador.toLowerCase()
    );

    if (user && contrasena.length >= 4) {
      this.currentUser.set(user);
      this.router.navigate(['/pos']);
      return true;
    }

    return false;
  }

  loginAs(user: User): void {
    this.currentUser.set(user);
    this.router.navigate(['/pos']);
  }

  logout(): void {
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
