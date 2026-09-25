import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'caja',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'pos',
        canActivate: [roleGuard],
        data: { allowedRoles: ['admin', 'cajero'] },
        loadChildren: () =>
          import('./features/pos/pos.routes').then((m) => m.POS_ROUTES),
      },
      {
        path: 'caja',
        canActivate: [roleGuard],
        data: { allowedRoles: ['admin', 'cajero'] },
        loadChildren: () =>
          import('./features/caja/caja.routes').then((m) => m.CAJA_ROUTES),
      },
      {
        path: 'product-master',
        canActivate: [roleGuard],
        data: { allowedRoles: ['admin'] },
        loadChildren: () =>
          import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: 'sin-acceso',
        loadComponent: () =>
          import('./shared/pages/access-denied/access-denied').then((m) => m.AccessDenied),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'caja',
  },
];
