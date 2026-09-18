import { inject, Injectable, computed, signal } from '@angular/core';
import {
  CartItem,
  CompletedSale,
  PaymentMethod,
  PosCategory,
  PosProduct,
} from '../models/pos.model';
import { ProductosApiService, ProductoApi } from '../../../core/api/productos-api.service';

@Injectable({
  providedIn: 'root',
})
export class PosService {

  private readonly productosApi = inject(ProductosApiService);

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
    const categoria = (producto.categoria ?? '').toLowerCase();

    let categoriaId = 0;
    let icono = '🛍️';

    if (categoria.includes('café') || categoria.includes('cafe')) {
      categoriaId = 1;
      icono = '☕';
    } else if (categoria.includes('sandwich') || categoria.includes('sándwich')) {
      categoriaId = 2;
      icono = '🥪';
    } else if (
      categoria.includes('dulce') ||
      categoria.includes('pastel') ||
      categoria.includes('boll')
    ) {
      categoriaId = 3;
      icono = '🥐';
    } else if (
      categoria.includes('bebida') ||
      categoria.includes('jugo') ||
      categoria.includes('coca')
    ) {
      categoriaId = 4;
      icono = '🥤';
    }

    return {
      id: producto.id,
      nombre: producto.nombre,
      categoriaId,
      categoriaNombre: producto.categoria ?? 'Otros',
      codigoInterno: `NUR-${String(producto.id).padStart(3, '0')}`,
      codigoBarras: producto.codigo_barras ?? '',
      precioVenta: Number(producto.precio_venta),
      icono,
      descripcion: '',
      activo: producto.activo,
    };
  }


  // Categorías de productos del Punto de Venta
  readonly categories: PosCategory[] = [
    { id: 0, nombre: 'Todos', icono: '✨' },
    { id: 1, nombre: 'Cafetería', icono: '☕' },
    { id: 2, nombre: 'Sándwiches', icono: '🥪' },
    { id: 3, nombre: 'Bollería & Dulces', icono: '🥐' },
    { id: 4, nombre: 'Bebidas Frías', icono: '🥤' },
  ];

  // Se carga exclusivamente desde ProductosApiService.
  readonly catalog = signal<PosProduct[]>([]);

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

  // Estado de apertura de caja (compartido entre POS y Cierre de Caja)
  readonly isRegisterOpen = signal<boolean>(true);

  private ticketSequence = 1042;

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

  completeSale(
    medioPago: PaymentMethod,
    montoRecibido: number,
    cajeroNombre: string,
    sucursalNombre: string,
    extraDetails?: {
      codigoAutorizacion?: string;
      titularJunaeb?: string;
      saldoRestanteJunaeb?: number;
    }
  ): CompletedSale {
    this.ticketSequence++;
    const totalVenta = this.total();
    const vuelto = Math.max(0, montoRecibido - totalVenta);

    const sale: CompletedSale = {
      id: Date.now(),
      ticketFolio: `TK-${this.ticketSequence}`,
      fecha: new Date(),
      cajeroNombre,
      sucursalNombre,
      medioPago,
      total: totalVenta,
      montoRecibido,
      vuelto,
      items: [...this.cart()],
      codigoAutorizacion: extraDetails?.codigoAutorizacion,
      titularJunaeb: extraDetails?.titularJunaeb,
      saldoRestanteJunaeb: extraDetails?.saldoRestanteJunaeb,
    };

    this.salesHistory.set([sale, ...this.salesHistory()]);
    this.clearCart();
    return sale;
  }

  // Vacía el historial de ventas del turno tras un cierre de caja confirmado.
  resetSalesHistory(): void {
    this.salesHistory.set([]);
  }
}
