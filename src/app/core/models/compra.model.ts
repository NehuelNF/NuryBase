import { EstadoFactura } from './comun.model';
import { Proveedor } from './proveedor.model';
import { Sucursal } from './sucursal.model';
import { Ingrediente, UnidadMedida } from './inventario.model';

export interface FacturaCompra {
    id: number;
    proveedor_id?: number | null;
    sucursal_id: number;
    numero_factura?: string | null;
    fecha_factura: string | Date;
    fecha_registro?: string | Date;
    monto_neto?: number | null;
    monto_iva?: number | null;
    monto_impuestos_especificos?: number | null;
    monto_total?: number | null;
    archivo_url?: string | null;
    estado: EstadoFactura;
    creado_en?: string | Date;

    // Relaciones opcionales
    proveedor?: Proveedor | null;
    sucursal?: Sucursal;
    detalles?: DetalleFacturaCompra[];
}

export interface DetalleFacturaCompra {
    id: number;
    factura_id: number;
    ingrediente_id: number;
    codigo_proveedor?: string | null;
    presentacion_compra?: string | null;
    unidades_por_presentacion?: number | null;
    cantidad: number;
    unidad_id: number;
    precio_unitario: number;
    descuento_porcentaje: number;
    descuento_monto: number;
    flete: number;
    impuesto_especifico: number;
    subtotal_neto?: number;
    total_linea?: number;

    // Relaciones opcionales
    ingrediente?: Ingrediente;
    unidad?: UnidadMedida;
}
