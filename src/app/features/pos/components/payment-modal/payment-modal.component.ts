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
      this.cashSelectionMade.set(false);
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
  readonly saving = signal<boolean>(false);
  readonly saveError = signal<string | null>(null);

  // Denominaciones chilenas frecuentes para agilizar en caja
  readonly quickCashButtons = [1000, 2000, 5000, 10000, 20000];

  // Estado específico para Beca Junaeb (App Ticket Junaeb) y Efectivo
  readonly junaebScanned = signal<boolean>(false);
  readonly cardPaymentReady = signal<boolean>(false);
  readonly cashSelectionMade = signal<boolean>(false);

  readonly changeDue = computed(() => {
    if (this.selectedMethod() !== 'efectivo' || !this.cashSelectionMade()) return 0;
    return this.amountReceived() - this.totalToPay;
  });

  readonly paymentError = computed(() => {
    if (!Number.isSafeInteger(this.totalToPay) || this.totalToPay <= 0) {
      return 'El total debe ser un monto válido mayor que cero.';
    }
    switch (this.selectedMethod()) {
      case 'efectivo':
        if (!this.cashSelectionMade()) {
          return 'Indica si el cliente paga justo o ingresa el monto recibido.';
        }
        if (!Number.isSafeInteger(this.amountReceived()) || this.amountReceived() < 0) {
          return 'Ingresa un monto válido en pesos, sin decimales.';
        }
        if (this.amountReceived() < this.totalToPay) {
          return `Faltan ${this.formatClp(this.totalToPay - this.amountReceived())}.`;
        }
        return null;
      case 'credito':
      case 'debito':
        return this.cardPaymentReady()
          ? null
          : 'Confirma que el pago terminó correctamente en la máquina del local.';
      case 'sodexo':
      case 'pluxee':
        return this.junaebScanned() ? null : 'Confirma el escaneo en la app para continuar.';
      default:
        return 'Selecciona un medio de pago válido.';
    }
  });
  readonly isPaymentValid = computed(() => !this.completedTicket() && this.paymentError() === null);

  ngOnInit(): void {
    // Al iniciar en efectivo, no se asume pago exacto hasta que el cajero lo indique
    this.amountReceived.set(0);
    this.cashSelectionMade.set(false);
  }

  setMethod(method: PaymentMethod): void {
    if (method !== this.selectedMethod()) {
      this.junaebScanned.set(false);
      this.cardPaymentReady.set(false);
      this.cashSelectionMade.set(false);
    }
    this.selectedMethod.set(method);
    if (method !== 'efectivo') {
      this.amountReceived.set(this.totalToPay);
    } else {
      this.amountReceived.set(0);
    }
  }

  setExactAmount(): void {
    this.amountReceived.set(this.totalToPay);
    this.cashSelectionMade.set(true);
  }

  setCashAmount(amount: number): void {
    this.amountReceived.set(amount);
    this.cashSelectionMade.set(true);
  }

  onCashInputChange(value: string | number | null): void {
    if (value === null || value === '' || Number.isNaN(+value)) {
      this.amountReceived.set(NaN);
      this.cashSelectionMade.set(false);
      return;
    }
    const num = +value;
    this.amountReceived.set(num);
    this.cashSelectionMade.set(true);
  }

  addCash(amount: number): void {
    const current = Number.isSafeInteger(this.amountReceived()) ? this.amountReceived() : 0;
    this.amountReceived.set(current + amount);
    this.cashSelectionMade.set(true);
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
    if (!user) {
      this.saveError.set('No hay una sesión activa. Vuelve a iniciar sesión.');
      return;
    }
    if (user.sucursalId == null) {
      this.saveError.set('Tu usuario no tiene una sucursal asignada; no puede registrar ventas.');
      return;
    }

    this.saveError.set(null);
    this.saving.set(true);

    this.posService
      .completeSale(
        this.selectedMethod(),
        this.selectedMethod() === 'efectivo' ? this.amountReceived() : this.totalToPay,
        { id: user.id, nombre: user.nombre },
        { id: user.sucursalId, nombre: user.sucursalNombre },
        this.selectedMethod() === 'sodexo' || this.selectedMethod() === 'pluxee'
          ? {
              codigoAutorizacion: `${this.selectedMethod().slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
            }
          : undefined,
      )
      .subscribe({
        next: (sale) => {
          this.saving.set(false);
          this.completedTicket.set(sale);
          this.saleFinished.emit(sale);
        },
        error: () => {
          this.saving.set(false);
          this.saveError.set('No se pudo registrar la venta. Revisa la conexión e inténtalo de nuevo.');
        },
      });
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

  medioPagoLabel(medioPago: PaymentMethod | undefined): string {
    switch (medioPago) {
      case 'sodexo':
        return 'Sodexo (Ticket Junaeb)';
      case 'pluxee':
        return 'Pluxee (Ticket Junaeb)';
      case 'credito':
        return 'Crédito';
      case 'debito':
        return 'Débito';
      case 'efectivo':
        return 'Efectivo';
      default:
        return '';
    }
  }
}
