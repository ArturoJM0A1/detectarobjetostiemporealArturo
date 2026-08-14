import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class FrontendProtectionService {
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.document.addEventListener('contextmenu', this.blockEvent, { capture: true });
    this.document.addEventListener('keydown', this.onKeyDown, { capture: true });
  }

  private readonly blockEvent = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    const isCtrl = event.ctrlKey;
    const isShift = event.shiftKey;
    const isCmd = event.metaKey;
    const isAlt = event.altKey;

    const opensDevTools =
      key === 'f12' ||
      (isCtrl && isShift && (key === 'i' || key === 'j' || key === 'c')) ||
      (isCmd && isAlt && (key === 'i' || key === 'j' || key === 'c'));

    if (opensDevTools) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
}
