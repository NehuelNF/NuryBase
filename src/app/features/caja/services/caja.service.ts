import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { TurnosApiService } from '../../../core/api/turnos-api.service';
import { VentasApiService } from '../../../core/api/ventas-api.service';
import { PaymentMethod } from '../../pos/models/pos.model';
import { PosService } from '../../pos/services/pos.service';
import {
  CierreCaja,
  PAYMENT_METHOD_META,
  PaymentMethodSummary,
  ProductoVendido,
  VentasPorMetodo,
} from '../models/caja.model';

@Injectable({
  providedIn: 'root',
})
export class CajaService {
  private readonly posService = inject(PosService);
  private readonly turnosApi = inject(TurnosApiService);
  private readonly ventasApi = inject(VentasApiService);

  private cierreSequence = 1;

  // Cierres de caja confirmados (queda disponible para un futuro historial de cierres)
  readonly historialCierres = signal<CierreCaja[]>([]);

  // Ids de ventas del turno que un admin ya anuló (ver sincronizarAnuladas).
  // Se restablece solo al cerrar turno; mientras tanto acumula lo que se
  // vaya detectando para no "revivir" una venta si un refetch puntual falla.
  private readonly ventasAnuladasIds = signal<ReadonlySet<number>>(new Set());

  // Ventas del turno que siguen vigentes (ninguna pantalla de cuadratura
  // debe contar una venta que ya fue anulada, aunque haya sido anulada
  // desde la pantalla de Administrador mientras la caja seguía abierta).
  private readonly ventasVigentes = computed(() => {
    const anuladas = this.ventasAnuladasIds();
    return this.posService.salesHistory().filter((sale) => !anuladas.has(sale.id));
  });

  // Recaudado por método de pago en el turno activo
  readonly summaryByMethod = computed<PaymentMethodSummary[]>(() => {
    const sales = this.ventasVigentes();

    return (Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((key) => {
      const salesForMethod = sales.filter((sale) => sale.medioPago === key);
      return {
        key,
        label: PAYMENT_METHOD_META[key].label,
        icon: PAYMENT_METHOD_META[key].icon,
        total: salesForMethod.reduce((sum, sale) => sum + sale.total, 0),
        ventas: salesForMethod.length,
      };
    });
  });

  readonly grandTotal = computed(() =>
    this.summaryByMethod().reduce((sum, method) => sum + method.total, 0)
  );

  readonly hayVentasEnElTurno = computed(() => this.ventasVigentes().length > 0);

  // Estado de la caja (compartido con PosService): abierta = turno en curso
  readonly isRegisterOpen = this.posService.isRegisterOpen;

  // Historial de ventas del turno activo, por venta individual y agrupado
  // por medio de pago (H: historial de caja detallado, no solo agregados)
  readonly ventasPorMetodo = computed<VentasPorMetodo[]>(() => {
    const sales = this.ventasVigentes();

    return (Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((key) => ({
      key,
      label: PAYMENT_METHOD_META[key].label,
      icon: PAYMENT_METHOD_META[key].icon,
      ventas: sales
        .filter((sale) => sale.medioPago === key)
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime()),
    }));
  });

  /**
   * Vuelve a preguntarle al backend si alguna venta del turno actual ya
   * fue anulada (por ejemplo, desde Administrador → Anulación de venta)
   * y la saca de la cuadratura vigente. Pensado para llamarse al entrar
   * a la pantalla de Cierre de Caja, justo antes de mostrar los totales.
   */
  sincronizarAnuladas(): void {
    const ids = this.posService.salesHistory().map((sale) => sale.id);
    if (ids.length === 0) return;

    this.ventasApi.obtenerEstados(ids).subscribe({
      next: (estados) => {
        const nuevasAnuladas = estados.filter((v) => v.anulada).map((v) => v.id);
        if (nuevasAnuladas.length === 0) return;

        this.ventasAnuladasIds.set(new Set([...this.ventasAnuladasIds(), ...nuevasAnuladas]));
      },
      // Si falla la sincronización, se sigue mostrando lo que ya se tenía
      // localmente; no vale la pena romper la pantalla de caja por esto.
      error: () => {},
    });
  }

  // Productos vendidos con un método de pago específico, agrupados y sumados
  productosPorMedioPago(medioPago: PaymentMethod): ProductoVendido[] {
    const sales = this.ventasVigentes().filter((sale) => sale.medioPago === medioPago);
    const acumulado = new Map<number, ProductoVendido>();

    for (const venta of sales) {
      for (const item of venta.items) {
        const existente = acumulado.get(item.producto.id);
        if (existente) {
          existente.cantidad += item.cantidad;
          existente.subtotal += item.subtotal;
        } else {
          acumulado.set(item.producto.id, {
            producto: item.producto,
            cantidad: item.cantidad,
            subtotal: item.subtotal,
          });
        }
      }
    }

    return Array.from(acumulado.values()).sort((a, b) => b.subtotal - a.subtotal);
  }

  // Inicia el turno contra la base real (fn_abrir_turno) y solo si responde
  // bien abre la caja localmente; así el turnoId nunca queda desincronizado.
  iniciarTurno(usuarioId: number, sucursalId: number): Observable<number> {
    return this.turnosApi.abrir(usuarioId, sucursalId).pipe(
      map((turnoId) => {
        this.ventasAnuladasIds.set(new Set());
        this.posService.openRegister(turnoId);
        return turnoId;
      })
    );
  }

  // Confirma el cierre de turno: cierra el turno real (fn_cerrar_turno),
  // guarda una foto del desglose y vacía el historial del POS.
  cerrarTurno(
    cajeroNombre: string,
    sucursalNombre: string,
    efectivoContado: number,
    justificacionDiferencia: string | null
  ): Observable<CierreCaja> {
    const desglose = this.summaryByMethod();
    const efectivoEsperado = desglose.find((m) => m.key === 'efectivo')?.total ?? 0;
    const diferenciaEfectivo = efectivoContado - efectivoEsperado;

    if (diferenciaEfectivo !== 0 && !justificacionDiferencia?.trim()) {
      return throwError(
        () => new Error('Debes justificar la diferencia de efectivo antes de cerrar el turno.')
      );
    }

    const turnoId = this.posService.currentTurnoId();
    if (turnoId === null) {
      return throwError(() => new Error('No hay un turno abierto para cerrar.'));
    }

    return this.turnosApi.cerrar(turnoId).pipe(
      map(() => {
        const cierre: CierreCaja = {
          id: this.cierreSequence++,
          fecha: new Date(),
          cajeroNombre,
          sucursalNombre,
          totalGeneral: this.grandTotal(),
          ventasTotales: this.ventasVigentes().length,
          desglose,
          efectivoEsperado,
          efectivoContado,
          diferenciaEfectivo,
          justificacionDiferencia: diferenciaEfectivo !== 0 ? justificacionDiferencia!.trim() : null,
        };

        this.historialCierres.set([cierre, ...this.historialCierres()]);
        this.posService.resetSalesHistory();
        this.posService.clearCart();
        this.posService.closeRegister();
        this.ventasAnuladasIds.set(new Set());
        return cierre;
      })
    );
  }
}
