import { Sucursal } from './sucursal.model';
import { ReferenciaTipoMovimiento, TipoMovimientoStock } from './comun.model';

export interface UnidadMedida {
    id: number;
    nombre: string;
    abreviatura: string;
}

export interface CategoriaIngrediente {
    id: number;
    nombre: string;
}

export interface Ingrediente {
    id: number;
    nombre: string;
    categoria_id?: number | null;
    unidad_id: number;
    costo_unitario_promedio: number;
    activo: boolean;
    creado_en?: string | Date;
    actualizado_en?: string | Date;

    // Relaciones opcionales
    categoria?: CategoriaIngrediente | null;
    unidad?: UnidadMedida;
}

export interface StockSucursal {
    id: number;
    ingrediente_id: number;
    sucursal_id: number;
    stock_actual: number;
    stock_minimo: number;
    actualizado_en?: string | Date;

    // Relaciones opcionales
    ingrediente?: Ingrediente;
    sucursal?: Sucursal;
}

export interface MovimientoStock {
    id: number;
    ingrediente_id: number;
    sucursal_id: number;
    tipo_movimiento: TipoMovimientoStock;
    cantidad: number;
    stock_resultante: number;
    referencia_tipo?: ReferenciaTipoMovimiento | string | null;
    referencia_id?: number | null;
    nota?: string | null;
    creado_en?: string | Date;

    // Relaciones opcionales
    ingrediente?: Ingrediente;
    sucursal?: Sucursal;
}
