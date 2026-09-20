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

export type ProductoCreacion = ProductoActualizacion;

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

  crear(producto: ProductoCreacion): Observable<ProductoApi> {
    return this.http
      .post<ProductoApi[]>(this.url, producto, {
        headers: { Prefer: 'return=representation' },
        params: { select: PRODUCT_FIELDS },
      })
      .pipe(
        map(([productoCreado]) => {
          if (!productoCreado) {
            throw new Error('El producto no pudo ser creado.');
          }

          return productoCreado;
        }),
      );
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

  actualizarEstado(id: number, activo: boolean): Observable<ProductoApi> {
    return this.http
      .patch<ProductoApi[]>(
        this.url,
        { activo },
        {
          headers: { Prefer: 'return=representation' },
          params: {
            id: `eq.${id}`,
            select: PRODUCT_FIELDS,
          },
        },
      )
      .pipe(
        map(([producto]) => {
          if (!producto) {
            throw new Error('El producto no existe o no pudo cambiar de estado.');
          }

          return producto;
        }),
      );
  }

  eliminar(id: number): Observable<ProductoApi> {
    return this.http
      .delete<ProductoApi[]>(this.url, {
        headers: { Prefer: 'return=representation' },
        params: {
          id: `eq.${id}`,
          select: PRODUCT_FIELDS,
        },
      })
      .pipe(
        map(([producto]) => {
          if (!producto) {
            throw new Error('El producto no existe o no pudo ser eliminado.');
          }

          return producto;
        }),
      );
  }
}
