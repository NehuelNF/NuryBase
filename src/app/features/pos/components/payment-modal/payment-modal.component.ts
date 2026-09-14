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

  @Input({ required: true }) totalToPay = 0;
  @Output() close = new EventEmitter<void>();
  @Output() saleFinished = new EventEmitter<CompletedSale>();

  readonly selectedMethod = signal<PaymentMethod>('efectivo');
  readonly amountReceived = signal<number>(0);
  readonly completedTicket = signal<CompletedSale | null>(null);

  // Denominaciones chilenas frecuentes para agilizar en caja
  readonly quickCashButtons = [1000, 2000, 5000, 10000, 20000];

  readonly changeDue = computed(() => {
    if (this.selectedMethod() !== 'efectivo') return 0;
    return this.amountReceived() - this.totalToPay;
  });

  readonly isPaymentValid = computed(() => {
    if (this.selectedMethod() !== 'efectivo') return true;
    return this.amountReceived() >= this.totalToPay;
  });

  ngOnInit(): void {
    // Por defecto inicializar monto recibido con el total
    this.amountReceived.set(this.totalToPay);
  }

  setMethod(method: PaymentMethod): void {
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

  onConfirmPayment(): void {
    if (!this.isPaymentValid()) return;

    const user = this.authService.currentUser();
    const cajeroNombre = user ? user.nombre : 'Cajero Turno 1';
    const sucursalNombre = user ? user.sucursalNombre : 'Nury Providencia';

    const sale = this.posService.completeSale(
      this.selectedMethod(),
      this.amountReceived(),
      cajeroNombre,
      sucursalNombre
    );

    this.completedTicket.set(sale);
    this.saleFinished.emit(sale);
  }

  onFinish(): void {
    this.close.emit();
  }

  formatClp(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
