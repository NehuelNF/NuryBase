export interface Sucursal {
    id: number;
    nombre: string;
    direccion?: string | null;
    telefono?: string | null;
    activo: boolean;
    creado_en?: string | Date;
}
