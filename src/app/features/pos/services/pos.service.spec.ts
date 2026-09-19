import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { ProductosApiService } from '../../../core/api/productos-api.service';
import { VentasApiService } from '../../../core/api/ventas-api.service';
import { PosProduct } from '../models/pos.model';
import { PosService } from './pos.service';

const TEST_PRODUCT: PosProduct = {
  id: 1,
  nombre: 'Café Espresso Doble',
  categoriaId: 1,
  categoriaNombre: 'Cafetería',
  codigoInterno: 'NUR-101',
  codigoBarras: '7801234501018',
  precioVenta: 2600,
  icono: '☕',
  descripcion: 'Producto exclusivo para pruebas.',
  activo: true,
};

describe('PosService', () => {
  let service: PosService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ProductosApiService, useValue: { listar: () => NEVER } },
        { provide: VentasApiService, useValue: { registrar: () => of(999) } },
      ],
    });
    service = TestBed.inject(PosService);
    service.catalog.set([TEST_PRODUCT]);
    service.clearCart();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should support products loaded into the catalog with internal codes (H2.3)', () => {
    const products = service.catalog();
    expect(products.length).toBeGreaterThan(0);
    expect(products.some((p) => p.codigoInterno.startsWith('NUR-'))).toBe(true);
  });

  it('should add products to cart and calculate total correctly', () => {
    const product = service.catalog()[0];
    service.addToCart(product);

    expect(service.cart().length).toBe(1);
    expect(service.total()).toBe(product.precioVenta);

    // Añadir de nuevo debe incrementar cantidad
    service.addToCart(product);
    expect(service.cart().length).toBe(1);
    expect(service.cart()[0].cantidad).toBe(2);
    expect(service.total()).toBe(product.precioVenta * 2);
  });

  it('should add product by internal code or barcode (H2.1 & H2.3)', () => {
    const success = service.addByCode('NUR-101');
    expect(success).toBe(true);
    expect(service.cart().length).toBe(1);
    expect(service.cart()[0].producto.codigoInterno).toBe('NUR-101');
  });

  it('should complete sale and compute correct change (H2.4)', () => {
    const product = service.catalog()[0];
    service.addToCart(product);
    const total = service.total();

    let sale: import('../models/pos.model').CompletedSale | undefined;
    service
      .completeSale(
        'efectivo',
        total + 2000,
        { id: 1, nombre: 'Camila Rojas' },
        { id: 1, nombre: 'Nury Providencia' },
      )
      .subscribe((result) => (sale = result));

    expect(sale?.id).toBe(999); // 999 es el id que devuelve el mock de VentasApiService
    expect(sale?.vuelto).toBe(2000);
    expect(sale?.medioPago).toBe('efectivo');
    expect(service.cart().length).toBe(0);
    expect(service.salesHistory().length).toBe(1);
  });
});
