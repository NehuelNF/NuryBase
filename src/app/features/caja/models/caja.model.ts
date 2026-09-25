import { CompletedSale, PaymentMethod, PosProduct } from '../../pos/models/pos.model';

// Medios de pago electrónicos: no se cuadran en dinero (ya llega a la cuenta del
// negocio vía el proveedor), se cuadran en cantidad de boletas/comprobantes.
export type MetodoElectronico = Exclude<PaymentMethod, 'efectivo'>;

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; icon: string }> = {
  efectivo: { label: 'Efectivo', icon: '💵' },
  credito: { label: 'Crédito', icon: '💳' },
  debito: { label: 'Débito', icon: '💳' },
  sodexo: { label: 'Sodexo', icon: '🎫' },
  pluxee: { label: 'Pluxee', icon: '🎫' },
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

export interface CuadraturaBoletas {
  key: MetodoElectronico;
  label: string;
  icon: string;
  boletasEsperadas: number;
  boletasContadas: number;
  diferenciaBoletas: number;
  justificacionDiferencia: string | null;
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
  cuadraturaBoletas: CuadraturaBoletas[];
}
