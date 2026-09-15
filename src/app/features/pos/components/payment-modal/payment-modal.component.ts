import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/services/auth.service';
import { CompletedSale, PaymentMethod } from '../../models/pos.model';
import { PosService } from '../../services/pos.service';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.css',
})
export class PaymentModalComponent {
  private readonly posService = inject(PosService);
  private readonly authService = inject(AuthService);

  private readonly paymentTotal = signal(0);
  @Input({ required: true })
  set totalToPay(value: number) {
    if (value !== this.paymentTotal()) {
      this.junaebScanned.set(false);
      this.cardPaymentReady.set(false);
    }
    this.paymentTotal.set(value);
  }
  get totalToPay(): number {
    return this.paymentTotal();
  }
  @Output() close = new EventEmitter<void>();
  @Output() saleFinished = new EventEmitter<CompletedSale>();

  readonly selectedMethod = signal<PaymentMethod>('efectivo');
  readonly NaN = Number.NaN;
  readonly amountReceived = signal<number>(0);
  readonly completedTicket = signal<CompletedSale | null>(null);

  // Denominaciones chilenas frecuentes para agilizar en caja
  readonly quickCashButtons = [1000, 2000, 5000, 10000, 20000];

  // Estado específico para Beca Junaeb (App Ticket Junaeb)
  readonly junaebScanned = signal<boolean>(false);
  readonly cardPaymentReady = signal<boolean>(false);

  readonly changeDue = computed(() => {
    if (this.selectedMethod() !== 'efectivo') return 0;
    return this.amountReceived() - this.totalToPay;
  });

  readonly paymentError = computed(() => {
    if (!Number.isSafeInteger(this.totalToPay) || this.totalToPay <= 0) {
      return 'El total debe ser un monto válido mayor que cero.';
    }
    switch (this.selectedMethod()) {
      case 'efectivo':
        if (!Number.isSafeInteger(this.amountReceived()) || this.amountReceived() < 0) {
          return 'Ingresa un monto válido en pesos, sin decimales.';
        }
        if (this.amountReceived() < this.totalToPay) {
          return `Faltan ${this.formatClp(this.totalToPay - this.amountReceived())}.`;
        }
        return null;
      case 'tarjeta':
        return this.cardPaymentReady()
          ? null
          : 'Confirma que el pago terminó correctamente en la máquina del local.';
      case 'junaeb':
        return this.junaebScanned() ? null : 'Confirma el escaneo en Ticket Junaeb para continuar.';
      default:
        return 'Selecciona un medio de pago válido.';
    }
  });
  readonly isPaymentValid = computed(() => !this.completedTicket() && this.paymentError() === null);

  ngOnInit(): void {
    // Por defecto inicializar monto recibido con el total
    this.amountReceived.set(this.totalToPay);
  }

  setMethod(method: PaymentMethod): void {
    if (method !== this.selectedMethod()) {
      this.junaebScanned.set(false);
      this.cardPaymentReady.set(false);
    }
    this.selectedMethod.set(method);
    if (method !== 'efectivo') {
      this.amountReceived.set(this.totalToPay);
    }
  }

  setExactAmount(): void {
    this.amountReceived.set(this.totalToPay);
  }

  setCashAmount(amount: number): void {
    this.amountReceived.set(amount);
  }

  addCash(amount: number): void {
    this.amountReceived.set(this.amountReceived() + amount);
  }

  // Marcar como escaneado desde el dispositivo del local con la App Ticket Junaeb
  markJunaebAsScanned(): void {
    this.junaebScanned.set(true);
  }

  resetJunaebScan(): void {
    this.junaebScanned.set(false);
  }

  markCardPaymentAsReady(): void {
    this.cardPaymentReady.set(true);
  }

  resetCardPayment(): void {
    this.cardPaymentReady.set(false);
  }

  onConfirmPayment(): void {
    if (!this.isPaymentValid()) return;
    if (this.posService.cart().length === 0 || this.posService.total() !== this.totalToPay) return;

    const user = this.authService.currentUser();
    const cajeroNombre = user ? user.nombre : 'Cajero Turno 1';
    const sucursalNombre = user ? user.sucursalNombre : 'Nury Providencia';

    const sale = this.posService.completeSale(
      this.selectedMethod(),
      this.selectedMethod() === 'efectivo' ? this.amountReceived() : this.totalToPay,
      cajeroNombre,
      sucursalNombre,
      this.selectedMethod() === 'junaeb'
        ? {
            codigoAutorizacion: `JUN-${Math.floor(100000 + Math.random() * 900000)}`,
          }
        : undefined,
    );

    this.completedTicket.set(sale);
    this.saleFinished.emit(sale);
  }

  onFinish(): void {
    this.close.emit();
  }

  printTicket(): void {
    if (!this.completedTicket()) return;
    window.print();
  }

  formatClp(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
