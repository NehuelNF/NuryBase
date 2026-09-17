export type RolUsuario = 'cajero' | 'administrador';

export type EstadoFactura = 'pendiente_revision' | 'confirmada' | 'anulada';

export type TipoPromocion = 'porcentaje' | 'monto_fijo' | 'precio_fijo' | 'combo';

export type MedioPago = 'efectivo' | 'debito' | 'credito' | 'transferencia';

export type TipoMovimientoStock = 'compra' | 'venta' | 'ajuste' | 'merma';

export type ReferenciaTipoMovimiento = 'factura_compra' | 'venta' | 'ajuste_manual';

export type AccionAuditoriaUsuario = 'creacion' | 'edicion' | 'deshabilitacion' | 'reactivacion';
