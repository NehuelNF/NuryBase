import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ProductoCreacion, ProductoApi, ProductosApiService } from './productos-api.service';

describe('ProductosApiService', () => {
  let service: ProductosApiService;
  let http: HttpTestingController;

  const product: ProductoApi = {
    id: 7,
    nombre: 'Café americano grande',
    categoria: 'Cafetería',
    precio_venta: 2700,
    codigo_barras: '7800000000007',
    activo: true,
    creado_en: '2026-09-01T12:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductosApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a product in the database and requests the resulting row', async () => {
    const newProduct: ProductoCreacion = {
      nombre: 'Té chai',
      categoria: 'Cafetería',
      precio_venta: 2800,
      codigo_barras: null,
      activo: true,
    };
    const createdProduct: ProductoApi = {
      ...newProduct,
      id: 8,
      creado_en: '2026-09-20T12:00:00Z',
    };
    const resultPromise = firstValueFrom(service.crear(newProduct));
    const request = http.expectOne(
      (candidate) =>
        candidate.method === 'POST' &&
        candidate.url === 'http://localhost:3000/productos' &&
        candidate.params.get('select')?.includes('id') === true,
    );

    expect(request.request.body).toEqual(newProduct);
    expect(request.request.headers.get('Prefer')).toBe('return=representation');
    request.flush([createdProduct]);

    await expect(resultPromise).resolves.toEqual(createdProduct);
  });

  it('updates a product in the database and requests the resulting row', async () => {
    const changes = {
      nombre: product.nombre,
      categoria: product.categoria,
      precio_venta: product.precio_venta,
      codigo_barras: product.codigo_barras,
      activo: product.activo,
    };
    const resultPromise = firstValueFrom(service.actualizar(product.id, changes));
    const request = http.expectOne(
      (candidate) =>
        candidate.method === 'PATCH' &&
        candidate.url === 'http://localhost:3000/productos' &&
        candidate.params.get('id') === 'eq.7',
    );

    expect(request.request.body).toEqual(changes);
    expect(request.request.headers.get('Prefer')).toBe('return=representation');
    request.flush([product]);

    await expect(resultPromise).resolves.toEqual(product);
  });

  it('updates only the active state used to show a product in the catalog', async () => {
    const inactiveProduct = { ...product, activo: false };
    const resultPromise = firstValueFrom(service.actualizarEstado(product.id, false));
    const request = http.expectOne(
      (candidate) =>
        candidate.method === 'PATCH' &&
        candidate.url === 'http://localhost:3000/productos' &&
        candidate.params.get('id') === 'eq.7',
    );

    expect(request.request.body).toEqual({ activo: false });
    expect(request.request.headers.get('Prefer')).toBe('return=representation');
    request.flush([inactiveProduct]);

    await expect(resultPromise).resolves.toEqual(inactiveProduct);
  });

  it('deletes a product and requests the deleted row', async () => {
    const resultPromise = firstValueFrom(service.eliminar(product.id));
    const request = http.expectOne(
      (candidate) =>
        candidate.method === 'DELETE' &&
        candidate.url === 'http://localhost:3000/productos' &&
        candidate.params.get('id') === 'eq.7',
    );

    expect(request.request.headers.get('Prefer')).toBe('return=representation');
    request.flush([product]);

    await expect(resultPromise).resolves.toEqual(product);
  });
});
