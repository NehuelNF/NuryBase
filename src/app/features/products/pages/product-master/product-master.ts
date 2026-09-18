import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ProductoApi, ProductosApiService } from '../../../../core/api/productos-api.service';

@Component({
  imports: [],
  selector: 'app-product-master',
  styleUrl: './product-master.css',
  templateUrl: './product-master.html',
})
export class ProductMaster implements OnInit {
  private readonly productosApi = inject(ProductosApiService);

  protected readonly products = signal<ProductoApi[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
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
}
