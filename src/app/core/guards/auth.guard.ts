import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { UserRole } from '../../features/auth/models/auth.model';

/**
 * Protege rutas que requieren una sesión iniciada (H1.1).
 * Si no hay sesión válida, redirige a /login conservando la URL original
 * en `returnUrl` para volver ahí después de un login exitoso.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/** Bloquea el acceso directo a rutas fuera del rol operativo del usuario. */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const role = authService.currentUser()?.rol;
  const allowedRoles = route.data['allowedRoles'] as UserRole[] | undefined;
  if (role && allowedRoles?.includes(role)) {
    return true;
  }

  return router.createUrlTree([role === 'bodeguero' ? '/sin-acceso' : '/caja']);
};
