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
    expect(sale.estado).toBe('completada');
    expect(service.cart().length).toBe(0);
    expect(service.salesHistory().length).toBe(1);
  });

  it('finds products by internal code regardless of case (H2.3)', () => {
    const productUpper = service.findProductByCode('NUR-201');
    const productLower = service.findProductByCode('nur-201');
    expect(productUpper).toBeDefined();
    expect(productLower).toBeDefined();
    expect(productUpper?.nombre).toBe('Sándwich Ave Palta');
    expect(productLower?.id).toBe(productUpper?.id);
  });

  it('returns undefined for non-existent internal code or barcode (H2.3)', () => {
    const notFound = service.findProductByCode('NUR-99999');
    expect(notFound).toBeUndefined();
  });

  it('voids a completed sale and records reason and timestamp (H2.9)', () => {
    const product = service.catalog()[0];
    service.addToCart(product);
    const sale = service.completeSale('tarjeta', product.precioVenta, 'Camila Rojas', 'Nury Providencia');

    const voidResult = service.voidSale(sale.id, 'Cliente desiste de la compra', 'Patricio Menares');
    expect(voidResult.success).toBe(true);
    expect(voidResult.sale?.estado).toBe('anulada');
    expect(voidResult.sale?.motivoAnulacion).toBe('Cliente desiste de la compra');
    expect(voidResult.sale?.usuarioAnulacion).toBe('Patricio Menares');
    expect(voidResult.sale?.fechaAnulacion).toBeInstanceOf(Date);

    // El historial debe reflejar el estado anulada
    const inHistory = service.salesHistory().find((s) => s.id === sale.id);
    expect(inHistory?.estado).toBe('anulada');
  });

  it('rejects voiding without mandatory reason (H2.9)', () => {
    const product = service.catalog()[0];
    service.addToCart(product);
    const sale = service.completeSale('efectivo', product.precioVenta, 'Camila Rojas', 'Nury Providencia');

    const voidResult = service.voidSale(sale.id, '   ');
    expect(voidResult.success).toBe(false);
    expect(voidResult.error).toContain('motivo de anulación es obligatorio');
    expect(service.salesHistory()[0].estado).toBe('completada');
  });

  it('prevents voiding an already voided sale (H2.9)', () => {
    const product = service.catalog()[0];
    service.addToCart(product);
    const sale = service.completeSale('efectivo', product.precioVenta, 'Camila Rojas', 'Nury Providencia');

    service.voidSale(sale.id, 'Primera anulación');
    const secondVoid = service.voidSale(sale.id, 'Intento repetido');
    expect(secondVoid.success).toBe(false);
    expect(secondVoid.error).toContain('ya se encuentra anulada');
  });
});
