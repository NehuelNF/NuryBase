import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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

  selectMethod(method: PaymentMethod): void {
    this.selectedMethod.set(this.selectedMethod() === method ? null : method);
  }

  openConfirm(): void {
    if (this.hayVentasEnElTurno()) {
      this.showConfirm.set(true);
    }
  }

  cancelConfirm(): void {
    this.showConfirm.set(false);
  }

  confirmCierre(): void {
    const cajero = this.authService.currentUser();
    const cierre = this.cajaService.cerrarTurno(
      cajero?.nombre ?? 'Cajero',
      cajero?.sucursalNombre ?? 'Sucursal'
    );

    this.turnoCerrado.set(cierre);
    this.showConfirm.set(false);
    this.selectedMethod.set(null);
  }

  volverAOperar(): void {
    this.turnoCerrado.set(null);
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
