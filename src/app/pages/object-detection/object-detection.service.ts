import * as mobilenet from '@tensorflow-models/mobilenet';

import { Injectable, computed, signal } from '@angular/core';
import { Prediction } from '@pages/object-detection/models/prediction.interface';
import * as tf from '@tensorflow/tfjs';

@Injectable({
  providedIn: 'root'
})
export class ObjectDetectionService {
  readonly isPredicting = signal(false);
  readonly isModelLoading = signal(false);
  readonly hasModel = computed(() => this._model() !== null);

  private readonly _model = signal<mobilenet.MobileNet | null>(null);
  private _loadModelPromise: Promise<void> | null = null;

  async loadModel(): Promise<void> {
    if (this._model()) {
      return;
    }

    if (this._loadModelPromise) {
      return this._loadModelPromise;
    }

    this._loadModelPromise = this._loadModel();

    return this._loadModelPromise.finally(() => {
      this._loadModelPromise = null;
    });
  }

  async predict(
    source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    options: { trackBusy?: boolean } = {},
  ): Promise<Prediction[]> {
    if (!this._model()) {
      await this.loadModel();
    }

    const model = this._model();
    if (!model) {
      return [];
    }

    const trackBusy = options.trackBusy ?? true;

    if (trackBusy) {
      this.isPredicting.set(true);
    }

    try {
      return await model.classify(source);
    } catch (error) {
      console.error('Error running prediction', error);
      return [];
    } finally {
      if (trackBusy) {
        this.isPredicting.set(false);
      }
    }
  }

  private async _loadModel(): Promise<void> {
    try {
      this.isModelLoading.set(true);

      try {
        await tf.setBackend('webgl');
      } catch {
        await tf.setBackend('cpu');
      }

      await tf.ready();

      const loadedModel = await mobilenet.load({ version: 2, alpha: 1.0 });
      this._model.set(loadedModel);
    } catch (error) {
      console.error('Error loading model', error);
    } finally {
      this.isModelLoading.set(false);
    }
  }
}
