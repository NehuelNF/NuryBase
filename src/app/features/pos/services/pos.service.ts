import { inject, Injectable, computed, signal } from '@angular/core';
import { Observable, map, tap, timeout } from 'rxjs';
import {
  CartItem,
  CompletedSale,
  PaymentMethod,
  PosCategory,
  PosProduct,
} from '../models/pos.model';
import { ProductosApiService, ProductoApi } from '../../../core/api/productos-api.service';
import { VentasApiService } from '../../../core/api/ventas-api.service';

@Injectable({
  providedIn: 'root',
})
export class PosService {

  private readonly productosApi = inject(ProductosApiService);
  private readonly ventasApi = inject(VentasApiService);

  cargarCatalogoDesdeApi(): void {
    this.productosApi.listar().subscribe({
      next: (productos) => {
        this.catalog.set(productos.map((producto) => this.adaptarProducto(producto)));
      },
      error: (error) => {
        console.error('No se pudo cargar el catálogo desde PostgREST', error);
      },
    });
  }

  private adaptarProducto(producto: ProductoApi): PosProduct {
    const categoriaNombre = producto.categoria?.trim() || 'Sin categoría';

    return {
      id: producto.id,
      nombre: producto.nombre,
      categoriaId: categoriaNombre,
      categoriaNombre,
      codigoInterno: `NUR-${String(producto.id).padStart(3, '0')}`,
      codigoBarras: producto.codigo_barras ?? '',
      precioVenta: Number(producto.precio_venta),
      icono: '🛍️',
      descripcion: '',
      activo: producto.activo,
    };
  }


  // Se carga exclusivamente desde ProductosApiService.
  readonly catalog = signal<PosProduct[]>([]);

  readonly categories = computed<PosCategory[]>(() => {
    const names = [...new Set(this.catalog().map((product) => product.categoriaNombre))]
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    return [
      { id: '', nombre: 'Todos', icono: '✨' },
      ...names.map((nombre) => ({ id: nombre, nombre, icono: '🛍️' })),
    ];
  });

  // Carrito de compras reactivo
  readonly cart = signal<CartItem[]>([]);

  readonly total = computed(() =>
    this.cart().reduce((sum, item) => sum + item.subtotal, 0)
  );

  readonly totalItemsCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.cantidad, 0)
  );

  // Historial de ventas del turno activo
  readonly salesHistory = signal<CompletedSale[]>([]);

  // Estado de apertura de caja (compartido entre POS y Cierre de Caja).
  // Arranca cerrada: el turno debe iniciarse explícitamente desde "Caja"
  // (botón "Iniciar Turno"), nunca automáticamente al iniciar sesión.
  readonly isRegisterOpen = signal<boolean>(false);

  openRegister(): void {
    this.isRegisterOpen.set(true);
  }

  closeRegister(): void {
    this.isRegisterOpen.set(false);
  }

  addToCart(product: PosProduct): void {
    const current = this.cart();
    const existingIndex = current.findIndex((i) => i.producto.id === product.id);

    if (existingIndex > -1) {
      const updated = [...current];
      const existing = updated[existingIndex];
      const newQty = existing.cantidad + 1;
      updated[existingIndex] = {
        ...existing,
        cantidad: newQty,
        subtotal: newQty * product.precioVenta,
      };
      this.cart.set(updated);
    } else {
      this.cart.set([
        ...current,
        {
          producto: product,
          cantidad: 1,
          subtotal: product.precioVenta,
        },
      ]);
    }
  }

  addByCode(code: string): boolean {
    const normalized = code.trim().toLowerCase();
    const found = this.catalog().find(
      (p) =>
        p.codigoInterno.toLowerCase() === normalized ||
        p.codigoBarras === normalized
    );

    if (found) {
      this.addToCart(found);
      return true;
    }
    return false;
  }

  updateQuantity(productId: number, delta: number): void {
    const current = this.cart();
    const updated = current
      .map((item) => {
        if (item.producto.id === productId) {
          const newQty = item.cantidad + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            cantidad: newQty,
            subtotal: newQty * item.producto.precioVenta,
          };
        }
        return item;
      })
      .filter((i): i is CartItem => i !== null);

    this.cart.set(updated);
  }

  removeFromCart(productId: number): void {
    this.cart.set(this.cart().filter((i) => i.producto.id !== productId));
  }

  clearCart(): void {
    this.cart.set([]);
  }

  /**
   * Registra la venta contra PostgREST (fn_registrar_venta) y, solo si la
   * base confirma que quedó guardada, arma el ticket y actualiza el
   * historial local. Si falla, el carrito NO se vacía, para que el cajero
   * pueda reintentar sin perder lo que ya había cobrado.
   */
  completeSale(
    medioPago: PaymentMethod,
    montoRecibido: number,
    cajero: { id: number; nombre: string },
    sucursal: { id: number; nombre: string },
    extraDetails?: {
      codigoAutorizacion?: string;
      titularJunaeb?: string;
      saldoRestanteJunaeb?: number;
    }
  ): Observable<CompletedSale> {
    const items = this.cart();
    const totalVenta = this.total();
    const vuelto = Math.max(0, montoRecibido - totalVenta);

    return this.ventasApi
      .registrar({
        p_sucursal_id: sucursal.id,
        p_cajero_id: cajero.id,
        p_medio_pago: medioPago,
        p_items: items.map((item) => ({
          producto: item.producto.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.producto.precioVenta,
        })),
      })
      .pipe(
        // Si PostgREST no responde en 15s (backend caído, colgado o sin red),
        // cortamos la espera acá para no dejar al cajero atrapado en "Guardando venta...".
        timeout(15000),
        map((ventaId): CompletedSale => ({
          id: ventaId,
          ticketFolio: `TK-${ventaId}`,
          fecha: new Date(),
          cajeroNombre: cajero.nombre,
          sucursalNombre: sucursal.nombre,
          medioPago,
          total: totalVenta,
          montoRecibido,
          vuelto,
          items,
          codigoAutorizacion: extraDetails?.codigoAutorizacion,
          titularJunaeb: extraDetails?.titularJunaeb,
          saldoRestanteJunaeb: extraDetails?.saldoRestanteJunaeb,
        })),
        tap((sale) => {
          this.salesHistory.set([sale, ...this.salesHistory()]);
          this.clearCart();
        }),
      );
  }

  // Vacía el historial de ventas del turno tras un cierre de caja confirmado.
  resetSalesHistory(): void {
    this.salesHistory.set([]);
  }
}
