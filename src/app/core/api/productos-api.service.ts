import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProductoApi {
    id: number;
    nombre: string;
    categoria: string | null;
    precio_venta: number | string;
    codigo_barras: string | null;
    activo: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class ProductosApiService {
    private readonly http = inject(HttpClient);
    private readonly url = `${environment.apiUrl}/productos`;

    listar(soloActivos = true): Observable<ProductoApi[]> {
        const params: Record<string, string> = {
            select: 'id,nombre,categoria,precio_venta,codigo_barras,activo',
            order: 'id.asc',
        };

        if (soloActivos) {
            params['activo'] = 'eq.true';
        }

        return this.http.get<ProductoApi[]>(this.url, {
            params,
        });
    }
}
