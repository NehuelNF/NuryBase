import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

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
