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

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'junaeb';

export interface CompletedSale {
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
  estado?: 'completada' | 'anulada';
  motivoAnulacion?: string;
  fechaAnulacion?: Date;
  usuarioAnulacion?: string;
}
