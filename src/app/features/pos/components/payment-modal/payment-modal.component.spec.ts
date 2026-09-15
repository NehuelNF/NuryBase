import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PaymentModalComponent } from './payment-modal.component';
import { PosService } from '../../services/pos.service';

describe('PaymentModalComponent', () => {
  it('prints only after a sale, keeping its receipt and sale history intact', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    try {
      const fixture = TestBed.createComponent(PaymentModalComponent);
      const component = fixture.componentInstance;
      component.printTicket();
      expect(print).not.toHaveBeenCalled();
      const pos = TestBed.inject(PosService);
      pos.addToCart(pos.catalog()[0]);
      component.totalToPay = pos.total();
      fixture.detectChanges();
      component.onConfirmPayment();
      fixture.detectChanges();
      const receipt = fixture.nativeElement.querySelector('.receipt-paper');
      expect(receipt.textContent).toContain('Café Espresso Doble');
      expect(receipt.textContent).toContain('Subtotal neto');
      expect(receipt.textContent).toContain('IVA (19% incluido)');
      expect(receipt.textContent).toContain('TK-');
      fixture.nativeElement.querySelector('.btn-print').click();
      expect(print).toHaveBeenCalledTimes(1);
      expect(pos.salesHistory()).toHaveLength(1);
      expect(component.completedTicket()).not.toBeNull();
    } finally {
      print.mockRestore();
    }
  });
  it.each([NaN, Infinity, -1, 5000.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid cash: %s',
    async (amount) => {
      const fixture = TestBed.createComponent(PaymentModalComponent);
      fixture.componentInstance.totalToPay = 5000;
      fixture.detectChanges();
      fixture.componentInstance.setCashAmount(amount);
      expect(fixture.componentInstance.isPaymentValid()).toBe(false);
    },
  );

  it('revalidates the total and resets Junaeb approval when it changes', () => {
    const component = TestBed.createComponent(PaymentModalComponent).componentInstance;
    component.totalToPay = 5000;
    component.setMethod('junaeb');
    component.markJunaebAsScanned();
    expect(component.isPaymentValid()).toBe(true);
    component.totalToPay = 6000;
    expect(component.isPaymentValid()).toBe(false);
    component.setMethod('tarjeta');
    component.totalToPay = 0;
    expect(component.isPaymentValid()).toBe(false);
  });

  it('requires a fresh Junaeb confirmation after switching methods', () => {
    const component = TestBed.createComponent(PaymentModalComponent).componentInstance;
    component.totalToPay = 5000;
    component.setMethod('junaeb');
    component.markJunaebAsScanned();
    component.setMethod('tarjeta');
    component.setMethod('junaeb');
    expect(component.isPaymentValid()).toBe(false);
  });

  it('records the selected method once, even if confirmation is repeated', () => {
    const pos = TestBed.inject(PosService);
    pos.addToCart(pos.catalog()[0]);
    const component = TestBed.createComponent(PaymentModalComponent).componentInstance;
    component.totalToPay = pos.total();
    component.setMethod('tarjeta');
    component.markCardPaymentAsReady();
    component.onConfirmPayment();
    const sale = component.completedTicket();
    component.onConfirmPayment();
    expect(pos.salesHistory()).toHaveLength(1);
    expect(component.completedTicket()).toBe(sale);
    expect(sale?.medioPago).toBe('tarjeta');
    expect(sale?.montoRecibido).toBe(sale?.total);
  });

  it('does not charge an empty or changed cart', () => {
    const pos = TestBed.inject(PosService);
    const component = TestBed.createComponent(PaymentModalComponent).componentInstance;
    component.totalToPay = 5000;
    component.setMethod('tarjeta');
    component.markCardPaymentAsReady();
    component.onConfirmPayment();
    pos.addToCart(pos.catalog()[0]);
    component.onConfirmPayment();
    expect(pos.salesHistory()).toHaveLength(0);
    expect(component.completedTicket()).toBeNull();
  });
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentModalComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the payment modal', () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const component = fixture.componentInstance;
    component.totalToPay = 5000;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should calculate cash change correctly (H2.4)', () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const component = fixture.componentInstance;
    component.totalToPay = 4800;
    fixture.detectChanges();

    component.setMethod('efectivo');
    component.setCashAmount(10000);

    expect(component.changeDue()).toBe(5200);
    expect(component.isPaymentValid()).toBe(true);
  });

  it('should detect insufficient cash payment', () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const component = fixture.componentInstance;
    component.totalToPay = 5000;
    fixture.detectChanges();

    component.setMethod('efectivo');
    component.setCashAmount(3000);

    expect(component.changeDue()).toBe(-2000);
    expect(component.isPaymentValid()).toBe(false);
  });

  it('should auto-set exact amount for card payment', () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const component = fixture.componentInstance;
    component.totalToPay = 6500;
    fixture.detectChanges();

    component.setMethod('tarjeta');
    expect(component.amountReceived()).toBe(6500);
    expect(component.isPaymentValid()).toBe(false);
    component.markCardPaymentAsReady();
    expect(component.isPaymentValid()).toBe(true);
  });

  it('requires a fresh card confirmation after switching payment methods', () => {
    const component = TestBed.createComponent(PaymentModalComponent).componentInstance;
    component.totalToPay = 5000;
    component.setMethod('tarjeta');
    component.markCardPaymentAsReady();
    expect(component.isPaymentValid()).toBe(true);

    component.setMethod('efectivo');
    component.setMethod('tarjeta');

    expect(component.cardPaymentReady()).toBe(false);
    expect(component.isPaymentValid()).toBe(false);
  });

  it('should require marking Junaeb as scanned before confirming', () => {
    const fixture = TestBed.createComponent(PaymentModalComponent);
    const component = fixture.componentInstance;
    component.totalToPay = 4500;
    fixture.detectChanges();

    component.setMethod('junaeb');
    // Inicialmente no es válido hasta que se marque como escaneado desde el móvil
    expect(component.isPaymentValid()).toBe(false);

    // Al presionar "Listo / Escaneado"
    component.markJunaebAsScanned();

    expect(component.junaebScanned()).toBe(true);
    expect(component.isPaymentValid()).toBe(true);
  });
});
