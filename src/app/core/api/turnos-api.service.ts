import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TurnoApi {
  id: number;
  usuario_id: number;
  sucursal_id: number;
  hora_inicio: string;
  hora_fin: string | null;
  creado_en: string;
}

/**
 * Llama a `fn_abrir_turno` / `fn_cerrar_turno` (database/local/07_turnos.sql).
 * Sin esto, "turno abierto" no existe como fila real en la tabla `turnos`,
 * y `fn_anular_venta` no tendría nada contra qué validar.
 */
@Injectable({ providedIn: 'root' })
export class TurnosApiService {
  private readonly http = inject(HttpClient);

  abrir(usuarioId: number, sucursalId: number): Observable<number> {
    return this.http.post<number>(`${environment.apiUrl}/rpc/fn_abrir_turno`, {
      p_usuario_id: usuarioId,
      p_sucursal_id: sucursalId,
    });
  }

  cerrar(turnoId: number): Observable<TurnoApi> {
    return this.http.post<TurnoApi>(`${environment.apiUrl}/rpc/fn_cerrar_turno`, {
      p_turno_id: turnoId,
    });
  }
}
