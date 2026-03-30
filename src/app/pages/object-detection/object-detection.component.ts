import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Prediction } from '@pages/object-detection/models/prediction.interface';
import { PredictionListComponent } from '@pages/object-detection/prediction-list/prediction-list.component';
import { ObjectDetectionService } from './object-detection.service';

type DetectionMode = 'camera' | 'image';

@Component({
  selector: 'app-object-detection',
  imports: [
    PredictionListComponent,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './object-detection.component.html',
  styleUrl: './object-detection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObjectDetectionComponent {
  private readonly _objectDetectionService = inject(ObjectDetectionService);
  private readonly _destroyRef = inject(DestroyRef);
  private _liveFrameId: number | null = null;
  private _livePredictionPending = false;
  private _previewObjectUrl: string | null = null;

  readonly detectionMode = signal<DetectionMode>('camera');
  readonly predictions = signal<Prediction[]>([]);
  readonly file = signal<File | null>(null);
  readonly previewSrc = signal<string | null>(null);
  readonly cameraStream = signal<MediaStream | null>(null);
  readonly cameraError = signal<string | null>(null);
  readonly isStartingCamera = signal(false);
  readonly isLiveDetection = signal(false);
  readonly supportsCamera = signal(
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  );

  readonly liveVideo = viewChild<ElementRef<HTMLVideoElement>>('liveVideo');
  readonly webcamActive = computed(() => this.cameraStream() !== null);
  readonly modelReady = this._objectDetectionService.hasModel;
  readonly isPredicting = this._objectDetectionService.isPredicting;
  readonly isModelLoading = this._objectDetectionService.isModelLoading;
  readonly canPredictImage = computed(
    () => !!this.previewSrc() && this.modelReady() && !this.isPredicting(),
  );
  readonly cameraStatus = computed(() => {
    if (this.cameraError()) {
      return this.cameraError();
    }

    if (this.isStartingCamera()) {
      return 'Solicitando permiso de cámara...';
    }

    if (this.isModelLoading()) {
      return 'Cargando el modelo de detección...';
    }

    if (this.isLiveDetection()) {
      return 'Detección en tiempo real con cámara';
    }

    if (this.webcamActive()) {
      return 'Cámara lista para analizar objetos en vivo';
    }

    return 'Activa la cámara para detectar objetos en tiempo real.';
  });
  readonly imageStatus = computed(() => {
    if (this.isPredicting()) {
      return 'Analizando la imagen seleccionada...';
    }

    if (this.previewSrc()) {
      return this.modelReady()
        ? 'Imagen lista para detectar objetos.'
        : 'Imagen lista. Esperando a que el modelo termine de cargar.';
    }

    return 'Sube una imagen y verás resultados con porcentaje de confianza.';
  });

  constructor() {
    void this._objectDetectionService.loadModel();

    effect(() => {
      const video = this.liveVideo()?.nativeElement;
      const stream = this.cameraStream();

      if (!video) {
        return;
      }

      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }

      if (stream) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
        video.srcObject = null;
      }
    });

    this._destroyRef.onDestroy(() => {
      this.stopCamera();
      this.revokePreviewUrl();
    });
  }

  setMode(mode: DetectionMode): void {
    if (mode === this.detectionMode()) {
      return;
    }

    this.detectionMode.set(mode);
    this.predictions.set([]);
    this.cameraError.set(null);

    if (mode === 'image') {
      this.stopCamera();
      return;
    }

    this.clearImageSelection();
  }

  handleImageUpload(file: File | undefined): void {
    if (!file) {
      return;
    }

    this.detectionMode.set('image');
    this.stopCamera();
    this.file.set(file);
    this.predictions.set([]);
    this.cameraError.set(null);

    this.revokePreviewUrl();
    const objectUrl = URL.createObjectURL(file);
    this._previewObjectUrl = objectUrl;
    this.previewSrc.set(objectUrl);
  }

  async startCamera(): Promise<void> {
    if (!this.supportsCamera()) {
      this.cameraError.set('Tu navegador no permite acceder a la webcam.');
      return;
    }

    if (this.webcamActive()) {
      this.startLiveDetection();
      return;
    }

    this.detectionMode.set('camera');
    this.clearImageSelection();
    this.predictions.set([]);
    this.cameraError.set(null);
    this.isStartingCamera.set(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
        },
      });

      this.cameraStream.set(stream);
      this.startLiveDetection();
    } catch (error) {
      this.cameraError.set(this.getCameraErrorMessage(error));
    } finally {
      this.isStartingCamera.set(false);
    }
  }

  stopCamera(): void {
    this.stopLiveDetection();

    const stream = this.cameraStream();
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    this.cameraStream.set(null);
  }

  async predictImage(): Promise<void> {
    const src = this.previewSrc();
    if (!src) {
      return;
    }

    const image = await this.loadImage(src);
    const predictions = await this._objectDetectionService.predict(image);

    this.predictions.set(predictions);
  }

  private startLiveDetection(): void {
    if (!this.cameraStream() || this.isLiveDetection()) {
      return;
    }

    this.isLiveDetection.set(true);
    this.scheduleLiveFrame();
  }

  private stopLiveDetection(): void {
    this.isLiveDetection.set(false);

    if (this._liveFrameId !== null) {
      cancelAnimationFrame(this._liveFrameId);
      this._liveFrameId = null;
    }
  }

  private scheduleLiveFrame(): void {
    if (!this.isLiveDetection()) {
      return;
    }

    this._liveFrameId = requestAnimationFrame(() => {
      void this.detectLiveFrame();
    });
  }

  private async detectLiveFrame(): Promise<void> {
    if (!this.isLiveDetection()) {
      return;
    }

    const video = this.liveVideo()?.nativeElement;

    if (!video || video.readyState < 2) {
      this.scheduleLiveFrame();
      return;
    }

    if (this._livePredictionPending) {
      this.scheduleLiveFrame();
      return;
    }

    this._livePredictionPending = true;

    try {
      const predictions = await this._objectDetectionService.predict(video, { trackBusy: false });
      this.predictions.set(predictions);
    } catch (error) {
      console.error('Error detecting live frame', error);
      this.cameraError.set('No se pudo analizar la señal de la cámara.');
      this.stopLiveDetection();
    } finally {
      this._livePredictionPending = false;

      if (this.isLiveDetection()) {
        this.scheduleLiveFrame();
      }
    }
  }

  private clearImageSelection(): void {
    this.file.set(null);
    this.previewSrc.set(null);
    this.revokePreviewUrl();
  }

  private revokePreviewUrl(): void {
    if (this._previewObjectUrl) {
      URL.revokeObjectURL(this._previewObjectUrl);
      this._previewObjectUrl = null;
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
      image.src = src;
    });
  }

  private getCameraErrorMessage(error: unknown): string {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return 'Necesitamos permiso para usar la webcam.';
      }

      if (error.name === 'NotFoundError') {
        return 'No se encontró ninguna cámara disponible.';
      }

      if (error.name === 'NotReadableError') {
        return 'La cámara está en uso por otra aplicación.';
      }
    }

    return 'No pudimos iniciar la cámara en este momento.';
  }
}
