import { TestBed } from '@angular/core/testing';
import { PosService } from './pos.service';

describe('PosService', () => {
  let service: PosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PosService);
    service.clearCart();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have products in catalog with internal codes (H2.3)', () => {
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

    const sale = service.completeSale('efectivo', total + 2000, 'Camila Rojas', 'Nury Providencia');
    expect(sale.vuelto).toBe(2000);
    expect(sale.medioPago).toBe('efectivo');
    expect(service.cart().length).toBe(0);
    expect(service.salesHistory().length).toBe(1);
  });
});
