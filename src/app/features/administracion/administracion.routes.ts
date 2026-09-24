import { Routes } from '@angular/router';

export const ADMINISTRACION_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'anulacion-venta',
    pathMatch: 'full',
  },
  {
    path: 'anulacion-venta',
    loadComponent: () =>
      import('./pages/anulacion-venta/anulacion-venta.component').then(
        (m) => m.AnulacionVentaComponent
      ),
  },
];
