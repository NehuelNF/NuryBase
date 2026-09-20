import { CompletedSale, PaymentMethod, PosProduct } from '../../pos/models/pos.model';

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; icon: string }> = {
  efectivo: { label: 'Efectivo', icon: '💵' },
  tarjeta: { label: 'Tarjeta', icon: '💳' },
  junaeb: { label: 'Junaeb', icon: '🎫' },
};

export interface PaymentMethodSummary {
  key: PaymentMethod;
  label: string;
  icon: string;
  total: number;
  ventas: number;
}

export interface ProductoVendido {
  producto: PosProduct;
  cantidad: number;
  subtotal: number;
}

export interface VentasPorMetodo {
  key: PaymentMethod;
  label: string;
  icon: string;
  ventas: CompletedSale[];
}

export interface CierreCaja {
  id: number;
  fecha: Date;
  cajeroNombre: string;
  sucursalNombre: string;
  totalGeneral: number;
  ventasTotales: number;
  desglose: PaymentMethodSummary[];
  efectivoEsperado: number;
  efectivoContado: number;
  diferenciaEfectivo: number;
  justificacionDiferencia: string | null;
}
