import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { PAYMENT_METHOD_META, CierreCaja } from '../../models/caja.model';
import { PaymentMethod } from '../../../pos/models/pos.model';
import { CajaService } from '../../services/caja.service';

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

  readonly selectedMethod = signal<PaymentMethod | null>(null);
  readonly showConfirm = signal(false);
  readonly turnoCerrado = signal<CierreCaja | null>(null);

  readonly efectivoContado = signal<number | null>(null);
  readonly justificacion = signal('');

  readonly summaryByMethod = this.cajaService.summaryByMethod;
  readonly grandTotal = this.cajaService.grandTotal;
  readonly hayVentasEnElTurno = this.cajaService.hayVentasEnElTurno;

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

  readonly puedeConfirmarCierre = computed(() => {
    if (this.efectivoContado() === null) return false;
    if (this.requiereJustificacion() && this.justificacion().trim().length === 0) return false;
    return true;
  });

  setEfectivoContado(valor: string): void {
    const parsed = valor.trim() === '' ? null : Number(valor);
    this.efectivoContado.set(parsed === null || Number.isNaN(parsed) ? null : parsed);
  }

  setJustificacion(valor: string): void {
    this.justificacion.set(valor);
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedMethod.set(this.selectedMethod() === method ? null : method);
  }

  openConfirm(): void {
    if (this.hayVentasEnElTurno()) {
      this.efectivoContado.set(null);
      this.justificacion.set('');
      this.showConfirm.set(true);
    }
  }

  cancelConfirm(): void {
    this.showConfirm.set(false);
  }

  confirmCierre(): void {
    if (!this.puedeConfirmarCierre()) return;

    const cajero = this.authService.currentUser();
    const cierre = this.cajaService.cerrarTurno(
      cajero?.nombre ?? 'Cajero',
      cajero?.sucursalNombre ?? 'Sucursal',
      this.efectivoContado()!,
      this.requiereJustificacion() ? this.justificacion() : null
    );

    this.turnoCerrado.set(cierre);
    this.showConfirm.set(false);
    this.selectedMethod.set(null);
  }

  private readonly router = inject(Router, { optional: true });

  volverAOperar(): void {
    this.turnoCerrado.set(null);
    this.router?.navigate(['/pos']);
  }

  formatClpAbs(amount: number): string {
    return this.formatClp(Math.abs(amount));
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
}
