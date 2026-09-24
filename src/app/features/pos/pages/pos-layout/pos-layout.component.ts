import { CommonModule, DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { BarcodeScanner } from '../../../../core/services/barcode-scanner';
import { PaymentModalComponent } from '../../components/payment-modal/payment-modal.component';
import { CompletedSale, PosProduct } from '../../models/pos.model';
import { PosService } from '../../services/pos.service';

@Component({
  selector: 'app-pos-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModalComponent],
  templateUrl: './pos-layout.component.html',
  styleUrl: './pos-layout.component.css',
})



export class PosLayoutComponent implements OnInit, OnDestroy {

  @ViewChild('barcodeVideo') private barcodeVideo?: ElementRef<HTMLVideoElement>;

  readonly posService = inject(PosService);
  readonly authService = inject(AuthService);
  private readonly barcodeScanner = inject(BarcodeScanner);
  private readonly router = inject(Router, { optional: true });

  readonly categories = this.posService.categories;
  readonly catalog = this.posService.catalog;
  readonly cart = this.posService.cart;
  readonly total = this.posService.total;
  readonly totalItemsCount = this.posService.totalItemsCount;
  readonly currentUser = this.authService.currentUser;

  readonly selectedCategoryId = signal<string>('');
  readonly searchQuery = signal<string>('');
  readonly quickBarcodeInput = signal<string>('');
  readonly barcodeFeedback = signal<string | null>(null);
  readonly isScannerOpen = signal(false);
  readonly scannerError = signal<string | null>(null);
  readonly isRegisterOpen = this.posService.isRegisterOpen;

  // Control del modal de pago (H2.4)
  readonly isPaymentModalOpen = signal<boolean>(false);
  readonly lastCompletedSale = signal<CompletedSale | null>(null);

  // Reloj digital en vivo
  readonly currentTime = signal<string>(new Date().toLocaleTimeString('es-CL'));
  private readonly timerId: ReturnType<typeof setInterval>;

  constructor() {
    this.timerId = setInterval(() => {
      this.currentTime.set(new Date().toLocaleTimeString('es-CL'));
    }, 1000);
  }

  ngOnInit(): void {
    this.posService.cargarCatalogoDesdeApi();
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    this.barcodeScanner.stop();
  }

  // Catálogo filtrado por categoría y búsqueda de texto (H2.2)
  readonly filteredCatalog = computed<PosProduct[]>(() => {
    let list = this.catalog().filter((p) => p.activo);
    const catId = this.selectedCategoryId();
    const query = this.normalizeSearch(this.searchQuery());

    if (catId !== '') {
      list = list.filter((p) => p.categoriaId === catId);
    }

    if (query) {
      list = list.filter((p) =>
        [p.nombre, p.codigoInterno, p.codigoBarras, p.descripcion].some((value) =>
          this.normalizeSearch(value).includes(query),
        ),
      );
    }

    return list;
  });

  selectCategory(catId: string): void {
    this.selectedCategoryId.set(catId);
  }

  private normalizeSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  getCategoryCount(catId: string): number {
    return this.catalog().filter((p) => p.activo && (catId === '' || p.categoriaId === catId))
      .length;
  }

  addProduct(product: PosProduct): void {
    if (!this.isRegisterOpen()) return;
    this.posService.addToCart(product);
  }

  // Entrada rápida por escáner de código de barras o código interno (H2.1 & H2.3)
  onBarcodeScan(): void {
    if (!this.isRegisterOpen()) {
      this.barcodeFeedback.set('❌ La caja está cerrada. Ábrela para registrar productos.');
      return;
    }
    const code = this.quickBarcodeInput().trim();
    if (!code) return;

    const added = this.posService.addByCode(code);
    if (added) {
      this.barcodeFeedback.set(`✅ Código ${code.toUpperCase()} añadido al carrito.`);
      this.quickBarcodeInput.set('');
    } else {
      this.barcodeFeedback.set(`❌ Código ${code.toUpperCase()} no encontrado en catálogo.`);
    }

    setTimeout(() => {
      this.barcodeFeedback.set(null);
    }, 2500);
  }

  openPayment(): void {
    if (this.isRegisterOpen() && this.total() > 0) {
      this.isPaymentModalOpen.set(true);
    }
  }

  goToCaja(): void {
    this.router?.navigate(['/caja']);
  }

  openBarcodeScanner(): void {
    if (!this.isRegisterOpen()) {
      this.barcodeFeedback.set('❌ La caja está cerrada. Ábrela para registrar productos.');
      return;
    }

    this.scannerError.set(null);
    this.isScannerOpen.set(true);

    // The video element is created by the @if block on the next change-detection pass.
    setTimeout(() => void this.startBarcodeScanner(), 0);
  }

  closeBarcodeScanner(): void {
    this.barcodeScanner.stop();
    this.isScannerOpen.set(false);
  }

  private async startBarcodeScanner(): Promise<void> {
    const videoElement = this.barcodeVideo?.nativeElement;
    if (!videoElement || !this.isScannerOpen()) return;

    try {
      await this.barcodeScanner.start(
        videoElement,
        (code) => {
          this.quickBarcodeInput.set(code);
          this.closeBarcodeScanner();
          this.onBarcodeScan();
        },
        (error) => {
          console.error('No se pudo iniciar la cámara para escanear', error);
          this.scannerError.set(this.getScannerErrorMessage(error));
        },
      );
    } catch {
      // The user-facing message is set by the error callback above.
    }
  }

  private getScannerErrorMessage(error: unknown): string {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return 'Debes permitir el acceso a la cámara para escanear.';
    }
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return 'No se encontró una cámara disponible en este dispositivo.';
    }
    return 'No fue posible iniciar la cámara. Verifica los permisos y que estés usando HTTPS.';
  }

  closePayment(): void {
    this.isPaymentModalOpen.set(false);
  }

  onSaleFinished(sale: CompletedSale): void {
    this.lastCompletedSale.set(sale);
  }

  formatClp(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
