import { AccionAuditoriaUsuario, RolUsuario } from './comun.model';
import { Sucursal } from './sucursal.model';

export interface Usuario {
    id: number;
    nombre: string;
    identificador_acceso: string;
    rol: RolUsuario;
    debe_cambiar_password: boolean;
    activo: boolean;
    creado_en?: string | Date;
    actualizado_en?: string | Date;

    // Relaciones opcionales
    sucursales?: Sucursal[];
}

export interface UsuarioSucursal {
    usuario_id: number;
    sucursal_id: number;
}

export interface Turno {
    id: number;
    usuario_id: number;
    sucursal_id: number;
    hora_inicio: string | Date;
    hora_fin?: string | Date | null;
    creado_en?: string | Date;

    // Relaciones opcionales
    usuario?: Usuario;
    sucursal?: Sucursal;
}

export interface AuditoriaUsuario {
    id: number;
    usuario_id: number;
    accion: AccionAuditoriaUsuario;
    campo_modificado?: string | null;
    valor_anterior?: string | null;
    valor_nuevo?: string | null;
    realizado_por?: number | null;
    creado_en?: string | Date;
}
