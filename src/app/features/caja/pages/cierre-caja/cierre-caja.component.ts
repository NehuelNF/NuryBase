import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { PAYMENT_METHOD_META, CierreCaja, MetodoElectronico } from '../../models/caja.model';
import { CompletedSale, PaymentMethod } from '../../../pos/models/pos.model';
import { CajaService } from '../../services/caja.service';

// Los 4 medios de pago electrónicos se cuadran por cantidad de boletas, no por dinero
const METODOS_ELECTRONICOS: MetodoElectronico[] = ['credito', 'debito', 'sodexo', 'pluxee'];

interface CuadraturaBoletasPreview {
  key: MetodoElectronico;
  label: string;
  icon: string;
  esperadas: number;
  contadas: number | null;
  diferencia: number | null;
  requiereJustificacion: boolean;
  justificacion: string;
}

@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cierre-caja.component.html',
  styleUrl: './cierre-caja.component.css',
})
export class CierreCajaComponent {
  private readonly cajaService = inject(CajaService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router, { optional: true });

  readonly selectedMethod = signal<PaymentMethod | null>(null);
  readonly showConfirm = signal(false);
  readonly turnoCerrado = signal<CierreCaja | null>(null);

  readonly efectivoContado = signal<number | null>(null);
  readonly justificacion = signal('');

  // Conteo de boletas de los medios electrónicos: no es dinero, es cantidad de comprobantes
  readonly boletasContadas = signal<Partial<Record<MetodoElectronico, number | null>>>({});
  readonly justificacionesBoletas = signal<Partial<Record<MetodoElectronico, string>>>({});

  readonly summaryByMethod = this.cajaService.summaryByMethod;
  readonly grandTotal = this.cajaService.grandTotal;
  readonly hayVentasEnElTurno = this.cajaService.hayVentasEnElTurno;
  readonly isRegisterOpen = this.cajaService.isRegisterOpen;
  readonly ventasPorMetodo = this.cajaService.ventasPorMetodo;

  readonly selectedMethodLabel = computed(() => {
    const method = this.selectedMethod();
    return method ? PAYMENT_METHOD_META[method].label : '';
  });

  readonly selectedMethodProducts = computed(() => {
    const method = this.selectedMethod();
    return method ? this.cajaService.productosPorMedioPago(method) : [];
  });

  readonly efectivoEsperado = computed(
    () => this.summaryByMethod().find((m) => m.key === 'efectivo')?.total ?? 0
  );

  // Diferencia entre lo contado físicamente y lo que dice el sistema.
  // Positivo = sobrante, negativo = faltante, null = todavía no ingresa el conteo.
  readonly diferenciaEfectivo = computed(() => {
    const contado = this.efectivoContado();
    return contado === null ? null : contado - this.efectivoEsperado();
  });

  readonly requiereJustificacion = computed(() => {
    const diferencia = this.diferenciaEfectivo();
    return diferencia !== null && diferencia !== 0;
  });

  // Cuadratura de boletas por medio electrónico: esperadas (según el sistema) vs.
  // contadas (lo que el cajero cuenta físicamente), con su propia justificación si difieren.
  readonly cuadraturaBoletas = computed<CuadraturaBoletasPreview[]>(() => {
    const desglose = this.summaryByMethod();
    const contadas = this.boletasContadas();
    const justificaciones = this.justificacionesBoletas();

    // Solo pide cuadrar boletas de un medio si hubo ventas con ese medio este turno;
    // si nadie pagó con Pluxee, por ejemplo, no tiene sentido pedir que se cuente.
    return METODOS_ELECTRONICOS.filter(
      (key) => (desglose.find((m) => m.key === key)?.ventas ?? 0) > 0
    ).map((key) => {
      const meta = PAYMENT_METHOD_META[key];
      const esperadas = desglose.find((m) => m.key === key)?.ventas ?? 0;
      const contada = contadas[key] ?? null;
      const diferencia = contada === null ? null : contada - esperadas;
      return {
        key,
        label: meta.label,
        icon: meta.icon,
        esperadas,
        contadas: contada,
        diferencia,
        requiereJustificacion: diferencia !== null && diferencia !== 0,
        justificacion: justificaciones[key] ?? '',
      };
    });
  });

  readonly puedeConfirmarCierre = computed(() => {
    if (this.efectivoContado() === null) return false;
    if (this.requiereJustificacion() && this.justificacion().trim().length === 0) return false;

    for (const boleta of this.cuadraturaBoletas()) {
      if (boleta.contadas === null) return false;
      if (boleta.requiereJustificacion && boleta.justificacion.trim().length === 0) return false;
    }
    return true;
  });

  setEfectivoContado(valor: string): void {
    const parsed = valor.trim() === '' ? null : Number(valor);
    this.efectivoContado.set(parsed === null || Number.isNaN(parsed) ? null : parsed);
  }

  setJustificacion(valor: string): void {
    this.justificacion.set(valor);
  }

  setBoletaContada(key: MetodoElectronico, valor: string): void {
    const parsed = valor.trim() === '' ? null : Number(valor);
    this.boletasContadas.set({
      ...this.boletasContadas(),
      [key]: parsed === null || Number.isNaN(parsed) ? null : parsed,
    });
  }

  setJustificacionBoleta(key: MetodoElectronico, valor: string): void {
    this.justificacionesBoletas.set({ ...this.justificacionesBoletas(), [key]: valor });
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedMethod.set(this.selectedMethod() === method ? null : method);
  }

  openConfirm(): void {
    if (this.hayVentasEnElTurno()) {
      this.efectivoContado.set(null);
      this.justificacion.set('');
      this.boletasContadas.set({});
      this.justificacionesBoletas.set({});
      this.showConfirm.set(true);
    }
  }

  cancelConfirm(): void {
    this.showConfirm.set(false);
  }

  confirmCierre(): void {
    if (!this.puedeConfirmarCierre()) return;

    const cajero = this.authService.currentUser();
    const boletasContadas = this.boletasContadas() as Partial<Record<MetodoElectronico, number>>;
    const cierre = this.cajaService.cerrarTurno(
      cajero?.nombre ?? 'Cajero',
      cajero?.sucursalNombre ?? 'Sucursal',
      this.efectivoContado()!,
      this.requiereJustificacion() ? this.justificacion() : null,
      boletasContadas,
      this.justificacionesBoletas()
    );

    this.turnoCerrado.set(cierre);
    this.showConfirm.set(false);
    this.selectedMethod.set(null);
  }

  // Abre la caja y lleva al cajero al POS para empezar a vender (flujo de turno)
  iniciarTurno(): void {
    this.cajaService.iniciarTurno();
    this.router?.navigate(['/pos']);
  }

  volverAOperar(): void {
    this.turnoCerrado.set(null);
    this.iniciarTurno();
  }

  formatClpAbs(amount: number): string {
    return this.formatClp(Math.abs(amount));
  }

  absNumber(value: number): number {
    return Math.abs(value);
  }

  formatClp(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatFecha(fecha: Date): string {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(fecha);
  }

  formatHora(fecha: Date): string {
    return new Intl.DateTimeFormat('es-CL', { timeStyle: 'short' }).format(fecha);
  }

  // Resumen legible de los ítems de una venta, ej. "2x Café Espresso, 1x Cappuccino"
  resumenItems(sale: CompletedSale): string {
    return sale.items.map((item) => `${item.cantidad}x ${item.producto.nombre}`).join(', ');
  }
}
