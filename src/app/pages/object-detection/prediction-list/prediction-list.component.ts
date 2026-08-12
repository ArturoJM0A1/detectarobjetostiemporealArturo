import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { cleanClassName } from '../models/label.util';
import { Prediction } from '../models/prediction.interface';

type ConfidenceTone = 'high' | 'mid' | 'low';

interface DisplayPrediction extends Prediction {
  label: string;
  percent: number;
}

@Component({
  selector: 'app-prediction-list',
  templateUrl: './prediction-list.component.html',
  styleUrl: './prediction-list.component.scss',
  imports: [MatCardModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredictionListComponent {
  readonly predictions = input<Prediction[]>([]);
  readonly isLoading = input(false);
  readonly isLive = input(false);

  readonly list = computed<DisplayPrediction[]>(() =>
    this.predictions().map((prediction) => ({
      ...prediction,
      label: cleanClassName(prediction.className),
      percent: Math.round(prediction.probability * 100),
    })),
  );

  readonly emptyMessage = computed(() => {
    if (this.isLive()) {
      return 'Enfocando la cámara… aún no se detectan objetos.';
    }

    return 'Activa la cámara o sube una imagen para empezar.';
  });

  confidenceTone(percent: number): ConfidenceTone {
    if (percent >= 80) {
      return 'high';
    }

    if (percent >= 50) {
      return 'mid';
    }

    return 'low';
  }
}
