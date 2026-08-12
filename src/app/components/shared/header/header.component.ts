import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  imports: [MatIconModule],
  template: `
    <header class="app-header">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">
          <mat-icon>radar</mat-icon>
        </span>
        <h1>{{ title() }}</h1>
      </div>

      <div class="privacy-badge" title="Tus imágenes nunca salen de tu dispositivo">
        <mat-icon>shield</mat-icon>
        <span class="privacy-badge-text">
          <strong>100% Privado</strong>
          <small>Procesamiento local en tu navegador</small>
        </span>
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .app-header {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.85rem clamp(1rem, 4vw, 2.5rem);
        border-bottom: 1px solid var(--stroke);
        background: rgba(5, 7, 15, 0.72);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        min-width: 0;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 14px;
        background: var(--grad-ai);
        box-shadow: var(--shadow-glow);
        color: #ffffff;
      }

      h1 {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: var(--font-display);
        font-size: 1.15rem;
        letter-spacing: 0.01em;
      }

      .privacy-badge {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex: 0 0 auto;
        padding: 0.5rem 0.9rem;
        border-radius: var(--radius-pill);
        border: 1px solid rgba(52, 211, 153, 0.35);
        background: rgba(52, 211, 153, 0.08);
        color: #d1fae5;
        transition: all 0.3s ease;
      }

      .privacy-badge:hover {
        border-color: rgba(52, 211, 153, 0.6);
        background: rgba(52, 211, 153, 0.12);
      }

      .privacy-badge mat-icon {
        width: 1.15rem;
        height: 1.15rem;
        font-size: 1.15rem;
        color: var(--green);
      }

      .privacy-badge-text {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      }

      .privacy-badge-text strong {
        font-size: 0.8rem;
        font-weight: 700;
      }

      .privacy-badge-text small {
        color: rgba(209, 250, 229, 0.7);
        font-size: 0.68rem;
      }

      @media (max-width: 560px) {
        .privacy-badge small {
          display: none;
        }

        .brand h1 {
          font-size: 0.95rem;
        }
      }
    `,
  ],
})
export class HeaderComponent {
  title = input<string>('Detector de Objetos PWA');
}
