import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER } from 'rxjs';
import { ProductosApiService } from '../../../../core/api/productos-api.service';
import { PosProduct } from '../../models/pos.model';
import { PosService } from '../../services/pos.service';
import { PosLayoutComponent } from './pos-layout.component';

@Component({ standalone: true, template: '' })
class DummyComponent {}

const TEST_PRODUCTS: PosProduct[] = [
  {
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
  },
  ...[201, 202, 203].map((code, index) => ({
    id: index + 2,
    nombre: ['Sándwich Ave Palta', 'Sándwich Mechada Luco', 'Sándwich Jamón Queso'][index],
    categoriaId: 2,
    categoriaNombre: 'Sándwiches',
    codigoInterno: `NUR-${code}`,
    codigoBarras: `780123450${code}`,
    precioVenta: 4000 + index * 500,
    icono: '🥪',
    descripcion: 'Producto exclusivo para pruebas.',
    activo: true,
  })),
];

describe('PosLayoutComponent', () => {
  it('finds accented names with unaccented uppercase text', () => {
    const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
    component.searchQuery.set('  CAFE  ');
    expect(component.filteredCatalog().some((p) => p.nombre === 'Café Espresso Doble')).toBe(true);
    component.searchQuery.set('sandwich');
    expect(component.filteredCatalog()).toHaveLength(3);
  });

  it('searches barcode and combines search with category selection', () => {
    const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
    const product = component.catalog()[0];
    component.searchQuery.set(product.codigoBarras);
    expect(component.filteredCatalog()).toEqual([product]);
    component.selectCategory(2);
    expect(component.filteredCatalog()).toEqual([]);
    component.selectCategory(0);
    expect(component.filteredCatalog()).toEqual([product]);
  });

  it('excludes inactive products from cards and category counts', () => {
    const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
    const product = component.catalog()[0];
    const initialCount = component.getCategoryCount(0);
    const categoryCount = component.getCategoryCount(product.categoriaId);
    component.posService.catalog.update((products) =>
      products.map((p) => (p.id === product.id ? { ...p, activo: false } : p)),
    );
    expect(component.getCategoryCount(0)).toBe(initialCount - 1);
    expect(component.getCategoryCount(product.categoriaId)).toBe(categoryCount - 1);
    component.searchQuery.set(product.codigoInterno);
    expect(component.filteredCatalog()).toEqual([]);
  });

  it('adds exactly one item through the accessible product button', () => {
    const fixture = TestBed.createComponent(PosLayoutComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Agregar Café Espresso Doble"]',
    );
    button.click();
    expect(fixture.componentInstance.cart()).toHaveLength(1);
    expect(fixture.componentInstance.cart()[0].cantidad).toBe(1);
    expect(fixture.componentInstance.cart()[0].producto.nombre).toBe('Café Espresso Doble');
    expect(fixture.componentInstance.total()).toBe(2600);
  });
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PosLayoutComponent],
      providers: [
        { provide: ProductosApiService, useValue: { listar: () => NEVER } },
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'pos', component: DummyComponent },
        ]),
      ],
    }).compileComponents();

    const posService = TestBed.inject(PosService);
    posService.catalog.set(TEST_PRODUCTS.map((product) => ({ ...product })));
    posService.clearCart();
    // Estas pruebas verifican el comportamiento del POS asumiendo un turno ya
    // iniciado; el flujo real de apertura ahora vive en CajaService/"Caja".
    posService.openRegister();
  });

  it('should create the pos layout component', () => {
    const fixture = TestBed.createComponent(PosLayoutComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should filter catalog by search query (H2.2)', () => {
    const fixture = TestBed.createComponent(PosLayoutComponent);
    const component = fixture.componentInstance;

    component.searchQuery.set('espresso');
    const filtered = component.filteredCatalog();
    expect(filtered.length).toBeGreaterThan(0);
    expect(
      filtered.every(
        (p) =>
          p.nombre.toLowerCase().includes('espresso') ||
          p.codigoInterno.toLowerCase().includes('espresso') ||
          p.descripcion.toLowerCase().includes('espresso'),
      ),
    ).toBe(true);
  });

  it('should add product on barcode scan (H2.1 & H2.3)', () => {
    const fixture = TestBed.createComponent(PosLayoutComponent);
    const component = fixture.componentInstance;

    component.quickBarcodeInput.set('NUR-201');
    component.onBarcodeScan();

    expect(component.barcodeFeedback()).toContain('NUR-201');
    expect(component.cart().length).toBeGreaterThan(0);
  });

  it('blocks product entry while the register is closed', () => {
    const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
    const product = component.catalog()[0];
    component.isRegisterOpen.set(false);

    component.addProduct(product);
    component.quickBarcodeInput.set(product.codigoInterno);
    component.onBarcodeScan();

    expect(component.cart()).toHaveLength(0);
    expect(component.barcodeFeedback()).toContain('caja está cerrada');
  });

  it('keeps session controls out of the POS header', () => {
    const fixture = TestBed.createComponent(PosLayoutComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.btn-register')).toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-logout')).toBeNull();
  });
});
