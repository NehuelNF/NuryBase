import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PosProduct } from '../../features/pos/models/pos.model';

interface ProductoApi {
  id: number;
  nombre: string;
  categoria?: string | null;
  precio_venta: number | string;
  codigo_barras?: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductosApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/productos`;

  listarActivos(): Observable<PosProduct[]> {
    const query = 'select=id,nombre,categoria,precio_venta,codigo_barras,activo&activo=eq.true&order=id';
    return this.http.get<ProductoApi[]>(`${this.endpoint}?${query}`).pipe(
      map((productos) => productos.map((producto) => this.toPosProduct(producto))),
    );
  }

  private toPosProduct(producto: ProductoApi): PosProduct {
    const categoriaNombre = producto.categoria?.trim() || 'Otros';
    return {
      id: producto.id,
      nombre: producto.nombre,
      categoriaId: this.categoryId(categoriaNombre),
      categoriaNombre,
      codigoInterno: `NUR-${String(producto.id).padStart(3, '0')}`,
      codigoBarras: producto.codigo_barras ?? '',
      precioVenta: Number(producto.precio_venta),
      icono: this.categoryIcon(categoriaNombre),
      descripcion: 'Producto disponible en el catálogo Nury.',
      activo: producto.activo,
    };
  }

  private categoryId(category: string): number {
    const value = category.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (value.startsWith('bebestibles - cafe') || value.startsWith('bebestibles - te')) return 1;
    if (/^alimentos - (pastel|yogurth|fruta)/.test(value)) return 3;
    if (value.startsWith('alimentos -')) return 2;
    if (value.startsWith('golosinas -') || value.startsWith('helados -')) return 3;
    if (value.startsWith('bebestibles -')) return 4;
    return 5;
  }

  private categoryIcon(category: string): string {
    switch (this.categoryId(category)) {
      case 1: return '☕';
      case 2: return '🥪';
      case 3: return '🥐';
      case 4: return '🥤';
      case 5: return '◉';
      default: return '◉';
    }
  }
}
