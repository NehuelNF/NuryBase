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

  // Estado específico para Beca Junaeb (Escaneo de QR desde App Ticket Junaeb)
  readonly junaebQrScanned = signal<boolean>(false);
  readonly isScanningJunaeb = signal<boolean>(false);
  readonly manualQrInput = signal<string>('');
  readonly junaebStudent = signal<{
    nombre: string;
    rut: string;
    saldoDisponible: number;
    codigoAutorizacion: string;
  } | null>(null);

  readonly changeDue = computed(() => {
    if (this.selectedMethod() !== 'efectivo') return 0;
    return this.amountReceived() - this.totalToPay;
  });

  readonly isPaymentValid = computed(() => {
    if (this.selectedMethod() === 'efectivo') {
      return this.amountReceived() >= this.totalToPay;
    }
    if (this.selectedMethod() === 'junaeb') {
      if (!this.junaebQrScanned()) return false;
      const student = this.junaebStudent();
      return student ? student.saldoDisponible >= this.totalToPay : false;
    }
    return true;
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

  // Simulación del escaneo de QR presentado por el cliente en su App Ticket Junaeb
  simulateScanJunaebQr(): void {
    this.isScanningJunaeb.set(true);
    setTimeout(() => {
      this.isScanningJunaeb.set(false);
      this.junaebQrScanned.set(true);
      const authNum = Math.floor(100000 + Math.random() * 900000);
      this.junaebStudent.set({
        nombre: 'Matías González P.',
        rut: '20.481.932-K',
        saldoDisponible: 32500,
        codigoAutorizacion: `AUTH-JUN-${authNum}`,
      });
    }, 600);
  }

  applyManualJunaebCode(): void {
    const code = this.manualQrInput().trim();
    if (!code) return;

    this.junaebQrScanned.set(true);
    const authNum = Math.floor(100000 + Math.random() * 900000);
    this.junaebStudent.set({
      nombre: 'Camila Valenzuela S.',
      rut: '21.109.845-3',
      saldoDisponible: 28400,
      codigoAutorizacion: `AUTH-JUN-${authNum}`,
    });
    this.manualQrInput.set('');
  }

  resetJunaebScan(): void {
    this.junaebQrScanned.set(false);
    this.junaebStudent.set(null);
    this.manualQrInput.set('');
  }

  onConfirmPayment(): void {
    if (!this.isPaymentValid()) return;

    const user = this.authService.currentUser();
    const cajeroNombre = user ? user.nombre : 'Cajero Turno 1';
    const sucursalNombre = user ? user.sucursalNombre : 'Nury Providencia';

    const student = this.junaebStudent();
    const extraDetails =
      this.selectedMethod() === 'junaeb' && student
        ? {
            codigoAutorizacion: student.codigoAutorizacion,
            titularJunaeb: `${student.nombre} (${student.rut})`,
            saldoRestanteJunaeb: student.saldoDisponible - this.totalToPay,
          }
        : undefined;

    const sale = this.posService.completeSale(
      this.selectedMethod(),
      this.amountReceived(),
      cajeroNombre,
      sucursalNombre,
      extraDetails
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
