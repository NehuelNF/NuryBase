import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TurnoApi, TurnosApiService } from './turnos-api.service';

describe('TurnosApiService', () => {
  let service: TurnosApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TurnosApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('opens a shift for the given user and sucursal (fn_abrir_turno)', async () => {
    const resultPromise = firstValueFrom(service.abrir(1, 1));

    const request = http.expectOne('http://localhost:3000/rpc/fn_abrir_turno');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ p_usuario_id: 1, p_sucursal_id: 1 });

    request.flush(42);
    await expect(resultPromise).resolves.toBe(42);
  });

  it('closes a shift by id (fn_cerrar_turno)', async () => {
    const turnoCerrado: TurnoApi = {
      id: 42,
      usuario_id: 1,
      sucursal_id: 1,
      hora_inicio: '2026-09-24T12:00:00Z',
      hora_fin: '2026-09-24T18:00:00Z',
      creado_en: '2026-09-24T12:00:00Z',
    };

    const resultPromise = firstValueFrom(service.cerrar(42));

    const request = http.expectOne('http://localhost:3000/rpc/fn_cerrar_turno');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ p_turno_id: 42 });

    request.flush(turnoCerrado);
    await expect(resultPromise).resolves.toEqual(turnoCerrado);
  });
});
