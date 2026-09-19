import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { ProductosApiService } from '../../../core/api/productos-api.service';
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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ProductosApiService, useValue: { listar: () => NEVER } },
        { provide: VentasApiService, useValue: { registrar: () => of(999) } },
      ],
    });
    const pos = TestBed.inject(PosService);
    pos.catalog.set(TEST_PRODUCTS);
    pos.clearCart();
  });

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
