import { MedioPago, TipoPromocion } from './comun.model';
import { Sucursal } from './sucursal.model';
import { Usuario } from './usuario.model';
import { Producto } from './producto.model';

export interface Promocion {
    id: number;
    nombre: string;
    tipo: TipoPromocion;
    valor_descuento?: number | null;
    fecha_inicio: string | Date;
    fecha_fin: string | Date;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    dias_semana?: number[] | null;
    prioridad: number;
    combinable_con_otras: boolean;
    activa: boolean;
    creado_por?: number | null;
    creado_en?: string | Date;

    // Relaciones opcionales
    productos?: Producto[];
}

export interface PromocionProducto {
    promocion_id: number;
    producto_id: number;
}

export interface AlertaMargen {
    id: number;
    promocion_id?: number | null;
    producto_id: number;
    costo_receta: number;
    precio_aplicado: number;
    venta_id?: number | null;
    creado_en?: string | Date;

    // Relaciones opcionales
    promocion?: Promocion | null;
    producto?: Producto;
}

export interface Venta {
    id: number;
    sucursal_id: number;
    cajero_id?: number | null;
    fecha_venta: string | Date;
    medio_pago?: MedioPago | string | null;
    total: number;
    anulada: boolean;
    anulada_en?: string | Date | null;
    anulada_por?: number | null;
    creado_en?: string | Date;

    // Relaciones opcionales
    sucursal?: Sucursal;
    cajero?: Usuario | null;
    detalles?: DetalleVenta[];
}

export interface DetalleVenta {
    id: number;
    venta_id: number;
    producto_id: number;
    promocion_id?: number | null;
    cantidad: number;
    precio_lista: number;
    precio_unitario: number;
    subtotal?: number;

    // Relaciones opcionales
    producto?: Producto;
    promocion?: Promocion | null;
}
