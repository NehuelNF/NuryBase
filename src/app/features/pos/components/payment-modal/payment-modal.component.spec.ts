import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PaymentModalComponent } from './payment-modal.component';

describe('PaymentModalComponent', () => {
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
    expect(component.isPaymentValid()).toBe(true);
  });
});
