import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PosLayoutComponent } from './pos-layout.component';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('PosLayoutComponent', () => {
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
          p.descripcion.toLowerCase().includes('espresso')
      )
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
});
