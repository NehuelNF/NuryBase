import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';
import { VentaApi, VentasApiService } from '../../../../core/api/ventas-api.service';

@Component({
  selector: 'app-anulacion-venta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './anulacion-venta.component.html',
  styleUrl: './anulacion-venta.component.css',
})
export class AnulacionVentaComponent implements OnInit {
  private readonly ventasApi = inject(VentasApiService);
  private readonly authService = inject(AuthService);

  readonly ventas = signal<VentaApi[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);

  readonly ventaExpandidaId = signal<number | null>(null);
  readonly ventaAAnular = signal<VentaApi | null>(null);
  readonly motivo = signal('');
  readonly anulando = signal(false);
  readonly errorAnulacion = signal<string | null>(null);

  readonly soloActivas = signal(false);

  readonly ventasFiltradas = computed(() =>
    this.soloActivas() ? this.ventas().filter((v) => !v.anulada) : this.ventas()
  );

  readonly puedeConfirmarAnulacion = computed(() => this.motivo().trim().length > 0);

  ngOnInit(): void {
    this.cargarVentas();
  }

  cargarVentas(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.ventasApi.listar(100).subscribe({
      next: (ventas) => {
        this.ventas.set(ventas);
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar el listado de ventas. Intenta de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  toggleDetalle(venta: VentaApi): void {
    this.ventaExpandidaId.set(this.ventaExpandidaId() === venta.id ? null : venta.id);
  }

  abrirAnulacion(venta: VentaApi): void {
    this.motivo.set('');
    this.errorAnulacion.set(null);
    this.ventaAAnular.set(venta);
  }

  cancelarAnulacion(): void {
    this.ventaAAnular.set(null);
  }

  confirmarAnulacion(): void {
    const venta = this.ventaAAnular();
    if (!venta || !this.puedeConfirmarAnulacion()) return;

    const usuario = this.authService.currentUser();
    if (!usuario) return;

    this.anulando.set(true);
    this.errorAnulacion.set(null);

    this.ventasApi
      .anular({
        p_venta_id: venta.id,
        p_usuario_id: usuario.id,
        p_motivo: this.motivo().trim(),
      })
      .subscribe({
        next: (ventaAnulada) => {
          this.ventas.set(
            this.ventas().map((v) => (v.id === ventaAnulada.id ? { ...v, ...ventaAnulada } : v))
          );
          this.anulando.set(false);
          this.ventaAAnular.set(null);
        },
        error: (error: { error?: { message?: string } }) => {
          this.anulando.set(false);
          this.errorAnulacion.set(
            error.error?.message ?? 'No se pudo anular la venta. Intenta de nuevo.'
          );
        },
      });
  }

  formatClp(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatFecha(fecha: string): string {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(fecha));
  }

  resumenItems(venta: VentaApi): string {
    return venta.detalle_venta
      .map((item) => `${item.cantidad}x ${item.productos?.nombre ?? 'Producto eliminado'}`)
      .join(', ');
  }
}
