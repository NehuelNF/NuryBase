export interface PosCategory {
  id: number;
  nombre: string;
  icono: string;
}

export interface PosProduct {
  id: number;
  nombre: string;
  categoriaId: number;
  categoriaNombre: string;
  codigoInterno: string;
  codigoBarras: string;
  precioVenta: number;
  icono: string;
  descripcion: string;
  activo: boolean;
}

export interface CartItem {
  producto: PosProduct;
  cantidad: number;
  subtotal: number;
}

export type PaymentMethod = 'efectivo' | 'credito' | 'debito' | 'sodexo' | 'pluxee';

export interface CompletedSale {
  /** id real de la venta en la base de datos (ventas.id) */
  id: number;
  ticketFolio: string;
  fecha: Date;
  cajeroNombre: string;
  sucursalNombre: string;
  medioPago: PaymentMethod;
  total: number;
  montoRecibido: number;
  vuelto: number;
  items: CartItem[];
  codigoAutorizacion?: string;
  titularJunaeb?: string;
  saldoRestanteJunaeb?: number;
}
