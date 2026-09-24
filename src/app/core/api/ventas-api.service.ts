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

export interface AnularVentaPayload {
  p_venta_id: number;
  p_usuario_id: number;
  p_motivo: string;
}

export interface VentaDetalleApi {
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  productos: { nombre: string } | null;
}

export interface VentaApi {
  id: number;
  sucursal_id: number;
  cajero_id: number | null;
  fecha_venta: string;
  medio_pago: string | null;
  total: number;
  anulada: boolean;
  anulada_en: string | null;
  anulada_por: number | null;
  motivo_anulacion: string | null;
  cajero: { nombre: string } | null;
  detalle_venta: VentaDetalleApi[];
}

const VENTA_FIELDS =
  'id,sucursal_id,cajero_id,fecha_venta,medio_pago,total,anulada,anulada_en,anulada_por,motivo_anulacion,' +
  'cajero:usuarios!cajero_id(nombre),' +
  'detalle_venta(cantidad,precio_unitario,subtotal,productos(nombre))';

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
  private readonly ventasUrl = `${environment.apiUrl}/ventas`;

  registrar(payload: RegistrarVentaPayload): Observable<number> {
    return this.http.post<number>(`${environment.apiUrl}/rpc/fn_registrar_venta`, payload);
  }

  /** Ventas más recientes con su detalle, para la pantalla de Anulación de venta. */
  listar(limit = 100): Observable<VentaApi[]> {
    return this.http.get<VentaApi[]>(this.ventasUrl, {
      params: {
        select: VENTA_FIELDS,
        order: 'fecha_venta.desc',
        limit: String(limit),
      },
    });
  }

  /** Llama a `fn_anular_venta` (database/local/08_anulacion_venta.sql). */
  anular(payload: AnularVentaPayload): Observable<VentaApi> {
    return this.http.post<VentaApi>(`${environment.apiUrl}/rpc/fn_anular_venta`, payload);
  }
}
