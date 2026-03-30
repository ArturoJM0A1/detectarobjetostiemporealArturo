import { PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { Prediction } from '../models/prediction.interface';

@Component({
  selector: 'app-prediction-list',
  templateUrl: './prediction-list.component.html',
  imports: [MatCardModule, MatListModule, PercentPipe],
  styleUrl: './prediction-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredictionListComponent {
  readonly predictions = input<Prediction[]>([]);
  readonly headline = input('Predicciones');
  readonly subheadline = input('Las clases detectadas aparecerán aquí.');
  readonly emptyLabel = input('Aún no hay predicciones disponibles.');
  readonly isLive = input(false);

  confidenceWidth(probability: number): string {
    return `${Math.max(0, Math.min(100, Math.round(probability * 100)))}%`;
  }
}
