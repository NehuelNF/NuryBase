import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ProductoActualizacion,
  ProductoApi,
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
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedProduct = signal<ProductoApi | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly editForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    categoria: ['', Validators.maxLength(60)],
    precio_venta: [0, [Validators.required, Validators.min(0.01)]],
    codigo_barras: ['', Validators.maxLength(64)],
    activo: [true],
  });
  protected readonly activeProducts = computed(
    () => this.products().filter((product) => product.activo).length,
  );
  protected readonly inactiveProducts = computed(
    () => this.products().filter((product) => !product.activo).length,
  );

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

  protected openEditModal(product: ProductoApi): void {
    this.successMessage.set(null);
    this.saveError.set(null);
    this.editForm.reset({
      nombre: product.nombre,
      categoria: product.categoria ?? '',
      precio_venta: Number(product.precio_venta),
      codigo_barras: product.codigo_barras ?? '',
      activo: product.activo,
    });
    this.selectedProduct.set(product);
  }

  protected closeEditModal(): void {
    if (this.saving()) {
      return;
    }

    this.selectedProduct.set(null);
    this.saveError.set(null);
  }

  protected saveProduct(): void {
    const product = this.selectedProduct();

    if (!product || this.saving()) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const values = this.editForm.getRawValue();
    const changes: ProductoActualizacion = {
      nombre: values.nombre.trim(),
      categoria: values.categoria.trim() || null,
      precio_venta: values.precio_venta,
      codigo_barras: values.codigo_barras.trim() || null,
      activo: values.activo,
    };

    if (!changes.nombre) {
      this.editForm.controls.nombre.setErrors({ required: true });
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    this.productosApi
      .actualizar(product.id, changes)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updatedProduct) => {
          this.products.update((products) =>
            products.map((current) =>
              current.id === updatedProduct.id ? updatedProduct : current,
            ),
          );
          this.selectedProduct.set(null);
          this.successMessage.set(`“${updatedProduct.nombre}” fue actualizado correctamente.`);
        },
        error: (error) => {
          console.error('No se pudo actualizar el producto', error);
          this.saveError.set(this.updateErrorMessage(error?.status));
        },
      });
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    if (this.selectedProduct()) {
      this.closeEditModal();
    }
  }

  private updateErrorMessage(status?: number): string {
    if (status === 409) {
      return 'Ya existe un producto con ese nombre o código de barras.';
    }

    if (status === 401 || status === 403) {
      return 'Tu sesión no tiene permisos para editar productos.';
    }

    return 'No pudimos guardar los cambios. Revisa la conexión e inténtalo nuevamente.';
  }
}
