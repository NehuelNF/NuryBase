import { Injectable } from '@angular/core';
import {
  BrowserMultiFormatReader,
  IScannerControls,
} from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export type BarcodeDetectedHandler = (code: string, format?: BarcodeFormat) => void;
export type BarcodeScannerErrorHandler = (error: unknown) => void;

@Injectable({
  providedIn: 'root',
})
export class BarcodeScanner {
  private readonly reader: BrowserMultiFormatReader;
  private controls?: IScannerControls;
  private startRequestId = 0;

  constructor() {
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
    ]);

    this.reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanSuccess: 1000,
      delayBetweenScanAttempts: 150,
    });
  }

  /** Starts continuous scanning using the device's rear-facing camera. */
  async start(
    videoElement: HTMLVideoElement,
    onCode: BarcodeDetectedHandler,
    onError?: BarcodeScannerErrorHandler,
  ): Promise<void> {
    this.stop();
    const requestId = ++this.startRequestId;

    try {
      const controls = await this.reader.decodeFromVideoDevice(
        undefined,
        videoElement,
        (result) => {
          if (!result || requestId !== this.startRequestId) return;
          onCode(result.getText(), result.getBarcodeFormat() as BarcodeFormat);
        },
      );

      if (requestId !== this.startRequestId) {
        controls.stop();
        return;
      }

      this.controls = controls;
    } catch (error) {
      if (requestId === this.startRequestId) {
        onError?.(error);
      }
      throw error;
    }
  }

  /** Stops decoding and releases the camera stream. */
  stop(): void {
    this.startRequestId += 1;
    this.controls?.stop();
    this.controls = undefined;
  }

  /** Lists the cameras available after the browser grants camera permission. */
  listCameras(): Promise<MediaDeviceInfo[]> {
    return BrowserMultiFormatReader.listVideoInputDevices();
  }

  get isScanning(): boolean {
    return this.controls !== undefined;
  }
}
