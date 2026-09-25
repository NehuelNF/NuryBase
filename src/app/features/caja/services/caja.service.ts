import { Injectable, computed, inject, signal } from '@angular/core';
import { PaymentMethod } from '../../pos/models/pos.model';
import { PosService } from '../../pos/services/pos.service';
import {
  CierreCaja,
  CuadraturaBoletas,
  MetodoElectronico,
  PAYMENT_METHOD_META,
  PaymentMethodSummary,
  ProductoVendido,
  VentasPorMetodo,
} from '../models/caja.model';

// Los 4 medios de pago electrónicos se cuadran por cantidad de boletas, no por dinero
const METODOS_ELECTRONICOS: MetodoElectronico[] = ['credito', 'debito', 'sodexo', 'pluxee'];

@Injectable({
  providedIn: 'root',
})
export class CajaService {
  private readonly posService = inject(PosService);

  private cierreSequence = 1;

  // Cierres de caja confirmados (queda disponible para un futuro historial de cierres)
  readonly historialCierres = signal<CierreCaja[]>([]);

  // Recaudado por método de pago en el turno activo
  readonly summaryByMethod = computed<PaymentMethodSummary[]>(() => {
    const sales = this.posService.salesHistory();

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

  readonly hayVentasEnElTurno = computed(() => this.posService.salesHistory().length > 0);

  // Estado de la caja (compartido con PosService): abierta = turno en curso
  readonly isRegisterOpen = this.posService.isRegisterOpen;

  // Historial de ventas del turno activo, por venta individual y agrupado
  // por medio de pago (H: historial de caja detallado, no solo agregados)
  readonly ventasPorMetodo = computed<VentasPorMetodo[]>(() => {
    const sales = this.posService.salesHistory();

    return (Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((key) => ({
      key,
      label: PAYMENT_METHOD_META[key].label,
      icon: PAYMENT_METHOD_META[key].icon,
      ventas: sales
        .filter((sale) => sale.medioPago === key)
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime()),
    }));
  });

  // Productos vendidos con un método de pago específico, agrupados y sumados
  productosPorMedioPago(medioPago: PaymentMethod): ProductoVendido[] {
    const sales = this.posService.salesHistory().filter((sale) => sale.medioPago === medioPago);
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

  // Inicia el turno: abre la caja para que el cajero pueda operar en el POS
  iniciarTurno(): void {
    this.posService.openRegister();
  }

  // Confirma el cierre de turno: guarda una foto del desglose y vacía el historial del POS.
  // El efectivo se cuadra en dinero; los medios electrónicos (tarjeta/Junaeb) se
  // cuadran en cantidad de boletas, porque el dinero ya llegó vía el proveedor.
  cerrarTurno(
    cajeroNombre: string,
    sucursalNombre: string,
    efectivoContado: number,
    justificacionEfectivo: string | null,
    boletasContadas: Partial<Record<MetodoElectronico, number>>,
    justificacionesBoletas: Partial<Record<MetodoElectronico, string>>
  ): CierreCaja {
    const desglose = this.summaryByMethod();
    const efectivoEsperado = desglose.find((m) => m.key === 'efectivo')?.total ?? 0;
    const diferenciaEfectivo = efectivoContado - efectivoEsperado;

    if (diferenciaEfectivo !== 0 && !justificacionEfectivo?.trim()) {
      throw new Error(
        'Debes justificar la diferencia de efectivo antes de cerrar el turno.'
      );
    }

    const cuadraturaBoletas: CuadraturaBoletas[] = METODOS_ELECTRONICOS.map((key) => {
      const meta = PAYMENT_METHOD_META[key];
      const boletasEsperadas = desglose.find((m) => m.key === key)?.ventas ?? 0;
      const boletasContadasMetodo = boletasContadas[key] ?? 0;
      const diferenciaBoletas = boletasContadasMetodo - boletasEsperadas;
      const justificacion = justificacionesBoletas[key]?.trim() || null;

      if (diferenciaBoletas !== 0 && !justificacion) {
        throw new Error(
          `Debes justificar la diferencia de boletas de ${meta.label} antes de cerrar el turno.`
        );
      }

      return {
        key,
        label: meta.label,
        icon: meta.icon,
        boletasEsperadas,
        boletasContadas: boletasContadasMetodo,
        diferenciaBoletas,
        justificacionDiferencia: diferenciaBoletas !== 0 ? justificacion : null,
      };
    });

    const cierre: CierreCaja = {
      id: this.cierreSequence++,
      fecha: new Date(),
      cajeroNombre,
      sucursalNombre,
      totalGeneral: this.grandTotal(),
      ventasTotales: this.posService.salesHistory().length,
      desglose,
      efectivoEsperado,
      efectivoContado,
      diferenciaEfectivo,
      justificacionDiferencia: diferenciaEfectivo !== 0 ? justificacionEfectivo!.trim() : null,
      cuadraturaBoletas,
    };

    this.historialCierres.set([cierre, ...this.historialCierres()]);
    this.posService.resetSalesHistory();
    this.posService.clearCart();
    this.posService.closeRegister();
    return cierre;
  }
}
