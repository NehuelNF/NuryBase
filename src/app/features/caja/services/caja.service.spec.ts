import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { ProductosApiService } from '../../../core/api/productos-api.service';
import { TurnosApiService } from '../../../core/api/turnos-api.service';
import { VentasApiService } from '../../../core/api/ventas-api.service';
import { PosProduct } from '../../pos/models/pos.model';
import { PosService } from '../../pos/services/pos.service';
import { CajaService } from './caja.service';

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
  {
    id: 2,
    nombre: 'Cappuccino Italiano',
    categoriaId: 1,
    categoriaNombre: 'Cafetería',
    codigoInterno: 'NUR-102',
    codigoBarras: '7801234501025',
    precioVenta: 3200,
    icono: '☕',
    descripcion: 'Producto exclusivo para pruebas.',
    activo: true,
  },
];

describe('CajaService', () => {
  let abrirTurno: ReturnType<typeof vi.fn>;
  let cerrarTurnoApi: ReturnType<typeof vi.fn>;
  let obtenerEstados: ReturnType<typeof vi.fn>;

  function chargeSale(
    pos: PosService,
    productIndex: number,
    cantidad: number,
    medioPago: 'efectivo' | 'tarjeta' | 'junaeb'
  ) {
    for (let i = 0; i < cantidad; i++) {
      pos.addToCart(pos.catalog()[productIndex]);
    }
    return pos
      .completeSale(
        medioPago,
        pos.total(),
        { id: 1, nombre: 'Camila Rojas' },
        { id: 1, nombre: 'Sucursal Providencia' },
      )
      .subscribe();
  }

  // Abre un turno de prueba (id 42) para dejar la caja lista para cerrarTurno().
  function abrirTurnoDePrueba(caja: CajaService) {
    caja.iniciarTurno(1, 1).subscribe();
  }

  beforeEach(() => {
    abrirTurno = vi.fn(() => of(42));
    cerrarTurnoApi = vi.fn(() =>
      of({ id: 42, usuario_id: 1, sucursal_id: 1, hora_inicio: '', hora_fin: '', creado_en: '' })
    );
    obtenerEstados = vi.fn(() => of([]));
    let nextVentaId = 900;

    TestBed.configureTestingModule({
      providers: [
        { provide: ProductosApiService, useValue: { listar: () => NEVER } },
        {
          provide: VentasApiService,
          useValue: { registrar: () => of(++nextVentaId), obtenerEstados },
        },
        { provide: TurnosApiService, useValue: { abrir: abrirTurno, cerrar: cerrarTurnoApi } },
      ],
    });
    const pos = TestBed.inject(PosService);
    pos.catalog.set(TEST_PRODUCTS);
    pos.clearCart();
  });

  it('closes the shift with a snapshot of the totals and resets the sales history', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);
    abrirTurnoDePrueba(caja);

    chargeSale(pos, 0, 1, 'efectivo'); // $2.600
    chargeSale(pos, 1, 1, 'tarjeta'); // $3.200

    let cierre: any;
    caja.cerrarTurno('Camila Rojas', 'Nury Providencia', 2600, null).subscribe((c) => (cierre = c));

    expect(cerrarTurnoApi).toHaveBeenCalledWith(42);
    expect(cierre.totalGeneral).toBe(5800);
    expect(cierre.ventasTotales).toBe(2);
    expect(cierre.desglose.find((d: { key: string }) => d.key === 'efectivo')?.total).toBe(2600);
    expect(cierre.desglose.find((d: { key: string }) => d.key === 'tarjeta')?.total).toBe(3200);
    expect(pos.salesHistory()).toHaveLength(0);
    expect(caja.grandTotal()).toBe(0);
    expect(caja.historialCierres()).toContain(cierre);
    expect(pos.isRegisterOpen()).toBe(false);
  });

  it('does not mix sales from a previous shift into the next closing', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);
    abrirTurnoDePrueba(caja);

    chargeSale(pos, 0, 1, 'efectivo');
    caja.cerrarTurno('Camila Rojas', 'Nury Providencia', 2600, null).subscribe();

    abrirTurnoDePrueba(caja);
    chargeSale(pos, 1, 1, 'tarjeta'); // única venta del nuevo turno

    let segundoCierre: any;
    caja
      .cerrarTurno('Camila Rojas', 'Nury Providencia', 0, null)
      .subscribe((c) => (segundoCierre = c));

    expect(segundoCierre.ventasTotales).toBe(1);
    expect(segundoCierre.desglose.find((d: { key: string }) => d.key === 'efectivo')?.total).toBe(0);
    expect(segundoCierre.desglose.find((d: { key: string }) => d.key === 'tarjeta')?.total).toBe(3200);
  });

  it('iniciarTurno abre el turno real y deja la caja operativa', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);

    pos.closeRegister();
    expect(caja.isRegisterOpen()).toBe(false);

    caja.iniciarTurno(1, 1).subscribe();

    expect(abrirTurno).toHaveBeenCalledWith(1, 1);
    expect(caja.isRegisterOpen()).toBe(true);
    expect(pos.isRegisterOpen()).toBe(true);
    expect(pos.currentTurnoId()).toBe(42);
  });

  it('groups the individual sales of the shift by payment method (ventasPorMetodo)', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);
    abrirTurnoDePrueba(caja);

    chargeSale(pos, 0, 1, 'efectivo'); // Café Espresso Doble $2.600
    chargeSale(pos, 1, 2, 'tarjeta'); // 2x Cappuccino Italiano $6.400

    const grupos = caja.ventasPorMetodo();
    const efectivo = grupos.find((g) => g.key === 'efectivo')!;
    const tarjeta = grupos.find((g) => g.key === 'tarjeta')!;
    const junaeb = grupos.find((g) => g.key === 'junaeb')!;

    expect(efectivo.ventas).toHaveLength(1);
    expect(efectivo.ventas[0].total).toBe(2600);
    expect(efectivo.ventas[0].items[0].producto.nombre).toBe('Café Espresso Doble');

    expect(tarjeta.ventas).toHaveLength(1);
    expect(tarjeta.ventas[0].total).toBe(6400);
    expect(tarjeta.ventas[0].items[0].cantidad).toBe(2);

    expect(junaeb.ventas).toHaveLength(0);
  });

  it('records no difference when the counted cash matches the system total', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);
    abrirTurnoDePrueba(caja);

    chargeSale(pos, 0, 1, 'efectivo'); // $2.600

    let cierre: any;
    caja.cerrarTurno('Camila Rojas', 'Nury Providencia', 2600, null).subscribe((c) => (cierre = c));

    expect(cierre.efectivoEsperado).toBe(2600);
    expect(cierre.efectivoContado).toBe(2600);
    expect(cierre.diferenciaEfectivo).toBe(0);
    expect(cierre.justificacionDiferencia).toBeNull();
  });

  it('rejects closing with a cash mismatch and no justification', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);
    abrirTurnoDePrueba(caja);

    chargeSale(pos, 0, 1, 'efectivo'); // $2.600

    let error1: Error | undefined;
    caja
      .cerrarTurno('Camila Rojas', 'Nury Providencia', 2000, null)
      .subscribe({ error: (e) => (error1 = e) });
    expect(error1).toBeInstanceOf(Error);

    let error2: Error | undefined;
    caja
      .cerrarTurno('Camila Rojas', 'Nury Providencia', 2000, '   ')
      .subscribe({ error: (e) => (error2 = e) });
    expect(error2).toBeInstanceOf(Error);

    expect(cerrarTurnoApi).not.toHaveBeenCalled();
    expect(pos.salesHistory()).toHaveLength(1); // no se cerró el turno
  });

  it('records a shortage or surplus with its justification', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);
    abrirTurnoDePrueba(caja);

    chargeSale(pos, 0, 1, 'efectivo'); // $2.600

    let cierre: any;
    caja
      .cerrarTurno(
        'Camila Rojas',
        'Nury Providencia',
        2000,
        'Se entregó de más en el vuelto de una venta.'
      )
      .subscribe((c) => (cierre = c));

    expect(cierre.diferenciaEfectivo).toBe(-600);
    expect(cierre.justificacionDiferencia).toBe('Se entregó de más en el vuelto de una venta.');
  });

  it('excludes a sale voided by an admin from the current cuadratura (AC)', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);
    abrirTurnoDePrueba(caja);

    chargeSale(pos, 0, 1, 'efectivo'); // $2.600
    chargeSale(pos, 1, 1, 'tarjeta'); // $3.200
    const idVentaEfectivo = pos.salesHistory().find((v) => v.medioPago === 'efectivo')!.id;

    expect(caja.grandTotal()).toBe(5800);

    // Un admin anuló la primera venta desde Administrador mientras la
    // caja seguía abierta; obtenerEstados es lo que el cajero usa para
    // enterarse.
    obtenerEstados.mockReturnValueOnce(of([{ id: idVentaEfectivo, anulada: true }]));
    caja.sincronizarAnuladas();

    expect(caja.grandTotal()).toBe(3200);
    expect(caja.hayVentasEnElTurno()).toBe(true);
    expect(
      caja.summaryByMethod().find((m) => m.key === 'efectivo')?.ventas
    ).toBe(0);

    let cierre: any;
    caja.cerrarTurno('Camila Rojas', 'Nury Providencia', 0, null).subscribe((c) => (cierre = c));
    expect(cierre.totalGeneral).toBe(3200);
    expect(cierre.ventasTotales).toBe(1);
  });

  it('does not call obtenerEstados when there are no sales yet', () => {
    const caja = TestBed.inject(CajaService);
    abrirTurnoDePrueba(caja);

    caja.sincronizarAnuladas();

    expect(obtenerEstados).not.toHaveBeenCalled();
  });

  it('fails to close when the backend rejects fn_cerrar_turno', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);
    abrirTurnoDePrueba(caja);
    chargeSale(pos, 0, 1, 'efectivo');

    cerrarTurnoApi.mockReturnValueOnce(throwError(() => new Error('El turno ya estaba cerrado.')));

    let error: Error | undefined;
    caja
      .cerrarTurno('Camila Rojas', 'Nury Providencia', 2600, null)
      .subscribe({ error: (e) => (error = e) });

    expect(error?.message).toBe('El turno ya estaba cerrado.');
    expect(pos.salesHistory()).toHaveLength(1); // no se limpió: el cierre falló
  });
});
