import { TestBed } from '@angular/core/testing';
import { PosService } from '../../pos/services/pos.service';
import { CajaService } from './caja.service';

describe('CajaService', () => {
  function chargeSale(
    pos: PosService,
    productIndex: number,
    cantidad: number,
    medioPago: 'efectivo' | 'tarjeta' | 'junaeb'
  ) {
    for (let i = 0; i < cantidad; i++) {
      pos.addToCart(pos.catalog()[productIndex]);
    }
    return pos.completeSale(medioPago, pos.total(), 'Camila Rojas', 'Sucursal Providencia');
  }

  it('closes the shift with a snapshot of the totals and resets the sales history', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);

    chargeSale(pos, 0, 1, 'efectivo'); // $2.600
    chargeSale(pos, 1, 1, 'tarjeta'); // $3.200

    const cierre = caja.cerrarTurno('Camila Rojas', 'Nury Providencia');

    expect(cierre.totalGeneral).toBe(5800);
    expect(cierre.ventasTotales).toBe(2);
    expect(cierre.desglose.find((d) => d.key === 'efectivo')?.total).toBe(2600);
    expect(cierre.desglose.find((d) => d.key === 'tarjeta')?.total).toBe(3200);
    expect(pos.salesHistory()).toHaveLength(0);
    expect(caja.grandTotal()).toBe(0);
    expect(caja.historialCierres()).toContain(cierre);
    expect(pos.isRegisterOpen()).toBe(false);
  });

  it('does not mix sales from a previous shift into the next closing', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);

    chargeSale(pos, 0, 1, 'efectivo');
    caja.cerrarTurno('Camila Rojas', 'Nury Providencia');

    chargeSale(pos, 1, 1, 'tarjeta'); // única venta del nuevo turno
    const segundoCierre = caja.cerrarTurno('Camila Rojas', 'Nury Providencia');

    expect(segundoCierre.ventasTotales).toBe(1);
    expect(segundoCierre.desglose.find((d) => d.key === 'efectivo')?.total).toBe(0);
    expect(segundoCierre.desglose.find((d) => d.key === 'tarjeta')?.total).toBe(3200);
  });
});
