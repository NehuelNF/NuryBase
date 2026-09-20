import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  ProductoActualizacion,
  ProductoApi,
  ProductoCreacion,
  ProductosApiService,
} from '../../../../core/api/productos-api.service';
import { ProductMaster } from './product-master';

describe('ProductMaster', () => {
  let component: ProductMaster;
  let fixture: ComponentFixture<ProductMaster>;
  let updatedProduct: ProductoActualizacion | null;
  let createdProduct: ProductoCreacion | null;
  let updatedStatus: { id: number; activo: boolean } | null;
  let deletedProductId: number | null;

  const product: ProductoApi = {
    id: 7,
    nombre: 'Café americano',
    categoria: 'Cafetería',
    precio_venta: 2200,
    codigo_barras: '7800000000007',
    activo: true,
    creado_en: '2026-09-01T12:00:00Z',
  };
  const secondProduct: ProductoApi = {
    id: 12,
    nombre: 'Té verde',
    categoria: 'Cafetería',
    precio_venta: 1800,
    codigo_barras: '7800000000012',
    activo: true,
    creado_en: '2026-09-02T12:00:00Z',
  };

  beforeEach(async () => {
    updatedProduct = null;
    createdProduct = null;
    updatedStatus = null;
    deletedProductId = null;
    await TestBed.configureTestingModule({
      imports: [ProductMaster],
      providers: [
        {
          provide: ProductosApiService,
          useValue: {
            listar: () => of([product, secondProduct]),
            crear: (newProduct: ProductoCreacion) => {
              createdProduct = newProduct;
              return of({
                ...newProduct,
                id: 8,
                creado_en: '2026-09-20T12:00:00Z',
              });
            },
            actualizar: (_id: number, changes: ProductoActualizacion) => {
              updatedProduct = changes;
              return of({ ...product, ...changes });
            },
            actualizarEstado: (id: number, activo: boolean) => {
              updatedStatus = { id, activo };
              const currentProduct = id === product.id ? product : secondProduct;
              return of({ ...currentProduct, activo });
            },
            eliminar: (id: number) => {
              deletedProductId = id;
              return of(id === product.id ? product : secondProduct);
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductMaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the edit modal with all the product data', () => {
    const editButton = fixture.nativeElement.querySelector('.edit-button') as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.edit-modal');
    const nameInput = fixture.nativeElement.querySelector(
      'input[formControlName="nombre"]',
    ) as HTMLInputElement;
    const barcodeInput = fixture.nativeElement.querySelector(
      'input[formControlName="codigo_barras"]',
    ) as HTMLInputElement;

    expect(modal).toBeTruthy();
    expect(nameInput.value).toBe('Café americano');
    expect(barcodeInput.value).toBe('7800000000007');
  });

  it('filters products by name without requiring matching accents', () => {
    const searchInput = fixture.nativeElement.querySelector(
      'input[aria-label="Buscar productos"]',
    ) as HTMLInputElement;
    searchInput.value = 'te verde';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.product-table tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Té verde');
    expect(rows[0].textContent).not.toContain('Café americano');
  });

  it('filters products by their displayed internal code', () => {
    const searchInput = fixture.nativeElement.querySelector(
      'input[aria-label="Buscar productos"]',
    ) as HTMLInputElement;
    searchInput.value = 'NUR-012';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.product-table tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Té verde');
    expect(rows[0].textContent).toContain('NUR-012');
  });

  it('opens an empty form when clicking Nuevo producto', () => {
    (fixture.nativeElement.querySelector('.primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('.product-modal');
    const title = fixture.nativeElement.querySelector('#product-form-title');
    const nameInput = fixture.nativeElement.querySelector(
      'input[formControlName="nombre"]',
    ) as HTMLInputElement;

    expect(modal).toBeTruthy();
    expect(title.textContent).toContain('Crear producto');
    expect(nameInput.value).toBe('');
    expect(fixture.nativeElement.querySelector('.readonly-grid')).toBeNull();
  });

  it('creates a product and adds it to the table after saving', () => {
    (fixture.nativeElement.querySelector('.primary-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector(
      'input[formControlName="nombre"]',
    ) as HTMLInputElement;
    const priceInput = fixture.nativeElement.querySelector(
      'input[formControlName="precio_venta"]',
    ) as HTMLInputElement;
    nameInput.value = 'Té chai';
    nameInput.dispatchEvent(new Event('input'));
    priceInput.value = '2800';
    priceInput.dispatchEvent(new Event('input'));

    (fixture.nativeElement.querySelector('.product-modal form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(createdProduct?.nombre).toBe('Té chai');
    expect(createdProduct?.precio_venta).toBe(2800);
    expect(fixture.nativeElement.querySelector('.product-modal')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Té chai');
    expect(fixture.nativeElement.querySelector('.success-toast').textContent).toContain('creado');
  });

  it('updates the product and refreshes the row after saving', () => {
    (fixture.nativeElement.querySelector('.edit-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector(
      'input[formControlName="nombre"]',
    ) as HTMLInputElement;
    nameInput.value = 'Café americano grande';
    nameInput.dispatchEvent(new Event('input'));

    (fixture.nativeElement.querySelector('.edit-modal form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(updatedProduct?.nombre).toBe('Café americano grande');
    expect(fixture.nativeElement.querySelector('.edit-modal')).toBeNull();
    expect(fixture.nativeElement.querySelector('.product-name').textContent).toContain(
      'Café americano grande',
    );
    expect(fixture.nativeElement.querySelector('.success-toast')).toBeTruthy();
  });

  it('hides and shows a product in the catalog using the eye button', () => {
    let visibilityButton = fixture.nativeElement.querySelector(
      '.visibility-button',
    ) as HTMLButtonElement;

    expect(visibilityButton.getAttribute('aria-label')).toContain('Ocultar Café americano');
    visibilityButton.click();
    fixture.detectChanges();

    expect(updatedStatus).toEqual({ id: product.id, activo: false });
    expect(component['products']()[0].activo).toBe(false);
    expect(fixture.nativeElement.querySelector('.status').textContent).toContain('Inactivo');
    expect(fixture.nativeElement.querySelector('.success-toast').textContent).toContain('oculto');
    visibilityButton = fixture.nativeElement.querySelector(
      '.visibility-button',
    ) as HTMLButtonElement;
    expect(visibilityButton.getAttribute('aria-label')).toContain('Mostrar Café americano');

    visibilityButton.click();
    fixture.detectChanges();

    expect(updatedStatus).toEqual({ id: product.id, activo: true });
    expect(component['products']()[0].activo).toBe(true);
    expect(fixture.nativeElement.querySelector('.status').textContent).toContain('Activo');
    expect(fixture.nativeElement.querySelector('.success-toast').textContent).toContain('visible');
  });

  it('asks for confirmation and removes the product using the trash button', () => {
    const deleteButton = fixture.nativeElement.querySelector('.delete-button') as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.delete-modal')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('#delete-product-description').textContent,
    ).toContain('Café americano');
    expect(deletedProductId).toBeNull();

    (fixture.nativeElement.querySelector('.confirm-delete-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(deletedProductId).toBe(product.id);
    expect(component['products']().map((current) => current.id)).not.toContain(product.id);
    expect(fixture.nativeElement.querySelector('.delete-modal')).toBeNull();
    expect(fixture.nativeElement.querySelector('.success-toast').textContent).toContain(
      'eliminado',
    );
  });

  it('does not save an invalid price', () => {
    (fixture.nativeElement.querySelector('.edit-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const priceInput = fixture.nativeElement.querySelector(
      'input[formControlName="precio_venta"]',
    ) as HTMLInputElement;
    priceInput.value = '0';
    priceInput.dispatchEvent(new Event('input'));

    (fixture.nativeElement.querySelector('.edit-modal form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(updatedProduct).toBeNull();
    expect(fixture.nativeElement.querySelector('.edit-modal')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.form-field small').textContent).toContain(
      'precio',
    );
  });
});
