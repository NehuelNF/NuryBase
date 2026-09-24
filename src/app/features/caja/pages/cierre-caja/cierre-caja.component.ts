import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { PAYMENT_METHOD_META, CierreCaja } from '../../models/caja.model';
import { CompletedSale, PaymentMethod } from '../../../pos/models/pos.model';
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
  private readonly router = inject(Router, { optional: true });

  readonly selectedMethod = signal<PaymentMethod | null>(null);
  readonly showConfirm = signal(false);
  readonly turnoCerrado = signal<CierreCaja | null>(null);

  readonly efectivoContado = signal<number | null>(null);
  readonly justificacion = signal('');
  readonly errorMensaje = signal<string | null>(null);

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

    this.errorMensaje.set(null);
    const cajero = this.authService.currentUser();
    this.cajaService
      .cerrarTurno(
        cajero?.nombre ?? 'Cajero',
        cajero?.sucursalNombre ?? 'Sucursal',
        this.efectivoContado()!,
        this.requiereJustificacion() ? this.justificacion() : null
      )
      .subscribe({
        next: (cierre) => {
          this.turnoCerrado.set(cierre);
          this.showConfirm.set(false);
          this.selectedMethod.set(null);
        },
        error: (error: Error) => {
          this.errorMensaje.set(error.message || 'No se pudo cerrar el turno. Intenta de nuevo.');
        },
      });
  }

  // Abre la caja y lleva al cajero al POS para empezar a vender (flujo de turno)
  iniciarTurno(): void {
    const usuario = this.authService.currentUser();
    if (!usuario) return;

    this.errorMensaje.set(null);
    this.cajaService.iniciarTurno(usuario.id, usuario.sucursalId).subscribe({
      next: () => this.router?.navigate(['/pos']),
      error: (error: Error) => {
        this.errorMensaje.set(error.message || 'No se pudo iniciar el turno. Intenta de nuevo.');
      },
    });
  }

  volverAOperar(): void {
    this.turnoCerrado.set(null);
    this.iniciarTurno();
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

  formatHora(fecha: Date): string {
    return new Intl.DateTimeFormat('es-CL', { timeStyle: 'short' }).format(fecha);
  }

  // Resumen legible de los ítems de una venta, ej. "2x Café Espresso, 1x Cappuccino"
  resumenItems(sale: CompletedSale): string {
    return sale.items.map((item) => `${item.cantidad}x ${item.producto.nombre}`).join(', ');
  }
}
