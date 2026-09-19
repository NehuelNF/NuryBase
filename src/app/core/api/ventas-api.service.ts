import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VentaItemPayload {
  producto: string;
  cantidad: number;
  precio_unitario: number;
  promocion_id?: number;
}

export interface RegistrarVentaPayload {
  p_sucursal_id: number;
  p_cajero_id: number | null;
  p_medio_pago: string;
  p_items: VentaItemPayload[];
}

/**
 * Llama al RPC `fn_registrar_venta` ya definido en el esquema (schema_nury.sql):
 * inserta la cabecera en `ventas` y una línea en `detalle_venta` por cada
 * ítem, dentro de una única transacción en PostgreSQL. Eso dispara los
 * triggers existentes de descuento de stock por receta (kardex) y de
 * recálculo del total — no hay que reimplementar esa lógica en el frontend.
 */
@Injectable({ providedIn: 'root' })
export class VentasApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/rpc/fn_registrar_venta`;

  registrar(payload: RegistrarVentaPayload): Observable<number> {
    return this.http.post<number>(this.url, payload);
  }
}
