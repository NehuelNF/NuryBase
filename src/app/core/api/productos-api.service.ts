import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProductoApi {
  id: number;
  nombre: string;
  categoria: string | null;
  precio_venta: number | string;
  codigo_barras: string | null;
  activo: boolean;
  creado_en: string;
}

export type ProductoActualizacion = Pick<
  ProductoApi,
  'nombre' | 'categoria' | 'precio_venta' | 'codigo_barras' | 'activo'
>;

const PRODUCT_FIELDS = 'id,nombre,categoria,precio_venta,codigo_barras,activo,creado_en';

@Injectable({
  providedIn: 'root',
})
export class ProductosApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/productos`;

  listar(soloActivos = true): Observable<ProductoApi[]> {
    const params: Record<string, string> = {
      select: PRODUCT_FIELDS,
      order: 'id.asc',
    };

    if (soloActivos) {
      params['activo'] = 'eq.true';
    }

    return this.http.get<ProductoApi[]>(this.url, {
      params,
    });
  }

  actualizar(id: number, cambios: ProductoActualizacion): Observable<ProductoApi> {
    return this.http
      .patch<ProductoApi[]>(this.url, cambios, {
        headers: { Prefer: 'return=representation' },
        params: {
          id: `eq.${id}`,
          select: PRODUCT_FIELDS,
        },
      })
      .pipe(
        map(([producto]) => {
          if (!producto) {
            throw new Error('El producto no existe o no pudo ser actualizado.');
          }

          return producto;
        }),
      );
  }
}
