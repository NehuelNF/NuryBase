import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PosLayoutComponent } from './pos-layout.component';

@Component({ standalone: true, template: '' })
class DummyComponent {}

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
        provideRouter([
          { path: 'login', component: DummyComponent },
          { path: 'pos', component: DummyComponent },
        ]),
      ],
    }).compileComponents();
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

  it('asks for confirmation before closing and opening the register', () => {
    const component = TestBed.createComponent(PosLayoutComponent).componentInstance;

    expect(component.isRegisterOpen()).toBe(true);
    component.requestRegisterChange();
    expect(component.pendingRegisterAction()).toBe('close');

    component.confirmRegisterChange();
    expect(component.isRegisterOpen()).toBe(false);
    expect(component.pendingRegisterAction()).toBeNull();

    component.requestRegisterChange();
    expect(component.pendingRegisterAction()).toBe('open');
    component.confirmRegisterChange();
    expect(component.isRegisterOpen()).toBe(true);
  });

  it('keeps the register state when the confirmation is cancelled', () => {
    const component = TestBed.createComponent(PosLayoutComponent).componentInstance;

    component.requestRegisterChange();
    component.cancelRegisterChange();

    expect(component.isRegisterOpen()).toBe(true);
    expect(component.pendingRegisterAction()).toBeNull();
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

  it('shows warning when attempting to logout with an open register and allows going to cierre de caja', () => {
    const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
    expect(component.isRegisterOpen()).toBe(true);

    component.requestLogout();
    expect(component.showLogoutConfirm()).toBe(true);

    component.cancelLogout();
    expect(component.showLogoutConfirm()).toBe(false);

    component.requestLogout();
    component.goToCierreCaja();
    expect(component.showLogoutConfirm()).toBe(false);
  });

  it('allows confirmed logout when requested', () => {
    const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
    const logoutSpy = vi.spyOn(component.authService, 'logout').mockImplementation(() => {});

    component.requestLogout();
    expect(component.showLogoutConfirm()).toBe(true);

    component.confirmLogout();
    expect(logoutSpy).toHaveBeenCalled();
    expect(component.showLogoutConfirm()).toBe(false);
  });

  describe('H2.3: Fast code input and cart addition', () => {
    it('adds product by internal code and provides formatted price feedback', () => {
      const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
      const product = component.catalog()[0]; // NUR-101 Café Americano $2.200

      component.quickBarcodeInput.set(product.codigoInterno);
      component.onBarcodeScan();

      expect(component.cart()).toHaveLength(1);
      expect(component.cart()[0].producto.codigoInterno).toBe(product.codigoInterno);
      expect(component.barcodeFeedback()).toContain(product.nombre);
      expect(component.barcodeFeedback()).toContain('2.600');
      expect(component.quickBarcodeInput()).toBe('');
    });

    it('shows error feedback when code does not match any product', () => {
      const component = TestBed.createComponent(PosLayoutComponent).componentInstance;

      component.quickBarcodeInput.set('CODIGO-INEXISTENTE');
      component.onBarcodeScan();

      expect(component.cart()).toHaveLength(0);
      expect(component.barcodeFeedback()).toContain('no encontrado');
      expect(component.quickBarcodeInput()).toBe('CODIGO-INEXISTENTE');
    });
  });

  describe('H2.7: Shift sales history modal and filtering', () => {
    it('manages modal open/close state and displays live counters', () => {
      const component = TestBed.createComponent(PosLayoutComponent).componentInstance;

      expect(component.isHistoryModalOpen()).toBe(false);
      component.openSalesHistory();
      expect(component.isHistoryModalOpen()).toBe(true);

      component.closeSalesHistory();
      expect(component.isHistoryModalOpen()).toBe(false);
    });

    it('filters sales history by query and payment method', () => {
      const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
      const p1 = component.catalog()[0];
      const p2 = component.catalog()[1];

      // Completar 2 ventas
      component.addProduct(p1);
      component.posService.completeSale('efectivo', p1.precioVenta, 'Camila Rojas', 'Sucursal');
      component.addProduct(p2);
      component.posService.completeSale('tarjeta', p2.precioVenta, 'Camila Rojas', 'Sucursal');

      expect(component.shiftActiveCount()).toBe(2);
      expect(component.filteredShiftSales()).toHaveLength(2);

      // Filtro por método de pago
      component.historyMethodFilter.set('tarjeta');
      expect(component.filteredShiftSales()).toHaveLength(1);
      expect(component.filteredShiftSales()[0].medioPago).toBe('tarjeta');

      // Restablecer método y filtrar por texto
      component.historyMethodFilter.set('todos');
      component.historySearchQuery.set(p1.nombre.toLowerCase());
      expect(component.filteredShiftSales()).toHaveLength(1);
      expect(component.filteredShiftSales()[0].items[0].producto.nombre).toBe(p1.nombre);
    });
  });

  describe('H2.9: Sale voiding modal and workflow', () => {
    it('blocks voiding when register is closed', () => {
      const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
      const p = component.catalog()[0];
      component.addProduct(p);
      const sale = component.posService.completeSale('efectivo', p.precioVenta, 'Camila Rojas', 'Sucursal');

      component.isRegisterOpen.set(false);
      component.requestVoidSale(sale);

      expect(component.selectedSaleToVoid()).toBeNull();
      expect(component.barcodeFeedback()).toContain('caja cerrada');
    });

    it('opens void modal with sale details and allows selecting reason presets', () => {
      const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
      const p = component.catalog()[0];
      component.addProduct(p);
      const sale = component.posService.completeSale('efectivo', p.precioVenta, 'Camila Rojas', 'Sucursal');

      component.requestVoidSale(sale);
      expect(component.selectedSaleToVoid()).not.toBeNull();
      expect(component.selectedSaleToVoid()?.id).toBe(sale.id);

      component.selectVoidReasonPreset('Error de digitación');
      expect(component.voidReason()).toBe('Error de digitación');
    });

    it('validates mandatory reason and completes voiding flow', () => {
      const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
      const p = component.catalog()[0];
      component.addProduct(p);
      const sale = component.posService.completeSale('efectivo', p.precioVenta, 'Camila Rojas', 'Sucursal');

      component.requestVoidSale(sale);

      // Intentar confirmar sin motivo
      component.confirmVoidSale();
      expect(component.voidError()).toContain('motivo');
      expect(component.selectedSaleToVoid()).not.toBeNull();

      // Proveer motivo y confirmar
      component.selectVoidReasonPreset('Cliente desistió');
      component.confirmVoidSale();

      expect(component.selectedSaleToVoid()).toBeNull();
      expect(component.shiftVoidedCount()).toBe(1);
      expect(component.posService.salesHistory().find((s) => s.id === sale.id)?.estado).toBe('anulada');
    });

    it('cancels void modal without modifying sale status', () => {
      const component = TestBed.createComponent(PosLayoutComponent).componentInstance;
      const p = component.catalog()[0];
      component.addProduct(p);
      const sale = component.posService.completeSale('efectivo', p.precioVenta, 'Camila Rojas', 'Sucursal');

      component.requestVoidSale(sale);
      component.cancelVoidSale();

      expect(component.selectedSaleToVoid()).toBeNull();
      expect(component.posService.salesHistory().find((s) => s.id === sale.id)?.estado).toBe('completada');
    });
  });
});

