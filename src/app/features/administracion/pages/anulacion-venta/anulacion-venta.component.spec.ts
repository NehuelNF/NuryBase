import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { User } from '../../../auth/models/auth.model';
import { AuthService } from '../../../auth/services/auth.service';
import { VentaApi, VentasApiService } from '../../../../core/api/ventas-api.service';
import { AnulacionVentaComponent } from './anulacion-venta.component';

const ADMIN: User = {
  id: 2,
  nombre: 'Patricio Menares H.',
  identificadorAcceso: 'pa.menares@duocuc.cl',
  rol: 'admin',
  sucursalId: 1,
  sucursalNombre: 'Casa Central (Todas)',
  activo: true,
};

function ventaDePrueba(overrides: Partial<VentaApi> = {}): VentaApi {
  return {
    id: 10,
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
      { cantidad: 1, precio_unitario: 2600, subtotal: 2600, productos: { nombre: 'Café Espresso Doble' } },
    ],
    ...overrides,
  };
}

describe('AnulacionVentaComponent', () => {
  let listar: ReturnType<typeof vi.fn>;
  let anular: ReturnType<typeof vi.fn>;

  function crearComponente() {
    TestBed.configureTestingModule({
      providers: [
        { provide: VentasApiService, useValue: { listar, anular } },
        { provide: AuthService, useValue: { currentUser: () => ADMIN } },
      ],
    });
    const fixture = TestBed.createComponent(AnulacionVentaComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    listar = vi.fn(() => of([ventaDePrueba()]));
    anular = vi.fn(() =>
      of(ventaDePrueba({ anulada: true, anulada_en: '2026-09-24T13:00:00Z', anulada_por: 2, motivo_anulacion: 'El cliente se arrepintió.' }))
    );
  });

  it('loads the recent sales list on init', () => {
    const component = crearComponente();

    expect(listar).toHaveBeenCalledWith(100);
    expect(component.ventas()).toHaveLength(1);
    expect(component.cargando()).toBe(false);
  });

  it('blocks confirming the void until a reason is provided', () => {
    const component = crearComponente();
    component.abrirAnulacion(component.ventas()[0]);

    expect(component.puedeConfirmarAnulacion()).toBe(false);

    component.confirmarAnulacion();
    expect(anular).not.toHaveBeenCalled();

    component.motivo.set('El cliente se arrepintió.');
    expect(component.puedeConfirmarAnulacion()).toBe(true);
  });

  it('voids the sale and updates it in place, tagged as obviously voided', () => {
    const component = crearComponente();
    component.abrirAnulacion(component.ventas()[0]);
    component.motivo.set('El cliente se arrepintió.');

    component.confirmarAnulacion();

    expect(anular).toHaveBeenCalledWith({
      p_venta_id: 10,
      p_usuario_id: ADMIN.id,
      p_motivo: 'El cliente se arrepintió.',
    });
    expect(component.ventaAAnular()).toBeNull();
    expect(component.ventas()[0].anulada).toBe(true);
    expect(component.ventas()[0].motivo_anulacion).toBe('El cliente se arrepintió.');
  });

  it('surfaces the backend error when the shift is already closed', () => {
    anular.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'No se puede anular: el turno de esta venta ya está cerrado.' } }))
    );

    const component = crearComponente();
    component.abrirAnulacion(component.ventas()[0]);
    component.motivo.set('Motivo cualquiera');
    component.confirmarAnulacion();

    expect(component.errorAnulacion()).toBe(
      'No se puede anular: el turno de esta venta ya está cerrado.'
    );
    expect(component.ventas()[0].anulada).toBe(false); // no se aplicó el cambio
  });

  it('hides already-voided sales when "Ocultar anuladas" is on', () => {
    listar.mockReturnValueOnce(
      of([ventaDePrueba({ id: 1, anulada: false }), ventaDePrueba({ id: 2, anulada: true })])
    );

    const component = crearComponente();
    expect(component.ventasFiltradas()).toHaveLength(2);

    component.soloActivas.set(true);
    expect(component.ventasFiltradas()).toHaveLength(1);
    expect(component.ventasFiltradas()[0].anulada).toBe(false);
  });
});
