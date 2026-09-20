import { TestBed } from '@angular/core/testing';
import { BarcodeScanner } from './barcode-scanner';

describe('BarcodeScanner', () => {
  let service: BarcodeScanner;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BarcodeScanner);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
