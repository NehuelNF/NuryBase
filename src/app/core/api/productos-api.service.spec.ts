import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProductosApiService } from './productos-api.service';

describe('ProductosApiService', () => {
  let service: ProductosApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductosApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests only active products ordered by id', () => {
    service.listarActivos().subscribe();

    const request = http.expectOne(
      'http://localhost:3000/productos?select=id,nombre,categoria,precio_venta,codigo_barras,activo&activo=eq.true&order=id',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('maps every database family to a visible POS category', () => {
    let result: ReturnType<ProductosApiService['listarActivos']> extends infer _ ? any[] : never = [];
    service.listarActivos().subscribe((products) => (result = products));

    const request = http.expectOne((req) => req.url.startsWith('http://localhost:3000/productos'));
    request.flush([
      { id: 1, nombre: 'CAFÉ', categoria: 'BEBESTIBLES - CAFÉ', precio_venta: '700', activo: true },
      { id: 2, nombre: 'EMPANADA', categoria: 'ALIMENTOS - EMPANADAS', precio_venta: 3300, activo: true },
      { id: 3, nombre: 'GALLETÓN', categoria: 'GOLOSINAS - GALLETAS', precio_venta: 1400, activo: true },
      { id: 4, nombre: 'JUGO', categoria: 'BEBESTIBLES - JUGO', precio_venta: 1300, activo: true },
      { id: 5, nombre: 'LÁPIZ', categoria: 'OTROS - LAPIZ', precio_venta: 800, activo: true },
    ]);

    expect(result.map((product) => product.categoriaId)).toEqual([1, 2, 3, 4, 5]);
    expect(result.map((product) => product.codigoInterno)).toEqual([
      'NUR-001',
      'NUR-002',
      'NUR-003',
      'NUR-004',
      'NUR-005',
    ]);
  });
});
