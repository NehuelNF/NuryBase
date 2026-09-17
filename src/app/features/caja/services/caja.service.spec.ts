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

  it('excludes voided sales from summaryByMethod, grandTotal and shift closing (H2.9)', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);

    const sale1 = chargeSale(pos, 0, 1, 'efectivo'); // $2.600
    const sale2 = chargeSale(pos, 1, 1, 'tarjeta'); // $3.200

    expect(caja.grandTotal()).toBe(5800);
    expect(caja.summaryByMethod().find((m) => m.key === 'efectivo')?.ventas).toBe(1);

    // Anular sale1
    pos.voidSale(sale1.id, 'Cliente desistió de la compra');

    // Totales deben descontar la venta anulada
    expect(caja.grandTotal()).toBe(3200);
    const efectivoSummary = caja.summaryByMethod().find((m) => m.key === 'efectivo');
    expect(efectivoSummary?.total).toBe(0);
    expect(efectivoSummary?.ventas).toBe(0);

    const tarjetaSummary = caja.summaryByMethod().find((m) => m.key === 'tarjeta');
    expect(tarjetaSummary?.total).toBe(3200);
    expect(tarjetaSummary?.ventas).toBe(1);

    // Cierre de caja no debe incluir la venta anulada en sus totales
    const cierre = caja.cerrarTurno('Camila Rojas', 'Nury Providencia');
    expect(cierre.totalGeneral).toBe(3200);
    expect(cierre.ventasTotales).toBe(1);
  });

  it('excludes items from voided sales in productosPorMedioPago (H2.9)', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);

    const sale1 = chargeSale(pos, 0, 2, 'efectivo'); // 2 items de producto 0
    chargeSale(pos, 1, 1, 'efectivo'); // 1 item de producto 1

    let productos = caja.productosPorMedioPago('efectivo');
    expect(productos).toHaveLength(2);

    // Anular la venta 1
    pos.voidSale(sale1.id, 'Error de digitación');

    // Solo debe listar los productos de la venta no anulada
    productos = caja.productosPorMedioPago('efectivo');
    expect(productos).toHaveLength(1);
    expect(productos[0].producto.nombre).toBe(pos.catalog()[1].nombre);
  });

  it('reports hayVentasEnElTurno as false if all shift sales were voided', () => {
    const pos = TestBed.inject(PosService);
    const caja = TestBed.inject(CajaService);

    const sale = chargeSale(pos, 0, 1, 'efectivo');
    expect(caja.hayVentasEnElTurno()).toBe(true);

    pos.voidSale(sale.id, 'Cobro duplicado');
    expect(caja.hayVentasEnElTurno()).toBe(false);
  });
});

