import type { UserRole } from '../../features/auth/models/auth.model';

export interface MenuItem {
  label: string;
  icon: string;
  route: string;
  allowedRoles: readonly UserRole[];
}
