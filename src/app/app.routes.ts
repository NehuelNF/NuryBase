import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'pos',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/pages/home/home').then((m) => m.Home),
      },
      {
        path: 'pos',
        loadChildren: () =>
          import('./features/pos/pos.routes').then((m) => m.POS_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'pos',
  },
];
