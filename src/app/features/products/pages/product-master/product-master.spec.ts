import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  ProductoActualizacion,
  ProductoApi,
  ProductosApiService,
} from '../../../../core/api/productos-api.service';
import { ProductMaster } from './product-master';

describe('ProductMaster', () => {
  let component: ProductMaster;
  let fixture: ComponentFixture<ProductMaster>;
  let updatedProduct: ProductoActualizacion | null;

  const product: ProductoApi = {
    id: 7,
    nombre: 'Café americano',
    categoria: 'Cafetería',
    precio_venta: 2200,
    codigo_barras: '7800000000007',
    activo: true,
    creado_en: '2026-09-01T12:00:00Z',
  };

  beforeEach(async () => {
    updatedProduct = null;
    await TestBed.configureTestingModule({
      imports: [ProductMaster],
      providers: [
        {
          provide: ProductosApiService,
          useValue: {
            listar: () => of([product]),
            actualizar: (_id: number, changes: ProductoActualizacion) => {
              updatedProduct = changes;
              return of({ ...product, ...changes });
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
