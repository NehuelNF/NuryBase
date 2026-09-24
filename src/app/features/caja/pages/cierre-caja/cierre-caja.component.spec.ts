import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { CierreCajaComponent } from './cierre-caja.component';
import { AuthService } from '../../../auth/services/auth.service';
import { User } from '../../../auth/models/auth.model';
import { PosService } from '../../../pos/services/pos.service';
import { ProductosApiService } from '../../../../core/api/productos-api.service';
import { TurnosApiService } from '../../../../core/api/turnos-api.service';
import { VentasApiService } from '../../../../core/api/ventas-api.service';
import { PosProduct } from '../../../pos/models/pos.model';

const TEST_USER: User = {
  id: 1,
  nombre: 'Camila Rojas V.',
  identificadorAcceso: 'c.rojas@nurys.cl',
  rol: 'cajero',
  sucursalId: 1,
  sucursalNombre: 'Sucursal Providencia',
  activo: true,
};

@Component({ standalone: true, template: '' })
class DummyComponent {}

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
  {
    id: 3,
    nombre: 'Café Latte Vainilla',
    categoriaId: 1,
    categoriaNombre: 'Cafetería',
    codigoInterno: 'NUR-103',
    codigoBarras: '7801234501032',
    precioVenta: 3500,
    icono: '☕',
    descripcion: 'Producto exclusivo para pruebas.',
    activo: true,
  },
];

describe('CierreCajaComponent', () => {
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
        provideRouter([
          { path: 'pos', component: DummyComponent },
          { path: 'caja', component: DummyComponent },
        ]),
        { provide: ProductosApiService, useValue: { listar: () => NEVER } },
        { provide: VentasApiService, useValue: { registrar: () => of(999) } },
        {
          provide: TurnosApiService,
          useValue: {
            abrir: () => of(42),
            cerrar: () =>
              of({ id: 42, usuario_id: 1, sucursal_id: 1, hora_inicio: '', hora_fin: '', creado_en: '' }),
          },
        },
        { provide: AuthService, useValue: { currentUser: signal<User | null>(TEST_USER) } },
      ],
    });
    const pos = TestBed.inject(PosService);
    pos.catalog.set(TEST_PRODUCTS);
    pos.clearCart();
  });

  it('shows the amount collected per payment method (AC1)', () => {
    const pos = TestBed.inject(PosService);
    chargeSale(pos, 0, 1, 'efectivo'); // Café Espresso Doble $2.600
    chargeSale(pos, 1, 1, 'tarjeta'); // Cappuccino Italiano $3.200
    chargeSale(pos, 2, 1, 'junaeb'); // Café Latte Vainilla $3.500

    const component = TestBed.createComponent(CierreCajaComponent).componentInstance;
    const summary = component.summaryByMethod();

    expect(summary.find((m) => m.key === 'efectivo')?.total).toBe(2600);
    expect(summary.find((m) => m.key === 'tarjeta')?.total).toBe(3200);
    expect(summary.find((m) => m.key === 'junaeb')?.total).toBe(3500);
    expect(component.grandTotal()).toBe(2600 + 3200 + 3500);
  });

  it('lists the products sold with the selected payment method (AC2)', () => {
    const pos = TestBed.inject(PosService);
    chargeSale(pos, 0, 1, 'efectivo'); // 1ra venta: 1 unidad
    chargeSale(pos, 0, 2, 'efectivo'); // 2da venta: 2 unidades del mismo producto
    chargeSale(pos, 1, 1, 'tarjeta'); // producto distinto, otro método

    const component = TestBed.createComponent(CierreCajaComponent).componentInstance;
    component.selectMethod('efectivo');

    const productos = component.selectedMethodProducts();
    expect(productos).toHaveLength(1);
    expect(productos[0].producto.nombre).toBe('Café Espresso Doble');
    expect(productos[0].cantidad).toBe(3);

    component.selectMethod('efectivo');
    expect(component.selectedMethod()).toBeNull();
    expect(component.selectedMethodProducts()).toHaveLength(0);
  });

  it('does not open the confirm dialog when the shift has no sales', () => {
    const component = TestBed.createComponent(CierreCajaComponent).componentInstance;
    component.openConfirm();
    expect(component.showConfirm()).toBe(false);
  });

  it('closes the shift after confirming a matching cash count', () => {
    const pos = TestBed.inject(PosService);
    chargeSale(pos, 0, 1, 'efectivo'); // $2.600
    chargeSale(pos, 1, 1, 'tarjeta'); // $3.200

    const component = TestBed.createComponent(CierreCajaComponent).componentInstance;
    component.iniciarTurno();
    component.openConfirm();
    expect(component.showConfirm()).toBe(true);

    component.setEfectivoContado('2600');
    expect(component.puedeConfirmarCierre()).toBe(true);
    component.confirmCierre();

    expect(component.showConfirm()).toBe(false);
    expect(component.turnoCerrado()?.totalGeneral).toBe(2600 + 3200);
    expect(component.turnoCerrado()?.diferenciaEfectivo).toBe(0);
    expect(pos.salesHistory()).toHaveLength(0);
    expect(component.grandTotal()).toBe(0);
    expect(pos.isRegisterOpen()).toBe(false);
  });

  it('cancels the confirm dialog without closing the shift', () => {
    const pos = TestBed.inject(PosService);
    chargeSale(pos, 0, 1, 'efectivo');

    const component = TestBed.createComponent(CierreCajaComponent).componentInstance;
    component.openConfirm();
    component.cancelConfirm();

    expect(component.showConfirm()).toBe(false);
    expect(component.turnoCerrado()).toBeNull();
    expect(pos.salesHistory()).toHaveLength(1);
  });

  it('shows the register as closed until "Iniciar Turno" is triggered', () => {
    const pos = TestBed.inject(PosService);
    pos.closeRegister();

    const component = TestBed.createComponent(CierreCajaComponent).componentInstance;
    expect(component.isRegisterOpen()).toBe(false);

    component.iniciarTurno();
    expect(component.isRegisterOpen()).toBe(true);
    expect(pos.isRegisterOpen()).toBe(true);
  });

  it('reopens the register when returning to operate after closing the shift', () => {
    const pos = TestBed.inject(PosService);
    chargeSale(pos, 0, 1, 'efectivo'); // $2.600

    const component = TestBed.createComponent(CierreCajaComponent).componentInstance;
    component.iniciarTurno();
    component.openConfirm();
    component.setEfectivoContado('2600');
    component.confirmCierre();

    expect(component.turnoCerrado()).not.toBeNull();
    expect(pos.isRegisterOpen()).toBe(false);

    component.volverAOperar();

    expect(component.turnoCerrado()).toBeNull();
    expect(pos.isRegisterOpen()).toBe(true);
  });

  it('lists the individual sales grouped by payment method, not just aggregates (AC2)', () => {
    const pos = TestBed.inject(PosService);
    chargeSale(pos, 0, 1, 'efectivo'); // Café Espresso Doble
    chargeSale(pos, 1, 1, 'efectivo'); // Cappuccino Italiano

    const component = TestBed.createComponent(CierreCajaComponent).componentInstance;
    const grupos = component.ventasPorMetodo();
    const efectivo = grupos.find((g) => g.key === 'efectivo')!;

    expect(efectivo.ventas).toHaveLength(2);
    expect(component.resumenItems(efectivo.ventas[0])).toContain('Cappuccino Italiano');
    expect(component.resumenItems(efectivo.ventas[1])).toContain('Café Espresso Doble');
  });

  it('blocks closing when there is a cash mismatch and no justification yet (AC)', () => {
    const pos = TestBed.inject(PosService);
    chargeSale(pos, 0, 1, 'efectivo'); // $2.600

    const component = TestBed.createComponent(CierreCajaComponent).componentInstance;
    component.iniciarTurno();
    component.openConfirm();
    component.setEfectivoContado('2000');

    expect(component.diferenciaEfectivo()).toBe(-600);
    expect(component.requiereJustificacion()).toBe(true);
    expect(component.puedeConfirmarCierre()).toBe(false);

    component.confirmCierre();
    expect(component.turnoCerrado()).toBeNull(); // no cerró, faltaba justificar

    component.setJustificacion('Faltó registrar una venta en el sistema.');
    expect(component.puedeConfirmarCierre()).toBe(true);

    component.confirmCierre();
    expect(component.turnoCerrado()?.diferenciaEfectivo).toBe(-600);
    expect(component.turnoCerrado()?.justificacionDiferencia).toBe(
      'Faltó registrar una venta en el sistema.'
    );
  });

  it('does not require a justification when the cash count matches exactly', () => {
    const pos = TestBed.inject(PosService);
    chargeSale(pos, 0, 1, 'efectivo'); // $2.600

    const component = TestBed.createComponent(CierreCajaComponent).componentInstance;
    component.openConfirm();
    component.setEfectivoContado('2600');

    expect(component.requiereJustificacion()).toBe(false);
    expect(component.puedeConfirmarCierre()).toBe(true);
  });
});
