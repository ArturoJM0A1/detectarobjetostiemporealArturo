import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

const INTRO_SEEN_KEY = 'praevidor:intro-seen';

type IntroStep = 'welcome' | 'instructions';

@Component({
  selector: 'app-welcome',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (isOpen()) {
      <div class="welcome-backdrop" role="dialog" aria-modal="true" aria-label="Bienvenida a Praevidor">
        <div class="welcome-card">
          @switch (step()) {
            @case ('welcome') {
              <img
                class="welcome-logo"
                src="/logo/Praevidor.png"
                alt="Logo de Praevidor"
              />
              <h2 class="welcome-title">Bienvenido a Praevidor</h2>
              <p class="welcome-lead">
                Detecta y clasifica objetos con Inteligencia Artificial en tiempo real,
                directamente en tu dispositivo y sin enviar datos a ningún servidor.
              </p>
              <button mat-flat-button color="primary" class="welcome-cta" (click)="onContinue()">
                Continuar
                <mat-icon>arrow_forward</mat-icon>
              </button>
              <p class="welcome-credit">By: Arturo Juárez Monroy</p>
            }

            @case ('instructions') {
              <h2 class="welcome-title">¿Cómo funciona?</h2>

              <ol class="instructions-list">
                <li>
                  <mat-icon>videocam</mat-icon>
                  <div>
                    <strong>Activa la cámara</strong>
                    <span>Analiza tu entorno en tiempo real apuntando la cámara.</span>
                  </div>
                </li>
                <li>
                  <mat-icon>photo_library</mat-icon>
                  <div>
                    <strong>Sube una imagen</strong>
                    <span>Arrastra o selecciona un archivo JPG, PNG o WEBP desde tu equipo.</span>
                  </div>
                </li>
                <li>
                  <mat-icon>insights</mat-icon>
                  <div>
                    <strong>Revisa los resultados</strong>
                    <span>Cada objeto se marca en pantalla con su nivel de confianza.</span>
                  </div>
                </li>
                <li>
                  <mat-icon>shield</mat-icon>
                  <div>
                    <strong>100% privado</strong>
                    <span>Las imágenes se procesan localmente y nunca salen de tu navegador.</span>
                  </div>
                </li>
              </ol>

              <button mat-flat-button color="primary" class="welcome-cta" (click)="onStart()">
                Comenzar
                <mat-icon>play_arrow</mat-icon>
              </button>
            }
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .welcome-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgba(5, 7, 15, 0.82);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      .welcome-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.9rem;
        width: min(460px, 100%);
        max-height: calc(100dvh - 2rem);
        overflow-y: auto;
        padding: 2.6rem 2.2rem;
        border: 1px solid var(--stroke);
        border-radius: var(--radius-lg);
        background: linear-gradient(
          160deg,
          rgba(255, 255, 255, 0.07) 0%,
          rgba(255, 255, 255, 0.03) 45%,
          rgba(255, 255, 255, 0.05) 100%
        );
        box-shadow: var(--shadow-panel);
        text-align: center;
        animation: fade-up 0.4s ease both;
      }

      .welcome-logo {
        width: 260px;
        height: 260px;
        object-fit: contain;
        border-radius: var(--radius-md);
        filter: brightness(1.7) saturate(1.1);
        animation: float 3.5s ease-in-out infinite;
        margin-bottom: -0.5rem;
        padding-bottom: 0;
      }

      .welcome-title {
        margin: -1.7rem 0 0;
        font-family: var(--font-display);
        font-size: 1.6rem;
        letter-spacing: 0.01em;
      }

      .welcome-lead {
        margin: 0;
        color: var(--text-mid);
        font-size: 0.95rem;
        line-height: 1.6;
      }

      .welcome-cta {
        margin-top: 0.6rem;
        min-width: 180px;
        border-radius: var(--radius-pill);
        font-weight: 600;
      }

      .welcome-credit {
        margin: 0.3rem 0 0;
        color: #98a1c6;
        font-size: 0.8rem;
        letter-spacing: 0.03em;
      }

      .instructions-list {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        width: 100%;
        margin: 0.4rem 0 0;
        padding: 0;
        list-style: none;
        text-align: left;
      }

      .instructions-list li {
        display: flex;
        align-items: flex-start;
        gap: 0.85rem;
        padding: 0.85rem 1rem;
        border: 1px solid var(--stroke);
        border-radius: var(--radius-md);
        background: var(--glass);
      }

      .instructions-list mat-icon {
        flex: 0 0 auto;
        margin-top: 0.15rem;
        color: var(--accent-cyan);
      }

      .instructions-list strong {
        display: block;
        color: var(--text-high);
        font-size: 0.92rem;
        font-weight: 600;
      }

      .instructions-list span {
        color: var(--text-mid);
        font-size: 0.82rem;
        line-height: 1.5;
      }
    `,
  ],
})
export class WelcomeComponent {
  readonly isOpen = signal<boolean>(!localStorage.getItem(INTRO_SEEN_KEY));
  readonly step = signal<IntroStep>('welcome');

  onContinue(): void {
    this.step.set('instructions');
  }

  onStart(): void {
    localStorage.setItem(INTRO_SEEN_KEY, 'true');
    this.isOpen.set(false);
  }
}
