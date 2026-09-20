import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
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
export class ProductMaster implements OnInit {
  private readonly productosApi = inject(ProductosApiService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly products = signal<ProductoApi[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedProduct = signal<ProductoApi | null>(null);
  protected readonly creatingProduct = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
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
        this.productCode(product.id),
        String(product.id),
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

  protected productCode(productId: number): string {
    return `NUR-${String(productId).padStart(3, '0')}`;
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
    if (this.productModalOpen()) {
      this.closeProductModal();
    }
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
