import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { BarcodeScanner } from '../../../../core/services/barcode-scanner';
import {
  ProductoApi,
  ProductoCreacion,
  ProductosApiService,
} from '../../../../core/api/productos-api.service';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-product-master',
  styleUrl: './product-master.css',
  templateUrl: './product-master.html',
})
export class ProductMaster implements OnInit, OnDestroy {
  private readonly productosApi = inject(ProductosApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly barcodeScanner = inject(BarcodeScanner);

  @ViewChild('productBarcodeVideo') private productBarcodeVideo?: ElementRef<HTMLVideoElement>;

  protected readonly products = signal<ProductoApi[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedProduct = signal<ProductoApi | null>(null);
  protected readonly creatingProduct = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly updatingStatusIds = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly productToDelete = signal<ProductoApi | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly barcodeScannerOpen = signal(false);
  protected readonly barcodeScannerError = signal<string | null>(null);
  protected readonly productForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    categoria: ['', Validators.maxLength(60)],
    precio_venta: [null as number | null, [Validators.required, Validators.min(0.01)]],
    codigo_barras: ['', Validators.maxLength(64)],
    activo: [true],
  });
  protected readonly activeProducts = computed(
    () => this.products().filter((product) => product.activo).length,
  );
  protected readonly inactiveProducts = computed(
    () => this.products().filter((product) => !product.activo).length,
  );
  protected readonly productModalOpen = computed(
    () => this.creatingProduct() || this.selectedProduct() !== null,
  );
  protected readonly filteredProducts = computed(() => {
    const query = this.normalizeSearchValue(this.searchQuery());

    if (!query) {
      return this.products();
    }

    return this.products().filter((product) => {
      const searchableValues = [
        product.nombre,
        product.codigo_barras ?? '',
      ];

      return searchableValues.some((value) => this.normalizeSearchValue(value).includes(query));
    });
  });

  ngOnInit(): void {
    this.productosApi.listar(false).subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('No se pudieron cargar los productos', error);
        this.error.set('No pudimos cargar los productos. Revisa la conexión con la base de datos.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.barcodeScanner.stop();
  }

  protected productBarcode(product: ProductoApi): string {
    return product.codigo_barras?.trim() || 'Sin código';
  }

  protected formatClp(price: number | string): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(Number(price));
  }

  protected formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  }

  protected updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected openEditModal(product: ProductoApi): void {
    this.successMessage.set(null);
    this.saveError.set(null);
    this.productForm.reset({
      nombre: product.nombre,
      categoria: product.categoria ?? '',
      precio_venta: Number(product.precio_venta),
      codigo_barras: product.codigo_barras ?? '',
      activo: product.activo,
    });
    this.creatingProduct.set(false);
    this.selectedProduct.set(product);
  }

  protected isUpdatingStatus(productId: number): boolean {
    return this.updatingStatusIds().has(productId);
  }

  protected toggleProductStatus(product: ProductoApi): void {
    if (this.isUpdatingStatus(product.id)) {
      return;
    }

    const nextStatus = !product.activo;
    this.successMessage.set(null);
    this.actionError.set(null);
    this.updatingStatusIds.update((ids) => new Set(ids).add(product.id));

    this.productosApi
      .actualizarEstado(product.id, nextStatus)
      .pipe(
        finalize(() => {
          this.updatingStatusIds.update((ids) => {
            const updatedIds = new Set(ids);
            updatedIds.delete(product.id);
            return updatedIds;
          });
        }),
      )
      .subscribe({
        next: (updatedProduct) => {
          this.products.update((products) =>
            products.map((current) =>
              current.id === updatedProduct.id ? updatedProduct : current,
            ),
          );
          this.successMessage.set(
            `“${updatedProduct.nombre}” ahora está ${updatedProduct.activo ? 'visible' : 'oculto'} en el catálogo.`,
          );
        },
        error: (error) => {
          console.error('No se pudo cambiar la visibilidad del producto', error);
          this.actionError.set(
            'No pudimos cambiar la visibilidad del producto. Inténtalo nuevamente.',
          );
        },
      });
  }

  protected openDeleteModal(product: ProductoApi): void {
    this.successMessage.set(null);
    this.actionError.set(null);
    this.deleteError.set(null);
    this.productToDelete.set(product);
  }

  protected closeDeleteModal(): void {
    if (this.deleting()) {
      return;
    }

    this.productToDelete.set(null);
    this.deleteError.set(null);
  }

  protected deleteProduct(): void {
    const product = this.productToDelete();

    if (!product || this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);

    this.productosApi
      .eliminar(product.id)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: (deletedProduct) => {
          this.products.update((products) =>
            products.filter((current) => current.id !== deletedProduct.id),
          );
          this.productToDelete.set(null);
          this.successMessage.set(`“${deletedProduct.nombre}” fue eliminado correctamente.`);
        },
        error: (error) => {
          console.error('No se pudo eliminar el producto', error);
          this.deleteError.set(this.deleteErrorMessage(error?.status));
        },
      });
  }

  protected openCreateModal(): void {
    this.successMessage.set(null);
    this.saveError.set(null);
    this.productForm.reset({
      nombre: '',
      categoria: '',
      precio_venta: null,
      codigo_barras: '',
      activo: true,
    });
    this.selectedProduct.set(null);
    this.creatingProduct.set(true);
  }

  protected closeProductModal(): void {
    if (this.saving()) {
      return;
    }

    this.creatingProduct.set(false);
    this.selectedProduct.set(null);
    this.saveError.set(null);
    this.closeBarcodeScanner();
  }

  protected openBarcodeScanner(): void {
    this.barcodeScannerError.set(null);
    this.barcodeScannerOpen.set(true);

    // The video element is rendered by the @if block on the next change-detection pass.
    setTimeout(() => void this.startBarcodeScanner(), 0);
  }

  protected closeBarcodeScanner(): void {
    this.barcodeScanner.stop();
    this.barcodeScannerOpen.set(false);
  }

  private async startBarcodeScanner(): Promise<void> {
    const videoElement = this.productBarcodeVideo?.nativeElement;
    if (!videoElement || !this.barcodeScannerOpen()) return;

    try {
      await this.barcodeScanner.start(
        videoElement,
        (code) => {
          this.productForm.controls.codigo_barras.setValue(code);
          this.productForm.controls.codigo_barras.markAsDirty();
          this.closeBarcodeScanner();
        },
        (error) => {
          console.error('No se pudo iniciar la cámara para escanear el producto', error);
          this.barcodeScannerError.set(this.getBarcodeScannerErrorMessage(error));
        },
      );
    } catch {
      // The user-facing message is set by the error callback above.
    }
  }

  private getBarcodeScannerErrorMessage(error: unknown): string {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return 'Debes permitir el acceso a la cámara para escanear.';
    }
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return 'No se encontró una cámara disponible en este dispositivo.';
    }
    return 'No fue posible iniciar la cámara. Verifica los permisos y que estés usando HTTPS.';
  }

  protected saveProduct(): void {
    const product = this.selectedProduct();
    const isCreating = this.creatingProduct();

    if ((!isCreating && !product) || this.saving()) {
      return;
    }

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    const values = this.productForm.getRawValue();
    const productData: ProductoCreacion = {
      nombre: values.nombre.trim(),
      categoria: values.categoria.trim() || null,
      precio_venta: Number(values.precio_venta),
      codigo_barras: values.codigo_barras.trim() || null,
      activo: values.activo,
    };

    if (!productData.nombre) {
      this.productForm.controls.nombre.setErrors({ required: true });
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const request = isCreating
      ? this.productosApi.crear(productData)
      : this.productosApi.actualizar(product!.id, productData);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (savedProduct) => {
        this.products.update((products) =>
          isCreating
            ? [...products, savedProduct]
            : products.map((current) => (current.id === savedProduct.id ? savedProduct : current)),
        );
        this.creatingProduct.set(false);
        this.selectedProduct.set(null);
        this.successMessage.set(
          `“${savedProduct.nombre}” fue ${isCreating ? 'creado' : 'actualizado'} correctamente.`,
        );
      },
      error: (error) => {
        console.error(`No se pudo ${isCreating ? 'crear' : 'actualizar'} el producto`, error);
        this.saveError.set(this.saveErrorMessage(error?.status, isCreating));
      },
    });
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    if (this.barcodeScannerOpen()) {
      this.closeBarcodeScanner();
    } else if (this.productToDelete()) {
      this.closeDeleteModal();
    } else if (this.productModalOpen()) {
      this.closeProductModal();
    }
  }

  private deleteErrorMessage(status: number | undefined): string {
    if (status === 409) {
      return 'Este producto tiene ventas, promociones u otros registros asociados. Puedes ocultarlo del catálogo en lugar de eliminarlo.';
    }

    if (status === 401 || status === 403) {
      return 'Tu sesión no tiene permisos para eliminar productos.';
    }

    return 'No pudimos eliminar el producto. Revisa la conexión e inténtalo nuevamente.';
  }

  private saveErrorMessage(status: number | undefined, isCreating: boolean): string {
    if (status === 409) {
      return 'Ya existe un producto con ese nombre o código de barras.';
    }

    if (status === 401 || status === 403) {
      return `Tu sesión no tiene permisos para ${isCreating ? 'crear' : 'editar'} productos.`;
    }

    return 'No pudimos guardar los cambios. Revisa la conexión e inténtalo nuevamente.';
  }

  private normalizeSearchValue(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('es-CL');
  }
}
