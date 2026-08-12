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
import { cleanClassName } from '@pages/object-detection/models/label.util';
import { Prediction } from '@pages/object-detection/models/prediction.interface';
import { PredictionListComponent } from '@pages/object-detection/prediction-list/prediction-list.component';
import { ObjectDetectionService } from './object-detection.service';

type DetectionMode = 'camera' | 'image';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
}

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
  private _overlayObserver: ResizeObserver | null = null;
  private _detections: BoundingBox[] = [];
  private _fpsEma = 0;
  private _lastFrameAt = 0;
  private _fpsSampleAt = 0;

  readonly detectionMode = signal<DetectionMode>('camera');
  readonly predictions = signal<Prediction[]>([]);
  readonly file = signal<File | null>(null);
  readonly previewSrc = signal<string | null>(null);
  readonly cameraStream = signal<MediaStream | null>(null);
  readonly cameraError = signal<string | null>(null);
  readonly isStartingCamera = signal(false);
  readonly isLiveDetection = signal(false);
  readonly isDragging = signal(false);
  readonly fps = signal<number | null>(null);
  readonly supportsCamera = signal(
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  );

  readonly liveVideo = viewChild<ElementRef<HTMLVideoElement>>('liveVideo');
  readonly overlayCanvas = viewChild<ElementRef<HTMLCanvasElement>>('overlay');
  readonly imageUpload = viewChild<ElementRef<HTMLInputElement>>('imageUpload');

  readonly webcamActive = computed(() => this.cameraStream() !== null);
  readonly modelReady = this._objectDetectionService.hasModel;
  readonly isPredicting = this._objectDetectionService.isPredicting;
  readonly isModelLoading = this._objectDetectionService.isModelLoading;
  readonly canPredictImage = computed(
    () => !!this.previewSrc() && this.modelReady() && !this.isPredicting(),
  );
  readonly status = computed(() => {
    if (this.detectionMode() === 'camera') {
      if (this.cameraError()) {
        return { tone: 'error' as const, label: this.cameraError() };
      }

      if (this.isStartingCamera()) {
        return { tone: 'busy' as const, label: 'Solicitando permiso de cámara…' };
      }

      if (this.isModelLoading()) {
        return { tone: 'busy' as const, label: 'Cargando modelo de visión…' };
      }

      if (this.isLiveDetection()) {
        const fpsLabel =
          this.fps() !== null ? `Procesando a ${this.fps()} FPS` : 'Procesando en tiempo real';
        return { tone: 'live' as const, label: `Cámara activa · ${fpsLabel}` };
      }

      if (this.webcamActive()) {
        return { tone: 'ready' as const, label: 'Cámara lista para analizar' };
      }

      return { tone: 'idle' as const, label: 'La cámara está apagada' };
    }

    if (this.isPredicting()) {
      return { tone: 'busy' as const, label: 'Analizando imagen…' };
    }

    if (this.previewSrc()) {
      return { tone: 'ready' as const, label: 'Imagen lista · pulsa "Detectar objetos"' };
    }

    return {
      tone: 'idle' as const,
      label: 'Arrastra una imagen aquí o haz clic para subirla',
    };
  });

  constructor() {
    void this._objectDetectionService.loadModel();

    effect(() => {
      const canvas = this.overlayCanvas()?.nativeElement;

      if (canvas && !this._overlayObserver && typeof ResizeObserver !== 'undefined') {
        const host = canvas.parentElement;
        if (host) {
          this._overlayObserver = new ResizeObserver(() => this._renderOverlay());
          this._overlayObserver.observe(host);
        }
      }
    });

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
      this._overlayObserver?.disconnect();
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
    this.fps.set(null);
    this._detections = [];
    this._renderOverlay();

    if (mode === 'image') {
      this.stopCamera();
      return;
    }

    this.clearImageSelection();
  }

  handleImageUpload(file: File): void {
    if (!file.type.startsWith('image/')) {
      return;
    }

    this.detectionMode.set('image');
    this.stopCamera();
    this.file.set(file);
    this.predictions.set([]);
    this.cameraError.set(null);
    this.fps.set(null);
    this._detections = [];

    this.revokePreviewUrl();
    const objectUrl = URL.createObjectURL(file);
    this._previewObjectUrl = objectUrl;
    this.previewSrc.set(objectUrl);
    this._renderOverlay();
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.handleImageUpload(file);
    }
    input.value = '';
  }

  onStageClick(): void {
    if (this.detectionMode() === 'image' && !this.previewSrc() && !this.isPredicting()) {
      this.imageUpload()?.nativeElement.click();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files')) {
      this.isDragging.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    if (!this._isOverChild(event)) {
      this.isDragging.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleImageUpload(file);
    }
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
    this.fps.set(null);
    this._detections = [];
    this._renderOverlay();
  }

  async predictImage(): Promise<void> {
    const src = this.previewSrc();
    if (!src) {
      return;
    }

    const image = await this.loadImage(src);
    const predictions = await this._objectDetectionService.predict(image);

    this.predictions.set(predictions);
    this._renderOverlay();
  }

  drawDetections(detections: BoundingBox[]): void {
    this._detections = detections;
    this._renderOverlay();
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
    this._tickFps();

    try {
      const predictions = await this._objectDetectionService.predict(video, {
        trackBusy: false,
      });
      this.predictions.set(predictions);
      this._renderOverlay();
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
    this._detections = [];
    this._renderOverlay();
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

  private _tickFps(): void {
    const now = performance.now();

    if (this._lastFrameAt > 0) {
      const delta = (now - this._lastFrameAt) / 1000;
      if (delta > 0) {
        const instant = 1 / delta;
        this._fpsEma = this._fpsEma === 0 ? instant : this._fpsEma * 0.7 + instant * 0.3;
      }
    }

    this._lastFrameAt = now;

    if (now - this._fpsSampleAt >= 500) {
      this.fps.set(Math.round(this._fpsEma));
      this._fpsSampleAt = now;
    }
  }

  private _renderOverlay(): void {
    const canvas = this.overlayCanvas()?.nativeElement;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth || 0;
    const height = canvas.clientHeight || 0;

    if (width === 0 || height === 0) {
      return;
    }

    const scaledWidth = Math.round(width * dpr);
    const scaledHeight = Math.round(height * dpr);

    if (canvas.width !== scaledWidth) {
      canvas.width = scaledWidth;
    }
    if (canvas.height !== scaledHeight) {
      canvas.height = scaledHeight;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    this._drawDetections(context, width, height);

    const top = this.predictions()[0];
    if (top) {
      this._drawHud(context, top, width, height);
    }
  }

  private _drawDetections(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    for (const box of this._detections) {
      const x = box.x * width;
      const y = box.y * height;
      const boxWidth = box.width * width;
      const boxHeight = box.height * height;

      context.beginPath();
      context.rect(x, y, boxWidth, boxHeight);
      context.strokeStyle = '#7c5cff';
      context.lineWidth = 2;
      context.stroke();

      const label = `${cleanClassName(box.label)} ${Math.round(box.confidence * 100)}%`;
      context.font = '600 12px Inter, sans-serif';
      const textWidth = context.measureText(label).width;
      const paddingX = 8;
      const chipHeight = 24;
      const chipY = Math.max(0, y - chipHeight - 4);

      this._traceRoundedRect(context, x, chipY, textWidth + paddingX * 2, chipHeight, 6);
      context.fillStyle = 'rgba(124, 92, 255, 0.9)';
      context.fill();
      context.fillStyle = '#ffffff';
      context.textBaseline = 'middle';
      context.fillText(label, x + paddingX, chipY + chipHeight / 2 + 1);
    }
  }

  private _drawHud(
    context: CanvasRenderingContext2D,
    prediction: Prediction,
    width: number,
    height: number,
  ): void {
    const label = cleanClassName(prediction.className);
    const percent = Math.round(prediction.probability * 100);
    const text = `${label}  ·  ${percent}% de confianza`;

    context.font = '600 13px Inter, sans-serif';
    const textWidth = context.measureText(text).width;
    const paddingX = 14;
    const chipHeight = 34;
    const radius = 12;
    const margin = 14;
    const chipWidth = textWidth + paddingX * 2;
    const chipX = margin;
    const chipY = height - chipHeight - margin;

    this._traceRoundedRect(context, chipX, chipY, chipWidth, chipHeight, radius);
    context.fillStyle = 'rgba(7, 10, 21, 0.78)';
    context.fill();
    context.strokeStyle = 'rgba(148, 163, 255, 0.4)';
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = '#f2f4ff';
    context.textBaseline = 'middle';
    context.fillText(text, chipX + paddingX, chipY + chipHeight / 2 + 1);
  }

  private _traceRoundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.arcTo(x + width, y, x + width, y + radius, radius);
    context.lineTo(x + width, y + height - radius);
    context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    context.lineTo(x + radius, y + height);
    context.arcTo(x, y + height, x, y + height - radius, radius);
    context.lineTo(x, y + radius);
    context.arcTo(x, y, x + radius, y, radius);
    context.closePath();
  }

  private _isOverChild(event: DragEvent): boolean {
    const current = event.currentTarget;
    if (!(current instanceof HTMLElement)) {
      return false;
    }

    const related = event.relatedTarget as Node | null;
    return !!related && current.contains(related);
  }
}
