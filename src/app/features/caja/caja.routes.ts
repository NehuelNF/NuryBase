import { Routes } from '@angular/router';

export const CAJA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/cierre-caja/cierre-caja.component').then(
        (m) => m.CierreCajaComponent
      ),
  },
];
