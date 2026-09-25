export type UserRole = 'admin' | 'cajero' | 'bodeguero';

export interface User {
  id: number;
  nombre: string;
  identificadorAcceso: string;
  rol: UserRole;
  sucursalId: number | null;
  sucursalNombre: string;
  activo: boolean;
}

export interface LoginCredentials {
  identificadorAcceso: string;
  contrasena: string;
}

export type LoginResult =
  | { success: true; user: User }
  | { success: false; message: string };
