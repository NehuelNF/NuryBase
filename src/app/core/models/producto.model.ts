import { Ingrediente, UnidadMedida } from './inventario.model';

export interface Producto {
    id: number;
    nombre: string;
    categoria?: string | null;
    precio_venta: number;
    activo: boolean;
    creado_en?: string | Date;

    // Relaciones opcionales
    recetas?: Receta[];
}

export interface Receta {
    id: number;
    producto_id: number;
    ingrediente_id: number;
    cantidad_necesaria: number;
    unidad_id: number;

    // Relaciones opcionales
    producto?: Producto;
    ingrediente?: Ingrediente;
    unidad?: UnidadMedida;
}
