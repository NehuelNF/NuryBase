import { Ingrediente } from './inventario.model';

export interface Proveedor {
    id: number;
    nombre: string;
    rut?: string | null;
    telefono?: string | null;
    email?: string | null;
    creado_en?: string | Date;
}

export interface CodigoProveedorIngrediente {
    id: number;
    proveedor_id: number;
    ingrediente_id: number;
    codigo: string;
    descripcion_proveedor?: string | null;

    // Relaciones opcionales (para joins/vistas)
    proveedor?: Proveedor;
    ingrediente?: Ingrediente;
}
