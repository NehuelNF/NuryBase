import { Routes } from '@angular/router';

export const POS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/pos-layout/pos-layout.component').then(
        (m) => m.PosLayoutComponent
      ),
  },
];
