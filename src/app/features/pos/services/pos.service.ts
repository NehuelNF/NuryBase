import { Injectable, computed, signal } from '@angular/core';
import {
  CartItem,
  CompletedSale,
  PaymentMethod,
  PosCategory,
  PosProduct,
} from '../models/pos.model';

@Injectable({
  providedIn: 'root',
})
export class PosService {
  // Categorías de productos del Punto de Venta
  readonly categories: PosCategory[] = [
    { id: 0, nombre: 'Todos', icono: '✨' },
    { id: 1, nombre: 'Cafetería', icono: '☕' },
    { id: 2, nombre: 'Sándwiches', icono: '🥪' },
    { id: 3, nombre: 'Bollería & Dulces', icono: '🥐' },
    { id: 4, nombre: 'Bebidas Frías', icono: '🥤' },
    { id: 5, nombre: 'Otros', icono: '◉' },
  ];

  // Catálogo de productos basado en nury_schema.sql con códigos internos y de barras
  readonly catalog = signal<PosProduct[]>([
    {
      id: 1,
      nombre: 'Café Espresso Doble',
      categoriaId: 1,
      categoriaNombre: 'Cafetería',
      codigoInterno: 'NUR-101',
      codigoBarras: '7801234501018',
      precioVenta: 2600,
      icono: '☕',
      descripcion: 'Doble shot de espresso grano arábica selección Nury.',
      activo: true,
    },
    {
      id: 2,
      nombre: 'Cappuccino Italiano',
      categoriaId: 1,
      categoriaNombre: 'Cafetería',
      codigoInterno: 'NUR-102',
      codigoBarras: '7801234501025',
      precioVenta: 3200,
      icono: '☕',
      descripcion: 'Espresso con leche texturizada y espuma cremosa.',
      activo: true,
    },
    {
      id: 3,
      nombre: 'Café Latte Vainilla',
      categoriaId: 1,
      categoriaNombre: 'Cafetería',
      codigoInterno: 'NUR-103',
      codigoBarras: '7801234501032',
      precioVenta: 3500,
      icono: '🥛',
      descripcion: 'Café suave con syrup artesanal de vainilla.',
      activo: true,
    },
    {
      id: 4,
      nombre: 'Sándwich Ave Palta',
      categoriaId: 2,
      categoriaNombre: 'Sándwiches',
      codigoInterno: 'NUR-201',
      codigoBarras: '7801234502015',
      precioVenta: 4800,
      icono: '🥪',
      descripcion: 'Pechuga de pollo desmenuzada con palta hass en marraqueta.',
      activo: true,
    },
    {
      id: 5,
      nombre: 'Sándwich Mechada Luco',
      categoriaId: 2,
      categoriaNombre: 'Sándwiches',
      codigoInterno: 'NUR-202',
      codigoBarras: '7801234502022',
      precioVenta: 5600,
      icono: '🥩',
      descripcion: 'Carne mechada de cocción lenta con queso derretido.',
      activo: true,
    },
    {
      id: 6,
      nombre: 'Sándwich Jamón Queso Caliente',
      categoriaId: 2,
      categoriaNombre: 'Sándwiches',
      codigoInterno: 'NUR-203',
      codigoBarras: '7801234502039',
      precioVenta: 3800,
      icono: '🥪',
      descripcion: 'Clásico sándwich tostado con abundante queso mantecoso.',
      activo: true,
    },
    {
      id: 7,
      nombre: 'Croissant Mantequilla',
      categoriaId: 3,
      categoriaNombre: 'Bollería & Dulces',
      codigoInterno: 'NUR-301',
      codigoBarras: '7801234503012',
      precioVenta: 2400,
      icono: '🥐',
      descripcion: 'Hojaldre francés crujiente horneado en el local.',
      activo: true,
    },
    {
      id: 8,
      nombre: 'Tarta Cheesecake Frambuesa',
      categoriaId: 3,
      categoriaNombre: 'Bollería & Dulces',
      codigoInterno: 'NUR-302',
      codigoBarras: '7801234503029',
      precioVenta: 4200,
      icono: '🍰',
      descripcion: 'Porción individual con coulis de frambuesas naturales.',
      activo: true,
    },
    {
      id: 9,
      nombre: 'Muffin de Chocolate Belga',
      categoriaId: 3,
      categoriaNombre: 'Bollería & Dulces',
      codigoInterno: 'NUR-303',
      codigoBarras: '7801234503036',
      precioVenta: 2200,
      icono: '🧁',
      descripcion: 'Muffin húmedo con chips de chocolate semiamargo.',
      activo: true,
    },
    {
      id: 10,
      nombre: 'Coca-Cola Zero 350ml',
      categoriaId: 4,
      categoriaNombre: 'Bebidas Frías',
      codigoInterno: 'NUR-401',
      codigoBarras: '7801234504019',
      precioVenta: 1800,
      icono: '🥤',
      descripcion: 'Lata fría 350ml retornable / descartable.',
      activo: true,
    },
    {
      id: 11,
      nombre: 'Jugo Natural Naranja Exprimido',
      categoriaId: 4,
      categoriaNombre: 'Bebidas Frías',
      codigoInterno: 'NUR-402',
      codigoBarras: '7801234504026',
      precioVenta: 2900,
      icono: '🍊',
      descripcion: 'Vaso 400ml 100% fruta fresca recién exprimida.',
      activo: true,
    },
  ]);

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

  findProductByCode(code: string): PosProduct | undefined {
    const normalized = code.trim().toLowerCase();
    return this.catalog().find(
      (p) =>
        p.activo &&
        (p.codigoInterno.toLowerCase() === normalized ||
          p.codigoBarras.toLowerCase() === normalized)
    );
  }

  addByCode(code: string): boolean {
    const found = this.findProductByCode(code);
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
      id: Date.now() + this.ticketSequence,
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
      estado: 'completada',
    };

    this.salesHistory.set([sale, ...this.salesHistory()]);
    this.clearCart();
    return sale;
  }

  // Anula una venta del turno activo, invalidando su monto y registrando el motivo
  voidSale(
    saleId: number,
    motivo: string,
    usuarioAnulacion?: string
  ): { success: boolean; error?: string; sale?: CompletedSale } {
    const trimmedMotivo = motivo.trim();
    if (!trimmedMotivo) {
      return { success: false, error: 'El motivo de anulación es obligatorio.' };
    }

    const currentSales = this.salesHistory();
    const saleIndex = currentSales.findIndex((s) => s.id === saleId);
    if (saleIndex === -1) {
      return { success: false, error: 'La venta seleccionada no existe en el turno actual.' };
    }

    const targetSale = currentSales[saleIndex];
    if (targetSale.estado === 'anulada') {
      return { success: false, error: 'La venta ya se encuentra anulada.' };
    }

    const updatedSale: CompletedSale = {
      ...targetSale,
      estado: 'anulada',
      motivoAnulacion: trimmedMotivo,
      fechaAnulacion: new Date(),
      usuarioAnulacion: usuarioAnulacion || targetSale.cajeroNombre,
    };

    const newHistory = [...currentSales];
    newHistory[saleIndex] = updatedSale;
    this.salesHistory.set(newHistory);

    return { success: true, sale: updatedSale };
  }

  // Vacía el historial de ventas del turno tras un cierre de caja confirmado.
  resetSalesHistory(): void {
    this.salesHistory.set([]);
  }
}
