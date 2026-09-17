import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { ProductosApiService } from '../../../../core/api/productos-api.service';
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
export class PosLayoutComponent implements OnDestroy {
  readonly posService = inject(PosService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router, { optional: true });
  private readonly productosApi = inject(ProductosApiService, { optional: true });

  readonly categories = this.posService.categories;
  readonly catalog = this.posService.catalog;
  readonly cart = this.posService.cart;
  readonly total = this.posService.total;
  readonly totalItemsCount = this.posService.totalItemsCount;
  readonly currentUser = this.authService.currentUser;

  readonly selectedCategoryId = signal<number>(0);
  readonly searchQuery = signal<string>('');
  readonly quickBarcodeInput = signal<string>('');
  readonly barcodeFeedback = signal<string | null>(null);
  readonly isRegisterOpen = this.posService.isRegisterOpen;
  readonly pendingRegisterAction = signal<'open' | 'close' | null>(null);
  readonly showLogoutConfirm = signal<boolean>(false);

  // Control del modal de pago (H2.4)
  readonly isPaymentModalOpen = signal<boolean>(false);
  readonly lastCompletedSale = signal<CompletedSale | null>(null);

  // Control del Historial de Ventas del Turno (H2.7)
  readonly isHistoryModalOpen = signal<boolean>(false);
  readonly historySearchQuery = signal<string>('');
  readonly historyMethodFilter = signal<string>('todos');

  // Control de Anulación de Ventas (H2.9)
  readonly selectedSaleToVoid = signal<CompletedSale | null>(null);
  readonly voidReason = signal<string>('');
  readonly voidError = signal<string | null>(null);

  // Reloj digital en vivo
  readonly currentTime = signal<string>(new Date().toLocaleTimeString('es-CL'));
  private readonly timerId: ReturnType<typeof setInterval>;

  constructor() {
    this.timerId = setInterval(() => {
      this.currentTime.set(new Date().toLocaleTimeString('es-CL'));
    }, 1000);

    this.productosApi?.listarActivos().subscribe({
      next: (products) => {
        if (products.length > 0) this.posService.catalog.set(products);
      },
      error: () => {
        // El catálogo local permanece disponible si PostgREST no responde.
      },
    });
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  // Catálogo filtrado por categoría y búsqueda de texto (H2.2)
  readonly filteredCatalog = computed<PosProduct[]>(() => {
    let list = this.catalog().filter((p) => p.activo);
    const catId = this.selectedCategoryId();
    const query = this.normalizeSearch(this.searchQuery());

    if (catId !== 0) {
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

  // Ventas del turno filtradas por búsqueda y medio de pago (H2.7)
  readonly filteredShiftSales = computed<CompletedSale[]>(() => {
    const query = this.historySearchQuery().trim().toLowerCase();
    const method = this.historyMethodFilter();
    return this.posService.salesHistory().filter((sale) => {
      const matchMethod = method === 'todos' || sale.medioPago === method;
      if (!matchMethod) return false;
      if (!query) return true;
      return (
        sale.ticketFolio.toLowerCase().includes(query) ||
        sale.medioPago.toLowerCase().includes(query) ||
        (sale.motivoAnulacion && sale.motivoAnulacion.toLowerCase().includes(query)) ||
        sale.items.some((i) => i.producto.nombre.toLowerCase().includes(query))
      );
    });
  });

  readonly shiftTotalRecaudado = computed<number>(() =>
    this.posService
      .salesHistory()
      .filter((s) => s.estado !== 'anulada')
      .reduce((sum, s) => sum + s.total, 0)
  );

  readonly shiftActiveCount = computed<number>(() =>
    this.posService.salesHistory().filter((s) => s.estado !== 'anulada').length
  );

  readonly shiftVoidedCount = computed<number>(() =>
    this.posService.salesHistory().filter((s) => s.estado === 'anulada').length
  );

  selectCategory(catId: number): void {
    this.selectedCategoryId.set(catId);
  }

  private normalizeSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  getCategoryCount(catId: number): number {
    return this.catalog().filter((p) => p.activo && (catId === 0 || p.categoriaId === catId))
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
      setTimeout(() => this.barcodeFeedback.set(null), 3000);
      return;
    }
    const code = this.quickBarcodeInput().trim();
    if (!code) return;

    const product = this.posService.findProductByCode(code);
    if (product) {
      this.posService.addToCart(product);
      this.barcodeFeedback.set(
        `✅ ${product.codigoInterno} · ${product.nombre} (${this.formatClp(product.precioVenta)}) añadido.`
      );
      this.quickBarcodeInput.set('');
    } else {
      this.barcodeFeedback.set(`❌ Código "${code.toUpperCase()}" no encontrado en catálogo.`);
    }

    setTimeout(() => {
      this.barcodeFeedback.set(null);
    }, 3000);
  }

  // Historial del turno (H2.7)
  openSalesHistory(): void {
    this.isHistoryModalOpen.set(true);
  }

  closeSalesHistory(): void {
    this.isHistoryModalOpen.set(false);
  }

  // Solicitud de anulación de venta (H2.9)
  requestVoidSale(sale: CompletedSale): void {
    if (!this.isRegisterOpen()) {
      this.barcodeFeedback.set('❌ No se pueden anular ventas con la caja cerrada.');
      setTimeout(() => this.barcodeFeedback.set(null), 3500);
      return;
    }
    this.selectedSaleToVoid.set(sale);
    this.voidReason.set('');
    this.voidError.set(null);
  }

  cancelVoidSale(): void {
    this.selectedSaleToVoid.set(null);
    this.voidReason.set('');
    this.voidError.set(null);
  }

  selectVoidReasonPreset(reason: string): void {
    this.voidReason.set(reason);
    this.voidError.set(null);
  }

  confirmVoidSale(): void {
    if (!this.isRegisterOpen()) {
      this.voidError.set('No se puede anular la venta porque la caja se encuentra cerrada.');
      return;
    }

    const sale = this.selectedSaleToVoid();
    if (!sale) return;

    const reason = this.voidReason().trim();
    if (!reason) {
      this.voidError.set('Por favor, indica un motivo de anulación obligatorio.');
      return;
    }

    const result = this.posService.voidSale(
      sale.id,
      reason,
      this.currentUser()?.nombre
    );

    if (result.success) {
      this.barcodeFeedback.set(`✅ Venta ${sale.ticketFolio} anulada. Stock restituido.`);
      setTimeout(() => this.barcodeFeedback.set(null), 3500);
      this.selectedSaleToVoid.set(null);
      this.voidReason.set('');
      this.voidError.set(null);
    } else {
      this.voidError.set(result.error || 'Error al anular la venta.');
    }
  }

  openPayment(): void {
    if (this.isRegisterOpen() && this.total() > 0) {
      this.isPaymentModalOpen.set(true);
    }
  }

  requestRegisterChange(): void {
    this.pendingRegisterAction.set(this.isRegisterOpen() ? 'close' : 'open');
  }

  cancelRegisterChange(): void {
    this.pendingRegisterAction.set(null);
  }

  confirmRegisterChange(): void {
    const action = this.pendingRegisterAction();
    if (!action) return;
    this.isRegisterOpen.set(action === 'open');
    this.pendingRegisterAction.set(null);
  }

  requestLogout(): void {
    this.showLogoutConfirm.set(true);
  }

  cancelLogout(): void {
    this.showLogoutConfirm.set(false);
  }

  confirmLogout(): void {
    this.showLogoutConfirm.set(false);
    this.authService.logout();
  }

  goToCierreCaja(): void {
    this.showLogoutConfirm.set(false);
    this.router?.navigate(['/caja']);
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
