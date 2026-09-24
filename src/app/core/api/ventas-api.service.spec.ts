import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { VentaApi, VentasApiService } from './ventas-api.service';

describe('VentasApiService', () => {
  let service: VentasApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VentasApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists recent sales with their detail embedded for the anulación screen', async () => {
    const ventas: VentaApi[] = [
      {
        id: 1,
        sucursal_id: 1,
        cajero_id: 1,
        fecha_venta: '2026-09-24T12:00:00Z',
        medio_pago: 'efectivo',
        total: 2600,
        anulada: false,
        anulada_en: null,
        anulada_por: null,
        motivo_anulacion: null,
        cajero: { nombre: 'Camila Rojas' },
        detalle_venta: [
          { cantidad: 1, precio_unitario: 2600, subtotal: 2600, productos: { nombre: 'Café' } },
        ],
      },
    ];

    const resultPromise = firstValueFrom(service.listar(50));

    const request = http.expectOne(
      (candidate) =>
        candidate.method === 'GET' &&
        candidate.url === 'http://localhost:3000/ventas' &&
        candidate.params.get('order') === 'fecha_venta.desc' &&
        candidate.params.get('limit') === '50',
    );

    request.flush(ventas);
    await expect(resultPromise).resolves.toEqual(ventas);
  });

  it('calls fn_anular_venta with the venta, the acting admin and the reason', async () => {
    const ventaAnulada: VentaApi = {
      id: 1,
      sucursal_id: 1,
      cajero_id: 1,
      fecha_venta: '2026-09-24T12:00:00Z',
      medio_pago: 'efectivo',
      total: 2600,
      anulada: true,
      anulada_en: '2026-09-24T13:00:00Z',
      anulada_por: 2,
      motivo_anulacion: 'El cliente se arrepintió.',
      cajero: { nombre: 'Camila Rojas' },
      detalle_venta: [],
    };

    const resultPromise = firstValueFrom(
      service.anular({ p_venta_id: 1, p_usuario_id: 2, p_motivo: 'El cliente se arrepintió.' }),
    );

    const request = http.expectOne('http://localhost:3000/rpc/fn_anular_venta');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      p_venta_id: 1,
      p_usuario_id: 2,
      p_motivo: 'El cliente se arrepintió.',
    });

    request.flush(ventaAnulada);
    await expect(resultPromise).resolves.toEqual(ventaAnulada);
  });
});
